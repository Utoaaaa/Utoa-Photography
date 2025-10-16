import type { NextConfig } from 'next';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });

const baseConfig: NextConfig = {
  // Re-enable ESLint and TypeScript checks during build
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Silence lockfile root warning by explicitly setting tracing root
  outputFileTracingRoot: path.resolve(__dirname),
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Bundle optimization (keep defaults; avoid import optimizations that can break dev)
  // experimental: { optimizePackageImports: ['gsap', 'lenis'] },
  
  // Headers for performance and security
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    const baseCspParts = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      // Styles: allow inline for Next/Tailwind runtime classes
      "style-src 'self' 'unsafe-inline'",
      // Images from Cloudflare Images and self; allow data/blob for placeholders
      "img-src 'self' data: blob:",
      // Fonts and media
      "font-src 'self' data:",
      "media-src 'self'",
      // Scripts: allow inline bootstrap for Next; disallow eval in prod
      isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
      // Workers (Next/OpenNext on CF)
      "worker-src 'self' blob:",
      // API/XHR + HMR in dev (ws)
      isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    ];
    const contentSecurityPolicy = baseCspParts.join('; ');
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Webpack optimizations: only adjust in client production builds
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
  
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
    generateEtags: false,
    poweredByHeader: false,
  }),
};

export default withBundleAnalyzer(baseConfig);
