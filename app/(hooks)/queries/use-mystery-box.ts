import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MysteryBox } from "@/types/mystery-box";

async function fetchMysteryBoxes(): Promise<MysteryBox[]> {
  const res = await fetch("/api/mystery-box", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "get-boxes" }),
  });
  if (!res.ok) throw new Error("Failed to fetch mystery boxes");
  const data = await res.json();
  return (data.boxes as MysteryBox[]) || [];
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
      const res = await fetch("/api/mystery-box", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim-box", ...data }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to claim mystery box");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mystery-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["mystery-box"] });
    },
  });
}
