import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@supabase/supabase-js", "sharp", "ffmpeg-static"],
  // Files read from disk at runtime that the bundler can't see.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-*-*.woff", "./node_modules/ffmpeg-static/ffmpeg"],
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
