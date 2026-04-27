'use client';

import { useSyncExternalStore } from "react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function Roadmap() {
  useTelegramBackButton();
  const { username } = useUserContext();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const tgFirstName = mounted
    ? window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || username || "Quantum User"
    : "Quantum User";

  const roadmapItems = [
    {
      title: "Leaderboard",
      date: "February 2025",
      description: "The leaderboard has been introduced.",
      status: "completed"
    },
    {
      title: "Daily Check-ins",
      date: "February 2025",
      description: "Introduced daily check-ins to provide more QNTM earning opportunities.",
      status: "completed"
    },
    {
      title: "Solve-to-Earn",
      date: "March 2025",
      description: "Solve-to-Earn was introduced as part of a unique model in GameFi.",
      status: "completed"
    },
    {
      title: "TON Connect",
      date: "March 2025",
      description: "Wallet connection was made available to users.",
      status: "completed"
    },
    {
      title: "QC Wallet (Beta)",
      date: "Q1 2026",
      description: "A secure and powerful self-custody Web3 wallet with multi-chain support, staking, swaps, liquidity provision, and batch transactions.",
      status: "completed"
    },
    {
      title: "QC AI",
      date: "Q1 2026",
      description: "AI-powered assistant for portfolio analysis, token insights, and intelligent transaction support.",
      status: "completed"
    },
    {
      title: "Yield Aggregator",
      date: "Q1 2026",
      description: "Multi-protocol yield optimization with staking, liquidity pools, and LP farming. Find the best APY automatically.",
      status: "completed"
    },
    {
      title: "NFT Marketplace (Beta)",
      date: "Q1 2026",
      description: "Discover, buy, sell, and manage NFTs directly within the wallet. Browse collections, view floor prices, and trade seamlessly.",
      status: "completed"
    },
    {
      title: "AI-powered Trading Platform",
      date: "Q1 2026",
      description: "A powerful trading platform for seamless crypto trading with AI insights and smart alerts.",
      status: "current"
    },
    {
      title: "QC Pay",
      date: "Q2 2026",
      description: "P2P payments with QR codes, payment links, and recurring payments for everyday crypto transactions.",
      status: "upcoming"
    },
    {
      title: "Copy Trading",
      date: "Q3 2026",
      description: "Follow and auto-copy successful traders. Learn while you earn.",
      status: "upcoming"
    },
    {
      title: "QC SDK & API",
      date: "Q4 2026",
      description: "Developer tools and APIs to build on the Quantum Club platform.",
      status: "upcoming"
    },
    {
      title: "Establishment of Quantum Club Labs",
      date: "Q4 2026",
      description: "Research and development arm for blockchain innovation.",
      status: "upcoming"
    },
    {
      title: "QC Token",
      date: "Q1 2027",
      description: "Native utility token with real utility for fees, governance, and staking rewards.",
      status: "upcoming"
    },
    {
      title: "Establishment of the Quantum Club Chain",
      date: "Q2 2027",
      description: "Our own blockchain infrastructure for the Quantum Club ecosystem.",
      status: "upcoming"
    },
    {
      title: "iOS & Android Apps",
      date: "Q2 2027",
      description: "Native mobile applications for iOS and Android, bringing the full Quantum Club experience to your pocket.",
      status: "upcoming"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="font-bold text-3xl text-white tracking-tight">Back at the roadmap, {tgFirstName}.</h1>
        <p className="text-neutral-400 mt-2 text-sm">Our goals to build the future of Quantum Club.</p>
      </motion.div>

      <div className="relative ml-3 space-y-8 before:absolute before:left-0 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-white/10">
        {roadmapItems.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="ml-8 relative"
          >
            {/* Timeline Dot */}
            <div className={`absolute -left-[43px] top-0 flex items-center justify-center w-8 h-8 rounded-full ${
              item.status === 'completed' ? 'bg-green-500' : 'bg-[#333]'
            }`}>
              {item.status === 'completed' ? (
                <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              ) : item.status === 'current' ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
              ) : (
                <div className="w-2 h-2 bg-neutral-500 rounded-full" />
              )}
            </div>

            {/* Content Card */}
            <Card className={`rounded-2xl transition-colors duration-300 ${
              item.status === 'current'
                ? 'bg-[#111] shadow-[0_0_20px_rgba(249,115,22,0.1)]'
                : 'bg-[#111]'
              }`}>
              <CardContent className="p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-2">
                  <h3 className={`text-lg font-bold ${
                    item.status === 'completed' || item.status === 'current'
                      ? 'text-white'
                      : 'text-neutral-300'
                    } flex-1`}>
                    {item.title}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="rounded-lg border-0 bg-[#222] text-neutral-400 hover:bg-[#222] w-fit shrink-0"
                  >
                    {item.date}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
