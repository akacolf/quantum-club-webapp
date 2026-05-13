import { NextRequest, NextResponse, connection } from "next/server";
import { env } from "@/env";
import { parseUpdate } from "@/lib/bot/parse";
import { dispatch, KNOWN_COMMANDS } from "@/lib/bot/router";
import { inferIntent } from "@/lib/bot/intent-llm";
import { preLLMCheck } from "@/lib/bot/skip-llm";
import { checkCommandLimit, checkLLMLimit } from "@/lib/bot/ratelimit";
import { replyWith } from "@/lib/bot/telegram-client";
import type { ParsedCommand, TelegramUpdate } from "@/lib/bot/types";

// Telegram POSTs JSON updates here. We always 200; never make Telegram retry.
// Hobby tier function timeout is ~10s — read commands stay well under.
//
// Pipeline:
//   1. Auth + body parse
//   2. Regex parse → known command? jump to step 5
//   3. Skip heuristics (greetings, emoji, acks) → bail without LLM
//   4. LLM rate limit → LLM intent inference
//   5. Per-user command rate limit
//   6. Dispatch + reply

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
  if (!msg.from || !msg.text) return NextResponse.json({ ok: true }, { status: 200 });

  // Step 2: deterministic regex parse
  let parsed: ParsedCommand | null = parseUpdate(msg);

  // Step 3 + 4: skip heuristics → LLM fallback
  if (!parsed || !KNOWN_COMMANDS.has(parsed.command)) {
    // Only attempt LLM inference when the message is addressed to the bot
    // (private chat, OR group with @mention parsed earlier). Group messages
    // without @mention return null from parseUpdate by design.
    const addressed = msg.chat.type === "private" || parsed != null;
    if (!addressed) return NextResponse.json({ ok: true }, { status: 200 });

    const skip = preLLMCheck(msg.text);
    if (skip.skip) {
      if (skip.reply) {
        await replyWith(msg.chat.id, msg.message_id, { text: skip.reply });
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Tight LLM-specific limit BEFORE the model call to protect Fluid CPU.
    const llmLimit = await checkLLMLimit(msg.from.id);
    if (!llmLimit.allowed) {
      const text =
        llmLimit.reason === "global-llm"
          ? "The bot is busy right now. Try again in a few minutes, or use exact commands like `price TON`."
          : "You've hit the AI command limit for this hour. Use exact commands like `price TON` or `route 10 TON USDT` to keep going.";
      await replyWith(msg.chat.id, msg.message_id, { text });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const inferred = await inferIntent(msg.text, {
      fromId: msg.from.id,
      chatId: msg.chat.id,
      messageId: msg.message_id,
    });
    if (inferred) parsed = inferred;
  }

  if (!parsed) return NextResponse.json({ ok: true }, { status: 200 });

  // Step 5: broader per-user command limit (covers regex + LLM paths)
  const cmdLimit = await checkCommandLimit(parsed.fromId);
  if (!cmdLimit.allowed) {
    await replyWith(parsed.chatId, parsed.messageId, {
      text: "Slow down — try again in a minute.",
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Step 6: dispatch + reply
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
