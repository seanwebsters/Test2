import { getViewer } from "@/lib/auth";
import { canEditSeries } from "@/lib/auth/policy";
import { HttpError, route, serveBytes } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getStore } from "@/lib/storage";

/**
 * Serves production audio (narration sections, mixes, voice previews) to the
 * series' editors. Listeners stream finished episodes through /api/stream.
 */
export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const viewer = await getViewer();
  const db = getDb();
  const asset = await db.get("audio_assets", id);
  if (!asset || asset.kind === "sample") throw new HttpError(404, "Not found");
  if (asset.kind === "voice_preview") {
    if (!viewer.isCreator) throw new HttpError(404, "Not found");
  } else {
    const series = asset.series_id ? await db.get("series", asset.series_id) : null;
    if (!series || !canEditSeries(viewer, series)) throw new HttpError(404, "Not found");
  }
  const obj = await getStore().get(asset.storage_key);
  if (!obj) throw new HttpError(404, "Audio file missing from storage");
  return serveBytes(req, obj.bytes, obj.contentType);
}, { limit: 600, bucket: "asset" });
