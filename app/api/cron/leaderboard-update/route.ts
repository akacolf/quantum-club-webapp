import { NextRequest, NextResponse, connection } from "next/server";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  await connection();
  try {
    if (!env.CRON_SECRET) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usersSnapshot = await adminDb
      .collection("userRanks")
      .orderBy("QuantAmount", "desc")
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({ message: "No users to rank" }, { status: 200 });
    }

    // Backfill pass — for any rank doc missing qcUsername or proExpiresAtMs
    // (added in May 2026 to drive verified-badge tones on the leaderboard),
    // pull the canonical values from user/{qcId} and socialProfiles/{qcId}.
    // Idempotent: rows that already have both fields are skipped, so this
    // decays to zero extra reads once everyone is migrated.
    interface BackfillEntry {
      qcUsername: string | null;
      proExpiresAtMs: number | null;
    }
    const missingIds: string[] = [];
    for (const userDoc of usersSnapshot.docs) {
      const data = userDoc.data();
      if (data.qcUsername === undefined || data.proExpiresAtMs === undefined) {
        missingIds.push(userDoc.id);
      }
    }

    const backfill = new Map<string, BackfillEntry>();
    if (missingIds.length > 0) {
      const READ_CHUNK = 50;
      for (let i = 0; i < missingIds.length; i += READ_CHUNK) {
        const chunk = missingIds.slice(i, i + READ_CHUNK);
        const [userSnaps, socialSnaps] = await Promise.all([
          adminDb.getAll(...chunk.map((id) => adminDb.doc(`user/${id}`))),
          adminDb.getAll(...chunk.map((id) => adminDb.doc(`socialProfiles/${id}`))),
        ]);
        chunk.forEach((id, j) => {
          const qcUsername =
            (userSnaps[j].data()?.qcUsername as string | undefined) ?? null;
          const expires = socialSnaps[j].data()?.proExpiresAt as
            | { toMillis(): number }
            | null
            | undefined;
          backfill.set(id, {
            qcUsername,
            proExpiresAtMs: expires != null ? expires.toMillis() : null,
          });
        });
      }
    }

    // Firestore batches are limited to 500 operations
    const BATCH_LIMIT = 500;
    let rank = 1;
    let batch = adminDb.batch();
    let opsInBatch = 0;

    for (const userDoc of usersSnapshot.docs) {
      const update: Record<string, unknown> = { rank };
      const extra = backfill.get(userDoc.id);
      if (extra) {
        update.qcUsername = extra.qcUsername;
        update.proExpiresAtMs = extra.proExpiresAtMs;
      }
      batch.update(userDoc.ref, update);
      rank++;
      opsInBatch++;

      if (opsInBatch >= BATCH_LIMIT) {
        await batch.commit();
        batch = adminDb.batch();
        opsInBatch = 0;
      }
    }

    if (opsInBatch > 0) {
      await batch.commit();
    }

    return NextResponse.json(
      {
        message: "User ranks have been updated successfully",
        usersRanked: usersSnapshot.size,
        backfilled: backfill.size,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Leaderboard update failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;