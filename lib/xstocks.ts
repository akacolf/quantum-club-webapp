/**
 * xStocks: tokenized US-equity Jettons (Backed Finance brand) bridged to TON
 * and trafficked via STON.fi. Each token tracks the price of an underlying
 * security 1:1 — they are *not* the underlying shares, do not carry voting
 * rights, and are subject to issuer/custodian risk.
 *
 * Identification: Backed names every xStock as `<TICKER>x` (e.g. AAPLx,
 * TSLAx). We filter the STON.fi swappable-asset list by this pattern plus a
 * known-ticker allow-list, so a random Jetton named `MEMEx` doesn't slip in.
 *
 * Update path: when Backed lists a new ticker on https://ston.fi/xstocks,
 * append it to TICKERS below — no other plumbing required.
 */
export const XSTOCKS_TICKERS = [
    "AAPL",
    "TSLA",
    "COIN",
    "NVDA",
    "MSTR",
    "SPY",
    "GLD",
    "MSFT",
    "GOOGL",
    "AMZN",
    "META",
    "QQQ",
    "BRK",
    "NFLX",
    "AMD",
    "AVGO",
    "ORCL",
    "ADBE",
    "CRM",
    "PYPL",
    "DIS",
    "WMT",
    "MCD",
    "KO",
    "PEP",
    "JPM",
    "V",
    "MA",
    "HOOD",
    "PLTR",
    "CRCL",
] as const;

const TICKER_SET = new Set<string>(XSTOCKS_TICKERS);

export function isXStockSymbol(symbol: string | undefined | null): boolean {
    if (!symbol) return false;
    if (!/^[A-Z]{1,5}x$/.test(symbol)) return false;
    return TICKER_SET.has(symbol.slice(0, -1));
}

export function underlyingTicker(symbol: string): string {
    return symbol.replace(/x$/, "");
}

export const XSTOCKS_ACK_LOCAL_KEY = "qc_xstocks_acknowledged_at_v1";
