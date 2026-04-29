"use client";

import { useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Icon } from "@iconify/react";
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
];

const CATEGORIES = [
    { id: "all", name: "All", icon: "lucide:layout-grid" },
    { id: "exchange", name: "DEX", icon: "lucide:trending-up" },
    { id: "defi", name: "DeFi", icon: "lucide:droplets" },
    { id: "nft", name: "NFT", icon: "lucide:image" },
    { id: "gaming", name: "Gaming", icon: "lucide:gamepad-2" },
    { id: "tools", name: "Tools", icon: "lucide:shield" },
];

// App icon with fallback
function AppIcon({ app }: { app: DApp }) {
    const [hasError, setHasError] = useState(false);

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "exchange": return "text-blue-400";
            case "defi": return "text-purple-400";
            case "nft": return "text-pink-400";
            case "gaming": return "bg-transparent text-green-400";
            case "tools": return "text-orange-400";
            default: return "text-neutral-400";
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "exchange": return "lucide:trending-up";
            case "defi": return "lucide:droplets";
            case "nft": return "lucide:image";
            case "gaming": return "lucide:gamepad-2";
            case "tools": return "lucide:shield";
            default: return "lucide:globe";
        }
    };

    if (hasError || !app.icon) {
        const iconName = getCategoryIcon(app.category);
        return (
            <Icon icon={iconName} className={`h-6 w-6 ${getCategoryColor(app.category)}`} />
        );
    }

    return (
        <Image
            src={app.icon}
            alt={app.name}
            width={44}
            height={44}
            className="h-11 w-11 rounded-lg object-cover"
            onError={() => setHasError(true)}
        />
    );
}

export default function ExplorePage() {
    useTelegramBackButton("/wallet");
    const [selectedCategory, setSelectedCategory] = useQueryState("category", parseAsString.withDefault("all").withOptions({ history: "replace" }));

    // Filter dApps by category
    const filteredDApps = selectedCategory === "all"
        ? POPULAR_DAPPS
        : POPULAR_DAPPS.filter(app => app.category === selectedCategory);

    // Featured apps
    const featuredApps = POPULAR_DAPPS.filter(app => app.featured);

    // Open dApp using Telegram's native browser
    const openDApp = (url: string) => {
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
                    <p className="text-sm text-neutral-500">
                        Discover apps and services on TON
                    </p>
                </div>

                {/* Featured Apps */}
                {selectedCategory === "all" && featuredApps.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-neutral-400">
                            Featured
                        </h2>
                        <div className="grid grid-cols-3 gap-3">
                            {featuredApps.map((app) => (
                                <button key={app.id}
                                    onClick={() => openDApp(app.url)}
                                    className="flex flex-col items-center gap-2 rounded-xl bg-secondary p-3 transition-colors active:bg-secondary/80"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden">
                                        <AppIcon app={app} />
                                    </div>
                                    <span className="text-xs font-medium text-white text-center truncate w-full">
                                        {app.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                    {CATEGORIES.map((category) => {
                        const isActive = selectedCategory === category.id;
                        return (
                            <button key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-white text-black"
                                        : "bg-secondary text-neutral-400 active:bg-secondary/80"
                                }`}
                            >
                                <Icon icon={category.icon} className="w-4 h-4" />
                                {category.name}
                            </button>
                        );
                    })}
                </div>

                {/* All Apps List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-neutral-400">
                            {selectedCategory === "all" ? "All apps" : CATEGORIES.find(c => c.id === selectedCategory)?.name}
                        </h2>
                        <span className="text-xs text-neutral-500">{filteredDApps.length} apps</span>
                    </div>

                    <div className="space-y-2">
                        {filteredDApps.map((app) => (
                            <button key={app.id}
                                onClick={() => openDApp(app.url)}
                                className="flex w-full items-center gap-3 rounded-xl bg-secondary p-4 transition-colors active:bg-secondary/80"
                            >
                                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden">
                                    <AppIcon app={app} />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium text-white">{app.name}</h3>
                                    </div>
                                    <p className="truncate text-sm text-neutral-500">{app.description}</p>
                                </div>
                                <Icon icon="lucide:external-link" className="w-4 h-4 flex-shrink-0 text-neutral-500"/>
                            </button>
                        ))}
                    </div>
                </div>


            </div>
        </div>
    );
}
