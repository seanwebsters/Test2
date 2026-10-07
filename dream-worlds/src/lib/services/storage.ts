/**
 * Persistence layer. Today: localStorage. Later: swap `LocalDreamRepository`
 * for a Supabase/Postgres implementation of the same interface.
 */
import type { Dream, ListeningSession, UserPreferences } from "../types";

export interface PersistedState {
  version: 1;
  dreams: Dream[];
  sessions: ListeningSession[];
  prefs: UserPreferences;
  savedCuratedIds: string[];
  onboarded: boolean;
}

export interface DreamRepository {
  load(): PersistedState | null;
  save(state: PersistedState): void;
  clear(): void;
}

const KEY = "calm.dreamworlds.v1";

export class LocalDreamRepository implements DreamRepository {
  load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedState;
      return parsed.version === 1 ? parsed : null;
    } catch {
      return null;
    }
  }
  save(state: PersistedState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — the session still works in memory */
    }
  }
  clear() {
    try {
      window.localStorage.removeItem(KEY);
    } catch {}
  }
}

export const repository: DreamRepository = new LocalDreamRepository();
