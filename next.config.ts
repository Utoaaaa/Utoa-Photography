import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    domains: ['imagedelivery.net'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Bundle optimization
  experimental: {
    optimizePackageImports: ['gsap', 'lenis'],
  },
  
  // Headers for performance and security
  async headers() {
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
    ];
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Optimize bundle splits
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          animations: {
            test: /[\\/]node_modules[\\/](gsap|lenis)[\\/]/,
            name: 'animations',
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

export default nextConfig;
