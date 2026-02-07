import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    Timestamp,
} from "firebase/firestore";
import type { Token } from "@/types/trading";
import { DEFAULT_BONDING_CURVE, DEFAULT_GRADUATION_THRESHOLD_TON } from "@/types/trading";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToToken(doc: any): Token {
    const data = doc.data();
    return {
        id: doc.id,
        name: (data.name as string) || "",
        nameLower: (data.nameLower as string) || ((data.name as string) || "").toLowerCase(),
        symbol: (data.symbol as string) || "",
        symbolLower: (data.symbolLower as string) || ((data.symbol as string) || "").toLowerCase(),
        description: (data.description as string) || "",
        image: (data.image as string) || "",
        creatorId: (data.creatorId as string) || (data.creatorUserId as string) || "",
        creatorWallet: (data.creatorWallet as string) || (data.creatorAddress as string) || "",
        creatorUsername: (data.creatorUsername as string) || "",
        jettonMasterAddress: (data.jettonMasterAddress as string) || "",
        isOnChain: (data.isOnChain as boolean) || false,
        isDeployed: (data.isDeployed as boolean) || false,
        maxSupply: (data.maxSupply as string) || "1000000000000000000",
        totalSupply: (data.totalSupply as string) || "0",
        circulatingSupply: (data.circulatingSupply as string) || (data.totalSupply as string) || "0",
        tonReserve: (data.tonReserve as string) || (data.marketCap as string) || "0",
        currentPrice: (data.currentPrice as string) || "0",
        marketCap: (data.marketCap as string) || "0",
        holders: (data.holders as number) || 0,
        trades: (data.trades as number) || 0,
        volume24h: (data.volume24h as number) || 0,
        priceChange24h: (data.priceChange24h as number) || 0,
        creatorEarnings: (data.creatorEarnings as string) || "0",
        bondingCurve: (data.bondingCurve as { basePrice: string; slope: string }) || DEFAULT_BONDING_CURVE,
        graduationThreshold: (data.graduationThreshold as string) || DEFAULT_GRADUATION_THRESHOLD_TON,
        isGraduated: (data.isGraduated as boolean) || false,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    };
}

export function useTrendingTokens() {
    return useQuery<Token[]>({
        queryKey: ["tokens", "trending"],
        queryFn: async () => {
            const q = query(
                collection(dbfs, "tokens"),
                where("isOnChain", "==", true),
                orderBy("volume24h", "desc"),
                limit(20)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(docToToken);
        },
        staleTime: 30_000,
    });
}

export function useNewTokens() {
    return useQuery<Token[]>({
        queryKey: ["tokens", "new"],
        queryFn: async () => {
            const q = query(
                collection(dbfs, "tokens"),
                where("isOnChain", "==", true),
                orderBy("createdAt", "desc"),
                limit(20)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(docToToken);
        },
        staleTime: 30_000,
    });
}

export function useGraduatedTokens() {
    return useQuery<Token[]>({
        queryKey: ["tokens", "graduated"],
        queryFn: async () => {
            const q = query(
                collection(dbfs, "tokens"),
                where("isGraduated", "==", true),
                orderBy("graduatedAt", "desc"),
                limit(20)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(docToToken);
        },
        staleTime: 30_000,
    });
}

export function useMyTokens(telegramId: string | null, walletAddress: string) {
    return useQuery<Token[]>({
        queryKey: ["tokens", "my", telegramId, walletAddress],
        queryFn: async () => {
            const tokenMap = new Map<string, Token>();

            if (telegramId) {
                const q = query(
                    collection(dbfs, "tokens"),
                    where("creatorUserId", "==", telegramId),
                    orderBy("createdAt", "desc"),
                    limit(50)
                );
                const snapshot = await getDocs(q);
                snapshot.docs.forEach((doc) => tokenMap.set(doc.id, docToToken(doc)));
            }

            if (walletAddress) {
                const q = query(
                    collection(dbfs, "tokens"),
                    where("creatorAddress", "==", walletAddress),
                    orderBy("createdAt", "desc"),
                    limit(50)
                );
                const snapshot = await getDocs(q);
                snapshot.docs.forEach((doc) => tokenMap.set(doc.id, docToToken(doc)));
            }

            return Array.from(tokenMap.values()).sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            });
        },
        enabled: !!telegramId || !!walletAddress,
        staleTime: 30_000,
    });
}

/**
 * Returns a function to invalidate all token queries.
 */
export function useInvalidateTokenQueries() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: ["tokens"] });
}
