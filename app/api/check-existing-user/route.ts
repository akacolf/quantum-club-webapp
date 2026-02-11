import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/app/(firebase)/server";

export async function POST(request: NextRequest) {
  try {
    const { email, qcId } = await request.json();

    // Check by email
    if (email) {
      const snapshot = await firestore
        .collection("user")
        .where("email", "==", email)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        return NextResponse.json({ exists: true });
      }
    }

    // Check by QC ID (encrypted Telegram ID)
    if (qcId) {
      const doc = await firestore.collection("user").doc(qcId).get();
      if (doc.exists) {
        return NextResponse.json({ exists: true });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Check existing user error:", error);
    return NextResponse.json({ exists: false });
  }
}
