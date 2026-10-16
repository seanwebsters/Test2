/**
 * Offline stand-ins used when a provider key isn't configured, so the whole
 * pipeline can run end to end in development. Everything they produce is
 * flagged `simulated` and labelled as such in the admin and review queue.
 */
import type { Series } from "@/lib/types";
import { hashString, pick, prng } from "@/lib/util";
import { applyFades } from "@/lib/audio/dsp";
import { SAMPLE_RATE } from "@/lib/audio/wav";
import type { EpisodePlan } from "./schemas";

const OPENINGS = [
  "Settle in, and let your shoulders soften.",
  "Find a comfortable place to rest, and let the day drift away.",
  "Take a slow breath in… and let it go.",
];
const TIMES = ["just after sunset", "in the last blue light of evening", "as the first stars appeared", "on a quiet, windless night"];
const DETAILS = [
  "a lantern glowed softly in a window",
  "the air smelled of woodsmoke and rain",
  "somewhere far away, a bell rang once and fell silent",
  "a cat curled itself into a perfect circle by the fire",
  "the path was lined with pale, sleepy flowers",
  "the water lapped gently against the stones",
  "an owl called, unhurried, from the trees",
  "a kettle began, very quietly, to sing",
];
const MOVES = [
  "There was no need to hurry. There never was, here.",
  "Each step was slower than the last, and that felt just right.",
  "Everything that needed doing had already been done.",
  "The world seemed to lean in close, and whisper that it was time to rest.",
];

export function simulatedPlan(series: Pick<Series, "title" | "description" | "tags">, number: number, previous: string[]): EpisodePlan {
  const rand = prng(hashString(`${series.title}:${number}`));
  const place = series.tags[0] ?? "the valley";
  const titles = ["The Quiet Harbour", "A Lantern in the Window", "The Long Way Home", "Night of Soft Rain", "The Sleeping Garden", "Stars Over the Water"];
  const title = `${pick(rand, titles)}`;
  return {
    title,
    summary: `A gentle evening in ${series.title}: an unhurried walk, small kindnesses and a quiet return home${previous.length ? `, picking up softly from “${previous[previous.length - 1]}”` : ""}.`,
    beats: ["Arriving as evening falls", `Wandering through ${place}`, "A small, kind encounter", "Returning home and settling in", "Drifting toward sleep"],
    ambience_prompt: "Soft night ambience: light rain on leaves, distant gentle wind, no voices, no sudden sounds, seamless loop",
    art_prompt: `Episode artwork for “${title}” from ${series.title}: a calm night scene, soft glowing light, no people's faces, no text`,
  };
}

export function simulatedScript(plan: EpisodePlan, series: Pick<Series, "title">, targetWords: number): string {
  const rand = prng(hashString(`${series.title}:${plan.title}`));
  const sections: string[] = [];
  const perBeat = Math.max(60, Math.round(targetWords / plan.beats.length));
  sections.push(`${pick(rand, OPENINGS)} [pause]\n\nTonight's story is called *${plan.title}*.`);
  for (const beat of plan.beats) {
    const paras: string[] = [`${beat}, ${pick(rand, TIMES)}.`];
    let words = paras[0]!.split(/\s+/).length;
    while (words < perBeat) {
      const p = `${capitalise(pick(rand, DETAILS))}, and ${pick(rand, DETAILS)}. ${pick(rand, MOVES)}`;
      paras.push(p);
      words += p.split(/\s+/).length;
    }
    sections.push(paras.join("\n\n"));
  }
  sections.push("And so, as everything grew still, the story slowed… and softened… and gently came to rest. [pause] Sleep well.");
  return sections.join("\n\n---\n\n");
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Placeholder "voice": a soft hum that follows the rhythm of the text so
 * pacing, mixing and QA stay meaningful. Clearly not speech.
 */
export function simulatedSpeech(text: string): Float32Array {
  const sr = SAMPLE_RATE;
  const clean = text.replace(/\*([^*]+)\*/g, "$1").replace(/\[pause\]/g, "…");
  const rand = prng(hashString(clean.slice(0, 200)));
  const sylDur = 1 / 3.2;
  const chunks: { dur: number; f0: number }[] = [];
  let pos = 0;
  for (const tok of clean.split(/\s+/).filter(Boolean)) {
    const n = Math.max(1, (tok.toLowerCase().match(/[aeiouy]+/g) ?? []).length);
    for (let s = 0; s < n; s++) chunks.push({ dur: sylDur * (0.8 + rand() * 0.4), f0: 150 * (1 - Math.min(0.18, pos++ * 0.012)) });
    chunks.push({ dur: 0.05, f0: 0 });
    if (/[,;:]$/.test(tok)) chunks.push({ dur: 0.35, f0: 0 });
    if (/[.!?…]["”']?$/.test(tok)) {
      chunks.push({ dur: 0.9, f0: 0 });
      pos = 0;
    }
  }
  const total = Math.ceil(chunks.reduce((n, c) => n + c.dur, 0) * sr) + sr;
  const out = new Float32Array(total);
  let at = Math.floor(sr * 0.3);
  let phase = 0;
  for (const c of chunks) {
    const len = Math.floor(c.dur * sr);
    if (c.f0) {
      for (let i = 0; i < len && at + i < total; i++) {
        const env = Math.sin((i / len) * Math.PI) ** 1.5;
        phase += (2 * Math.PI * c.f0) / sr;
        out[at + i] = (Math.sin(phase) * 0.6 + Math.sin(phase * 2) * 0.2) * env * 0.22;
      }
    }
    at += len;
  }
  const trimmed = out.subarray(0, Math.min(total, at + Math.floor(sr * 0.3)));
  applyFades(trimmed, sr, 0.05, 0.2);
  return trimmed;
}
