import {
  fetchTonPrice,
  fetchBtcPrice,
  fetchEthPrice,
  fetchSolPrice,
  fetchTrxPrice,
  fetchPercent24h,
} from "@/lib/price-api";
import { tonApiGet } from "@/lib/tonapi-client";
import { loadAssets, findAsset } from "@/lib/bot/stonfi-server";
import type { BotSwapAsset } from "@/lib/bot/stonfi-server";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

interface PriceLine {
  label: string;
  priceUsd: number;
  change24h?: number;
}

interface TonApiRatesResponse {
  rates?: Record<string, {
    prices?: Record<string, number>;
    diff_24h?: Record<string, string>;
  }>;
}

const NATIVE_NON_TON: Record<string, () => Promise<number>> = {
  BTC: fetchBtcPrice,
  ETH: fetchEthPrice,
  SOL: fetchSolPrice,
  TRX: fetchTrxPrice,
};

const MAX_SYMBOLS = 5;

export async function handlePrice(parsed: ParsedCommand): Promise<CommandResult> {
  if (parsed.args.length === 0) {
    return { text: "Usage: price <symbol|address> [more…]\nExample: price TON USDT WETH" };
  }

  // Dedupe (case-insensitive) and cap to avoid huge replies on accidental input.
  const queries = dedupe(parsed.args.map((s) => s.trim()).filter(Boolean)).slice(0, MAX_SYMBOLS);
  if (queries.length === 0) {
    return { text: "Usage: price <symbol|address>" };
  }

  // Pre-load assets once for jetton lookups; cheap on cache hit.
  const assets = await loadAssets().catch(() => [] as BotSwapAsset[]);

  const lines = await Promise.all(queries.map((q) => fetchPriceLine(q, assets)));

  const text = lines
    .map((line, i) =>
      line ? formatLine(line) : `${queries[i].toUpperCase()}: not found`,
    )
    .join("\n");

  return { text };
}

async function fetchPriceLine(
  query: string,
  assets: BotSwapAsset[],
): Promise<PriceLine | null> {
  const upper = query.toUpperCase();

  // BTC/ETH/SOL/TRX — DeFiLlama price + 24h change in parallel.
  if (NATIVE_NON_TON[upper]) {
    const [price, change24h] = await Promise.all([
      NATIVE_NON_TON[upper]().catch(() => 0),
      fetchPercent24h(upper).catch(() => undefined),
    ]);
    if (!price) return null;
    return { label: upper, priceUsd: price, change24h };
  }

  // TON — use TonAPI rates (gets 24h change). Fall back to native if rates fails.
  if (upper === "TON") {
    const fromRates = await fetchFromTonApiRates("ton", "TON").catch(() => null);
    if (fromRates) return fromRates;
    const price = await fetchTonPrice().catch(() => 0);
    return price ? { label: "TON", priceUsd: price } : null;
  }

  // Otherwise resolve to a STON.fi-known asset, then ask TonAPI for the rate.
  const asset = findAsset(assets, query);
  if (!asset) return null;
  const rates = await fetchFromTonApiRates(asset.contractAddress, asset.symbol).catch(
    () => null,
  );
  if (rates) return rates;

  // Last-ditch fallback: STON.fi's static dexPriceUsd (no 24h change).
  if (asset.dexPriceUsd) {
    return { label: asset.symbol, priceUsd: Number(asset.dexPriceUsd) };
  }
  return null;
}

async function fetchFromTonApiRates(
  token: string,
  label: string,
): Promise<PriceLine | null> {
  const data = await tonApiGet<TonApiRatesResponse>(
    `/v2/rates?tokens=${encodeURIComponent(token)}&currencies=usd`,
  );
  // TonAPI returns the key uppercased for tickers and as-is for addresses.
  const rate =
    data.rates?.[token] ??
    data.rates?.[token.toUpperCase()] ??
    data.rates?.[token.toLowerCase()];
  if (!rate?.prices) return null;
  const priceUsd =
    rate.prices.USD ??
    rate.prices.usd ??
    Object.entries(rate.prices).find(([k]) => k.toLowerCase() === "usd")?.[1] ??
    0;
  if (!priceUsd) return null;
  const change24h = parsePercent(rate.diff_24h?.USD ?? rate.diff_24h?.usd);
  return { label, priceUsd, change24h };
}

function parsePercent(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/−/g, "-").replace(/%/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function formatLine(p: PriceLine): string {
  const price = `$${formatUsd(p.priceUsd)}`;
  if (p.change24h === undefined) return `${p.label}: ${price}`;
  const arrow = p.change24h >= 0 ? "↑" : "↓";
  const magnitude = Math.abs(p.change24h).toFixed(2);
  return `${p.label}: ${price}  ${arrow} ${magnitude}% 24h`;
}

function formatUsd(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  return n.toPrecision(3);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
