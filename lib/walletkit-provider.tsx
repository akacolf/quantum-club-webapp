"use client";

/**
 * TON Connect WalletKit Integration
 * Provides full TON Connect wallet protocol support using the official WalletKit SDK
 *
 * State lives in stores/walletkit-store.ts (Zustand).
 * This provider holds kitRef/walletRef as local refs, creates action callbacks,
 * and syncs them into the store.
 */

import React, { useEffect, useCallback, useRef } from "react";
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
    type IWallet,
} from "@ton/walletkit";
import { toast } from "sonner";
import { analyticsEvents } from "@/lib/telegramAnalytics";
import { useWalletKitStore } from "@/stores/walletkit-store";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import { useShallow } from "zustand/shallow";

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
                    analyticsEvents.connectionStarted();
                    if (mounted) {
                        useWalletKitStore.setState({ pendingConnection: event });
                    }
                });

                // Handle transaction requests
                kit.onTransactionRequest((event: EventTransactionRequest) => {
                    console.log("[WalletKit] Transaction request received:", event);
                    if (mounted) {
                        useWalletKitStore.setState({ pendingTransaction: event });
                    }
                });

                // Handle sign data requests
                kit.onSignDataRequest((event: EventSignDataRequest) => {
                    console.log("[WalletKit] Sign data request received:", event);
                    if (mounted) {
                        useWalletKitStore.setState({ pendingSignData: event });
                    }
                });

                // Handle disconnections
                kit.onDisconnect((_event: EventDisconnect) => {
                    console.log("[WalletKit] Disconnect event:", _event);
                    analyticsEvents.disconnection();
                    kit.listSessions().then(s => {
                        if (mounted) useWalletKitStore.setState({ sessions: s });
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
                    useWalletKitStore.setState({
                        sessions: initialSessions,
                        isReady: true,
                        isTestnet,
                    });
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
    const registerWallet = useCallback(async (mnemonic: string[]): Promise<boolean> => {
        if (!kitRef.current) {
            console.error("[WalletKit] Kit not initialized");
            return false;
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
                useWalletKitStore.setState({ isWalletRegistered: true });
                console.log("[WalletKit] Wallet registered:", registeredWallet.getAddress());
                return true;
            }
            return false;
        } catch (error) {
            console.error("[WalletKit] Failed to register wallet:", error);
            return false;
        }
    }, [isTestnet]);

    // Auto-register wallet on initialization so it's ready before connection requests
    useEffect(() => {
        const { isReady, isWalletRegistered } = useWalletKitStore.getState();
        if (!isReady || isWalletRegistered || walletRef.current) return;

        const telegramId = localStorage.getItem("telegramId") || "";
        if (!telegramId) return;

        getSecureMnemonic(telegramId).then((storedMnemonic) => {
            if (storedMnemonic) {
                const mnemonic = storedMnemonic.split(" ");
                registerWallet(mnemonic).then((ok) => {
                    if (ok) console.log("[WalletKit] Auto-registered wallet on init");
                });
            }
        });
    }, [registerWallet]);

    // Approve connection request
    const approveConnection = useCallback(async () => {
        const { pendingConnection } = useWalletKitStore.getState();
        if (!kitRef.current || !pendingConnection) {
            console.error("[WalletKit] Cannot approve: kit or pending connection missing");
            toast.error("Connection failed", {
                description: "WalletKit not initialized. Please try again.",
            });
            return;
        }

        // Check if wallet is registered, if not try to register it
        if (!walletRef.current) {
            console.log("[WalletKit] Wallet not registered, attempting to register...");

            const telegramId = localStorage.getItem("telegramId") || "";
            const storedMnemonic = telegramId ? await getSecureMnemonic(telegramId) : null;

            if (storedMnemonic) {
                try {
                    const mnemonic = storedMnemonic.split(" ");
                    const registered = await registerWallet(mnemonic);

                    if (!registered || !walletRef.current) {
                        throw new Error("Wallet registration failed");
                    }
                } catch (regError) {
                    console.error("[WalletKit] Auto-registration failed:", regError);
                    toast.error("Connection failed", {
                        description: "Could not register wallet. Please reload the page and try again.",
                    });
                    useWalletKitStore.setState({ pendingConnection: null });
                    return;
                }
            } else {
                console.error("[WalletKit] Cannot approve: no mnemonic found in localStorage");
                toast.error("Connection failed", {
                    description: "No wallet found. Please create or import a wallet first.",
                });
                useWalletKitStore.setState({ pendingConnection: null });
                return;
            }
        }

        try {
            console.log("[WalletKit] Approving connection with wallet:", walletRef.current?.getAddress());
            await kitRef.current.approveConnectRequest(pendingConnection);
            console.log("[WalletKit] Connection approved");

            const address = walletRef.current?.getAddress();
            if (address) analyticsEvents.connectionCompleted(address.toString());

            // Refresh sessions
            const newSessions = await kitRef.current.listSessions();
            useWalletKitStore.setState({ sessions: newSessions });

            toast.success("Connected successfully");
        } catch (error) {
            console.error("[WalletKit] Failed to approve connection:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to connect";
            analyticsEvents.connectionError(errorMessage);

            // Check for specific error about wallet requirement
            if (errorMessage.toLowerCase().includes("wallet") && errorMessage.toLowerCase().includes("required")) {
                toast.error("Connection failed", {
                    description: "Wallet registration is incomplete. Please reload the page and try again.",
                });
            } else {
                toast.error("Connection failed", {
                    description: errorMessage,
                });
            }
        } finally {
            useWalletKitStore.setState({ pendingConnection: null });
        }
    }, [registerWallet]);

    // Reject connection request
    const rejectConnection = useCallback(async () => {
        const { pendingConnection } = useWalletKitStore.getState();
        if (!kitRef.current || !pendingConnection) {
            useWalletKitStore.setState({ pendingConnection: null });
            return;
        }

        try {
            console.log("[WalletKit] Rejecting connection...");
            await kitRef.current.rejectConnectRequest(pendingConnection, "User rejected");
        } catch (error) {
            console.error("[WalletKit] Failed to reject connection:", error);
        } finally {
            useWalletKitStore.setState({ pendingConnection: null });
        }
    }, []);

    // Approve transaction request
    const approveTransaction = useCallback(async () => {
        const { pendingTransaction } = useWalletKitStore.getState();
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
            useWalletKitStore.setState({ pendingTransaction: null });
        }
    }, []);

    // Reject transaction request
    const rejectTransaction = useCallback(async () => {
        const { pendingTransaction } = useWalletKitStore.getState();
        if (!kitRef.current || !pendingTransaction) {
            useWalletKitStore.setState({ pendingTransaction: null });
            return;
        }

        try {
            console.log("[WalletKit] Rejecting transaction...");
            await kitRef.current.rejectTransactionRequest(pendingTransaction, "User rejected");
        } catch (error) {
            console.error("[WalletKit] Failed to reject transaction:", error);
        } finally {
            useWalletKitStore.setState({ pendingTransaction: null });
        }
    }, []);

    // Refresh sessions
    const refreshSessions = useCallback(async () => {
        if (!kitRef.current) return;
        const s = await kitRef.current.listSessions();
        useWalletKitStore.setState({ sessions: s });
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

    // Sync actions into the store
    useEffect(() => {
        useWalletKitStore.setState({
            approveConnection,
            rejectConnection,
            approveTransaction,
            rejectTransaction,
            refreshSessions,
            disconnect,
            handleTonConnectUrl,
            registerWallet,
        });
    }, [
        approveConnection,
        rejectConnection,
        approveTransaction,
        rejectTransaction,
        refreshSessions,
        disconnect,
        handleTonConnectUrl,
        registerWallet,
    ]);

    return <>{children}</>;
}

/**
 * Backward-compatible hook — same return shape as the original useWalletKit().
 * Reads from Zustand store via useShallow.
 */
export function useWalletKit() {
    return useWalletKitStore(
        useShallow((s) => ({
            isReady: s.isReady,
            isTestnet: s.isTestnet,
            pendingConnection: s.pendingConnection,
            approveConnection: s.approveConnection,
            rejectConnection: s.rejectConnection,
            pendingTransaction: s.pendingTransaction,
            approveTransaction: s.approveTransaction,
            rejectTransaction: s.rejectTransaction,
            pendingSignData: s.pendingSignData,
            sessions: s.sessions,
            refreshSessions: s.refreshSessions,
            disconnect: s.disconnect,
            handleTonConnectUrl: s.handleTonConnectUrl,
            registerWallet: s.registerWallet,
            isWalletRegistered: s.isWalletRegistered,
        }))
    );
}

/**
 * Hook to check if WalletKit is available (optional use)
 */
export function useWalletKitOptional() {
    const store = useWalletKitStore(
        useShallow((s) => ({
            isReady: s.isReady,
            isTestnet: s.isTestnet,
            pendingConnection: s.pendingConnection,
            approveConnection: s.approveConnection,
            rejectConnection: s.rejectConnection,
            pendingTransaction: s.pendingTransaction,
            approveTransaction: s.approveTransaction,
            rejectTransaction: s.rejectTransaction,
            pendingSignData: s.pendingSignData,
            sessions: s.sessions,
            refreshSessions: s.refreshSessions,
            disconnect: s.disconnect,
            handleTonConnectUrl: s.handleTonConnectUrl,
            registerWallet: s.registerWallet,
            isWalletRegistered: s.isWalletRegistered,
        }))
    );
    return store;
}

export { CHAIN };
