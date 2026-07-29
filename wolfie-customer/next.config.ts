import type { NextConfig } from "next";
import withPWA from "@next/pwa";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

const pwaConfig = withPWA(nextConfig, {
  dest: "public",
  disable: process.env.NEXT_PUBLIC_DISABLE_PWA === "true",
  reloadOnOnline: true,
});

export default withSentryConfig(pwaConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  org: "wolfiedelivery",
  project: "javascript-nextjs",
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});

// Add fallback page handler in the middleware or config
export const pwaFallback = '/offline.html';
