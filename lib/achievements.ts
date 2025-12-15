// Achievement icon names from Iconify (https://iconify.design)
// Using solar icons set for consistent style

export interface Achievement {
    id: string;
    name: string;
    description: string;
    howToUnlock: string;
    icon: string; // Iconify icon name
    condition: (stats: UserStats) => boolean;
}

export interface UserStats {
    totalQntm: number;
    referralCount: number;
    tasksCompleted: number;
    dailyStreak: number;
    walletCreated: boolean;
}

export const achievements: Achievement[] = [
    {
        id: "first_qntm",
        name: "First Steps",
        description: "You've earned your first QNTM tokens!",
        howToUnlock: "Earn at least 1 QNTM from any activity",
        icon: "solar:bolt-bold",
        condition: (stats) => stats.totalQntm > 0,
    },
    {
        id: "qntm_1k",
        name: "Getting Started",
        description: "You've accumulated 1,000 QNTM tokens!",
        howToUnlock: "Earn a total of 1,000 QNTM",
        icon: "solar:star-bold",
        condition: (stats) => stats.totalQntm >= 1000,
    },
    {
        id: "qntm_10k",
        name: "Rising Star",
        description: "Impressive! You've reached 10,000 QNTM!",
        howToUnlock: "Earn a total of 10,000 QNTM",
        icon: "solar:rocket-bold",
        condition: (stats) => stats.totalQntm >= 10000,
    },
    {
        id: "qntm_100k",
        name: "Quantum Master",
        description: "You're a true Quantum master with 100,000 QNTM!",
        howToUnlock: "Earn a total of 100,000 QNTM",
        icon: "solar:crown-bold",
        condition: (stats) => stats.totalQntm >= 100000,
    },
    {
        id: "first_referral",
        name: "Networker",
        description: "You've invited your first friend to Quantum Club!",
        howToUnlock: "Invite 1 friend using your referral link",
        icon: "solar:users-group-rounded-bold",
        condition: (stats) => stats.referralCount >= 1,
    },
    {
        id: "referrals_5",
        name: "Team Builder",
        description: "Your network is growing! 5 friends joined through you.",
        howToUnlock: "Invite 5 friends using your referral link",
        icon: "solar:target-bold",
        condition: (stats) => stats.referralCount >= 5,
    },
    {
        id: "referrals_10",
        name: "Community Leader",
        description: "You're building a community! 10 friends and counting.",
        howToUnlock: "Invite 10 friends using your referral link",
        icon: "solar:medal-ribbons-star-bold",
        condition: (stats) => stats.referralCount >= 10,
    },
    {
        id: "first_task",
        name: "Task Hunter",
        description: "You've completed your first task!",
        howToUnlock: "Complete any task in the Earn section",
        icon: "solar:diploma-verified-bold",
        condition: (stats) => stats.tasksCompleted >= 1,
    },
    {
        id: "tasks_10",
        name: "Dedicated Player",
        description: "You're dedicated! 10 tasks completed.",
        howToUnlock: "Complete 10 tasks in the Earn section",
        icon: "solar:cup-star-bold",
        condition: (stats) => stats.tasksCompleted >= 10,
    },
    {
        id: "streak_7",
        name: "Consistent",
        description: "You've maintained a 7-day daily login streak!",
        howToUnlock: "Log in for 7 consecutive days",
        icon: "solar:fire-bold",
        condition: (stats) => stats.dailyStreak >= 7,
    },
    {
        id: "wallet_created",
        name: "Wallet Ready",
        description: "Your QC Wallet is set up and ready to use!",
        howToUnlock: "Create your QC Wallet in the Wallet section",
        icon: "solar:wallet-bold",
        condition: (stats) => stats.walletCreated,
    },
];

export function getUnlockedAchievements(stats: UserStats): Achievement[] {
    return achievements.filter((achievement) => achievement.condition(stats));
}

export function getLockedAchievements(stats: UserStats): Achievement[] {
    return achievements.filter((achievement) => !achievement.condition(stats));
}
