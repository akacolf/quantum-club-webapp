import { NextRequest, NextResponse, connection } from "next/server";
import { env } from "@/env";
import { parseUpdate } from "@/lib/bot/parse";
import { dispatch } from "@/lib/bot/router";
import { replyWith } from "@/lib/bot/telegram-client";
import { checkRateLimit } from "@/lib/rate-limit";
import type { TelegramUpdate } from "@/lib/bot/types";

// Telegram POSTs JSON updates here. We always 200; never make Telegram retry.
// Hobby tier function timeout is ~10s — read commands stay well under.

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 min
const RATE_LIMIT_MAX = 20;           // 20 commands / user / min

export async function POST(req: NextRequest) {
  await connection();

  // Verify Telegram secret token. If unset, fail closed.
  const secret = env.TELEGRAM_BOT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[bot-webhook] TELEGRAM_BOT_WEBHOOK_SECRET not configured");
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  if (req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const msg = update.message ?? update.edited_message;
  if (!msg) return NextResponse.json({ ok: true }, { status: 200 });

  const parsed = parseUpdate(msg);
  if (!parsed) return NextResponse.json({ ok: true }, { status: 200 });

  // Per-user rate limit
  const rateLimited = await checkRateLimit(
    `bot:${parsed.fromId}`,
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX,
  );
  if (rateLimited) {
    await replyWith(parsed.chatId, parsed.messageId, {
      text: "Slow down — try again in a minute.",
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const startedAt = Date.now();
  try {
    const result = await dispatch(parsed);
    await replyWith(parsed.chatId, parsed.messageId, result);
    console.log(
      `[bot-webhook] ${parsed.command} from=${parsed.fromId} chat=${parsed.chatId} dur=${Date.now() - startedAt}ms`,
    );
  } catch (e) {
    console.error("[bot-webhook] handler error", e);
    await replyWith(parsed.chatId, parsed.messageId, {
      text: "Something went wrong. Try again in a moment.",
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
