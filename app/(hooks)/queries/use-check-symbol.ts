import { useQuery } from "@tanstack/react-query";

interface CheckSymbolResult {
  available: boolean;
  symbol: string;
}

async function checkSymbol(symbol: string): Promise<CheckSymbolResult> {
  const res = await fetch("/api/check-symbol", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol }),
  });
  if (!res.ok) throw new Error("Failed to check symbol");
  return res.json();
}

/**
 * Debounced symbol availability check via TanStack Query.
 * Only fires when symbol is >= 1 char. Uses a long staleTime to avoid
 * refetching the same symbol repeatedly.
 */
export function useCheckSymbolQuery(symbol: string | undefined | null) {
  const trimmed = symbol?.trim().toUpperCase() || "";
  return useQuery({
    queryKey: ["check-symbol", trimmed],
    queryFn: () => checkSymbol(trimmed),
    enabled: trimmed.length >= 1,
    staleTime: 30_000,
  });
}
