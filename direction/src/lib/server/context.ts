import "server-only";
import path from "node:path";
import { backend, env } from "./env";
import { LocalStore } from "./store/local";
import { SupabasePublicPassports, SupabaseStore, userClient } from "./store/supabase";
import type { PublicPassportSource, Store } from "./store/types";

export interface Viewer {
  userId: string;
  email: string | null;
  /** Present in Supabase mode; used to run queries as the user (RLS). */
  accessToken: string | null;
}

const g = globalThis as unknown as { __directionLocal?: LocalStore };

export function localStore(): LocalStore {
  if (!g.__directionLocal) {
    g.__directionLocal = LocalStore.fromFile(path.resolve(process.cwd(), env.dataDir, "db.json"));
  }
  return g.__directionLocal;
}

/** Test hook. */
export function setLocalStore(store: LocalStore | undefined) {
  g.__directionLocal = store;
}

export function storeFor(viewer: Viewer): Store {
  if (backend() === "supabase") {
    if (!viewer.accessToken) throw new Error("Missing access token");
    return new SupabaseStore(userClient(viewer.accessToken));
  }
  return localStore();
}

export function publicPassports(): PublicPassportSource {
  return backend() === "supabase" ? new SupabasePublicPassports() : localStore();
}
