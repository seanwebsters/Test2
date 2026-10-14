import "server-only";
import { getDb } from "@/lib/db";
import type { AgentKind, Episode } from "@/lib/types";
import { DEFAULT_SCRIPT_SETTINGS } from "@/lib/types";
import { hashString, newId, nowIso, prng } from "@/lib/util";
import { withWriterOverride } from "@/lib/ai";
import * as engine from "@/lib/ai/story-engine";
import { loadStoryContext } from "@/lib/story/context";
import { sleepSuitability } from "@/lib/story/checks";
import { addScriptVersion, currentScriptText, getOrCreateScript } from "@/lib/storymaker/scripts";
import { computeReviewChecks } from "@/lib/services/review-checks";
import { registerWorkflow, type JobContext, type StepDef } from "@/lib/jobs/runner";
import { getProduction, mixInternal, narrateSections, updateProductionSettings } from "./audio";

/**
 * The autonomous Calm Production Engine. Seven specialist agents share the
 * same structured series database and hand work to one another through a
 * persisted job state. Nothing is ever published by an agent: the final
 * step submits the episode to the editorial queue.
 */

async function agentConfig(agent: AgentKind) {
  const cfg = await getDb().findOne("agent_configurations", { agent });
  if (cfg && !cfg.enabled) throw new Error(`The ${cfg.name} agent is disabled in Agent Control.`);
  return cfg;
}

async function asAgent<T>(ctx: JobContext, agent: AgentKind, fn: () => Promise<T>): Promise<T> {
  const cfg = await agentConfig(agent);
  const wf = ctx.job.workflow_id ? await getDb().get("production_workflows", ctx.job.workflow_id) : null;
  // Workflow model pin > agent config > global AI settings.
  const provider = wf?.writing_provider !== "auto" ? wf?.writing_provider : cfg?.provider;
  const model = wf?.writing_model || cfg?.model;
  return withWriterOverride({ provider: provider ?? "auto", model, guidance: cfg?.prompt_template }, fn);
}

async function recordLlm(ctx: JobContext, meta: { provider: string; model: string; simulated: boolean; cost_cents: number; input_tokens?: number; output_tokens?: number }) {
  await ctx.addCost({
    category: "llm",
    provider: meta.provider,
    model: meta.model,
    units: (meta.input_tokens ?? 0) + (meta.output_tokens ?? 0),
    unit_label: "tokens",
    cost_cents: meta.cost_cents,
    simulated: meta.simulated,
  });
}

function episodeId(ctx: JobContext): string {
  const id = ctx.state.episode_id as string | undefined;
  if (!id) throw new Error("No episode selected yet.");
  return id;
}

const steps: StepDef[] = [
  {
    id: "read_bible",
    label: "Read the Story Bible",
    agent: "showrunner",
    async run(ctx) {
      const story = await loadStoryContext(ctx.job.series_id!);
      return { preview: `${story.series.title}: ${story.characters.length} characters, ${story.bible.rules.length} rules, ${story.episodes.length} episodes, ${story.bible.unresolved_threads.length} open threads.` };
    },
  },
  {
    id: "next_episode",
    label: "Determine the next episode",
    agent: "showrunner",
    async run(ctx) {
      const db = getDb();
      const story = await loadStoryContext(ctx.job.series_id!);
      const releaseAt = (ctx.job.payload.release_at as string | undefined) ?? null;
      // Reuse an existing planned episode without a script, otherwise ask the showrunner for the next one.
      for (const e of story.episodes.filter((x) => x.status === "planned")) {
        if (!(await currentScriptText(e.id))) {
          ctx.state.episode_id = e.id;
          await db.update("ai_production_jobs", ctx.job.id, { episode_id: e.id });
          return { preview: `Using planned Episode ${e.number}: “${e.title}”.` };
        }
      }
      const { proposal, meta } = await asAgent(ctx, "showrunner", () => engine.proposeNextDirection(story));
      await recordLlm(ctx, meta);
      const season = story.seasons[story.seasons.length - 1] ?? (await db.insert("seasons", { id: newId("sea"), series_id: story.series.id, number: 1, title: "Season One", synopsis: "", arc: "", created_at: nowIso() }));
      const number = story.episodes.filter((e) => e.season_id === season.id).reduce((m, e) => Math.max(m, e.number), 0) + 1;
      const wf = ctx.job.workflow_id ? await db.get("production_workflows", ctx.job.workflow_id) : null;
      const ep: Episode = {
        id: newId("ep"),
        series_id: story.series.id,
        season_id: season.id,
        number,
        title: proposal.episode_title,
        summary: proposal.summary,
        duration_seconds: (wf?.target_duration_minutes ?? 30) * 60,
        status: "planned",
        release_at: releaseAt,
        published_at: null,
        audio_asset_id: null,
        is_preview: false,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      await db.insert("episodes", ep);
      ctx.state.episode_id = ep.id;
      ctx.state.beats = proposal.beats;
      await db.update("ai_production_jobs", ctx.job.id, { episode_id: ep.id });
      return { preview: `New Episode ${number}: “${ep.title}” – ${proposal.summary}${meta.simulated ? " (simulated)" : ""}` };
    },
  },
  {
    id: "outline",
    label: "Outline the episode",
    agent: "showrunner",
    async run(ctx) {
      if (Array.isArray(ctx.state.beats) && ctx.state.beats.length) return { preview: (ctx.state.beats as string[]).join(" · ") };
      const db = getDb();
      const ep = (await db.get("episodes", episodeId(ctx)))!;
      const story = await loadStoryContext(ep.series_id);
      const trimmed = { ...story, episodes: story.episodes.filter((e) => e.id !== ep.id) };
      const { proposal, meta } = await asAgent(ctx, "showrunner", () => engine.proposeNextDirection(trimmed, `Outline Episode ${ep.number}, "${ep.title}": ${ep.summary}`));
      await recordLlm(ctx, meta);
      ctx.state.beats = proposal.beats;
      return { preview: proposal.beats.join(" · ") };
    },
  },
  {
    id: "write_script",
    label: "Write the script",
    agent: "writer",
    async run(ctx) {
      const db = getDb();
      const ep = (await db.get("episodes", episodeId(ctx)))!;
      const wf = ctx.job.workflow_id ? await db.get("production_workflows", ctx.job.workflow_id) : null;
      const settings = { ...DEFAULT_SCRIPT_SETTINGS, duration_minutes: wf?.target_duration_minutes ?? 30 };
      const words = settings.duration_minutes * 110;
      ctx.ensureBudget(Math.round((words * 1.6 * 20) / 1_000_000 * 100)); // rough Opus-tier estimate
      const script = await getOrCreateScript(ep, settings);
      const story = await loadStoryContext(ep.series_id);
      const { content, meta } = await asAgent(ctx, "writer", () => engine.writeEpisodeScript(story, ep.id, script.settings));
      await recordLlm(ctx, meta);
      const v = await addScriptVersion(script, { content, source: "agent", note: "Writer agent draft", provider: meta.provider, model: meta.model, simulated: meta.simulated, userId: null });
      return { preview: `${v.word_count.toLocaleString()} words. “${content.slice(0, 220)}…”` };
    },
  },
  {
    id: "continuity",
    label: "Check continuity",
    agent: "continuity",
    async run(ctx) {
      const ep = episodeId(ctx);
      const cur = (await currentScriptText(ep))!;
      const story = await loadStoryContext(ctx.job.series_id!);
      const { report, meta } = await asAgent(ctx, "continuity", () => engine.reviewContinuity(story, cur.version.content));
      await recordLlm(ctx, meta);
      ctx.state.continuity = report;
      const conflicts = report.issues.filter((i) => i.severity === "conflict");
      if (conflicts.length) await ctx.log(`${conflicts.length} possible contradiction(s) flagged for editors.`, "warn");
      return { preview: report.summary };
    },
  },
  {
    id: "sleep_edit",
    label: "Sleep-suitability edit",
    agent: "sleep_editor",
    async run(ctx) {
      const ep = episodeId(ctx);
      const cur = (await currentScriptText(ep))!;
      let report = sleepSuitability(cur.version.content);
      if (report.score < 75) {
        const story = await loadStoryContext(ctx.job.series_id!);
        const { text, meta } = await asAgent(ctx, "sleep_editor", () => engine.rewritePassage(story, { passage: cur.version.content, instruction: "relaxing" }));
        await recordLlm(ctx, meta);
        await addScriptVersion(cur.script, { content: text, source: "agent", note: "Sleep Editor: softened pacing and content", provider: meta.provider, model: meta.model, simulated: meta.simulated, userId: null });
        report = sleepSuitability(text);
      }
      ctx.state.sleep_score = report.score;
      return { preview: `Sleep suitability ${report.score}/100.` };
    },
  },
  {
    id: "voice_direction",
    label: "Voice direction",
    agent: "voice_director",
    async run(ctx) {
      await agentConfig("voice_director");
      const db = getDb();
      const ep = episodeId(ctx);
      const wf = ctx.job.workflow_id ? await db.get("production_workflows", ctx.job.workflow_id) : null;
      const series = await db.get("series", ctx.job.series_id!);
      // Consistent narration across the franchise: series narrator & soundscape unless the workflow overrides.
      const prod = await updateProductionSettings(ep, {
        voice_id: wf?.narrator_voice_id ?? series?.narrator_voice_id ?? "voice_willow",
        soundscape_id: wf?.soundscape_id ?? series?.soundscape_id ?? "snd_forest-night",
        speed: 0.9,
        warmth: 0.7,
        stability: 0.8,
      });
      const voice = prod.settings.voice_id ? await db.get("voice_profiles", prod.settings.voice_id) : null;
      return { preview: `${voice?.name ?? "Narrator"} · speed ${prod.settings.speed} · ${prod.settings.soundscape_id?.replace("snd_", "")}` };
    },
  },
  {
    id: "narration",
    label: "Generate narration",
    agent: "audio_producer",
    async run(ctx) {
      await agentConfig("audio_producer");
      const r = await narrateSections(ctx, episodeId(ctx));
      return { preview: `${r.narrated}/${r.total} sections${r.simulated ? " (simulated voice)" : ""}` };
    },
  },
  {
    id: "mix",
    label: "Mix & master",
    agent: "audio_producer",
    async run(ctx) {
      const { asset, qa } = await mixInternal(ctx, episodeId(ctx));
      ctx.state.mix_asset_id = asset.id;
      ctx.state.qa_passed = qa.passed;
      // Production-engine episodes are reviewed as a whole; link the mix explicitly.
      await getDb().update("episodes", episodeId(ctx), { audio_asset_id: asset.id, updated_at: nowIso() });
      return { preview: `${Math.round(asset.duration_seconds / 60)} min · ≈${qa.integrated_loudness_approx_lufs} LUFS` };
    },
  },
  {
    id: "audio_qa",
    label: "Audio quality checks",
    agent: "audio_producer",
    async run(ctx) {
      const asset = await getDb().get("audio_assets", ctx.state.mix_asset_id as string);
      const qa = asset?.qa;
      if (!qa) throw new Error("No QA report on the mix.");
      const failing = qa.issues.filter((i) => i.severity === "fail");
      if (failing.length) await ctx.log(`Audio QA failures: ${failing.map((f) => f.message).join(" ")}`, "warn");
      return { preview: qa.passed ? "All blocking checks passed." : `${failing.length} blocking issue(s) – flagged for editors.` };
    },
  },
  {
    id: "artwork_metadata",
    label: "Artwork & metadata",
    agent: "publishing",
    async run(ctx) {
      const db = getDb();
      const ep = (await db.get("episodes", episodeId(ctx)))!;
      const series = (await db.get("series", ep.series_id))!;
      const story = await loadStoryContext(ep.series_id);
      const { data, meta } = await asAgent(ctx, "publishing", () => engine.describeEpisode(story, ep.title, ep.summary));
      await recordLlm(ctx, meta);
      await db.update("episodes", ep.id, { summary: data.description, updated_at: nowIso() });
      // Episode art keeps the series' visual identity: same scene & palette, new composition seed.
      const seed = hashString(`${ep.id}:${prng(series.artwork.seed)()}`);
      await db.insert("artwork_assets", {
        id: newId("art"),
        owner_id: "usr_calm-editor",
        series_id: series.id,
        episode_id: ep.id,
        character_id: null,
        kind: "episode",
        source: "procedural",
        spec: { ...series.artwork, seed },
        prompt: null,
        provider: "calm-procedural",
        simulated: true,
        created_at: nowIso(),
      });
      return { preview: data.description };
    },
  },
  {
    id: "submit_review",
    label: "Save draft & submit for review",
    agent: "publishing",
    async run(ctx) {
      const db = getDb();
      const ep = (await db.get("episodes", episodeId(ctx)))!;
      const existing = (await db.list("editorial_reviews", { where: { episode_id: ep.id, status: "pending" } }))[0];
      if (existing) return { preview: "Already awaiting review." };
      const checks = await computeReviewChecks(ep.id);
      await db.insert("editorial_reviews", {
        id: newId("rev"),
        episode_id: ep.id,
        series_id: ep.series_id,
        submitted_by: "usr_calm-editor",
        source: "production_engine",
        status: "pending",
        checks,
        requested_release_at: (ctx.job.payload.release_at as string | undefined) ?? ep.release_at,
        reviewer_id: null,
        notes: `Produced by the Calm Production Engine (job ${ctx.job.id}).`,
        created_at: nowIso(),
        decided_at: null,
      });
      await db.update("episodes", ep.id, { status: "in_review", updated_at: nowIso() });
      return { preview: `Submitted with ${checks.filter((c) => c.status === "fail").length} failing / ${checks.filter((c) => c.status === "warn").length} warning check(s).` };
    },
  },
  {
    id: "notify",
    label: "Notify editorial team",
    agent: "publishing",
    async run(ctx) {
      const db = getDb();
      const ep = (await db.get("episodes", episodeId(ctx)))!;
      const series = await db.get("series", ep.series_id);
      const editors = await db.list("user_roles", { where: { role: ["admin", "editor"] } });
      for (const uid of new Set(editors.map((e) => e.user_id))) {
        await db.insert("notifications", { id: newId("ntf"), user_id: uid, kind: "production", title: "Episode ready for review", body: `${series?.title} – Episode ${ep.number}: ${ep.title}`, link: "/admin/review", read: false, created_at: nowIso() });
      }
      return { preview: "Editors notified. Publication waits for approval." };
    },
  },
];

registerWorkflow({ kind: "episode_production", steps: () => steps });

export async function startProductionNow(workflowId: string, requestedBy: string) {
  const db = getDb();
  const wf = await db.get("production_workflows", workflowId);
  if (!wf) throw new Error("Workflow not found.");
  const { enqueueJob } = await import("@/lib/jobs/runner");
  const { upcomingSlots } = await import("./scheduler");
  const slot = upcomingSlots(wf, new Date())[0];
  return enqueueJob({
    kind: "episode_production",
    payload: { workflow_id: wf.id, release_at: slot?.toISOString() ?? null, manual: true },
    series_id: wf.series_id,
    workflow_id: wf.id,
    idempotency_key: `manual:${wf.series_id}:${Date.now()}`,
    requested_by: requestedBy,
    budget_cents: wf.max_budget_cents,
  });
}

export { getProduction };
