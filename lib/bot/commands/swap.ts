// `/swap` command — quotes via STON.fi like `/route`, but additionally writes
// a `botIntents` doc with type "swap" and returns a deep link to the Mini App
// resolver. The Mini App pre-fills the swap UI from the intent, the user
// signs in their QC wallet, and the bot stays stateless (no key handling).

import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { firestore } from "@/app/(firebase)/server";
import { loadAssets, findAsset, quoteSwap } from "@/lib/bot/stonfi-server";
import { miniAppLink } from "@/lib/bot/deeplink";
import { getBotBinding } from "@/lib/bot/get-binding";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

const INTENT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function handleSwap(parsed: ParsedCommand): Promise<CommandResult> {
  const [amountRaw, fromSym, toSym] = parsed.args;
  if (!amountRaw || !fromSym || !toSym) {
    return {
      text:
        "Usage: swap <amount> <FROM> <TO>\n" +
        "Example: swap 10 TON USDT\n\n" +
        "I'll quote it and hand off to QC to sign.",
    };
  }
  if (!/^\d+(\.\d+)?$/.test(amountRaw)) {
    return { text: `"${amountRaw}" is not a valid amount.` };
  }

  const binding = await getBotBinding(parsed.fromId);
  if (!binding) {
    return {
      text: "Run `link` first to connect your QC wallet, then try `swap` again.",
    };
  }

  const assets = await loadAssets();
  const offer = findAsset(assets, fromSym);
  const ask = findAsset(assets, toSym);
  if (!offer) return { text: `Unknown token "${fromSym}".` };
  if (!ask) return { text: `Unknown token "${toSym}".` };
  if (offer.contractAddress === ask.contractAddress) {
    return { text: "Pick two different tokens." };
  }

  const quote = await quoteSwap(offer, ask, amountRaw);
  if (!quote) {
    return { text: `Couldn't quote ${fromSym} to ${toSym}. Pool may be illiquid.` };
  }

  const intentId = randomUUID();
  const expiresAt = Timestamp.fromMillis(Date.now() + INTENT_TTL_MS);
  await firestore.collection("botIntents").doc(intentId).set({
    type: "swap",
    fromTelegramId: String(parsed.fromId),
    chatId: parsed.chatId,
    fromSymbol: offer.symbol,
    toSymbol: ask.symbol,
    fromAmount: amountRaw,
    expectedOut: quote.askHuman,
    rate: quote.rate,
    priceImpact: quote.priceImpact,
    status: "pending",
    createdAt: Timestamp.now(),
    expiresAt,
  });

  const impact = (Number(quote.priceImpact) * 100).toFixed(2);
  const fee = (Number(quote.feePercent) * 100).toFixed(2);
  const text =
    `Swap ${amountRaw} ${offer.symbol} for ~${trim(quote.askHuman)} ${ask.symbol}\n` +
    `Rate: 1 ${offer.symbol} = ${trim(quote.rate)} ${ask.symbol}\n` +
    `Impact: ${impact}%   Fee: ${fee}%\n\n` +
    "Tap below to confirm and sign in QC. Link expires in 15 minutes.";

  return {
    text,
    replyMarkup: {
      inline_keyboard: [
        [{ text: "Confirm & sign in QC", url: miniAppLink(`intent_${intentId}`) }],
      ],
    },
  };
}

function trim(n: string): string {
  const num = Number(n);
  if (!isFinite(num)) return n;
  if (num >= 1) return num.toFixed(4).replace(/\.?0+$/, "");
  return num.toPrecision(4);
}
