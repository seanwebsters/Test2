import "server-only";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import type { Episode, Script, ScriptSettings, ScriptVersion } from "@/lib/types";
import { DEFAULT_SCRIPT_SETTINGS } from "@/lib/types";
import { newId, nowIso, wordCount } from "@/lib/util";

export async function getEpisodeInSeries(episodeId: string, seriesId: string): Promise<Episode> {
  const ep = await getDb().get("episodes", episodeId);
  if (!ep || ep.series_id !== seriesId) throw notFound("Episode not found in this series.");
  return ep;
}

export async function getOrCreateScript(ep: Episode, settings?: Partial<ScriptSettings>): Promise<Script> {
  const db = getDb();
  const existing = await db.findOne("scripts", { episode_id: ep.id });
  if (existing) {
    if (settings) return db.update("scripts", existing.id, { settings: { ...existing.settings, ...settings }, updated_at: nowIso() });
    return existing;
  }
  return db.insert("scripts", {
    id: newId("scr"),
    episode_id: ep.id,
    series_id: ep.series_id,
    current_version_id: null,
    settings: { ...DEFAULT_SCRIPT_SETTINGS, duration_minutes: Math.round(ep.duration_seconds / 60) || 30, ...settings },
    created_at: nowIso(),
    updated_at: nowIso(),
  });
}

export async function addScriptVersion(
  script: Script,
  input: { content: string; source: ScriptVersion["source"]; note: string; provider?: string | null; model?: string | null; simulated?: boolean; userId: string | null },
): Promise<ScriptVersion> {
  const db = getDb();
  const versions = await db.list("script_versions", { where: { script_id: script.id } });
  const version: ScriptVersion = {
    id: newId("scv"),
    script_id: script.id,
    version: versions.reduce((m, v) => Math.max(m, v.version), 0) + 1,
    content: input.content,
    word_count: wordCount(input.content),
    source: input.source,
    provider: input.provider ?? null,
    model: input.model ?? null,
    simulated: input.simulated ?? false,
    note: input.note,
    created_by: input.userId,
    created_at: nowIso(),
  };
  await db.insert("script_versions", version);
  await db.update("scripts", script.id, { current_version_id: version.id, updated_at: nowIso() });
  const ep = await db.get("episodes", script.episode_id);
  if (ep && (ep.status === "planned" || ep.status === "changes_requested")) {
    await db.update("episodes", ep.id, { status: "draft", updated_at: nowIso() });
  }
  return version;
}

export async function currentScriptText(episodeId: string): Promise<{ script: Script; version: ScriptVersion } | null> {
  const db = getDb();
  const script = await db.findOne("scripts", { episode_id: episodeId });
  if (!script?.current_version_id) return null;
  const version = await db.get("script_versions", script.current_version_id);
  return version ? { script, version } : null;
}
