import fs from "node:fs";
import path from "node:path";
import type { DbState } from "./types";

/**
 * A transactional store. `transact` runs the mutation against a private
 * copy of the state while holding an exclusive lock; the copy is committed
 * (and persisted atomically) only if the mutation returns without throwing.
 *
 * The local implementation is correct for a single Node process (the demo
 * and single-instance deployments). Multi-instance deployments must use the
 * Postgres functions in supabase/migrations, which implement the same
 * guarantees with row locks and unique constraints.
 */
export interface Store {
  read(): DbState;
  /** Monotonic counter, bumped on every commit. Useful for memoisation. */
  revision(): number;
  transact<T>(fn: (draft: DbState) => T): Promise<T>;
}

export class LocalStore implements Store {
  private state: DbState;
  private rev = 0;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    initial: DbState,
    private readonly file?: string,
  ) {
    this.state = initial;
  }

  static open(file: string, seed: () => DbState, migrate: (s: DbState) => DbState = (s) => s): LocalStore {
    let state: DbState;
    if (fs.existsSync(file)) {
      state = migrate(JSON.parse(fs.readFileSync(file, "utf8")) as DbState);
    } else {
      state = seed();
      fs.mkdirSync(path.dirname(file), { recursive: true });
      writeAtomic(file, state);
    }
    return new LocalStore(state, file);
  }

  read(): DbState {
    return this.state;
  }

  revision(): number {
    return this.rev;
  }

  transact<T>(fn: (draft: DbState) => T): Promise<T> {
    const run = async () => {
      const draft = structuredClone(this.state);
      const result = fn(draft);
      if (this.file) writeAtomic(this.file, draft);
      this.state = draft;
      this.rev++;
      return result;
    };
    const next = this.queue.then(run, run);
    // Keep the chain alive regardless of individual failures.
    this.queue = next.catch(() => undefined);
    return next;
  }
}

function writeAtomic(file: string, state: DbState) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, file);
}
