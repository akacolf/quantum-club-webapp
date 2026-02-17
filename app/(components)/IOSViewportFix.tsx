"use client";

import { useEffect } from "react";

/**
 * Prevents pinch-to-zoom on iOS.
 *
 * In Telegram's WKWebView, the viewport meta (user-scalable=no) is respected,
 * and touch-action: manipulation (in globals.css) prevents double-tap zoom.
 *
 * The gesturestart/gesturechange listeners are a fallback for Safari if the app
 * is ever opened outside Telegram (e.g. direct browser link).
 */
export default function IOSViewportFix() {
  useEffect(() => {
    // Prevent pinch zoom via gesturestart (Safari-specific fallback)
    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
    };
  }, []);

  return null;
}
