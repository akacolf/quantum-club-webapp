"use client";

import { useRef, type RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export interface GsapStaggerOptions {
  /** CSS selector for children to stagger (default: "> *") */
  childSelector?: string;
  /** Starting Y offset in px (default: 30) */
  y?: number;
  /** Starting opacity (default: 0) */
  opacity?: number;
  /** Duration per item in seconds (default: 0.55) */
  duration?: number;
  /** Stagger delay between items in seconds (default: 0.08) */
  stagger?: number;
  /** Initial delay before the first item (default: 0.1) */
  delay?: number;
  /** GSAP easing (default: "power3.out") */
  ease?: string;
}

/**
 * Staggers child elements in on mount for a polished page-entrance feel.
 *
 * Usage:
 * ```tsx
 * const containerRef = useGsapStagger<HTMLDivElement>();
 * return <div ref={containerRef}><Card /><Card /><Card /></div>;
 * ```
 */
export function useGsapStagger<T extends HTMLElement = HTMLDivElement>(
  options: GsapStaggerOptions = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);

  const {
    childSelector = "> *",
    y = 30,
    opacity = 0,
    duration = 0.55,
    stagger = 0.08,
    delay = 0.1,
    ease = "power3.out",
  } = options;

  useGSAP(
    () => {
      const container = ref.current;
      if (!container) return;

      const children = container.querySelectorAll(childSelector);
      if (!children.length) return;

      gsap.fromTo(
        children,
        { y, opacity },
        { y: 0, opacity: 1, duration, stagger, delay, ease },
      );
    },
    {
      scope: ref,
      dependencies: [childSelector, delay, duration, ease, opacity, stagger, y],
      revertOnUpdate: true,
    },
  );

  return ref;
}
