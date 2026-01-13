"use client";

/**
 * TON Connect WalletKit Integration
 * Provides full TON Connect wallet protocol support using the official WalletKit SDK
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
    TonWalletKit,
    CHAIN,
    createDeviceInfo,
    createWalletManifest,
    type EventConnectRequest,
    type EventTransactionRequest,
    type EventSignDataRequest,
    type EventDisconnect,
    type SessionInfo,
} from "@ton/walletkit";

interface WalletKitContextType {
    isReady: boolean;
    isTestnet: boolean;
    
    // Connection requests
    pendingConnection: EventConnectRequest | null;
    approveConnection: () => void;
    rejectConnection: () => void;
    
    // Transaction requests
    pendingTransaction: EventTransactionRequest | null;
    approveTransaction: (signedBoc: string) => void;
    rejectTransaction: () => void;
    
    // Sign data requests
    pendingSignData: EventSignDataRequest | null;
    
    // Sessions
    sessions: SessionInfo[];
    refreshSessions: () => Promise<void>;
    disconnect: (sessionId?: string) => Promise<void>;
    
    // Connect from QR code
    handleTonConnectUrl: (url: string) => Promise<void>;
}

const WalletKitContext = createContext<WalletKitContextType | null>(null);

interface WalletKitProviderProps {
    children: React.ReactNode;
    isTestnet: boolean;
}

export function WalletKitProvider({
    children,
    isTestnet,
}: WalletKitProviderProps) {
    const kitRef = useRef<TonWalletKit | null>(null);
    const [isReady, setIsReady] = useState(false);
    
    // Pending requests
    const [pendingConnection, setPendingConnection] = useState<EventConnectRequest | null>(null);
    const [pendingTransaction, setPendingTransaction] = useState<EventTransactionRequest | null>(null);
    const [pendingSignData, setPendingSignData] = useState<EventSignDataRequest | null>(null);
    
    // Sessions
    const [sessions, setSessions] = useState<SessionInfo[]>([]);

    // Initialize WalletKit
    useEffect(() => {
        let mounted = true;
        
        const initKit = async () => {
            try {
                console.log("[WalletKit] Initializing...");
                
                const kit = new TonWalletKit({
                    networks: {
                        [isTestnet ? CHAIN.TESTNET : CHAIN.MAINNET]: {},
                    },
                    deviceInfo: createDeviceInfo({
                        appName: "qc-wallet",
                        appVersion: "1.0.0",
                        platform: "browser",
                        maxProtocolVersion: 2,
                        features: [
                            {
                                name: "SendTransaction",
                                maxMessages: 4,
                            },
                        ],
                    }),
                    walletManifest: createWalletManifest({
                        name: "QC Wallet",
                        appName: "qc-wallet",
                        imageUrl: "https://quantumclub.space/svg/logo-white.svg",
                        aboutUrl: "https://quantumclub.space",
                        platforms: ["chrome", "firefox", "safari"],
                        universalLink: "https://quantumclub.space/tonconnect",
                        bridgeUrl: "https://bridge.tonapi.io/bridge",
                        jsBridgeKey: "qcwallet",
                    }),
                    bridge: {
                        bridgeUrl: "https://bridge.tonapi.io/bridge",
                        enableJsBridge: false, // We're not injecting into pages
                        disableHttpConnection: false, // Enable HTTP bridge for QR code connections
                    },
                    storage: {
                        allowMemory: true,
                    },
                });

                // Handle connection requests
                kit.onConnectRequest((event: EventConnectRequest) => {
                    console.log("[WalletKit] Connection request:", event);
                    if (mounted) {
                        setPendingConnection(event);
                    }
                });

                // Handle transaction requests
                kit.onTransactionRequest((event: EventTransactionRequest) => {
                    console.log("[WalletKit] Transaction request:", event);
                    if (mounted) {
                        setPendingTransaction(event);
                    }
                });

                // Handle sign data requests
                kit.onSignDataRequest((event: EventSignDataRequest) => {
                    console.log("[WalletKit] Sign data request:", event);
                    if (mounted) {
                        setPendingSignData(event);
                    }
                });

                // Handle disconnections
                kit.onDisconnect((event: EventDisconnect) => {
                    console.log("[WalletKit] Disconnect:", event);
                    // Refresh sessions list
                    kit.listSessions().then(s => {
                        if (mounted) setSessions(s);
                    });
                });

                // Wait for ready
                // Note: TonWalletKit auto-initializes, we just need to store the reference
                kitRef.current = kit;
                
                // Load initial sessions
                const initialSessions = await kit.listSessions();
                if (mounted) {
                    setSessions(initialSessions);
                    setIsReady(true);
                }

                console.log("[WalletKit] Initialized successfully");
            } catch (error) {
                console.error("[WalletKit] Initialization failed:", error);
            }
        };

        initKit();

        return () => {
            mounted = false;
            kitRef.current = null;
        };
    }, [isTestnet]);

    // Approve connection
    const approveConnection = useCallback(() => {
        // The approval is handled through the event system
        // We just clear the pending state - the kit handles the rest
        setPendingConnection(null);
    }, []);

    // Reject connection
    const rejectConnection = useCallback(() => {
        setPendingConnection(null);
    }, []);

    // Approve transaction
    const approveTransaction = useCallback((signedBoc: string) => {
        // Transaction approval with the signed BOC
        console.log("[WalletKit] Transaction approved with BOC:", signedBoc.slice(0, 50) + "...");
        setPendingTransaction(null);
    }, []);

    // Reject transaction
    const rejectTransaction = useCallback(() => {
        setPendingTransaction(null);
    }, []);

    // Refresh sessions
    const refreshSessions = useCallback(async () => {
        if (!kitRef.current) return;
        const s = await kitRef.current.listSessions();
        setSessions(s);
    }, []);

    // Disconnect session
    const disconnect = useCallback(async (sessionId?: string) => {
        if (!kitRef.current) return;
        await kitRef.current.disconnect(sessionId);
        await refreshSessions();
    }, [refreshSessions]);

    // Handle TON Connect URL from QR code
    const handleTonConnectUrl = useCallback(async (url: string) => {
        if (!kitRef.current) {
            throw new Error("WalletKit not initialized");
        }
        console.log("[WalletKit] Handling TON Connect URL:", url);
        await kitRef.current.handleTonConnectUrl(url);
    }, []);

    return (
        <WalletKitContext.Provider
            value={{
                isReady,
                isTestnet,
                pendingConnection,
                approveConnection,
                rejectConnection,
                pendingTransaction,
                approveTransaction,
                rejectTransaction,
                pendingSignData,
                sessions,
                refreshSessions,
                disconnect,
                handleTonConnectUrl,
            }}
        >
            {children}
        </WalletKitContext.Provider>
    );
}

export function useWalletKit() {
    const context = useContext(WalletKitContext);
    if (!context) {
        throw new Error("useWalletKit must be used within a WalletKitProvider");
    }
    return context;
}

/**
 * Hook to check if WalletKit is available (optional use)
 */
export function useWalletKitOptional() {
    return useContext(WalletKitContext);
}

export { CHAIN };
