"use server";

// Bot intent callbacks — invoked from the Mini App after a bot-originated
// action (currently /swap) actually completes. The Mini App holds the user
// session; this server action validates that the intent belongs to the
// caller's bot binding and then DMs the user via the bot.

import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { firestore } from "@/app/(firebase)/server";
import { authActionClient } from "@/lib/safe-action";
import { sendMessage } from "@/lib/bot/telegram-client";

const completeSwapSchema = z.object({
  intentId: z.string().min(1),
  fromAmount: z.string().optional(),
  fromSymbol: z.string().optional(),
  toAmount: z.string().optional(),
  toSymbol: z.string().optional(),
});

export const notifyBotSwapCompletion = authActionClient
  .schema(completeSwapSchema)
  .action(async ({ parsedInput, ctx: { session } }) => {
    const { intentId, fromAmount, fromSymbol, toAmount, toSymbol } = parsedInput;
    const telegramId = String(session.user.telegramId);

    const ref = firestore.collection("botIntents").doc(intentId);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, reason: "intent-missing" as const };

    const data = snap.data() as {
      type?: string;
      fromTelegramId?: string;
      chatId?: number;
      status?: string;
    };

    if (data.type !== "swap") return { success: false, reason: "wrong-type" as const };
    if (data.fromTelegramId !== telegramId) {
      // Only the originating user can mark their own intent complete.
      return { success: false, reason: "unauthorized" as const };
    }
    if (data.status === "completed") {
      return { success: true, reason: "already-complete" as const };
    }

    await ref.set(
      { status: "completed", completedAt: Timestamp.now() },
      { merge: true },
    );

    // Best-effort DM. We use the user's telegramId as chatId for the DM
    // because the bot conversation IS the DM with that user; chatId stored
    // on the intent is the chat where the original /swap was sent (which
    // could be a group — DMs are preferred for completion).
    const dmChatId = Number(telegramId);
    if (Number.isFinite(dmChatId)) {
      const lines: string[] = ["Swap completed."];
      if (fromAmount && fromSymbol && toAmount && toSymbol) {
        lines.push(`${fromAmount} ${fromSymbol} for ${toAmount} ${toSymbol}`);
      }
      await sendMessage({ chatId: dmChatId, text: lines.join("\n") });
    }

    return { success: true };
  });
