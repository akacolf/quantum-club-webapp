import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPriceAlert, deletePriceAlert } from "@/app/wallet/settings/price-alerts/actions";

export function useCreatePriceAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      telegramId: string;
      symbol: string;
      targetPrice: number;
      direction: "above" | "below";
    }) => {
      const result = await createPriceAlert({
        symbol: data.symbol,
        targetPrice: data.targetPrice,
        direction: data.direction,
      });
      if (result?.serverError) throw new Error(result.serverError);
      if (!result?.data) throw new Error("Failed to create alert");
      return result.data;
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
      const result = await deletePriceAlert({ alertId: data.alertId });
      if (result?.serverError) throw new Error(result.serverError);
      if (!result?.data) throw new Error("Failed to delete alert");
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["priceAlerts", variables.telegramId] });
    },
  });
}
