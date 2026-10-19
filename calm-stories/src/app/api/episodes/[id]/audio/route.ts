import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { getViewer } from "@/lib/auth/session";
import { canStreamEpisode } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import { serveStoredAudio } from "@/lib/storage/serve";

/**
 * Entitlement-checked audio endpoint. Premium episodes are never exposed via
 * a public URL: the player always goes through this route.
 */
export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const viewer = await getViewer();
  const db = getDb();
  const ep = await db.get("episodes", id);
  if (!ep) throw notFound();
  const series = await db.get("series", ep.series_id);
  if (!series) throw notFound();
  const access = canStreamEpisode(viewer, ep, series);
  if (!access.allowed) throw access.reason === "premium_required" ? forbidden("This episode is included with Calm Premium.") : notFound();
  const asset = ep.audio_asset_id ? await db.get("audio_assets", ep.audio_asset_id) : null;
  if (!asset) throw notFound("No audio has been produced for this episode yet.");
  // Shared ambience samples are static, non-premium files.
  if (asset.kind === "sample") return new NextResponse(null, { status: 307, headers: { Location: asset.url } });
  return serveStoredAudio(req, asset.storage_key, asset.mime_type);
});
