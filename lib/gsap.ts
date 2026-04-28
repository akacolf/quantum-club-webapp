/**
 * Central GSAP configuration and lazy-loader.
 *
 * Every consumer should import from here rather than from "gsap" directly.
 * This ensures that ScrollTrigger is registered exactly once and that we
 * tree-shake as much as possible on the server (all functions are async/
 * client-only).
 */

let gsapReady: Promise<typeof import("gsap")> | null = null;
let scrollTriggerReady: Promise<typeof import("gsap/ScrollTrigger")> | null = null;

/**
 * Lazy-load the core gsap module (client-only, deduped).
 */
export function loadGsap() {
  if (!gsapReady) {
    gsapReady = import("gsap");
  }
  return gsapReady;
}

/**
 * Lazy-load gsap + ScrollTrigger and register the plugin (client-only, deduped).
 */
export async function loadGsapWithScrollTrigger() {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    loadGsap(),
    (scrollTriggerReady ??= import("gsap/ScrollTrigger")),
  ]);

  // gsap.registerPlugin is idempotent — safe to call multiple times
  gsap.registerPlugin(ScrollTrigger);

  return { gsap, ScrollTrigger };
}

/** Re-export type for convenience */
export type { ScrollTrigger } from "gsap/ScrollTrigger";
