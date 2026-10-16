import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { badRequest } from "@/lib/errors";
import { newId, nowIso } from "@/lib/util";
import { createPronunciationDictionary } from "@/lib/providers/elevenlabs";
import { saveDeliverable } from "@/lib/studio/bible";

const Body = z.object({ series_id: z.string(), entries: z.array(z.object({ term: z.string().trim().min(1).max(80), alias: z.string().trim().min(1).max(120), notes: z.string().max(200).default("") })).max(300) });

/** Replace a series' pronunciation entries and publish a new ElevenLabs dictionary version. */
export const PUT = route(async (req) => {
  await requireEditor();
  const b = await parseBody(req, Body);
  const db = getDb();
  for (const p of await db.list("pronunciations", { where: { series_id: b.series_id } })) await db.remove("pronunciations", p.id);
  for (const e of b.entries) await db.insert("pronunciations", { id: newId("pr"), series_id: b.series_id, ...e, created_at: nowIso() });
  let dictionary: { id: string; versionId: string } | null = null;
  if (b.entries.length) {
    if (!env.elevenLabsApiKey) throw badRequest("Saved. Connect ELEVENLABS_API_KEY to upload the dictionary to ElevenLabs.");
    const series = await db.get("series", b.series_id);
    dictionary = await createPronunciationDictionary(env.elevenLabsApiKey, `${series?.title ?? b.series_id} – names`.slice(0, 90), b.entries);
  }
  await saveDeliverable({ run_id: null, step_id: null, series_id: b.series_id, episode_id: null, agent: "network_executive", kind: "pronunciation_dictionary", key: "pronunciation_dictionary", title: "Pronunciation dictionary (edited)", data: { entries: b.entries, dictionary }, reasoning: `${b.entries.length} entries`, model: "human" });
  return { ok: true, dictionary };
});
