"use client";

import { useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { ButtonLoader } from "./ButtonLoader";

interface Props {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  /**
   * Pixels the user has to drag past before we treat the gesture as a
   * refresh. Defaults to 70 — far enough to feel deliberate, close enough
   * to feel responsive.
   */
  threshold?: number;
  className?: string;
}

/**
 * Pull-to-refresh gesture wrapper. Drags from the top of the scroll
 * container; once past `threshold` the indicator latches green and on
 * release we fire `onRefresh`. We only intercept the gesture when the
 * page is already scrolled to the top, so normal scroll keeps working.
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

  useDrag(
    ({ first, last, movement: [, my], cancel, event }) => {
      if (refreshing) return;

      // Only engage when the page is at the very top — otherwise we'd
      // hijack normal upward scroll inertia.
      if (first) {
        const atTop =
          (typeof window !== "undefined" && window.scrollY <= 0) &&
          (document.documentElement.scrollTop <= 0);
        if (!atTop || my < 0) {
          armedRef.current = false;
          cancel();
          return;
        }
        armedRef.current = true;
      }
      if (!armedRef.current) return;

      if (my <= 0) {
        setPull(0);
        return;
      }
      // Rubber-band: ease the pull so it feels natural past the threshold.
      const eased = my < threshold ? my : threshold + (my - threshold) * 0.4;
      setPull(eased);

      if (last) {
        if (my >= threshold) {
          haptics.medium();
          setRefreshing(true);
          (event as Event)?.preventDefault?.();
          Promise.resolve(onRefresh()).finally(() => {
            setRefreshing(false);
            setPull(0);
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

  const showIndicator = pull > 0 || refreshing;
  const indicatorOpacity = refreshing ? 1 : Math.min(1, pull / threshold);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        className={cn(
          "pointer-events-none absolute left-0 right-0 -top-2 flex justify-center transition-transform",
          showIndicator ? "" : "opacity-0",
        )}
        style={{
          transform: `translateY(${refreshing ? threshold : pull}px)`,
          opacity: indicatorOpacity,
        }}
        aria-hidden
      >
        <div className="rounded-full bg-secondary/80 backdrop-blur px-3 py-1.5 flex items-center gap-2 text-xs">
          {refreshing ? (
            <>
              <ButtonLoader size="sm" />
              <span className="text-muted-foreground">Refreshing…</span>
            </>
          ) : (
            <span
              className={cn(
                "text-muted-foreground transition-colors",
                pull >= threshold && "text-primary",
              )}
            >
              {pull >= threshold ? "Release to refresh" : "Pull to refresh"}
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          transform: refreshing
            ? `translateY(${threshold}px)`
            : pull > 0
              ? `translateY(${pull}px)`
              : undefined,
          transition: pull === 0 && !refreshing ? "transform 200ms" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
