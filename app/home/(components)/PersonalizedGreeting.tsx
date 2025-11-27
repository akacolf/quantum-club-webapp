"use client";

import { useGameContext } from "@/app/(contexts)/MiningContext";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function PersonalizedGreeting() {
  const { username } = useGameContext();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch for time-based rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const greeting = getGreeting();
  const displayName = username || "Quantum User";

  if (!mounted) return null; // Or a skeleton loader

  return (
    <>
      <style>{`
        .bg-grid-pattern {
          background-size: 30px 30px;
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
      `}</style>

      <div className="w-[90%] mx-auto mt-3 mb-1">
        <Card className="relative overflow-hidden border-0 bg-black/40 backdrop-blur-md shadow-2xl group ring-1 ring-white/10 hover:ring-cyan-500/30 transition-all duration-700">
          
          {/* --- Background Effects --- */}
          
          {/* 1. Cyber Grid */}
          <div className="absolute inset-0 bg-grid-pattern opacity-50 pointer-events-none" />
          
          {/* 2. Gradient Glows */}
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-[60px] group-hover:bg-cyan-500/20 transition-all duration-700" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-[60px] group-hover:bg-indigo-500/20 transition-all duration-700" />

          {/* 3. Subtle noise/texture overlay (Optional) */}
          <div className="absolute inset-0 opacity-[0.03] bg-noise pointer-events-none" />

          {/* --- Content --- */}
          <CardContent className="p-2.5 sm:p-3 relative z-10">
            <div className="flex items-center justify-center">
              
              {/* Centered: Text */}
              <div className="flex flex-col gap-1">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight whitespace-nowrap flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 animate-pulse text-cyan-400/80 shrink-0" />
                  <span className="text-gray-400 font-medium">{greeting},</span>
                  <span className="bg-linear-to-r from-cyan-200 via-blue-100 to-indigo-200 bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    {displayName}
                  </span>
                </h1>
              </div>

            </div>
          </CardContent>

          {/* Bottom Progress Line (Decoration) */}
          <div className="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-transparent via-cyan-500/50 to-transparent opacity-50" />
        </Card>
      </div>
    </>
  );
}