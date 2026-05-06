import type { Timestamp } from "firebase/firestore";

export function formatRelative(ts: Timestamp | null): string {
  if (!ts) return "";
  const date = ts.toDate();
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const TICKER_RE = /\$([A-Za-z][A-Za-z0-9]{0,9})\b/g;
const URL_RE = /(https?:\/\/[^\s]+)/g;
const HANDLE_RE = /@([a-z0-9][a-z0-9_]{1,18}[a-z0-9])\b/g;

export type RichSegment =
  | { type: "text"; value: string }
  | { type: "ticker"; symbol: string }
  | { type: "url"; href: string }
  | { type: "handle"; handle: string };

/**
 * Tokenize post content into linkable segments. Order: URLs first (they are
 * unambiguous), then $TICKER, then @handle. Anything left is plain text.
 */
export function tokenize(content: string): RichSegment[] {
  if (!content) return [];
  const segments: RichSegment[] = [];
  let cursor = 0;

  const matches: { start: number; end: number; seg: RichSegment }[] = [];
  for (const m of content.matchAll(URL_RE)) {
    matches.push({
      start: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
      seg: { type: "url", href: m[0] },
    });
  }
  for (const m of content.matchAll(TICKER_RE)) {
    const start = m.index ?? 0;
    if (matches.some((x) => start >= x.start && start < x.end)) continue;
    matches.push({
      start,
      end: start + m[0].length,
      seg: { type: "ticker", symbol: m[1].toUpperCase() },
    });
  }
  for (const m of content.matchAll(HANDLE_RE)) {
    const start = m.index ?? 0;
    if (matches.some((x) => start >= x.start && start < x.end)) continue;
    matches.push({
      start,
      end: start + m[0].length,
      seg: { type: "handle", handle: m[1].toLowerCase() },
    });
  }

  matches.sort((a, b) => a.start - b.start);
  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({ type: "text", value: content.slice(cursor, m.start) });
    }
    segments.push(m.seg);
    cursor = m.end;
  }
  if (cursor < content.length) {
    segments.push({ type: "text", value: content.slice(cursor) });
  }
  return segments;
}
