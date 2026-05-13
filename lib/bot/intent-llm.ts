// LLM intent fallback — when the regex parser doesn't match a known command,
// ask Gemini to map the raw message to one of our tools, OR to ask a
// clarifying question, OR to bail. Outputs are then dispatched through the
// same `router.ts` switch as hand-typed commands.

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { env } from "@/env";
import { AI_MODEL } from "@/lib/ai/system-prompt";
import { getRecentTurns } from "@/lib/bot/memory";
import type { ParsedCommand } from "./types";

const INTENT_TIMEOUT_MS = 4000; // keep well under the 10s function budget

const intentSchema = z.object({
  command: z.enum([
    "price",
    "route",
    "swap",
    "ape",
    "balance",
    "portfolio",
    "transactions",
    "watch",
    "unwatch",
    "link",
    "help",
    "ask",
    "none",
  ]),
  args: z.array(z.string()).default([]),
  // Only populated when command === "ask". A short clarifying question the
  // bot will send back verbatim. Keep <140 chars.
  clarifier: z.string().optional(),
});

const SYSTEM_PROMPT = `You map a user's message to one of these QC bot commands.

- price <symbol>           — token USD price (e.g. price TON, price USDT)
- route <amount> <FROM> <TO> — swap quote only, no sign step. Use when the
                              user just wants a price/rate ("what would i
                              get for", "quote me", "how much is X in Y").
- swap <amount> <FROM> <TO> — quote + hand off to QC to sign. Use whenever
                              the user wants to actually execute ("swap",
                              "convert", "trade my X for Y", "i want to").
- ape <jetton-address>     — buy a jetton on QC (needs a TON address)
- balance [address]        — TON balance. With no address, uses the user's
                              linked wallet. ("my balance", "what's my balance"
                              → balance with no args)
- portfolio                — all of the user's TON + jetton holdings with
                              USD values. ("my portfolio", "what do i hold",
                              "show my holdings", "all my tokens", "my bag")
- transactions             — recent activity on the user's linked wallet.
                              ("my transactions", "tx history", "recent activity",
                              "what did i just send", "show my last trades")
- watch                    — set a price alert. Args: <SYMBOL> above|below <PRICE>.
                              Symbols: TON, BTC, ETH, SOL, TRX only.
                              ("alert me when TON hits 7", "notify me if BTC drops
                              below 40k", "watch ETH 4000"). For "watch list",
                              return command "watch" with args ["list"].
- unwatch                  — remove a price alert. Args: <SYMBOL> or "all".
                              ("stop watching TON", "remove BTC alert", "clear all
                              alerts" → unwatch all).
- link                     — bind the user's QC wallet to Telegram. Use for
                              "connect my wallet", "link wallet", "log me in".
- help                     — show command list
- ask                      — ask the user a short clarifying question because
                              you're missing info to dispatch anything. Set
                              args=[] and put the question in "clarifier".
                              Keep it under ~140 chars, no markdown.
- none                     — message is small talk, unclear, or unrelated

Rules:
- Output strict JSON matching the schema. No prose.
- If the user mentions tickers like "tether"/"usdt", normalize to "USDT".
- Bitcoin → "BTC", Ethereum → "ETH". Numbers stay as written.
- If a personalized phrasing ("my balance", "my wallet", "show mine") refers
  to a tool that supports it, return that command with no args.
- "balance" = TON only. "portfolio" = TON + all jettons. Prefer portfolio when
  the user asks about multiple tokens, holdings, or "everything".
- If you can't extract required args (e.g. swap with no amount), and the missing
  piece is something a user could quickly answer in chat, prefer "ask" with a
  short clarifying question over "help". Examples:
    "swap to USDT"           → ask: "How much, and from what token?"
    "i want to buy something" → ask: "Which token? Send a TON address or symbol."
    "alert me on BTC"        → ask: "Above or below what price?"
- Use prior conversation context (provided as <history>) to resolve referents:
    after a /portfolio that listed TON, USDT, SCALE,
    "swap my SCALE to TON" → swap N SCALE TON (only if amount is given;
    otherwise ask for amount).
- If the user is just chatting and isn't asking for anything actionable, use
  command "none".`;

function getApiKey(): string | null {
  return env.GOOGLE_GENERATIVE_AI_API_KEY ?? env.GEMINI_API_KEY ?? null;
}

export type IntentResult =
  | { kind: "command"; command: ParsedCommand }
  | { kind: "ask"; text: string }
  | null;

export async function inferIntent(
  text: string,
  ctx: { fromId: number; chatId: number; messageId: number },
): Promise<IntentResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[bot:intent-llm] no Gemini API key configured, skipping fallback");
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) return null;

  const google = createGoogleGenerativeAI({ apiKey });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INTENT_TIMEOUT_MS);

  try {
    // Inject recent conversation as a <history> block.
    const turns = await getRecentTurns(ctx.fromId);
    const historyBlock =
      turns.length === 0
        ? ""
        : "<history>\n" +
          turns
            .map((t) => `${t.role === "user" ? "USER" : "BOT"}: ${t.text}`)
            .join("\n") +
          "\n</history>\n\n";

    const result = await generateObject({
      model: google(AI_MODEL),
      schema: intentSchema,
      system: SYSTEM_PROMPT,
      prompt: `${historyBlock}USER: ${trimmed}`,
      abortSignal: controller.signal,
      maxRetries: 0,
    });

    const { command, args, clarifier } = result.object;
    if (command === "none") return null;

    if (command === "ask") {
      const question = (clarifier ?? "").trim();
      if (!question) return null;
      return { kind: "ask", text: question.slice(0, 200) };
    }

    return {
      kind: "command",
      command: {
        command,
        args,
        fromId: ctx.fromId,
        chatId: ctx.chatId,
        messageId: ctx.messageId,
      },
    };
  } catch (e) {
    console.error("[bot:intent-llm] inference failed", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
