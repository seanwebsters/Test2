import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, ListOptions, TableName, Tables, Where } from "./types";

/**
 * Supabase PostgreSQL adapter.
 *
 * Runs server-side with the service-role key, so the application policy layer
 * (src/lib/auth/policy.ts) is the primary authorisation gate. The RLS policies
 * in supabase/migrations protect the same rows for any direct client access
 * (e.g. Supabase Realtime or a future mobile client using the anon key).
 */
export class SupabaseDatabase implements Database {
  readonly backend = "supabase" as const;
  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // The generic table map is enforced by our own `Tables` interface; supabase-js
  // is used untyped here so the adapter does not need generated DB types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyWhere(query: any, where?: Where<unknown>) {
    if (!where) return query;
    for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) query = query.in(key, value);
      else if (value === null) query = query.is(key, null);
      else query = query.eq(key, value);
    }
    return query;
  }

  async list<K extends TableName>(table: K, opts: ListOptions<Tables[K]> = {}): Promise<Tables[K][]> {
    let q = this.client.from(table).select("*");
    q = this.applyWhere(q, opts.where as Where<unknown>);
    if (opts.orderBy) q = q.order(opts.orderBy.column, { ascending: opts.orderBy.ascending ?? true });
    if (opts.limit !== undefined) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw new Error(`[supabase] list ${table}: ${error.message}`);
    return (data ?? []) as Tables[K][];
  }

  async get<K extends TableName>(table: K, id: string): Promise<Tables[K] | null> {
    const { data, error } = await this.client.from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[supabase] get ${table}: ${error.message}`);
    return (data ?? null) as Tables[K] | null;
  }

  async findOne<K extends TableName>(table: K, where: Where<Tables[K]>): Promise<Tables[K] | null> {
    let q = this.client.from(table).select("*");
    q = this.applyWhere(q, where as Where<unknown>);
    const { data, error } = await q.limit(1);
    if (error) throw new Error(`[supabase] findOne ${table}: ${error.message}`);
    return ((data ?? [])[0] ?? null) as Tables[K] | null;
  }

  async insert<K extends TableName>(table: K, row: Tables[K]): Promise<Tables[K]> {
    const { data, error } = await this.client.from(table).insert(row as never).select("*").single();
    if (error) throw new Error(`[supabase] insert ${table}: ${error.message}`);
    return data as Tables[K];
  }

  async upsert<K extends TableName>(table: K, row: Tables[K]): Promise<Tables[K]> {
    const { data, error } = await this.client.from(table).upsert(row as never).select("*").single();
    if (error) throw new Error(`[supabase] upsert ${table}: ${error.message}`);
    return data as Tables[K];
  }

  async update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>): Promise<Tables[K]> {
    const { data, error } = await this.client.from(table).update(patch as never).eq("id", id).select("*").single();
    if (error) throw new Error(`[supabase] update ${table}: ${error.message}`);
    return data as Tables[K];
  }

  async remove<K extends TableName>(table: K, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq("id", id);
    if (error) throw new Error(`[supabase] delete ${table}: ${error.message}`);
  }

  async count<K extends TableName>(table: K, where?: Where<Tables[K]>): Promise<number> {
    let q = this.client.from(table).select("id", { count: "exact", head: true });
    q = this.applyWhere(q, where as Where<unknown>);
    const { count, error } = await q;
    if (error) throw new Error(`[supabase] count ${table}: ${error.message}`);
    return count ?? 0;
  }
}
