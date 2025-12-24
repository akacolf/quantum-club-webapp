// Anti-Dump Protection Utilities
// Implements the 3-layer anti-dump mechanism

import {
    AntiDumpConfig,
    VestingTranche,
    HolderPosition,
    DEFAULT_ANTI_DUMP_CONFIG,
} from "@/types/trading";

/**
 * Calculate vesting schedule for a new purchase
 * Tokens unlock in tranches: 50% immediately, 50% at 6 hours
 */
export function calculateVestingSchedule(
    purchaseAmount: string,
    purchaseTime: Date = new Date(),
    config: AntiDumpConfig = DEFAULT_ANTI_DUMP_CONFIG
): VestingTranche[] {
    const amount = BigInt(purchaseAmount);
    const schedule = config.vestingSchedule;

    const tranches: VestingTranche[] = [];

    // Immediate unlock (50%)
    const immediateAmount = (amount * BigInt(schedule.immediatePercent)) / BigInt(100);
    if (immediateAmount > BigInt(0)) {
        tranches.push({
            amount: immediateAmount.toString(),
            unlocksAt: purchaseTime,
            isUnlocked: true,
        });
    }

    // 6 hour unlock (50%) - using twentyFourHourPercent field for delayed portion
    const delayedAmount = (amount * BigInt(schedule.twentyFourHourPercent)) / BigInt(100);
    if (delayedAmount > BigInt(0)) {
        const delayedDate = new Date(purchaseTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours
        tranches.push({
            amount: delayedAmount.toString(),
            unlocksAt: delayedDate,
            isUnlocked: delayedDate <= new Date(),
        });
    }

    return tranches;
}

/**
 * Merge new vesting tranches with existing ones
 * When buying more tokens, add new tranches
 */
export function mergeVestingSchedules(
    existing: VestingTranche[],
    newTranches: VestingTranche[]
): VestingTranche[] {
    // Combine and sort by unlock time
    const combined = [...existing, ...newTranches].sort(
        (a, b) => a.unlocksAt.getTime() - b.unlocksAt.getTime()
    );

    // Update isUnlocked status
    const now = new Date();
    return combined.map(tranche => ({
        ...tranche,
        isUnlocked: tranche.unlocksAt <= now,
    }));
}

/**
 * Calculate currently available (vested) balance
 */
export function calculateVestedBalance(tranches: VestingTranche[]): string {
    const now = new Date();

    const vestedAmount = tranches.reduce((sum, tranche) => {
        if (tranche.unlocksAt <= now) {
            return sum + BigInt(tranche.amount);
        }
        return sum;
    }, BigInt(0));

    return vestedAmount.toString();
}

/**
 * Get next vesting unlock time and amount
 */
export function getNextVesting(tranches: VestingTranche[]): {
    nextUnlockTime: Date | null;
    nextUnlockAmount: string;
} {
    const now = new Date();

    const nextTranche = tranches
        .filter(t => t.unlocksAt > now)
        .sort((a, b) => a.unlocksAt.getTime() - b.unlocksAt.getTime())[0];

    if (!nextTranche) {
        return { nextUnlockTime: null, nextUnlockAmount: "0" };
    }

    return {
        nextUnlockTime: nextTranche.unlocksAt,
        nextUnlockAmount: nextTranche.amount,
    };
}

/**
 * Check if user is a whale (holds significant % of supply)
 */
export function getHolderCategory(
    holderBalance: string,
    totalSupply: string,
    config: AntiDumpConfig = DEFAULT_ANTI_DUMP_CONFIG
): "whale" | "large" | "regular" {
    if (totalSupply === "0") return "regular";

    const balance = BigInt(holderBalance);
    const supply = BigInt(totalSupply);
    const percentOfSupply = (balance * BigInt(10000)) / supply; // Basis points (100 = 1%)

    const whaleThreshold = BigInt(config.sellLimits.whaleThresholdPercent * 100);
    const largeThreshold = BigInt(config.sellLimits.largeHolderThresholdPercent * 100);

    if (percentOfSupply >= whaleThreshold) return "whale";
    if (percentOfSupply >= largeThreshold) return "large";
    return "regular";
}

/**
 * Calculate maximum sellable amount based on holder category and daily limits
 */
export function calculateMaxSellAmount(
    position: HolderPosition,
    totalSupply: string,
    config: AntiDumpConfig = DEFAULT_ANTI_DUMP_CONFIG
): {
    maxSellable: string;
    reason: string;
    limitType: "vesting" | "daily" | "none";
} {
    // First, check vested balance
    const vestedBalance = BigInt(position.vestedBalance);

    // Check holder category
    const category = getHolderCategory(position.balance, totalSupply, config);

    if (category === "regular") {
        // Regular holders only limited by vesting
        return {
            maxSellable: vestedBalance.toString(),
            reason: "Limited by vesting schedule",
            limitType: "vesting",
        };
    }

    // Calculate daily limit
    const balance = BigInt(position.balance);
    let dailyLimitPercent: number;

    if (category === "whale") {
        dailyLimitPercent = config.sellLimits.whaleDailyLimitPercent;
    } else {
        dailyLimitPercent = config.sellLimits.largeHolderDailyLimitPercent;
    }

    const dailyLimit = (balance * BigInt(dailyLimitPercent)) / BigInt(100);

    // Check how much already sold today
    const alreadySoldToday = BigInt(position.dailySoldAmount || "0");
    const remainingDailyLimit = dailyLimit > alreadySoldToday
        ? dailyLimit - alreadySoldToday
        : BigInt(0);

    // The max sellable is the minimum of vested balance and remaining daily limit
    const maxSellable = vestedBalance < remainingDailyLimit
        ? vestedBalance
        : remainingDailyLimit;

    // Determine limiting factor
    if (vestedBalance <= remainingDailyLimit) {
        return {
            maxSellable: maxSellable.toString(),
            reason: "Limited by vesting schedule",
            limitType: "vesting",
        };
    } else {
        return {
            maxSellable: maxSellable.toString(),
            reason: `${category === "whale" ? "Whale" : "Large holder"} daily limit (${dailyLimitPercent}%)`,
            limitType: "daily",
        };
    }
}

/**
 * Check if sell requires TWAP execution (split over time)
 */
export function requiresTWAP(
    sellAmountTon: string,
    tonPriceUsd: number,
    config: AntiDumpConfig = DEFAULT_ANTI_DUMP_CONFIG
): boolean {
    const sellValueUsd = parseFloat(sellAmountTon) * tonPriceUsd;
    return sellValueUsd >= config.twapThresholdUsd;
}

/**
 * Calculate TWAP execution plan
 * Splits large sell into smaller chunks over time
 */
export function calculateTWAPPlan(
    sellAmount: string,
    config: AntiDumpConfig = DEFAULT_ANTI_DUMP_CONFIG
): {
    chunks: { amount: string; executeAt: Date }[];
    totalDurationMinutes: number;
} {
    const amount = BigInt(sellAmount);
    const chunks: { amount: string; executeAt: Date }[] = [];

    // Split into 6 chunks over the duration
    const numChunks = 6;
    const chunkSize = amount / BigInt(numChunks);
    const remainder = amount % BigInt(numChunks);

    const intervalMs = (config.twapDurationMinutes * 60 * 1000) / numChunks;
    const now = new Date();

    for (let i = 0; i < numChunks; i++) {
        const chunkAmount = i === numChunks - 1
            ? chunkSize + remainder
            : chunkSize;

        chunks.push({
            amount: chunkAmount.toString(),
            executeAt: new Date(now.getTime() + i * intervalMs),
        });
    }

    return {
        chunks,
        totalDurationMinutes: config.twapDurationMinutes,
    };
}

/**
 * Format vesting countdown for display
 */
export function formatVestingCountdown(unlockTime: Date): string {
    const now = new Date();
    const diffMs = unlockTime.getTime() - now.getTime();

    if (diffMs <= 0) return "Unlocked";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
