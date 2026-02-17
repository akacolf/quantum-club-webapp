"use client";

import { useEffect } from "react";

/**
 * Prevents pinch-to-zoom on iOS (Safari ignores user-scalable=no since iOS 16.4)
 * and handles visualViewport resize for keyboard visibility.
 */
export default function IOSViewportFix() {
  useEffect(() => {
    // Prevent pinch zoom via gesturestart (iOS-specific)
    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });

    // Prevent double-tap zoom by intercepting rapid taps
    let lastTouchEnd = 0;
    const preventDoubleTap = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    document.addEventListener("touchend", preventDoubleTap, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchend", preventDoubleTap);
    };
  }, []);

  return null;
}
