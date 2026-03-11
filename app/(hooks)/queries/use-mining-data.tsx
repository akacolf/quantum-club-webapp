import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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

function getTodayDDMMYYYY(): string {
    const now = new Date(
        Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate(),
        ),
    );
    return (
        `${now.getUTCDate().toString().padStart(2, "0")}/` +
        `${(now.getUTCMonth() + 1).toString().padStart(2, "0")}/` +
        `${now.getUTCFullYear()}`
    );
}

function daysDiff(dateA: string, dateB: string): number {
    const diffMs = Math.abs(
        new Date(dateA).getTime() - new Date(dateB).getTime(),
    );
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

            if (diff > 2) {
                // Streak broken — reset daily to 1
                await setDoc(checkTimeRef, { daily: 1 }, { merge: true });
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
        // No checkTime doc — initialise it
        await setDoc(checkTimeRef, { daily: 1 });
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

            const formattedDate = getTodayDDMMYYYY();
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

const PassesAddedIcon = (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
    >
        <path
            fill="#fff"
            d="M7 15q1.25 0 2.125-.875T10 12t-.875-2.125T7 9t-2.125.875T4 12t.875 2.125T7 15m0 3q-2.5 0-4.25-1.75T1 12t1.75-4.25T7 6q2.025 0 3.538 1.15T12.65 10h8.375L23 11.975l-3.5 4L17 14l-2 2l-2-2h-.35q-.625 1.8-2.175 2.9T7 18"
        />
    </svg>
);

interface ClaimDailyParams {
    telegramId: string;
    currentDaily: number;
}

interface ClaimDailyResult {
    newDaily: number;
    quantReward: number;
    newQuantAmount: string;
    passesAdded: boolean;
}

async function performDailyClaim({
    telegramId,
}: ClaimDailyParams): Promise<ClaimDailyResult> {
    const formattedDate = getTodayDDMMYYYY();
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

    if (valuesData) {
        const remaining = valuesData.remainingSolveToEarn ?? null;
        const lastDate = valuesData.lastSolveToEarnDate ?? null;

        if (remaining != null && lastDate) {
            const [daySTE, monthSTE, yearSTE] = lastDate.split("/");
            const steISO = `${yearSTE}-${monthSTE}-${daySTE}`;
            const diff = daysDiff(todayISO, steISO);

            if (diff >= 1) {
                const updated = remaining + 7;
                await updateDoc(valuesRef, {
                    remainingSolveToEarn: updated,
                    lastSolveToEarnDate: formattedDate,
                });
                passesAdded = true;
            }
        } else {
            await setDoc(
                valuesRef,
                {
                    remainingSolveToEarn: 7,
                    lastSolveToEarnDate: formattedDate,
                },
                { merge: true },
            );
            passesAdded = true;
        }
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
                quantReward = dailyDay <= 7 ? (dailyDay - 1) * 100 + 50 : 650;
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
                };
            }
        }
    } else {
        // No checkTime doc at all
        await setDoc(
            checkTimeRef,
            { checktime: formattedDateMMDDYYYY, daily: 2 },
            { merge: true },
        );
        newDaily = 1;
        quantReward = 50;
    }

    // Update QuantAmount
    const newQuant = quant + quantReward;
    await updateDoc(valuesRef, { QuantAmount: newQuant });

    // Write rewards history
    await setDoc(rewardsHistoryRef, {
        quant: quantReward,
        platform: "dailycheck-in-reward",
        Date: formattedSlash,
    });

    const newQuantAmount = newQuant.toLocaleString("en-US", {
        maximumFractionDigits: 0,
    });

    return { newDaily, quantReward, newQuantAmount, passesAdded };
}

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

            // Update localStorage (legacy)
            if (typeof window !== "undefined" && telegramId) {
                localStorage.setItem(`QAmount_${telegramId}`, result.newQuantAmount);
                localStorage.setItem(`daily_${telegramId}`, String(result.newDaily));
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
