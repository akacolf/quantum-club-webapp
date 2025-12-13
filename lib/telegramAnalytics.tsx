let isInitialized = false;

/**
 * Initialize Telegram Analytics
 */
export function initTelegramAnalytics(): void {
  if (isInitialized) return;
  isInitialized = true;
}

/**
 * Generate a UUID for session tracking
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Session ID persisted for the user session
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = typeof window !== "undefined"
      ? sessionStorage.getItem("tga_session_id") || generateUUID()
      : generateUUID();
    if (typeof window !== "undefined") {
      sessionStorage.setItem("tga_session_id", sessionId);
    }
  }
  return sessionId;
}

/**
 * Get Telegram user info from WebApp
 */
function getTelegramInfo(): { userId: number; isPremium: boolean; platform: string; locale: string } | null {
  if (typeof window === "undefined") return null;

  const tg = window.Telegram?.WebApp;
  if (!tg?.initDataUnsafe?.user?.id) return null;

  return {
    userId: tg.initDataUnsafe.user.id,
    isPremium: tg.initDataUnsafe.user.is_premium || false,
    platform: tg.platform || "unknown",
    locale: tg.initDataUnsafe.user.language_code || "en",
  };
}

/**
 * Send event via server-side API route
 * Returns true if event was recorded successfully
 */
export async function sendAnalyticsEvent(
  eventName: string,
  options?: {
    isSuccess?: boolean;
    errorMessage?: string;
    errorCode?: number;
    walletAddress?: string;
    walletType?: string;
    from?: string;
    messages?: { address: string; amount: string }[];
  }
): Promise<boolean> {
  const telegramInfo = getTelegramInfo();
  if (!telegramInfo) {
    console.warn("[Analytics] No Telegram user info, skipping event");
    return false;
  }

  try {
    const response = await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        userId: telegramInfo.userId,
        sessionId: getSessionId(),
        isPremium: telegramInfo.isPremium,
        platform: telegramInfo.platform,
        locale: telegramInfo.locale,
        options,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log(`[Analytics] Event "${eventName}" recorded`);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(`[Analytics] Failed to send event "${eventName}":`, error);
    return false;
  }
}

// Pre-defined event helpers
export const analyticsEvents = {
  appInit: () => sendAnalyticsEvent("app-init"),

  connectionStarted: () => sendAnalyticsEvent("connection-started"),

  connectionCompleted: (walletAddress: string, walletType?: string) =>
    sendAnalyticsEvent("connection-completed", {
      isSuccess: true,
      walletAddress,
      walletType
    }),

  connectionError: (errorMessage: string, errorCode?: number) =>
    sendAnalyticsEvent("connection-error", {
      isSuccess: false,
      errorMessage,
      errorCode
    }),

  disconnection: () => sendAnalyticsEvent("disconnection"),

  transactionSentForSignature: (from: string, messages: { address: string; amount: string }[]) =>
    sendAnalyticsEvent("transaction-sent-for-signature", {
      from,
      messages
    }),

  transactionSigned: (from: string, messages: { address: string; amount: string }[]) =>
    sendAnalyticsEvent("transaction-signed", {
      isSuccess: true,
      from,
      messages
    }),

  transactionSigningFailed: (errorMessage: string, errorCode?: number) =>
    sendAnalyticsEvent("transaction-signing-failed", {
      isSuccess: false,
      errorMessage,
      errorCode
    }),

  walletCreated: (walletAddress: string) =>
    sendAnalyticsEvent("wallet-created", {
      isSuccess: true,
      walletAddress,
    }),

  walletImported: (walletAddress: string) =>
    sendAnalyticsEvent("wallet-imported", {
      isSuccess: true,
      walletAddress,
    }),
};

const telegramAnalyticsExports = { initTelegramAnalytics, sendAnalyticsEvent, analyticsEvents };
export default telegramAnalyticsExports;
