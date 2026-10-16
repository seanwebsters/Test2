import { z } from "zod";
import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors";
import { addUploadedEpisode } from "@/lib/services/editorial";

export const maxDuration = 120;

const Fields = z.object({
  series_id: z.string().min(1),
  season_number: z.coerce.number().int().min(1).max(50),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(2000).default(""),
  duration_seconds: z.coerce.number().min(1).max(6 * 3600),
  requested_release_at: z.string().optional().transform((v) => (v ? new Date(v).toISOString() : null)),
});

/** Upload a finished episode; it goes straight into the editorial review queue. */
export const POST = route(async (req) => {
  const editor = await requireEditor();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Choose an audio file.");
  const f = Fields.parse(Object.fromEntries([...form.entries()].filter(([k]) => k !== "file")));
  return addUploadedEpisode({
    seriesId: f.series_id,
    seasonNumber: f.season_number,
    title: f.title,
    summary: f.summary,
    durationSeconds: f.duration_seconds,
    requestedReleaseAt: f.requested_release_at,
    file: { type: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) },
    uploadedBy: editor.user.id,
  });
});
