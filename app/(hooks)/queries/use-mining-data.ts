import { createElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MiningValues {
    remainingSolveToEarn: number;
    lastSolveToEarnDate: string | null;
    QuantAmount: number;
}

export interface CheckTimeData {
    checktime: string | null;
    daily: number;
}

export interface MiningData {
    values: MiningValues;
    checkTime: CheckTimeData;
    /** Whether the daily claim button has already been used today */
    isClaimedToday: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const miningDataKeys = {
    all: (telegramId: string) => ["mining-data", telegramId] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayISO(): string {
    const d = new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date());
    const [month, day, year] = d.split("/");
    return `${year}-${month}-${day}`;
}

function getTodaySlash(): string {
    const d = new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date());
    const [day, month, year] = d.split(".");
    return `${day}/${month}/${year}`;
}

function getTodayMMDDYYYY(): string {
    const d = new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date());
    const [day, month, year] = d.split(".");
    return `${month}/${day}/${year}`;
}

function daysDiff(dateA: string, dateB: string): number {
    // Parse both formats as UTC to avoid timezone mismatch
    // (YYYY-MM-DD is parsed as UTC by Date, but MM/DD/YYYY is parsed as local)
    const parseUTC = (d: string): number => {
        if (d.includes("-")) {
            const [y, m, day] = d.split("-").map(Number);
            return Date.UTC(y, m - 1, day);
        }
        const [m, day, y] = d.split("/").map(Number);
        return Date.UTC(y, m - 1, day);
    };
    const diffMs = Math.abs(parseUTC(dateA) - parseUTC(dateB));
    return diffMs / (1000 * 60 * 60 * 24);
}

// ---------------------------------------------------------------------------
// Fetch function
// ---------------------------------------------------------------------------

async function fetchMiningData(telegramId: string): Promise<MiningData> {
    const valuesRef = doc(dbfs, "user", telegramId, "miningData", "values");
    const checkTimeRef = doc(
        dbfs,
        "user",
        telegramId,
        "miningData",
        "checkTime",
    );

    const [valuesSnap, checkTimeSnap] = await Promise.all([
        getDoc(valuesRef),
        getDoc(checkTimeRef),
    ]);

    // Parse values
    const valuesData = valuesSnap.exists() ? valuesSnap.data() : {};
    const values: MiningValues = {
        remainingSolveToEarn: valuesData?.remainingSolveToEarn ?? 0,
        lastSolveToEarnDate: valuesData?.lastSolveToEarnDate ?? null,
        QuantAmount: valuesData?.QuantAmount ?? 0,
    };

    // Parse checkTime + determine claim status
    let checkTime: CheckTimeData = { checktime: null, daily: 1 };
    let isClaimedToday = false;

    if (checkTimeSnap.exists()) {
        const data = checkTimeSnap.data();
        const checktime = data?.checktime ?? null;
        const daily = data?.daily ?? 1;
        checkTime = { checktime, daily };

        if (checktime) {
            const todayISO = getTodayISO();
            const diff = daysDiff(todayISO, checktime);

            if (diff >= 2) {
                // Streak broken — daily resets to 1 (written on next claim, not here)
                checkTime.daily = 1;
                isClaimedToday = false;
            } else if (diff >= 1 && diff < 2) {
                // Can claim today (streak continues)
                isClaimedToday = false;
            } else {
                // Already claimed today
                isClaimedToday = true;
            }
        } else {
            // checktime is null — first time, can claim
            isClaimedToday = false;
            checkTime.daily = 1;
        }
    } else {
        // No checkTime doc — will be created on first daily claim
        checkTime.daily = 1;
        isClaimedToday = false;
    }

    return { values, checkTime, isClaimedToday };
}

// ---------------------------------------------------------------------------
// Query hook
// ---------------------------------------------------------------------------

/**
 * TanStack Query hook that fetches mining data (values + check-in state)
 * from Firestore for the current user.
 *
 * Used by:
 *  - home/Content.tsx
 */
export function useMiningDataQuery(telegramId: string | null) {
    return useQuery<MiningData>({
        queryKey: miningDataKeys.all(telegramId!),
        queryFn: () => fetchMiningData(telegramId!),
        enabled: !!telegramId,
        staleTime: 30_000, // 30 seconds
    });
}

// ---------------------------------------------------------------------------
// Solve-to-earn decrement mutation
// ---------------------------------------------------------------------------

export function useSolveToEarnMutation(telegramId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            if (!telegramId) throw new Error("No telegramId");

            const formattedDate = getTodayMMDDYYYY();
            const ref = doc(dbfs, `user/${telegramId}/miningData/values`);
            const snap = await getDoc(ref);
            const remaining: number = snap.data()?.remainingSolveToEarn ?? 0;

            if (remaining <= 0) throw new Error("No passes remaining");

            await updateDoc(ref, {
                remainingSolveToEarn: remaining - 1,
                lastSolveToEarnDate: formattedDate,
            });

            return remaining - 1;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: miningDataKeys.all(telegramId!),
            });
        },
    });
}

// ---------------------------------------------------------------------------
// Daily claim mutation
// ---------------------------------------------------------------------------

const PassesAddedIcon = createElement(Icon, {
    icon: "solar:key-bold",
    width: 24,
    height: 24,
    color: "#fff",
});

interface ClaimDailyParams {
    telegramId: string;
    currentDaily: number;
}

interface ClaimDailyResult {
    newDaily: number;
    quantReward: number;
    newQuantAmount: string;
    passesAdded: boolean;
    newRemaining: number;
}

async function performDailyClaim({
    telegramId,
}: ClaimDailyParams): Promise<ClaimDailyResult> {
    const formattedDate = getTodayMMDDYYYY();
    const formattedDateMMDDYYYY = getTodayMMDDYYYY();
    const formattedSlash = getTodaySlash();
    const todayISO = getTodayISO();

    const valuesRef = doc(dbfs, "user", telegramId, "miningData", "values");
    const checkTimeRef = doc(
        dbfs,
        "user",
        telegramId,
        "miningData",
        "checkTime",
    );
    const rewardsHistoryRef = doc(
        dbfs,
        "user",
        telegramId,
        "rewardsHistory",
        crypto.randomUUID(),
    );

    // ---- Solve-to-earn passes logic ----
    let passesAdded = false;
    const valuesSnap = await getDoc(valuesRef);
    const valuesData = valuesSnap.exists() ? valuesSnap.data() : null;
    const quant: number = valuesData?.QuantAmount ?? 0;
    const currentRemaining: number = valuesData?.remainingSolveToEarn ?? 0;
    let newRemaining = currentRemaining;

    const lastDate = valuesData?.lastSolveToEarnDate ?? null;
    let shouldAddPasses = false;

    if (!lastDate) {
        // First time ever or missing date — initialize passes
        shouldAddPasses = true;
    } else {
        const [monthSTE, daySTE, yearSTE] = lastDate.split("/");
        const steISO = `${yearSTE}-${monthSTE}-${daySTE}`;
        const diff = daysDiff(todayISO, steISO);
        if (diff >= 1) shouldAddPasses = true;
    }

    if (shouldAddPasses) {
        await setDoc(
            valuesRef,
            {
                remainingSolveToEarn: increment(7),
                lastSolveToEarnDate: formattedDate,
            },
            { merge: true },
        );
        passesAdded = true;
        newRemaining = currentRemaining + 7;
    }

    // ---- Daily check-in logic ----
    const checkTimeSnap = await getDoc(checkTimeRef);
    let newDaily: number;
    let quantReward: number;

    if (checkTimeSnap.exists()) {
        const checktime = checkTimeSnap.data()?.checktime;
        const dailyDay = checkTimeSnap.data()?.daily ?? 0;

        if (!checktime) {
            // First claim ever (checktime null)
            await setDoc(
                checkTimeRef,
                { checktime: formattedDateMMDDYYYY, daily: 1 },
                { merge: true },
            );
            newDaily = 1;
            quantReward = 50;
        } else {
            const diff = daysDiff(todayISO, checktime);

            if (diff >= 1 && diff < 2) {
                // Streak continues
                newDaily = dailyDay + 1;
                quantReward = Math.min((newDaily - 1) * 100 + 50, 600);
                await setDoc(
                    checkTimeRef,
                    { checktime: formattedDateMMDDYYYY, daily: newDaily },
                    { merge: true },
                );
            } else if (diff >= 2) {
                // Streak broken
                newDaily = 1;
                quantReward = 50;
                await setDoc(
                    checkTimeRef,
                    { checktime: formattedDateMMDDYYYY, daily: 1 },
                    { merge: true },
                );
            } else {
                // Already claimed today — should not happen due to UI guard
                return {
                    newDaily: dailyDay,
                    quantReward: 0,
                    newQuantAmount: quant.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                    }),
                    passesAdded: false,
                    newRemaining,
                };
            }
        }
    } else {
        // No checkTime doc at all — first claim ever
        await setDoc(
            checkTimeRef,
            { checktime: formattedDateMMDDYYYY, daily: 1 },
            { merge: true },
        );
        newDaily = 1;
        quantReward = 50;
    }

    // Update QuantAmount atomically to prevent double-claim race conditions
    await updateDoc(valuesRef, { QuantAmount: increment(quantReward) });
    const newQuant = quant + quantReward;

    // Write rewards history
    await setDoc(rewardsHistoryRef, {
        quant: quantReward,
        platform: "dailycheck-in-reward",
        Date: formattedSlash,
    });

    const newQuantAmount = newQuant.toLocaleString("en-US", {
        maximumFractionDigits: 0,
    });

    return { newDaily, quantReward, newQuantAmount, passesAdded, newRemaining };
}

// ---------------------------------------------------------------------------
// Game save mutation (solve-to-earn timer expiry)
// ---------------------------------------------------------------------------

interface GameSaveParams {
    telegramId: string;
    earnedQuant: number;
    correctAnswers: number;
}

async function performGameSave({
    telegramId,
    earnedQuant,
    correctAnswers,
}: GameSaveParams): Promise<string | null> {
    const date = new Date();
    const formattedDate = `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}/${date.getFullYear()}`;

    const historyRef = doc(
        dbfs,
        `user/${telegramId}/solveToEarnHistory/${Date.now()}`,
    );
    const valuesRef = doc(dbfs, `user/${telegramId}/miningData/values`);
    const snap = await getDoc(valuesRef);
    const totalQuant = snap.data()?.QuantAmount ?? 0;
    const newQuant = totalQuant + earnedQuant;

    sessionStorage.setItem("correctAnswers", `${correctAnswers}`);

    if (!snap.exists()) return null;

    await updateDoc(valuesRef, { QuantAmount: newQuant });
    await setDoc(
        historyRef,
        {
            Date: formattedDate,
            total: correctAnswers,
            quant: earnedQuant,
            platform: "solvetoearn",
        },
        { merge: true },
    );

    const formattedQuant = newQuant.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
    sessionStorage.setItem("TotalCorrectSolveToEarn", `${earnedQuant}`);
    return formattedQuant;
}

export function useGameSaveMutation(telegramId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: GameSaveParams) => performGameSave(params),
        onSuccess: () => {
            if (telegramId) {
                queryClient.invalidateQueries({
                    queryKey: miningDataKeys.all(telegramId),
                });
            }
        },
    });
}

// ---------------------------------------------------------------------------
// Play again mutation (solve-to-earn results → decrement & navigate)
// ---------------------------------------------------------------------------

export function usePlayAgainMutation(telegramId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<number> => {
            if (!telegramId) throw new Error("No telegramId");

            const valuesRef = doc(
                dbfs,
                `user/${telegramId}/miningData/values`,
            );
            const snap = await getDoc(valuesRef);
            const remaining = snap.exists()
                ? (snap.data().remainingSolveToEarn ?? 0)
                : 0;

            if (remaining <= 0) throw new Error("No passes remaining");

            await updateDoc(valuesRef, {
                remainingSolveToEarn: remaining - 1,
            });
            return remaining - 1;
        },
        onSuccess: () => {
            if (telegramId) {
                queryClient.invalidateQueries({
                    queryKey: miningDataKeys.all(telegramId),
                });
            }
        },
    });
}

// ---------------------------------------------------------------------------
// Daily claim mutation
// ---------------------------------------------------------------------------

/**
 * TanStack Query mutation that handles the full daily claim flow:
 * - Awards solve-to-earn passes (+7)
 * - Calculates streak-based QNTM reward
 * - Updates Firestore (checkTime, values, rewardsHistory)
 * - Fires haptic feedback and toast notifications
 *
 * Used by:
 *  - home/Content.tsx
 */
export function useClaimDailyMutation(
    telegramId: string | null,
    callbacks: {
        setDaily: (v: number) => void;
        SetMainQuantAmount: (v: string) => void;
        setRemainingSolveToEarn: (v: number) => void;
    },
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: ClaimDailyParams) => performDailyClaim(params),
        onSuccess: (result) => {
            haptics.success();

            // Update Zustand store
            callbacks.setDaily(result.newDaily);
            callbacks.SetMainQuantAmount(result.newQuantAmount);
            callbacks.setRemainingSolveToEarn(result.newRemaining);

            // Update localStorage (legacy) + sessionStorage
            if (typeof window !== "undefined") {
                sessionStorage.setItem(
                    "remainingSolveToEarn",
                    String(result.newRemaining),
                );
                if (telegramId) {
                    localStorage.setItem(`QAmount_${telegramId}`, result.newQuantAmount);
                    localStorage.setItem(`daily_${telegramId}`, String(result.newDaily));
                }
            }

            // Toast for passes
            if (result.passesAdded) {
                toast.success("+7 passes has been added", {
                    icon: PassesAddedIcon,
                    duration: 3000,
                });
            }

            // Toast for QNTM reward (delayed to sequence after passes toast)
            if (result.quantReward > 0) {
                setTimeout(() => {
                    toast.success(`You've got +${result.quantReward} QNTM`, {
                        duration: 3000,
                    });
                }, result.passesAdded ? 3000 : 0);
            }

            // Invalidate queries
            queryClient.invalidateQueries({
                queryKey: miningDataKeys.all(telegramId!),
            });
            queryClient.invalidateQueries({
                queryKey: ["rewards-history", telegramId],
            });
        },
        onError: (error) => {
            haptics.error();
            console.error(error);
        },
    });
}
