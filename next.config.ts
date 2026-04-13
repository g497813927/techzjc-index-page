import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  reactCompiler: true,
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    '::1'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.techzjc.com',
        port: '',
        pathname: '/**',
      },
    ],
    localPatterns: [
      {
        pathname: '/assets/**',
      },
      {
        pathname: '/photos/**',
      },
      {
        pathname: '/opengraph-image',
      },
      {
        pathname: '/convert'
      }
    ]
  }
};

export default withBundleAnalyzer(nextConfig);
