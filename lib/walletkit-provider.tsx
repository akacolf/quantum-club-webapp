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
    Signer,
    WalletV5R1Adapter,
    type EventConnectRequest,
    type EventTransactionRequest,
    type EventSignDataRequest,
    type EventDisconnect,
    type SessionInfo,
    type IWallet,
} from "@ton/walletkit";
import { toast } from "sonner";

interface WalletKitContextType {
    isReady: boolean;
    isTestnet: boolean;
    
    // Connection requests
    pendingConnection: EventConnectRequest | null;
    approveConnection: () => Promise<void>;
    rejectConnection: () => Promise<void>;
    
    // Transaction requests
    pendingTransaction: EventTransactionRequest | null;
    approveTransaction: () => Promise<void>;
    rejectTransaction: () => Promise<void>;
    
    // Sign data requests
    pendingSignData: EventSignDataRequest | null;
    
    // Sessions
    sessions: SessionInfo[];
    refreshSessions: () => Promise<void>;
    disconnect: (sessionId?: string) => Promise<void>;
    
    // Connect from QR code
    handleTonConnectUrl: (url: string) => Promise<void>;
    
    // Wallet registration
    registerWallet: (mnemonic: string[]) => Promise<void>;
    isWalletRegistered: boolean;
}

const WalletKitContext = createContext<WalletKitContextType | null>(null);

interface WalletKitProviderProps {
    children: React.ReactNode;
    isTestnet: boolean;
}

// Bridge URL
const BRIDGE_URL = "https://bridge.tonapi.io/bridge";

export function WalletKitProvider({
    children,
    isTestnet,
}: WalletKitProviderProps) {
    const kitRef = useRef<TonWalletKit | null>(null);
    const walletRef = useRef<IWallet | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isWalletRegistered, setIsWalletRegistered] = useState(false);
    
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
                
                const network = isTestnet ? CHAIN.TESTNET : CHAIN.MAINNET;
                
                const kit = new TonWalletKit({
                    networks: {
                        [network]: {
                            apiClient: {
                                url: isTestnet 
                                    ? "https://testnet.toncenter.com/api/v3"
                                    : "https://toncenter.com/api/v3",
                            },
                        },
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
                        bridgeUrl: BRIDGE_URL,
                        jsBridgeKey: "qcwallet",
                    }),
                    bridge: {
                        bridgeUrl: BRIDGE_URL,
                        enableJsBridge: false,
                        disableHttpConnection: false,
                    },
                    storage: {
                        allowMemory: true,
                    },
                });

                // Handle connection requests
                kit.onConnectRequest((event: EventConnectRequest) => {
                    console.log("[WalletKit] Connection request received:", event);
                    if (mounted) {
                        setPendingConnection(event);
                    }
                });

                // Handle transaction requests
                kit.onTransactionRequest((event: EventTransactionRequest) => {
                    console.log("[WalletKit] Transaction request received:", event);
                    if (mounted) {
                        setPendingTransaction(event);
                    }
                });

                // Handle sign data requests
                kit.onSignDataRequest((event: EventSignDataRequest) => {
                    console.log("[WalletKit] Sign data request received:", event);
                    if (mounted) {
                        setPendingSignData(event);
                    }
                });

                // Handle disconnections
                kit.onDisconnect((event: EventDisconnect) => {
                    console.log("[WalletKit] Disconnect event:", event);
                    kit.listSessions().then(s => {
                        if (mounted) setSessions(s);
                    });
                });

                // Handle errors
                kit.onRequestError((error) => {
                    console.error("[WalletKit] Request error:", error);
                    toast.error("Connection error", {
                        description: String(error) || "Failed to process request",
                    });
                });

                kitRef.current = kit;
                
                // Load initial sessions
                const initialSessions = await kit.listSessions();
                if (mounted) {
                    setSessions(initialSessions);
                    setIsReady(true);
                    console.log("[WalletKit] Initialized successfully, sessions:", initialSessions.length);
                }
            } catch (error) {
                console.error("[WalletKit] Initialization failed:", error);
            }
        };

        initKit();

        return () => {
            mounted = false;
        };
    }, [isTestnet]);

    // Register wallet with WalletKit
    const registerWallet = useCallback(async (mnemonic: string[]) => {
        if (!kitRef.current) {
            console.error("[WalletKit] Kit not initialized");
            return;
        }
        
        try {
            console.log("[WalletKit] Registering wallet...");
            const network = isTestnet ? CHAIN.TESTNET : CHAIN.MAINNET;
            
            // Create signer from mnemonic
            const signer = await Signer.fromMnemonic(mnemonic);
            
            // Get API client from kit
            const client = kitRef.current.getApiClient(network);
            
            // Create wallet adapter
            const wallet = await WalletV5R1Adapter.create(signer, {
                client,
                network,
            });
            
            // Register with WalletKit
            const registeredWallet = await kitRef.current.addWallet(wallet);
            
            if (registeredWallet) {
                walletRef.current = registeredWallet;
                setIsWalletRegistered(true);
                console.log("[WalletKit] Wallet registered:", registeredWallet.getAddress());
            }
        } catch (error) {
            console.error("[WalletKit] Failed to register wallet:", error);
        }
    }, [isTestnet]);

    // Approve connection request
    const approveConnection = useCallback(async () => {
        if (!kitRef.current || !pendingConnection) {
            console.error("[WalletKit] Cannot approve: kit or pending connection missing");
            return;
        }
        
        try {
            console.log("[WalletKit] Approving connection...");
            await kitRef.current.approveConnectRequest(pendingConnection);
            console.log("[WalletKit] Connection approved");
            
            // Refresh sessions
            const newSessions = await kitRef.current.listSessions();
            setSessions(newSessions);
            
            toast.success("Connected successfully");
        } catch (error) {
            console.error("[WalletKit] Failed to approve connection:", error);
            toast.error("Connection failed", {
                description: error instanceof Error ? error.message : "Failed to connect",
            });
        } finally {
            setPendingConnection(null);
        }
    }, [pendingConnection]);

    // Reject connection request
    const rejectConnection = useCallback(async () => {
        if (!kitRef.current || !pendingConnection) {
            setPendingConnection(null);
            return;
        }
        
        try {
            console.log("[WalletKit] Rejecting connection...");
            await kitRef.current.rejectConnectRequest(pendingConnection, "User rejected");
        } catch (error) {
            console.error("[WalletKit] Failed to reject connection:", error);
        } finally {
            setPendingConnection(null);
        }
    }, [pendingConnection]);

    // Approve transaction request
    const approveTransaction = useCallback(async () => {
        if (!kitRef.current || !pendingTransaction) {
            console.error("[WalletKit] Cannot approve: kit or pending transaction missing");
            return;
        }
        
        try {
            console.log("[WalletKit] Approving transaction...");
            const response = await kitRef.current.approveTransactionRequest(pendingTransaction);
            console.log("[WalletKit] Transaction approved:", response);
            toast.success("Transaction sent");
        } catch (error) {
            console.error("[WalletKit] Failed to approve transaction:", error);
            toast.error("Transaction failed", {
                description: error instanceof Error ? error.message : "Failed to send transaction",
            });
        } finally {
            setPendingTransaction(null);
        }
    }, [pendingTransaction]);

    // Reject transaction request
    const rejectTransaction = useCallback(async () => {
        if (!kitRef.current || !pendingTransaction) {
            setPendingTransaction(null);
            return;
        }
        
        try {
            console.log("[WalletKit] Rejecting transaction...");
            await kitRef.current.rejectTransactionRequest(pendingTransaction, "User rejected");
        } catch (error) {
            console.error("[WalletKit] Failed to reject transaction:", error);
        } finally {
            setPendingTransaction(null);
        }
    }, [pendingTransaction]);

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
                registerWallet,
                isWalletRegistered,
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
