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
};

export default nextConfig;

