import "server-only";
import sharp from "sharp";
import { env } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { nowIso } from "@/lib/util";
import { falNanoBanana, falQueue } from "@/lib/providers/fal";
import { getStudioSettings } from "./settings";
import { AGENTS, AGENT_BY_KEY } from "./agents";
import { log } from "@/lib/log";
import type { AgentKey } from "./types";

const KEY = "office/render.jpg";
const META = "office/render.json";

const PROMPT = [
  "Re-render this isometric office layout as a beautiful, high-detail stylised 3D isometric diorama (like a premium cozy game / Pixar-style architectural cutaway).",
  "Keep EXACTLY the same isometric camera angle, framing, room outline and the position, size and orientation of every desk, chair, sofa, table, partition, tree and wall – do not move or remove anything and do not add any people or characters.",
  "Style: warm dusk evening mood, golden glowing table lamps and warm globe floor lamps everywhere casting soft pools of light, honey oak wooden floors, cream and white furniture, white desks with iMac-style monitors and silver laptops, black mesh office chairs, cosy cream sofas with cushions, soft round rugs,",
  "frameless glass partition walls with thin black frames, abundant lush greenery – potted plants on every surface, indoor trees, trailing ivy along the top of the walls, a big central tree in a round planter,",
  "floor-to-ceiling windows showing a soft purple-pink dusk city skyline, bookshelves with books and plants, a fireplace with a glowing fire in the lounge, a white glowing neon 'Calm' script sign on the back wall.",
  "Soft global illumination, ambient occlusion, gentle bloom on lights, rich warm colours with lavender and blue accents, crisp clean edges. Keep the dark navy background outside the room. No people, no characters, no other text.",
].join(" ");

const SKIN = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), l = 0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
  return l > 200 ? "fair" : l > 175 ? "light" : l > 140 ? "medium tan" : l > 105 ? "brown" : "deep brown";
};
const HAIR = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, l = (r + g + b) / 3;
  if (l > 190) return r > b + 20 ? "blonde" : "silver grey";
  if (l < 40) return "black";
  if (r > g + 40 && l < 120) return "auburn red";
  return l > 120 ? "light brown" : "dark brown";
};
export type OfficePose = "work" | "rest";
const POSES: Record<OfficePose, string> = {
  work: "sitting on a black office chair, leaning slightly forward and typing on a small silver laptop on their lap, focused, friendly smile",
  rest: "sitting on a black office chair, leaning back with eyes closed, dozing peacefully with a sleepy smile, hands resting in lap",
};
const MATCH = "Match the reference image EXACTLY in art style, rendering, shading, lighting, proportions, head-to-body ratio, size in frame, camera angle, sweatshirt colour and logo, trousers and background – it must look like part of the same character set. This is a different person:";

function personPrompt(agent: AgentKey, pose: OfficePose, matchMaster = false): string {
  const a = AGENT_BY_KEY[agent];
  return `${matchMaster ? `${MATCH} ` : ""}A single cute stylised 3D character for an isometric cozy office game (Pixar / The Sims style, soft clay-like shading, big friendly head, small body): the studio's ${a.name}, ${SKIN(a.bedroom.skin)} skin, ${HAIR(a.bedroom.hair)} hair, wearing a royal blue sweatshirt with a small white "Calm" script logo on the chest and dark trousers, ${POSES[pose]}. Seen from a high isometric three-quarter angle, facing towards the front-left. Full body, centred, filling most of the frame. Plain flat pure green (#00FF00) chroma-key background, no shadow, no floor, no other objects, no text other than the logo.`;
}

/** Replace the green-screen background with transparency, despill the edges, trim and downsize. */
async function keyOut(img: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
    const m = Math.max(r, b);
    if (g > 110 && g > m * 1.35) data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
    else if (g > m) data[i + 1] = m; // remove green fringe
  }
  return sharp(data, { raw: info }).trim({ threshold: 1 }).resize({ height: 260, withoutEnlargement: true }).png().toBuffer();
}

type PeopleManifest = { status: "idle" | "running" | "done" | "failed"; done: string[]; total: number; error?: string; updated_at: string };
const PEOPLE = "office/people.json";
const MASTER = "office/people/_master.png";
const sprite = (agent: AgentKey, pose: OfficePose) => `office/people/${agent}-${pose}.png`;

export async function officePeople(): Promise<PeopleManifest | null> {
  const f = await getStorage().get(PEOPLE);
  return f ? (JSON.parse(f.data.toString()) as PeopleManifest) : null;
}
export async function officeSprite(file: string): Promise<Buffer | null> {
  if (!/^[a-z_]+-(work|rest)\.png$/.test(file)) return null;
  return (await getStorage().get(`office/people/${file}`))?.data ?? null;
}

let peopleRun: Promise<void> | null = null;
/** Make 3D character sprites for the whole team in the background (two poses each). */
export async function startOfficePeople(redo = false): Promise<PeopleManifest> {
  if (!env.falKey) throw new Error("Connect a FAL_KEY in Railway to make the 3D team.");
  const prev = await officePeople();
  if (peopleRun && prev?.status === "running") return prev;
  const jobs = AGENTS.flatMap((a) => (["work", "rest"] as OfficePose[]).map((pose) => ({ agent: a.key, pose })));
  const m: PeopleManifest = { status: "running", done: redo ? [] : (prev?.done ?? []), total: jobs.length, updated_at: nowIso() };
  const save = () => getStorage().put(PEOPLE, Buffer.from(JSON.stringify({ ...m, updated_at: nowIso() })), "application/json");
  await save();
  const todo = jobs.filter((j) => !m.done.includes(`${j.agent}-${j.pose}`));
  const settings = await getStudioSettings();
  peopleRun = (async () => {
    let failures = 0;
    // One master character sets the style; everyone else is drawn to match it so the whole team looks like one set.
    let master = redo ? null : ((await getStorage().get(MASTER))?.data ?? null);
    if (!master) {
      const first = todo.find((j) => j.pose === "work") ?? todo[0];
      if (first) {
        try {
          const img = await falNanoBanana(env.falKey!, { prompt: personPrompt(first.agent, first.pose), endpoint: settings.fal_image_endpoint, aspectRatio: "3:4" });
          master = img.data;
          await getStorage().put(MASTER, master, img.mimeType);
          await getStorage().put(sprite(first.agent, first.pose), await keyOut(img.data), "image/png");
          m.done.push(`${first.agent}-${first.pose}`);
          todo.splice(todo.indexOf(first), 1);
          await save();
        } catch (err) {
          m.status = "failed";
          m.error = err instanceof Error ? err.message : String(err);
          await save();
          return;
        }
      }
    }
    if (!master || !todo.length) {
      m.status = "done";
      await save();
      return;
    }
    const ref = { mimeType: "image/png", data: await sharp(master).png().toBuffer() };
    const worker = async () => {
      for (let j = todo.shift(); j; j = todo.shift()) {
        try {
          const img = await falNanoBanana(env.falKey!, { prompt: personPrompt(j.agent, j.pose, true), endpoint: settings.fal_image_endpoint, aspectRatio: "3:4", references: [ref] });
          await getStorage().put(sprite(j.agent, j.pose), await keyOut(img.data), "image/png");
          m.done.push(`${j.agent}-${j.pose}`);
          await save();
        } catch (err) {
          failures++;
          m.error = err instanceof Error ? err.message : String(err);
          log.warn("office", "3D team sprite failed", { agent: j.agent, pose: j.pose, error: m.error });
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    m.status = failures && m.done.length < m.total ? "failed" : "done";
    await save();
  })().finally(() => { peopleRun = null; });
  return m;
}

type Which = "saved" | "draft";
const FILE: Record<Which, { img: string; meta: string }> = {
  saved: { img: KEY, meta: META },
  draft: { img: "office/draft.jpg", meta: "office/draft.json" },
};
type RenderMeta = { updated_at: string; prompt?: string };

export async function officeRender(which: Which = "saved"): Promise<{ data: Buffer } | null> {
  const f = await getStorage().get(FILE[which].img);
  return f ? { data: f.data } : null;
}

async function readMeta(which: Which): Promise<RenderMeta | null> {
  const meta = await getStorage().get(FILE[which].meta);
  return meta ? (JSON.parse(meta.data.toString()) as RenderMeta) : null;
}

export async function officeRenderInfo(): Promise<{ saved: RenderMeta | null; draft: RenderMeta | null }> {
  return { saved: await readMeta("saved"), draft: await readMeta("draft") };
}

/**
 * Make a draft render with Nano Banana on fal. From the layout (a PNG snapshot
 * of the illustration) with the house style plus any extra instructions, or by
 * editing the current draft with the typed instructions. Drafts only replace
 * the saved office when someone presses Save.
 */
export async function makeOfficeRender(input: { snapshot?: Buffer; prompt?: string; from: "layout" | "draft" }): Promise<RenderMeta> {
  if (!env.falKey) throw new Error("Connect a FAL_KEY in Railway to make the 3D office.");
  const extra = input.prompt?.trim() ?? "";
  let ref: Buffer;
  let prompt: string;
  if (input.from === "draft") {
    const base = (await officeRender("draft")) ?? (await officeRender("saved"));
    if (!base) throw new Error("There's no render to change yet – generate one first.");
    if (!extra) throw new Error("Type what you'd like changed.");
    ref = await sharp(base.data).png().toBuffer();
    prompt = `Edit this isometric 3D office image: ${extra}. Keep the exact same camera angle, framing, room layout and the position of every desk, chair, sofa and wall; keep the same overall style and lighting unless asked to change it. Do not add people or characters. Keep the dark navy background outside the room.`;
  } else {
    if (!input.snapshot) throw new Error("Missing the office snapshot.");
    ref = await sharp(input.snapshot).flatten({ background: "#0a1026" }).png().toBuffer(); // validates it's an image
    prompt = extra ? `${PROMPT} Additional direction (follow this closely): ${extra}` : PROMPT;
  }
  const settings = await getStudioSettings();
  const img = await falNanoBanana(env.falKey, { prompt, endpoint: settings.fal_image_endpoint, aspectRatio: "16:9", references: [{ mimeType: "image/png", data: ref }] });
  const jpg = await sharp(img.data).resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const meta: RenderMeta = { updated_at: nowIso(), ...(extra ? { prompt: extra } : {}) };
  await getStorage().put(FILE.draft.img, jpg, "image/jpeg");
  await getStorage().put(FILE.draft.meta, Buffer.from(JSON.stringify({ ...meta, cost_cents: img.cost_cents })), "application/json");
  return meta;
}

/** Promote the draft to the saved office everyone sees. */
export async function saveOfficeDraft(): Promise<RenderMeta> {
  const d = await officeRender("draft");
  const meta = await readMeta("draft");
  if (!d || !meta) throw new Error("There's no draft to save.");
  await getStorage().put(FILE.saved.img, d.data, "image/jpeg");
  await getStorage().put(FILE.saved.meta, Buffer.from(JSON.stringify({ ...meta, updated_at: nowIso() })), "application/json");
  await discardOfficeDraft();
  return (await readMeta("saved"))!;
}

export async function discardOfficeDraft(): Promise<void> {
  await getStorage().remove(FILE.draft.img);
  await getStorage().remove(FILE.draft.meta);
}

export async function clearOfficeRender(): Promise<void> {
  await getStorage().remove(KEY);
  await getStorage().remove(META);
  await discardOfficeDraft();
}

// ---------------------------------------------------------------------------
// Animated office: Kling image-to-video on the 3D office with the team in it.

type AnimMeta = { status: "running" | "ready" | "failed"; prompt: string; error?: string; updated_at: string };
const ANIM = {
  draft: { video: "office/anim-draft.mp4", meta: "office/anim-draft.json" },
  saved: { video: "office/anim.mp4", meta: "office/anim.json" },
};
const ANIM_ENDPOINT = "fal-ai/kling-video/v2.5-turbo/standard/image-to-video";
let animRun: Promise<void> | null = null;

async function readAnim(which: Which): Promise<AnimMeta | null> {
  const f = await getStorage().get(ANIM[which].meta);
  return f ? (JSON.parse(f.data.toString()) as AnimMeta) : null;
}
export async function officeAnimInfo(): Promise<{ saved: AnimMeta | null; draft: AnimMeta | null }> {
  return { saved: await readAnim("saved"), draft: await readAnim("draft") };
}
export const officeAnimKey = (which: Which) => ANIM[which].video;

/**
 * Start animating a still of the 3D office (backdrop + team, composited in the
 * browser) with the typed motion prompt. Runs in the background (1–3 minutes);
 * the result is a draft until saved.
 */
export async function startOfficeAnimation(still: Buffer, prompt: string): Promise<AnimMeta> {
  if (!env.falKey) throw new Error("Connect a FAL_KEY in Railway to animate the office.");
  const cur = await readAnim("draft");
  if (animRun && cur?.status === "running") throw new Error("An animation is already being made – give it a minute.");
  const png = await sharp(still).jpeg({ quality: 90 }).toBuffer();
  const motion = `${prompt.trim()}. Isometric 3D cozy office diorama, locked-off static camera with no camera movement, the characters stay at their desks, small natural looping movements, warm lamps flicker softly, plants sway gently. Keep the art style exactly the same.`;
  const meta: AnimMeta = { status: "running", prompt: prompt.trim(), updated_at: nowIso() };
  const save = (m: AnimMeta) => getStorage().put(ANIM.draft.meta, Buffer.from(JSON.stringify({ ...m, updated_at: nowIso() })), "application/json");
  await save(meta);
  animRun = (async () => {
    try {
      const out = await falQueue<{ video?: { url: string } }>(env.falKey!, ANIM_ENDPOINT, { prompt: motion, image_url: `data:image/jpeg;base64,${png.toString("base64")}`, duration: "5" });
      if (!out.video?.url) throw new Error("No video came back.");
      const vid = await fetch(out.video.url);
      if (!vid.ok) throw new Error(`Couldn't download the clip (${vid.status}).`);
      await getStorage().put(ANIM.draft.video, Buffer.from(await vid.arrayBuffer()), "video/mp4");
      await save({ ...meta, status: "ready" });
    } catch (err) {
      await save({ ...meta, status: "failed", error: err instanceof Error ? err.message : String(err) });
    }
  })().finally(() => { animRun = null; });
  return meta;
}

export async function saveOfficeAnimation(): Promise<void> {
  const meta = await readAnim("draft");
  const f = await getStorage().get(ANIM.draft.video);
  if (!f || meta?.status !== "ready") throw new Error("There's no finished animation to save.");
  await getStorage().put(ANIM.saved.video, f.data, "video/mp4");
  await getStorage().put(ANIM.saved.meta, Buffer.from(JSON.stringify({ ...meta, updated_at: nowIso() })), "application/json");
  await discardOfficeAnimation();
}
export async function discardOfficeAnimation(): Promise<void> {
  await getStorage().remove(ANIM.draft.video);
  await getStorage().remove(ANIM.draft.meta);
}
