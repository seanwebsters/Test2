/**
 * Editorial review decisions and scheduled release. Nothing becomes public
 * unless an editor has approved it, and approved episodes go live only at
 * their scheduled time.
 */
import "server-only";
import { HttpError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/policy";
import type { Viewer } from "@/lib/auth/viewer";
import { getDb } from "@/lib/db";
import { log } from "@/lib/log";
import type { EditorialReview, Episode, PublishingSchedule } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";

async function notify(userId: string, kind: "review" | "new_episode" | "production" | "system", title: string, body: string, link: string | null) {
  await getDb().insert("notifications", { id: newId("notif"), user_id: userId, kind, title, body, link, read: false, created_at: nowIso() });
}

export type ReviewDecision = "approved" | "changes_requested" | "rejected";

export async function decideReview(viewer: Viewer, reviewId: string, decision: ReviewDecision, opts: { notes?: string; releaseAt?: string | null } = {}): Promise<EditorialReview> {
  requireAdmin(viewer);
  const db = getDb();
  const review = await db.get("editorial_reviews", reviewId);
  if (!review) throw new HttpError(404, "Review not found");
  if (review.status !== "pending") throw new HttpError(409, `This review was already ${review.status.replace("_", " ")}.`);
  const ep = await db.get("episodes", review.episode_id);
  const series = await db.get("series", review.series_id);
  if (!ep || !series) throw new HttpError(404, "Episode not found");
  if (decision !== "approved" && !opts.notes?.trim()) throw new HttpError(400, "Add a note so the creator knows what to change.");
  const updated = await db.update("editorial_reviews", review.id, { status: decision, reviewer_id: viewer.user.id, notes: (opts.notes ?? "").slice(0, 4000), decided_at: nowIso() });
  const epStatus: Episode["status"] = decision === "approved" ? "approved" : decision === "changes_requested" ? "changes_requested" : "rejected";
  await db.update("episodes", ep.id, { status: epStatus, updated_at: nowIso() });
  if (decision === "approved") {
    const when = opts.releaseAt ?? review.requested_release_at ?? ep.release_at;
    if (when) await scheduleRelease(viewer, ep.id, when);
  } else if (series.status === "in_review") {
    const others = await db.list("episodes", { where: { series_id: series.id } });
    if (!others.some((e) => e.status === "in_review" || e.status === "published" || e.status === "approved")) {
      await db.update("series", series.id, { status: series.published_at ? "published" : "draft", updated_at: nowIso() });
    }
  }
  const verdict = decision === "approved" ? "was approved" : decision === "changes_requested" ? "needs a few changes" : "was not approved";
  await notify(review.submitted_by, "review", `“${ep.title}” ${verdict}`, opts.notes?.trim() || (decision === "approved" ? "It will be released at its scheduled time." : ""), `/create?series=${series.id}`);
  await releaseDue();
  return updated;
}

/** Sets (or moves) the release time of an episode. Editors only. */
export async function scheduleRelease(viewer: Viewer, episodeId: string, releaseAt: string): Promise<PublishingSchedule> {
  requireAdmin(viewer);
  const when = new Date(releaseAt);
  if (Number.isNaN(when.getTime())) throw new HttpError(400, "Invalid release time.");
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  if (!ep) throw new HttpError(404, "Episode not found");
  if (ep.status === "published") throw new HttpError(409, "This episode is already published.");
  const existing = await db.findOne("publishing_schedules", { episode_id: ep.id });
  const row: PublishingSchedule = {
    id: existing?.id ?? newId("sched"),
    episode_id: ep.id,
    series_id: ep.series_id,
    release_at: when.toISOString(),
    status: "scheduled",
    created_by: existing?.created_by ?? viewer.user.id,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  };
  await db.upsert("publishing_schedules", row);
  await db.update("episodes", ep.id, { release_at: row.release_at, updated_at: nowIso() });
  return row;
}

export async function unschedule(viewer: Viewer, episodeId: string) {
  requireAdmin(viewer);
  const db = getDb();
  const s = await db.findOne("publishing_schedules", { episode_id: episodeId, status: "scheduled" });
  if (s) await db.update("publishing_schedules", s.id, { status: "cancelled", updated_at: nowIso() });
  await db.update("episodes", episodeId, { release_at: null, updated_at: nowIso() });
}

/** Approved episodes can be released immediately by an editor. */
export async function publishNow(viewer: Viewer, episodeId: string) {
  requireAdmin(viewer);
  const ep = await getDb().get("episodes", episodeId);
  if (!ep) throw new HttpError(404, "Episode not found");
  if (ep.status !== "approved") throw new HttpError(409, "Only approved episodes can be published.");
  await scheduleRelease(viewer, episodeId, nowIso());
  return releaseDue();
}

/**
 * Releases every approved episode whose scheduled time has passed. Safe to
 * call repeatedly (cron, page loads); each episode is released once.
 */
export async function releaseDue(now = new Date()): Promise<string[]> {
  const db = getDb();
  const due = (await db.list("publishing_schedules", { where: { status: "scheduled" } })).filter((s) => new Date(s.release_at) <= now);
  const released: string[] = [];
  for (const s of due) {
    const ep = await db.get("episodes", s.episode_id);
    if (!ep || ep.status !== "approved") continue; // waits for approval
    if (!ep.audio_asset_id) {
      log.warn("publishing", `skipping release of ${ep.id}: no audio`);
      continue;
    }
    const at = s.release_at;
    await db.update("episodes", ep.id, { status: "published", published_at: at, release_at: at, updated_at: nowIso() });
    await db.update("publishing_schedules", s.id, { status: "released", updated_at: nowIso() });
    const series = await db.get("series", ep.series_id);
    if (series && series.status !== "published") await db.update("series", series.id, { status: "published", published_at: series.published_at ?? at, updated_at: nowIso() });
    if (series) {
      const followers = await db.list("series_follows", { where: { series_id: series.id } });
      for (const f of followers.slice(0, 5000)) {
        const settings = await db.get("user_settings", f.user_id);
        if (settings && !settings.new_episode_updates) continue;
        await notify(f.user_id, "new_episode", `New episode of ${series.title}`, ep.title, `/listen/${ep.id}`);
      }
      await notify(series.creator_id, "new_episode", `“${ep.title}” is live`, series.title, `/series/${series.slug}`);
    }
    released.push(ep.id);
  }
  return released;
}
