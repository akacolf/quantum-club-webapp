import { Address } from "@ton/core";
import { getBalance } from "@/lib/ton-api";
import { fetchTonPrice } from "@/lib/price-api";
import { getBotBinding } from "@/lib/bot/get-binding";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

export async function handleBalance(parsed: ParsedCommand): Promise<CommandResult> {
  let addr = parsed.args[0];

  // No address arg → fall back to the user's bound wallet (set via /link).
  // This is the personalized path — `balance` with no args means "my balance".
  if (!addr) {
    const binding = await getBotBinding(parsed.fromId);
    if (!binding) {
      return {
        text: "Run `link` first to bind your wallet, or pass an address: `balance <address>`.",
      };
    }
    addr = binding.walletAddress;
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
