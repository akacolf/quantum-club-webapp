// Server-side STON.fi simulation. lib/stonfi.ts is "use client" so we re-create
// the minimal call here for the bot webhook route.

import { StonApiClient, AssetTag } from "@ston-fi/api";

export interface BotSwapAsset {
  contractAddress: string;
  kind: "Ton" | "Jetton";
  symbol: string;
  decimals: number;
  dexPriceUsd?: string;
}

export interface BotSwapQuote {
  offerSymbol: string;
  askSymbol: string;
  offerHuman: string;
  askHuman: string;
  rate: string;
  priceImpact: string;
  feePercent: string;
}

let cachedClient: StonApiClient | null = null;
function client(): StonApiClient {
  if (!cachedClient) cachedClient = new StonApiClient();
  return cachedClient;
}

let assetsCache: { ts: number; data: BotSwapAsset[] } | null = null;
const ASSETS_TTL_MS = 60 * 1000;

export async function loadAssets(): Promise<BotSwapAsset[]> {
  if (assetsCache && Date.now() - assetsCache.ts < ASSETS_TTL_MS) {
    return assetsCache.data;
  }
  const condition = [
    AssetTag.LiquidityVeryHigh,
    AssetTag.LiquidityHigh,
    AssetTag.LiquidityMedium,
  ].join(" | ");
  const assets = await client().queryAssets({ condition });
  const mapped: BotSwapAsset[] = assets.map((a) => ({
    contractAddress: a.contractAddress,
    kind: a.kind === "Ton" ? "Ton" : "Jetton",
    symbol: a.meta?.symbol ?? "???",
    decimals: a.meta?.decimals ?? 9,
    dexPriceUsd: a.dexPriceUsd ?? undefined,
  }));
  assetsCache = { ts: Date.now(), data: mapped };
  return mapped;
}

// Common ticker aliases. STON.fi uses STON.fi-canonical symbols which don't
// always match what users type (Tether is "USD₮", BTC on TON is wrapped, etc.).
// Map user-typed → canonical STON.fi symbol.
const SYMBOL_ALIASES: Record<string, string> = {
  USDT: "USD₮",
  TETHER: "USD₮",
  BTC: "cbBTC",
  WBTC: "cbBTC",
  ETH: "WETH",
};

function normalize(s: string): string {
  // Strip non-alphanumeric and uppercase. Lets "USD₮" match "USDT" via the
  // alias path but also catches accidental whitespace/symbols in user input.
  return s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function findAsset(assets: BotSwapAsset[], query: string): BotSwapAsset | null {
  const q = query.trim();
  if (!q) return null;

  // 1. Direct address match
  const byAddr = assets.find((a) => a.contractAddress.toLowerCase() === q.toLowerCase());
  if (byAddr) return byAddr;

  // 2. Alias → canonical symbol
  const upper = q.toUpperCase();
  const aliased = SYMBOL_ALIASES[upper];
  if (aliased) {
    const hit = assets.find((a) => a.symbol === aliased);
    if (hit) return hit;
  }

  // 3. Exact symbol match (case-insensitive)
  const exact = assets.find((a) => a.symbol.toUpperCase() === upper);
  if (exact) return exact;

  // 4. Normalized symbol match — strips $, ₮, etc. so "USDT" finds "USD₮".
  const qn = normalize(q);
  if (!qn) return null;
  return assets.find((a) => normalize(a.symbol) === qn) ?? null;
}

export async function quoteSwap(
  offer: BotSwapAsset,
  ask: BotSwapAsset,
  offerHumanAmount: string,
): Promise<BotSwapQuote | null> {
  try {
    const offerUnits = humanToUnits(offerHumanAmount, offer.decimals);
    const sim = await client().simulateSwap({
      offerAddress: offer.contractAddress,
      askAddress: ask.contractAddress,
      offerUnits,
      slippageTolerance: "0.01",
    });
    return {
      offerSymbol: offer.symbol,
      askSymbol: ask.symbol,
      offerHuman: offerHumanAmount,
      askHuman: unitsToHuman(sim.askUnits, ask.decimals),
      rate: sim.swapRate,
      priceImpact: sim.priceImpact,
      feePercent: sim.feePercent,
    };
  } catch (e) {
    console.error("[bot:stonfi] quote failed", e);
    return null;
  }
}

function humanToUnits(human: string, decimals: number): string {
  const [whole, frac = ""] = human.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const out = `${whole}${padded}`.replace(/^0+(\d)/, "$1");
  return out || "0";
}

function unitsToHuman(units: string, decimals: number): string {
  const u = units.padStart(decimals + 1, "0");
  const whole = u.slice(0, -decimals) || "0";
  const frac = u.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
