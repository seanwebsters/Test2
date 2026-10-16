import { route } from "@/lib/api";
import { getViewer } from "@/lib/auth/session";
import { canViewEpisode, canViewSeries } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { getStorage } from "@/lib/storage";

/** Generated artwork. Visible wherever its series (or episode) is visible. */
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  const db = getDb();
  const art = await db.get("artwork_assets", id);
  if (!art) throw notFound();
  const series = await db.get("series", art.series_id);
  if (!series) throw notFound();
  const viewer = await getViewer();
  const ep = art.episode_id ? await db.get("episodes", art.episode_id) : null;
  const visible = ep ? canViewEpisode(viewer, ep, series) : canViewSeries(viewer, series);
  if (!visible) throw notFound();
  const file = await getStorage().get(art.storage_key);
  if (!file) throw notFound();
  return new Response(new Uint8Array(file.data), {
    headers: { "content-type": art.mime_type, "cache-control": visible && series.status === "published" ? "public, max-age=86400" : "private, no-store" },
  });
});
