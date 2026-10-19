import "server-only";
import { getDb } from "@/lib/db";
import { newId, nowIso, wordCount } from "@/lib/util";
import { currentDeliverable, getBible, seriesContext, uniq, updateBible } from "../bible";
import { createRun, registerGateHook, registerHandler, type NewStep, type StepContext } from "../engine";
import { StepFailure } from "../errors";
import { BibleUpdateSchema, OutlineSchema, RevisionBriefSchema, ReviewSchema, ScenePlanSchema, type Outline, type Review, type RevisionBrief, type ScenePlan } from "../schemas";
import { getStudioSettings } from "../settings";
import type { AgentKey } from "../types";
import { coverSteps } from "./art-steps";

export interface ScriptData {
  scenes: { index: number; title: string; text: string }[];
}

/** Editorial passes run in parallel on every draft. */
export const REVIEWERS: { focus: string; agent: AgentKey; label: string; brief: string }[] = [
  {
    focus: "character",
    agent: "character_psychologist",
    label: "Character review",
    brief: "Are choices and reactions motivated? Is every character consistent with the bible? Is each voice distinctive without tags? Is interiority shown rather than explained?",
  },
  {
    focus: "romance",
    agent: "romance_architect",
    label: "Romance review",
    brief: "Does this episode's romance beat land? Is the chemistry specific and shown? Is tension sustained without resolving too early? Does it respect the slow-burn plan and the heat level?",
  },
  {
    focus: "dialogue",
    agent: "dialogue_editor",
    label: "Dialogue review",
    brief: "Quote weak lines – exposition, therapy-speak, on-the-nose feelings, interchangeable voices, lines that don't read well aloud – and offer better ones.",
  },
  {
    focus: "continuity",
    agent: "continuity_editor",
    label: "Continuity review",
    brief: "Check every name, fact, world rule, magic cost, location, timeline detail and relationship state against the bible and earlier episodes. Quote the line and cite the fact it breaks.",
  },
  {
    focus: "sleep",
    agent: "sleep_editor",
    label: "Sleep review",
    brief: "Does the episode become progressively calmer? Flag sudden events, tension spikes or essential information after the midpoint, frightening imagery, and any passage in the final third that is busy or dialogue-heavy. Suggest calmer wording that keeps the craft.",
  },
  {
    focus: "critic",
    agent: "story_critic",
    label: "Editorial critique",
    brief: "Independently judge originality, emotional depth, pacing, prose quality and clichés (including AI-sounding patterns). Would a discerning listener stay with it? Quote evidence for every criticism.",
  },
];

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */

export async function startEpisodeProduction(input: { seriesId: string; episodeNumber?: number; userId: string | null; releaseAt?: string | null; idempotencyKey?: string | null }) {
  const db = getDb();
  const settings = await getStudioSettings();
  const series = await db.get("series", input.seriesId);
  if (!series) throw new StepFailure("Series not found.");
  const plan = await db.findOne("season_plans", { series_id: input.seriesId, season_number: 1 });
  let season = (await db.list("seasons", { where: { series_id: input.seriesId } })).sort((a, b) => b.number - a.number)[0];
  if (!season) season = await db.insert("seasons", { id: newId("sea"), series_id: input.seriesId, number: 1, title: plan?.title ?? "Season 1", synopsis: plan?.arc ?? "", arc: plan?.arc ?? "", created_at: nowIso() });
  const existing = await db.list("episodes", { where: { season_id: season.id } });
  const number = input.episodeNumber ?? existing.filter((e) => e.status !== "rejected").reduce((m, e) => Math.max(m, e.number), 0) + 1;
  let ep = existing.find((e) => e.number === number && e.status === "draft");
  if (!ep) {
    if (existing.some((e) => e.number === number && e.status !== "rejected")) throw new StepFailure(`Episode ${number} already exists.`);
    const planned = plan?.episodes.find((e) => e.number === number);
    const bible = await getBible(input.seriesId);
    ep = await db.insert("episodes", {
      id: newId("ep"),
      series_id: input.seriesId,
      season_id: season.id,
      number,
      title: planned?.title ?? `Episode ${number}`,
      summary: planned?.premise ?? "",
      duration_seconds: (bible.identity?.target_minutes ?? 25) * 60,
      status: "draft",
      release_at: null,
      published_at: null,
      audio_asset_id: null,
      artwork_url: null,
      is_preview: number === 1,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  }
  const steps: NewStep[] = [
    { key: "outline", type: "ep.outline", agent: "series_architect", label: "Outline the episode", activity: "thinking", deps: [] },
    { key: "scene_plan", type: "ep.scene_plan", agent: "lead_writer", label: "Plan the scenes", activity: "thinking", deps: ["outline"] },
    { key: "draft", type: "ep.draft", agent: "lead_writer", label: "Write the first draft", activity: "typing", deps: ["scene_plan"] },
    ...reviewSteps(["draft"], 1, REVIEWERS.map((r) => r.focus)),
  ];
  return createRun({
    kind: "episode_production",
    title: `${series.title} · Episode ${number}`,
    series_id: input.seriesId,
    episode_id: ep.id,
    params: { episode_number: number, release_at: input.releaseAt ?? null },
    steps,
    budget_cents: settings.default_episode_budget_cents,
    idempotency_key: input.idempotencyKey ?? null,
    created_by: input.userId,
  });
}

function reviewSteps(deps: string[], round: number, focuses: string[]): NewStep[] {
  const reviews: NewStep[] = REVIEWERS.filter((r) => focuses.includes(r.focus)).map((r) => ({
    key: `review_${r.focus}_r${round}`,
    type: "ep.review",
    agent: r.agent,
    label: `${r.label}${round > 1 ? ` (round ${round})` : ""}`,
    activity: "reading" as const,
    deps,
    params: { focus: r.focus, round },
  }));
  return [
    ...reviews,
    { key: `synthesis_r${round}`, type: "ep.synthesis", agent: "creative_director", label: `Editorial synthesis${round > 1 ? ` (round ${round})` : ""}`, activity: "reading", deps: reviews.map((r) => r.key), params: { round, focuses } },
  ];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function episode(ctx: StepContext) {
  const ep = await getDb().get("episodes", ctx.run.episode_id ?? "");
  if (!ep) throw new StepFailure("Episode not found.");
  return ep;
}

const scope = (ctx: StepContext) => ({ episode_id: ctx.run.episode_id! });

/** Writing rules when one narrator performs the whole episode. */
export const SINGLE_NARRATOR_NOTE =
  "This episode is read aloud by ONE narrator – a slow, silky, calming voice – who reads every line, dialogue included; there are no separate character voices. Write for that: make it always clear who is speaking (simple tags like “she said”, or a name, placed early in the line), give characters distinct ways of speaking through word choice and rhythm rather than accents or shouting, keep dialogue sparing and quiet, and never rely on sound effects, voices overlapping or typography to carry meaning.";

export function scriptText(s: ScriptData, opts: { numbered?: boolean } = {}): string {
  return s.scenes.map((sc) => (opts.numbered ? `## Scene ${sc.index}: ${sc.title}\n${sc.text}` : sc.text)).join("\n\n---\n\n");
}

async function targetMinutes(seriesId: string) {
  const settings = await getStudioSettings();
  return Math.min((await getBible(seriesId)).identity?.target_minutes ?? 25, settings.max_episode_minutes);
}

/** Spoken words per minute at a slow bedtime pace, including pauses. */
const WPM = 130;

export function scenePlanProblems(plan: ScenePlan, targetWords: number): string[] {
  const problems: string[] = [];
  const s = plan.scenes;
  if (s.length < 4) problems.push(`Only ${s.length} scenes – plan at least four.`);
  const mid = Math.ceil(s.length / 2);
  for (let i = mid; i < s.length; i++) {
    if (s[i]!.intensity > s[i - 1]!.intensity + 0.05) problems.push(`Scene ${s[i]!.index} raises intensity after the midpoint (${s[i - 1]!.intensity} → ${s[i]!.intensity}).`);
  }
  const total = s.reduce((n, x) => n + x.target_words, 0);
  if (total < targetWords * 0.75 || total > targetWords * 1.3) problems.push(`Scene targets add up to ${total} words; aim for about ${targetWords}.`);
  if (s.length && s[s.length - 1]!.intensity > 0.3) problems.push("The final scene should be the calmest (intensity ≤ 0.3).");
  return problems;
}

/* ------------------------------------------------------------------ */
/* Writing handlers                                                    */
/* ------------------------------------------------------------------ */

registerHandler("ep.outline", async (ctx) => {
  const db = getDb();
  const ep = await episode(ctx);
  const plan = await db.findOne("season_plans", { series_id: ep.series_id, season_number: 1 });
  const planned = plan?.episodes.find((e) => e.number === ep.number);
  const res = await ctx.claude({
    context: await seriesContext(ep.series_id),
    prompt: `Outline episode ${ep.number}.${planned ? `\nSeason plan for this episode:\n${JSON.stringify(planned, null, 1)}` : "\nIt is not in the season plan yet – continue the story naturally from the episodes so far."}\nEvery key development must land in the first half. List the bible facts the writer must respect.`,
    schema: OutlineSchema,
  });
  const o: Outline = res.data;
  await db.update("episodes", ep.id, { title: o.title, summary: o.summary, updated_at: nowIso() });
  await ctx.deliver({ kind: "outline", key: "outline", title: `Outline: ${o.title}`, data: o, reasoning: o.emotional_core, model: res.model });
  return { summary: `“${o.title}” – ${o.summary}` };
});

registerHandler("ep.scene_plan", async (ctx) => {
  const ep = await episode(ctx);
  const outline = (await currentDeliverable<Outline>(scope(ctx), "outline"))!.data;
  const targetWords = (await targetMinutes(ep.series_id)) * WPM;
  const context = await seriesContext(ep.series_id);
  let prompt = `Plan the scenes for this episode (about ${targetWords} words in total, 5–8 scenes). Intensity must not rise after the midpoint and the final scene must be the calmest.\n\nOutline:\n${JSON.stringify(outline, null, 1)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await ctx.claude({ context, prompt, schema: ScenePlanSchema });
    const problems = scenePlanProblems(res.data, targetWords);
    if (!problems.length) {
      await ctx.deliver({ kind: "scene_plan", key: "scene_plan", title: "Scene plan", data: res.data, reasoning: res.data.scenes.map((s) => `${s.index}. ${s.title} (${s.intensity})`).join(" · "), model: res.model });
      return { summary: `${res.data.scenes.length} scenes, intensity ${res.data.scenes.map((s) => s.intensity).join(" → ")}.` };
    }
    prompt += `\n\nYour previous plan had these problems – fix them:\n${problems.map((p) => `- ${p}`).join("\n")}`;
  }
  throw new StepFailure("The scene plan kept breaking the sleep-shape rules.", true);
});

registerHandler("ep.draft", async (ctx) => {
  const ep = await episode(ctx);
  const outline = (await currentDeliverable<Outline>(scope(ctx), "outline"))!.data;
  const plan = (await currentDeliverable<ScenePlan>(scope(ctx), "scene_plan"))!.data;
  const context = await seriesContext(ep.series_id);
  // Resume support: scenes already written in an earlier attempt are kept.
  const progress = (await currentDeliverable<ScriptData>(scope(ctx), "draft_progress"))?.data ?? { scenes: [] };
  const narration = (await getStudioSettings()).single_narrator ? `\n\n${SINGLE_NARRATOR_NOTE}` : "";
  const scenes = [...progress.scenes];
  let model = "";
  for (const sc of plan.scenes) {
    if (scenes.some((s) => s.index === sc.index)) continue;
    const prior = scenes.length
      ? `\n\nThe episode so far:\n${scenes
          .map((s, i) => (i >= scenes.length - 2 ? `## Scene ${s.index}: ${s.title}\n${s.text}` : `## Scene ${s.index}: ${s.title} (summary) – ${plan.scenes.find((p) => p.index === s.index)?.purpose}`))
          .join("\n\n")}`
      : "";
    const res = await ctx.claude({
      context,
      prompt: `Write scene ${sc.index} of ${plan.scenes.length} for episode ${ep.number}, “${outline.title}”.\n\nOutline:\n${JSON.stringify(outline, null, 1)}\n\nFull scene plan:\n${plan.scenes.map((p) => `${p.index}. ${p.title} – ${p.purpose} (intensity ${p.intensity})`).join("\n")}\n\nThis scene:\n${JSON.stringify(sc, null, 1)}${prior}\n\nWrite about ${sc.target_words} words of finished prose for this scene only. No heading, no scene number, no notes – just the story, in the series' voice. ${sc.index === plan.scenes.length ? "This is the final scene: let it drift gently to rest." : ""}${narration}`,
      maxTokens: 16000,
    });
    model = res.model;
    scenes.push({ index: sc.index, title: sc.title, text: res.data.trim() });
    await ctx.deliver({ kind: "script", key: "draft_progress", title: `Draft in progress (${scenes.length}/${plan.scenes.length})`, data: { scenes }, reasoning: "", model });
  }
  const script: ScriptData = { scenes: scenes.sort((a, b) => a.index - b.index) };
  const words = wordCount(scriptText(script));
  await ctx.deliver({ kind: "script", key: "script", title: "First draft", data: script, reasoning: `${words} words in ${script.scenes.length} scenes.`, model: model || "—" });
  return { summary: `First draft: ${words} words, ${script.scenes.length} scenes.` };
});

registerHandler("ep.review", async (ctx) => {
  const ep = await episode(ctx);
  const focus = String(ctx.step.params.focus);
  const round = Number(ctx.step.params.round);
  const reviewer = REVIEWERS.find((r) => r.focus === focus)!;
  const script = (await currentDeliverable<ScriptData>(scope(ctx), "script"))!.data;
  const plan = (await currentDeliverable<ScenePlan>(scope(ctx), "scene_plan"))!.data;
  const res = await ctx.claude({
    agent: reviewer.agent,
    context: await seriesContext(ep.series_id),
    prompt: `${reviewer.label} of episode ${ep.number}, “${ep.title}” (draft round ${round}).\n${reviewer.brief}\nGive structured notes with quoted evidence and concrete suggestions. Mark "revise" only for problems a listener would notice.${(await getStudioSettings()).single_narrator ? `\n${SINGLE_NARRATOR_NOTE} Flag any line where a listener couldn't tell who is speaking.` : ""}\n\nScene plan (intended intensity): ${plan.scenes.map((s) => `${s.index}:${s.intensity}`).join(", ")}\n\n${scriptText(script, { numbered: true })}`,
    schema: ReviewSchema,
  });
  await ctx.deliver({ kind: "review", key: `review:${focus}`, title: `${reviewer.label} – round ${round}`, data: res.data, reasoning: res.data.summary, model: res.model });
  const majors = res.data.issues.filter((i) => i.severity === "major").length;
  return { summary: `${res.data.verdict === "approve" ? "Approves" : "Requests revisions"} – ${majors} major, ${res.data.issues.length - majors} minor note(s).` };
});

registerHandler("ep.synthesis", async (ctx) => {
  const ep = await episode(ctx);
  const settings = await getStudioSettings();
  const round = Number(ctx.step.params.round);
  const focuses = (ctx.step.params.focuses as string[]) ?? REVIEWERS.map((r) => r.focus);
  const reviews: { focus: string; review: Review }[] = [];
  for (const f of focuses) {
    const r = await currentDeliverable<Review>(scope(ctx), `review:${f}`);
    if (r) reviews.push({ focus: f, review: r.data });
  }
  const script = (await currentDeliverable<ScriptData>(scope(ctx), "script"))!.data;
  const res = await ctx.claude({
    context: await seriesContext(ep.series_id),
    prompt: `Synthesise the editorial notes on episode ${ep.number}, “${ep.title}” (round ${round} of at most ${settings.max_revision_rounds + 1}).\nDecide "approve" if the script meets the studio standard, otherwise "revise" with precise scene-level instructions for the writer (merge duplicates, keep evidence-backed issues, dismiss taste-only notes with a reason).\n\n${reviews.map((r) => `## ${r.focus} review\n${JSON.stringify(r.review, null, 1)}`).join("\n\n")}\n\nScene titles: ${script.scenes.map((s) => `${s.index}. ${s.title}`).join("; ")}`,
    schema: RevisionBriefSchema,
  });
  const brief: RevisionBrief = res.data;
  await ctx.deliver({ kind: "revision_brief", key: "revision_brief", title: `Editorial synthesis – round ${round}`, data: brief, reasoning: brief.summary, model: res.model });
  if (brief.decision === "revise" && brief.scene_instructions.length && round <= settings.max_revision_rounds) {
    const reRev = uniq(["critic", ...reviews.filter((r) => r.review.verdict === "revise").map((r) => r.focus)]);
    return {
      summary: `Revision round ${round}: ${brief.scene_instructions.length} scene(s) to rewrite. ${brief.summary}`,
      addSteps: [
        { key: `rewrite_r${round}`, type: "ep.rewrite", agent: "lead_writer", label: `Targeted rewrites (round ${round})`, activity: "typing", deps: [ctx.step.key], params: { round } },
        ...reviewSteps([`rewrite_r${round}`], round + 1, reRev),
      ],
    };
  }
  return {
    summary: brief.decision === "approve" ? `Script approved: ${brief.summary}` : `Revision limit reached – proceeding with notes for the human reviewer. ${brief.summary}`,
    addSteps: postWritingSteps(ctx.step.key),
  };
});

registerHandler("ep.rewrite", async (ctx) => {
  const ep = await episode(ctx);
  const round = Number(ctx.step.params.round);
  const brief = (await currentDeliverable<RevisionBrief>(scope(ctx), "revision_brief"))!.data;
  const script = structuredClone((await currentDeliverable<ScriptData>(scope(ctx), "script"))!.data);
  const context = await seriesContext(ep.series_id);
  const allIssues: { focus: string; issue: Review["issues"][number] }[] = [];
  for (const r of REVIEWERS) {
    const rv = await currentDeliverable<Review>(scope(ctx), `review:${r.focus}`);
    for (const i of rv?.data.issues ?? []) allIssues.push({ focus: r.focus, issue: i });
  }
  let model = "";
  const narration = (await getStudioSettings()).single_narrator ? `\n\n${SINGLE_NARRATOR_NOTE}` : "";
  for (const ins of brief.scene_instructions) {
    const sc = script.scenes.find((s) => s.index === ins.scene_index);
    if (!sc) continue;
    const notes = allIssues.filter((i) => i.issue.scene_index === ins.scene_index);
    const res = await ctx.claude({
      context,
      prompt: `Revise scene ${sc.index} (“${sc.title}”) of episode ${ep.number}. Apply these instructions from the Creative Director exactly, and preserve everything that already works – voice, length, imagery, continuity.\n\nInstructions:\n${ins.instructions.map((i) => `- ${i}`).join("\n")}\n\nSupporting editorial notes:\n${notes.map((n) => `- [${n.focus}] “${n.issue.quote}” – ${n.issue.problem} → ${n.issue.suggestion}`).join("\n") || "- none"}\n\nNeighbouring scenes for continuity:\n${script.scenes
        .filter((s) => Math.abs(s.index - sc.index) === 1)
        .map((s) => `## Scene ${s.index}\n${s.text.slice(0, 2500)}`)
        .join("\n\n")}\n\nCurrent scene ${sc.index}:\n${sc.text}\n\nReturn only the complete revised scene prose.${narration}`,
      maxTokens: 16000,
    });
    model = res.model;
    sc.text = res.data.trim();
  }
  await ctx.deliver({ kind: "script", key: "script", title: `Revised draft (round ${round})`, data: script, reasoning: `Rewrote scenes ${brief.scene_instructions.map((s) => s.scene_index).join(", ")}.`, model: model || "—" });
  return { summary: `Rewrote ${brief.scene_instructions.length} scene(s).` };
});

/* ------------------------------------------------------------------ */
/* Final script → bible, then art + audio + QC + approval              */
/* ------------------------------------------------------------------ */

export function postWritingSteps(after: string, sfx = ""): NewStep[] {
  return [
    { key: `finalize${sfx}`, type: "ep.finalize", agent: "continuity_editor", label: "Lock the script and update the bible", activity: "typing", deps: [after] },
    // Covers are made once; revisions from your notes keep the approved cover.
    ...(sfx ? [] : coverSteps("finalize")),
    { key: `audio_direction${sfx}`, type: "audio.direction", agent: "audio_director", label: "Plan narration and sound", activity: "thinking", deps: [`finalize${sfx}`], params: { sfx } },
  ];
}

registerHandler("ep.finalize", async (ctx) => {
  const db = getDb();
  const ep = await episode(ctx);
  const script = (await currentDeliverable<ScriptData>(scope(ctx), "script"))!;
  const outline = (await currentDeliverable<Outline>(scope(ctx), "outline"))?.data;
  const text = scriptText(script.data);
  const res = await ctx.claude({
    context: await seriesContext(ep.series_id),
    prompt: `Episode ${ep.number}, “${ep.title}”, is final. Record what it establishes in the series bible: new canon facts, events, relationship state changes, threads opened and resolved, and a one-line timeline entry.\n\n${scriptText(script.data, { numbered: true })}`,
    schema: BibleUpdateSchema,
  });
  const u = res.data;
  await updateBible(
    ep.series_id,
    (b) => ({
      ...b,
      established_facts: uniq([...b.established_facts, ...u.new_facts]),
      timeline: [...b.timeline, { episode: `Ep ${ep.number}`, summary: u.timeline_entry }],
      open_threads: uniq([...b.open_threads.filter((t) => !u.threads_resolved.includes(t)), ...u.threads_opened]),
      resolved_threads: uniq([...b.resolved_threads, ...u.threads_resolved]),
    }),
    { reason: `Episode ${ep.number} canon recorded`, agent: "continuity_editor", runId: ctx.run.id },
  );
  for (const ru of u.relationship_updates) {
    const rel = (await db.list("relationships", { where: { series_id: ep.series_id } })).find(
      (r) => [r.a_name, r.b_name].sort().join("|").toLowerCase() === [ru.a_name, ru.b_name].sort().join("|").toLowerCase(),
    );
    if (rel) await db.update("relationships", rel.id, { current_state: ru.current_state, updated_at: nowIso() });
  }
  const existing = await db.findOne("episode_scripts", { episode_id: ep.id });
  const row = { content: text, scenes: script.data.scenes, word_count: wordCount(text), version: script.version, provider: "anthropic", model: script.model, notes: [], updated_at: nowIso() };
  if (existing) await db.update("episode_scripts", existing.id, row);
  else await db.insert("episode_scripts", { ...row, id: newId("scr"), episode_id: ep.id, series_id: ep.series_id, created_at: nowIso() });
  if (outline) await db.update("episodes", ep.id, { title: outline.title, summary: outline.summary, updated_at: nowIso() });
  await ctx.deliver({ kind: "bible_update", key: "bible_update", title: "Bible update", data: u, reasoning: u.timeline_entry, model: res.model });
  return { summary: `Final script v${script.version} (${wordCount(text)} words). Bible: +${u.new_facts.length} facts, ${u.threads_opened.length} threads opened, ${u.threads_resolved.length} resolved.` };
});

/* ---------------- Human approval gate ---------------- */

registerHandler("ep.approval", async (ctx) => {
  const db = getDb();
  const ep = await episode(ctx);
  const qc = (await currentDeliverable<{ verdict: string; summary: string; issues: { area: string; problem: string }[] }>(scope(ctx), "qc_report"))?.data;
  const script = await db.findOne("episode_scripts", { episode_id: ep.id });
  const asset = ep.audio_asset_id ? await db.get("audio_assets", ep.audio_asset_id) : null;
  const checks = [
    { name: "script" as const, status: script ? ("pass" as const) : ("fail" as const), detail: script ? `${script.word_count} words, version ${script.version}, passed ${REVIEWERS.length} editorial reviews.` : "No final script." },
    { name: "audio" as const, status: asset ? ("pass" as const) : ("fail" as const), detail: asset ? `${Math.round(asset.duration_seconds / 60)} min mastered ${asset.mime_type}.` : "No mastered audio." },
    { name: "artwork" as const, status: ep.artwork_url ? ("pass" as const) : ("warn" as const), detail: ep.artwork_url ? "Cover selected by the Art Director." : "No cover." },
    {
      name: "audio_qa" as const,
      status: !qc ? ("not_run" as const) : qc.verdict === "approve" ? ("pass" as const) : ("warn" as const),
      detail: qc ? `${qc.summary}${qc.issues.length ? ` Open notes: ${qc.issues.map((i) => i.problem).join(" ")}` : ""}` : "Quality Controller has not reviewed.",
    },
  ];
  const editors = await db.list("user_roles", { where: { role: ["admin", "editor"] } });
  const review = await db.insert("editorial_reviews", {
    id: newId("rev"),
    episode_id: ep.id,
    series_id: ep.series_id,
    submitted_by: ctx.run.created_by ?? editors[0]?.user_id ?? "usr_calm-editor",
    source: "agents",
    status: "pending",
    checks,
    requested_release_at: (ctx.run.params.release_at as string | null) ?? null,
    reviewer_id: null,
    notes: "",
    created_at: nowIso(),
    decided_at: null,
  });
  await db.update("episodes", ep.id, { status: "in_review", updated_at: nowIso() });
  await db.update("workflow_steps", ctx.step.id, { params: { ...ctx.step.params, review_id: review.id } });
  for (const uid of new Set(editors.map((e) => e.user_id))) {
    await db.insert("notifications", { id: newId("ntf"), user_id: uid, kind: "review", title: "Episode ready for your approval", body: `${ep.title} has been produced and passed QC.`, link: `/studio/approvals`, read: false, created_at: nowIso() });
  }
  return { summary: `“${ep.title}” is ready for your approval.`, awaitApproval: true };
});

/** Fired from decideReview when a human decides on an agent-produced episode. */
registerGateHook("ep.approval", async (run, step, decision) => {
  if (decision.approved || !decision.notes || step.params.no_revision) return;
  // Changes requested: turn the notes into a revision brief and run the rewrite → finalize → art/audio chain again.
  // Rounds are unlimited – number each one after the rounds this run has already had.
  const done = (await getDb().list("workflow_steps", { where: { run_id: run.id } })).filter((s) => /^human_notes_\d+$/.test(s.key)).length;
  const n = done + 1;
  return [
    { key: `human_notes_${n}`, type: "ep.human_notes", agent: "creative_director", label: "Turn your notes into a revision brief", activity: "reading", deps: [step.key], params: { notes: decision.notes, round: n } },
    { key: `human_rewrite_${n}`, type: "ep.rewrite", agent: "lead_writer", label: "Rewrite to your notes", activity: "typing", deps: [`human_notes_${n}`], params: { round: `h${n}` } },
    ...postWritingSteps(`human_rewrite_${n}`, `_h${n}`),
  ];
});

registerHandler("ep.human_notes", async (ctx) => {
  const ep = await episode(ctx);
  const script = (await currentDeliverable<ScriptData>(scope(ctx), "script"))!.data;
  const res = await ctx.claude({
    context: await seriesContext(ep.series_id),
    prompt: `The Network Executive requested changes to episode ${ep.number}, “${ep.title}”:\n\n${String(ctx.step.params.notes)}\n\nTurn these notes into a precise revision brief (decision "revise") with scene-level instructions.\n\nScenes: ${script.scenes.map((s) => `${s.index}. ${s.title}`).join("; ")}`,
    schema: RevisionBriefSchema,
  });
  await ctx.deliver({ kind: "revision_brief", key: "revision_brief", title: "Revision brief from your notes", data: { ...res.data, decision: "revise" }, reasoning: res.data.summary, model: res.model });
  return { summary: res.data.summary };
});

export { scope };
