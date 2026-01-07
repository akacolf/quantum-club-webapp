import { NextRequest, NextResponse } from "next/server";
import { firestore as db } from "@/app/(firebase)/server";

export interface PriceAlert {
  id: string;
  telegramId: string;
  symbol: string;
  targetPrice: number;
  direction: "above" | "below";
  createdAt: number;
  triggered: boolean;
  notified: boolean;
}

// GET - Fetch user's alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) {
      return NextResponse.json({ error: "telegramId is required" }, { status: 400 });
    }

    const alertsRef = db.collection("priceAlerts").where("telegramId", "==", telegramId);
    const snapshot = await alertsRef.get();

    const alerts: PriceAlert[] = [];
    snapshot.forEach((doc) => {
      alerts.push({ id: doc.id, ...doc.data() } as PriceAlert);
    });

    // Sort by createdAt descending
    alerts.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

// POST - Create a new alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, symbol, targetPrice, direction } = body;

    if (!telegramId || !symbol || !targetPrice || !direction) {
      return NextResponse.json(
        { error: "Missing required fields: telegramId, symbol, targetPrice, direction" },
        { status: 400 }
      );
    }

    if (typeof targetPrice !== "number" || targetPrice <= 0) {
      return NextResponse.json({ error: "Invalid target price" }, { status: 400 });
    }

    if (!["above", "below"].includes(direction)) {
      return NextResponse.json({ error: "Direction must be 'above' or 'below'" }, { status: 400 });
    }

    // Limit alerts per user (max 10)
    const existingAlerts = await db
      .collection("priceAlerts")
      .where("telegramId", "==", telegramId)
      .where("triggered", "==", false)
      .get();

    if (existingAlerts.size >= 10) {
      return NextResponse.json(
        { error: "Maximum 10 active alerts allowed. Please delete some alerts first." },
        { status: 400 }
      );
    }

    const newAlert: Omit<PriceAlert, "id"> = {
      telegramId,
      symbol: symbol.toUpperCase(),
      targetPrice,
      direction,
      createdAt: Date.now(),
      triggered: false,
      notified: false,
    };

    const docRef = await db.collection("priceAlerts").add(newAlert);

    return NextResponse.json({
      success: true,
      alert: { id: docRef.id, ...newAlert },
    });
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}

// DELETE - Delete an alert
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get("alertId");
    const telegramId = searchParams.get("telegramId");

    if (!alertId || !telegramId) {
      return NextResponse.json({ error: "alertId and telegramId are required" }, { status: 400 });
    }

    // Verify ownership
    const alertDoc = await db.collection("priceAlerts").doc(alertId).get();
    if (!alertDoc.exists) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const alertData = alertDoc.data();
    if (alertData?.telegramId !== telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.collection("priceAlerts").doc(alertId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  }
}
