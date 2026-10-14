import { getViewer } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/api";
import { getPlayerTrack } from "@/lib/services/catalog";

export const GET = route<{ params: Promise<{ episodeId: string }> }>(async (_req, { params }) => {
  const { episodeId } = await params;
  const track = await getPlayerTrack(await getViewer(), episodeId);
  if (!track) throw new HttpError(404, "Episode not found");
  return json(track);
});
