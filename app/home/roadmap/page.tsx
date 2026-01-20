'use client';

import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { motion } from "framer-motion";

export default function Roadmap() {
  useTelegramBackButton();

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
      title: "NFT Marketplace",
      date: "Q1 2026",
      description: "Discover, buy, sell, and manage NFTs directly within the wallet. Browse collections, view floor prices, and trade seamlessly.",
      status: "current"
    },
    {
      title: "QC Pay",
      date: "Q2 2026",
      description: "P2P payments with QR codes, payment links, and recurring payments for everyday crypto transactions.",
      status: "upcoming"
    },
    {
      title: "AI-powered Trading Platform",
      date: "Q2 2026",
      description: "A powerful trading platform for seamless crypto trading with AI insights and smart alerts.",
      status: "upcoming"
    },
    {
      title: "Copy Trading",
      date: "Q3 2026",
      description: "Follow and auto-copy successful traders. Learn while you earn.",
      status: "upcoming"
    },
    {
      title: "Yield Aggregator",
      date: "Q3 2026",
      description: "Auto-compound staking rewards across protocols. Find the best APY automatically.",
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
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="font-bold text-4xl bg-linear-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">Roadmap</h1>
        <p className="text-gray-400 mt-2 text-sm">Our journey to the quantum future.</p>
      </motion.div>

      <div className="relative border-l-2 border-[#333] ml-3 space-y-8">
        {roadmapItems.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="ml-8 relative"
          >
            {/* Timeline Dot */}
            <div className={`absolute -left-[43px] top-0 flex items-center justify-center w-8 h-8 rounded-full border-4 border-black ${item.status === 'completed' ? 'bg-green-500' :
              item.status === 'current' ? 'bg-[#333] ring-2 ring-orange-500/50 ring-offset-2 ring-offset-black' :
                'bg-[#333]'
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
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
              )}
            </div>

            {/* Content Card */}
            <div className={`p-5 rounded-2xl border transition-colors duration-300 ${item.status === 'completed' ? 'bg-[#111] border-green-500/20 hover:border-green-500/40' :
              item.status === 'current' ? 'bg-[#111] border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.1)]' :
                'bg-[#111] border-[#333]'
              }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                <h3 className={`text-lg font-bold ${item.status === 'completed' || item.status === 'current' ? 'text-white' : 'text-gray-300'
                  }`}>
                  {item.title}
                </h3>
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#222] text-gray-400 w-fit">
                  {item.date}
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
