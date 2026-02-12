import { memo, useEffect, useMemo, useState } from "react";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { doc, getDoc } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";

const TelegramSVG = memo(({ className }: { className?: string }) => (
        <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              className={className}
            >
              <defs>
                <linearGradient
                  id="logosTelegram0"
                  x1="50%"
                  x2="50%"
                  y1="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#2aabee" />
                  <stop offset="100%" stopColor="#229ed9" />
                </linearGradient>
              </defs>
              <path
                fill="url(#logosTelegram0)"
                d="M128 0C94.06 0 61.48 13.494 37.5 37.49A128.04 128.04 0 0 0 0 128c0 33.934 13.5 66.514 37.5 90.51C61.48 242.506 94.06 256 128 256s66.52-13.494 90.5-37.49c24-23.996 37.5-56.576 37.5-90.51s-13.5-66.514-37.5-90.51C194.52 13.494 161.94 0 128 0"
              />
              <path
                fill="#fff"
                d="M57.94 126.648q55.98-24.384 74.64-32.152c35.56-14.786 42.94-17.354 47.76-17.441c1.06-.017 3.42.245 4.96 1.49c1.28 1.05 1.64 2.47 1.82 3.467c.16.996.38 3.266.2 5.038c-1.92 20.24-10.26 69.356-14.5 92.026c-1.78 9.592-5.32 12.808-8.74 13.122c-7.44.684-13.08-4.912-20.28-9.63c-11.26-7.386-17.62-11.982-28.56-19.188c-12.64-8.328-4.44-12.906 2.76-20.386c1.88-1.958 34.64-31.748 35.26-34.45c.08-.338.16-1.598-.6-2.262c-.74-.666-1.84-.438-2.64-.258c-1.14.256-19.12 12.152-54 35.686c-5.1 3.508-9.72 5.218-13.88 5.128c-4.56-.098-13.36-2.584-19.9-4.708c-8-2.606-14.38-3.984-13.82-8.41c.28-2.304 3.46-4.662 9.52-7.072"
              />
            </svg>
    ));
    TelegramSVG.displayName = 'TelegramIcon';

export default function StoryStats() {
  
  const { rank, telegramId } = useUserContext();
  const [fetchedFirstQuant, setFetchedFirstQuant] = useState<string | null>(null);

  const quantValue = useMemo(() => {
    if (fetchedFirstQuant) return fetchedFirstQuant;
    if (typeof window === "undefined") return "0";
    return (
      sessionStorage.getItem("firstQuant") ||
      (telegramId ? localStorage.getItem(`firstQuant_${telegramId}`) : null) ||
      "0"
    );
  }, [fetchedFirstQuant, telegramId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("firstQuant")) return;
    if (!telegramId) return;

    let cancelled = false;
    const loadFirstQuant = async () => {
      try {
        const snapshot = await getDoc(doc(dbfs, `user/${telegramId}/miningData/values`));
        if (!snapshot.exists() || cancelled) return;
        const firstQuant = Number(snapshot.data()?.firstQuant || 0);
        const formattedAmount = firstQuant.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
        setFetchedFirstQuant(formattedAmount);
        sessionStorage.setItem("firstQuant", formattedAmount);
        localStorage.setItem(`firstQuant_${telegramId}`, formattedAmount);
      } catch (error) {
        console.error("Failed to load story firstQuant:", error);
      }
    };

    loadFirstQuant();
    return () => {
      cancelled = true;
    };
  }, [telegramId]);

    return (
        <div className="grid gap-4 px-4">
            <Card className="bg-[#1a1a1a]/60 border-[#333] backdrop-blur-xl overflow-hidden relative group transition-all hover:bg-[#1a1a1a]/80">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20" />
                <CardContent className="p-5 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <Icon icon="lucide:wallet" className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <TelegramSVG className="w-3 h-3" />
                            <span className="text-[10px] font-medium text-blue-300 uppercase tracking-wide">Ecosystem</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-gray-400 font-medium">Total Earned</div>
                        <div className="text-2xl font-bold text-white">{quantValue} <span className="text-sm text-gray-500 font-normal">QNTM</span></div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a]/60 border-[#333] backdrop-blur-xl overflow-hidden relative group transition-all hover:bg-[#1a1a1a]/80">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/20" />
                <CardContent className="p-5 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <Icon icon="lucide:trophy" className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <TelegramSVG className="w-3 h-3" />
                            <span className="text-[10px] font-medium text-purple-300 uppercase tracking-wide">Account Age</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-gray-400 font-medium">Global Rank</div>
                        <div className="text-2xl font-bold text-white">#{rank}</div>
                    </div>
                </CardContent>
            </Card>
      </div>
    )
}
