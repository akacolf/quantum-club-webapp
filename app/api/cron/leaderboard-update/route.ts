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

    // Firestore batches are limited to 500 operations
    const BATCH_LIMIT = 500;
    let rank = 1;
    let batch = adminDb.batch();
    let opsInBatch = 0;

    for (const userDoc of usersSnapshot.docs) {
      batch.update(userDoc.ref, { rank });
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
      { message: "User ranks have been updated successfully", usersRanked: usersSnapshot.size },
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