import type { NextConfig } from "next";
import withPWA from "@next/pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig, {
  dest: "public",
  disable: process.env.NEXT_PUBLIC_DISABLE_PWA === "true",
  reloadOnOnline: true,
});

// Add fallback page handler in the middleware or config
export const pwaFallback = '/offline.html';
