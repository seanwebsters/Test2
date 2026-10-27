import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Repo } from "./repo";
import type { Asset, ConceptBatch, Game, GameVersion, Job, PlayEvent, Settings, UsageRecord } from "../types";

/**
 * Supabase store. Tables are created by supabase/migrations/0001_init.sql.
 * Uses the service-role key, so it must only ever run on the server.
 */
export function createSupabaseRepo(url: string, key: string): Repo {
  const db: SupabaseClient = createClient(url, key, { auth: { persistSession: false } });
  const check = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(`Supabase: ${r.error.message}`);
    return r.data;
  };
  const rows = <T>(data: { data: T }[] | null) => (data ?? []).map((r) => r.data);

  return {
    kind: "supabase",
    async listGames() {
      return rows<Game>(check(await db.from("games").select("data").order("updated_at", { ascending: false })));
    },
    async getGame(id) {
      const r = check(await db.from("games").select("data").eq("id", id).maybeSingle());
      return (r?.data as Game) ?? null;
    },
    async putGame(g) {
      check(await db.from("games").upsert({ id: g.id, data: g, created_at: g.createdAt, updated_at: g.updatedAt }));
    },
    async deleteGame(id) {
      check(await db.from("game_versions").delete().eq("game_id", id));
      check(await db.from("thumbnails").delete().eq("game_id", id));
      check(await db.from("games").delete().eq("id", id));
    },
    async listVersions(gameId) {
      return rows<GameVersion>(check(await db.from("game_versions").select("data").eq("game_id", gameId).order("number")));
    },
    async getVersion(gameId, n) {
      const r = check(await db.from("game_versions").select("data").eq("game_id", gameId).eq("number", n).maybeSingle());
      return (r?.data as GameVersion) ?? null;
    },
    async putVersion(v) {
      check(await db.from("game_versions").upsert({ game_id: v.gameId, number: v.number, data: v, created_at: v.createdAt }));
    },
    async getThumbnail(gameId) {
      const r = check(await db.from("thumbnails").select("png_base64").eq("game_id", gameId).maybeSingle());
      return r ? Buffer.from((r as { png_base64: string }).png_base64, "base64") : null;
    },
    async putThumbnail(gameId, png) {
      check(await db.from("thumbnails").upsert({ game_id: gameId, png_base64: png.toString("base64") }));
    },
    async listJobs(limit = 50) {
      return rows<Job>(check(await db.from("jobs").select("data").order("created_at", { ascending: false }).limit(limit)));
    },
    async getJob(id) {
      const r = check(await db.from("jobs").select("data").eq("id", id).maybeSingle());
      return (r?.data as Job) ?? null;
    },
    async putJob(j) {
      check(await db.from("jobs").upsert({ id: j.id, data: j, status: j.status, created_at: j.createdAt, updated_at: j.updatedAt }));
    },
    async addEvents(events) {
      if (!events.length) return;
      check(await db.from("play_events").insert(events.map((e) => ({ id: e.id, game_id: e.gameId, data: e, at: e.at }))));
    },
    async listEvents(gameId) {
      let q = db.from("play_events").select("data").order("at").limit(20000);
      if (gameId) q = q.eq("game_id", gameId);
      return rows<PlayEvent>(check(await q));
    },
    async addUsage(u) {
      check(await db.from("usage").insert({ id: u.id, data: u, at: u.at }));
    },
    async listUsage() {
      return rows<UsageRecord>(check(await db.from("usage").select("data").order("at").limit(20000)));
    },
    async listAssets() {
      return rows<Asset>(check(await db.from("assets").select("data").order("created_at", { ascending: false })));
    },
    async putAsset(a) {
      check(await db.from("assets").upsert({ id: a.id, data: a, created_at: a.createdAt }));
    },
    async deleteAsset(id) {
      check(await db.from("assets").delete().eq("id", id));
    },
    async listConceptBatches() {
      return rows<ConceptBatch>(check(await db.from("concept_batches").select("data").order("created_at", { ascending: false }).limit(50)));
    },
    async putConceptBatch(b) {
      check(await db.from("concept_batches").upsert({ id: b.id, data: b, created_at: b.createdAt }));
    },
    async getSettings() {
      const r = check(await db.from("settings").select("data").eq("id", "studio").maybeSingle());
      return (r?.data as Settings) ?? null;
    },
    async putSettings(s) {
      check(await db.from("settings").upsert({ id: "studio", data: s }));
    },
  };
}
