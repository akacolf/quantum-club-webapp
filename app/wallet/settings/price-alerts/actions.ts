"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";

// ---------------------------------------------------------------------------
// createPriceAlert — authenticated
// ---------------------------------------------------------------------------

const createAlertSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  targetPrice: z.number().positive("Target price must be a positive number"),
  direction: z.enum(["above", "below"], {
    error: "Direction must be 'above' or 'below'",
  }),
});

export const createPriceAlert = authActionClient
  .schema(createAlertSchema)
  .action(async ({ parsedInput: { symbol, targetPrice, direction }, ctx: { session } }) => {
    const telegramId = String(session.user.telegramId);

    // Limit alerts per user (max 10)
    const existingAlerts = await firestore
      .collection("priceAlerts")
      .where("telegramId", "==", telegramId)
      .where("triggered", "==", false)
      .get();

    if (existingAlerts.size >= 10) {
      throw new Error("Maximum 10 active alerts allowed. Please delete some alerts first.");
    }

    const newAlert = {
      telegramId,
      symbol: symbol.toUpperCase(),
      targetPrice,
      direction,
      createdAt: Date.now(),
      triggered: false,
      notified: false,
    };

    const docRef = await firestore.collection("priceAlerts").add(newAlert);

    return {
      success: true,
      alert: { id: docRef.id, ...newAlert },
    };
  });

// ---------------------------------------------------------------------------
// deletePriceAlert — authenticated
// ---------------------------------------------------------------------------

const deleteAlertSchema = z.object({
  alertId: z.string().min(1, "alertId is required"),
});

export const deletePriceAlert = authActionClient
  .schema(deleteAlertSchema)
  .action(async ({ parsedInput: { alertId }, ctx: { session } }) => {
    const telegramId = String(session.user.telegramId);

    const alertDoc = await firestore.collection("priceAlerts").doc(alertId).get();
    if (!alertDoc.exists) {
      throw new Error("Alert not found");
    }

    const alertData = alertDoc.data();
    if (alertData?.telegramId !== telegramId) {
      throw new Error("Unauthorized");
    }

    await firestore.collection("priceAlerts").doc(alertId).delete();

    return { success: true };
  });
