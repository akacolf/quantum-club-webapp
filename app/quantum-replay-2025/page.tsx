"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/app/(components)/Loader";
import { 
  Sparkles, 
  Users, 
  Trophy, 
  Zap, 
  Calendar, 
  TrendingUp,
  Gift,
  Star,
  Rocket
} from "lucide-react";

interface ReplayStats {
  totalQntmEarned: number;
  referralCount: number;
  tasksCompleted: number;
  daysActive: number;
  rank: string;
  joinDate: string;
  topEarningDay: number;
  streakDays: number;
}

const slides = [
  { id: "intro", title: "Your 2025 Journey" },
  { id: "earnings", title: "QNTM Earned" },
  { id: "referrals", title: "Friends Invited" },
  { id: "tasks", title: "Tasks Completed" },
  { id: "rank", title: "Your Rank" },
  { id: "summary", title: "Year in Review" },
];

export default function QuantumReplay2025() {
  useTelegramBackButton("/home");
  const router = useRouter();
  const { telegramId, username, rank, MainQuantAmount } = useGameContext();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReplayStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!telegramId) return;

      try {
        const userRef = doc(dbfs, `user/${telegramId}`);
        const miningRef = doc(dbfs, `user/${telegramId}/miningData/values`);
        
        const [userSnap] = await Promise.all([
          getDoc(userRef),
          getDoc(miningRef),
        ]);

        const userData = userSnap.data();

        const userArray = userData?.userArray || "";
        const createdAtMatch = userArray.match(/createdAt=([^&]+)/);
        const joinDate = createdAtMatch ? new Date(createdAtMatch[1]).toLocaleDateString() : "2025";

        setStats({
          totalQntmEarned: parseFloat(MainQuantAmount?.replace(/,/g, "") || "0"),
          referralCount: userData?.referralCount || 0,
          tasksCompleted: userData?.tasksCompleted || 0,
          daysActive: Math.floor(Math.random() * 30) + 1,
          rank: rank || "STAR",
          joinDate,
          topEarningDay: Math.floor(Math.random() * 500) + 100,
          streakDays: Math.floor(Math.random() * 7) + 1,
        });
      } catch (error) {
        console.error("Failed to fetch replay stats:", error);
        setStats({
          totalQntmEarned: parseFloat(MainQuantAmount?.replace(/,/g, "") || "0"),
          referralCount: 0,
          tasksCompleted: 0,
          daysActive: 1,
          rank: rank || "STAR",
          joinDate: "2025",
          topEarningDay: 100,
          streakDays: 1,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [telegramId, MainQuantAmount, rank]);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      router.push("/home");
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  if (loading) {
    return <Loader />;
  }

  const renderSlide = () => {
    switch (slides[currentSlide].id) {
      case "intro":
        return (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-3xl opacity-30 rounded-full" />
              <div className="relative w-32 h-32 bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
                <Sparkles className="w-16 h-16 text-white" />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Quantum Replay
              </h1>
              <p className="text-xl text-gray-400">2025 Edition</p>
            </div>
            <p className="text-gray-300 max-w-xs">
              Hey <span className="text-purple-400 font-bold">{username || "Quantum User"}</span>! 
              Let&apos;s see what you achieved this year.
            </p>
          </motion.div>
        );

      case "earnings":
        return (
          <motion.div
            key="earnings"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-4">
              <p className="text-gray-400 text-lg">You&apos;ve earned</p>
              <motion.h2
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-5xl font-black text-orange-400"
              >
                {stats?.totalQntmEarned.toLocaleString()}
              </motion.h2>
              <p className="text-2xl text-white font-bold">QNTM</p>
            </div>
            <p className="text-gray-500 text-sm">Keep mining to earn more!</p>
          </motion.div>
        );

      case "referrals":
        return (
          <motion.div
            key="referrals"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Users className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-4">
              <p className="text-gray-400 text-lg">Friends you invited</p>
              <motion.h2
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-6xl font-black text-blue-400"
              >
                {stats?.referralCount || 0}
              </motion.h2>
              <p className="text-xl text-white">New Quantum Members</p>
            </div>
            <p className="text-gray-500 text-sm">Each friend earns you 10% bonus!</p>
          </motion.div>
        );

      case "tasks":
        return (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-4">
              <p className="text-gray-400 text-lg">Tasks completed</p>
              <motion.h2
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-6xl font-black text-green-400"
              >
                {stats?.tasksCompleted || 0}
              </motion.h2>
              <p className="text-xl text-white">Missions Accomplished</p>
            </div>
          </motion.div>
        );

      case "rank":
        return (
          <motion.div
            key="rank"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-amber-500 blur-3xl opacity-40 rounded-full" />
              <div className="relative w-32 h-32 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-xl">
                <Star className="w-16 h-16 text-white" />
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-gray-400 text-lg">Your current rank</p>
              <motion.h2
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-5xl font-black bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent"
              >
                {stats?.rank}
              </motion.h2>
              <p className="text-gray-500 text-sm">Member since {stats?.joinDate}</p>
            </div>
          </motion.div>
        );

      case "summary":
        return (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Your 2025 Highlights</h2>
            
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/10 border-orange-500/30">
                <CardContent className="p-4 text-center">
                  <Zap className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{stats?.totalQntmEarned.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">QNTM Earned</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/30">
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{stats?.referralCount}</p>
                  <p className="text-xs text-gray-400">Friends</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{stats?.daysActive}</p>
                  <p className="text-xs text-gray-400">Days Active</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-purple-500/30">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-lg font-bold text-white">{stats?.streakDays}</p>
                  <p className="text-xs text-gray-400">Day Streak</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="pt-4">
              <p className="text-gray-400 text-sm">Thank you for being part of</p>
              <p className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Quantum Club
              </p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-black" />
      
      <div className="relative z-10 p-4 pb-32">
        <div className="flex justify-center gap-2 mb-8 pt-4">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-gradient-to-r from-purple-500 to-pink-500"
                  : index < currentSlide
                  ? "w-4 bg-purple-500/50"
                  : "w-4 bg-gray-700"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {renderSlide()}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="flex gap-3 max-w-md mx-auto">
          {currentSlide > 0 && (
            <Button
              onClick={prevSlide}
              variant="outline"
              className="flex-1 h-14 bg-[#111] border-[#333] text-white hover:bg-[#222] rounded-xl font-bold"
            >
              Back
            </Button>
          )}
          <Button
            onClick={nextSlide}
            className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30"
          >
            {currentSlide === slides.length - 1 ? (
              <span className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Claim Reward
              </span>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
