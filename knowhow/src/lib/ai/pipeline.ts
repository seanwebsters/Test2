import "server-only";
import { CATEGORY_BY_ID } from "@/content/categories";
import { matchDemoPlan } from "@/content/ai-demo";
import { demoAudio } from "@/lib/catalog";
import type { AiEpisode, AiJobRecord, AiSeriesRecord, AiStep, UserRecord } from "@/lib/model";
import { store, withUser } from "@/lib/store";
import { aiAllowance } from "@/lib/entitlements";
import type { CategoryId } from "@/lib/types";
import { planSeries, writeEpisode } from "./generate";
import { AI_MODEL, aiConfigured, ttsProvider } from "./providers";
import { narrate } from "./tts";

export const EPISODES_PER_SERIES = 4;

const STEP_LABELS: [string, string][] = [
  ["interpret", "Interpret your topic"],
  ["difficulty", "Choose the right difficulty"],
  ["curriculum", "Design a curriculum"],
  ["episodes", "Divide it into episodes"],
  ["scripts", "Write the scripts"],
  ["titles", "Title and describe each episode"],
  ["audio", "Narrate the audio"],
  ["artwork", "Create the cover"],
  ["save", "Save to your library"],
  ["recommend", "Recommend what's next"],
];

const id = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function newJob(owner: string, prompt: string, mode: "live" | "demo"): AiJobRecord {
  const now = new Date().toISOString();
  return { id: id("job"), ownerId: owner, prompt, mode, status: "queued", steps: STEP_LABELS.map(([key, label]) => ({ key, label, status: "pending" })), createdAt: now, updatedAt: now };
}

function paletteFor(category: CategoryId): [string, string, string, string] {
  const c = CATEGORY_BY_ID[category];
  return [c.deep, c.color, c.color2, "#F7F4E9"];
}

export class GenerationRefused extends Error {}

/** Creates a job. Live mode returns immediately and runs in the background; demo mode resolves synchronously. */
export async function createGeneration(user: UserRecord, prompt: string, month: string): Promise<{ job: AiJobRecord; run?: () => Promise<void> }> {
  if (!aiConfigured()) return { job: await createDemo(user, prompt) };
  const allowance = aiAllowance(user, month);
  if (allowance.remaining <= 0) throw new GenerationRefused(`You've used your ${allowance.limit} AI series this month.`);
  const job = newJob(user.id, prompt, "live");
  await store.saveJob(job);
  return { job, run: () => runLive(job.id, month) };
}

async function createDemo(user: UserRecord, prompt: string): Promise<AiJobRecord> {
  const plan = matchDemoPlan(prompt);
  const job = newJob(user.id, prompt, "demo");
  if (!plan) {
    job.status = "failed";
    job.error = "Demo mode can't write new series: no AI key is configured on this server. Try one of the sample prompts, or add ANTHROPIC_API_KEY to generate any topic.";
    job.steps = job.steps.map((s) => ({ ...s, status: "skipped" }));
    await store.saveJob(job);
    return job;
  }
  const seriesId = id("ai");
  const episodes: AiEpisode[] = plan.episodes.map((e, i) => {
    const audio = demoAudio(`demo-${plan.key}-${i + 1}`);
    return {
      id: `${seriesId}-${i + 1}`,
      n: i + 1,
      title: e.title,
      description: e.description,
      segments: e.script.segments,
      insights: e.script.insights,
      challenge: e.script.challenge,
      audio: audio ? { key: `demo:demo-${plan.key}-${i + 1}`, duration: audio.duration, lines: audio.lines } : undefined,
      browserTts: !audio,
    };
  });
  const series: AiSeriesRecord = {
    id: seriesId, ownerId: user.id, prompt, mode: "demo", title: plan.title, tagline: plan.tagline, description: plan.description,
    difficulty: plan.difficulty, category: plan.category, art: plan.art, followUps: plan.followUps, episodes, createdAt: new Date().toISOString(),
    ttsProvider: "kokoro (pre-rendered sample)",
  };
  await store.saveAiSeries(series);
  await withUser(user.id, (u) => { u.aiSeries = [seriesId, ...u.aiSeries.filter((s) => s !== seriesId)]; });
  job.status = "done";
  job.seriesId = seriesId;
  job.steps = job.steps.map((s) => ({ ...s, status: "skipped", detail: "Demo mode — sample written in advance, not generated from your prompt" }));
  await store.saveJob(job);
  return job;
}

async function runLive(jobId: string, month: string) {
  const job = (await store.getJob(jobId))!;
  const step = async (key: string, status: AiStep["status"], detail?: string) => {
    const s = job.steps.find((x) => x.key === key)!;
    s.status = status;
    if (detail !== undefined) s.detail = detail;
    job.updatedAt = new Date().toISOString();
    await store.saveJob(job);
  };
  try {
    job.status = "running";
    for (const k of ["interpret", "difficulty", "curriculum"]) await step(k, "running");
    const { data: plan, model } = await planSeries(job.prompt, EPISODES_PER_SERIES);
    await step("interpret", "done", plan.interpretedTopic);
    await step("difficulty", "done", `${plan.difficulty} — ${plan.difficultyReason}`);
    await step("curriculum", "done", `${plan.curriculum.length} parts`);
    await step("episodes", "done", plan.curriculum.map((c, i) => `${i + 1}. ${c.title}`).join(" · "));

    await step("scripts", "running", `0 of ${plan.curriculum.length}`);
    let written = 0;
    const scripts = await Promise.all(
      plan.curriculum.map(async (_, i) => {
        const { data } = await writeEpisode(plan, i);
        written++;
        await step("scripts", "running", `${written} of ${plan.curriculum.length}`);
        return data;
      }),
    );
    await step("scripts", "done", `${scripts.reduce((n, s) => n + [s.hook, ...s.story, ...s.facts, s.insight, s.outro].join(" ").split(/\s+/).length, 0)} words written`);
    await step("titles", "done", "Titles and descriptions from the curriculum");

    const seriesId = id("ai");
    const episodes: AiEpisode[] = scripts.map((s, i) => ({
      id: `${seriesId}-${i + 1}`,
      n: i + 1,
      title: plan.curriculum[i].title,
      description: plan.curriculum[i].description,
      segments: [
        { kind: "hook", text: s.hook },
        ...s.story.map((text) => ({ kind: "story" as const, text })),
        ...s.facts.map((text) => ({ kind: "fact" as const, text })),
        { kind: "insight", text: s.insight },
        { kind: "outro", text: s.outro },
      ],
      insights: s.insights,
      challenge: s.challenge.answer < s.challenge.options.length ? s.challenge : undefined,
      browserTts: true,
    }));

    const tts = ttsProvider();
    if (tts) {
      await step("audio", "running", `Narrating with ${tts}`);
      for (const e of episodes) {
        const out = await narrate(tts, e.segments);
        const key = `${e.id}.mp3`;
        await store.putAudio(key, out.mp3);
        e.audio = { key, duration: out.duration, lines: out.lines };
        e.browserTts = false;
      }
      await step("audio", "done", `${episodes.length} episodes narrated with ${tts}`);
    } else {
      await step("audio", "skipped", "No TTS key configured — playback uses your browser's built-in voice (development fallback)");
    }

    await step("artwork", "done", `Generative “${plan.motif}” cover in ${CATEGORY_BY_ID[plan.category as CategoryId].label} colours (no image model used)`);

    const series: AiSeriesRecord = {
      id: seriesId, ownerId: job.ownerId, prompt: job.prompt, mode: "live", title: plan.title, tagline: plan.tagline, description: plan.description,
      difficulty: plan.difficulty, category: plan.category as CategoryId, art: { motif: plan.motif, palette: paletteFor(plan.category as CategoryId) },
      followUps: plan.followUps, episodes, createdAt: new Date().toISOString(), model: model ?? AI_MODEL, ttsProvider: tts ?? undefined,
    };
    await store.saveAiSeries(series);
    await withUser(job.ownerId, (u) => {
      u.aiSeries = [seriesId, ...u.aiSeries];
      const used = u.aiGenerationsThisMonth.month === month ? u.aiGenerationsThisMonth.count : 0;
      u.aiGenerationsThisMonth = { month, count: used + 1 };
    });
    await step("save", "done", "Added to your library");
    await step("recommend", "done", plan.followUps.join(" · "));
    job.seriesId = seriesId;
    job.status = "done";
    await store.saveJob(job);
  } catch (e) {
    console.error("[ai] generation failed", e);
    job.status = "failed";
    job.error = e instanceof Error ? e.message : "Generation failed";
    for (const s of job.steps) if (s.status === "running" || s.status === "pending") s.status = s.status === "running" ? "failed" : "skipped";
    job.updatedAt = new Date().toISOString();
    await store.saveJob(job);
  }
}
