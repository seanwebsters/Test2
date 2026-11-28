import type { AppData } from "./store";

/**
 * Persistence boundary. Today progress lives in localStorage (via the zustand
 * `persist` middleware in store.ts). To add accounts and a database, implement
 * this interface against your API and sync `AppData` on sign-in and on change:
 *
 *   const repo: ProgressRepository = new ApiRepository(session.token);
 *   useStore.subscribe((s) => repo.save(snapshot(s)));
 */
export interface ProgressRepository {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
}

/** Strips action functions so the snapshot is plain JSON. */
export function snapshot(state: AppData & Record<string, unknown>): AppData {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) if (typeof v !== "function") out[k] = v;
  return out as unknown as AppData;
}
