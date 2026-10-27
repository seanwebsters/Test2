import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const port = 3210;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${port}`, viewport: { width: 1440, height: 900 } },
  webServer: {
    command: `npm run runtime && npx next build && npx next start -p ${port}`,
    url: `http://127.0.0.1:${port}/api/settings`,
    timeout: 400_000,
    reuseExistingServer: false,
    // A fresh, throwaway store and no API key: the studio must not pretend to generate.
    env: { DATA_DIR: path.join(os.tmpdir(), `calmgames-e2e-${Date.now()}`), DATA_BACKEND: "local", ANTHROPIC_API_KEY: "", NEXT_DIST_DIR: ".next-e2e" },
  },
});
