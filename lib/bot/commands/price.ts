import {
  fetchTonPrice,
  fetchBtcPrice,
  fetchEthPrice,
  fetchSolPrice,
  fetchTrxPrice,
} from "@/lib/price-api";
import { loadAssets, findAsset } from "@/lib/bot/stonfi-server";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

const NATIVE: Record<string, () => Promise<number>> = {
  TON: fetchTonPrice,
  BTC: fetchBtcPrice,
  ETH: fetchEthPrice,
  SOL: fetchSolPrice,
  TRX: fetchTrxPrice,
};

export async function handlePrice(parsed: ParsedCommand): Promise<CommandResult> {
  const symbol = parsed.args[0];
  if (!symbol) {
    return { text: "Usage: @bot price <symbol|address>\nExample: price TON" };
  }

  const upper = symbol.toUpperCase();
  if (NATIVE[upper]) {
    const usd = await NATIVE[upper]();
    if (!usd) return { text: `Couldn't fetch ${upper} price right now.` };
    return { text: `${upper}: $${formatUsd(usd)}` };
  }

  // Otherwise try STON.fi for a jetton symbol/address
  const assets = await loadAssets();
  const asset = findAsset(assets, symbol);
  if (!asset) return { text: `Unknown token "${symbol}". Try a symbol like TON or a jetton address.` };
  if (!asset.dexPriceUsd) {
    return { text: `${asset.symbol}: no DEX price available.` };
  }
  return { text: `${asset.symbol}: $${formatUsd(Number(asset.dexPriceUsd))}` };
}

function formatUsd(n: number): string {
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  return n.toPrecision(3);
}
