import "server-only";
import type { UserRecord } from "../model";
import { newUser } from "../model";
import { jsonStore } from "./json";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export const supabaseConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export const store: Store = supabaseConfigured() ? supabaseStore : jsonStore;

const locks = new Map<string, Promise<unknown>>();

/** Serialises read-modify-write per user within this server process. */
async function lock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => undefined);
  locks.set(id, tail);
  try {
    return await run;
  } finally {
    if (locks.get(id) === tail) locks.delete(id);
  }
}

function handleFor(id: string) {
  return `mind-${id.replace(/^(g_|sb_)/, "").slice(0, 6)}`;
}

export async function loadOrCreateUser(id: string): Promise<UserRecord> {
  const existing = await store.getUser(id);
  if (existing) return existing;
  return lock(id, async () => {
    const again = await store.getUser(id);
    if (again) return again;
    const u = newUser(id, handleFor(id));
    await store.saveUser(u, null);
    return u;
  });
}

/** Load → mutate → save, serialised per user. The mutator returns a result value. */
export async function withUser<T>(id: string, mutate: (u: UserRecord) => T | Promise<T>): Promise<{ user: UserRecord; result: T }> {
  await loadOrCreateUser(id);
  return lock(id, async () => {
    const before = (await store.getUser(id))!;
    const user: UserRecord = structuredClone(before);
    const result = await mutate(user);
    await store.saveUser(user, before);
    return { user, result };
  });
}
