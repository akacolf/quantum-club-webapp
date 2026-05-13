import { Address } from "@ton/core";
import { tonApiGet } from "@/lib/tonapi-client";
import { getBotBinding } from "@/lib/bot/get-binding";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

const MAX_ROWS = 5;

interface EventsResponse {
  events?: Array<{
    event_id: string;
    timestamp: number;
    in_progress?: boolean;
    actions?: Array<{
      type: string;
      TonTransfer?: {
        amount?: string | number;
        recipient?: { address?: string };
        sender?: { address?: string };
      };
      JettonTransfer?: {
        amount?: string;
        recipient?: { address?: string };
        sender?: { address?: string };
        jetton?: { symbol?: string; decimals?: number };
      };
      JettonSwap?: {
        amount_in?: string;
        amount_out?: string;
        ton_in?: string | number;
        ton_out?: string | number;
        jetton_master_in?: { symbol?: string; decimals?: number };
        jetton_master_out?: { symbol?: string; decimals?: number };
      };
      NftItemTransfer?: {
        recipient?: { address?: string };
        sender?: { address?: string };
      };
    }>;
  }>;
}

export async function handleTransactions(
  parsed: ParsedCommand,
): Promise<CommandResult> {
  const binding = await getBotBinding(parsed.fromId);
  if (!binding) {
    return {
      text: "Run `link` first to connect your QC wallet, then try `transactions` again.",
    };
  }

  let userAddr: string;
  try {
    userAddr = Address.parse(binding.walletAddress).toString();
  } catch {
    return { text: "Your linked wallet address looks malformed. Try `link` again." };
  }

  const data = await tonApiGet<EventsResponse>(
    `/v2/accounts/${encodeURIComponent(userAddr)}/events?limit=${MAX_ROWS}&subject_only=true`,
  ).catch(() => null);

  if (!data) {
    return { text: "Couldn't fetch recent activity. Try again in a moment." };
  }

  const events = data.events ?? [];
  if (events.length === 0) {
    return { text: "No recent activity on your linked wallet." };
  }

  const lines: string[] = ["Recent activity"];
  for (const ev of events) {
    const line = formatEvent(ev, userAddr);
    if (line) lines.push(line);
  }

  if (lines.length === 1) {
    return { text: "No recognizable transactions in the last few events." };
  }

  return { text: lines.join("\n") };
}

function formatEvent(
  ev: NonNullable<EventsResponse["events"]>[number],
  userAddr: string,
): string | null {
  const action = ev.actions?.find((a) => a.type !== "Unknown") ?? ev.actions?.[0];
  if (!action) return null;
  const ago = timeAgo(ev.timestamp);

  if (action.TonTransfer) {
    const t = action.TonTransfer;
    const amount = Number(t.amount ?? 0) / 1e9;
    const sent = sameAddr(t.sender?.address, userAddr);
    const verb = sent ? "Sent" : "Received";
    const other = shortAddr(sent ? t.recipient?.address : t.sender?.address);
    return `${verb} ${formatAmount(amount)} TON ${sent ? "to" : "from"} ${other} - ${ago}`;
  }

  if (action.JettonTransfer) {
    const t = action.JettonTransfer;
    const decimals = t.jetton?.decimals ?? 9;
    const amount = Number(BigInt(t.amount ?? "0")) / Math.pow(10, decimals);
    const sym = t.jetton?.symbol ?? "JET";
    const sent = sameAddr(t.sender?.address, userAddr);
    const verb = sent ? "Sent" : "Received";
    const other = shortAddr(sent ? t.recipient?.address : t.sender?.address);
    return `${verb} ${formatAmount(amount)} ${sym} ${sent ? "to" : "from"} ${other} - ${ago}`;
  }

  if (action.JettonSwap) {
    const s = action.JettonSwap;
    const fromSym = s.jetton_master_in?.symbol ?? (s.ton_in ? "TON" : "?");
    const toSym = s.jetton_master_out?.symbol ?? (s.ton_out ? "TON" : "?");
    const fromAmt = s.ton_in
      ? Number(s.ton_in) / 1e9
      : Number(BigInt(s.amount_in ?? "0")) / Math.pow(10, s.jetton_master_in?.decimals ?? 9);
    const toAmt = s.ton_out
      ? Number(s.ton_out) / 1e9
      : Number(BigInt(s.amount_out ?? "0")) / Math.pow(10, s.jetton_master_out?.decimals ?? 9);
    return `Swap ${formatAmount(fromAmt)} ${fromSym} for ${formatAmount(toAmt)} ${toSym} - ${ago}`;
  }

  if (action.NftItemTransfer) {
    const t = action.NftItemTransfer;
    const sent = sameAddr(t.sender?.address, userAddr);
    const other = shortAddr(sent ? t.recipient?.address : t.sender?.address);
    return `${sent ? "Sent" : "Received"} NFT ${sent ? "to" : "from"} ${other} - ${ago}`;
  }

  return null;
}

function sameAddr(a: string | undefined, b: string): boolean {
  if (!a) return false;
  try {
    return Address.parse(a).equals(Address.parse(b));
  } catch {
    return false;
  }
}

function shortAddr(a: string | undefined): string {
  if (!a) return "?";
  try {
    const s = Address.parse(a).toString();
    return `${s.slice(0, 4)}…${s.slice(-4)}`;
  } catch {
    return a.slice(0, 6);
  }
}

function timeAgo(seconds: number): string {
  const diff = Math.max(0, Date.now() / 1000 - seconds);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatAmount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.0001) return n.toFixed(4);
  return n.toPrecision(2);
}
