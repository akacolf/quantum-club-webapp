// Validate env vars at build start (fails fast if any required var is missing)
import "./env";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

/** @type {import('next').NextConfig} */

const nextConfig: import('next').NextConfig = {
  // Enable React Strict Mode for identifying potential problems
  reactStrictMode: true,

  // Image Optimization Configuration
  images: {
    remotePatterns: [
      // Allow any HTTPS image — token/NFT metadata can come from any domain
      { protocol: 'https', hostname: '**' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
  },

  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'],
    } : false,

    // Enable React's experimental features
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },

  // Headers configuration for security
  // NOTE: No X-Frame-Options — app runs inside Telegram's iframe/WebView
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },



  // React Compiler - auto-memoizes components/hooks at build time
  reactCompiler: true,

  // Partial Prerendering - static shells served instantly, dynamic parts stream in
  cacheComponents: true,

  // Type-safe route validation — catches broken <Link href> at build time
  typedRoutes: true,

  // Custom cache life profiles for 'use cache' directives
  cacheLife: {
    // Token metadata, leaderboard — changes infrequently
    tokenData: { stale: 60, revalidate: 120, expire: 3600 },
    // User profile, settings — moderate staleness OK
    userData: { stale: 300, revalidate: 600, expire: 7200 },
    // Price data, charts — needs freshness
    priceData: { stale: 15, revalidate: 30, expire: 300 },
  },

  // Experimental features
  experimental: {
    viewTransition: true,
    // Persist Turbopack compilation cache across production builds
    turbopackFileSystemCacheForBuild: true,
    // Env var IntelliSense in IDE (pairs with t3-env runtime validation)
    typedEnv: true,
    // Inline critical CSS — eliminates render-blocking stylesheets (faster FCP in TG WebView)
    inlineCss: true,
    // Optimizations - tree-shake these large packages
    optimizePackageImports: [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      // lucide-react, recharts, date-fns are auto-optimized by Next.js
      '@iconify/react',
      'lottie-react',
      'framer-motion',
      'lightweight-charts',
      'firebase',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'firebase/database',
      '@ton/core',
      '@ton/ton',
      '@ton/crypto',
      '@ton-api/client',
      '@ton-api/ton-adapter',
      'sonner',
      '@ston-fi/omniston-sdk-react',
      'gsap',
      '@tanstack/react-query',
      '@tanstack/react-form',
      '@tanstack/react-virtual',
      'zustand',
      'nuqs',
      'zod',
    ],
  },

  // react-pdf: canvas is not needed in browser, exclude from server bundle
  serverExternalPackages: ['canvas'],

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Turbopack config (used in dev via `next dev --turbopack`)
  turbopack: {},
};

export default withSerwist(nextConfig);
