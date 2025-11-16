import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.techzjc.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    // Remove Node.js polyfills Next.js 11/12 added for browser builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      buffer: false,
    };

    return config;
  },
};

export default nextConfig;
