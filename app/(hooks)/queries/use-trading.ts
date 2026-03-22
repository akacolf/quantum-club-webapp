import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    startAfter,
    Timestamp,
    type QueryDocumentSnapshot,
    type DocumentData,
} from "firebase/firestore";
import type { Token } from "@/types/trading";
import { DEFAULT_BONDING_CURVE, DEFAULT_GRADUATION_THRESHOLD_TON } from "@/types/trading";
import { ROCKETSTART_TESTNET } from "@/lib/platform-config";

const NETWORK_FILTER = ROCKETSTART_TESTNET ? "testnet" : "mainnet";
const TOKEN_PAGE_SIZE = 20;

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

interface TokenPage {
    tokens: Token[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

export function useTrendingTokens() {
    return useInfiniteQuery({
        queryKey: ["tokens", "trending"],
        queryFn: async ({ pageParam }): Promise<TokenPage> => {
            const constraints = [
                where("network", "==", NETWORK_FILTER),
                where("isOnChain", "==", true),
                orderBy("volume24h", "desc"),
                ...(pageParam ? [startAfter(pageParam)] : []),
                limit(TOKEN_PAGE_SIZE),
            ];
            const q = query(collection(dbfs, "tokens"), ...constraints);
            const snapshot = await getDocs(q);
            return {
                tokens: snapshot.docs.map(docToToken),
                lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
            };
        },
        initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
        getNextPageParam: (lastPage) => {
            if (lastPage.tokens.length < TOKEN_PAGE_SIZE) return undefined;
            return lastPage.lastDoc;
        },
        staleTime: 30_000,
    });
}

export function useNewTokens() {
    return useInfiniteQuery({
        queryKey: ["tokens", "new"],
        queryFn: async ({ pageParam }): Promise<TokenPage> => {
            const constraints = [
                where("network", "==", NETWORK_FILTER),
                where("isOnChain", "==", true),
                orderBy("createdAt", "desc"),
                ...(pageParam ? [startAfter(pageParam)] : []),
                limit(TOKEN_PAGE_SIZE),
            ];
            const q = query(collection(dbfs, "tokens"), ...constraints);
            const snapshot = await getDocs(q);
            return {
                tokens: snapshot.docs.map(docToToken),
                lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
            };
        },
        initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
        getNextPageParam: (lastPage) => {
            if (lastPage.tokens.length < TOKEN_PAGE_SIZE) return undefined;
            return lastPage.lastDoc;
        },
        staleTime: 30_000,
    });
}

export function useGraduatedTokens() {
    return useInfiniteQuery({
        queryKey: ["tokens", "graduated"],
        queryFn: async ({ pageParam }): Promise<TokenPage> => {
            const constraints = [
                where("network", "==", NETWORK_FILTER),
                where("isGraduated", "==", true),
                orderBy("graduatedAt", "desc"),
                ...(pageParam ? [startAfter(pageParam)] : []),
                limit(TOKEN_PAGE_SIZE),
            ];
            const q = query(collection(dbfs, "tokens"), ...constraints);
            const snapshot = await getDocs(q);
            return {
                tokens: snapshot.docs.map(docToToken),
                lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
            };
        },
        initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
        getNextPageParam: (lastPage) => {
            if (lastPage.tokens.length < TOKEN_PAGE_SIZE) return undefined;
            return lastPage.lastDoc;
        },
        staleTime: 30_000,
    });
}

export function useMyTokens(telegramId: string | null, walletAddress: string) {
    return useInfiniteQuery({
        queryKey: ["tokens", "my", telegramId, walletAddress],
        queryFn: async ({ pageParam }): Promise<TokenPage> => {
            const tokenMap = new Map<string, { token: Token; doc: QueryDocumentSnapshot<DocumentData> }>();

            if (telegramId) {
                const constraints = [
                    where("network", "==", NETWORK_FILTER),
                    where("creatorUserId", "==", telegramId),
                    orderBy("createdAt", "desc"),
                    ...(pageParam ? [startAfter(pageParam)] : []),
                    limit(TOKEN_PAGE_SIZE),
                ];
                const q = query(collection(dbfs, "tokens"), ...constraints);
                const snapshot = await getDocs(q);
                snapshot.docs.forEach((doc) => tokenMap.set(doc.id, { token: docToToken(doc), doc }));
            }

            if (walletAddress) {
                const constraints = [
                    where("network", "==", NETWORK_FILTER),
                    where("creatorAddress", "==", walletAddress),
                    orderBy("createdAt", "desc"),
                    ...(pageParam ? [startAfter(pageParam)] : []),
                    limit(TOKEN_PAGE_SIZE),
                ];
                const q = query(collection(dbfs, "tokens"), ...constraints);
                const snapshot = await getDocs(q);
                snapshot.docs.forEach((doc) => tokenMap.set(doc.id, { token: docToToken(doc), doc }));
            }

            const entries = Array.from(tokenMap.values()).sort((a, b) => {
                const aTime = a.token.createdAt ? new Date(a.token.createdAt).getTime() : 0;
                const bTime = b.token.createdAt ? new Date(b.token.createdAt).getTime() : 0;
                return bTime - aTime;
            });

            return {
                tokens: entries.map(e => e.token),
                lastDoc: entries[entries.length - 1]?.doc ?? null,
            };
        },
        initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
        getNextPageParam: (lastPage) => {
            if (lastPage.tokens.length < TOKEN_PAGE_SIZE) return undefined;
            return lastPage.lastDoc;
        },
        enabled: !!telegramId && !!walletAddress,
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
