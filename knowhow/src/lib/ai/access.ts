import "server-only";
import { HttpError, sessionUserId } from "@/lib/auth";
import { store } from "@/lib/store";

/** Personal AI series are private to their owner. */
export async function ownedAiSeries(seriesId: string) {
  const s = await store.getAiSeries(seriesId);
  if (!s || s.ownerId !== (await sessionUserId())) throw new HttpError(404, "Series not found");
  return s;
}

export async function ownedAiEpisode(episodeId: string) {
  const i = episodeId.lastIndexOf("-");
  if (!episodeId.startsWith("ai_") || i < 0) throw new HttpError(404, "Episode not found");
  const series = await ownedAiSeries(episodeId.slice(0, i));
  const episode = series.episodes.find((e) => e.id === episodeId);
  if (!episode) throw new HttpError(404, "Episode not found");
  return { series, episode };
}

export function publicAiSeries(s: Awaited<ReturnType<typeof ownedAiSeries>>) {
  return { ...s, episodes: s.episodes.map((e) => ({ ...e, challenge: e.challenge ? { question: e.challenge.question, options: e.challenge.options } : undefined })) };
}
