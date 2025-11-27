"use client";

import { useGameContext } from "@/app/(contexts)/MiningContext";
import { Card, CardContent } from "@/components/ui/card";

export default function PersonalizedGreeting() {
  const { username } = useGameContext();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour>6&&hour <= 12) return "Good morning";
    if (hour >12 &&hour < 18) return "Good afternoon";
    return "Good evening";
  };



  const displayName = username || "Quantum User";

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.15;
          }
          25% {
            transform: translate(40px, -30px) scale(1.3);
            opacity: 0.25;
          }
          50% {
            transform: translate(-30px, 40px) scale(0.8);
            opacity: 0.2;
          }
          75% {
            transform: translate(30px, 30px) scale(1.2);
            opacity: 0.22;
          }
        }
        @keyframes floatReverse {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.08;
          }
          25% {
            transform: translate(-50px, 40px) scale(0.7);
            opacity: 0.15;
          }
          50% {
            transform: translate(35px, -35px) scale(1.4);
            opacity: 0.12;
          }
          75% {
            transform: translate(-25px, -25px) scale(1.1);
            opacity: 0.1;
          }
        }
        @keyframes floatSlow {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.05;
          }
          33% {
            transform: translate(-40%, -60%) scale(1.5);
            opacity: 0.1;
          }
          66% {
            transform: translate(-60%, -40%) scale(0.7);
            opacity: 0.08;
          }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: floatReverse 10s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: floatSlow 12s ease-in-out infinite;
        }
      `}</style>
      <div className="w-[90%] mx-auto mt-3 mb-1">
        <Card className="relative overflow-hidden border border-[#2a2a2a] bg-gradient-to-br from-[#0f0f0f] via-[#111] to-[#1a1a1a] shadow-xl hover:shadow-2xl transition-all duration-500">
          {/* Animated Background Glow Effects */}
          <div className="absolute -left-4 -top-4 h-20 w-20 rounded-full bg-cyan-500/20 blur-xl pointer-events-none animate-float" />
          <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-blue-500/12 blur-xl pointer-events-none animate-float-reverse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 rounded-full bg-indigo-500/8 blur-2xl pointer-events-none animate-float-slow" />
          
          {/* Subtle border gradient */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/0 via-blue-500/5 to-indigo-500/0 opacity-50 pointer-events-none" />
        
        <CardContent className="p-2.5 sm:p-3 relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight tracking-tight">
                <span className="inline-block transition-all duration-300">{getGreeting()},</span>{" "}
                <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-indigo-300 bg-clip-text text-transparent font-extrabold">
                  {displayName}
                </span>
              </h1>
              
              <p className="text-[10px] sm:text-xs text-gray-400/90 font-medium tracking-wide">
                Welcome back to Quantum Club.
              </p>
            </div>
            
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

