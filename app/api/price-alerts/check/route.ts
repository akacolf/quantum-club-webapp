import { NextRequest, NextResponse } from "next/server";
import { firestore as db } from "@/app/(firebase)/server";

// Telegram Bot API Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

interface PriceData {
  [symbol: string]: {
    usd: number;
  };
}

// Fetch prices from CoinGecko
async function fetchPrices(): Promise<PriceData> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,bitcoin,ethereum,solana,tron&vs_currencies=usd",
      { next: { revalidate: 0 } }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      TON: { usd: data["the-open-network"]?.usd || 0 },
      BTC: { usd: data["bitcoin"]?.usd || 0 },
      ETH: { usd: data["ethereum"]?.usd || 0 },
      SOL: { usd: data["solana"]?.usd || 0 },
      TRX: { usd: data["tron"]?.usd || 0 },
    };
  } catch (error) {
    console.error("Failed to fetch prices:", error);
    return {};
  }
}

// Send Telegram notification
async function sendTelegramNotification(
  telegramId: string,
  message: string
): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram API error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return false;
  }
}

// GET endpoint for cron job
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
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

        // Update alert as triggered
        batch.update(doc.ref, {
          triggered: true,
          triggeredAt: Date.now(),
          triggeredPrice: currentPrice,
        });

        // Send Telegram notification
        const emoji = alert.direction === "above" ? "📈" : "📉";
        const message =
          `${emoji} <b>Price Alert Triggered!</b>\n\n` +
          `<b>${alert.symbol}</b> is now ${alert.direction === "above" ? "above" : "below"} your target.\n\n` +
          `🎯 Target: $${alert.targetPrice.toFixed(2)}\n` +
          `💵 Current: $${currentPrice.toFixed(2)}\n\n` +
          `<i>Open Quantum Club wallet to manage your alerts.</i>`;

        const sent = await sendTelegramNotification(alert.telegramId, message);
        if (sent) {
          notifiedCount++;
          batch.update(doc.ref, { notified: true });
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

// POST endpoint can also trigger the check (for testing)
export async function POST(request: NextRequest) {
  return GET(request);
}
