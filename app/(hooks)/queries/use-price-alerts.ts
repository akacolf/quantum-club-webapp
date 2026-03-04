import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CreatePriceAlertParams {
  telegramId: string;
  symbol: string;
  targetPrice: number;
  direction: "above" | "below";
}

export function useCreatePriceAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePriceAlertParams) => {
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create alert");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["priceAlerts", variables.telegramId] });
    },
  });
}

export function useDeletePriceAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { alertId: string; telegramId: string }) => {
      const res = await fetch(
        `/api/price-alerts?alertId=${data.alertId}&telegramId=${data.telegramId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete alert");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["priceAlerts", variables.telegramId] });
    },
  });
}
