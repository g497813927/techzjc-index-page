import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isGlobalBuild = process.env.NEXT_PUBLIC_VERCEL_ENV === "true";
const sentryOrg = process.env.SENTRY_ORG ?? "jiacheng-zhao";
const sentryProject = process.env.SENTRY_PROJECT ?? "javascript-nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    '::1'
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.techzjc.com",
        port: "",
        pathname: "/**",
      },
    ],
    localPatterns: [
      {
        pathname: "/assets/**",
      },
      {
        pathname: "/photos/**",
      },
      {
        pathname: "/opengraph-image",
      },
      {
        pathname: "/convert",
      },
    ],
  },
};

const config = withBundleAnalyzer(nextConfig);

export default isGlobalBuild
  ? withSentryConfig(config, {
      org: sentryOrg,
      project: sentryProject,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      ...(process.env.SENTRY_AUTH_TOKEN
        ? { authToken: process.env.SENTRY_AUTH_TOKEN }
        : {}),
    })
  : config;
