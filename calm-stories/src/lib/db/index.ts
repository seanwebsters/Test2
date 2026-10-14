import path from "node:path";
import { env } from "@/lib/env";
import { LocalDatabase } from "./local";
import { SupabaseDatabase } from "./supabase";
import type { Database } from "./types";
import { buildSeedSnapshot } from "@/lib/seed/build";

export type { Database } from "./types";

const g = globalThis as unknown as { __calmDb?: Database };

/**
 * Returns the configured database. The local store seeds itself on first use
 * so the prototype is immediately browsable.
 */
export function getDb(): Database {
  if (g.__calmDb) return g.__calmDb;
  if (env.dataBackend === "supabase") {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      throw new Error(
        "DATA_BACKEND=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. See docs/INTEGRATIONS.md.",
      );
    }
    g.__calmDb = new SupabaseDatabase(env.supabaseUrl, env.supabaseServiceRoleKey);
  } else {
    const file = path.resolve(process.cwd(), env.dataDir, "db.json");
    g.__calmDb = LocalDatabase.fromFile(file, () => buildSeedSnapshot(new Date()));
  }
  return g.__calmDb;
}

/** Test hook: swap the database for an isolated in-memory instance. */
export function setDb(db: Database | undefined) {
  g.__calmDb = db;
}
