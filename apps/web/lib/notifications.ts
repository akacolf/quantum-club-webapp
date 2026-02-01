/**
 * Telegram Push Notifications Utility
 * 
 * Provides centralized notification sending through Telegram Bot API.
 * Used for price alerts, transaction confirmations, and other user notifications.
 * 
 * @module lib/notifications
 */

// Get bot token based on environment
function getBotToken(): string | undefined {
  if (process.env.NODE_ENV === "production") {
    return process.env.BOT_TOKEN;
  }
  return process.env.DEV_BOT_TOKEN || process.env.BOT_TOKEN;
}

/**
 * Notification message types for consistent formatting
 */
export type NotificationType = 
  | "price_alert"
  | "tx_success"
  | "tx_failed"
  | "trade_completed"
  | "stake_reward"
  | "referral_bonus"
  | "system";

interface NotificationResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

interface SendMessageOptions {
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableNotification?: boolean;
  disableWebPagePreview?: boolean;
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
 * Send a transaction confirmation notification
 * 
 * @param telegramId - User's Telegram ID
 * @param params - Transaction details
 */
export async function sendTransactionConfirmation(
  telegramId: string | number,
  params: {
    type: "send" | "receive" | "swap" | "stake" | "unstake" | "buy" | "sell";
    amount: string;
    symbol: string;
    txHash?: string;
    success: boolean;
    toAddress?: string;
    fromAddress?: string;
    usdValue?: string;
  }
): Promise<NotificationResult> {
  const { type, amount, symbol, txHash, success, toAddress, fromAddress, usdValue } = params;
  
  const emoji = success ? "✅" : "❌";
  const statusText = success ? "Confirmed" : "Failed";
  
  const typeLabels: Record<string, string> = {
    send: "Sent",
    receive: "Received",
    swap: "Swap",
    stake: "Staked",
    unstake: "Unstaked",
    buy: "Bought",
    sell: "Sold",
  };
  
  let message = `${emoji} <b>Transaction ${statusText}</b>\n\n`;
  message += `📝 <b>Type:</b> ${typeLabels[type] || type}\n`;
  message += `💰 <b>Amount:</b> ${amount} ${symbol}`;
  
  if (usdValue) {
    message += ` (~$${usdValue})`;
  }
  message += "\n";
  
  if (toAddress && type === "send") {
    const shortAddr = `${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`;
    message += `📤 <b>To:</b> <code>${shortAddr}</code>\n`;
  }
  
  if (fromAddress && type === "receive") {
    const shortAddr = `${fromAddress.slice(0, 6)}...${fromAddress.slice(-4)}`;
    message += `📥 <b>From:</b> <code>${shortAddr}</code>\n`;
  }
  
  if (txHash) {
    const shortHash = `${txHash.slice(0, 8)}...${txHash.slice(-6)}`;
    message += `🔗 <b>Hash:</b> <code>${shortHash}</code>\n`;
    message += `\n<a href="https://tonviewer.com/transaction/${txHash}">View on TON Viewer</a>`;
  }

  return sendNotification(telegramId, message);
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
  
  const emoji = success 
    ? (type === "buy" ? "🟢" : "🔴") 
    : "❌";
  const statusText = success ? "Completed" : "Failed";
  const actionText = type === "buy" ? "Bought" : "Sold";
  
  let message = `${emoji} <b>Trade ${statusText}</b>\n\n`;
  message += `📊 ${actionText} <b>${tokenAmount} ${tokenSymbol}</b>\n`;
  message += `💎 For <b>${tonAmount} TON</b>\n`;
  
  if (pricePerToken) {
    message += `📈 Price: ${pricePerToken} TON per token\n`;
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
  
  const emoji = direction === "above" ? "📈" : "📉";
  const directionText = direction === "above" ? "above" : "below";
  
  const message = 
    `${emoji} <b>Price Alert Triggered!</b>\n\n` +
    `<b>${symbol}</b> is now ${directionText} your target.\n\n` +
    `🎯 Target: $${targetPrice.toFixed(2)}\n` +
    `💵 Current: $${currentPrice.toFixed(2)}\n\n` +
    `<i>Open Quantum Club wallet to manage your alerts.</i>`;

  return sendNotification(telegramId, message);
}

/**
 * Send a staking reward notification
 * 
 * @param telegramId - User's Telegram ID  
 * @param params - Reward details
 */
export async function sendStakingRewardNotification(
  telegramId: string | number,
  params: {
    amount: string;
    symbol: string;
    pool: string;
    newTotal?: string;
  }
): Promise<NotificationResult> {
  const { amount, symbol, pool, newTotal } = params;
  
  let message = `🎉 <b>Staking Reward Received!</b>\n\n`;
  message += `💰 <b>+${amount} ${symbol}</b>\n`;
  message += `📊 Pool: ${pool}\n`;
  
  if (newTotal) {
    message += `\n💎 Total Staked: ${newTotal} ${symbol}`;
  }

  return sendNotification(telegramId, message);
}

/**
 * Send a referral bonus notification
 * 
 * @param telegramId - User's Telegram ID
 * @param params - Referral details  
 */
export async function sendReferralBonusNotification(
  telegramId: string | number,
  params: {
    amount: string;
    symbol: string;
    referralName?: string;
    tier?: number;
  }
): Promise<NotificationResult> {
  const { amount, symbol, referralName, tier } = params;
  
  let message = `🎁 <b>Referral Bonus Earned!</b>\n\n`;
  message += `💰 <b>+${amount} ${symbol}</b>\n`;
  
  if (referralName) {
    message += `👤 From: ${referralName}\n`;
  }
  
  if (tier) {
    message += `📊 Tier ${tier} commission\n`;
  }
  
  message += `\n<i>Invite more friends to earn more!</i>`;

  return sendNotification(telegramId, message);
}

/**
 * Send a system notification (announcements, updates, etc.)
 * 
 * @param telegramId - User's Telegram ID
 * @param title - Notification title
 * @param body - Notification body
 */
export async function sendSystemNotification(
  telegramId: string | number,
  title: string,
  body: string
): Promise<NotificationResult> {
  const message = `📢 <b>${title}</b>\n\n${body}`;
  return sendNotification(telegramId, message);
}

/**
 * Batch send notifications to multiple users
 * Implements rate limiting to avoid Telegram API limits (30 msg/sec)
 * 
 * @param notifications - Array of notifications to send
 * @param delayMs - Delay between messages (default 50ms for ~20 msg/sec)
 */
export async function batchSendNotifications(
  notifications: Array<{
    telegramId: string | number;
    message: string;
  }>,
  delayMs: number = 50
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    const result = await sendNotification(
      notification.telegramId,
      notification.message
    );
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return { sent, failed };
}
