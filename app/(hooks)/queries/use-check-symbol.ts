import { useQuery } from "@tanstack/react-query";
import { checkSymbolAvailability } from "@/app/ecosystem/trade/actions";

interface CheckSymbolResult {
  available: boolean;
  symbol: string;
}

/**
 * Debounced symbol availability check via TanStack Query.
 * Only fires when symbol is >= 1 char. Uses a long staleTime to avoid
 * refetching the same symbol repeatedly.
 */
export function useCheckSymbolQuery(symbol: string | undefined | null) {
  const trimmed = symbol?.trim().toUpperCase() || "";
  return useQuery<CheckSymbolResult>({
    queryKey: ["check-symbol", trimmed],
    queryFn: async () => {
      const result = await checkSymbolAvailability({ symbol: trimmed });
      if (result?.serverError) throw new Error(result.serverError);
      if (!result?.data) throw new Error("Failed to check symbol");
      return { available: result.data.available, symbol: result.data.symbol };
    },
    enabled: trimmed.length >= 1,
    staleTime: 30_000,
  });
}
