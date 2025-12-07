const SDK_AUTH_TOKEN = "eyJhcHBfbmFtZSI6InFudG1fY2x1YiIsImFwcF91cmwiOiJodHRwczovL3QubWUvUXVhbnR1bUNsdWJCb3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly9xdWFudHVtY2x1Yi5zcGFjZS8ifQ==!WjIA5nO87o5qYCowGzsEH+ip9PqI9jDgAiwWgAmsFLQ=";
const APP_NAME = "qntm_club";

let isInitialized = false;

/**
 * Initialize Telegram Analytics (no-op, using direct API calls)
 * The SDK has issues with undefined WebView, so we use direct API calls
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
function getTelegramUser(): { userId: number; isPremium: boolean; platform: string; locale: string } | null {
  if (typeof window === "undefined") return null;

  const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number; is_premium?: boolean; language_code?: string } }; platform?: string } } }).Telegram?.WebApp;
  if (!tg?.initDataUnsafe?.user) return null;

  return {
    userId: tg.initDataUnsafe.user.id || 0,
    isPremium: tg.initDataUnsafe.user.is_premium || false,
    platform: tg.platform || "unknown",
    locale: tg.initDataUnsafe.user.language_code || "en",
  };
}

interface EventPayload {
  event_name: string;
  session_id: string;
  user_id: number;
  app_name: string;
  is_premium?: boolean;
  platform?: string;
  locale?: string;
  client_timestamp?: string;
  is_success?: boolean;
  error_message?: string;
  error_code?: number;
  wallet_address?: string;
  wallet_type?: string;
  from?: string;
  messages?: { address: string; amount: string }[];
  custom_data?: Record<string, unknown>;
}

/**
 * Send event to Telegram Analytics API
 * Returns true if event was recorded (status 201)
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
    customData?: Record<string, unknown>;
  }
): Promise<boolean> {
  const user = getTelegramUser();
  if (!user) {
    console.warn("[TelegramAnalytics] No Telegram user found, skipping event");
    return false;
  }

  const payload: EventPayload[] = [{
    event_name: eventName,
    session_id: getSessionId(),
    user_id: user.userId,
    app_name: APP_NAME,
    is_premium: user.isPremium,
    platform: user.platform,
    locale: user.locale,
    client_timestamp: Date.now().toString(),
    ...(options?.isSuccess !== undefined && { is_success: options.isSuccess }),
    ...(options?.errorMessage && { error_message: options.errorMessage }),
    ...(options?.errorCode && { error_code: options.errorCode }),
    ...(options?.walletAddress && { wallet_address: options.walletAddress }),
    ...(options?.walletType && { wallet_type: options.walletType }),
    ...(options?.from && { from: options.from }),
    ...(options?.messages && { messages: options.messages }),
    ...(options?.customData && { custom_data: options.customData }),
  }];

  try {
    const response = await fetch("https://tganalytics.xyz/events", {
      method: "POST",
      headers: {
        "TGA-Auth-Token": SDK_AUTH_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      console.log(`[TelegramAnalytics] Event "${eventName}" recorded successfully`);
      return true;
    } else {
      const data = await response.json().catch(() => ({}));
      console.warn(`[TelegramAnalytics] Event "${eventName}" failed:`, response.status, data);
      return false;
    }
  } catch (error) {
    console.error(`[TelegramAnalytics] Failed to send event "${eventName}":`, error);
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

  // Custom events
  walletCreated: (walletAddress: string) =>
    sendAnalyticsEvent("wallet-created", {
      isSuccess: true,
      walletAddress,
      customData: { source: "quantum_wallet" }
    }),

  walletImported: (walletAddress: string) =>
    sendAnalyticsEvent("wallet-imported", {
      isSuccess: true,
      walletAddress,
      customData: { source: "quantum_wallet" }
    }),
};

// Named exports for tree-shaking
const telegramAnalyticsExports = { initTelegramAnalytics, sendAnalyticsEvent, analyticsEvents };
export default telegramAnalyticsExports;
