"use server";

import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { Address } from "@ton/core";
import { authWithQcIdClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import { fetchTonPrice } from "@/lib/price-api";
import { PLATFORM_WALLET_ADDRESS } from "@/lib/platform-config";
import { bumpAffinity } from "@/lib/social-affinity";
import { env } from "@/env";
import {
  QC_PRO_USD_PRICE,
  QC_PRO_DURATION_DAYS,
  CREATOR_REVSHARE,
  PAYOUT_MIN_TON,
  confirmPaymentSchema,
  quotePostUnlockSchema,
  setPostGateSchema,
} from "@/lib/validations";

// ---------------------------------------------------------------------------
// Pricing helpers
// ---------------------------------------------------------------------------

const PAYMENT_TTL_MS = 30 * 60 * 1000; // 30 minutes — tx must land within this window
// Slippage tolerance — TON price moves between quote and tx confirm.
const PRICE_TOLERANCE = 0.05;

function generateMemo(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `qc-${prefix}-${rand}`;
}

async function quoteTonForUsd(usd: number): Promise<number> {
  const price = await fetchTonPrice();
  if (!price || price <= 0) {
    throw new Error("TON price unavailable, try again in a moment");
  }
  return Math.ceil((usd / price) * 100) / 100;
}

// ---------------------------------------------------------------------------
// TonAPI verification — look up the platform wallet's recent events and find
// a TonTransfer whose decoded comment matches the payment memo. We trust the
// memo as the link (cryptographically random, 8 chars, unique per payment).
// ---------------------------------------------------------------------------

interface TonEventAction {
  type: string;
  status: string;
  TonTransfer?: {
    sender: { address: string };
    recipient: { address: string };
    amount: number;
    comment?: string;
  };
}

interface TonEvent {
  event_id: string;
  timestamp: number;
  actions: TonEventAction[];
}

async function findIncomingPaymentByMemo(memo: string): Promise<{
  txHash: string;
  amountTon: number;
  senderAddress: string;
} | null> {
  const isTestnet = env.NEXT_PUBLIC_TON_NETWORK === "testnet";
  const baseUrl = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (env.TONAPI_KEY) {
    headers["Authorization"] = `Bearer ${env.TONAPI_KEY}`;
  }

  const recipient = Address.parse(PLATFORM_WALLET_ADDRESS).toString({
    bounceable: false,
  });

  const response = await fetch(
    `${baseUrl}/v2/accounts/${recipient}/events?limit=50`,
    { method: "GET", headers, next: { revalidate: 0 } },
  );
  if (!response.ok) {
    throw new Error(`TonAPI error: ${response.status}`);
  }
  const data = (await response.json()) as { events: TonEvent[] };

  for (const event of data.events) {
    for (const action of event.actions) {
      if (action.type !== "TonTransfer" || !action.TonTransfer) continue;
      if (action.status !== "ok") continue;
      const transfer = action.TonTransfer;
      if (transfer.comment !== memo) continue;
      const amountTon = Number(transfer.amount) / 1e9;
      return {
        txHash: event.event_id,
        amountTon,
        senderAddress: transfer.sender.address,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// quoteProSubscription — creates a pending payment doc and returns the
// payload the client needs to construct the TON transfer (recipient + amount
// + memo). Client signs via WalletKit, then calls confirmProPayment.
// ---------------------------------------------------------------------------

export const quoteProSubscription = authWithQcIdClient.action(
  async ({ ctx: { qcId } }) => {
    // Must have a social profile first.
    const profileRef = firestore.doc(`socialProfiles/${qcId}`);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      throw new Error("Set up your social profile first");
    }

    const amountTon = await quoteTonForUsd(QC_PRO_USD_PRICE);
    const memo = generateMemo("pro");
    const recipient = Address.parse(PLATFORM_WALLET_ADDRESS).toString({
      bounceable: false,
    });

    const paymentRef = firestore.collection("subscriptionPayments").doc();
    await paymentRef.set({
      payerQcId: qcId,
      kind: "pro",
      amountTon,
      amountUsd: QC_PRO_USD_PRICE,
      targetAuthorQcId: null,
      targetPostId: null,
      memo,
      status: "pending",
      txHash: null,
      createdAt: FieldValue.serverTimestamp(),
      verifiedAt: null,
      expiresAt: Timestamp.fromMillis(Date.now() + PAYMENT_TTL_MS),
    });

    return {
      paymentId: paymentRef.id,
      amountTon,
      amountUsd: QC_PRO_USD_PRICE,
      memo,
      recipient,
    };
  },
);

// ---------------------------------------------------------------------------
// confirmProPayment — server polls TonAPI for an inbound TonTransfer with
// the memo, validates amount within tolerance, then marks profile.proExpiresAt
// 30 days forward. Idempotent: re-running on a verified payment is a no-op.
// ---------------------------------------------------------------------------

export const confirmProPayment = authWithQcIdClient
  .schema(confirmPaymentSchema.pick({ paymentId: true }))
  .action(async ({ parsedInput: { paymentId }, ctx: { qcId, telegramId } }) => {
    const paymentRef = firestore.doc(`subscriptionPayments/${paymentId}`);
    const snap = await paymentRef.get();
    if (!snap.exists) throw new Error("Payment not found");
    const payment = snap.data()!;

    if (payment.payerQcId !== qcId) throw new Error("Not your payment");
    if (payment.kind !== "pro") throw new Error("Not a Pro payment");
    if (payment.status === "verified") {
      return { success: true, alreadyVerified: true };
    }

    const expectedAmount = payment.amountTon as number;
    const memo = payment.memo as string;
    const found = await findIncomingPaymentByMemo(memo);
    if (!found) {
      return { success: false, pending: true };
    }
    if (found.amountTon < expectedAmount * (1 - PRICE_TOLERANCE)) {
      throw new Error(
        `Amount too low: received ${found.amountTon.toFixed(2)} TON, expected ${expectedAmount.toFixed(2)} TON`,
      );
    }

    const profileRef = firestore.doc(`socialProfiles/${qcId}`);
    const userRef = firestore.doc(`user/${qcId}`);
    await firestore.runTransaction(async (tx) => {
      const profile = await tx.get(profileRef);
      if (!profile.exists) throw new Error("Profile missing");
      // Stack: extend from the later of now / current expiry.
      const current = profile.get("proExpiresAt") as Timestamp | null;
      const fromMs = current && current.toMillis() > Date.now()
        ? current.toMillis()
        : Date.now();
      const newExpiry = Timestamp.fromMillis(
        fromMs + QC_PRO_DURATION_DAYS * 24 * 60 * 60 * 1000,
      );
      tx.update(profileRef, { proExpiresAt: newExpiry });
      // Store raw telegramId on the private user doc so the renewal-nudge
      // cron can deliver Telegram pushes without exposing it in the public
      // socialProfiles read scope. lastRenewalNudgeAt resets on every renew.
      tx.set(
        userRef,
        {
          proTelegramId: telegramId,
          proExpiresAt: newExpiry,
          lastRenewalNudgeAt: null,
        },
        { merge: true },
      );
      tx.update(paymentRef, {
        status: "verified",
        txHash: found.txHash,
        verifiedAt: FieldValue.serverTimestamp(),
      });
    });

    return { success: true, alreadyVerified: false };
  });

// ---------------------------------------------------------------------------
// setAutoRenew — toggle silent client-side renewal on the user's private doc.
// The flag itself doesn't authorize a charge; auto-renew triggers only when
// the user opens the app inside the renewal window, the wallet's encrypted
// mnemonic is in IndexedDB, and the renewal flow runs without biometric
// prompt (since the original first purchase already authorized this profile
// to renew silently). Falls back to manual if the user never opens the app
// within the window.
// ---------------------------------------------------------------------------

const setAutoRenewSchema = z.object({ enabled: z.boolean() });

export const setAutoRenew = authWithQcIdClient
  .schema(setAutoRenewSchema)
  .action(async ({ parsedInput: { enabled }, ctx: { qcId, telegramId } }) => {
    const userRef = firestore.doc(`user/${qcId}`);
    await userRef.set(
      {
        autoRenew: enabled,
        // Make sure proTelegramId is on the doc so the renewal nudge cron
        // can reach the user even if they're toggling without renewing.
        proTelegramId: telegramId,
      },
      { merge: true },
    );
    return { success: true };
  });

/**
 * markAutoRenewAttempted — client calls this right before kicking off a
 * silent renewal so the cron doesn't re-page the user mid-flow. Cooldown is
 * 6 hours so a failed attempt unblocks itself the next day.
 */
export const markAutoRenewAttempted = authWithQcIdClient.action(
  async ({ ctx: { qcId } }) => {
    await firestore.doc(`user/${qcId}`).set(
      { lastAutoRenewAttemptAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { success: true };
  },
);

// ---------------------------------------------------------------------------
// quotePostUnlock — pay-per-post. Reader-side action that creates a payment
// doc with target post coords. Same memo-based verification flow.
// ---------------------------------------------------------------------------

export const quotePostUnlock = authWithQcIdClient
  .schema(quotePostUnlockSchema)
  .action(async ({ parsedInput: { authorQcId, postId }, ctx: { qcId } }) => {
    if (authorQcId === qcId) {
      throw new Error("You don't need to unlock your own posts");
    }
    const postRef = firestore.doc(
      `socialProfiles/${authorQcId}/posts/${postId}`,
    );
    const postSnap = await postRef.get();
    if (!postSnap.exists) throw new Error("Post not found");

    const gated = postSnap.get("gated") as boolean;
    const priceTon = postSnap.get("unlockPriceTon") as number | null;
    if (!gated || !priceTon || priceTon <= 0) {
      throw new Error("This post is not gated");
    }

    // Already unlocked? short-circuit.
    const unlockRef = postRef.collection("unlocks").doc(qcId);
    const unlockSnap = await unlockRef.get();
    if (unlockSnap.exists) {
      return { alreadyUnlocked: true as const };
    }

    const tonPrice = await fetchTonPrice();
    const amountUsd = tonPrice > 0 ? priceTon * tonPrice : 0;
    const memo = generateMemo("ul");
    const recipient = Address.parse(PLATFORM_WALLET_ADDRESS).toString({
      bounceable: false,
    });

    const paymentRef = firestore.collection("subscriptionPayments").doc();
    await paymentRef.set({
      payerQcId: qcId,
      kind: "unlock",
      amountTon: priceTon,
      amountUsd,
      targetAuthorQcId: authorQcId,
      targetPostId: postId,
      memo,
      status: "pending",
      txHash: null,
      createdAt: FieldValue.serverTimestamp(),
      verifiedAt: null,
      expiresAt: Timestamp.fromMillis(Date.now() + PAYMENT_TTL_MS),
    });

    return {
      alreadyUnlocked: false as const,
      paymentId: paymentRef.id,
      amountTon: priceTon,
      amountUsd,
      memo,
      recipient,
    };
  });

// ---------------------------------------------------------------------------
// confirmPostUnlock — verify tx then write the unlock receipt under the
// gated post.
// ---------------------------------------------------------------------------

export const confirmPostUnlock = authWithQcIdClient
  .schema(confirmPaymentSchema.pick({ paymentId: true }))
  .action(async ({ parsedInput: { paymentId }, ctx: { qcId } }) => {
    const paymentRef = firestore.doc(`subscriptionPayments/${paymentId}`);
    const snap = await paymentRef.get();
    if (!snap.exists) throw new Error("Payment not found");
    const payment = snap.data()!;

    if (payment.payerQcId !== qcId) throw new Error("Not your payment");
    if (payment.kind !== "unlock") throw new Error("Not an unlock payment");
    if (payment.status === "verified") {
      return { success: true, alreadyVerified: true };
    }

    const expectedAmount = payment.amountTon as number;
    const memo = payment.memo as string;
    const targetAuthorQcId = payment.targetAuthorQcId as string;
    const targetPostId = payment.targetPostId as string;

    const found = await findIncomingPaymentByMemo(memo);
    if (!found) {
      return { success: false, pending: true };
    }
    if (found.amountTon < expectedAmount * (1 - PRICE_TOLERANCE)) {
      throw new Error(
        `Amount too low: received ${found.amountTon.toFixed(2)} TON, expected ${expectedAmount.toFixed(2)} TON`,
      );
    }

    const unlockRef = firestore.doc(
      `socialProfiles/${targetAuthorQcId}/posts/${targetPostId}/unlocks/${qcId}`,
    );
    // Creator share is computed off the on-chain amount (defends against
    // overpayment edge cases) and pushed onto the creator's earnings ledger.
    // Platform share stays in the platform wallet — payout to creators is
    // handled by an offline admin tool (see scripts/process-payouts.ts).
    const creatorShareTon = found.amountTon * CREATOR_REVSHARE;
    const earningsRef = firestore.doc(
      `creatorEarnings/${targetAuthorQcId}`,
    );
    const earningEventRef = earningsRef.collection("events").doc();

    await firestore.runTransaction(async (tx) => {
      tx.set(unlockRef, {
        readerQcId: qcId,
        amountTon: found.amountTon,
        txHash: found.txHash,
        unlockedAt: FieldValue.serverTimestamp(),
      });
      tx.update(paymentRef, {
        status: "verified",
        txHash: found.txHash,
        verifiedAt: FieldValue.serverTimestamp(),
      });
      tx.set(
        earningsRef,
        {
          creatorQcId: targetAuthorQcId,
          totalEarnedTon: FieldValue.increment(creatorShareTon),
          pendingTon: FieldValue.increment(creatorShareTon),
          paidOutTon: FieldValue.increment(0), // ensure field exists
          lastEarnedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.set(earningEventRef, {
        kind: "unlock",
        amountTon: creatorShareTon,
        postId: targetPostId,
        payerQcId: qcId,
        sourceTxHash: found.txHash,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    await bumpAffinity(qcId, targetAuthorQcId, "unlock");
    return { success: true, alreadyVerified: false };
  });

// ---------------------------------------------------------------------------
// requestCreatorPayout — creator submits a withdrawal request for their
// pending balance to a TON address. We snapshot the requested amount and
// reset pending → 0 atomically; an offline admin tool processes the payout
// from the platform wallet and marks the request as paid. Minimum payout
// guards against tiny payouts whose tx fee would dwarf the amount.
// ---------------------------------------------------------------------------

const requestPayoutSchema = z.object({
  destination: z.string().min(1),
});

export const requestCreatorPayout = authWithQcIdClient
  .schema(requestPayoutSchema)
  .action(async ({ parsedInput: { destination }, ctx: { qcId } }) => {
    let parsed: string;
    try {
      parsed = Address.parse(destination).toString({ bounceable: false });
    } catch {
      throw new Error("Invalid TON address");
    }

    const earningsRef = firestore.doc(`creatorEarnings/${qcId}`);
    const requestRef = firestore.collection("creatorPayoutRequests").doc();

    return firestore.runTransaction(async (tx) => {
      const snap = await tx.get(earningsRef);
      if (!snap.exists) {
        throw new Error("No earnings yet");
      }
      const pending = (snap.get("pendingTon") as number) ?? 0;
      if (pending < PAYOUT_MIN_TON) {
        throw new Error(`Minimum payout is ${PAYOUT_MIN_TON} TON`);
      }

      tx.set(requestRef, {
        creatorQcId: qcId,
        amountTon: pending,
        destination: parsed,
        status: "pending",
        requestedAt: FieldValue.serverTimestamp(),
        paidAt: null,
        payoutTxHash: null,
      });
      tx.update(earningsRef, {
        pendingTon: 0,
        lastPayoutRequestedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, requestId: requestRef.id, amountTon: pending };
    });
  });

// ---------------------------------------------------------------------------
// setPostGate — author toggles their own post's paywall. Pro-only. Replies
// cannot be gated.
// ---------------------------------------------------------------------------

export const setPostGate = authWithQcIdClient
  .schema(setPostGateSchema)
  .action(async ({ parsedInput: { postId, priceTon }, ctx: { qcId } }) => {
    const profileRef = firestore.doc(`socialProfiles/${qcId}`);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      throw new Error("Set up your social profile first");
    }
    const proExpiresAt = profileSnap.get("proExpiresAt") as Timestamp | null;
    const isPro = proExpiresAt != null && proExpiresAt.toMillis() > Date.now();
    if (!isPro) {
      throw new Error("QC Pro is required to gate posts");
    }

    const postRef = profileRef.collection("posts").doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) throw new Error("Post not found");
    if (postSnap.get("parentPostId")) {
      throw new Error("Replies cannot be gated");
    }

    if (priceTon === null) {
      await postRef.update({ gated: false, unlockPriceTon: null });
    } else {
      await postRef.update({ gated: true, unlockPriceTon: priceTon });
    }
    return { success: true };
  });
