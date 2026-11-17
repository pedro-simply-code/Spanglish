import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import "@/env";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy. Next.js and MUI inject inline scripts and styles,
 * so those stay allowed; everything else is limited to known hosts:
 * Cloudflare Turnstile, LiveKit (wss), Backblaze downloads and avatars (https).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob: https:",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), display-capture=(), geolocation=(), payment=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      /** Class recording uploads (see save/uploadClassRecording actions, max 250 MB). */
      bodySizeLimit: "260mb",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The classroom is the only place that needs camera, microphone and
        // screen sharing.
        source: "/classes/:id/room",
        headers: [
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

// Locale comes from the user's profile or a cookie (src/i18n/request.ts).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
