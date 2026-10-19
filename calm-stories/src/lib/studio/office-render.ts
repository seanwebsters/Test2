import "server-only";
import sharp from "sharp";
import { env } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { nowIso } from "@/lib/util";
import { falNanoBanana } from "@/lib/providers/fal";
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
  rest: "sitting relaxed on the floor with legs crossed, eyes closed, peaceful sleepy smile, hands resting in lap",
};
function personPrompt(agent: AgentKey, pose: OfficePose): string {
  const a = AGENT_BY_KEY[agent];
  return `A single cute stylised 3D character for an isometric cozy office game (Pixar / The Sims style, soft clay-like shading, big friendly head, small body): the studio's ${a.name}, ${SKIN(a.bedroom.skin)} skin, ${HAIR(a.bedroom.hair)} hair, wearing a royal blue sweatshirt with a small white "Calm" script logo on the chest and dark trousers, ${POSES[pose]}. Seen from a high isometric three-quarter angle, facing towards the front-left. Full body, centred, filling most of the frame. Plain flat pure green (#00FF00) chroma-key background, no shadow, no floor, no other objects, no text other than the logo.`;
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
    const worker = async () => {
      for (let j = todo.shift(); j; j = todo.shift()) {
        try {
          const img = await falNanoBanana(env.falKey!, { prompt: personPrompt(j.agent, j.pose), endpoint: settings.fal_image_endpoint, aspectRatio: "3:4" });
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

export async function officeRender(): Promise<{ data: Buffer; updated_at: string } | null> {
  const f = await getStorage().get(KEY);
  if (!f) return null;
  const meta = await getStorage().get(META);
  const updated_at = meta ? (JSON.parse(meta.data.toString()) as { updated_at: string }).updated_at : "";
  return { data: f.data, updated_at };
}

export async function officeRenderInfo(): Promise<{ updated_at: string } | null> {
  const meta = await getStorage().get(META);
  return meta ? (JSON.parse(meta.data.toString()) as { updated_at: string }) : null;
}

/** Render the empty office (a PNG snapshot of the illustration) as a photoreal image with Nano Banana on fal. */
export async function makeOfficeRender(snapshot: Buffer): Promise<{ updated_at: string }> {
  if (!env.falKey) throw new Error("Connect a FAL_KEY in Railway to make the photoreal office.");
  const ref = await sharp(snapshot).flatten({ background: "#0a1026" }).png().toBuffer(); // validates it's an image
  const settings = await getStudioSettings();
  const img = await falNanoBanana(env.falKey, { prompt: PROMPT, endpoint: settings.fal_image_endpoint, aspectRatio: "16:9", references: [{ mimeType: "image/png", data: ref }] });
  const jpg = await sharp(img.data).resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const updated_at = nowIso();
  await getStorage().put(KEY, jpg, "image/jpeg");
  await getStorage().put(META, Buffer.from(JSON.stringify({ updated_at, cost_cents: img.cost_cents })), "application/json");
  return { updated_at };
}

export async function clearOfficeRender(): Promise<void> {
  await getStorage().remove(KEY);
  await getStorage().remove(META);
}
