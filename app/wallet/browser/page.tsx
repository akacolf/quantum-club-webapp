"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Search,
    Globe,
    RefreshCw,
    X,
    ExternalLink,
    Star,
    Zap,
    Shield,
    TrendingUp,
    Droplets,
    Gamepad2,
    LayoutGrid,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import WalletNavigation from "../(navigation)/WalletNavigation";

interface DApp {
    id: string;
    name: string;
    description: string;
    url: string;
    icon: string;
    category: "defi" | "nft" | "gaming" | "tools" | "exchange";
    featured?: boolean;
}

const POPULAR_DAPPS: DApp[] = [
    {
        id: "stonfi",
        name: "STON.fi",
        description: "Leading DEX on TON",
        url: "https://app.ston.fi",
        icon: "/svg/stonfi-logo.svg",
        category: "exchange",
        featured: true,
    },
    {
        id: "dedust",
        name: "DeDust",
        description: "AMM & DEX Protocol",
        url: "https://dedust.io",
        icon: "",
        category: "exchange",
        featured: true,
    },
    {
        id: "getgems",
        name: "Getgems",
        description: "NFT Marketplace",
        url: "https://getgems.io",
        icon: "",
        category: "nft",
        featured: true,
    },
    {
        id: "tonviewer",
        name: "TON Viewer",
        description: "Blockchain Explorer",
        url: "https://tonviewer.com",
        icon: "/svg/ton-logo.svg",
        category: "tools",
    },
    {
        id: "tonstakers",
        name: "TON Stakers",
        description: "Liquid Staking",
        url: "https://tonstakers.com",
        icon: "/svg/ton-logo.svg",
        category: "defi",
    },
    {
        id: "evaa",
        name: "EVAA",
        description: "Lending Protocol",
        url: "https://evaa.finance",
        icon: "",
        category: "defi",
    },
    {
        id: "tonraffles",
        name: "TON Raffles",
        description: "Raffle Platform",
        url: "https://tonraffles.app",
        icon: "/svg/ton-logo.svg",
        category: "gaming",
    },
    {
        id: "fragment",
        name: "Fragment",
        description: "Telegram Usernames",
        url: "https://fragment.com",
        icon: "",
        category: "nft",
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

// Fallback icon component
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={app.icon}
            alt={app.name}
            className="w-full h-full object-contain p-1"
            onError={() => setHasError(true)}
        />
    );
}

export default function BrowserPage() {
    useTelegramBackButton("/wallet");
    
    const iframeRef = useRef<HTMLIFrameElement>(null);
    
    const [currentUrl, setCurrentUrl] = useState<string | null>(null);
    const [inputUrl, setInputUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Filter dApps by category
    const filteredDApps = selectedCategory === "all" 
        ? POPULAR_DAPPS 
        : POPULAR_DAPPS.filter(app => app.category === selectedCategory);

    // Check if input is a search query or a URL
    const isSearchQuery = useCallback((input: string): boolean => {
        const trimmed = input.trim();
        
        // If it starts with http:// or https://, it's a URL
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return false;
        }
        
        // If it looks like a domain (contains . and no spaces), treat as URL
        if (trimmed.includes(".") && !trimmed.includes(" ")) {
            // Additional check: common TLDs
            const commonTlds = [".com", ".org", ".net", ".io", ".app", ".fi", ".ton", ".co", ".gg", ".xyz"];
            if (commonTlds.some(tld => trimmed.toLowerCase().includes(tld))) {
                return false;
            }
        }
        
        // Otherwise, it's a search query
        return true;
    }, []);

    const navigateTo = useCallback((url: string) => {
        let finalUrl = url.trim();
        
        if (isSearchQuery(finalUrl)) {
            // Use DuckDuckGo with dark mode for searches
            // kae=d enables dark mode theme
            const encodedQuery = encodeURIComponent(finalUrl);
            finalUrl = `https://duckduckgo.com/?q=${encodedQuery}&kae=d&k7=1a1a2e&kj=1a1a2e&kx=00d4aa&k9=00d4aa&kaa=00d4aa&k8=ffffff&kt=p`;
        } else if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
            finalUrl = "https://" + finalUrl;
        }
        
        setCurrentUrl(finalUrl);
        setInputUrl(finalUrl);
        setIsLoading(true);
    }, [isSearchQuery]);

    const handleUrlSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (inputUrl.trim()) {
            navigateTo(inputUrl);
        }
    }, [inputUrl, navigateTo]);

    const handleRefresh = useCallback(() => {
        if (iframeRef.current && currentUrl) {
            setIsLoading(true);
            iframeRef.current.src = currentUrl;
        }
    }, [currentUrl]);

    const handleClose = useCallback(() => {
        setCurrentUrl(null);
        setInputUrl("");
        setIsLoading(false);
    }, []);

    const handleIframeLoad = useCallback(() => {
        setIsLoading(false);
    }, []);

    const getCategoryBadgeColor = (category: string) => {
        switch (category) {
            case "exchange": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case "defi": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
            case "nft": return "bg-pink-500/10 text-pink-400 border-pink-500/20";
            case "gaming": return "bg-green-500/10 text-green-400 border-green-500/20";
            case "tools": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
            default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
        }
    };

    // If a URL is open, show the browser view
    if (currentUrl) {
        return (
            <div className="flex flex-col h-screen bg-black">
                {/* Browser Header */}
                <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-black">
                    <button
                        onClick={handleClose}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                    
                    <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/10">
                        {isLoading ? (
                            <ButtonLoader size="sm" />
                        ) : (
                            <Globe className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm truncate flex-1 text-white">
                            {currentUrl}
                        </span>
                    </div>
                    
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 text-white ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
                
                {/* Browser Content */}
                <div className="flex-1 relative">
                    <iframe
                        ref={iframeRef}
                        src={currentUrl}
                        className="w-full h-full border-0 bg-white"
                        onLoad={handleIframeLoad}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                        allow="clipboard-read; clipboard-write"
                    />
                    
                    {isLoading && (
                        <div className="absolute inset-0 bg-black flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                <p className="text-sm text-gray-400">Loading...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Default view - dApp browser home
    return (
        <div className="flex flex-col min-h-screen bg-black">
            <div className="flex-1 overflow-y-auto pb-28">
                <div className="px-4 pt-2 pb-4 space-y-5">
                    {/* Header */}
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold text-white">Browser</h1>
                        <p className="text-sm text-gray-500">
                            Explore dApps on TON
                        </p>
                    </div>

                    {/* URL Input */}
                    <form onSubmit={handleUrlSubmit}>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <Input
                                type="text"
                                value={inputUrl}
                                onChange={(e) => setInputUrl(e.target.value)}
                                placeholder="Search with DuckDuckGo or enter URL..."
                                className="pl-12 pr-4 h-12 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-white/20 focus:ring-0"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 px-1">
                            <Shield className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-xs text-gray-500">Private search powered by DuckDuckGo</span>
                        </div>
                    </form>

                    {/* Featured Apps - Horizontal Scroll */}
                    <div className="space-y-3">
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                            <Zap className="w-4 h-4 text-primary" />
                            Featured
                        </h2>
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex gap-3 pb-2">
                                {POPULAR_DAPPS.filter(app => app.featured).map((app) => (
                                    <motion.button
                                        key={app.id}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => navigateTo(app.url)}
                                        className="flex-shrink-0 w-[140px] p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors text-left"
                                    >
                                        <div className="w-11 h-11 rounded-xl bg-white/10 overflow-hidden mb-2">
                                            <AppIcon app={app} />
                                        </div>
                                        <h3 className="font-medium text-white text-sm truncate">{app.name}</h3>
                                        <p className="text-xs text-gray-500 truncate">
                                            {app.description}
                                        </p>
                                    </motion.button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="invisible" />
                        </ScrollArea>
                    </div>

                    {/* Categories - Horizontal Scroll */}
                    <div className="space-y-3">
                        <h2 className="text-base font-semibold text-white">Categories</h2>
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex gap-2 pb-2">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon;
                                    const isActive = selectedCategory === cat.id;
                                    return (
                                        <motion.button
                                            key={cat.id}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                                                isActive 
                                                    ? "bg-white text-black" 
                                                    : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10"
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {cat.name}
                                        </motion.button>
                                    );
                                })}
                            </div>
                            <ScrollBar orientation="horizontal" className="invisible" />
                        </ScrollArea>
                    </div>

                    {/* All Apps */}
                    <div className="space-y-3">
                        <h2 className="text-base font-semibold text-white">
                            {selectedCategory === "all" ? "All Apps" : CATEGORIES.find(c => c.id === selectedCategory)?.name}
                        </h2>
                        <div className="space-y-2">
                            {filteredDApps.map((app) => (
                                <motion.button
                                    key={app.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigateTo(app.url)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                                        <AppIcon app={app} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-white text-sm">{app.name}</h3>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getCategoryBadgeColor(app.category)}`}>
                                                {app.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">
                                            {app.description}
                                        </p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <div className="flex gap-3">
                            <Shield className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-500">
                                    Stay Safe
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Only connect to trusted dApps. Always verify URLs before connecting your wallet.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <WalletNavigation />
        </div>
    );
}
