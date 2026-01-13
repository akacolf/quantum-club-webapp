"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    Search,
    Globe,
    RefreshCw,
    X,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Star,
    Zap,
    Shield,
    TrendingUp,
    Droplets,
    Coins,
    Gamepad2,
    LayoutGrid,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWalletKitOptional } from "@/lib/walletkit-provider";
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
        icon: "https://app.ston.fi/static/icons/favicon-32x32.png",
        category: "exchange",
        featured: true,
    },
    {
        id: "dedust",
        name: "DeDust",
        description: "AMM & DEX Protocol",
        url: "https://dedust.io",
        icon: "https://dedust.io/favicon.ico",
        category: "exchange",
        featured: true,
    },
    {
        id: "getgems",
        name: "Getgems",
        description: "NFT Marketplace",
        url: "https://getgems.io",
        icon: "https://getgems.io/favicon.ico",
        category: "nft",
        featured: true,
    },
    {
        id: "tonviewer",
        name: "TON Viewer",
        description: "Blockchain Explorer",
        url: "https://tonviewer.com",
        icon: "https://tonviewer.com/favicon.ico",
        category: "tools",
    },
    {
        id: "tonstakers",
        name: "TON Stakers",
        description: "Liquid Staking",
        url: "https://tonstakers.com",
        icon: "https://tonstakers.com/favicon.ico",
        category: "defi",
    },
    {
        id: "evaa",
        name: "EVAA",
        description: "Lending Protocol",
        url: "https://evaa.finance",
        icon: "https://evaa.finance/favicon.ico",
        category: "defi",
    },
    {
        id: "tonraffles",
        name: "TON Raffles",
        description: "Raffle Platform",
        url: "https://tonraffles.app",
        icon: "https://tonraffles.app/favicon.ico",
        category: "gaming",
    },
    {
        id: "fragment",
        name: "Fragment",
        description: "Telegram Usernames",
        url: "https://fragment.com",
        icon: "https://fragment.com/favicon.ico",
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

export default function BrowserPage() {
    useTelegramBackButton("/wallet");
    
    const walletKit = useWalletKitOptional();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    
    const [currentUrl, setCurrentUrl] = useState<string | null>(null);
    const [inputUrl, setInputUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [favorites, setFavorites] = useState<string[]>([]);

    // Load favorites from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("qc_browser_favorites");
        if (saved) {
            try {
                setFavorites(JSON.parse(saved));
            } catch {
                // Ignore parse errors
            }
        }
    }, []);

    // Filter dApps by category
    const filteredDApps = selectedCategory === "all" 
        ? POPULAR_DAPPS 
        : POPULAR_DAPPS.filter(app => app.category === selectedCategory);

    const navigateTo = useCallback((url: string) => {
        // Ensure URL has protocol
        let finalUrl = url.trim();
        if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
            finalUrl = "https://" + finalUrl;
        }
        
        setCurrentUrl(finalUrl);
        setInputUrl(finalUrl);
        setIsLoading(true);
    }, []);

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

    const toggleFavorite = useCallback((appId: string) => {
        setFavorites(prev => {
            const newFavorites = prev.includes(appId)
                ? prev.filter(id => id !== appId)
                : [...prev, appId];
            localStorage.setItem("qc_browser_favorites", JSON.stringify(newFavorites));
            return newFavorites;
        });
    }, []);

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

    // If a URL is open, show the browser view
    if (currentUrl) {
        return (
            <div className="flex flex-col h-screen bg-background">
                {/* Browser Header */}
                <div className="flex items-center gap-2 p-3 border-b bg-card">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                    
                    <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                        {isLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                            <Globe className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm truncate flex-1 text-foreground">
                            {currentUrl}
                        </span>
                    </div>
                    
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        className="shrink-0"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
                
                {/* Browser Content */}
                <div className="flex-1 relative">
                    <iframe
                        ref={iframeRef}
                        src={currentUrl}
                        className="w-full h-full border-0"
                        onLoad={handleIframeLoad}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                        allow="clipboard-read; clipboard-write"
                    />
                    
                    {isLoading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Loading...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Default view - dApp browser home
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <ScrollArea className="flex-1 pb-24">
                <div className="p-4 space-y-6">
                    {/* Header */}
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">Browser</h1>
                        <p className="text-sm text-muted-foreground">
                            Explore dApps on TON
                        </p>
                    </div>

                    {/* URL Input */}
                    <form onSubmit={handleUrlSubmit}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                type="text"
                                value={inputUrl}
                                onChange={(e) => setInputUrl(e.target.value)}
                                placeholder="Enter URL or search..."
                                className="pl-10 pr-4 h-12 bg-card border-border"
                            />
                        </div>
                    </form>

                    {/* Featured Apps */}
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Zap className="w-5 h-5 text-primary" />
                            Featured
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {POPULAR_DAPPS.filter(app => app.featured).map((app) => (
                                <motion.div
                                    key={app.id}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Card 
                                        className="cursor-pointer hover:border-primary/50 transition-colors"
                                        onClick={() => navigateTo(app.url)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                                    <Image
                                                        src={app.icon}
                                                        alt={app.name}
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                        unoptimized
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = "none";
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold truncate">{app.name}</h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {app.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold">Categories</h2>
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                            {CATEGORIES.map((cat) => {
                                const Icon = cat.icon;
                                return (
                                    <Button
                                        key={cat.id}
                                        variant={selectedCategory === cat.id ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className="shrink-0"
                                    >
                                        <Icon className="w-4 h-4 mr-1" />
                                        {cat.name}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* All Apps */}
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold">
                            {selectedCategory === "all" ? "All Apps" : CATEGORIES.find(c => c.id === selectedCategory)?.name}
                        </h2>
                        <div className="space-y-2">
                            {filteredDApps.map((app) => {
                                const CategoryIcon = getCategoryIcon(app.category);
                                return (
                                    <motion.div
                                        key={app.id}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Card 
                                            className="cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() => navigateTo(app.url)}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                                        <Image
                                                            src={app.icon}
                                                            alt={app.name}
                                                            width={40}
                                                            height={40}
                                                            className="w-full h-full object-cover"
                                                            unoptimized
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = "none";
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-medium truncate">{app.name}</h3>
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                                <CategoryIcon className="w-2.5 h-2.5 mr-0.5" />
                                                                {app.category}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {app.description}
                                                        </p>
                                                    </div>
                                                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Warning */}
                    <Card className="bg-yellow-500/10 border-yellow-500/20">
                        <CardContent className="p-3">
                            <div className="flex gap-3">
                                <Shield className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                                        Stay Safe
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Only connect to trusted dApps. Always verify URLs before connecting your wallet.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
            
            <WalletNavigation />
        </div>
    );
}
