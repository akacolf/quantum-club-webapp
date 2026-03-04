import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMysteryBoxes, claimMysteryBox } from "@/app/wallet/marketplace/actions";
import type { MysteryBox } from "@/types/mystery-box";

async function fetchMysteryBoxes(): Promise<MysteryBox[]> {
  const result = await getMysteryBoxes({});
  if (!result?.data?.boxes) return [];
  return result.data.boxes as MysteryBox[];
}

export function useMysteryBoxesQuery() {
  return useQuery({
    queryKey: ["mystery-boxes"],
    queryFn: fetchMysteryBoxes,
    staleTime: 60_000,
  });
}

export function useMysteryBoxQuery(boxId: string | undefined | null) {
  return useQuery({
    queryKey: ["mystery-box", boxId],
    queryFn: async () => {
      const boxes = await fetchMysteryBoxes();
      return boxes.find((b) => b.id === boxId) || null;
    },
    enabled: !!boxId,
    staleTime: 60_000,
  });
}

export function useClaimMysteryBoxMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      boxId: string;
      paymentMethod: "ton" | "qntm";
    }) => {
      const result = await claimMysteryBox(data);
      if (result?.serverError) throw new Error(result.serverError);
      if (!result?.data) throw new Error("Failed to claim mystery box");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mystery-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["mystery-box"] });
    },
  });
}
