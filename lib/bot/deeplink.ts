import { env } from "@/env";

// In production we want links to open the prod bot's Mini App regardless of
// which token the webhook is using. BOT_USERNAME is the canonical source.
const PROD_FALLBACK = "QuantumClubBot";

function botUsernameForLink(): string {
  const isProd = process.env.NODE_ENV === "production";
  // In dev, BOT_USERNAME is usually the test bot — links wouldn't open the
  // real Mini App from there, so we always point at the prod bot.
  if (isProd) return (env.BOT_USERNAME ?? PROD_FALLBACK).replace(/^@/, "");
  return PROD_FALLBACK;
}

export function miniAppLink(startParam: string): string {
  return `https://t.me/${botUsernameForLink()}/app?startapp=${encodeURIComponent(startParam)}`;
}
