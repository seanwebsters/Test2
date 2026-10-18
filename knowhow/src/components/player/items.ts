import type { EpisodeMeta, Series } from "@/lib/types";
import type { PlayItem } from "./PlayerProvider";

export function catalogItem(series: Series, ep: EpisodeMeta): PlayItem {
  return {
    id: ep.id,
    kind: "catalog",
    title: ep.title,
    n: ep.n,
    seriesTitle: series.title,
    seriesHref: `/series/${series.slug}`,
    art: series.art,
    seed: series.slug,
    duration: ep.duration ?? ep.minutes * 60,
  };
}

/** The rest of the series after `ep`, as a queue. */
export function seriesQueue(series: Series, ep: EpisodeMeta): PlayItem[] {
  return series.episodes.filter((e) => e.n > ep.n && e.status === "released" && e.hasAudio).map((e) => catalogItem(series, e));
}

export function firstPlayable(series: Series, progress: Record<string, { completed: boolean }> | undefined): EpisodeMeta | undefined {
  const released = series.episodes.filter((e) => e.status === "released" && e.hasAudio);
  return released.find((e) => !progress?.[e.id]?.completed) ?? released[0];
}
