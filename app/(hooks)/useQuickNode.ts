/**
 * QuickNode React Hook
 * 
 * Provides easy access to QuickNode blockchain data from React components.
 */

import { useState, useCallback, useEffect } from "react";

interface QuickNodeAccountInfo {
    address: string;
    balance: string;
    status: "active" | "uninitialized" | "frozen";
    last_transaction_lt?: string;
    last_transaction_hash?: string;
}

interface QuickNodeTransaction {
    hash: string;
    lt: string;
    account: string;
    success: boolean;
    utime: number;
    in_msg?: {
        source: string;
        destination: string;
        value: string;
    };
    out_msgs?: Array<{
        destination: string;
        value: string;
    }>;
    total_fees: string;
}

interface UseQuickNodeReturn {
    isConfigured: boolean;
    isHealthy: boolean;
    isLoading: boolean;
    error: string | null;
    // Methods
    checkHealth: () => Promise<boolean>;
    getAccountInfo: (address: string) => Promise<QuickNodeAccountInfo | null>;
    getBalance: (address: string) => Promise<string | null>;
    getTransactions: (address: string, limit?: number) => Promise<QuickNodeTransaction[]>;
}

export function useQuickNode(): UseQuickNodeReturn {
    const [isConfigured, setIsConfigured] = useState(false);
    const [isHealthy, setIsHealthy] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check if QuickNode is configured and healthy on mount
    useEffect(() => {
        const checkConfig = async () => {
            try {
                const response = await fetch("/api/quicknode?method=health");
                const data = await response.json();
                setIsConfigured(data.configured === true);
                setIsHealthy(data.healthy === true);
            } catch {
                setIsConfigured(false);
                setIsHealthy(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkConfig();
    }, []);

    const checkHealth = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch("/api/quicknode?method=health");
            const data = await response.json();
            const healthy = data.healthy === true;
            setIsHealthy(healthy);
            return healthy;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Health check failed");
            setIsHealthy(false);
            return false;
        }
    }, []);

    const getAccountInfo = useCallback(async (address: string): Promise<QuickNodeAccountInfo | null> => {
        if (!isConfigured) return null;
        
        try {
            const response = await fetch(`/api/quicknode?method=account&address=${address}`);
            const data = await response.json();
            if (data.success) {
                return data.data;
            }
            setError(data.error);
            return null;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to get account info");
            return null;
        }
    }, [isConfigured]);

    const getBalance = useCallback(async (address: string): Promise<string | null> => {
        if (!isConfigured) return null;
        
        try {
            const response = await fetch(`/api/quicknode?method=balance&address=${address}`);
            const data = await response.json();
            if (data.success) {
                return data.balance;
            }
            setError(data.error);
            return null;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to get balance");
            return null;
        }
    }, [isConfigured]);

    const getTransactions = useCallback(async (
        address: string,
        limit: number = 10
    ): Promise<QuickNodeTransaction[]> => {
        if (!isConfigured) return [];
        
        try {
            const response = await fetch(`/api/quicknode?method=transactions&address=${address}&limit=${limit}`);
            const data = await response.json();
            if (data.success) {
                return data.transactions;
            }
            setError(data.error);
            return [];
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to get transactions");
            return [];
        }
    }, [isConfigured]);

    return {
        isConfigured,
        isHealthy,
        isLoading,
        error,
        checkHealth,
        getAccountInfo,
        getBalance,
        getTransactions,
    };
}
