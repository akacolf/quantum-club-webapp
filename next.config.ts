// Validate env vars at build start (fails fast if any required var is missing)
import { env } from "./env";
import createBundleAnalyzer from "@next/bundle-analyzer";

const withAnalyzer = createBundleAnalyzer({
  enabled: env.ANALYZE === "true",
});

const nextConfig: import('next').NextConfig = {
  // Image Optimization Configuration
  images: {
    remotePatterns: [
      // Allow any HTTPS image — token/NFT metadata can come from any domain
      { protocol: 'https', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'],
    } : false,
  },

  // React Compiler - auto-memoizes components/hooks at build time
  reactCompiler: true,

  // Type-safe route validation — catches broken <Link href> at build time
  typedRoutes: true,

  experimental: {
    viewTransition: true,
    // Persist Turbopack compilation cache across production builds
    turbopackFileSystemCacheForBuild: true,
    // Env var IntelliSense in IDE (pairs with t3-env runtime validation)
    typedEnv: true,
    // Inline critical CSS — eliminates render-blocking stylesheets (faster FCP in TG WebView)
    inlineCss: true,
    // Tree-shake large packages that aren't auto-optimized by Next.js
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

  // Dev: log fetch cache hits/misses to catch redundant network requests
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },

  // react-pdf: canvas is not needed in browser, exclude from server bundle
  serverExternalPackages: ['canvas'],

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Allow cloudflared tunnel origins in dev mode
  allowedDevOrigins: ['*.trycloudflare.com'],
};

export default withAnalyzer(nextConfig);
