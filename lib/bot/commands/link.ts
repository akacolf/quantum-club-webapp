import { Timestamp } from "firebase-admin/firestore";
import { firestore } from "@/app/(firebase)/server";
import { miniAppLink } from "@/lib/bot/deeplink";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

const LINK_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 min

// Usage: link
// Creates a one-time token tied to the requesting Telegram ID and returns a
// Mini App deep-link button. Consumed by app/link/[tokenId]/page.tsx, which
// validates that the in-app session's telegramId matches and writes the
// binding doc at botUserBindings/{telegramId}.
export async function handleLink(parsed: ParsedCommand): Promise<CommandResult> {
  const tokenId = makeTokenId();
  await firestore.collection("botLinkTokens").doc(tokenId).set({
    telegramId: parsed.fromId,
    chatId: parsed.chatId,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + LINK_TOKEN_TTL_MS),
    status: "pending",
  });

  return {
    text:
      "Link your QC wallet to use personalized commands like `balance` or `portfolio`.\n" +
      "Tap below to confirm — link expires in 10 min.",
    replyMarkup: {
      inline_keyboard: [
        [
          {
            text: "Link wallet in QC",
            url: miniAppLink(`link_${tokenId}`),
          },
        ],
      ],
    },
  };
}

function makeTokenId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
