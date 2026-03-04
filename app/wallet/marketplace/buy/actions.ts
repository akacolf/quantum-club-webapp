"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { firestore as db } from "@/app/(firebase)/server";
import {
  createStarsInvoice as createInvoice,
  convertTonToStars,
} from "@/lib/telegram-payments";
import { env } from "@/env";

// ---------------------------------------------------------------------------
// createStarsInvoice — creates a Telegram Stars invoice link for NFT purchase
// ---------------------------------------------------------------------------

const createStarsInvoiceSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  payload: z.string().min(1),
  tonAmount: z.number().positive(),
  tonPriceUsd: z.number().positive(),
});

export const createStarsInvoice = authActionClient
  .schema(createStarsInvoiceSchema)
  .action(
    async ({
      parsedInput: { title, description, payload, tonAmount, tonPriceUsd },
      ctx: { session },
    }) => {
      const BOT_TOKEN = env.BOT_TOKEN;
      if (!BOT_TOKEN) {
        throw new Error("Payment service not configured");
      }

      const telegramId = String(session.user.telegramId);
      const starsAmount = convertTonToStars(tonAmount, tonPriceUsd);

      const result = await createInvoice(BOT_TOKEN, {
        telegramId,
        title,
        description,
        payload,
        priceInStars: starsAmount,
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      // Store pending payment in Firebase
      await db.collection("pending_star_payments").add({
        telegramId,
        payload,
        starsAmount,
        tonAmount,
        status: "pending",
        createdAt: Date.now(),
      });

      return {
        success: true,
        invoiceLink: result.invoiceLink,
        starsAmount,
      };
    }
  );
