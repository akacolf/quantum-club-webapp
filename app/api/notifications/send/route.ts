/**
 * POST /api/notifications/send
 * 
 * Sends a push notification to a user via Telegram.
 * Used for immediate transaction confirmations and other real-time notifications.
 * 
 * Body:
 *   telegramId: string - The user's Telegram ID
 *   type: string - Notification type (tx_success, tx_failed, trade, etc.)
 *   data: object - Type-specific notification data
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  sendTransactionConfirmation, 
  sendTradeNotification,
  sendSystemNotification 
} from "@/lib/notifications";

// Rate limiting map (in-memory, per instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // Max 10 notifications per user per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(telegramId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(telegramId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(telegramId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, type, data } = body;
    
    if (!telegramId) {
      return NextResponse.json(
        { error: "telegramId is required" },
        { status: 400 }
      );
    }
    
    if (!type) {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 }
      );
    }
    
    // Rate limiting
    if (!checkRateLimit(telegramId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
    
    let result;
    
    switch (type) {
      case "tx_success":
      case "tx_failed":
        if (!data?.amount || !data?.symbol) {
          return NextResponse.json(
            { error: "amount and symbol are required for transaction notifications" },
            { status: 400 }
          );
        }
        result = await sendTransactionConfirmation(telegramId, {
          type: data.txType || "send",
          amount: data.amount,
          symbol: data.symbol,
          txHash: data.txHash,
          success: type === "tx_success",
          toAddress: data.toAddress,
          fromAddress: data.fromAddress,
          usdValue: data.usdValue,
        });
        break;
        
      case "trade":
        if (!data?.tokenSymbol || !data?.tokenAmount || !data?.tonAmount) {
          return NextResponse.json(
            { error: "tokenSymbol, tokenAmount, and tonAmount are required for trade notifications" },
            { status: 400 }
          );
        }
        result = await sendTradeNotification(telegramId, {
          type: data.tradeType || "buy",
          tokenSymbol: data.tokenSymbol,
          tokenAmount: data.tokenAmount,
          tonAmount: data.tonAmount,
          success: data.success !== false,
          txHash: data.txHash,
          pricePerToken: data.pricePerToken,
        });
        break;
        
      case "system":
        if (!data?.title || !data?.body) {
          return NextResponse.json(
            { error: "title and body are required for system notifications" },
            { status: 400 }
          );
        }
        result = await sendSystemNotification(telegramId, data.title, data.body);
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 }
        );
    }
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send notification" },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error("[notifications/send] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
