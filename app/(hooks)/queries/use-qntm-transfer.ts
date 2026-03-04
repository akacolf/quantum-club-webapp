import { useMutation } from "@tanstack/react-query";

interface TransferQntmParams {
  fromQcId: string;
  toQcId: string;
  amount: number;
}

export function useTransferQntmMutation() {
  return useMutation({
    mutationFn: async (data: TransferQntmParams) => {
      const res = await fetch("/api/transfer-qntm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transfer failed");
      }
      return res.json();
    },
  });
}
