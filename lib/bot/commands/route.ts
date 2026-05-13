import { loadAssets, findAsset, quoteSwap } from "@/lib/bot/stonfi-server";
import { miniAppLink } from "@/lib/bot/deeplink";
import type { CommandResult, ParsedCommand } from "@/lib/bot/types";

// Usage: route <amount> <FROM> <TO>
// e.g. route 100 USDT TON
export async function handleRoute(parsed: ParsedCommand): Promise<CommandResult> {
  const [amountRaw, fromSym, toSym] = parsed.args;
  if (!amountRaw || !fromSym || !toSym) {
    return { text: "Usage: @bot route <amount> <FROM> <TO>\nExample: route 100 USDT TON" };
  }
  if (!/^\d+(\.\d+)?$/.test(amountRaw)) {
    return { text: `"${amountRaw}" is not a valid amount.` };
  }

  const assets = await loadAssets();
  const offer = findAsset(assets, fromSym);
  const ask = findAsset(assets, toSym);
  if (!offer) return { text: `Unknown token "${fromSym}".` };
  if (!ask) return { text: `Unknown token "${toSym}".` };
  if (offer.contractAddress === ask.contractAddress) {
    return { text: "Pick two different tokens." };
  }

  const quote = await quoteSwap(offer, ask, amountRaw);
  if (!quote) {
    return { text: `Couldn't quote ${fromSym} to ${toSym}. Pool may be illiquid.` };
  }

  const impact = (Number(quote.priceImpact) * 100).toFixed(2);
  const fee = (Number(quote.feePercent) * 100).toFixed(2);
  const text =
    `${quote.offerHuman} ${quote.offerSymbol} for ~${trim(quote.askHuman)} ${quote.askSymbol}\n` +
    `Rate: 1 ${quote.offerSymbol} = ${trim(quote.rate)} ${quote.askSymbol}\n` +
    `Impact: ${impact}%   Fee: ${fee}%`;

  return {
    text,
    replyMarkup: {
      inline_keyboard: [
        [
          {
            text: "Swap in QC",
            url: miniAppLink(`swap_${offer.symbol}_${ask.symbol}_${quote.offerHuman}`),
          },
        ],
      ],
    },
  };
}

function trim(n: string): string {
  const num = Number(n);
  if (!isFinite(num)) return n;
  if (num >= 1) return num.toFixed(4).replace(/\.?0+$/, "");
  return num.toPrecision(4);
}
