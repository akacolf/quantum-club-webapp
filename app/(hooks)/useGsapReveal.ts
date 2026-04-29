"use client";

import { useRef, type RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export interface GsapRevealOptions {
  /** Starting Y offset in px (default: 40) */
  y?: number;
  /** Starting opacity (default: 0) */
  opacity?: number;
  /** Duration in seconds (default: 0.7) */
  duration?: number;
  /** Delay in seconds (default: 0) */
  delay?: number;
  /** GSAP easing (default: "power3.out") */
  ease?: string;
  /** When to start the animation relative to the viewport (default: "bottom-=60") */
  start?: string;
  /** Disable ScrollTrigger and play on mount instead (default: false) */
  immediate?: boolean;
  /** Starting scale (default: 1) */
  scale?: number;
  /** Starting X offset in px (default: 0) */
  x?: number;
}

/**
 * Smoothly reveals an element with GSAP — either on scroll or on mount.
 *
 * Uses the official @gsap/react useGSAP() hook for proper cleanup.
 *
 * Usage:
 * ```tsx
 * const ref = useGsapReveal<HTMLDivElement>({ y: 30 });
 * return <div ref={ref}>…</div>;
 * ```
 */
export function useGsapReveal<T extends HTMLElement = HTMLDivElement>(
  options: GsapRevealOptions = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);

  const {
    y = 40,
    x = 0,
    opacity = 0,
    duration = 0.7,
    delay = 0,
    ease = "power3.out",
    start = "bottom-=60",
    immediate = false,
    scale = 1,
  } = options;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      if (immediate) {
        gsap.fromTo(
          el,
          { y, x, opacity, scale },
          { y: 0, x: 0, opacity: 1, scale: 1, duration, delay, ease },
        );
      } else {
        gsap.fromTo(
          el,
          { y, x, opacity, scale },
          {
            y: 0,
            x: 0,
            opacity: 1,
            scale: 1,
            duration,
            delay,
            ease,
            scrollTrigger: {
              trigger: el,
              start: `top ${start}`,
              toggleActions: "play none none none",
            },
          },
        );
      }
    },
    {
      scope: ref,
      dependencies: [delay, duration, ease, immediate, opacity, scale, start, x, y],
      revertOnUpdate: true,
    },
  );

  return ref;
}
