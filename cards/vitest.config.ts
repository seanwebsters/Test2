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
    include: ["tests/**/*.test.ts"],
    pool: "forks",
    env: {
      DATA_DIR: path.join(os.tmpdir(), `nexara-test-${process.pid}`),
      SESSION_SECRET: "test-secret",
      ANTHROPIC_API_KEY: "",
    },
  },
});
