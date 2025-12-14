import { Trophy, Users, Zap, Star, Target, Award, Flame, Rocket, Crown, Medal } from "lucide-react";

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: typeof Trophy;
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
        description: "Earn your first QNTM",
        icon: Zap,
        condition: (stats) => stats.totalQntm > 0,
    },
    {
        id: "qntm_1k",
        name: "Getting Started",
        description: "Earn 1,000 QNTM",
        icon: Star,
        condition: (stats) => stats.totalQntm >= 1000,
    },
    {
        id: "qntm_10k",
        name: "Rising Star",
        description: "Earn 10,000 QNTM",
        icon: Rocket,
        condition: (stats) => stats.totalQntm >= 10000,
    },
    {
        id: "qntm_100k",
        name: "Quantum Master",
        description: "Earn 100,000 QNTM",
        icon: Crown,
        condition: (stats) => stats.totalQntm >= 100000,
    },
    {
        id: "first_referral",
        name: "Networker",
        description: "Invite your first friend",
        icon: Users,
        condition: (stats) => stats.referralCount >= 1,
    },
    {
        id: "referrals_5",
        name: "Team Builder",
        description: "Invite 5 friends",
        icon: Target,
        condition: (stats) => stats.referralCount >= 5,
    },
    {
        id: "referrals_10",
        name: "Community Leader",
        description: "Invite 10 friends",
        icon: Medal,
        condition: (stats) => stats.referralCount >= 10,
    },
    {
        id: "first_task",
        name: "Task Hunter",
        description: "Complete your first task",
        icon: Award,
        condition: (stats) => stats.tasksCompleted >= 1,
    },
    {
        id: "tasks_10",
        name: "Dedicated Player",
        description: "Complete 10 tasks",
        icon: Trophy,
        condition: (stats) => stats.tasksCompleted >= 10,
    },
    {
        id: "streak_7",
        name: "Consistent",
        description: "7-day daily streak",
        icon: Flame,
        condition: (stats) => stats.dailyStreak >= 7,
    },
    {
        id: "wallet_created",
        name: "Wallet Ready",
        description: "Create your QC Wallet",
        icon: Zap,
        condition: (stats) => stats.walletCreated,
    },
];

export function getUnlockedAchievements(stats: UserStats): Achievement[] {
    return achievements.filter((achievement) => achievement.condition(stats));
}

export function getLockedAchievements(stats: UserStats): Achievement[] {
    return achievements.filter((achievement) => !achievement.condition(stats));
}
