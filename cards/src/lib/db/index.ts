import "server-only";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { now } from "@/lib/clock";
import { defaultEconomyConfig } from "@/lib/economy/config";
import { LocalStore, type Store } from "./store";
import { buildSeedState } from "./seed";
import type { DbState } from "./types";

export type { Store } from "./store";

const g = globalThis as unknown as { __nexaraStore?: Store };

export function adminPassword(): string {
  if (process.env.STUDIO_ADMIN_PASSWORD) return process.env.STUDIO_ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production") {
    const generated = randomBytes(12).toString("base64url");
    console.warn(`[nexara] STUDIO_ADMIN_PASSWORD not set. Generated a one-off admin password for user "studio": ${generated}`);
    return generated;
  }
  return "nexara-studio";
}

function migrate(s: DbState): DbState {
  // Forward-compatible defaults for fields added after a store was created.
  s.economy = { ...defaultEconomyConfig(), ...s.economy };
  s.opportunityWeights ??= { growth: 25, retention: 20, depth: 20, story: 15, follows: 10, sharing: 10 };
  s.searches ??= [];
  s.jobs ??= [];
  s.overrides ??= {};
  return s;
}

/** The process-wide store. Seeds itself on first use. */
export function getStore(): Store {
  if (g.__nexaraStore) return g.__nexaraStore;
  const file = path.resolve(process.cwd(), process.env.DATA_DIR || ".data", "nexara.json");
  g.__nexaraStore = LocalStore.open(file, () => buildSeedState(now(), adminPassword()), migrate);
  return g.__nexaraStore;
}

/** Test hook. */
export function setStore(store: Store | undefined) {
  g.__nexaraStore = store;
}
