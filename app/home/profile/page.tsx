"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useUserStatsQuery } from "@/app/(hooks)/queries/use-user-stats";
import Loader from "@/app/(components)/Loader";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { achievements, getUnlockedAchievements, getLockedAchievements, type Achievement } from "@/lib/achievements";


export default function ProfilePage() {
    useTelegramBackButton("/home");
    const router = useRouter();
    const { telegramId, username, MainQuantAmount, daily } = useUserContext();

    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [displayName, setDisplayName] = useState<string>("");

    const { data: stats, isLoading: statsLoading } = useUserStatsQuery(telegramId, daily || 0);

    // Derive a stable stats object for achievements (use defaults while loading)
    const resolvedStats = useMemo(
        () => stats ?? { totalQntm: 0, referralCount: 0, tasksCompleted: 0, dailyStreak: 0, walletCreated: false },
        [stats],
    );

    // Copy QC ID to clipboard
    const handleCopyId = async () => {
        if (!telegramId) return;
        try {
            await navigator.clipboard.writeText(telegramId);
            setCopied(true);
            toast.success("QC ID copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy ID");
        }
    };

    // Open achievement details
    const handleAchievementClick = (achievement: Achievement) => {
        setSelectedAchievement(achievement);
        setIsSheetOpen(true);
    };

    // Fetch display name and photo URL (separate from stats)
    useEffect(() => {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

        // Prefer DB-stored username (works for email login from different TG account)
        if (username) {
            setDisplayName(username);
        } else if (tgUser?.username) {
            setDisplayName(tgUser.username);
        } else if (tgUser?.first_name) {
            setDisplayName(tgUser.first_name);
        }

        // Fetch photo — use DB telegramId as fallback
        if (tgUser?.photo_url) {
            setPhotoUrl(tgUser.photo_url);
        } else if (telegramId) {
            fetch('/api/get-profile-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId })
            })
                .then((res) => res.json())
                .then((data) => setPhotoUrl(data.photoUrl))
                .catch(() => { });
        }

        // Prefetch legal pages
        router.prefetch("/wallet/settings/terms");
        router.prefetch("/wallet/settings/privacy");
    }, [telegramId, username, router]);

    const unlockedAchievements = getUnlockedAchievements(resolvedStats);
    const lockedAchievements = getLockedAchievements(resolvedStats);

    // Check if a specific achievement is unlocked
    const isAchievementUnlocked = (achievement: Achievement) => {
        return unlockedAchievements.some(a => a.id === achievement.id);
    };

    if (statsLoading) {
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
                    {/* Profile Photo */}
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

                    {/* Username */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-foreground">
                            {displayName || username || "Quantum User"}
                        </h1>
                    </div>

                    {/* QC ID - Tappable to copy */}
                    <motion.button
                        onClick={handleCopyId}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2 bg-card/80 border border-border rounded-xl backdrop-blur-xl transition-colors hover:bg-accent"
                    >
                        <span className="text-sm text-muted-foreground">QC ID:</span>
                        <span className="text-sm font-mono text-foreground">
                            {telegramId}
                        </span>
                        {copied ? (
                            <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-green-400" />
                        ) : (
                            <Icon icon="solar:copy-bold" className="w-4 h-4 text-muted-foreground" />
                        )}
                    </motion.button>
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
                            ({unlockedAchievements.length}/{achievements.length})
                        </span>
                    </h2>

                    {/* All Achievements Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* Unlocked first, then locked */}
                        {unlockedAchievements.map((achievement) => (
                            <motion.div
                                key={achievement.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAchievementClick(achievement)}
                                className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-3 flex flex-col items-center text-center cursor-pointer active:opacity-80"
                            >
                                <Icon
                                    icon={achievement.icon}
                                    className="w-8 h-8 text-yellow-400 mb-2"
                                />
                                <p className="text-xs font-medium text-foreground">{achievement.name}</p>
                            </motion.div>
                        ))}

                        {lockedAchievements.map((achievement) => (
                            <motion.div
                                key={achievement.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAchievementClick(achievement)}
                                className="bg-card/50 border border-border rounded-xl p-3 flex flex-col items-center text-center opacity-60 cursor-pointer active:opacity-40"
                            >
                                <Icon
                                    icon="solar:lock-keyhole-bold"
                                    className="w-8 h-8 text-muted-foreground mb-2"
                                />
                                <p className="text-xs text-muted-foreground">{achievement.name}</p>
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
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isAchievementUnlocked(selectedAchievement)
                                        ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50"
                                        : "bg-card border-2 border-border"
                                        }`}>
                                        <Icon
                                            icon={isAchievementUnlocked(selectedAchievement)
                                                ? selectedAchievement.icon
                                                : "solar:lock-keyhole-bold"
                                            }
                                            className={`w-10 h-10 ${isAchievementUnlocked(selectedAchievement)
                                                ? "text-yellow-400"
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
                            </SheetHeader>

                            <div className="space-y-4 pt-2">
                                {/* Status */}
                                <div className="flex items-center justify-center gap-2">
                                    {isAchievementUnlocked(selectedAchievement) ? (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
                                            <Icon icon="solar:verified-check-bold" className="w-5 h-5 text-green-500" />
                                            <span className="text-sm font-medium text-green-500">Unlocked!</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-full">
                                            <Icon icon="solar:lock-keyhole-bold" className="w-5 h-5 text-muted-foreground" />
                                            <span className="text-sm font-medium text-muted-foreground">Locked</span>
                                        </div>
                                    )}
                                </div>

                                {/* How to unlock */}
                                {!isAchievementUnlocked(selectedAchievement) && (
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
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
