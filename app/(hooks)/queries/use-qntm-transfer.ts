import { useMutation } from "@tanstack/react-query";
import { transferQntm } from "@/app/wallet/send-qntm/actions";

interface TransferQntmParams {
  fromQcId: string;
  toQcId: string;
  amount: number;
}

export function useTransferQntmMutation() {
  return useMutation({
    mutationFn: async (data: TransferQntmParams) => {
      const result = await transferQntm({
        recipientQcId: data.toQcId,
        amount: data.amount,
      });
      if (result?.serverError) throw new Error(result.serverError);
      if (!result?.data) throw new Error("Transfer failed");
      return result.data;
    },
  });
}
