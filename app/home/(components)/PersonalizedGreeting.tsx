"use client";

import { useGameContext } from "@/app/(contexts)/MiningContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PersonalizedGreeting() {
  const { username } = useGameContext();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "🌅";
    if (hour < 18) return "☀️";
    return "🌙";
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  };

  const displayName = username || "Quantum User";

  return (
    <div className="w-[90%] mx-auto mt-3 mb-1">
      <Card className="relative overflow-hidden border border-[#2a2a2a] bg-gradient-to-br from-[#0f0f0f] via-[#111] to-[#1a1a1a] shadow-xl hover:shadow-2xl transition-all duration-500">
        {/* Animated Background Glow Effects */}
        <div className="absolute -left-4 -top-4 h-16 w-16 rounded-full bg-cyan-500/15 blur-xl pointer-events-none animate-pulse" />
        <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-blue-500/8 blur-xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
        
        {/* Subtle border gradient */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/0 via-blue-500/5 to-indigo-500/0 opacity-50 pointer-events-none" />
        
        <CardContent className="p-2.5 sm:p-3 relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className="bg-gradient-to-r from-cyan-500/15 to-blue-600/10 border-cyan-500/40 text-cyan-300 text-[8px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 shadow-[0_0_8px_rgba(6,182,212,0.2)] backdrop-blur-sm"
                >
                  {getTimeOfDay()}
                </Badge>
                <span className="text-base sm:text-lg transition-transform duration-300 hover:scale-110 inline-block">
                  {getGreetingEmoji()}
                </span>
              </div>
              
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight tracking-tight">
                <span className="inline-block transition-all duration-300">{getGreeting()},</span>{" "}
                <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-indigo-300 bg-clip-text text-transparent font-extrabold">
                  {displayName}
                </span>
                <span className="inline-block ml-1 transition-transform duration-300 hover:scale-110">👋</span>
              </h1>
              
              <p className="text-[10px] sm:text-xs text-gray-400/90 font-medium tracking-wide">
                Welcome back to Quantum Club.
              </p>
            </div>
            
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

