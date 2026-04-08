"use client";

import Link from "next/link";
import type { Route } from "next";
import { useTokenBySymbol } from "@/app/(hooks)/queries/use-trading";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface TokenMentionProps {
    symbol: string;
}

/**
 * Rich inline preview for $SYMBOL mentions inside chat messages.
 *
 * Looks up the symbol in the on-chain `tokens` collection via TanStack Query
 * (queryKey is shared across every mention of the same symbol, so N mentions
 * of $QNTM in a conversation cost one fetch). Tapping navigates to the trade
 * page for the token, or falls back to a token search if the symbol isn't
 * a recognized QC token.
 */
export function TokenMention({ symbol }: TokenMentionProps) {
    const { data: token } = useTokenBySymbol(symbol);

    const href: Route = token
        ? (`/ecosystem/trade/${token.id}` as Route)
        : (`/ecosystem/trade?q=${encodeURIComponent(symbol)}` as Route);

    const priceChange = token?.priceChange24h;
    const showChange = typeof priceChange === "number" && priceChange !== 0;

    return (
        <Link
            href={href}
            onClick={() => haptics.light()}
            className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-px align-baseline",
                "bg-primary/15 text-primary hover:bg-primary/25",
                "text-[12px] font-semibold transition-colors",
            )}
        >
            <span>${symbol.toUpperCase()}</span>
            {showChange && (
                <span
                    className={cn(
                        "text-[10px] font-medium tabular-nums",
                        priceChange > 0 ? "text-green-500" : "text-red-500",
                    )}
                >
                    {priceChange > 0 ? "+" : ""}
                    {priceChange.toFixed(1)}%
                </span>
            )}
        </Link>
    );
}

/**
 * Split a message into text / mention segments for rendering.
 * Mentions are `$SYMBOL` where SYMBOL is 2-10 alphanumeric chars starting
 * with a letter (so "$1" doesn't match, but "$TON" and "$QNTM" do).
 */
export type MessageSegment =
    | { type: "text"; content: string }
    | { type: "mention"; symbol: string };

const MENTION_REGEX = /\$([A-Za-z][A-Za-z0-9]{1,9})\b/g;

export function parseMessageSegments(text: string): MessageSegment[] {
    const segments: MessageSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    // Reset regex state since the pattern has the /g flag
    MENTION_REGEX.lastIndex = 0;
    while ((match = MENTION_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
        }
        segments.push({ type: "mention", symbol: match[1] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        segments.push({ type: "text", content: text.slice(lastIndex) });
    }
    return segments;
}
