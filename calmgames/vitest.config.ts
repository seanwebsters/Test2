import { defineConfig } from "vitest/config";
import path from "node:path";
import os from "node:os";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 120000,
    pool: "forks",
    env: { DATA_DIR: path.join(os.tmpdir(), `calmgames-test-${process.pid}`), DATA_BACKEND: "local", ANTHROPIC_API_KEY: "" },
  },
});
