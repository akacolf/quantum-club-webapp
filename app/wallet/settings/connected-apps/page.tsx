"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWalletKitOptional } from "@/lib/walletkit-provider";
import { useUserContext } from "@/app/(contexts)/UserContext";

export default function ConnectedAppsPage() {
    const router = useRouter();
    
    // Use WalletKit if available (returns null if provider not mounted)
    const walletKit = useWalletKitOptional();
    const { telegramId } = useUserContext();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Track initialization to prevent multiple calls
    const initRef = useRef(false);

    // Handle back button - use both Telegram back button and in-app button
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        tg?.ready();
        
        const handleBack = () => {
            router.push("/wallet/settings");
        };
        
        tg?.BackButton.show();
        tg?.BackButton.onClick(handleBack);
        
        return () => {
            tg?.BackButton.offClick(handleBack);
            tg?.BackButton.hide();
        };
    }, [router]);

    // Register wallet and load sessions - separate from back button
    useEffect(() => {
        // Prevent multiple initializations
        if (initRef.current) return;
        
        const initWallet = async () => {
            if (!walletKit?.isReady || !telegramId) {
                // Keep loading if WalletKit is not ready yet
                if (!walletKit?.isReady && telegramId) {
                    return; // Wait for WalletKit to be ready
                }
                setIsLoading(false);
                return;
            }
            
            initRef.current = true;
            
            try {
                // Register wallet if not already registered
                if (!walletKit.isWalletRegistered) {
                    const storedMnemonic = localStorage.getItem(`quantum_wallet_mnemonic_${telegramId}`);
                    if (storedMnemonic) {
                        console.log("[ConnectedApps] Registering wallet...");
                        const mnemonic = storedMnemonic.split(" ");
                        await walletKit.registerWallet(mnemonic);
                        console.log("[ConnectedApps] Wallet registered successfully");
                    } else {
                        console.warn("[ConnectedApps] No mnemonic found in storage");
                        setError("Wallet not found. Please import or create a wallet first.");
                    }
                } else {
                    console.log("[ConnectedApps] Wallet already registered");
                }
                
                await walletKit.refreshSessions();
            } catch (err) {
                console.error("[ConnectedApps] Init error:", err);
                setError("Failed to initialize wallet connection. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        
        initWallet();
    }, [walletKit?.isReady, walletKit?.isWalletRegistered, telegramId, walletKit]);

    // Handle QR code scan result
    const handleScanResult = useCallback(async (result: string) => {
        setIsProcessing(true);
        setError(null);

        try {
            if (!walletKit) {
                throw new Error("WalletKit not initialized");
            }

            // Ensure wallet is registered before processing
            if (!walletKit.isWalletRegistered) {
                const storedMnemonic = localStorage.getItem(`quantum_wallet_mnemonic_${telegramId}`);
                if (storedMnemonic) {
                    console.log("[ConnectedApps] Registering wallet before connection...");
                    const mnemonic = storedMnemonic.split(" ");
                    await walletKit.registerWallet(mnemonic);
                    // Give a moment for registration to complete
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    throw new Error("Wallet not found. Please import or create a wallet first.");
                }
            }

            // Use WalletKit to handle the TON Connect URL
            console.log("[ConnectedApps] Processing TON Connect URL:", result.substring(0, 50) + "...");
            await walletKit.handleTonConnectUrl(result);
            
            toast.success("Connection request received", {
                description: "Check the connection dialog",
            });
        } catch (err) {
            console.error("Error processing TON Connect URL:", err);
            const message = err instanceof Error ? err.message : "Failed to process QR code";
            setError(message);
            toast.error("Connection failed", { description: message });
        } finally {
            setIsProcessing(false);
        }
    }, [walletKit, telegramId]);

    // Open Telegram's native QR scanner
    const openQRScanner = useCallback(() => {
        const WebApp = window?.Telegram?.WebApp;
        
        if (WebApp?.showScanQrPopup) {
            // Use Telegram's native QR scanner
            WebApp.showScanQrPopup(
                { text: "Scan the QR code on any TON dApp" },
                (result: string) => {
                    // Check if it's a TON Connect URL
                    if (result.startsWith("tc://") || result.includes("tonconnect") || result.includes("v2/")) {
                        handleScanResult(result);
                        WebApp.closeScanQrPopup();
                        return true; // Close the scanner
                    }
                    // Keep scanning if not a valid URL
                    toast.error("Invalid QR code", { description: "Please scan a TON Connect QR code" });
                    return false;
                }
            );
        } else {
            // Fallback for web/desktop - show error since we're a mini app
            toast.error("QR Scanner not available", {
                description: "Please use the Telegram mobile app to scan QR codes",
            });
        }
    }, [handleScanResult]);

    // Handle disconnect
    const handleDisconnect = useCallback(async (sessionId: string, appName: string) => {
        if (!walletKit) return;
        
        try {
            await walletKit.disconnect(sessionId);
            toast.success(`Disconnected from ${appName}`);
        } catch (err) {
            console.error("Error disconnecting:", err);
            toast.error("Failed to disconnect");
        }
    }, [walletKit]);

    // Handle disconnect all
    const handleDisconnectAll = useCallback(async () => {
        if (!walletKit) return;
        
        try {
            await walletKit.disconnect(); // No sessionId = disconnect all
            toast.success("Disconnected from all apps");
        } catch (err) {
            console.error("Error disconnecting all:", err);
            toast.error("Failed to disconnect");
        }
    }, [walletKit]);

    // Format time ago
    const formatTimeAgo = (timestamp: number): string => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return "Just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    // Get sessions from WalletKit
    const sessions = walletKit?.sessions || [];

    // If WalletKit is not ready, show a message with back button
    if (!walletKit) {
        return (
            <div className="flex flex-col w-full max-w-md mx-auto p-4 min-h-screen bg-background text-foreground">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">Connected Apps</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage dApp connections via TON Connect
                    </p>
                </div>

                <Card className="bg-yellow-500/10 border-yellow-500/20 mb-6">
                    <CardContent className="p-4 flex items-start gap-3">
                        <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-foreground text-sm">WalletKit Initializing</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                TON Connect is loading. Please wait or refresh the page.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full max-w-md mx-auto p-4 min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Connected Apps</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage dApp connections via TON Connect
                    </p>
                </div>
                {sessions.length > 0 && (
                    <Badge variant="secondary" className="h-6">
                        {sessions.length} app{sessions.length !== 1 ? 's' : ''}
                    </Badge>
                )}
            </div>

            {/* Scan to Connect Button */}
            <Button
                onClick={openQRScanner}
                disabled={isProcessing}
                className="w-full h-14 mb-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold"
            >
                {isProcessing ? (
                    <>
                        <Icon icon="lucide:loader-2" className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <Icon icon="lucide:scan-line" className="w-5 h-5 mr-2" />
                        Scan to Connect
                    </>
                )}
            </Button>

            {/* Error Message */}
            {error && (
                <Card className="bg-destructive/10 border-destructive/20 mb-6">
                    <CardContent className="p-4 flex items-start gap-3">
                        <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Info Card */}
            <Card className="bg-primary/5 border-primary/20 mb-6">
                <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon icon="lucide:shield" className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground text-sm">TON Connect Ready</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Scan the QR code on any TON dApp to connect securely.
                            {walletKit.isTestnet && (
                                <span className="text-orange-400"> (Testnet Mode)</span>
                            )}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Sessions List */}
            <ScrollArea className="flex-1">
                <div className="space-y-3 pb-20">
                    {isLoading ? (
                        // Loading skeleton
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="bg-card border-border">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                                        <div className="flex-1 space-y-2">
                                            <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                                            <div className="w-24 h-3 bg-muted rounded animate-pulse" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : sessions.length === 0 ? (
                        // Empty state
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Icon icon="lucide:link-2-off" className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                No Connected Apps
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                                Scan the QR code on any TON dApp to connect your wallet
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Icon icon="lucide:qr-code" className="w-4 h-4" />
                                <span>Look for &ldquo;Connect Wallet&rdquo; on dApps</span>
                            </div>
                        </div>
                    ) : (
                        // Sessions list
                        <>
                            <AnimatePresence mode="popLayout">
                                {sessions.map((session) => (
                                    <motion.div
                                        key={session.sessionId}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -100 }}
                                    >
                                        <Card className="bg-card border-border hover:border-muted-foreground/20 transition-colors">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-4">
                                                    {/* App Icon */}
                                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                                                        {session.dAppIconUrl ? (
                                                            <Image
                                                                src={session.dAppIconUrl}
                                                                alt={session.dAppName || "dApp"}
                                                                width={48}
                                                                height={48}
                                                                className="w-12 h-12 object-cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <Icon icon="lucide:link-2" className="w-6 h-6 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    
                                                    {/* App Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-foreground truncate">
                                                            {session.dAppName || "Unknown dApp"}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            {session.dAppUrl && (
                                                                <span className="truncate">
                                                                    {(() => { try { return new URL(session.dAppUrl).hostname; } catch { return session.dAppUrl; } })()}
                                                                </span>
                                                            )}
                                                            {session.lastActivity && (
                                                                <>
                                                                    <span>•</span>
                                                                    <Icon icon="lucide:clock" className="w-3 h-3" />
                                                                    <span>{formatTimeAgo(new Date(session.lastActivity).getTime())}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2">
                                                        {session.dAppUrl && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9"
                                                                onClick={() => window.open(session.dAppUrl, "_blank")}
                                                            >
                                                                <Icon icon="lucide:external-link" className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                >
                                                                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>
                                                                        Disconnect {session.dAppName || "this app"}?
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This app will no longer be able to request transactions from your wallet.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDisconnect(
                                                                            session.sessionId,
                                                                            session.dAppName || "dApp"
                                                                        )}
                                                                        className="bg-destructive hover:bg-destructive/90"
                                                                    >
                                                                        Disconnect
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                                
                                                {/* Session Info */}
                                                <div className="mt-3 pt-3 border-t border-border">
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline" className="text-[10px]">
                                                            <Icon icon="lucide:check" className="w-3 h-3 mr-1" />
                                                            Connected
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            
                            {/* Disconnect All */}
                            {sessions.length > 1 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 mt-4 text-destructive border-destructive/30 hover:bg-destructive/10"
                                        >
                                            <Icon icon="lucide:link-2-off" className="w-4 h-4 mr-2" />
                                            Disconnect All Apps
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Disconnect All Apps?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will disconnect {sessions.length} apps from your wallet. You can reconnect them later.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDisconnectAll}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                Disconnect All
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </>
                    )}
                </div>
            </ScrollArea>

            {/* Connection Request Dialog - handled by WalletKit provider */}
            {walletKit?.pendingConnection && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
                    onClick={(e) => {
                        // Close when clicking backdrop
                        if (e.target === e.currentTarget) {
                            walletKit.rejectConnection();
                        }
                    }}
                >
                    <div 
                        className="w-[92vw] max-w-lg border bg-background p-6 shadow-lg rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col space-y-2 text-center sm:text-left">
                            <div className="flex items-center gap-4 mb-2">
                                {walletKit.pendingConnection.dAppInfo?.iconUrl ? (
                                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                                        <Image
                                            src={walletKit.pendingConnection.dAppInfo.iconUrl}
                                            alt={walletKit.pendingConnection.dAppInfo?.name || "dApp"}
                                            width={56}
                                            height={56}
                                            className="w-14 h-14 object-cover"
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Icon icon="lucide:link-2" className="w-7 h-7 text-primary" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Connect to {walletKit.pendingConnection.dAppInfo?.name || "dApp"}?
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {walletKit.pendingConnection.dAppInfo?.url}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3 pt-2">
                                <p className="text-sm text-muted-foreground">
                                    This app wants to connect to your wallet. It will be able to:
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-foreground">
                                        <Icon icon="lucide:check" className="w-4 h-4 text-green-500" />
                                        View your wallet address
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-foreground">
                                        <Icon icon="lucide:check" className="w-4 h-4 text-green-500" />
                                        Request transaction approvals
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 h-12"
                                onClick={() => {
                                    console.log("[UI] Cancel clicked");
                                    walletKit.rejectConnection();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="flex-1 h-12 bg-primary hover:bg-primary/90"
                                onClick={() => {
                                    console.log("[UI] Connect clicked");
                                    walletKit.approveConnection();
                                }}
                            >
                                Connect
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
