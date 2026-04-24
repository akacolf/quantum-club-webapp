"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useUserStatsQuery } from "@/app/(hooks)/queries/use-user-stats";
import { useServerAchievementsQuery } from "@/app/(hooks)/queries/use-badges";
import { useQcProfilePhoto } from "@/app/(hooks)/useQcProfilePhoto";
import Loader from "@/app/(components)/Loader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    achievements,
    resolveAchievements,
    RARITY_CONFIG,
    type Achievement,
} from "@/lib/achievements";


export default function ProfilePage() {
    useTelegramBackButton("/home");
    const { telegramId, username, MainQuantAmount, daily } = useUserContext();

    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const tgUser = typeof window !== "undefined" ? window.Telegram?.WebApp?.initDataUnsafe?.user : undefined;
    const displayName = username || tgUser?.username || tgUser?.first_name || "";
    const photoUrl = useQcProfilePhoto(telegramId);

    const { data: stats, isLoading: statsLoading } = useUserStatsQuery(telegramId, daily || 0);
    const { data: serverAchievements, isLoading: serverLoading } = useServerAchievementsQuery(telegramId ?? null);

    const resolvedStats = stats ?? { totalQntm: 0, referralCount: 0, tasksCompleted: 0, dailyStreak: 0, walletCreated: false };
    const serverAwardedIds = new Set(serverAchievements?.map((a) => a.achievementId) ?? []);
    const serverEarnedDates = new Map(serverAchievements?.map((a) => [a.achievementId, a.earnedAt]) ?? []);

    const { unlocked, locked } = resolveAchievements(resolvedStats, serverAwardedIds);

    const handleAchievementClick = (achievement: Achievement) => {
        setSelectedAchievement(achievement);
        setIsSheetOpen(true);
    };

    const isUnlocked = (achievement: Achievement) =>
        unlocked.some((a) => a.id === achievement.id);

    if (statsLoading || serverLoading) {
        return <Loader />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 p-4 pt-8 space-y-6">
                {/* Profile Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center space-y-4"
                >
                    <div className="w-28 h-28 rounded-full border-2 border-border bg-card flex items-center justify-center overflow-hidden">
                        {photoUrl ? (
                            <Image
                                src={photoUrl}
                                alt="Profile"
                                width={112}
                                height={112}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        ) : (
                            <Icon icon="solar:user-bold" className="w-12 h-12 text-muted-foreground" />
                        )}
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-foreground">
                            {displayName || username || "Quantum User"}
                        </h1>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 gap-3"
                >
                    <Card className="bg-card/80 backdrop-blur-xl">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Icon icon="solar:wallet-money-bold" className="w-4 h-4" />
                                Total QNTM
                            </div>
                            <p className="text-xl font-bold text-foreground">{MainQuantAmount || "0"}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/80 backdrop-blur-xl">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4" />
                                Referrals
                            </div>
                            <p className="text-xl font-bold text-foreground">{resolvedStats.referralCount}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/80 backdrop-blur-xl">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Icon icon="solar:checklist-minimalistic-bold" className="w-4 h-4" />
                                Tasks Done
                            </div>
                            <p className="text-xl font-bold text-foreground">{resolvedStats.tasksCompleted}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/80 backdrop-blur-xl">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Icon icon="solar:fire-bold" className="w-4 h-4" />
                                Daily Streak
                            </div>
                            <p className="text-xl font-bold text-foreground">{resolvedStats.dailyStreak} day{resolvedStats.dailyStreak !== 1 ? "s" : ""}</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Achievements Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Icon icon="solar:cup-star-bold" className="w-5 h-5 text-yellow-500" />
                        Achievements
                        <span className="text-sm font-normal text-muted-foreground">
                            ({unlocked.length}/{achievements.length})
                        </span>
                    </h2>

                    <div className="grid grid-cols-3 gap-3">
                        {unlocked.map((achievement) => (
                            <motion.div
                                key={achievement.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAchievementClick(achievement)}
                                className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-3 flex flex-col items-center text-center cursor-pointer active:opacity-80"
                            >
                                <Icon
                                    icon={achievement.icon}
                                    className={`w-8 h-8 ${achievement.color} mb-1`}
                                />
                                <p className="text-xs font-medium text-foreground leading-tight">{achievement.name}</p>
                                <Badge className={`mt-1.5 text-[8px] px-1.5 py-0 ${RARITY_CONFIG[achievement.rarity].bg}`}>
                                    {RARITY_CONFIG[achievement.rarity].label}
                                </Badge>
                            </motion.div>
                        ))}

                        {locked.map((achievement) => (
                            <motion.div
                                key={achievement.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAchievementClick(achievement)}
                                className="bg-card/50 border border-border rounded-xl p-3 flex flex-col items-center text-center opacity-60 cursor-pointer active:opacity-40"
                            >
                                <Icon
                                    icon="solar:lock-keyhole-bold"
                                    className="w-8 h-8 text-muted-foreground mb-1"
                                />
                                <p className="text-xs text-muted-foreground leading-tight">{achievement.name}</p>
                                <Badge className={`mt-1.5 text-[8px] px-1.5 py-0 ${RARITY_CONFIG[achievement.rarity].bg}`}>
                                    {RARITY_CONFIG[achievement.rarity].label}
                                </Badge>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Achievement Detail Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl">
                    {selectedAchievement && (
                        <>
                            <SheetHeader className="text-center pb-4">
                                <div className="flex justify-center mb-4">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isUnlocked(selectedAchievement)
                                        ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50"
                                        : "bg-card border-2 border-border"
                                        }`}>
                                        <Icon
                                            icon={isUnlocked(selectedAchievement)
                                                ? selectedAchievement.icon
                                                : "solar:lock-keyhole-bold"
                                            }
                                            className={`w-10 h-10 ${isUnlocked(selectedAchievement)
                                                ? selectedAchievement.color
                                                : "text-muted-foreground"
                                                }`}
                                        />
                                    </div>
                                </div>
                                <SheetTitle className="text-xl">
                                    {selectedAchievement.name}
                                </SheetTitle>
                                <SheetDescription className="text-base">
                                    {selectedAchievement.description}
                                </SheetDescription>
                                <Badge className={`mx-auto mt-2 ${RARITY_CONFIG[selectedAchievement.rarity].bg}`}>
                                    {RARITY_CONFIG[selectedAchievement.rarity].label}
                                </Badge>
                            </SheetHeader>

                            <div className="space-y-4 pt-2">
                                {isUnlocked(selectedAchievement) ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-2 text-green-500">
                                            <Icon icon="solar:verified-check-bold" className="w-5 h-5 text-green-500" />
                                            <span className="text-sm font-medium text-green-500">Unlocked!</span>
                                        </div>
                                        {selectedAchievement.source === "server" && serverEarnedDates.has(selectedAchievement.id) && (
                                            <p className="text-xs text-muted-foreground">
                                                Earned {serverEarnedDates.get(selectedAchievement.id)!.toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-center">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-full">
                                                <Icon icon="solar:lock-keyhole-bold" className="w-5 h-5 text-muted-foreground" />
                                                <span className="text-sm font-medium text-muted-foreground">Locked</span>
                                            </div>
                                        </div>
                                        <Card className="bg-card/80">
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <Icon icon="solar:lightbulb-bolt-bold" className="w-5 h-5 text-primary mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground mb-1">How to unlock</p>
                                                        <p className="text-sm text-muted-foreground">{selectedAchievement.howToUnlock}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
