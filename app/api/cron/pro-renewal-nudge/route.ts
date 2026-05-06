import { NextRequest, NextResponse, connection } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { firestore } from "@/app/(firebase)/server";
import { sendNotification } from "@/lib/notifications";
import { env } from "@/env";

const CRON_SECRET = env.CRON_SECRET;
const NUDGE_WINDOW_DAYS = 3;
const NUDGE_COOLDOWN_HOURS = 24;

/**
 * Renewal nudge cron — pushes a Telegram notification to QC Pro members
 * whose membership expires in the next 3 days. Cooldown of 24 hours so
 * we don't double-prompt within a single day if the cron runs hourly.
 */
export async function GET(request: NextRequest) {
  await connection();

  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const windowEnd = now + NUDGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const cooldownThreshold = now - NUDGE_COOLDOWN_HOURS * 60 * 60 * 1000;

  // proExpiresAt copy lives on the user doc; range query needs a single
  // composite index that Firestore auto-creates from the inequality.
  const usersSnap = await firestore
    .collection("user")
    .where("proExpiresAt", ">=", Timestamp.fromMillis(now))
    .where("proExpiresAt", "<=", Timestamp.fromMillis(windowEnd))
    .get();

  let notified = 0;
  let skipped = 0;
  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    const telegramId = data.proTelegramId as string | undefined;
    if (!telegramId) {
      skipped++;
      continue;
    }
    const lastNudge = data.lastRenewalNudgeAt as Timestamp | null | undefined;
    if (lastNudge && lastNudge.toMillis() > cooldownThreshold) {
      skipped++;
      continue;
    }

    const expiry = data.proExpiresAt as Timestamp;
    const daysLeft = Math.max(
      1,
      Math.ceil((expiry.toMillis() - now) / (24 * 60 * 60 * 1000)),
    );
    const message =
      `<b>QC Pro renewal coming up</b>\n\n` +
      `Your membership expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. ` +
      `Renew anytime to keep your verified badge, higher AI limits, and gated posting.\n\n` +
      `Open Quantum Club → QC Social → 👑 to renew.`;

    const result = await sendNotification(telegramId, message);
    if (result.success) {
      notified++;
      await docSnap.ref.update({
        lastRenewalNudgeAt: Timestamp.fromMillis(now),
      });
    }
  }

  return NextResponse.json({
    success: true,
    candidates: usersSnap.size,
    notified,
    skipped,
  });
}
