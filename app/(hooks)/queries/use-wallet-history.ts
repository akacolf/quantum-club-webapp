import { useQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";

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

async function fetchTonHistory(walletAddress: string, isTestnet: boolean): Promise<HistoryEvent[]> {
    const { tonApiGet } = await import("@/lib/tonapi-client");
    const data = await tonApiGet<{ events: HistoryEvent[] }>(
        `/v2/accounts/${encodeURIComponent(walletAddress)}/events?limit=50&subject_only=true`,
        { testnet: isTestnet },
    );
    return data.events || [];
}

async function fetchQntmHistory(telegramId: string): Promise<QNTMTransfer[]> {
    const transferHistoryRef = collection(dbfs, `user/${telegramId}/transferHistory`);
    const q = query(transferHistoryRef, orderBy("timestamp", "desc"), limit(50));
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
    return transfers;
}

export function useTonHistoryQuery(walletAddress: string | null | undefined, isTestnet: boolean) {
    return useQuery<HistoryEvent[]>({
        queryKey: ["wallet-history", walletAddress, isTestnet],
        queryFn: () => fetchTonHistory(walletAddress!, isTestnet),
        enabled: !!walletAddress,
        staleTime: 30_000,
    });
}

export function useQntmHistoryQuery(telegramId: string | null | undefined) {
    return useQuery<QNTMTransfer[]>({
        queryKey: ["qntm-history", telegramId],
        queryFn: () => fetchQntmHistory(telegramId!),
        enabled: !!telegramId,
        staleTime: 60_000,
    });
}
