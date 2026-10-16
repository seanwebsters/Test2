import "server-only";
import { getDb } from "@/lib/db";
import { badRequest, notFound } from "@/lib/errors";
import { track } from "@/lib/analytics";
import { getStorage } from "@/lib/storage";
import { newId, nowIso } from "@/lib/util";
import { releaseDueEpisodes } from "./releases";
import { computeReviewChecks } from "./review-checks";

const DAY = 86400000;

function defaultReleaseAt(): string {
  const d = new Date(Date.now() + DAY);
  d.setUTCHours(20, 0, 0, 0);
  return d.toISOString();
}

const AUDIO_TYPES: Record<string, string> = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac" };

function looksLikeAudio(ext: string, buf: Buffer): boolean {
  const head = buf.subarray(0, 12);
  if (ext === "mp3") return head.toString("ascii", 0, 3) === "ID3" || (head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0);
  if (ext === "wav") return head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WAVE";
  if (ext === "m4a") return head.toString("ascii", 4, 8) === "ftyp";
  if (ext === "aac") return head[0] === 0xff && ((head[1] ?? 0) & 0xf0) === 0xf0;
  return false;
}

/**
 * Editors add an episode by uploading finished audio. It enters the review
 * queue and only becomes public after approval at its release time.
 */
export async function addUploadedEpisode(input: {
  seriesId: string;
  seasonNumber: number;
  title: string;
  summary: string;
  durationSeconds: number;
  requestedReleaseAt: string | null;
  file: { type: string; size: number; data: Buffer };
  uploadedBy: string;
}) {
  const db = getDb();
  const series = await db.get("series", input.seriesId);
  if (!series) throw notFound("Series not found.");
  const ext = AUDIO_TYPES[input.file.type];
  if (!ext) throw badRequest("Upload an MP3, WAV, M4A or AAC file.");
  if (input.file.size > 200 * 1024 * 1024) throw badRequest("Audio files must be under 200 MB.");
  if (!looksLikeAudio(ext, input.file.data)) throw badRequest("That file doesn't look like valid audio.");
  if (input.requestedReleaseAt && Number.isNaN(Date.parse(input.requestedReleaseAt))) throw badRequest("Invalid release time.");

  const now = nowIso();
  let season = await db.findOne("seasons", { series_id: series.id, number: input.seasonNumber });
  if (!season) {
    season = await db.insert("seasons", { id: newId("sea"), series_id: series.id, number: input.seasonNumber, title: `Season ${input.seasonNumber}`, synopsis: "", arc: "", created_at: now });
  }
  const existing = await db.list("episodes", { where: { season_id: season.id } });
  const number = existing.reduce((m, e) => Math.max(m, e.number), 0) + 1;
  const episodeId = newId("ep");
  const key = `audio/${series.id}/${episodeId}.${ext}`;
  await getStorage().put(key, input.file.data, input.file.type === "audio/mp3" ? "audio/mpeg" : input.file.type);
  const assetId = newId("aud");
  await db.insert("audio_assets", {
    id: assetId,
    owner_id: input.uploadedBy,
    series_id: series.id,
    episode_id: null,
    kind: "upload",
    storage_key: key,
    url: `/api/admin/audio/${assetId}`,
    mime_type: input.file.type === "audio/mp3" ? "audio/mpeg" : input.file.type,
    duration_seconds: Math.round(input.durationSeconds),
    provider: "upload",
    meta: { bytes: input.file.size },
    created_at: now,
  });
  await db.insert("episodes", {
    id: episodeId,
    series_id: series.id,
    season_id: season.id,
    number,
    title: input.title.trim(),
    summary: input.summary.trim(),
    duration_seconds: Math.round(input.durationSeconds),
    status: "in_review",
    release_at: null,
    published_at: null,
    audio_asset_id: assetId,
    is_preview: number === 1 && input.seasonNumber === 1,
    created_at: now,
    updated_at: now,
  });
  await db.update("audio_assets", assetId, { episode_id: episodeId });
  const checks = await computeReviewChecks(episodeId, input.requestedReleaseAt);
  const review = await db.insert("editorial_reviews", {
    id: newId("rev"),
    episode_id: episodeId,
    series_id: series.id,
    submitted_by: input.uploadedBy,
    source: "upload",
    status: "pending",
    checks,
    requested_release_at: input.requestedReleaseAt,
    reviewer_id: null,
    notes: "",
    created_at: now,
    decided_at: null,
  });
  return { episode_id: episodeId, review_id: review.id };
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
  const now = nowIso();
  if (input.decision === "approve") {
    if (!ep.audio_asset_id) throw badRequest("An episode needs audio before it can be approved.");
    const releaseAt = input.release_at ?? review.requested_release_at ?? defaultReleaseAt();
    await db.update("episodes", ep.id, { status: "approved", release_at: releaseAt, updated_at: now });
    const existing = await db.findOne("publishing_schedules", { episode_id: ep.id, status: "scheduled" });
    if (existing) await db.update("publishing_schedules", existing.id, { release_at: releaseAt, updated_at: now });
    else await db.insert("publishing_schedules", { id: newId("pub"), episode_id: ep.id, series_id: ep.series_id, release_at: releaseAt, status: "scheduled", created_by: reviewerId, created_at: now, updated_at: now });
    await track("episode_approved", reviewerId, { episode_id: ep.id, release_at: releaseAt });
    await releaseDueEpisodes(); // released immediately if the time has already passed
  } else {
    await db.update("episodes", ep.id, { status: input.decision === "reject" ? "rejected" : "changes_requested", updated_at: now });
  }
  await db.update("editorial_reviews", review.id, {
    status: input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "changes_requested",
    reviewer_id: reviewerId,
    notes: input.notes ?? review.notes,
    decided_at: now,
  });
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
