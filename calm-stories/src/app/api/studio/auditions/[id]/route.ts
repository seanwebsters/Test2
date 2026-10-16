import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { serveStoredAudio } from "@/lib/storage/serve";
import { nowIso } from "@/lib/util";

type Ctx = { params: Promise<{ id: string }> };

/** Listen to an audition sample. */
export const GET = route<Ctx>(async (req, { params }) => {
  await requireEditor();
  const { id } = await params;
  const a = await getDb().get("voice_auditions", id);
  if (!a?.sample_key) throw notFound();
  return serveStoredAudio(req, a.sample_key, "audio/mpeg");
});

/** Cast this voice for its role. */
export const POST = route<Ctx>(async (_req, { params }) => {
  await requireEditor();
  const { id } = await params;
  const db = getDb();
  const a = await db.get("voice_auditions", id);
  if (!a) throw notFound();
  for (const o of await db.list("voice_auditions", { where: { series_id: a.series_id, character_id: a.character_id } })) await db.update("voice_auditions", o.id, { selected: o.id === id });
  if (a.character_id) await db.update("characters", a.character_id, { voice_id: a.voice_id, voice_name: a.voice_name, updated_at: nowIso() });
  return { ok: true };
});
