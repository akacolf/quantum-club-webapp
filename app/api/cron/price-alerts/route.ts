import { NextRequest, NextResponse } from "next/server";
import { firestore as db } from "@/app/(firebase)/server";
import { sendPriceAlertNotification } from "@/lib/notifications";
import { env } from "@/env";

// CRON secret for Vercel cron jobs
const CRON_SECRET = env.CRON_SECRET;

interface PriceData {
  [symbol: string]: {
    usd: number;
  };
}

// Fetch prices: TON from TonAPI, others from DeFiLlama
async function fetchPrices(): Promise<PriceData> {
  try {
    // TON price from TonAPI (server-side, uses TONAPI_KEY)
    let tonPrice = 0;
    try {
      const { getTonApiClient } = await import("@/lib/ton-api");
      const client = getTonApiClient();
      const data = await client.rates.getRates({ tokens: ["ton"], currencies: ["usd"] });
      // TonAPI returns the key as uppercase "TON"
      const rates = data.rates as unknown as Record<string, { prices?: Record<string, number> }>;
      tonPrice = rates?.TON?.prices?.USD ?? rates?.ton?.prices?.USD ?? 0;
    } catch { /* fallback below */ }

    // Multi-chain prices from DeFiLlama
    const { fetchAllPrices } = await import("@/lib/price-api");
    const prices = await fetchAllPrices();

    return {
      TON: { usd: tonPrice || prices.ton || 0 },
      BTC: { usd: prices.btc || 0 },
      ETH: { usd: prices.eth || 0 },
      SOL: { usd: prices.sol || 0 },
      TRX: { usd: prices.trx || 0 },
    };
  } catch (error) {
    console.error("Failed to fetch prices:", error);
    return {};
  }
}

// GET endpoint for cron job
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Always require CRON_SECRET authentication
    if (!CRON_SECRET) {
      console.error("CRON_SECRET environment variable not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      // Log unauthorized attempts for monitoring
      console.warn("Unauthorized price-alerts/check attempt from:", request.headers.get("x-forwarded-for") || "unknown");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch current prices
    const prices = await fetchPrices();
    if (Object.keys(prices).length === 0) {
      return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
    }

    // Fetch all untriggered alerts
    const alertsSnapshot = await db
      .collection("priceAlerts")
      .where("triggered", "==", false)
      .get();

    if (alertsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No active alerts",
        processed: 0,
      });
    }

    let triggeredCount = 0;
    let notifiedCount = 0;
    const batch = db.batch();

    for (const doc of alertsSnapshot.docs) {
      const alert = doc.data();
      const currentPrice = prices[alert.symbol]?.usd;

      if (!currentPrice) continue;

      const shouldTrigger =
        (alert.direction === "above" && currentPrice >= alert.targetPrice) ||
        (alert.direction === "below" && currentPrice <= alert.targetPrice);

      if (shouldTrigger) {
        triggeredCount++;

        // Send Telegram notification using centralized notification service
        if (!alert.telegramId) {
          console.warn(`Alert ${doc.id} missing telegramId, skipping`);
          continue;
        }

        const result = await sendPriceAlertNotification(alert.telegramId, {
          symbol: alert.symbol,
          direction: alert.direction,
          targetPrice: alert.targetPrice,
          currentPrice: currentPrice,
        });

        if (result.success) {
          notifiedCount++;
          // Only mark as triggered if notification was sent successfully
          batch.update(doc.ref, {
            triggered: true,
            notified: true,
            triggeredAt: Date.now(),
            triggeredPrice: currentPrice,
          });
        } else {
          // Notification failed — don't mark as triggered so it retries next run
          console.warn(`Failed to notify alert ${doc.id}, will retry next run`);
        }
      }
    }

    // Commit batch updates
    if (triggeredCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      prices,
      alertsChecked: alertsSnapshot.size,
      triggeredCount,
      notifiedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Price alert check error:", error);
    return NextResponse.json(
      { error: "Failed to check price alerts" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

// POST endpoint can also trigger the check (for testing)
export async function POST(request: NextRequest) {
  return GET(request);
}
