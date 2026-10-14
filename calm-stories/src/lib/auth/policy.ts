/**
 * Authorisation rules. Pure functions so they are trivially unit-testable and
 * shared by server components, API routes, tools and background agents.
 *
 * Subscription (what you can LISTEN to) and roles (what you can MAKE or
 * MANAGE) are deliberately independent.
 */
import type { Episode, Plan, Role, Series, User } from "@/lib/types";

export interface Viewer {
  user: User | null;
  roles: Role[];
  plan: Plan;
}

export const ANONYMOUS: Viewer = { user: null, roles: [], plan: "free" };

export type Tier = "visitor" | "premium" | "creator" | "admin";

export const isSignedIn = (v: Viewer) => v.user !== null;
export const isPremium = (v: Viewer) => v.user !== null && v.plan === "premium";
export const isCreator = (v: Viewer) => v.roles.includes("creator") || v.roles.includes("admin");
export const isAdmin = (v: Viewer) => v.roles.includes("admin");
export const isEditor = (v: Viewer) => v.roles.includes("editor") || v.roles.includes("admin");

/** Visitors may browse; personal library, follows and recommendations need Premium. */
export const canUseLibrary = (v: Viewer) => isPremium(v);
export const canCreate = (v: Viewer) => isSignedIn(v) && isCreator(v);

export function ownsSeries(v: Viewer, series: Pick<Series, "creator_id">): boolean {
  return v.user !== null && series.creator_id === v.user.id;
}

export function canEditSeries(v: Viewer, series: Pick<Series, "creator_id">): boolean {
  return isAdmin(v) || (canCreate(v) && ownsSeries(v, series));
}

export function isSeriesPublic(series: Pick<Series, "status">): boolean {
  return series.status === "published";
}

/**
 * An episode is public once the series is public AND the episode has been
 * approved by editorial AND its scheduled release time has passed.
 */
export function isEpisodePublic(
  episode: Pick<Episode, "status" | "release_at">,
  series: Pick<Series, "status">,
  now: Date = new Date(),
): boolean {
  if (!isSeriesPublic(series)) return false;
  if (episode.status === "published") return episode.release_at === null || new Date(episode.release_at) <= now;
  if (episode.status === "approved") return episode.release_at !== null && new Date(episode.release_at) <= now;
  return false;
}

export function canViewSeries(v: Viewer, series: Pick<Series, "status" | "creator_id">): boolean {
  return isSeriesPublic(series) || canEditSeries(v, series) || isEditor(v);
}

export function canViewEpisode(
  v: Viewer,
  episode: Pick<Episode, "status" | "release_at">,
  series: Pick<Series, "status" | "creator_id">,
  now = new Date(),
): boolean {
  return isEpisodePublic(episode, series, now) || canEditSeries(v, series) || isEditor(v);
}

/** Full audio requires Premium, except free preview episodes and private previews for owners/editors. */
export function canStreamEpisode(
  v: Viewer,
  episode: Pick<Episode, "status" | "release_at" | "is_preview">,
  series: Pick<Series, "status" | "creator_id">,
  now = new Date(),
): { allowed: boolean; reason?: "not_found" | "premium_required" } {
  if (!canViewEpisode(v, episode, series, now)) return { allowed: false, reason: "not_found" };
  if (canEditSeries(v, series) || isEditor(v)) return { allowed: true };
  if (episode.is_preview || isPremium(v)) return { allowed: true };
  return { allowed: false, reason: "premium_required" };
}

export function tierOf(v: Viewer): Tier {
  if (isAdmin(v)) return "admin";
  if (isCreator(v)) return "creator";
  if (isPremium(v)) return "premium";
  return "visitor";
}
