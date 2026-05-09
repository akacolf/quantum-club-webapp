import { handlePrice } from "./commands/price";
import { handleRoute } from "./commands/route";
import { handleApe } from "./commands/ape";
import { handleBalance } from "./commands/balance";
import type { CommandResult, ParsedCommand } from "./types";

const HELP: CommandResult = {
  text:
    "QC Bot — guest mode\n" +
    "• price <symbol|address>\n" +
    "• route <amount> <FROM> <TO>\n" +
    "• ape <jetton-address>\n" +
    "• balance <address>",
};

export async function dispatch(parsed: ParsedCommand): Promise<CommandResult> {
  switch (parsed.command) {
    case "price":
      return handlePrice(parsed);
    case "route":
    case "swap":
      return handleRoute(parsed);
    case "ape":
    case "buy":
      return handleApe(parsed);
    case "balance":
    case "bal":
      return handleBalance(parsed);
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
