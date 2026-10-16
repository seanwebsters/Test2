/**
 * Authorisation rules. Pure functions so they are trivially unit-testable and
 * shared by server components and API routes.
 *
 * Subscription (what you can LISTEN to) and staff roles (who can MANAGE the
 * catalogue) are deliberately independent.
 */
import type { Episode, Plan, Role, Series, User } from "@/lib/types";

export interface Viewer {
  user: User | null;
  roles: Role[];
  plan: Plan;
}

export const ANONYMOUS: Viewer = { user: null, roles: [], plan: "free" };

export type Tier = "visitor" | "free" | "premium" | "editor" | "admin";

export const isSignedIn = (v: Viewer) => v.user !== null;
export const isPremium = (v: Viewer) => v.user !== null && v.plan === "premium";
export const isAdmin = (v: Viewer) => v.roles.includes("admin");
export const isEditor = (v: Viewer) => v.roles.includes("editor") || v.roles.includes("admin");

/** Visitors may browse; personal library, follows and recommendations need Premium. */
export const canUseLibrary = (v: Viewer) => isPremium(v);

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

/** Unpublished content is visible only to Calm's editorial staff. */
export function canViewSeries(v: Viewer, series: Pick<Series, "status">): boolean {
  return isSeriesPublic(series) || isEditor(v);
}

export function canViewEpisode(v: Viewer, episode: Pick<Episode, "status" | "release_at">, series: Pick<Series, "status">, now = new Date()): boolean {
  return isEpisodePublic(episode, series, now) || isEditor(v);
}

/** Full audio requires Premium, except free preview episodes and staff previews. */
export function canStreamEpisode(
  v: Viewer,
  episode: Pick<Episode, "status" | "release_at" | "is_preview">,
  series: Pick<Series, "status">,
  now = new Date(),
): { allowed: boolean; reason?: "not_found" | "premium_required" } {
  if (!canViewEpisode(v, episode, series, now)) return { allowed: false, reason: "not_found" };
  if (isEditor(v)) return { allowed: true };
  if (episode.is_preview || isPremium(v)) return { allowed: true };
  return { allowed: false, reason: "premium_required" };
}

export function tierOf(v: Viewer): Tier {
  if (isAdmin(v)) return "admin";
  if (isEditor(v)) return "editor";
  if (isPremium(v)) return "premium";
  return v.user ? "free" : "visitor";
}
