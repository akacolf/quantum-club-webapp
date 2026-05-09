"use server";

import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { firestore } from "@/app/(firebase)/server";
import { Address } from "@ton/core";
import { encryptTelegramId } from "@/utils/encrypt-telegram-id";
import { authWithQcIdClient } from "@/lib/safe-action";

const confirmBotLinkSchema = z.object({
  tokenId: z.string().min(1).max(64),
  walletAddress: z.string().min(1),
});

// Confirms a bot-issued link token and writes the bindings doc.
//
// Security model:
//   - We trust the session JWT (telegramId) over anything the client sends.
//   - The token doc must reference the same telegramId as the session.
//     This prevents a forwarded/leaked link being consumed by a different
//     account.
//   - We normalize the wallet address client-side input via Address.parse.
export const confirmBotLink = authWithQcIdClient
  .schema(confirmBotLinkSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { tokenId, walletAddress } = parsedInput;
    const sessionTelegramId = ctx.telegramId;

    let normalizedAddress: string;
    try {
      normalizedAddress = Address.parse(walletAddress).toString();
    } catch {
      throw new Error("Invalid wallet address");
    }

    const tokenRef = firestore.collection("botLinkTokens").doc(tokenId);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) {
      throw new Error("Link not found");
    }
    const token = tokenSnap.data() as {
      telegramId?: number | string;
      status?: string;
      expiresAt?: Timestamp;
    };

    if (token.status === "consumed") {
      throw new Error("Link already used");
    }
    const expired =
      token.expiresAt instanceof Timestamp
        ? token.expiresAt.toMillis() < Date.now()
        : false;
    if (expired) {
      throw new Error("Link expired");
    }

    if (String(token.telegramId) !== sessionTelegramId) {
      // The Telegram user who DMed the bot does not match the user signed
      // into this Mini App. Reject — never bind across identities.
      throw new Error("Telegram identity mismatch");
    }

    const bindingRef = firestore.collection("botUserBindings").doc(sessionTelegramId);
    const qcId = encryptTelegramId(sessionTelegramId);

    const batch = firestore.batch();
    batch.set(bindingRef, {
      telegramId: sessionTelegramId,
      qcId,
      walletAddress: normalizedAddress,
      linkedAt: Timestamp.now(),
    });
    batch.set(
      tokenRef,
      { status: "consumed", consumedAt: Timestamp.now() },
      { merge: true },
    );
    await batch.commit();

    return { ok: true as const };
  });
