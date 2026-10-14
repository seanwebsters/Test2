import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { canEditSeries, isEditor } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import { serveStoredAudio } from "@/lib/storage/serve";

/** Private production audio: owners of the series and editors only. */
export const GET = route<{ params: Promise<{ assetId: string }> }>(async (req, { params }) => {
  const { assetId } = await params;
  const viewer = await requireUser();
  const db = getDb();
  const asset = await db.get("audio_assets", assetId);
  if (!asset) throw notFound();
  if (asset.series_id) {
    const series = await db.get("series", asset.series_id);
    if (!series || !(canEditSeries(viewer, series) || isEditor(viewer))) throw forbidden();
  } else if (asset.owner_id !== viewer.user.id && !isEditor(viewer)) throw forbidden();
  return serveStoredAudio(req, asset.storage_key, asset.mime_type);
});
