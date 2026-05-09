import { Address } from "@ton/core";
import { getBalance } from "@/lib/ton-api";
import { fetchTonPrice } from "@/lib/price-api";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

export async function handleBalance(parsed: ParsedCommand): Promise<CommandResult> {
  const addr = parsed.args[0];
  if (!addr) {
    return { text: "Usage: @bot balance <address>" };
  }

  let parsedAddr: Address;
  try {
    parsedAddr = Address.parse(addr);
  } catch {
    return { text: `"${addr}" is not a valid TON address.` };
  }

  const [nano, tonUsd] = await Promise.all([getBalance(parsedAddr.toString()), fetchTonPrice()]);
  const ton = Number(nano) / 1e9;
  const usd = tonUsd ? ton * tonUsd : 0;

  const short = `${parsedAddr.toString().slice(0, 4)}…${parsedAddr.toString().slice(-4)}`;
  const text =
    `Balance for ${short}\n` +
    `${ton.toFixed(4)} TON${usd ? `  ·  ~$${usd.toFixed(2)}` : ""}`;
  return { text };
}
