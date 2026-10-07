import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

const r = (p: string) => path.resolve(__dirname, p);

// Single self-contained HTML build of the app for hosting as a claude.ai artifact.
export default defineConfig({
  root: r("."),
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: r("shims/router.tsx") },
      { find: /^next\/navigation$/, replacement: r("shims/router.tsx") },
      { find: /^@\//, replacement: r("../src") + "/" },
    ],
  },
  css: { postcss: r("..") },
  build: { outDir: r("dist"), emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  logLevel: "warn",
});
