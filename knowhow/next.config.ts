import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The JSON demo store lives in .data/ – keep it out of the file tracer.
  outputFileTracingExcludes: { "*": [".data/**", "scripts/**"] },
  // Episode audio lives outside /public (served through entitlement checks), so trace it explicitly.
  outputFileTracingIncludes: {
    "/api/episodes/[id]/audio": ["./content-audio/*.mp3"],
    "/api/preview/[id]": ["./content-audio/previews/*.mp3"],
    "/api/ai/audio/[id]": ["./content-audio/demo-*.mp3"],
    "/api/wrapped/card": ["./node_modules/@fontsource/unbounded/files/unbounded-latin-800-normal.woff", "./node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff"],
  },
};

export default nextConfig;
