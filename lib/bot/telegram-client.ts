import { env } from "@/env";
import type { CommandResult, ReplyMarkup } from "./types";

const TELEGRAM_API = "https://api.telegram.org";

function botToken(): string {
  const isProd = process.env.NODE_ENV === "production";
  return isProd ? env.BOT_TOKEN : env.DEV_BOT_TOKEN ?? env.BOT_TOKEN;
}

interface SendMessageParams {
  chatId: number;
  text: string;
  replyToMessageId?: number;
  replyMarkup?: ReplyMarkup;
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
}

export async function sendMessage(params: SendMessageParams): Promise<void> {
  const token = botToken();
  if (!token) {
    console.warn("[bot] missing token, skipping sendMessage", params);
    return;
  }

  const body = {
    chat_id: params.chatId,
    text: params.text,
    ...(params.replyToMessageId ? { reply_to_message_id: params.replyToMessageId } : {}),
    ...(params.replyMarkup ? { reply_markup: params.replyMarkup } : {}),
    ...(params.parseMode ? { parse_mode: params.parseMode } : {}),
    disable_web_page_preview: true,
  };

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[bot] sendMessage failed", res.status, errText.slice(0, 300));
    }
  } catch (e) {
    console.error("[bot] sendMessage error", e);
  }
}

export async function replyWith(
  chatId: number,
  replyToMessageId: number,
  result: CommandResult,
): Promise<void> {
  await sendMessage({
    chatId,
    replyToMessageId,
    text: result.text,
    replyMarkup: result.replyMarkup,
    parseMode: result.parseMode,
  });
}
