import "server-only";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Repo } from "./repo";
import type { Asset, ConceptBatch, Game, GameVersion, Job, PlayEvent, Settings, UsageRecord } from "../types";

/**
 * Local fallback store: JSON files under DATA_DIR (default ./.data).
 * Files are read on every call and written atomically, so every route and
 * the background orchestrator always see the same state.
 */
export function createLocalRepo(dir = process.env.DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data")): Repo {
  mkdirSync(path.join(dir, "versions"), { recursive: true });
  mkdirSync(path.join(dir, "thumbs"), { recursive: true });
  const file = (name: string) => path.join(/*turbopackIgnore: true*/ dir, name);

  function read<T>(name: string, fallback: T): T {
    const f = file(name);
    if (!existsSync(f)) return fallback;
    try {
      return JSON.parse(readFileSync(f, "utf8")) as T;
    } catch {
      return fallback;
    }
  }
  function write(name: string, value: unknown) {
    const f = file(name);
    const tmp = `${f}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    writeFileSync(tmp, JSON.stringify(value));
    renameSync(tmp, f);
  }
  function upsert<T>(name: string, item: T, key: (t: T) => string, cap?: number) {
    const all = read<T[]>(name, []).filter((x) => key(x) !== key(item));
    all.unshift(item);
    write(name, cap ? all.slice(0, cap) : all);
  }
  const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

  return {
    kind: "local",
    async listGames() {
      return read<Game[]>("games.json", []);
    },
    async getGame(id) {
      return read<Game[]>("games.json", []).find((g) => g.id === id) ?? null;
    },
    async putGame(game) {
      upsert("games.json", game, (g) => g.id);
    },
    async deleteGame(id) {
      write("games.json", read<Game[]>("games.json", []).filter((g) => g.id !== id));
      rmSync(file(`versions/${safeId(id)}.json`), { force: true });
      rmSync(file(`thumbs/${safeId(id)}.png`), { force: true });
    },
    async listVersions(gameId) {
      return read<GameVersion[]>(`versions/${safeId(gameId)}.json`, []).sort((a, b) => a.number - b.number);
    },
    async getVersion(gameId, n) {
      return read<GameVersion[]>(`versions/${safeId(gameId)}.json`, []).find((v) => v.number === n) ?? null;
    },
    async putVersion(v) {
      upsert(`versions/${safeId(v.gameId)}.json`, v, (x) => String(x.number));
    },
    async getThumbnail(gameId) {
      const f = file(`thumbs/${safeId(gameId)}.png`);
      return existsSync(f) ? readFileSync(f) : null;
    },
    async putThumbnail(gameId, png) {
      writeFileSync(file(`thumbs/${safeId(gameId)}.png`), png);
    },
    async listJobs(limit = 50) {
      return read<Job[]>("jobs.json", []).slice(0, limit);
    },
    async getJob(id) {
      return read<Job[]>("jobs.json", []).find((j) => j.id === id) ?? null;
    },
    async putJob(job) {
      const all = read<Job[]>("jobs.json", []);
      const i = all.findIndex((j) => j.id === job.id);
      if (i >= 0) all[i] = job;
      else all.unshift(job);
      write("jobs.json", all.slice(0, 300));
    },
    async addEvents(events) {
      write("events.json", [...read<PlayEvent[]>("events.json", []), ...events].slice(-20000));
    },
    async listEvents(gameId) {
      const all = read<PlayEvent[]>("events.json", []);
      return gameId ? all.filter((e) => e.gameId === gameId) : all;
    },
    async addUsage(u) {
      write("usage.json", [...read<UsageRecord[]>("usage.json", []), u].slice(-20000));
    },
    async listUsage() {
      return read<UsageRecord[]>("usage.json", []);
    },
    async listAssets() {
      return read<Asset[]>("assets.json", []);
    },
    async putAsset(a) {
      upsert("assets.json", a, (x) => x.id);
    },
    async deleteAsset(id) {
      write("assets.json", read<Asset[]>("assets.json", []).filter((a) => a.id !== id));
    },
    async listConceptBatches() {
      return read<ConceptBatch[]>("concepts.json", []);
    },
    async putConceptBatch(b) {
      upsert("concepts.json", b, (x) => x.id, 50);
    },
    async getSettings() {
      return read<Settings | null>("settings.json", null);
    },
    async putSettings(s) {
      write("settings.json", s);
    },
  };
}
