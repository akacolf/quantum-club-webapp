import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as db } from "@/app/(firebase)/server";
import {
  createStarsInvoice,
  sendStarsInvoice,
  convertTonToStars,
  answerPreCheckoutQuery
} from "@/lib/telegram-payments";
import { z } from "zod";

const BOT_TOKEN = process.env.BOT_TOKEN;

const createInvoiceSchema = z.object({
  action: z.literal("create-invoice"),
  telegramId: z.string().min(1, "telegramId required"),
  title: z.string().min(1, "title required"),
  description: z.string().min(1, "description required"),
  payload: z.string().min(1, "payload required"),
  tonAmount: z.number().positive("tonAmount must be positive"),
  tonPriceUsd: z.number().positive("tonPriceUsd must be positive"),
});

const sendInvoiceSchema = z.object({
  action: z.literal("send-invoice"),
  telegramId: z.string().min(1, "telegramId required"),
  title: z.string().min(1, "title required"),
  description: z.string().min(1, "description required"),
  payload: z.string().min(1, "payload required"),
  tonAmount: z.number().positive("tonAmount must be positive"),
  tonPriceUsd: z.number().positive("tonPriceUsd must be positive"),
});

const preCheckoutSchema = z.object({
  action: z.literal("pre-checkout"),
  telegramId: z.string().min(1, "telegramId required"),
  preCheckoutQueryId: z.string().min(1, "preCheckoutQueryId required"),
  ok: z.boolean().optional(),
  errorMessage: z.string().optional(),
});

const confirmPaymentSchema = z.object({
  action: z.literal("confirm-payment"),
  telegramId: z.string().min(1, "telegramId required"),
  paymentData: z.object({
    telegramPaymentChargeId: z.string().min(1, "telegramPaymentChargeId required"),
    providerPaymentChargeId: z.string().min(1, "providerPaymentChargeId required"),
    totalAmount: z.number(),
    invoicePayload: z.string().min(1, "invoicePayload required"),
  }),
});

const telegramStarsSchema = z.discriminatedUnion("action", [
  createInvoiceSchema,
  sendInvoiceSchema,
  preCheckoutSchema,
  confirmPaymentSchema,
]);

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

    const body = await request.json();
    const parsed = telegramStarsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { action, telegramId } = parsed.data;

    // Verify telegramId matches session
    if (String(telegramId) !== String(session.user.telegramId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    switch (action) {
      case "create-invoice": {
        const { title, description, payload, tonAmount, tonPriceUsd } = parsed.data;

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
        const { title, description, payload, tonAmount, tonPriceUsd } = parsed.data;

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
        const { preCheckoutQueryId, ok, errorMessage } = parsed.data;

        const success = await answerPreCheckoutQuery(
          BOT_TOKEN,
          preCheckoutQueryId,
          ok ?? true,
          errorMessage
        );

        return NextResponse.json({ success });
      }

      case "confirm-payment": {
        const { paymentData } = parsed.data;

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
    // Verify webhook secret to prevent forged payment confirmations
    const webhookSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (!webhookSecret || webhookSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

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
