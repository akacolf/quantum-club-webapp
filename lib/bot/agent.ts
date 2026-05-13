// Tool-calling agent loop. Replaces the single-shot intent-llm for natural-
// language messages. Lets the LLM call multiple tools in a single turn so
// compound asks like "swap my biggest holding for ton" actually work:
// portfolio → identify → proposeSwap, all behind one user message.
//
// Tools wrap the existing command handlers — we never duplicate command
// logic. Button-bearing tools (swap intent, link) push their inline buttons
// into a per-request context so the final reply preserves them.

import { generateText, tool, stepCountIs, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { env } from "@/env";
import { AI_MODEL } from "@/lib/ai/system-prompt";
import { getRecentTurns } from "@/lib/bot/memory";
import { handlePrice } from "./commands/price";
import { handlePortfolio } from "./commands/portfolio";
import { handleBalance } from "./commands/balance";
import { handleTransactions } from "./commands/transactions";
import { handleRoute } from "./commands/route";
import { handleSwap } from "./commands/swap";
import { handleApe } from "./commands/ape";
import { handleLink } from "./commands/link";
import { handleWatch, handleUnwatch } from "./commands/watch";
import type {
  CommandResult,
  InlineKeyboardButton,
  ParsedCommand,
} from "./types";

const AGENT_TIMEOUT_MS = 8000; // generous: tool calls + 2-3 LLM steps
const MAX_STEPS = 4;

export interface AgentContext {
  fromId: number;
  chatId: number;
  messageId: number;
}

interface RequestContext {
  buttons: InlineKeyboardButton[][];
}

const SYSTEM_PROMPT = `You are the QC Bot, a Telegram bot for the Quantum Club Mini App on the TON blockchain. Users message you in chat. Help them with prices, portfolio, swaps, and alerts. You have tools — call them to fetch real data, never invent numbers.

Output rules:
- Plain text only. No markdown, no emojis, no bullet characters, no arrows. Use hyphens, plus/minus, "for", "to".
- Be concise. Pass tool output through verbatim when it's already formatted for the user (portfolio rows, price lines, transaction history). When the user asks a reasoning question over data ("biggest holding", "compare these"), reason first then summarize.
- Never repeat a tool's output and also paraphrase it — pick one.
- Don't add your own URLs or buttons. When a tool that creates an intent runs (proposeSwap, proposeApe, linkWallet), the sign/open button is attached automatically below your reply. Mention the action ("tap below to sign") but don't include a link in your text.

Tool selection:
- "price BTC" or "what's TON worth" → getPrice.
- "my balance" or "what's my TON" → getBalance (TON-only).
- "my portfolio", "what do i hold", "my bag" → getPortfolio (TON + jettons).
- "my last trades", "recent activity" → getTransactions.
- "quote X for Y" (just curious about the rate) → quoteSwap.
- "swap X for Y" or "convert", "trade" → proposeSwap.
- "ape <address>" → proposeApe.
- "alert me when X hits Y", "watch X" → setAlert (one alert per call).
- "stop watching X", "clear all alerts" → removeAlert.
- "connect my wallet", "link" → linkWallet.

Multi-step planning:
- "swap my biggest jetton for ton" → getPortfolio first; identify the largest jetton (not TON itself); proposeSwap with its full amount.
- "alert me when my biggest holding moves 10%" → getPortfolio + getPrice for that symbol; compute the threshold; setAlert.
- Cap yourself at ~3 tool calls. If you need more, ask the user a clarifying question instead.

If the user asks something the bot can't do, or is just chatting, reply briefly without calling tools. If required info is missing (no amount for a swap, no direction for an alert), ask one short clarifying question instead of calling a tool.`;

export async function runAgent(
  message: string,
  ctx: AgentContext,
): Promise<CommandResult | null> {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY ?? env.GEMINI_API_KEY ?? null;
  if (!apiKey) {
    console.warn("[bot:agent] no Gemini API key configured");
    return null;
  }
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 500) return null;

  const google = createGoogleGenerativeAI({ apiKey });
  const reqCtx: RequestContext = { buttons: [] };
  const tools = makeTools(ctx, reqCtx);

  const turns = await getRecentTurns(ctx.fromId);
  const history: ModelMessage[] = turns.map((t) => ({
    role: t.role === "user" ? "user" : "assistant",
    content: t.text,
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    const result = await generateText({
      model: google(AI_MODEL),
      system: SYSTEM_PROMPT,
      messages: [...history, { role: "user", content: trimmed }],
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      abortSignal: controller.signal,
      maxRetries: 0,
    });

    const text = (result.text ?? "").trim();
    if (!text && reqCtx.buttons.length === 0) return null;

    return {
      text: text || "Done.",
      ...(reqCtx.buttons.length > 0
        ? { replyMarkup: { inline_keyboard: reqCtx.buttons } }
        : {}),
    };
  } catch (e) {
    console.error("[bot:agent] generation failed", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Tool registry. Each tool wraps an existing command handler so behavior
// stays identical to the deterministic dispatch path. Tools that return a
// replyMarkup forward those buttons into the request context.
// ---------------------------------------------------------------------------

function makeTools(ctx: AgentContext, req: RequestContext) {
  const parsed = (command: string, args: string[]): ParsedCommand => ({
    command,
    args,
    fromId: ctx.fromId,
    chatId: ctx.chatId,
    messageId: ctx.messageId,
  });

  const captureButtons = (result: CommandResult) => {
    if (result.replyMarkup?.inline_keyboard?.length) {
      req.buttons.push(...result.replyMarkup.inline_keyboard);
    }
  };

  return {
    getPrice: tool({
      description:
        "Get USD price + 24h change for up to 5 token symbols. Symbols can be TON, BTC, ETH, SOL, TRX, USDT, or any STON.fi-listed jetton ticker.",
      inputSchema: z.object({
        symbols: z.array(z.string()).min(1).max(5),
      }),
      execute: async ({ symbols }) => {
        const r = await handlePrice(parsed("price", symbols));
        return { text: r.text };
      },
    }),

    getPortfolio: tool({
      description:
        "Get the user's holdings on their linked TON wallet (TON + all jettons with USD values). Requires a linked wallet.",
      inputSchema: z.object({}),
      execute: async () => {
        const r = await handlePortfolio(parsed("portfolio", []));
        return { text: r.text };
      },
    }),

    getBalance: tool({
      description:
        "Get the user's TON balance only (not jettons). Use getPortfolio for full holdings.",
      inputSchema: z.object({
        address: z.string().optional(),
      }),
      execute: async ({ address }) => {
        const r = await handleBalance(parsed("balance", address ? [address] : []));
        return { text: r.text };
      },
    }),

    getTransactions: tool({
      description:
        "Get the last 5 transactions on the user's linked wallet (sent, received, swaps, NFT transfers).",
      inputSchema: z.object({}),
      execute: async () => {
        const r = await handleTransactions(parsed("transactions", []));
        return { text: r.text };
      },
    }),

    quoteSwap: tool({
      description:
        "Quote a swap rate without creating a sign-link. Use when the user just wants the rate (\"quote me\", \"what would i get\"). For actual swapping, use proposeSwap.",
      inputSchema: z.object({
        amount: z.string(),
        fromSymbol: z.string(),
        toSymbol: z.string(),
      }),
      execute: async ({ amount, fromSymbol, toSymbol }) => {
        const r = await handleRoute(
          parsed("route", [amount, fromSymbol, toSymbol]),
        );
        return { text: r.text };
      },
    }),

    proposeSwap: tool({
      description:
        "Quote a swap AND create a sign intent. The user gets an inline button below the reply that opens the Mini App with the swap pre-filled. Requires linked wallet.",
      inputSchema: z.object({
        amount: z.string(),
        fromSymbol: z.string(),
        toSymbol: z.string(),
      }),
      execute: async ({ amount, fromSymbol, toSymbol }) => {
        const r = await handleSwap(parsed("swap", [amount, fromSymbol, toSymbol]));
        captureButtons(r);
        return { text: r.text, signButtonAttached: !!r.replyMarkup };
      },
    }),

    proposeApe: tool({
      description:
        "Open the bonding-curve trade page in QC for a given jetton address. Returns a deep link button.",
      inputSchema: z.object({
        jettonAddress: z.string(),
      }),
      execute: async ({ jettonAddress }) => {
        const r = await handleApe(parsed("ape", [jettonAddress]));
        captureButtons(r);
        return { text: r.text };
      },
    }),

    setAlert: tool({
      description:
        "Set a price alert. Supported symbols: TON, BTC, ETH, SOL, TRX. Direction is 'above' or 'below'.",
      inputSchema: z.object({
        symbol: z.string(),
        direction: z.enum(["above", "below"]),
        price: z.string(),
      }),
      execute: async ({ symbol, direction, price }) => {
        const r = await handleWatch(
          parsed("watch", [symbol, direction, price]),
        );
        return { text: r.text };
      },
    }),

    listAlerts: tool({
      description: "List the user's active price alerts.",
      inputSchema: z.object({}),
      execute: async () => {
        const r = await handleWatch(parsed("watch", ["list"]));
        return { text: r.text };
      },
    }),

    removeAlert: tool({
      description:
        "Remove price alerts. Pass a single symbol (e.g. 'TON') or 'all' to clear them all.",
      inputSchema: z.object({
        target: z.string(),
      }),
      execute: async ({ target }) => {
        const r = await handleUnwatch(parsed("unwatch", [target]));
        return { text: r.text };
      },
    }),

    linkWallet: tool({
      description:
        "Generate a one-time link for the user to bind their QC wallet to this Telegram account.",
      inputSchema: z.object({}),
      execute: async () => {
        const r = await handleLink(parsed("link", []));
        captureButtons(r);
        return { text: r.text };
      },
    }),
  };
}
