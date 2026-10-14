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
    testTimeout: 60000,
    pool: "forks",
    env: {
      DATA_DIR: path.join(os.tmpdir(), `calm-stories-test-${process.pid}`),
      DATA_BACKEND: "local",
      STORAGE_BACKEND: "local",
      AUTH_PROVIDER: "demo",
      ANTHROPIC_API_KEY: "",
      OPENAI_API_KEY: "",
      ELEVENLABS_API_KEY: "",
      POSTHOG_KEY: "",
      JOB_DRIVER: "inline",
    },
  },
});
