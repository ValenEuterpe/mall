const withNextIntl = require("next-intl/plugin")();
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Avoid Turbopack monorepo root auto-detection issues on Windows.
  turbopack: {
    root: __dirname,
  },
};

const sentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

module.exports = sentryEnabled
  ? withSentryConfig(withNextIntl(nextConfig), {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      // Tunnel route bypasses ad-blockers and keeps Sentry traffic same-origin.
      tunnelRoute: "/monitoring",
      // Hide source maps from public after upload to Sentry.
      hideSourceMaps: true,
      disableLogger: true,
    })
  : withNextIntl(nextConfig);
