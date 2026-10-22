/**
 * Writes every written script to scripts/.render/jobs.json for the audio renderer.
 *   npm run content:export && npm run audio:render
 */
import fs from "node:fs";
import path from "node:path";
import { SCRIPTS } from "../src/content/scripts";
import { SERIES_SEED } from "../src/content/series-data";
import { DEMO_PLANS } from "../src/content/ai-demo";

const jobs: { id: string; voice: string; segments: { kind: string; text: string }[] }[] = [];
for (const s of SERIES_SEED) {
  s.episodes.forEach((_, i) => {
    const id = `${s.slug}-${i + 1}`;
    const script = SCRIPTS[id];
    if (script) jobs.push({ id, voice: s.creator.voice, segments: script.segments });
  });
}
const known = new Set(jobs.map((j) => j.id));
for (const id of Object.keys(SCRIPTS)) if (!known.has(id)) throw new Error(`Script ${id} has no matching series episode`);

DEMO_PLANS.forEach((plan, pi) => {
  plan.episodes.forEach((e, i) => {
    jobs.push({ id: `demo-${plan.key}-${i + 1}`, voice: pi % 2 ? "bm_george" : "af_heart", segments: e.script.segments });
  });
});

const out = path.resolve("scripts/.render/jobs.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(jobs, null, 1));
console.log(`Wrote ${jobs.length} jobs, ${jobs.reduce((n, j) => n + j.segments.reduce((m, s) => m + s.text.split(/\s+/).length, 0), 0)} words → ${out}`);
