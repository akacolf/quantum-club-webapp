"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import Loader from "@/app/(components)/Loader";
import { toast } from "sonner";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { achievements, getUnlockedAchievements, getLockedAchievements, type UserStats, type Achievement } from "@/lib/achievements";
import { APP_VERSION } from "@/lib/version";

export default function ProfilePage() {
    useTelegramBackButton("/home");
    const router = useRouter();
    const { telegramId, username, MainQuantAmount, daily } = useUserContext();

    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [displayName, setDisplayName] = useState<string>("");
    const [stats, setStats] = useState<UserStats>({
        totalQntm: 0,
        referralCount: 0,
        tasksCompleted: 0,
        dailyStreak: 0,
        walletCreated: false,
    });

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

    // Fetch user data
    useEffect(() => {
        const fetchData = async () => {
            const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

            // Set display name from Telegram or context
            if (tgUser?.username) {
                setDisplayName(tgUser.username);
            } else if (tgUser?.first_name) {
                setDisplayName(tgUser.first_name);
            } else if (username) {
                setDisplayName(username);
            }

            // Fetch photo
            if (tgUser?.photo_url) {
                setPhotoUrl(tgUser.photo_url);
            } else if (tgUser?.id) {
                try {
                    const res = await fetch('/api/get-profile-photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ telegramId: tgUser.id })
                    });
                    const data = await res.json();
                    setPhotoUrl(data.photoUrl);
                } catch { }
            }

            // Fetch stats from Firebase
            if (telegramId) {
                try {
                    // Get referral count
                    const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
                    const referralsSnapshot = await getDocs(referralsRef);
                    const referralCount = referralsSnapshot.size;

                    // Get tasks completed
                    const tasksRef = collection(dbfs, `user/${telegramId}/tasks`);
                    const tasksSnapshot = await getDocs(tasksRef);
                    const tasksCompleted = tasksSnapshot.size;

                    // Get QNTM amount
                    const valuesRef = doc(dbfs, `user/${telegramId}/miningData/values`);
                    const valuesSnapshot = await getDoc(valuesRef);
                    const totalQntm = valuesSnapshot.exists() ? valuesSnapshot.data()?.QuantAmount || 0 : 0;

                    // Check wallet
                    const walletCreated = typeof window !== "undefined" && !!localStorage.getItem(`walletAddress_${telegramId}`);

                    setStats({
                        totalQntm,
                        referralCount,
                        tasksCompleted,
                        dailyStreak: daily || 0,
                        walletCreated,
                    });
                } catch (error) {
                    console.error("Error fetching stats:", error);
                }
            }

            setIsLoading(false);
        };

        // Prefetch legal pages
        router.prefetch("/wallet/settings/terms");
        router.prefetch("/wallet/settings/privacy");

        fetchData();
    }, [telegramId, daily, username, router]);

    const unlockedAchievements = getUnlockedAchievements(stats);
    const lockedAchievements = getLockedAchievements(stats);

    // Check if a specific achievement is unlocked
    const isAchievementUnlocked = (achievement: Achievement) => {
        return unlockedAchievements.some(a => a.id === achievement.id);
    };

    if (isLoading) {
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
                            <p className="text-xl font-bold text-foreground">{stats.referralCount}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/80 backdrop-blur-xl">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Icon icon="solar:checklist-minimalistic-bold" className="w-4 h-4" />
                                Tasks Done
                            </div>
                            <p className="text-xl font-bold text-foreground">{stats.tasksCompleted}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/80 backdrop-blur-xl">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Icon icon="solar:fire-bold" className="w-4 h-4" />
                                Daily Streak
                            </div>
                            <p className="text-xl font-bold text-foreground">{stats.dailyStreak} day{stats.dailyStreak !== 1 ? "s" : ""}</p>
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

                {/* Legal Links */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-3"
                >
                    <Card className="bg-card/80 backdrop-blur-xl border-border overflow-hidden">
                        <CardContent className="p-0">
                            <button
                                onClick={() => router.push("/wallet/settings/terms")}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted rounded-none transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                                        <Icon icon="solar:file-text-bold" className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-foreground">Terms of Service</p>
                                        <p className="text-xs text-muted-foreground">Read our terms and conditions</p>
                                    </div>
                                </div>
                                <Icon icon="solar:alt-arrow-right-linear" className="w-5 h-5 text-muted-foreground" />
                            </button>
                            <div className="border-t border-border" />
                            <button
                                onClick={() => router.push("/wallet/settings/privacy")}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted rounded-none transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                                        <Icon icon="solar:shield-bold" className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-foreground">Privacy Policy</p>
                                        <p className="text-xs text-muted-foreground">How we handle your data</p>
                                    </div>
                                </div>
                                <Icon icon="solar:alt-arrow-right-linear" className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </CardContent>
                    </Card>

                    {/* Support & Community */}
                    <Card className="bg-card/80 backdrop-blur-xl border-border overflow-hidden">
                        <CardContent className="p-0">
                            <a
                                href="https://t.me/QCSupportBot"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Icon icon="solar:headphones-round-sound-bold" className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-foreground">Get Support</p>
                                        <p className="text-xs text-muted-foreground">Contact our support team</p>
                                    </div>
                                </div>
                                <Icon icon="solar:arrow-right-up-linear" className="w-5 h-5 text-muted-foreground" />
                            </a>
                            <div className="border-t border-border" />
                            <a
                                href="https://t.me/quantumclubinc"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center">
                                        <Icon icon="solar:users-group-rounded-bold" className="w-5 h-5 text-cyan-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-foreground">Community</p>
                                        <p className="text-xs text-muted-foreground">Join announcements & updates</p>
                                    </div>
                                </div>
                                <Icon icon="solar:arrow-right-up-linear" className="w-5 h-5 text-muted-foreground" />
                            </a>
                        </CardContent>
                    </Card>

                    {/* App Version */}
                    <div className="text-center pt-2">
                        <p className="text-xs text-muted-foreground/60">
                            Quantum Club v{APP_VERSION}
                        </p>
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
