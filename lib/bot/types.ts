// Minimal Telegram Bot API types for the Guest Bot webhook surface.
// Intentionally narrow — we only model what the four read-only commands need.

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  username?: string;
  first_name?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
}

export interface TelegramMessageEntity {
  type: "mention" | "text_mention" | "bot_command" | "url" | string;
  offset: number;
  length: number;
}

export interface TelegramMessage {
  message_id: number;
  text?: string;
  from?: TelegramUser;
  chat: TelegramChat;
  entities?: TelegramMessageEntity[];
  reply_to_message?: TelegramMessage;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
}

export interface ReplyMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface CommandResult {
  text: string;
  replyMarkup?: ReplyMarkup;
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
}

export interface ParsedCommand {
  command: string;
  args: string[];
  fromId: number;
  chatId: number;
  messageId: number;
}
