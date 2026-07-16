import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NEXT_PUBLIC_DISABLE_PWA === "true",
  workboxOptions: {
    disableDevLogs: true,
    clientsClaim: true,
    skipWaiting: true,
    runtimeCaching: [
      // Cache-first for static assets
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      // Cache-first for images
      {
        urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      // Cache-first for CSS/JS
      {
        urlPattern: /\.(js|css|woff|woff2|ttf|eot)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      // Network-first for API calls (with fallback to cache)
      {
        urlPattern: /^https:\/\/wolfie-backend-pt9u\.onrender\.com\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5 minutes
          },
        },
      },
      // Network-first for Socket.IO (real-time updates)
      {
        urlPattern: /^https:\/\/wolfie-backend-pt9u\.onrender\.com\/socket\.io\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "socket-io",
          networkTimeoutSeconds: 3,
        },
      },
    ],
  },
})(nextConfig);

// Add fallback page handler in the middleware or config
export const pwaFallback = '/offline.html';
