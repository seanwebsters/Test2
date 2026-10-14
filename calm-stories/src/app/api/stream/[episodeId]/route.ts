import { getViewer } from "@/lib/auth";
import { listenAccess } from "@/lib/auth/policy";
import { HttpError, route, serveBytes } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getStore } from "@/lib/storage";
import { ensureSoundscapeSample } from "@/lib/audio/samples";

/** Entitlement-checked audio streaming with Range support. */
export const GET = route<{ params: Promise<{ episodeId: string }> }>(async (req, { params }) => {
  const { episodeId } = await params;
  const viewer = await getViewer();
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  if (!ep) throw new HttpError(404, "Episode not found");
  const series = await db.get("series", ep.series_id);
  if (!series) throw new HttpError(404, "Episode not found");
  const access = listenAccess(viewer, series, ep);
  if (access === "hidden") throw new HttpError(404, "Episode not found");
  if (access === "locked") throw new HttpError(403, "This episode is included with Calm Premium.");
  if (!ep.audio_asset_id) throw new HttpError(404, "No audio has been produced for this episode yet.");
  const asset = await db.get("audio_assets", ep.audio_asset_id);
  if (!asset) throw new HttpError(404, "Audio asset missing");

  const store = getStore();
  const direct = store.publicUrl(asset.storage_key);
  if (direct) return Response.redirect(direct, 302);

  const obj = asset.kind === "sample" ? await ensureSoundscapeSample(asset.storage_key.replace(/^samples\//, "")) : await store.get(asset.storage_key);
  if (!obj) throw new HttpError(404, "Audio file missing from storage");
  return serveBytes(req, obj.bytes, obj.contentType);
}, { limit: 600, bucket: "stream" });
