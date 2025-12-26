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



  // Experimental features
  experimental: {
    // Optimizations
    optimizePackageImports: ['@radix-ui', 'lucide-react'],
  },

  // Disable x-powered-by header for security
  poweredByHeader: false,
};

export default nextConfig;
