"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedPriceProps {
  value: number;
  prefix?: string;
  decimals?: number;
  className?: string;
  showDirection?: boolean;
}

/**
 * Price component that shows direction changes without route-blocking animation work.
 */
export function AnimatedPrice({
  value,
  prefix = "$",
  decimals = 2,
  className = "",
  showDirection = true,
}: AnimatedPriceProps) {
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const previousValue = previousValueRef.current;

    if (value > previousValue) {
      queueMicrotask(() => setDirection("up"));
    } else if (value < previousValue) {
      queueMicrotask(() => setDirection("down"));
    } else {
      return;
    }

    previousValueRef.current = value;
    const timeout = setTimeout(() => setDirection(null), 1500);

    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-1 transition-colors ${className}`}
    >
      <span>
        {prefix}{value.toFixed(decimals)}
      </span>
      {showDirection && direction && (
        <span
          className={`inline-flex items-center text-xs transition-opacity ${
            direction === "up" ? "text-green-500" : "text-red-500"
          }`}
        >
          {direction === "up" ? (
            <svg className="w-3 h-3 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3 h-3 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * Balance component for larger displays.
 */
export function AnimatedBalance({
  value,
  prefix = "$",
  decimals = 2,
  className = "",
}: Omit<AnimatedPriceProps, "showDirection">) {
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const previousValue = previousValueRef.current;

    if (value > previousValue) {
      queueMicrotask(() => setFlashColor("text-green-400"));
    } else if (value < previousValue) {
      queueMicrotask(() => setFlashColor("text-red-400"));
    } else {
      return;
    }

    previousValueRef.current = value;
    const timeout = setTimeout(() => setFlashColor(null), 1000);

    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <span
      className={`transition-colors duration-300 ${flashColor || ""} ${className}`}
    >
      {prefix}{value.toFixed(decimals)}
    </span>
  );
}
