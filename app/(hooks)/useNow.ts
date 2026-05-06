"use client";

import { useEffect, useState } from "react";

/**
 * Returns the current time in ms, refreshed on a slow interval. Use in place
 * of inline `Date.now()` during render — calling `Date.now` in the body of a
 * component is impure and trips the React Compiler purity rule.
 *
 * Default 60s interval is fine for things like "is X past expiry" checks
 * where second-level accuracy doesn't matter.
 */
export function useNow(intervalMs: number = 60_000): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
