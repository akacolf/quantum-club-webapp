// Server-side intent resolver. Telegram deep-link `intent_<id>` lands here
// (via Login.tsx deep-link router). We look up the bot-created intent doc,
// validate it's pending + unexpired, mark it consumed, then redirect to the
// matching existing UI (trade page for an "ape" intent).
//
// The intent doc is created by `lib/bot/commands/ape.ts` with shape:
//   { type: "ape", jettonAddress, fromTelegramId, chatId, status, expiresAt }

import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { firestore } from "@/app/(firebase)/server";

interface PageProps {
  params: Promise<{ intentId: string }>;
}

export default async function IntentResolverPage({ params }: PageProps) {
  const { intentId } = await params;

  const ref = firestore.collection("botIntents").doc(intentId);
  const snap = await ref.get();

  if (!snap.exists) {
    redirect("/home?intent=missing");
  }

  const data = snap.data() as {
    type?: string;
    jettonAddress?: string;
    status?: string;
    expiresAt?: Timestamp;
  };

  // Expired?
  const expired =
    data.expiresAt instanceof Timestamp
      ? data.expiresAt.toMillis() < Date.now()
      : false;
  if (expired) {
    redirect("/home?intent=expired");
  }

  // Already consumed?
  if (data.status === "consumed") {
    redirect("/home?intent=used");
  }

  // Mark consumed before redirect — idempotent, prevents the same link being
  // reused. We don't bind to a specific Firebase auth UID here because the
  // bot creates the intent before the user authenticates in the Mini App;
  // the binding lives in `fromTelegramId` for audit, not gating.
  await ref.set({ status: "consumed", consumedAt: Timestamp.now() }, { merge: true });

  if (data.type === "ape" && data.jettonAddress) {
    redirect(`/ecosystem/trade/${data.jettonAddress}`);
  }

  // Unknown intent type — fall back to home.
  redirect("/home");
}
