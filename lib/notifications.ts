/**
 * Telegram Push Notifications Utility
 *
 * Provides centralized notification sending through Telegram Bot API.
 * Used for price alerts, transaction confirmations, and other user notifications.
 *
 * @module lib/notifications
 */

import { env } from "@/env";

// Get bot token based on environment
function getBotToken(): string | undefined {
  if (process.env.NODE_ENV === "production") {
    return env.BOT_TOKEN;
  }
  return env.DEV_BOT_TOKEN || env.BOT_TOKEN;
}

interface NotificationResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

interface SendMessageOptions {
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableNotification?: boolean;
  disableWebPagePreview?: boolean;
  replyMarkup?: Record<string, unknown>;
}

/**
 * Send a Telegram notification to a user
 * 
 * @param telegramId - The user's Telegram chat ID
 * @param message - The message text (supports HTML formatting)
 * @param options - Optional message settings
 * @returns Promise with send result
 */
export async function sendNotification(
  telegramId: string | number,
  message: string,
  options: SendMessageOptions = {}
): Promise<NotificationResult> {
  const BOT_TOKEN = getBotToken();
  
  if (!BOT_TOKEN) {
    console.error("[notifications] BOT_TOKEN not configured");
    return { success: false, error: "BOT_TOKEN not configured" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramId.toString(),
          text: message,
          parse_mode: options.parseMode || "HTML",
          disable_notification: options.disableNotification || false,
          disable_web_page_preview: options.disableWebPagePreview !== false,
          ...(options.replyMarkup && { reply_markup: options.replyMarkup }),
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[notifications] Telegram API error:", errorData);
      return { 
        success: false, 
        error: errorData.description || "Unknown Telegram API error" 
      };
    }

    const data = await response.json();
    return { 
      success: true, 
      messageId: data.result?.message_id 
    };
  } catch (error) {
    console.error("[notifications] Failed to send notification:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Send a trade completion notification
 * 
 * @param telegramId - User's Telegram ID
 * @param params - Trade details
 */
export async function sendTradeNotification(
  telegramId: string | number,
  params: {
    type: "buy" | "sell";
    tokenSymbol: string;
    tokenAmount: string;
    tonAmount: string;
    success: boolean;
    txHash?: string;
    pricePerToken?: string;
  }
): Promise<NotificationResult> {
  const { type, tokenSymbol, tokenAmount, tonAmount, success, txHash, pricePerToken } = params;
  
  const statusText = success ? "Completed" : "Failed";
  const actionText = type === "buy" ? "Bought" : "Sold";

  let message = `<b>Trade ${statusText}</b>\n\n`;
  message += `${actionText} <b>${tokenAmount} ${tokenSymbol}</b>\n`;
  message += `For <b>${tonAmount} TON</b>\n`;

  if (pricePerToken) {
    message += `Price: ${pricePerToken} TON per token\n`;
  }
  
  if (txHash) {
    message += `\n<a href="https://tonviewer.com/transaction/${txHash}">View Transaction</a>`;
  }

  return sendNotification(telegramId, message);
}

/**
 * Format a crypto price with dynamic decimal precision. Prevents
 * small-denomination prices from being rendered as "$0.00" via toFixed(2).
 *   >= 1000 → no decimals       ($51,234)
 *   >= 1    → 2 decimals        ($5.12)
 *   >= 0.01 → 4 decimals        ($0.0342)
 *   < 0.01  → 6 decimals        ($0.000321)
 */
function formatCryptoPrice(price: number): string {
  if (!Number.isFinite(price) || price < 0) return "$0.00";
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

/**
 * Send a price alert notification
 *
 * @param telegramId - User's Telegram ID
 * @param params - Alert details
 */
export async function sendPriceAlertNotification(
  telegramId: string | number,
  params: {
    symbol: string;
    direction: "above" | "below";
    targetPrice: number;
    currentPrice: number;
  }
): Promise<NotificationResult> {
  const { symbol, direction, targetPrice, currentPrice } = params;

  // Percentage delta from the target price. For "above" alerts a positive
  // delta means the price has climbed that many % past the target; for
  // "below" alerts it means the price has dropped that many % past.
  const rawDelta =
    direction === "above"
      ? ((currentPrice - targetPrice) / targetPrice) * 100
      : ((targetPrice - currentPrice) / targetPrice) * 100;
  const deltaPct = Number.isFinite(rawDelta) ? Math.abs(rawDelta) : 0;
  const deltaLabel = direction === "above" ? "above target" : "below target";
  const directionVerb = direction === "above" ? "climbed above" : "dropped below";

  const message =
    `<b>Price Alert</b>\n\n` +
    `<b>${symbol}</b> just ${directionVerb} your target of <b>${formatCryptoPrice(targetPrice)}</b>.\n\n` +
    `Current price: <b>${formatCryptoPrice(currentPrice)}</b>\n` +
    `${deltaPct.toFixed(2)}% ${deltaLabel}\n\n` +
    `<i>Tap below to open Quantum Club and manage your alerts.</i>`;

  const botUsername = env.BOT_USERNAME || "QuantumClubBot";

  return sendNotification(telegramId, message, {
    replyMarkup: {
      inline_keyboard: [
        [
          {
            text: "Open Quantum Club",
            url: `https://t.me/${botUsername}/app?startapp=alerts`,
          },
        ],
      ],
    },
  });
}


