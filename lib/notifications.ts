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
  
  const directionText = direction === "above" ? "above" : "below";

  const message =
    `<b>Price Alert Triggered!</b>\n\n` +
    `<b>${symbol}</b> is now ${directionText} your target.\n\n` +
    `Target: $${targetPrice.toFixed(2)}\n` +
    `Current: $${currentPrice.toFixed(2)}\n\n` +
    `<i>Open Quantum Club wallet to manage your alerts.</i>`;

  return sendNotification(telegramId, message);
}


