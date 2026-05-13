import { Address } from "@ton/core";
import { getBalance } from "@/lib/ton-api";
import { getAccountJettons } from "@/lib/tonapi-client";
import { fetchTonPrice } from "@/lib/price-api";
import { getBotBinding } from "@/lib/bot/get-binding";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

interface Holding {
  symbol: string;
  amount: number;
  usd: number;
}

interface JettonsResponse {
  balances?: Array<{
    balance?: string;
    jetton?: { symbol?: string; decimals?: number };
    price?: { prices?: Record<string, number> };
  }>;
}

const MAX_ROWS = 10;
const DUST_USD = 0.01;

export async function handlePortfolio(parsed: ParsedCommand): Promise<CommandResult> {
  const binding = await getBotBinding(parsed.fromId);
  if (!binding) {
    return {
      text: "Run `link` first to connect your QC wallet, then try `portfolio` again.",
    };
  }

  let parsedAddr: Address;
  try {
    parsedAddr = Address.parse(binding.walletAddress);
  } catch {
    return { text: "Your linked wallet address looks malformed. Try `link` again." };
  }
  const addr = parsedAddr.toString();

  const [nano, tonUsd, jettonsRaw] = await Promise.all([
    getBalance(addr).catch(() => 0n),
    fetchTonPrice().catch(() => 0),
    getAccountJettons(addr).catch(() => ({ balances: [] }) as JettonsResponse),
  ]);

  const holdings: Holding[] = [];

  const ton = Number(nano) / 1e9;
  if (ton > 0) {
    holdings.push({ symbol: "TON", amount: ton, usd: ton * (tonUsd || 0) });
  }

  const balances = (jettonsRaw as JettonsResponse).balances ?? [];
  for (const j of balances) {
    const decimals = j.jetton?.decimals ?? 9;
    if (!j.balance) continue;
    const amount = Number(BigInt(j.balance)) / Math.pow(10, decimals);
    if (amount <= 0) continue;
    const priceUsd = readUsdPrice(j.price?.prices);
    const usd = amount * priceUsd;
    holdings.push({
      symbol: j.jetton?.symbol ?? "???",
      amount,
      usd,
    });
  }

  if (holdings.length === 0) {
    return { text: "No holdings on your linked wallet yet." };
  }

  // Sort by USD value desc; dust (under $0.01) gets a stable position at the end.
  holdings.sort((a, b) => b.usd - a.usd);
  const visible = holdings.filter((h) => h.usd >= DUST_USD || h.symbol === "TON");
  const display = visible.slice(0, MAX_ROWS);
  const totalUsd = holdings.reduce((sum, h) => sum + h.usd, 0);
  const hiddenCount = holdings.length - display.length;

  const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  const lines: string[] = [
    `Portfolio — ${short}`,
    "",
    ...display.map(formatRow),
  ];
  if (hiddenCount > 0) {
    lines.push(`+${hiddenCount} more`);
  }
  lines.push("", `Total: ~$${formatUsd(totalUsd)}`);

  return { text: lines.join("\n") };
}

// "TON         1.25 · $5.50"
function formatRow(h: Holding): string {
  const sym = h.symbol.slice(0, 10).padEnd(10);
  const amt = formatAmount(h.amount);
  const usd = h.usd >= DUST_USD ? ` · $${formatUsd(h.usd)}` : "";
  return `${sym} ${amt}${usd}`;
}

function readUsdPrice(prices: Record<string, number> | undefined): number {
  if (!prices) return 0;
  // TonAPI returns the key with uppercase USD; tolerate variants defensively.
  return (
    prices.USD ??
    prices.usd ??
    prices.Usd ??
    Object.entries(prices).find(([k]) => k.toLowerCase() === "usd")?.[1] ??
    0
  );
}

function formatAmount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.0001) return n.toFixed(4);
  return n.toPrecision(2);
}

function formatUsd(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  return n.toPrecision(2);
}
