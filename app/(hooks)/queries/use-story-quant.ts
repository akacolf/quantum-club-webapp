import { useQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc } from "firebase/firestore";

/**
 * TanStack Query hook that reads the user's firstQuant mining value from
 * Firestore (`user/{telegramId}/miningData/values`).
 *
 * Returns the formatted QNTM amount string (e.g. "12,345").
 *
 * Used by:
 *  - story/Content.tsx
 */
export function useStoryQuantQuery(telegramId: string | null) {
    return useQuery<string>({
        queryKey: ["story-quant", telegramId],
        queryFn: async () => {
            const snapshot = await getDoc(
                doc(dbfs, `user/${telegramId}/miningData/values`),
            );
            if (!snapshot.exists()) return "0";
            const firstQuantAmount = Number(snapshot.data()?.firstQuant || 0);
            return firstQuantAmount.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            });
        },
        enabled: !!telegramId,
        staleTime: 60_000, // 1 minute
    });
}
