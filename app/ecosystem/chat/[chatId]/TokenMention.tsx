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

export type MessageSegment =
    | { type: "text"; content: string }
    | { type: "mention"; symbol: string }
    | { type: "link"; href: string; label: string };

const MENTION_REGEX = /\$([A-Za-z][A-Za-z0-9]{1,9})\b/g;
// http(s) URL or bare www.* — terminated by whitespace. Trailing punctuation is
// trimmed below so things like "see https://x.com." don't keep the dot in the link.
const LINK_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const TRAILING_PUNCT = /[)\].,;:!?'"]+$/;

function safeUrl(raw: string): string | null {
    try {
        const candidate = raw.startsWith("http") ? raw : `https://${raw}`;
        const u = new URL(candidate);
        if (u.protocol !== "http:" && u.protocol !== "https:") return null;
        return u.toString();
    } catch {
        return null;
    }
}

function splitLinks(text: string): MessageSegment[] {
    const out: MessageSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    LINK_REGEX.lastIndex = 0;
    while ((match = LINK_REGEX.exec(text)) !== null) {
        let raw = match[0];
        const trail = raw.match(TRAILING_PUNCT)?.[0] ?? "";
        if (trail) raw = raw.slice(0, raw.length - trail.length);
        const href = safeUrl(raw);
        const start = match.index;
        if (start > lastIndex) {
            out.push({ type: "text", content: text.slice(lastIndex, start) });
        }
        if (href) {
            out.push({ type: "link", href, label: raw });
        } else {
            out.push({ type: "text", content: raw });
        }
        lastIndex = start + raw.length;
        if (trail) {
            out.push({ type: "text", content: trail });
            lastIndex += trail.length;
        }
    }
    if (lastIndex < text.length) {
        out.push({ type: "text", content: text.slice(lastIndex) });
    }
    return out;
}

/**
 * Split a message into text / mention / link segments for rendering.
 * Mentions are `$SYMBOL` (2–10 alphanumeric, letter-leading). Links are
 * http(s) URLs or bare `www.*` runs.
 */
export function parseMessageSegments(text: string): MessageSegment[] {
    const segments: MessageSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    MENTION_REGEX.lastIndex = 0;
    while ((match = MENTION_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push(...splitLinks(text.slice(lastIndex, match.index)));
        }
        segments.push({ type: "mention", symbol: match[1] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        segments.push(...splitLinks(text.slice(lastIndex)));
    }
    return segments;
}
