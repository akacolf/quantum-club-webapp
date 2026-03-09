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
      { protocol: 'https', hostname: 'ton.org' },
      { protocol: 'https', hostname: 'cache.tonapi.io' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'quantumclub.space' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      // Token/NFT metadata images can come from any domain (on-chain URLs)
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

  // Redirect and Rewrite configurations
  async redirects() {
    return [
      // Example redirect
      // {
      //   source: '/old-path',
      //   destination: '/new-path',
      //   permanent: true,
      // },
    ];
  },

  // Headers configuration for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Strict security headers
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
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

  // Experimental features
  experimental: {
    viewTransition: true,
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
      'lucide-react',
      '@iconify/react',
      'lottie-react',
      'framer-motion',
      'recharts',
      'lightweight-charts',
      'date-fns',
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
