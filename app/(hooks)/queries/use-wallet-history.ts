import { useInfiniteQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    getDocs,
    orderBy,
    query,
    limit,
    startAfter,
    type QueryDocumentSnapshot,
    type DocumentData,
} from "firebase/firestore";

export interface HistoryEvent {
    event_id: string;
    timestamp: number;
    in_progress?: boolean;
    is_scam?: boolean;
    actions?: Array<{
        type: string;
        TonTransfer?: {
            amount?: string;
            recipient?: { address?: string };
            sender?: { address?: string };
        };
        JettonTransfer?: {
            amount?: string;
            recipient?: { address?: string };
            sender?: { address?: string };
            jetton?: { decimals?: number; symbol?: string };
        };
        JettonSwap?: {
            dex?: string;
            amount_in?: string;
            amount_out?: string;
            ton_in?: string;
            ton_out?: string;
            user_wallet?: { address?: string };
            router?: { address?: string };
            jetton_master_in?: { symbol?: string; decimals?: number; address?: string };
            jetton_master_out?: { symbol?: string; decimals?: number; address?: string };
        };
        NftItemTransfer?: {
            recipient?: { address?: string };
            sender?: { address?: string };
            nft?: string;
        };
    }>;
}

export interface QNTMTransfer {
    id: string;
    type: "sent" | "received";
    amount: number;
    to?: string;
    from?: string;
    date: string;
    timestamp?: number;
}

const PAGE_SIZE = 30;

interface TonHistoryPage {
    events: HistoryEvent[];
    next_from: number;
}

async function fetchTonHistoryPage(
    walletAddress: string,
    isTestnet: boolean,
    beforeLt?: number,
): Promise<TonHistoryPage> {
    const { tonApiGet } = await import("@/lib/tonapi-client");
    const cursor = beforeLt ? `&before_lt=${beforeLt}` : "";
    return tonApiGet<TonHistoryPage>(
        `/v2/accounts/${encodeURIComponent(walletAddress)}/events?limit=${PAGE_SIZE}&subject_only=true${cursor}`,
        { testnet: isTestnet },
    );
}

interface QntmHistoryPage {
    transfers: QNTMTransfer[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

async function fetchQntmHistoryPage(
    telegramId: string,
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
): Promise<QntmHistoryPage> {
    const transferHistoryRef = collection(dbfs, `user/${telegramId}/transferHistory`);
    const constraints = lastDoc
        ? [orderBy("timestamp", "desc"), startAfter(lastDoc), limit(PAGE_SIZE)]
        : [orderBy("timestamp", "desc"), limit(PAGE_SIZE)];
    const q = query(transferHistoryRef, ...constraints);
    const snapshot = await getDocs(q);

    const transfers: QNTMTransfer[] = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        transfers.push({
            id: doc.id,
            type: data.type,
            amount: data.amount,
            to: data.to,
            from: data.from,
            date: data.date,
            timestamp: data.timestamp?.seconds || parseInt(doc.id),
        });
    });

    return {
        transfers,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
    };
}

export function useTonHistoryQuery(walletAddress: string | null | undefined, isTestnet: boolean) {
    return useInfiniteQuery({
        queryKey: ["wallet-history", walletAddress, isTestnet],
        queryFn: ({ pageParam }) => fetchTonHistoryPage(walletAddress!, isTestnet, pageParam),
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (lastPage) => {
            if (!lastPage.events?.length || lastPage.events.length < PAGE_SIZE) return undefined;
            return lastPage.next_from;
        },
        enabled: !!walletAddress,
        staleTime: 30_000,
    });
}

export function useQntmHistoryQuery(telegramId: string | null | undefined) {
    return useInfiniteQuery({
        queryKey: ["qntm-history", telegramId],
        queryFn: ({ pageParam }) => fetchQntmHistoryPage(telegramId!, pageParam),
        initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
        getNextPageParam: (lastPage) => {
            if (lastPage.transfers.length < PAGE_SIZE) return undefined;
            return lastPage.lastDoc;
        },
        enabled: !!telegramId,
        staleTime: 60_000,
    });
}
