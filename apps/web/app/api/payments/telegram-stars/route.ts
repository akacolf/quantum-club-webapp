import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as db } from "@/app/(firebase)/server";
import { 
  createStarsInvoice, 
  sendStarsInvoice, 
  convertTonToStars,
  answerPreCheckoutQuery 
} from "@/lib/telegram-payments";

const BOT_TOKEN = process.env.BOT_TOKEN;

interface CreateInvoiceRequest {
  action: "create-invoice" | "send-invoice" | "pre-checkout" | "confirm-payment";
  telegramId: string;
  // For create-invoice and send-invoice
  title?: string;
  description?: string;
  payload?: string;
  tonAmount?: number;
  tonPriceUsd?: number;
  // For pre-checkout
  preCheckoutQueryId?: string;
  ok?: boolean;
  errorMessage?: string;
  // For confirm-payment
  paymentData?: {
    telegramPaymentChargeId: string;
    providerPaymentChargeId: string;
    totalAmount: number;
    invoicePayload: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await getSession();
    if (!session || !session.user?.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!BOT_TOKEN) {
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    const body: CreateInvoiceRequest = await request.json();
    const { action, telegramId } = body;

    // Verify telegramId matches session
    if (String(telegramId) !== String(session.user.telegramId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    switch (action) {
      case "create-invoice": {
        const { title, description, payload, tonAmount, tonPriceUsd } = body;

        if (!title || !description || !payload || !tonAmount || !tonPriceUsd) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const starsAmount = convertTonToStars(tonAmount, tonPriceUsd);

        const result = await createStarsInvoice(BOT_TOKEN, {
          telegramId,
          title,
          description,
          payload,
          priceInStars: starsAmount,
        });

        if ("error" in result) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Store pending payment in Firebase
        await db.collection("pending_star_payments").add({
          telegramId,
          payload,
          starsAmount,
          tonAmount,
          status: "pending",
          createdAt: Date.now(),
        });

        return NextResponse.json({
          success: true,
          invoiceLink: result.invoiceLink,
          starsAmount,
        });
      }

      case "send-invoice": {
        const { title, description, payload, tonAmount, tonPriceUsd } = body;

        if (!title || !description || !payload || !tonAmount || !tonPriceUsd) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const starsAmount = convertTonToStars(tonAmount, tonPriceUsd);

        const result = await sendStarsInvoice(BOT_TOKEN, telegramId, {
          telegramId,
          title,
          description,
          payload,
          priceInStars: starsAmount,
        });

        if ("error" in result) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Store pending payment in Firebase
        await db.collection("pending_star_payments").add({
          telegramId,
          payload,
          starsAmount,
          tonAmount,
          status: "pending",
          createdAt: Date.now(),
        });

        return NextResponse.json({
          success: true,
          messageId: result.messageId,
          starsAmount,
        });
      }

      case "pre-checkout": {
        const { preCheckoutQueryId, ok, errorMessage } = body;

        if (!preCheckoutQueryId) {
          return NextResponse.json(
            { error: "Missing preCheckoutQueryId" },
            { status: 400 }
          );
        }

        const success = await answerPreCheckoutQuery(
          BOT_TOKEN,
          preCheckoutQueryId,
          ok ?? true,
          errorMessage
        );

        return NextResponse.json({ success });
      }

      case "confirm-payment": {
        const { paymentData } = body;

        if (!paymentData) {
          return NextResponse.json(
            { error: "Missing payment data" },
            { status: 400 }
          );
        }

        // Find and update the pending payment
        const pendingPayments = await db
          .collection("pending_star_payments")
          .where("payload", "==", paymentData.invoicePayload)
          .where("status", "==", "pending")
          .limit(1)
          .get();

        if (pendingPayments.empty) {
          return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 }
          );
        }

        const paymentDoc = pendingPayments.docs[0];
        
        // Update to completed
        await paymentDoc.ref.update({
          status: "completed",
          telegramPaymentChargeId: paymentData.telegramPaymentChargeId,
          providerPaymentChargeId: paymentData.providerPaymentChargeId,
          totalAmount: paymentData.totalAmount,
          completedAt: Date.now(),
        });

        // Store in completed payments collection
        await db.collection("star_payments").add({
          ...paymentDoc.data(),
          status: "completed",
          telegramPaymentChargeId: paymentData.telegramPaymentChargeId,
          providerPaymentChargeId: paymentData.providerPaymentChargeId,
          totalAmount: paymentData.totalAmount,
          completedAt: Date.now(),
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Telegram Stars payment error:", error);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}

// Webhook handler for Telegram payment updates
export async function PUT(request: NextRequest) {
  try {
    const update = await request.json();
    
    // Handle pre_checkout_query
    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      
      // Auto-approve all pre-checkout queries
      // In production, you might want to validate the payload
      if (BOT_TOKEN) {
        await answerPreCheckoutQuery(BOT_TOKEN, query.id, true);
      }
      
      return NextResponse.json({ ok: true });
    }
    
    // Handle successful_payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const userId = update.message.from.id;
      
      // Find and update the pending payment
      const pendingPayments = await db
        .collection("pending_star_payments")
        .where("payload", "==", payment.invoice_payload)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (!pendingPayments.empty) {
        const paymentDoc = pendingPayments.docs[0];
        
        await paymentDoc.ref.update({
          status: "completed",
          telegramPaymentChargeId: payment.telegram_payment_charge_id,
          providerPaymentChargeId: payment.provider_payment_charge_id,
          totalAmount: payment.total_amount,
          completedAt: Date.now(),
        });

        // Store in completed payments
        await db.collection("star_payments").add({
          ...paymentDoc.data(),
          telegramId: String(userId),
          status: "completed",
          telegramPaymentChargeId: payment.telegram_payment_charge_id,
          providerPaymentChargeId: payment.provider_payment_charge_id,
          totalAmount: payment.total_amount,
          completedAt: Date.now(),
        });
      }
      
      return NextResponse.json({ ok: true });
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
