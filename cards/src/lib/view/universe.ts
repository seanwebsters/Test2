import { catalog, currentSeason, isReleased, releasedCards, releasedEpisodes, releaseTime } from "@/lib/catalog";
import { DAY_MS } from "@/lib/clock";
import { GENRES, type GenreId, type Universe } from "@/lib/content/types";
import type { DbState } from "@/lib/db/types";
import { universeStats } from "@/lib/services/discovery";
import { hashString } from "@/lib/content/build";

export interface UniverseCardView {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  premise: string;
  genres: { id: GenreId; label: string }[];
  style: Universe["style"]["artStyle"];
  font: Universe["style"]["displayFont"];
  palette: Universe["style"]["palette"];
  seed: number;
  heroImageUrl?: string;
  cards: number;
  owned: number;
  season: { number: number; title: string };
  followers: number;
  growth: number;
  isNew: boolean;
  newSeasonSoon?: { number: number; title: string; at: number };
  latestEpisode?: { id: string; title: string; season: number; number: number };
  following: boolean;
  source: Universe["source"];
}

export function universeView(state: DbState, u: Universe, userId: string | undefined, at: number): UniverseCardView {
  const idx = catalog(state);
  const released = releasedCards(idx, u, at);
  const inv = userId ? state.inventory[userId] ?? {} : {};
  const stats = universeStats(state, at).get(u.id)!;
  const eps = releasedEpisodes(idx, u, at);
  const latest = eps[eps.length - 1];
  const nextSeason = u.seasons.find((s) => !isReleased(idx, s.releaseOffsetDays, at));
  const s = currentSeason(idx, u, at);
  return {
    id: u.id,
    slug: u.slug,
    title: u.title,
    tagline: u.tagline,
    premise: u.premise,
    genres: u.genres.map((g) => ({ id: g, label: GENRES.find((x) => x.id === g)?.label ?? g })),
    style: u.style.artStyle,
    font: u.style.displayFont,
    palette: u.style.palette,
    seed: hashString(u.id),
    heroImageUrl: state.overrides[u.id]?.heroImageUrl,
    cards: released.length,
    owned: released.filter((c) => inv[c.id]?.count).length,
    season: { number: s.number, title: s.title },
    followers: stats.shown.followers,
    growth: stats.shown.growth,
    isNew: at - releaseTime(idx, u.launchOffsetDays) < 21 * DAY_MS,
    newSeasonSoon: nextSeason ? { number: nextSeason.number, title: nextSeason.title, at: releaseTime(idx, nextSeason.releaseOffsetDays) } : undefined,
    latestEpisode: latest ? { id: latest.id, title: latest.title, season: latest.season, number: latest.number } : undefined,
    following: !!userId && state.follows.some((f) => f.userId === userId && f.universeId === u.id),
    source: u.source,
  };
}
