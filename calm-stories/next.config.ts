import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@supabase/supabase-js", "sharp"],
  // Files read from disk at runtime that the bundler can't see.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-*-*.woff"],
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
