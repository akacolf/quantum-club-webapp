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

  // Image Optimiz1ation Configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Be more specific in production
        port: '',
        pathname: '**',
      },
    ],
    // Limit image sizes to prevent large uploads
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
          // Uncomment for strict CSP
          // {
          //   key: 'Content-Security-Policy',
          //   value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
          // },
        ],
      },
    ];
  },



  // React Compiler - auto-memoizes components/hooks at build time
  reactCompiler: true,

  // Experimental features
  experimental: {
    // View Transitions API - GPU-composited page transitions
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
