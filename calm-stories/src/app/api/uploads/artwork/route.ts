import { route } from "@/lib/api";
import { requireCreator } from "@/lib/auth/session";
import { canEditSeries } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { getStorage } from "@/lib/storage";
import { newId, nowIso } from "@/lib/util";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_BYTES = 6 * 1024 * 1024;

/** Upload a cover image. Validates type by magic bytes, not just the header. */
export const POST = route(async (req) => {
  const viewer = await requireCreator();
  const form = await req.formData();
  const file = form.get("file");
  const seriesId = String(form.get("series_id") ?? "");
  if (!(file instanceof File)) throw badRequest("Choose an image to upload.");
  const series = await getDb().get("series", seriesId);
  if (!series) throw notFound();
  if (!canEditSeries(viewer, series)) throw forbidden();
  const ext = TYPES[file.type];
  if (!ext) throw badRequest("Use a PNG, JPEG or WebP image.");
  if (file.size > MAX_BYTES) throw badRequest("Images must be under 6 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const magicOk =
    (ext === "png" && buf.subarray(0, 4).toString("hex") === "89504e47") ||
    (ext === "jpg" && buf.subarray(0, 2).toString("hex") === "ffd8") ||
    (ext === "webp" && buf.subarray(8, 12).toString("ascii") === "WEBP");
  if (!magicOk) throw badRequest("That file doesn't look like a valid image.");
  const key = `art/${series.id}/${newId("up")}.${ext}`;
  await getStorage().put(key, buf, file.type);
  const spec = { ...series.artwork, image_url: `/api/media/${key}` };
  const db = getDb();
  await db.insert("artwork_assets", { id: newId("art"), owner_id: viewer.user.id, series_id: series.id, episode_id: null, character_id: null, kind: "cover", source: "upload", spec, prompt: null, provider: "upload", simulated: false, created_at: nowIso() });
  await db.update("series", series.id, { artwork: spec, updated_at: nowIso() });
  return { ok: true, url: spec.image_url };
});
