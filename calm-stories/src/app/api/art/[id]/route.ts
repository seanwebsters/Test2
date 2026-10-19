import { route } from "@/lib/api";
import { getViewer } from "@/lib/auth/session";
import { canViewEpisode, canViewSeries, isEditor } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { loadArtwork } from "@/lib/studio/art";

/**
 * Studio artwork and its renditions (?v=1200w|600w|300w|titled). Visible
 * wherever its series or episode is visible; concepts and rejected images
 * only to staff.
 */
export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const db = getDb();
  const art = await db.get("artwork_assets", id);
  if (!art) throw notFound();
  const series = await db.get("series", art.series_id);
  if (!series) throw notFound();
  const viewer = await getViewer();
  const ep = art.episode_id ? await db.get("episodes", art.episode_id) : null;
  const staff = isEditor(viewer);
  const visible = staff || ((art.status === "selected" || art.status === "approved") && (ep ? canViewEpisode(viewer, ep, series) : canViewSeries(viewer, series)));
  if (!visible) throw notFound();
  const file = await loadArtwork(art, req.nextUrl.searchParams.get("v") ?? undefined);
  if (!file) throw notFound();
  const publicCache = !staff && series.status === "published";
  return new Response(new Uint8Array(file.data), { headers: { "content-type": file.mimeType, "cache-control": publicCache ? "public, max-age=86400" : "private, no-store" } });
});
