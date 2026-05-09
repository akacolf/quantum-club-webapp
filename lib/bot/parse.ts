import { env } from "@/env";
import type { ParsedCommand, TelegramMessage } from "./types";

function botUsername(): string {
  return (env.BOT_USERNAME ?? "").replace(/^@/, "").toLowerCase();
}

function extractMentionedBot(msg: TelegramMessage): string | null {
  if (!msg.text || !msg.entities) return null;
  for (const ent of msg.entities) {
    if (ent.type !== "mention") continue;
    const tag = msg.text.slice(ent.offset, ent.offset + ent.length);
    if (tag.startsWith("@")) return tag.slice(1).toLowerCase();
  }
  return null;
}

// Strips the @botusername tag and tokenizes the remainder.
// Whitespace-tokenized; first token is the command, rest are args.
function tokenizeAfterMention(msg: TelegramMessage, mentionTag: string): string[] {
  const text = msg.text ?? "";
  const stripped = text.replace(new RegExp(`@${mentionTag}\\b`, "i"), "").trim();
  if (!stripped) return [];
  return stripped.split(/\s+/).filter(Boolean);
}

function tokenizeRaw(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function parseUpdate(msg: TelegramMessage): ParsedCommand | null {
  if (!msg.text || !msg.from || msg.from.is_bot) return null;

  const expected = botUsername();
  if (!expected) return null;

  let tokens: string[];

  const mentioned = extractMentionedBot(msg);
  const isPrivate = msg.chat.type === "private";

  if (mentioned && mentioned === expected) {
    tokens = tokenizeAfterMention(msg, mentioned);
  } else if (isPrivate) {
    // In DMs the bot owns the chat — accept commands with or without
    // (or with a partial/typo) @mention. Strip any @-prefixed leading token.
    const raw = tokenizeRaw(msg.text);
    tokens = raw[0]?.startsWith("@") ? raw.slice(1) : raw;
  } else {
    return null;
  }

  // Strip a leading slash so `/price TON` works the same as `price TON`,
  // and resolve `/cmd@botname` forms.
  let command = (tokens[0] ?? "").toLowerCase();
  if (!command) return null;
  if (command.startsWith("/")) command = command.slice(1);
  command = command.split("@")[0];
  if (!command) return null;

  return {
    command,
    args: tokens.slice(1),
    fromId: msg.from.id,
    chatId: msg.chat.id,
    messageId: msg.message_id,
  };
}
