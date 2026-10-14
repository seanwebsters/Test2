import fs from "node:fs";
import path from "node:path";
import { matches, TABLE_NAMES, type Database, type ListOptions, type TableName, type Tables, type Where } from "./types";

export type Snapshot = { [K in TableName]: Tables[K][] };

export function emptySnapshot(): Snapshot {
  const snap = {} as Record<TableName, unknown[]>;
  for (const t of TABLE_NAMES) snap[t] = [];
  return snap as Snapshot;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

/**
 * In-memory database with optional JSON-file persistence.
 * Used for local development, demos and automated tests. Behaviour mirrors
 * the Supabase adapter (copies in/out, id-based updates, IN filters).
 */
export class LocalDatabase implements Database {
  readonly backend = "local" as const;
  private data: Snapshot;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    snapshot: Snapshot,
    private readonly filePath: string | null = null,
  ) {
    this.data = snapshot;
    for (const t of TABLE_NAMES) if (!this.data[t]) (this.data as Record<string, unknown[]>)[t] = [];
  }

  static fromFile(filePath: string, seed: () => Snapshot): LocalDatabase {
    let snapshot: Snapshot;
    if (fs.existsSync(filePath)) {
      snapshot = JSON.parse(fs.readFileSync(filePath, "utf8")) as Snapshot;
    } else {
      snapshot = seed();
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(snapshot));
    }
    return new LocalDatabase(snapshot, filePath);
  }

  snapshot(): Snapshot {
    return clone(this.data);
  }

  private rows<K extends TableName>(table: K): Tables[K][] {
    return this.data[table] as Tables[K][];
  }

  private schedulePersist() {
    if (!this.filePath) return;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.persistNow();
    }, 40);
  }

  persistNow() {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.filePath);
  }

  async list<K extends TableName>(table: K, opts: ListOptions<Tables[K]> = {}): Promise<Tables[K][]> {
    let out = this.rows(table).filter((r) => matches(r, opts.where));
    if (opts.orderBy) {
      const { column, ascending = true } = opts.orderBy;
      out = [...out].sort((a, b) => {
        const av = a[column] as unknown;
        const bv = b[column] as unknown;
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
      });
    }
    if (opts.limit !== undefined) out = out.slice(0, opts.limit);
    return clone(out);
  }

  async get<K extends TableName>(table: K, id: string): Promise<Tables[K] | null> {
    const row = this.rows(table).find((r) => (r as { id: string }).id === id);
    return row ? clone(row) : null;
  }

  async findOne<K extends TableName>(table: K, where: Where<Tables[K]>): Promise<Tables[K] | null> {
    const row = this.rows(table).find((r) => matches(r, where));
    return row ? clone(row) : null;
  }

  async insert<K extends TableName>(table: K, row: Tables[K]): Promise<Tables[K]> {
    const id = (row as { id: string }).id;
    if (this.rows(table).some((r) => (r as { id: string }).id === id)) {
      throw new Error(`Duplicate primary key ${table}.${id}`);
    }
    this.rows(table).push(clone(row));
    this.schedulePersist();
    return clone(row);
  }

  async upsert<K extends TableName>(table: K, row: Tables[K]): Promise<Tables[K]> {
    const id = (row as { id: string }).id;
    const rows = this.rows(table);
    const idx = rows.findIndex((r) => (r as { id: string }).id === id);
    if (idx >= 0) rows[idx] = clone(row);
    else rows.push(clone(row));
    this.schedulePersist();
    return clone(row);
  }

  async update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<Tables[K]> {
    const rows = this.rows(table);
    const idx = rows.findIndex((r) => (r as { id: string }).id === id);
    if (idx < 0) throw new Error(`Not found: ${table}.${id}`);
    const next = { ...rows[idx], ...clone(patch) } as Tables[K];
    rows[idx] = next;
    this.schedulePersist();
    return clone(next);
  }

  async remove<K extends TableName>(table: K, id: string): Promise<void> {
    const rows = this.rows(table);
    const idx = rows.findIndex((r) => (r as { id: string }).id === id);
    if (idx >= 0) rows.splice(idx, 1);
    this.schedulePersist();
  }

  async count<K extends TableName>(table: K, where?: Where<Tables[K]>): Promise<number> {
    return this.rows(table).filter((r) => matches(r, where)).length;
  }
}
