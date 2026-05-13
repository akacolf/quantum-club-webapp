// `/watch` and `/unwatch` — price alerts wired into the existing
// `priceAlerts` Firestore collection + cron pipeline (`app/api/cron/
// price-alerts`). When the cron sees a tripped alert, it DMs the user via
// the bot, exactly the same path used by the in-app alert settings.

import { firestore } from "@/app/(firebase)/server";
import {
  fetchTonPrice,
  fetchBtcPrice,
  fetchEthPrice,
  fetchSolPrice,
  fetchTrxPrice,
} from "@/lib/price-api";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

const SUPPORTED = new Set(["TON", "BTC", "ETH", "SOL", "TRX"]);
const MAX_ACTIVE_PER_USER = 10;

type Direction = "above" | "below";

export async function handleWatch(parsed: ParsedCommand): Promise<CommandResult> {
  const [first, ...rest] = parsed.args;

  // `watch list` / `watch ls`
  if (!first || first.toLowerCase() === "list" || first.toLowerCase() === "ls") {
    return listAlerts(String(parsed.fromId));
  }

  const symbol = first.toUpperCase();
  if (!SUPPORTED.has(symbol)) {
    return {
      text:
        `Watching is supported for: ${[...SUPPORTED].join(", ")}.\n` +
        "Jetton alerts are coming soon.",
    };
  }

  if (rest.length === 0) {
    return {
      text:
        "Usage: watch <symbol> <above|below> <price>\n" +
        "Or:    watch <symbol> <price>   (direction inferred from current price)\n" +
        "       watch list",
    };
  }

  // Parse direction + price. Accept "above|below|>|<" tokens, with optional space.
  // Also accept bare price → infer direction.
  let direction: Direction | undefined;
  let priceRaw: string | undefined;

  const dirToken = rest[0].toLowerCase();
  if (dirToken === "above" || dirToken === ">" || dirToken === "over") {
    direction = "above";
    priceRaw = rest[1];
  } else if (dirToken === "below" || dirToken === "<" || dirToken === "under") {
    direction = "below";
    priceRaw = rest[1];
  } else {
    priceRaw = rest[0];
  }

  if (!priceRaw || !/^\d+(\.\d+)?$/.test(priceRaw)) {
    return { text: `"${priceRaw ?? ""}" is not a valid price.` };
  }
  const targetPrice = Number(priceRaw);

  // Infer direction from current price when user didn't specify.
  if (!direction) {
    const current = await fetchCurrent(symbol);
    if (!current) {
      return {
        text: `Couldn't fetch ${symbol} price to infer direction. Try \`watch ${symbol} above ${priceRaw}\` or \`below\`.`,
      };
    }
    direction = current < targetPrice ? "above" : "below";
  }

  // Per-user cap (matches in-app limit).
  const telegramId = String(parsed.fromId);
  const existing = await firestore
    .collection("priceAlerts")
    .where("telegramId", "==", telegramId)
    .where("triggered", "==", false)
    .get();
  if (existing.size >= MAX_ACTIVE_PER_USER) {
    return {
      text:
        `You already have ${MAX_ACTIVE_PER_USER} active alerts. ` +
        "Use `unwatch <symbol>` to free one up.",
    };
  }

  // Avoid duplicate (same symbol + direction) — overwrite the threshold instead.
  const dupSnap = existing.docs.find((d) => {
    const data = d.data();
    return data.symbol === symbol && data.direction === direction;
  });
  if (dupSnap) {
    await dupSnap.ref.update({ targetPrice, updatedAt: Date.now() });
    return { text: `Updated: ${symbol} ${direction} $${formatPrice(targetPrice)}.` };
  }

  await firestore.collection("priceAlerts").add({
    telegramId,
    symbol,
    targetPrice,
    direction,
    createdAt: Date.now(),
    triggered: false,
    notified: false,
    source: "bot",
  });

  return {
    text: `Watching ${symbol} ${direction} $${formatPrice(targetPrice)}. I'll DM you when it crosses.`,
  };
}

export async function handleUnwatch(parsed: ParsedCommand): Promise<CommandResult> {
  const telegramId = String(parsed.fromId);
  const target = parsed.args[0]?.toUpperCase();

  const snap = await firestore
    .collection("priceAlerts")
    .where("telegramId", "==", telegramId)
    .where("triggered", "==", false)
    .get();

  if (snap.empty) {
    return { text: "You have no active alerts." };
  }

  // `unwatch all` / `unwatch *`
  if (target === "ALL" || target === "*") {
    const batch = firestore.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return { text: `Cleared ${snap.size} alert${snap.size === 1 ? "" : "s"}.` };
  }

  if (!target) {
    return { text: "Usage: unwatch <symbol>   (or `unwatch all`)" };
  }

  const matching = snap.docs.filter((d) => d.data().symbol === target);
  if (matching.length === 0) {
    return { text: `No active alert for ${target}.` };
  }
  const batch = firestore.batch();
  matching.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return {
    text: `Removed ${matching.length} ${target} alert${matching.length === 1 ? "" : "s"}.`,
  };
}

async function listAlerts(telegramId: string): Promise<CommandResult> {
  const snap = await firestore
    .collection("priceAlerts")
    .where("telegramId", "==", telegramId)
    .where("triggered", "==", false)
    .get();

  if (snap.empty) {
    return { text: "No active alerts. Try `watch TON above 6.50`." };
  }

  const lines = ["Active alerts"];
  for (const d of snap.docs) {
    const a = d.data() as { symbol: string; direction: Direction; targetPrice: number };
    lines.push(`• ${a.symbol} ${a.direction} $${formatPrice(a.targetPrice)}`);
  }
  return { text: lines.join("\n") };
}

async function fetchCurrent(symbol: string): Promise<number | null> {
  const fetcher: Record<string, () => Promise<number>> = {
    TON: fetchTonPrice,
    BTC: fetchBtcPrice,
    ETH: fetchEthPrice,
    SOL: fetchSolPrice,
    TRX: fetchTrxPrice,
  };
  const fn = fetcher[symbol];
  if (!fn) return null;
  const p = await fn().catch(() => 0);
  return p > 0 ? p : null;
}

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  return n.toPrecision(3);
}
