import { DAY_MS } from "@/lib/clock";
import { LocalStore } from "@/lib/db/store";
import { buildSeedState, emptyState } from "@/lib/db/seed";
import type { DbState } from "@/lib/db/types";
import { ensureGuestTx } from "@/lib/services/users";

export const T0 = Date.UTC(2026, 9, 17, 12, 0, 0);

export function freshState(at = T0): DbState {
  return emptyState(at);
}

export function seededStore(at = T0) {
  return new LocalStore(buildSeedState(at, "test-admin-pw"));
}

export function withGuest(state: DbState, id = "usr_gtestguest0001", at = T0) {
  ensureGuestTx(state, id, at);
  return id;
}

export const days = (n: number) => n * DAY_MS;
