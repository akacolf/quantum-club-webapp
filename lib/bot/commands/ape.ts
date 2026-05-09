import { Address } from "@ton/core";
import { Timestamp } from "firebase-admin/firestore";
import { firestore } from "@/app/(firebase)/server";
import { getJettonInfo } from "@/lib/ton-api";
import { miniAppLink } from "@/lib/bot/deeplink";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

const INTENT_TTL_MS = 10 * 60 * 1000; // 10 min

// Usage: ape <jetton-address>
// Creates a short-lived intent doc and returns a Mini App deep-link.
// The actual signing happens in the Mini App; this command only proposes.
export async function handleApe(parsed: ParsedCommand): Promise<CommandResult> {
  const target = parsed.args[0];
  if (!target) {
    return { text: "Usage: @bot ape <jetton-address>" };
  }

  let jetton: Address;
  try {
    jetton = Address.parse(target);
  } catch {
    return { text: `"${target}" is not a valid jetton address.` };
  }

  const info = await getJettonInfo(jetton.toString());
  if (!info) {
    return { text: `No jetton found at ${shortAddr(jetton.toString())}.` };
  }

  const intentId = makeIntentId();
  await firestore.collection("botIntents").doc(intentId).set({
    type: "ape",
    jettonAddress: jetton.toString(),
    fromTelegramId: parsed.fromId,
    chatId: parsed.chatId,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + INTENT_TTL_MS),
    status: "pending",
  });

  return {
    text: `Ready to ape into ${shortAddr(jetton.toString())}. Confirm in the Mini App — link expires in 10 min.`,
    replyMarkup: {
      inline_keyboard: [
        [
          {
            text: "Open in QC",
            url: miniAppLink(`intent_${intentId}`),
          },
        ],
      ],
    },
  };
}

function makeIntentId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
