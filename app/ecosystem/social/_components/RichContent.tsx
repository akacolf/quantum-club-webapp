"use client";

import Link from "next/link";
import type { Route } from "next";
import { tokenize } from "./format";

interface Props {
  content: string;
  /** Smaller text inside reply lists */
  size?: "sm" | "md";
}

/**
 * Renders a post body with $TICKER, @handle, and bare URLs turned into
 * underlined links — matches the design rule that link affordance is the
 * underline (not just color).
 */
export function RichContent({ content, size = "md" }: Props) {
  if (!content) return null;
  const segments = tokenize(content);

  return (
    <p
      className={
        size === "sm"
          ? "text-[13px] text-foreground whitespace-pre-wrap break-words"
          : "text-sm text-foreground whitespace-pre-wrap break-words"
      }
    >
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        if (seg.type === "url") {
          return (
            <a
              key={i}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {seg.href}
            </a>
          );
        }
        if (seg.type === "ticker") {
          return (
            <Link
              key={i}
              href={`/ecosystem/trade?q=${seg.symbol}` as Route}
              className="text-primary underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              ${seg.symbol}
            </Link>
          );
        }
        // handle
        return (
          <Link
            key={i}
            href={`/ecosystem/social/${seg.handle}` as Route}
            className="text-primary underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            @{seg.handle}
          </Link>
        );
      })}
    </p>
  );
}
