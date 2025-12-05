/**
 * Telegram Mini App Safe Area
 * 
 * Telegram automatically sets these CSS variables:
 * - --tg-safe-area-inset-top/bottom/left/right (device notches)
 * - --tg-content-safe-area-inset-top/bottom/left/right (Telegram UI buttons)
 * 
 * These are used directly in globals.css - no JavaScript needed.
 * The ready() call is handled in Login.tsx and other places.
 */

// This hook is kept for backwards compatibility but does nothing
export function useSafeArea() {
  // CSS variables are set automatically by Telegram WebApp script
}
