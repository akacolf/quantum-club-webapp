"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Globe,
    Star,
    TrendingUp,
    Droplets,
    Gamepad2,
    LayoutGrid,
    Shield,
    ExternalLink,
} from "lucide-react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Image from "next/image";

interface DApp {
    id: string;
    name: string;
    description: string;
    url: string;
    icon: string;
    category: "defi" | "nft" | "gaming" | "tools" | "exchange";
    featured?: boolean;
}

// Popular dApps on TON
const POPULAR_DAPPS: DApp[] = [
    {
        id: "stonfi",
        name: "STON.fi",
        description: "Leading DEX on TON",
        url: "https://app.ston.fi",
        icon: "/png/stonfi-logo.png",
        category: "exchange",
        featured: true,
    },
    {
        id: "dedust",
        name: "DeDust",
        description: "AMM & DEX Protocol",
        url: "https://dedust.io",
        icon: "/png/dedust-logo.png",
        category: "exchange",
        featured: true,
    },
    {
        id: "getgems",
        name: "Getgems",
        description: "NFT Marketplace",
        url: "https://getgems.io",
        icon: "/png/getgems-logo.png",
        category: "nft",
        featured: true,
    },
    {
        id: "tonviewer",
        name: "TON Viewer",
        description: "Blockchain Explorer",
        url: "https://tonviewer.com",
        icon: "/png/tonviewer-logo.jpg",
        category: "tools",
    },
    {
        id: "tonstakers",
        name: "TON Stakers",
        description: "Liquid Staking",
        url: "https://tonstakers.com",
        icon: "/png/tonstakers-logo.jpg",
        category: "defi",
    },
    {
        id: "evaa",
        name: "EVAA",
        description: "Lending Protocol",
        url: "https://evaa.finance",
        icon: "/png/evaa-logo.png",
        category: "defi",
    },
    {
        id: "tonraffles",
        name: "TON Raffles",
        description: "Raffle Platform",
        url: "https://tonraffles.app",
        icon: "/png/tonraffles-logo.png",
        category: "gaming",
    },
    {
        id: "fragment",
        name: "Fragment",
        description: "Telegram Usernames",
        url: "https://fragment.com",
        icon: "/png/fragment-logo.jpeg",
        category: "nft",
    },
    {
        id: "toncenter",
        name: "TON Center",
        description: "API & Explorer",
        url: "https://toncenter.com",
        icon: "/svg/ton-logo.svg",
        category: "tools",
    },
    {
        id: "tonkeeper",
        name: "Tonkeeper",
        description: "TON Wallet",
        url: "https://tonkeeper.com",
        icon: "/svg/ton-logo.svg",
        category: "tools",
    },
];

const CATEGORIES = [
    { id: "all", name: "All", icon: LayoutGrid },
    { id: "exchange", name: "DEX", icon: TrendingUp },
    { id: "defi", name: "DeFi", icon: Droplets },
    { id: "nft", name: "NFT", icon: Star },
    { id: "gaming", name: "Gaming", icon: Gamepad2 },
    { id: "tools", name: "Tools", icon: Shield },
];

// App icon with fallback
function AppIcon({ app }: { app: DApp }) {
    const [hasError, setHasError] = useState(false);

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "exchange": return "bg-blue-500/20 text-blue-400";
            case "defi": return "bg-purple-500/20 text-purple-400";
            case "nft": return "bg-pink-500/20 text-pink-400";
            case "gaming": return "bg-green-500/20 text-green-400";
            case "tools": return "bg-orange-500/20 text-orange-400";
            default: return "bg-gray-500/20 text-gray-400";
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "exchange": return TrendingUp;
            case "defi": return Droplets;
            case "nft": return Star;
            case "gaming": return Gamepad2;
            case "tools": return Shield;
            default: return Globe;
        }
    };

    if (hasError || !app.icon) {
        const Icon = getCategoryIcon(app.category);
        return (
            <div className={`w-full h-full flex items-center justify-center ${getCategoryColor(app.category)}`}>
                <Icon className="w-5 h-5" />
            </div>
        );
    }

    return (
        <Image
            src={app.icon}
            alt={app.name}
            width={44}
            height={44}
            className="w-full h-full object-cover rounded-lg"
            onError={() => setHasError(true)}
        />
    );
}

// Get category badge color
function getCategoryBadgeColor(category: string) {
    switch (category) {
        case "exchange": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
        case "defi": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
        case "nft": return "bg-pink-500/10 text-pink-400 border-pink-500/20";
        case "gaming": return "bg-green-500/10 text-green-400 border-green-500/20";
        case "tools": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
        default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
}

export default function ExplorePage() {
    useTelegramBackButton("/wallet");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Filter dApps by category
    const filteredDApps = useMemo(() => {
        if (selectedCategory === "all") {
            return POPULAR_DAPPS;
        }
        return POPULAR_DAPPS.filter(app => app.category === selectedCategory);
    }, [selectedCategory]);

    // Featured apps
    const featuredApps = useMemo(() => {
        return POPULAR_DAPPS.filter(app => app.featured);
    }, []);

    // Open dApp using Telegram's native browser
    const openDApp = (url: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tgWebApp = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;
        
        if (tgWebApp?.openLink) {
            // Use Telegram's native browser
            tgWebApp.openLink(url);
        } else {
            // Fallback for testing outside Telegram
            window.open(url, "_blank");
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-black pb-28">
            <div className="px-4 pt-2 pb-4 space-y-5">
                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-white">Explore</h1>
                    <p className="text-sm text-gray-500">
                        Discover apps and services on TON
                    </p>
                </div>

                {/* Featured Apps */}
                {selectedCategory === "all" && featuredApps.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                            Featured
                        </h2>
                        <div className="grid grid-cols-3 gap-3">
                            {featuredApps.map((app) => (
                                <motion.button
                                    key={app.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => openDApp(app.url)}
                                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
                                        <AppIcon app={app} />
                                    </div>
                                    <span className="text-xs font-medium text-white text-center truncate w-full">
                                        {app.name}
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                    {CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        const isActive = selectedCategory === category.id;
                        return (
                            <motion.button
                                key={category.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-white text-black"
                                        : "bg-white/5 text-gray-400 active:bg-white/10 border border-white/10"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {category.name}
                            </motion.button>
                        );
                    })}
                </div>

                {/* All Apps List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                            {selectedCategory === "all" ? "All Apps" : CATEGORIES.find(c => c.id === selectedCategory)?.name}
                        </h2>
                        <span className="text-xs text-gray-500">{filteredDApps.length} apps</span>
                    </div>

                    <div className="space-y-2">
                        {filteredDApps.map((app) => (
                            <motion.button
                                key={app.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => openDApp(app.url)}
                                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 active:bg-white/10 transition-colors flex items-center gap-3"
                            >
                                <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                                    <AppIcon app={app} />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-white">{app.name}</h3>
                                        {app.featured && (
                                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">{app.description}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getCategoryBadgeColor(app.category)}`}>
                                        {app.category}
                                    </span>
                                    <ExternalLink className="w-4 h-4 text-gray-500" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Info Note */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-400/90 text-center">
                        Apps open in Telegram&apos;s browser for the best experience
                    </p>
                </div>
            </div>
        </div>
    );
}
