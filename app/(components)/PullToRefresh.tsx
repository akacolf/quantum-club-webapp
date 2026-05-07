"use client";

import { useEffect, useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { ButtonLoader } from "./ButtonLoader";

interface Props {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  /** Pixels of pull required to commit a refresh. */
  threshold?: number;
  className?: string;
}

/**
 * Android-style pull-to-refresh. The body content stays put — only a small
 * floating chip (the spinner) translates in from above the viewport while the
 * user pulls. Engages only when the page is already scrolled to the top.
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 70,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const armedRef = useRef(false);
  const reachedRef = useRef(false);

  // Block native page bounce while a pull is engaged so the chip doesn't
  // fight with iOS rubber-banding. We only flip overscroll-behavior while
  // armed, and restore it the moment the gesture ends.
  useEffect(() => {
    if (!armedRef.current && pull === 0 && !refreshing) return;
    const prev = document.documentElement.style.overscrollBehaviorY;
    document.documentElement.style.overscrollBehaviorY = "contain";
    return () => {
      document.documentElement.style.overscrollBehaviorY = prev;
    };
  }, [pull, refreshing]);

  useDrag(
    ({ first, last, movement: [, my], cancel }) => {
      if (refreshing) return;

      if (first) {
        const atTop =
          typeof window !== "undefined" &&
          window.scrollY <= 0 &&
          document.documentElement.scrollTop <= 0;
        if (!atTop || my < 0) {
          armedRef.current = false;
          cancel();
          return;
        }
        armedRef.current = true;
        reachedRef.current = false;
      }
      if (!armedRef.current) return;

      if (my <= 0) {
        setPull(0);
        return;
      }

      // Soft cap past the threshold so the chip eases instead of running off.
      const eased = my < threshold ? my : threshold + (my - threshold) * 0.35;
      setPull(eased);

      if (my >= threshold && !reachedRef.current) {
        reachedRef.current = true;
        haptics.light();
      } else if (my < threshold && reachedRef.current) {
        reachedRef.current = false;
      }

      if (last) {
        if (my >= threshold) {
          haptics.medium();
          setRefreshing(true);
          setPull(0);
          Promise.resolve(onRefresh()).finally(() => {
            setRefreshing(false);
          });
        } else {
          setPull(0);
        }
      }
    },
    {
      target: ref,
      axis: "y",
      filterTaps: true,
      eventOptions: { passive: true },
    },
  );

  // Chip slides from -40px (just out of view) to ~24px (resting position)
  // as pull goes from 0 → threshold. While refreshing it locks at rest.
  const chipTranslate = refreshing
    ? 24
    : pull > 0
      ? -40 + Math.min(pull / threshold, 1.4) * 64
      : -40;
  const chipVisible = refreshing || pull > 0;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center"
        aria-hidden
      >
        <div
          className={cn(
            "rounded-full bg-secondary/90 backdrop-blur-md shadow-lg px-3 py-2 flex items-center gap-2 text-xs transition-opacity duration-150",
            chipVisible ? "opacity-100" : "opacity-0",
          )}
          style={{
            transform: `translateY(${chipTranslate}px)`,
            transition:
              !refreshing && pull === 0
                ? "transform 200ms ease-out"
                : undefined,
          }}
        >
          {refreshing ? (
            <ButtonLoader size="sm" />
          ) : (
            <ButtonLoader size="sm" />
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
