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

export function findAsset(assets: BotSwapAsset[], query: string): BotSwapAsset | null {
  const q = query.trim();
  if (!q) return null;
  // Direct address match
  const byAddr = assets.find((a) => a.contractAddress.toLowerCase() === q.toLowerCase());
  if (byAddr) return byAddr;
  // Symbol match (case-insensitive)
  const upper = q.toUpperCase();
  return assets.find((a) => a.symbol.toUpperCase() === upper) ?? null;
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
