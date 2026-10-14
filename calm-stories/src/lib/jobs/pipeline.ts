/**
 * The 13-step episode production pipeline run by Calm's production agents.
 * Each step is resumable: completed steps are skipped on retry, and results
 * are stored on the job so later steps can use them.
 */
import "server-only";
import { generate } from "@/lib/ai";
import { MetadataSchema } from "@/lib/ai/schemas";
import { riskyNames } from "@/lib/audio/qa";
import { generateNarration, getProduction, mixAndMaster, updateProductionSettings } from "@/lib/audio/production";
import type { Viewer } from "@/lib/auth/viewer";
import { getDb } from "@/lib/db";
import { loadStoryContext } from "@/lib/storymaker/context";
import {
  acceptDirection,
  checkContinuity,
  ensureOfficialRights,
  generateEpisodeOutline,
  proposeDirection,
  scheduleEpisode,
  sleepEdit,
  submitForReview,
  updateEpisode,
  writeEpisode,
} from "@/lib/storymaker/service";
import type { AgentKind, AiProductionJob, Episode, ProductionWorkflow } from "@/lib/types";

/** An error that should not be retried (needs a human). */
export class StepHalt extends Error {}

export interface StepContext {
  job: AiProductionJob;
  viewer: Viewer;
  workflow: ProductionWorkflow | null;
  log: (message: string, level?: "info" | "warn" | "error") => Promise<void>;
  /** Shared results between steps (persisted on the job payload). */
  results: Record<string, unknown>;
  setEpisode: (id: string) => Promise<void>;
}

export interface StepDef {
  id: string;
  label: string;
  agent: AgentKind;
  run: (ctx: StepContext) => Promise<string>;
}

async function episodeOf(ctx: StepContext): Promise<Episode> {
  const id = ctx.job.episode_id;
  const ep = id ? await getDb().get("episodes", id) : null;
  if (!ep) throw new StepHalt("No episode selected for this job.");
  return ep;
}

/** Next free release slot for a workflow, after `after`. */
export async function nextReleaseSlot(wf: ProductionWorkflow, after: Date): Promise<string | null> {
  if (!wf.release_days.length) return null;
  const taken = new Set((await getDb().list("publishing_schedules", { where: { series_id: wf.series_id } })).filter((s) => s.status !== "cancelled").map((s) => s.release_at));
  const d = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate(), wf.release_hour_utc));
  for (let i = 0; i < 60; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    if (d <= after || !wf.release_days.includes(d.getUTCDay())) continue;
    if (!taken.has(d.toISOString())) return d.toISOString();
  }
  return null;
}

export const PIPELINE: StepDef[] = [
  {
    id: "select_episode",
    label: "Choose the next episode",
    agent: "showrunner",
    run: async (ctx) => {
      const db = getDb();
      const seriesId = ctx.job.series_id as string;
      const requested = ctx.job.episode_id ?? (ctx.job.payload.episode_id as string | undefined);
      let ep: Episode | null = requested ? await db.get("episodes", requested) : null;
      if (requested && !ep) throw new StepHalt("The requested episode no longer exists.");
      if (!ep) {
        const scripted = new Set((await db.list("scripts", { where: { series_id: seriesId } })).filter((s) => s.current_version_id).map((s) => s.episode_id));
        const ctxS = await loadStoryContext(seriesId);
        const busy = new Set(
          (await db.list("ai_production_jobs", { where: { series_id: seriesId, status: ["queued", "running", "paused"] } })).filter((j) => j.id !== ctx.job.id).map((j) => j.episode_id),
        );
        ep = ctxS.episodes.find((e) => (e.status === "planned" || e.status === "draft") && !scripted.has(e.id) && !busy.has(e.id)) ?? null;
        if (!ep) {
          const { proposal } = await proposeDirection(ctx.viewer, seriesId);
          ep = await acceptDirection(ctx.viewer, seriesId, proposal);
          await ctx.log(`Showrunner proposed a new episode: “${ep.title}”.`);
        }
      }
      if (["in_review", "approved", "published"].includes(ep.status)) throw new StepHalt(`“${ep.title}” is already ${ep.status.replace("_", " ")}.`);
      await ctx.setEpisode(ep.id);
      return `Episode ${ep.number}: “${ep.title}”`;
    },
  },
  {
    id: "story_memory",
    label: "Retrieve story memory",
    agent: "showrunner",
    run: async (ctx) => {
      const c = await loadStoryContext(ctx.job.series_id as string);
      const facts = c.bible?.established_facts.length ?? 0;
      const threads = c.bible?.unresolved_threads.length ?? 0;
      return `${c.characters.length} characters, ${c.locations.length} locations, ${facts} facts, ${threads} open threads, ${c.events.length} memory events`;
    },
  },
  {
    id: "outline",
    label: "Outline the episode",
    agent: "showrunner",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      const { beats } = await generateEpisodeOutline(ctx.viewer, ep.id);
      ctx.results.beats = beats;
      return beats.slice(0, 3).join(" · ");
    },
  },
  {
    id: "write",
    label: "Write the script",
    agent: "writer",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      const beats = (ctx.results.beats as string[] | undefined) ?? [];
      const { version } = await writeEpisode(ctx.viewer, ep.id, {
        settings: { duration_minutes: ctx.workflow?.target_duration_minutes ?? (ctx.job.payload.duration_minutes as number | undefined) ?? 30 },
        direction: beats.length ? `Follow these beats: ${beats.join("; ")}` : undefined,
      });
      return `Version ${version.version}, ${version.word_count.toLocaleString()} words${version.simulated ? " (simulated writer)" : ""}`;
    },
  },
  {
    id: "continuity",
    label: "Check continuity",
    agent: "continuity",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      const report = await checkContinuity(ctx.viewer, ep.id);
      for (const i of report.issues.filter((x) => x.severity === "conflict")) await ctx.log(`Continuity conflict: ${i.message}`, "warn");
      ctx.results.continuity_conflicts = report.issues.filter((x) => x.severity === "conflict").length;
      return report.summary;
    },
  },
  {
    id: "sleep_edit",
    label: "Sleep edit",
    agent: "sleep_editor",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      const r = await sleepEdit(ctx.viewer, ep.id);
      return r.softened ? `Softened ${r.softened} passages; score ${r.before} → ${r.after}` : `Score ${r.before}/100; no changes needed`;
    },
  },
  {
    id: "voice_direction",
    label: "Direct the narration",
    agent: "voice_director",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      const db = getDb();
      const series = await db.get("series", ep.series_id);
      const voiceId = ctx.workflow?.narrator_voice_id ?? series?.narrator_voice_id ?? (await db.list("voice_profiles")).find((v) => v.approved)?.id ?? null;
      await updateProductionSettings(ctx.viewer, ep.id, { voice_id: voiceId, speed: 0.88, stability: 0.8, warmth: 0.7 });
      const c = await loadStoryContext(ep.series_id);
      const risky = riskyNames([...c.characters.map((x) => x.name), ...c.locations.map((x) => x.name), c.bible?.world_name ?? ""]);
      if (risky.length) await ctx.log(`Pronunciation watch list: ${risky.join(", ")}`);
      const voice = voiceId ? await db.get("voice_profiles", voiceId) : null;
      return `${voice?.name ?? "Default voice"} at 0.88×${risky.length ? `; watch ${risky.length} names` : ""}`;
    },
  },
  {
    id: "soundscape",
    label: "Choose the soundscape",
    agent: "audio_producer",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      const series = await getDb().get("series", ep.series_id);
      const soundscapeId = ctx.workflow?.soundscape_id ?? series?.soundscape_id ?? null;
      await updateProductionSettings(ctx.viewer, ep.id, { soundscape_id: soundscapeId, ambience_volume: 0.3, music_volume: 0.12 });
      const sc = soundscapeId ? await getDb().get("soundscapes", soundscapeId) : null;
      return sc?.name ?? "Narration only";
    },
  },
  {
    id: "narration",
    label: "Generate narration",
    agent: "audio_producer",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      const view = await getProduction(ctx.viewer, ep.id);
      const budget = ctx.job.budget_cents;
      if (budget !== null && ctx.job.cost_cents + view.pendingCents > budget) {
        throw new StepHalt(`Narration would cost about $${(view.pendingCents / 100).toFixed(2)}, exceeding this job's budget.`);
      }
      const r = await generateNarration(ctx.viewer, ep.id);
      return `${r.generated} sections${r.simulated ? " (simulated narrator)" : ` · $${(r.costCents / 100).toFixed(2)}`}`;
    },
  },
  {
    id: "mix",
    label: "Mix and master",
    agent: "audio_producer",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      const { asset } = await mixAndMaster(ctx.viewer, ep.id);
      return `${Math.round(asset.duration_seconds / 60)} min ${asset.mime_type === "audio/mpeg" ? "MP3" : "WAV"}`;
    },
  },
  {
    id: "audio_qa",
    label: "Audio QA",
    agent: "audio_producer",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      const asset = ep.audio_asset_id ? await getDb().get("audio_assets", ep.audio_asset_id) : null;
      const qa = asset?.qa;
      if (!qa) throw new StepHalt("No QA report on the mix.");
      for (const i of qa.issues.filter((x) => x.severity !== "pass")) await ctx.log(`QA ${i.severity}: ${i.message}`, i.severity === "fail" ? "error" : "warn");
      if (!qa.passed) throw new StepHalt("Audio QA failed. Fix the issues and retry from this step.");
      return `Passed · approx. ${qa.integrated_loudness_approx_lufs} LUFS · peak ${qa.peak_dbfs} dBFS`;
    },
  },
  {
    id: "metadata",
    label: "Prepare metadata",
    agent: "publishing",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      const c = await loadStoryContext(ep.series_id);
      const { value } = await generate({
        task: "metadata",
        prompt: `Write a two-sentence, spoiler-free episode description for "${ep.title}" in ${c.series.title}. Summary: ${ep.summary}`,
        schema: MetadataSchema,
        mock: () => ({ description: `${ep.summary.replace(/\.?$/, ".")} A gentle episode of ${c.series.title}, made for winding down.`, tags: c.series.tags.slice(0, 3) }),
      }, { userId: ctx.viewer.user?.id, seriesId: ep.series_id, episodeId: ep.id });
      await updateEpisode(ctx.viewer, ep.id, { summary: value.description.slice(0, 1000) });
      return value.description.slice(0, 120);
    },
  },
  {
    id: "submit",
    label: "Submit for editorial review",
    agent: "publishing",
    run: async (ctx) => {
      const ep = await episodeOf(ctx);
      await ensureOfficialRights(ctx.viewer, ep.series_id);
      const slot = (ctx.job.payload.release_at as string | undefined) ?? (ctx.workflow ? await nextReleaseSlot(ctx.workflow, new Date(Date.now() + 24 * 3600_000)) : null);
      const review = await submitForReview(ctx.viewer, ep.id, { requestedReleaseAt: slot, notes: `Produced by job ${ctx.job.id}.` });
      if (slot) await scheduleEpisode(ctx.viewer, ep.id, slot);
      return `Awaiting editor approval${slot ? ` · proposed release ${new Date(slot).toUTCString()}` : ""} (${review.checks.filter((c) => c.status !== "pass").length} checks to look at)`;
    },
  },
];
