"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import Loader from "@/app/(components)/Loader";
import { toast } from "sonner";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import {
    User,
    Copy,
    Check,
    Coins,
    Users,
    ListChecks,
    Flame,
    Lock,
} from "lucide-react";
import { achievements, getUnlockedAchievements, getLockedAchievements, type UserStats } from "@/lib/achievements";

export default function ProfilePage() {
    useTelegramBackButton("/home");
    const { telegramId, username, MainQuantAmount, daily } = useGameContext();

    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
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

    // Fetch user data
    useEffect(() => {
        const fetchData = async () => {
            const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

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
                    const walletCreated = typeof window !== "undefined" && !!localStorage.getItem("walletAddress");

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

        fetchData();
    }, [telegramId, daily]);

    const unlockedAchievements = getUnlockedAchievements(stats);
    const lockedAchievements = getLockedAchievements(stats);

    if (isLoading) {
        return <Loader />;
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
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
                    <div className="w-28 h-28 rounded-full border-2 border-[#333] bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
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
                            <User className="w-12 h-12 text-gray-500" />
                        )}
                    </div>

                    {/* Username */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-white">
                            {username || "Quantum User"}
                        </h1>
                    </div>

                    {/* QC ID - Tappable to copy */}
                    <motion.button
                        onClick={handleCopyId}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a]/80 border border-[#333] rounded-xl backdrop-blur-xl transition-colors hover:bg-[#2a2a2a]/80"
                    >
                        <span className="text-sm text-gray-400">QC ID:</span>
                        <span className="text-sm font-mono text-white">
                            {telegramId}
                        </span>
                        {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                        ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
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
                    <div className="bg-[#1a1a1a]/80 border border-[#333] rounded-xl p-4 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                            <Coins className="w-4 h-4" />
                            Total QNTM
                        </div>
                        <p className="text-xl font-bold text-white">{MainQuantAmount || "0"}</p>
                    </div>
                    <div className="bg-[#1a1a1a]/80 border border-[#333] rounded-xl p-4 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                            <Users className="w-4 h-4" />
                            Referrals
                        </div>
                        <p className="text-xl font-bold text-white">{stats.referralCount}</p>
                    </div>
                    <div className="bg-[#1a1a1a]/80 border border-[#333] rounded-xl p-4 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                            <ListChecks className="w-4 h-4" />
                            Tasks Done
                        </div>
                        <p className="text-xl font-bold text-white">{stats.tasksCompleted}</p>
                    </div>
                    <div className="bg-[#1a1a1a]/80 border border-[#333] rounded-xl p-4 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                            <Flame className="w-4 h-4" />
                            Daily Streak
                        </div>
                        <p className="text-xl font-bold text-white">{stats.dailyStreak} day{stats.dailyStreak !== 1 ? "s" : ""}</p>
                    </div>
                </motion.div>

                {/* Achievements Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        🏆 Achievements
                        <span className="text-sm font-normal text-gray-400">
                            ({unlockedAchievements.length}/{achievements.length})
                        </span>
                    </h2>

                    {/* Unlocked Achievements */}
                    {unlockedAchievements.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                            {unlockedAchievements.map((achievement) => {
                                const Icon = achievement.icon;
                                return (
                                    <motion.div
                                        key={achievement.id}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-3 flex flex-col items-center text-center"
                                    >
                                        <Icon className="w-8 h-8 text-yellow-400 mb-2" />
                                        <p className="text-xs font-medium text-white">{achievement.name}</p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* Locked Achievements */}
                    {lockedAchievements.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                            {lockedAchievements.map((achievement) => (
                                <div
                                    key={achievement.id}
                                    className="bg-[#1a1a1a]/50 border border-[#333] rounded-xl p-3 flex flex-col items-center text-center opacity-50"
                                >
                                    <Lock className="w-8 h-8 text-gray-500 mb-2" />
                                    <p className="text-xs text-gray-500">{achievement.name}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
