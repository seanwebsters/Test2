import "server-only";
import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/util";
import { DEFAULT_GUIDELINES, DEFAULT_STUDIO_SETTINGS } from "./defaults";
import type { StudioSettings, WritingGuidelines } from "./types";

export async function getStudioSettings(): Promise<StudioSettings> {
  const db = getDb();
  const saved = await db.get("studio_settings", "global");
  // Merge so settings saved before a new option existed pick up its default.
  return saved ? { ...DEFAULT_STUDIO_SETTINGS, ...saved } : db.insert("studio_settings", { ...DEFAULT_STUDIO_SETTINGS, updated_at: nowIso() });
}

/** Global guidelines plus any series-specific addendum. */
export async function getGuidelines(seriesId?: string | null): Promise<{ global: WritingGuidelines; series: WritingGuidelines | null }> {
  const db = getDb();
  const global = (await db.get("writing_guidelines", "global")) ?? (await db.insert("writing_guidelines", { ...DEFAULT_GUIDELINES, updated_at: nowIso() }));
  const series = seriesId ? await db.get("writing_guidelines", seriesId) : null;
  return { global, series };
}
