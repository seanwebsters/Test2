import { route } from "@/lib/api";
import { getViewer } from "@/lib/auth/session";
import { canStreamEpisode } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { getPlayableEpisode } from "@/lib/services/catalog";
import { getProgress } from "@/lib/services/library";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  const viewer = await getViewer();
  const episode = await getPlayableEpisode(id, viewer);
  if (!episode) throw notFound("Episode not found.");
  const db = getDb();
  const [ep, series] = await Promise.all([db.get("episodes", id), db.get("series", episode.series_id)]);
  if (!ep || !series) throw notFound();
  const access = canStreamEpisode(viewer, ep, series);
  const progress = await getProgress(viewer, id);
  return {
    episode,
    access,
    progress: progress ? { position_seconds: progress.position_seconds, completed: progress.completed } : null,
    audio_url: access.allowed && episode.has_audio ? `/api/episodes/${encodeURIComponent(id)}/audio` : null,
  };
});
