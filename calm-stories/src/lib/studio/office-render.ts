import "server-only";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { env } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { nowIso } from "@/lib/util";
import { falNanoBanana, falQueue } from "@/lib/providers/fal";
import { getStudioSettings } from "./settings";
import { AGENTS, AGENT_BY_KEY } from "./agents";
import { log } from "@/lib/log";
import type { AgentKey } from "./types";
import { runFfmpeg, withTmp } from "./mixing";

const KEY = "office/render.jpg";
const META = "office/render.json";

const PROMPT = [
  "Re-render this isometric office layout as a beautiful, high-detail stylised 3D isometric diorama (like a premium cozy game / Pixar-style architectural cutaway).",
  "Keep EXACTLY the same isometric camera angle, framing, room outline and the position, size and orientation of every desk, chair, sofa, table, partition, tree and wall – do not move or remove anything and do not add any people or characters.",
  "Style: warm dusk evening mood, golden glowing table lamps and warm globe floor lamps everywhere casting soft pools of light, honey oak wooden floors, cream and white furniture, white desks with iMac-style monitors and silver laptops, black mesh office chairs, cosy cream sofas with cushions, soft round rugs,",
  "frameless glass partition walls with thin black frames, abundant lush greenery – potted plants on every surface, indoor trees, trailing ivy along the top of the walls, a big central tree in a round planter,",
  "floor-to-ceiling windows showing a soft purple-pink dusk city skyline, bookshelves with books and plants, a fireplace with a glowing fire in the lounge, a white glowing neon 'Calm' script sign on the back wall.",
  "Soft global illumination, ambient occlusion, gentle bloom on lights, rich warm colours with lavender and blue accents, crisp clean edges. The area outside the room must be one plain, flat, solid dark navy (#0a1026) colour with no stars, gradient or texture. No people, no characters, no other text.",
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

/** Key out the green but keep the full frame (to find where the character is). */
async function keyOutFull(img: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
    if (g > 110 && g > Math.max(r, b) * 1.35) data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
  }
  return sharp(data, { raw: info }).png().toBuffer();
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
          await getStorage().put(`office/people/raw/${first.agent}-${first.pose}.png`, await sharp(img.data).png().toBuffer(), "image/png");
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
          await getStorage().put(`office/people/raw/${j.agent}-${j.pose}.png`, await sharp(img.data).png().toBuffer(), "image/png");
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
type RenderMeta = { updated_at: string; prompt?: string; layout?: number };
/** Bump when the office layout changes, so old renders (without e.g. the review room) can be spotted. */
export const OFFICE_LAYOUT = 2;

export async function officeRender(which: Which = "saved"): Promise<{ data: Buffer } | null> {
  const f = await getStorage().get(FILE[which].img);
  return f ? { data: f.data } : null;
}

/**
 * The render with the plain background around the building made transparent,
 * so the office floats on the page's gradient. Flood-fills from the edges over
 * pixels close to the corner colour; cached per render.
 */
export async function officeRenderCutout(which: Which = "saved"): Promise<Buffer | null> {
  const meta = await readMeta(which);
  const cacheKey = `office/${which}-cutout.png`, cacheMeta = `office/${which}-cutout.json`;
  const cached = await getStorage().get(cacheMeta);
  if (meta && cached && (JSON.parse(cached.data.toString()) as { of: string }).of === meta.updated_at) {
    const png = await getStorage().get(cacheKey);
    if (png) return png.data;
  }
  const src = await officeRender(which);
  if (!src) return null;
  const png = await cutout(src.data);
  await getStorage().put(cacheKey, png, "image/png");
  await getStorage().put(cacheMeta, Buffer.from(JSON.stringify({ of: meta?.updated_at ?? "" })), "application/json");
  return png;
}

export async function cutout(img: Buffer, tolerance = 40): Promise<Buffer> {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const at = (x: number, y: number) => (y * W + x) * 3;
  // background colour: average of the four corners
  const corners = [at(2, 2), at(W - 3, 2), at(2, H - 3), at(W - 3, H - 3)];
  const bg = [0, 1, 2].map((c) => corners.reduce((sum, i) => sum + data[i + c]!, 0) / 4);
  const near = (p: number) => {
    const i = p * 3;
    const dr = data[i]! - bg[0]!, dg = data[i + 1]! - bg[1]!, db = data[i + 2]! - bg[2]!;
    return dr * dr + dg * dg + db * db < tolerance * tolerance;
  };
  const mask = new Uint8Array(W * H).fill(255); // 255 = keep
  const stack: number[] = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (mask[p] === 0 || !near(p)) continue;
    mask[p] = 0;
    const x = p % W;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (p >= W) stack.push(p - W);
    if (p < W * (H - 1)) stack.push(p + W);
  }
  const alpha = await sharp(Buffer.from(mask), { raw: { width: W, height: H, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(W * H * 4);
  for (let p = 0, q = 0; p < W * H; p++, q += 4) {
    rgba[q] = data[p * 3]!;
    rgba[q + 1] = data[p * 3 + 1]!;
    rgba[q + 2] = data[p * 3 + 2]!;
    rgba[q + 3] = alpha[p]!;
  }
  return sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
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
  const prevLayout = input.from === "draft" ? ((await readMeta("draft")) ?? (await readMeta("saved")))?.layout : OFFICE_LAYOUT;
  const meta: RenderMeta = { updated_at: nowIso(), layout: prevLayout, ...(extra ? { prompt: extra } : {}) };
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
// Individually animated team: each 3D sprite is animated on its own green
// screen with Kling, then keyed to a transparent VP9 WebM with FFmpeg.

const ANIM_ENDPOINT = "fal-ai/kling-video/v2.5-turbo/standard/image-to-video";
const PAD = 0.12; // room around the character for movement (fraction of the sprite size)
type AnimEntry = { aspect: number };
type AnimManifest = { status: "idle" | "running" | "done" | "failed"; clips: Record<string, AnimEntry>; total: number; prompt?: string; error?: string; updated_at: string };
const ANIMS = "office/anims.json";
let animRun: Promise<void> | null = null;

export async function officeAnims(): Promise<AnimManifest | null> {
  const f = await getStorage().get(ANIMS);
  return f ? (JSON.parse(f.data.toString()) as AnimManifest) : null;
}
export async function officeAnimClip(file: string): Promise<Buffer | null> {
  if (!/^[a-z_]+-(work|rest)\.webm$/.test(file)) return null;
  return (await getStorage().get(`office/people/${file}`))?.data ?? null;
}

const MOTION: Record<OfficePose, string> = {
  work: "The character types on the laptop, glances at the screen, nods and smiles, small natural looping movements",
  rest: "The character dozes peacefully, breathing slowly, head gently nodding, small natural looping movements",
};

async function animateOne(agent: AgentKey, pose: OfficePose, direction: string): Promise<AnimEntry> {
  const keyed = (await getStorage().get(sprite(agent, pose)))?.data;
  if (!keyed) throw new Error("No 3D sprite yet.");
  const raw = (await getStorage().get(`office/people/raw/${agent}-${pose}.png`))?.data;
  // Green-screen source frame: the original render, or the keyed sprite put back on green with room around it.
  const meta = await sharp(keyed).metadata();
  const sw = meta.width!, sh = meta.height!;
  const src = raw ?? (await sharp(keyed).extend({ top: Math.round(sh * 0.2), bottom: Math.round(sh * 0.08), left: Math.round(sw * 0.35), right: Math.round(sw * 0.35), background: "#00ff00" }).flatten({ background: "#00ff00" }).png().toBuffer());
  // Where the character sits in the source frame (so the clip can be cropped to match the still).
  const srcMeta = await sharp(src).metadata();
  const { info: trim } = await sharp(await keyOutFull(src)).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const box = { left: -(trim.trimOffsetLeft ?? 0), top: -(trim.trimOffsetTop ?? 0), w: trim.width, h: trim.height };
  const out = await falQueue<{ video?: { url: string } }>(env.falKey!, ANIM_ENDPOINT, {
    prompt: `${direction ? `${direction}. ` : ""}${MOTION[pose]}. Locked-off static camera, no camera movement, no zoom. The plain flat pure green background stays exactly the same and fills the frame. Keep the character's look and style identical, stay centred, seamless loop.`,
    image_url: `data:image/png;base64,${src.toString("base64")}`,
    duration: "5",
  });
  if (!out.video?.url) throw new Error("No video came back.");
  const vid = await fetch(out.video.url);
  if (!vid.ok) throw new Error(`Couldn't download the clip (${vid.status}).`);
  const webm = await withTmp(async (dir) => {
    const inp = path.join(dir, "in.mp4"), outp = path.join(dir, "out.webm");
    fs.writeFileSync(inp, Buffer.from(await vid.arrayBuffer()));
    // Crop to the character (plus movement room) in the video's own pixel size, key out the green, encode with alpha.
    const kx = `iw/${srcMeta.width}`, ky = `ih/${srcMeta.height}`;
    const cx = Math.max(0, box.left - box.w * PAD), cy = Math.max(0, box.top - box.h * PAD);
    const cw = Math.min(srcMeta.width! - cx, box.w * (1 + 2 * PAD)), ch = Math.min(srcMeta.height! - cy, box.h * (1 + PAD + 0.02));
    await runFfmpeg(["-i", inp, "-an", "-vf", `crop=${cw.toFixed(1)}*${kx}:${ch.toFixed(1)}*${ky}:${cx.toFixed(1)}*${kx}:${cy.toFixed(1)}*${ky},chromakey=0x00ff00:0.18:0.06,despill=type=green,scale=-2:300,format=yuva420p`, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "36", "-deadline", "good", "-cpu-used", "4", outp]);
    return fs.readFileSync(outp);
  });
  await getStorage().put(`office/people/${agent}-${pose}.webm`, webm, "video/webm");
  return { aspect: box.w / box.h };
}

/** Animate every 3D team member individually in the background (Kling on fal, ~$0.35 per clip). */
export async function startOfficeAnims(direction = "", redo = false): Promise<AnimManifest> {
  if (!env.falKey) throw new Error("Connect a FAL_KEY in Railway to animate the team.");
  const people = await officePeople();
  if (!people?.done.length) throw new Error("Make the 3D team first.");
  const prev = await officeAnims();
  if (animRun && prev?.status === "running") return prev;
  const m: AnimManifest = { status: "running", clips: redo ? {} : (prev?.clips ?? {}), total: people.done.length, ...(direction.trim() ? { prompt: direction.trim() } : {}), updated_at: nowIso() };
  const save = () => getStorage().put(ANIMS, Buffer.from(JSON.stringify({ ...m, updated_at: nowIso() })), "application/json");
  await save();
  const todo = people.done.filter((k) => !m.clips[k]).map((k) => ({ k, agent: k.replace(/-(work|rest)$/, "") as AgentKey, pose: k.endsWith("-rest") ? ("rest" as const) : ("work" as const) }));
  animRun = (async () => {
    let failures = 0;
    const worker = async () => {
      for (let j = todo.shift(); j; j = todo.shift()) {
        try {
          m.clips[j.k] = await animateOne(j.agent, j.pose, direction.trim());
          await save();
        } catch (err) {
          failures++;
          m.error = err instanceof Error ? err.message : String(err);
          log.warn("office", "team animation failed", { clip: j.k, error: m.error });
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    m.status = failures ? "failed" : "done";
    await save();
  })().finally(() => { animRun = null; });
  return m;
}
