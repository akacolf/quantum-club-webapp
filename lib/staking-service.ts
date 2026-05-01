/**
 * TON staking metadata used by wallet surfaces.
 *
 * The staking action itself is Tonstakers-only and uses `tonstakers-sdk`
 * directly from `lib/tonstakers-integration.ts`.
 */

export interface StakingPool {
    id: string;
    name: string;
    icon: string;
    description: string;
    liquidToken: string;
    liquidTokenIcon: string;
    apy: number;
    minStake: number;
    poolAddress: string;
    jettonMasterAddress: string;
    unstakeTime: string;
    isInstantUnstake: boolean;
    features: string[];
    riskLevel: "low" | "medium" | "high";
}

export const TONSTAKERS_POOL: StakingPool = {
    id: "tonstakers",
    name: "Tonstakers",
    icon: "/png/tonstakers-logo.jpg",
    description: "Liquid staking for TON with tsTON",
    liquidToken: "tsTON",
    liquidTokenIcon: "/svg/ton-logo.svg",
    apy: 3.01,
    minStake: 0.01,
    poolAddress: "EQCkWxfyhAkim3g2DjKQQg8T5P4g-Q1-K_jErGcDJZ4i-vqR",
    jettonMasterAddress: "EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav",
    unstakeTime: "Instant or best rate",
    isInstantUnstake: true,
    features: ["Liquid staking", "Auto-compound", "tsTON"],
    riskLevel: "low",
};

export const STAKING_POOLS: StakingPool[] = [TONSTAKERS_POOL];

export async function fetchLiveApyData(): Promise<Map<string, number>> {
    return new Map([[TONSTAKERS_POOL.id, TONSTAKERS_POOL.apy]]);
}

export function calculateRewards(
    stakedAmount: number,
    apy: number,
): {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
} {
    const yearlyRewards = stakedAmount * (apy / 100);
    return {
        daily: yearlyRewards / 365,
        weekly: yearlyRewards / 52,
        monthly: yearlyRewards / 12,
        yearly: yearlyRewards,
    };
}
