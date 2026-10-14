import type { Episode, Series } from "@/lib/types";
import type { Viewer } from "./viewer";

/**
 * Central authorisation rules. Every service and API route goes through these
 * functions; Supabase RLS mirrors them as defence in depth.
 */

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404 = 403,
  ) {
    super(message);
  }
}

export function isOwner(viewer: Viewer, series: Pick<Series, "creator_id">): boolean {
  return !!viewer.user && viewer.user.id === series.creator_id;
}

/** Published series are public; drafts only for their creator and editors. */
export function canViewSeries(viewer: Viewer, series: Series): boolean {
  if (series.status === "published") return true;
  return isOwner(viewer, series) || viewer.isAdmin;
}

export function canEditSeries(viewer: Viewer, series: Series): boolean {
  if (viewer.isAdmin) return true;
  return viewer.isCreator && isOwner(viewer, series);
}

export function isEpisodePublic(ep: Episode, now = new Date()): boolean {
  return ep.status === "published" && !!ep.published_at && new Date(ep.published_at) <= now;
}

export type ListenAccess = "full" | "preview" | "locked" | "hidden";

/**
 * Whether the viewer may stream an episode. Visitors and free accounts get the
 * preview episode of each series; Calm Premium unlocks everything.
 */
export function listenAccess(viewer: Viewer, series: Series, ep: Episode, now = new Date()): ListenAccess {
  if (canEditSeries(viewer, series)) return "full";
  if (!canViewSeries(viewer, series) || !isEpisodePublic(ep, now)) return "hidden";
  if (viewer.isPremium) return "full";
  return ep.is_preview ? "preview" : "locked";
}

export function requireUser(viewer: Viewer): asserts viewer is Viewer & { user: NonNullable<Viewer["user"]> } {
  if (!viewer.user) throw new AuthError("Sign in to continue.", 401);
}

export function requireCreator(viewer: Viewer): asserts viewer is Viewer & { user: NonNullable<Viewer["user"]> } {
  requireUser(viewer);
  if (!viewer.isCreator) throw new AuthError("Creator access is required for Storymaker.");
}

export function requireAdmin(viewer: Viewer): asserts viewer is Viewer & { user: NonNullable<Viewer["user"]> } {
  requireUser(viewer);
  if (!viewer.isAdmin) throw new AuthError("Administrator access is required.");
}

export function requirePremium(viewer: Viewer): void {
  requireUser(viewer);
  if (!viewer.isPremium) throw new AuthError("This feature is included with Calm Premium.");
}
