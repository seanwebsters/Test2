import "server-only";
import { getDb } from "@/lib/db";
import { badRequest, notFound } from "@/lib/errors";
import { track } from "@/lib/analytics";
import type { ProductionWorkflow } from "@/lib/types";
import { newId, nowIso } from "@/lib/util";
import { releaseDueEpisodes, upcomingSlots } from "@/lib/production/scheduler";

const DAY = 86400000;

/** Next sensible release slot: the series workflow schedule, else tomorrow 20:00 UTC. */
async function defaultReleaseAt(seriesId: string): Promise<string> {
  const wf = await getDb().findOne("production_workflows", { series_id: seriesId });
  const slot = wf ? upcomingSlots(wf, new Date())[0] : null;
  if (slot) return slot.toISOString();
  const d = new Date(Date.now() + DAY);
  d.setUTCHours(20, 0, 0, 0);
  return d.toISOString();
}

export async function decideReview(
  reviewId: string,
  reviewerId: string,
  input: { decision: "approve" | "reject" | "changes_requested"; notes?: string; release_at?: string | null },
) {
  const db = getDb();
  const review = await db.get("editorial_reviews", reviewId);
  if (!review) throw notFound("Review not found.");
  if (review.status !== "pending") throw badRequest("This review has already been decided.");
  const ep = await db.get("episodes", review.episode_id);
  if (!ep) throw notFound("Episode not found.");
  const series = await db.get("series", ep.series_id);
  const now = nowIso();

  if (input.decision === "approve") {
    if (!ep.audio_asset_id) throw badRequest("An episode needs audio before it can be approved.");
    const releaseAt = input.release_at ?? review.requested_release_at ?? (await defaultReleaseAt(ep.series_id));
    await db.update("episodes", ep.id, { status: "approved", release_at: releaseAt, updated_at: now });
    const existing = await db.findOne("publishing_schedules", { episode_id: ep.id, status: "scheduled" });
    if (existing) await db.update("publishing_schedules", existing.id, { release_at: releaseAt, updated_at: now });
    else await db.insert("publishing_schedules", { id: newId("pub"), episode_id: ep.id, series_id: ep.series_id, release_at: releaseAt, status: "scheduled", created_by: reviewerId, created_at: now, updated_at: now });
    await track("episode_approved", reviewerId, { episode_id: ep.id, release_at: releaseAt });
    // Released immediately if the time has already passed.
    await releaseDueEpisodes();
  } else {
    await db.update("episodes", ep.id, { status: input.decision === "reject" ? "rejected" : "changes_requested", updated_at: now });
  }
  await db.update("editorial_reviews", review.id, {
    status: input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "changes_requested",
    reviewer_id: reviewerId,
    notes: input.notes ?? review.notes,
    decided_at: now,
  });
  if (review.source === "creator" && series) {
    const verb = input.decision === "approve" ? "was approved" : input.decision === "reject" ? "wasn't approved" : "needs a few changes";
    await db.insert("notifications", {
      id: newId("ntf"),
      user_id: review.submitted_by,
      kind: "review",
      title: `“${ep.title}” ${verb}`,
      body: input.notes || (input.decision === "approve" ? "It will be released at its scheduled time." : "Open the Studio to see the editor's notes."),
      link: `/studio/series/${series.id}`,
      read: false,
      created_at: now,
    });
  }
  return { ok: true };
}

/** Move a scheduled release (publishing calendar drag & drop). */
export async function reschedule(episodeId: string, releaseAt: string, userId: string) {
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  if (!ep) throw notFound();
  if (ep.status === "published") throw badRequest("Published episodes can't be rescheduled.");
  if (new Date(releaseAt).getTime() < Date.now()) throw badRequest("Choose a time in the future.");
  if (ep.status === "approved") {
    await db.update("episodes", ep.id, { release_at: releaseAt, updated_at: nowIso() });
    const s = await db.findOne("publishing_schedules", { episode_id: ep.id, status: "scheduled" });
    if (s) await db.update("publishing_schedules", s.id, { release_at: releaseAt, updated_at: nowIso() });
    else await db.insert("publishing_schedules", { id: newId("pub"), episode_id: ep.id, series_id: ep.series_id, release_at: releaseAt, status: "scheduled", created_by: userId, created_at: nowIso(), updated_at: nowIso() });
  } else {
    const review = (await db.list("editorial_reviews", { where: { episode_id: ep.id, status: "pending" } }))[0];
    if (review) await db.update("editorial_reviews", review.id, { requested_release_at: releaseAt });
    else await db.update("episodes", ep.id, { release_at: releaseAt, updated_at: nowIso() });
  }
  return { ok: true };
}

/** Moderation: dismiss a report or take content down. */
export async function resolveReport(reportId: string, action: "dismiss" | "takedown", note: string) {
  const db = getDb();
  const r = await db.get("content_reports", reportId);
  if (!r) throw notFound();
  if (action === "takedown") {
    if (r.target_type === "series") await db.update("series", r.target_id, { status: "removed", updated_at: nowIso() });
    if (r.target_type === "episode") await db.update("episodes", r.target_id, { status: "rejected", updated_at: nowIso() });
  }
  await db.update("content_reports", r.id, { status: action === "takedown" ? "actioned" : "dismissed", resolution: note || (action === "takedown" ? "Content removed." : "No action needed."), resolved_at: nowIso() });
  return { ok: true };
}

export async function saveWorkflow(seriesId: string, input: Partial<Omit<ProductionWorkflow, "id" | "series_id" | "created_at" | "updated_at" | "approval_required">>) {
  const db = getDb();
  if (!(await db.get("series", seriesId))) throw notFound("Series not found.");
  const existing = await db.findOne("production_workflows", { series_id: seriesId });
  const now = nowIso();
  if (input.release_days && input.release_days.some((d) => d < 0 || d > 6)) throw badRequest("Invalid release day.");
  if (existing) return db.update("production_workflows", existing.id, { ...input, approval_required: true, updated_at: now });
  return db.insert("production_workflows", {
    id: newId("wf"),
    series_id: seriesId,
    episodes_per_week: input.episodes_per_week ?? 2,
    target_duration_minutes: input.target_duration_minutes ?? 30,
    writing_provider: input.writing_provider ?? "auto",
    writing_model: input.writing_model ?? "claude-opus-5-5",
    narrator_voice_id: input.narrator_voice_id ?? null,
    soundscape_id: input.soundscape_id ?? null,
    release_days: input.release_days ?? [1, 4],
    release_hour_utc: input.release_hour_utc ?? 20,
    max_budget_cents: input.max_budget_cents ?? 2500,
    approval_required: true,
    status: input.status ?? "paused",
    created_at: now,
    updated_at: now,
  });
}
