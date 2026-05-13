import { handlePrice } from "./commands/price";
import { handleRoute } from "./commands/route";
import { handleApe } from "./commands/ape";
import { handleBalance } from "./commands/balance";
import { handleLink } from "./commands/link";
import { handlePortfolio } from "./commands/portfolio";
import { handleTransactions } from "./commands/transactions";
import { handleSwap } from "./commands/swap";
import { handleWatch, handleUnwatch } from "./commands/watch";
import type { CommandResult, ParsedCommand } from "./types";

const HELP: CommandResult = {
  text:
    "QC Bot\n" +
    "- price <symbol|address>\n" +
    "- route <amount> <FROM> <TO>   quote only\n" +
    "- swap <amount> <FROM> <TO>    quote + sign in QC\n" +
    "- ape <jetton-address>\n" +
    "- balance [address]   (omit address after `link` to use your wallet)\n" +
    "- portfolio   all your holdings on TON\n" +
    "- transactions   recent activity on your linked wallet\n" +
    "- watch <symbol> <above|below> <price>   DM me when it crosses\n" +
    "- unwatch <symbol>   remove an alert (or `unwatch all`)\n" +
    "- link   connect your QC wallet for personalized commands",
};

// Lowercase command words (and aliases) the deterministic dispatcher knows.
// Used by the webhook to decide whether to fall through to the LLM intent layer.
export const KNOWN_COMMANDS = new Set([
  "price",
  "route", "swap",
  "ape", "buy",
  "balance", "bal",
  "portfolio", "holdings", "assets",
  "transactions", "tx", "history", "activity",
  "watch", "alert", "alerts",
  "unwatch",
  "link", "connect",
  "help", "?", "start",
]);

export async function dispatch(parsed: ParsedCommand): Promise<CommandResult> {
  switch (parsed.command) {
    case "price":
      return handlePrice(parsed);
    case "route":
      return handleRoute(parsed);
    case "swap":
      return handleSwap(parsed);
    case "ape":
    case "buy":
      return handleApe(parsed);
    case "balance":
    case "bal":
      return handleBalance(parsed);
    case "portfolio":
    case "holdings":
    case "assets":
      return handlePortfolio(parsed);
    case "transactions":
    case "tx":
    case "history":
    case "activity":
      return handleTransactions(parsed);
    case "watch":
    case "alert":
    case "alerts":
      return handleWatch(parsed);
    case "unwatch":
      return handleUnwatch(parsed);
    case "link":
    case "connect":
      return handleLink(parsed);
    case "help":
    case "?":
    case "start":
      return HELP;
    default:
      return {
        text: `Unknown command "${parsed.command}". Type @bot help.`,
      };
  }
}
