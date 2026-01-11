"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface AnimatedPriceProps {
  value: number;
  prefix?: string;
  decimals?: number;
  className?: string;
  showDirection?: boolean;
}

/**
 * Animated price component that shows smooth transitions when price changes
 * Uses GSAP for fluid number animations with direction indicators
 */
export function AnimatedPrice({
  value,
  prefix = "$",
  decimals = 2,
  className = "",
  showDirection = true,
}: AnimatedPriceProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const previousValue = useRef<number>(value);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const animatedValue = useRef<{ val: number }>({ val: value });

  useEffect(() => {
    if (!valueRef.current) return;

    const prevVal = previousValue.current;
    const newVal = value;

    // Determine direction
    if (newVal > prevVal) {
      setDirection("up");
    } else if (newVal < prevVal) {
      setDirection("down");
    }

    // Animate the number
    gsap.to(animatedValue.current, {
      val: newVal,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => {
        if (valueRef.current) {
          valueRef.current.textContent = `${prefix}${animatedValue.current.val.toFixed(decimals)}`;
        }
      },
    });

    // Flash animation on the container
    if (containerRef.current && prevVal !== newVal) {
      const color = newVal > prevVal ? "#22c55e" : "#ef4444"; // green or red
      
      gsap.fromTo(
        containerRef.current,
        { 
          backgroundColor: `${color}20`,
          scale: 1.02,
        },
        {
          backgroundColor: "transparent",
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
        }
      );
    }

    // Clear direction indicator after animation
    const timeout = setTimeout(() => {
      setDirection(null);
    }, 1500);

    previousValue.current = newVal;

    return () => clearTimeout(timeout);
  }, [value, prefix, decimals]);

  return (
    <span
      ref={containerRef}
      className={`inline-flex items-center gap-1.5 rounded-lg px-1 transition-colors ${className}`}
    >
      <span ref={valueRef}>
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
 * Animated balance component for larger displays
 * Shows smooth counting animation with color flash on change
 */
export function AnimatedBalance({
  value,
  prefix = "$",
  decimals = 2,
  className = "",
}: Omit<AnimatedPriceProps, "showDirection">) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const previousValue = useRef<number>(value);
  const animatedValue = useRef<{ val: number }>({ val: value });
  const [flashColor, setFlashColor] = useState<string | null>(null);

  useEffect(() => {
    if (!valueRef.current) return;

    const prevVal = previousValue.current;
    const newVal = value;

    // Set flash color based on direction
    if (newVal > prevVal) {
      setFlashColor("text-green-400");
    } else if (newVal < prevVal) {
      setFlashColor("text-red-400");
    }

    // Animate the number with GSAP
    gsap.to(animatedValue.current, {
      val: newVal,
      duration: 0.8,
      ease: "power3.out",
      onUpdate: () => {
        if (valueRef.current) {
          valueRef.current.textContent = `${prefix}${animatedValue.current.val.toFixed(decimals)}`;
        }
      },
    });

    // Clear flash after animation
    const timeout = setTimeout(() => {
      setFlashColor(null);
    }, 1000);

    previousValue.current = newVal;

    return () => clearTimeout(timeout);
  }, [value, prefix, decimals]);

  return (
    <span
      ref={valueRef}
      className={`transition-colors duration-300 ${flashColor || ""} ${className}`}
    >
      {prefix}{value.toFixed(decimals)}
    </span>
  );
}
