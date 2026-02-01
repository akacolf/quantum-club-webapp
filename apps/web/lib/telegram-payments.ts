/**
 * Telegram Stars Payment Integration
 * 
 * Uses Telegram Bot API for Stars payments without third-party payment processors.
 * Documentation: https://core.telegram.org/bots/api#payments
 */

export interface StarPaymentRequest {
  telegramId?: string;
  title: string;
  description: string;
  payload: string;  // Custom payload to identify the purchase
  priceInStars: number;
  photoUrl?: string;  // Optional product photo
}

export interface StarPaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

// Telegram Stars to USD conversion (approximate, Telegram sets the rate)
// As of 2024, 1 Star ≈ $0.02 USD
const STARS_TO_USD_RATE = 0.02;

// TON to USD rate will be fetched dynamically
export function convertTonToStars(tonAmount: number, tonPriceUsd: number): number {
  const usdValue = tonAmount * tonPriceUsd;
  const starsAmount = Math.ceil(usdValue / STARS_TO_USD_RATE);
  // Telegram requires minimum 1 star
  return Math.max(1, starsAmount);
}

export function convertStarsToUsd(starsAmount: number): number {
  return starsAmount * STARS_TO_USD_RATE;
}

/**
 * Create a Telegram Stars invoice link
 * This uses the Bot API to create an invoice that can be paid with Stars
 * Docs: https://core.telegram.org/bots/api#createinvoicelink
 */
export async function createStarsInvoice(
  botToken: string,
  request: StarPaymentRequest
): Promise<{ invoiceLink: string } | { error: string }> {
  try {
    const requestBody: Record<string, unknown> = {
      title: request.title,
      description: request.description,
      payload: request.payload,
      provider_token: "",  // Empty for Stars payments
      currency: "XTR",  // XTR is the currency code for Telegram Stars
      prices: [
        {
          label: request.title,
          amount: request.priceInStars,  // Stars don't use minor units
        }
      ],
    };

    // Add optional photo
    if (request.photoUrl) {
      requestBody.photo_url = request.photoUrl;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (data.ok && data.result) {
      return { invoiceLink: data.result };
    } else {
      return { error: data.description || "Failed to create invoice" };
    }
  } catch (error) {
    console.error("Error creating Stars invoice:", error);
    return { error: "Failed to create payment link" };
  }
}

/**
 * Send an invoice directly to the user in Telegram
 * Docs: https://core.telegram.org/bots/api#sendinvoice
 */
export async function sendStarsInvoice(
  botToken: string,
  chatId: string | number,
  request: StarPaymentRequest
): Promise<{ messageId: number } | { error: string }> {
  try {
    const requestBody: Record<string, unknown> = {
      chat_id: chatId,
      title: request.title,
      description: request.description,
      payload: request.payload,
      provider_token: "",  // Empty for Stars payments
      currency: "XTR",
      prices: [
        {
          label: request.title,
          amount: request.priceInStars,
        }
      ],
    };

    // Add optional photo
    if (request.photoUrl) {
      requestBody.photo_url = request.photoUrl;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendInvoice`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (data.ok && data.result) {
      return { messageId: data.result.message_id };
    } else {
      return { error: data.description || "Failed to send invoice" };
    }
  } catch (error) {
    console.error("Error sending Stars invoice:", error);
    return { error: "Failed to send invoice" };
  }
}

/**
 * Verify a successful payment using pre_checkout_query
 * This should be called from a webhook handler
 */
export async function answerPreCheckoutQuery(
  botToken: string,
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pre_checkout_query_id: preCheckoutQueryId,
          ok,
          error_message: errorMessage,
        }),
      }
    );

    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error("Error answering pre-checkout query:", error);
    return false;
  }
}

/**
 * Refund a Stars payment
 */
export async function refundStarsPayment(
  botToken: string,
  userId: string | number,
  telegramPaymentChargeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/refundStarPayment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          telegram_payment_charge_id: telegramPaymentChargeId,
        }),
      }
    );

    const data = await response.json();

    if (data.ok) {
      return { success: true };
    } else {
      return { success: false, error: data.description };
    }
  } catch (error) {
    console.error("Error refunding payment:", error);
    return { success: false, error: "Failed to process refund" };
  }
}
