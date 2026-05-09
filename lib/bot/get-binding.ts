import { firestore } from "@/app/(firebase)/server";

export interface BotUserBinding {
  telegramId: string;
  qcId: string;
  walletAddress: string;
}

// Looks up the bot ↔ QC wallet binding for a Telegram user. Written by the
// `/link` flow (app/link/actions.ts → confirmBotLink). Returns null if the
// user hasn't linked yet — callers should prompt the user to run /link.
export async function getBotBinding(
  telegramId: number | string,
): Promise<BotUserBinding | null> {
  const id = String(telegramId);
  const snap = await firestore.collection("botUserBindings").doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as Partial<BotUserBinding> | undefined;
  if (!data?.walletAddress || !data?.qcId) return null;
  return {
    telegramId: id,
    qcId: data.qcId,
    walletAddress: data.walletAddress,
  };
}
