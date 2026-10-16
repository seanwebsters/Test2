import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { serveStoredAudio } from "@/lib/storage/serve";

/** Scene stems and narration for the Audio Studio. ?part=narration|stem */
export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireEditor();
  const { id } = await params;
  const r = await getDb().get("scene_renders", id);
  const part = req.nextUrl.searchParams.get("part") === "narration" ? r?.narration_key : r?.stem_key;
  if (!r || !part) throw notFound();
  return serveStoredAudio(req, part, "audio/wav");
});
