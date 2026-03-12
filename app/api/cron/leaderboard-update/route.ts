import { NextRequest, NextResponse } from "next/server";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { env } from "@/env";

export async function GET(req: NextRequest) {
  try {
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

    for (const doc of usersSnapshot.docs) {
      const userId = doc.ref.path.split("/")[1];
      const userRankRef = adminDb.collection("userRanks").doc(userId);
      batch.update(userRankRef, { rank });
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
      { message: "User ranks have been updated successfully" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;