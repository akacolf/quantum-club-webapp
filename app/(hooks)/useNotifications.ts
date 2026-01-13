/**
 * Hook for sending push notifications to users via Telegram Bot API
 * 
 * @module hooks/useNotifications
 */

import { useCallback } from "react";
import { useGameContext } from "@/app/(contexts)/MiningContext";

interface TransactionNotificationData {
  txType?: "send" | "receive" | "swap" | "stake" | "unstake";
  amount: string;
  symbol: string;
  txHash?: string;
  toAddress?: string;
  fromAddress?: string;
  usdValue?: string;
}

interface TradeNotificationData {
  tradeType: "buy" | "sell";
  tokenSymbol: string;
  tokenAmount: string;
  tonAmount: string;
  success?: boolean;
  txHash?: string;
  pricePerToken?: string;
}

interface SystemNotificationData {
  title: string;
  body: string;
}

export function useNotifications() {
  const { telegramId } = useGameContext();
  
  const sendNotification = useCallback(async (
    type: string,
    data: TransactionNotificationData | TradeNotificationData | SystemNotificationData
  ): Promise<boolean> => {
    if (!telegramId) {
      console.warn("[useNotifications] No telegramId available");
      return false;
    }
    
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: telegramId.toString(),
          type,
          data,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[useNotifications] Failed:", errorData);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("[useNotifications] Error:", error);
      return false;
    }
  }, [telegramId]);
  
  /**
   * Send a transaction success notification
   */
  const notifyTransactionSuccess = useCallback((
    data: TransactionNotificationData
  ) => {
    return sendNotification("tx_success", data);
  }, [sendNotification]);
  
  /**
   * Send a transaction failure notification
   */
  const notifyTransactionFailed = useCallback((
    data: TransactionNotificationData
  ) => {
    return sendNotification("tx_failed", data);
  }, [sendNotification]);
  
  /**
   * Send a trade notification
   */
  const notifyTrade = useCallback((
    data: TradeNotificationData
  ) => {
    return sendNotification("trade", data);
  }, [sendNotification]);
  
  /**
   * Send a system notification
   */
  const notifySystem = useCallback((
    title: string,
    body: string
  ) => {
    return sendNotification("system", { title, body });
  }, [sendNotification]);
  
  return {
    sendNotification,
    notifyTransactionSuccess,
    notifyTransactionFailed,
    notifyTrade,
    notifySystem,
  };
}
