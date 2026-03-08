// Unified achievements system — merges former "achievements" (client-computed)
// and "badges" (server-awarded from Firestore).

export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type AchievementSource = "stats" | "server";

export interface Achievement {
    id: string;
    name: string;
    description: string;
    howToUnlock: string;
    icon: string; // Iconify icon name
    color: string; // Tailwind color class for icon
    rarity: AchievementRarity;
    /** "stats" = client-computed from UserStats; "server" = awarded in Firestore */
    source: AchievementSource;
    /** Only present for source:"stats" achievements */
    condition?: (stats: UserStats) => boolean;
}

export interface UserStats {
    totalQntm: number;
    referralCount: number;
    tasksCompleted: number;
    dailyStreak: number;
    walletCreated: boolean;
}

export interface ServerAchievement {
    achievementId: string;
    earnedAt: Date;
}

export const achievements: Achievement[] = [
    // --- Stats-based (client-computed) ---
    {
        id: "first_qntm",
        name: "First Steps",
        description: "You've earned your first QNTM tokens!",
        howToUnlock: "Earn at least 1 QNTM from any activity",
        icon: "solar:bolt-bold",
        color: "text-orange-500",
        rarity: "common",
        source: "stats",
        condition: (stats) => stats.totalQntm > 0,
    },
    {
        id: "qntm_1k",
        name: "Getting Started",
        description: "You've accumulated 1,000 QNTM tokens!",
        howToUnlock: "Earn a total of 1,000 QNTM",
        icon: "solar:star-bold",
        color: "text-yellow-500",
        rarity: "common",
        source: "stats",
        condition: (stats) => stats.totalQntm >= 1000,
    },
    {
        id: "qntm_10k",
        name: "Rising Star",
        description: "Impressive! You've reached 10,000 QNTM!",
        howToUnlock: "Earn a total of 10,000 QNTM",
        icon: "solar:rocket-bold",
        color: "text-blue-500",
        rarity: "uncommon",
        source: "stats",
        condition: (stats) => stats.totalQntm >= 10000,
    },
    {
        id: "whale",
        name: "Whale",
        description: "You're a true Quantum whale with 100,000 QNTM!",
        howToUnlock: "Hold over 100,000 QNTM tokens",
        icon: "solar:water-bold",
        color: "text-blue-600",
        rarity: "epic",
        source: "stats",
        condition: (stats) => stats.totalQntm >= 100000,
    },
    {
        id: "first_referral",
        name: "Networker",
        description: "You've invited your first friend to Quantum Club!",
        howToUnlock: "Invite 1 friend using your referral link",
        icon: "solar:users-group-rounded-bold",
        color: "text-green-500",
        rarity: "common",
        source: "stats",
        condition: (stats) => stats.referralCount >= 1,
    },
    {
        id: "referrals_5",
        name: "Team Builder",
        description: "Your network is growing! 5 friends joined through you.",
        howToUnlock: "Invite 5 friends using your referral link",
        icon: "solar:target-bold",
        color: "text-green-500",
        rarity: "uncommon",
        source: "stats",
        condition: (stats) => stats.referralCount >= 5,
    },
    {
        id: "referral_king",
        name: "Referral King",
        description: "You're building a community! 10 friends and counting.",
        howToUnlock: "Invite 10 friends using your referral link",
        icon: "solar:medal-ribbons-star-bold",
        color: "text-green-500",
        rarity: "rare",
        source: "stats",
        condition: (stats) => stats.referralCount >= 10,
    },
    {
        id: "first_task",
        name: "Task Hunter",
        description: "You've completed your first task!",
        howToUnlock: "Complete any task in the Earn section",
        icon: "solar:diploma-verified-bold",
        color: "text-purple-500",
        rarity: "common",
        source: "stats",
        condition: (stats) => stats.tasksCompleted >= 1,
    },
    {
        id: "tasks_10",
        name: "Dedicated Player",
        description: "You're dedicated! 10 tasks completed.",
        howToUnlock: "Complete 10 tasks in the Earn section",
        icon: "solar:cup-star-bold",
        color: "text-purple-500",
        rarity: "uncommon",
        source: "stats",
        condition: (stats) => stats.tasksCompleted >= 10,
    },
    {
        id: "streak_7",
        name: "Consistent",
        description: "You've maintained a 7-day daily login streak!",
        howToUnlock: "Log in for 7 consecutive days",
        icon: "solar:fire-bold",
        color: "text-orange-500",
        rarity: "uncommon",
        source: "stats",
        condition: (stats) => stats.dailyStreak >= 7,
    },
    {
        id: "power_user",
        name: "Power User",
        description: "Logged in for 30 consecutive days — unstoppable!",
        howToUnlock: "Maintain a 30-day daily login streak",
        icon: "solar:fire-bold",
        color: "text-red-500",
        rarity: "epic",
        source: "stats",
        condition: (stats) => stats.dailyStreak >= 30,
    },
    {
        id: "wallet_created",
        name: "Wallet Ready",
        description: "Your QC Wallet is set up and ready to use!",
        howToUnlock: "Create your QC Wallet in the Wallet section",
        icon: "solar:wallet-bold",
        color: "text-cyan-400",
        rarity: "common",
        source: "stats",
        condition: (stats) => stats.walletCreated,
    },

    // --- Server-awarded (Firestore) ---
    {
        id: "early_adopter",
        name: "Early Adopter",
        description: "Joined Quantum Club during the early access period",
        howToUnlock: "Join during early access",
        icon: "solar:star-bold",
        color: "text-yellow-500",
        rarity: "rare",
        source: "server",
    },
    {
        id: "first_trade",
        name: "First Trade",
        description: "Completed your first token trade on QC RocketStart",
        howToUnlock: "Complete 1 trade on RocketStart",
        icon: "solar:rocket-bold",
        color: "text-blue-500",
        rarity: "common",
        source: "server",
    },
    {
        id: "diamond_hands",
        name: "Diamond Hands",
        description: "Held a token for over 30 days without selling",
        howToUnlock: "Hold a token for 30+ days",
        icon: "solar:diamond-bold",
        color: "text-cyan-400",
        rarity: "uncommon",
        source: "server",
    },
    {
        id: "social_butterfly",
        name: "Social Butterfly",
        description: "Started 5 or more direct chats with other users",
        howToUnlock: "Start 5+ chats with other users",
        icon: "solar:chat-round-dots-bold",
        color: "text-pink-500",
        rarity: "common",
        source: "server",
    },
    {
        id: "nft_collector",
        name: "NFT Collector",
        description: "Own 10 or more NFTs in your wallet",
        howToUnlock: "Own 10+ NFTs",
        icon: "solar:gallery-bold",
        color: "text-purple-500",
        rarity: "uncommon",
        source: "server",
    },
    {
        id: "group_leader",
        name: "Group Leader",
        description: "Created and manage an active group",
        howToUnlock: "Create a group",
        icon: "solar:crown-bold",
        color: "text-amber-500",
        rarity: "uncommon",
        source: "server",
    },
    {
        id: "marketplace_seller",
        name: "Marketplace Seller",
        description: "Successfully sold an NFT on the QC Marketplace",
        howToUnlock: "Sell 1 NFT on the marketplace",
        icon: "solar:tag-price-bold",
        color: "text-green-400",
        rarity: "uncommon",
        source: "server",
    },
];

export const RARITY_CONFIG: Record<AchievementRarity, { label: string; bg: string }> = {
    common: { label: "Common", bg: "bg-gray-500/20 text-gray-400" },
    uncommon: { label: "Uncommon", bg: "bg-green-500/20 text-green-400" },
    rare: { label: "Rare", bg: "bg-blue-500/20 text-blue-400" },
    epic: { label: "Epic", bg: "bg-purple-500/20 text-purple-400" },
    legendary: { label: "Legendary", bg: "bg-amber-500/20 text-amber-400" },
};

export function getAchievement(id: string): Achievement | undefined {
    return achievements.find((a) => a.id === id);
}

/**
 * Resolve which achievements are unlocked given user stats + server-awarded IDs.
 * Returns { unlocked: Achievement[], locked: Achievement[] }
 */
export function resolveAchievements(
    stats: UserStats,
    serverAwardedIds: Set<string>,
) {
    const unlocked: Achievement[] = [];
    const locked: Achievement[] = [];

    for (const a of achievements) {
        const isUnlocked =
            a.source === "stats"
                ? a.condition!(stats)
                : serverAwardedIds.has(a.id);

        if (isUnlocked) {
            unlocked.push(a);
        } else {
            locked.push(a);
        }
    }

    return { unlocked, locked };
}
