import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Heavy server-only packages stay out of the bundle; Playwright drives a real
  // Chromium for QA and esbuild is only used by the runtime build script.
  serverExternalPackages: ["playwright", "playwright-core", "esbuild", "@supabase/supabase-js"],
  // Files read from disk at runtime that the bundler can't see.
  outputFileTracingIncludes: {
    "/**": ["./.runtime/**", "./node_modules/phaser/dist/phaser.min.js"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
