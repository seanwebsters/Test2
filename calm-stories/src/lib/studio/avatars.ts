import "server-only";
import { env } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { log } from "@/lib/log";
import { nowIso } from "@/lib/util";
import { falNanoBanana, falQueue } from "@/lib/providers/fal";
import { AGENT_BY_KEY } from "./agents";
import { getStudioSettings } from "./settings";
import type { AgentActivity, AgentKey } from "./types";

/**
 * Realistic animated agents for the AI Team room (experimental): one photoreal
 * still per agent, turned into short looping clips per state with an
 * image-to-video model on fal. Made once, stored on the volume; the room falls
 * back to the drawn bedroom wherever a clip is missing.
 */
export type AvatarState = "resting" | "working" | "thinking" | "needs_you";
/** Where the agents are filmed: each in their own bedroom, or all at desks in one cosy shared office. */
export type AvatarScene = "bedroom" | "office";

export const VIDEO_ENDPOINT = "fal-ai/kling-video/v2.5-turbo/standard/image-to-video";

export function avatarState(activity: AgentActivity): AvatarState {
  if (activity === "sleeping") return "resting";
  if (activity === "thinking") return "thinking";
  if (activity === "asking_for_help") return "needs_you";
  return "working";
}

const PROP_ACTION: Record<string, { holds: string; works: string }> = {
  crown: { holds: "a leather notebook with a tiny gold crown on the cover", works: "signing pages in the notebook" },
  chart: { holds: "a tablet showing softly glowing audience charts", works: "scrolling through charts on the tablet" },
  clapper: { holds: "a small film clapperboard and storyboards", works: "sketching on storyboards" },
  romance_book: { holds: "a well-loved romance novel", works: "reading and turning pages" },
  map: { holds: "a hand-drawn fantasy map", works: "tracing routes on the map with a fingertip" },
  notebook: { holds: "a notebook of character sketches", works: "writing notes in the notebook" },
  blueprint: { holds: "large story blueprints", works: "marking up the blueprints with a pencil" },
  laptop: { holds: "an open laptop", works: "typing on the laptop" },
  quill: { holds: "a quill and manuscript pages", works: "writing with the quill" },
  moon: { holds: "a mug of tea and a manuscript", works: "reading the manuscript and sipping tea" },
  magnifier: { holds: "a magnifying glass and a thick bible of notes", works: "examining pages through the magnifying glass" },
  spectacles: { holds: "reading glasses and a printed script", works: "reading the script and making marks" },
  palette: { holds: "a sketchbook and paint palette", works: "painting in the sketchbook" },
  headphones: { holds: "studio headphones around the neck", works: "listening on headphones with eyes half closed, nodding gently" },
  mixer: { holds: "a small audio mixer on a lap tray", works: "adjusting sliders on the audio mixer" },
  shield: { holds: "a clipboard with a checklist", works: "ticking items on the checklist" },
};

const OFFICE = "a small, cosy late-night creative studio office shared by a sleep-stories team: warm wooden desks, green-shaded banker's lamps, bookshelves, trailing plants, soft rugs, a big arched window with a moonlit night sky";

export function stillPrompt(agent: AgentKey, scene: AvatarScene = "bedroom"): string {
  const a = AGENT_BY_KEY[agent];
  const p = PROP_ACTION[a.bedroom.prop]!;
  const look = "Photorealistic cinematic film still, natural film grain, shot on ARRI with a 35mm lens, warm and calm.";
  if (scene === "office")
    return `${look} A friendly adult who works as the ${a.name} (${a.title}) sitting at their own desk in ${OFFICE}, holding ${p.holds}, a mug of tea beside them, wearing a ${a.bedroom.blanket} coloured cardigan. Medium-wide shot, subject centred, the office around them visible, gentle motivated lamp light, rich but soft colour grade. No text, no logos.`;
  return `${look} A friendly adult who works as the ${a.name} (${a.title}) at a cosy sleep-stories studio, sitting up in bed at night, propped on soft pillows, holding ${p.holds}. Snug bedroom: warm bedside lamp, moonlit window with stars, bookshelf, a ${a.bedroom.blanket} coloured quilt. Medium-wide shot, subject centred, room around them visible, gentle motivated lighting, rich but soft colour grade. No text, no logos.`;
}

export function motionPrompt(agent: AgentKey, state: AvatarState, scene: AvatarScene = "bedroom"): string {
  const p = PROP_ACTION[AGENT_BY_KEY[agent].bedroom.prop]!;
  const still = "Locked-off static camera, no camera movement, seamless gentle loop, cosy calm atmosphere, lamp light flickers very softly.";
  switch (state) {
    case "resting":
      return scene === "office"
        ? `The person has dozed off at their desk, head resting on folded arms, breathing slowly and gently. ${still}`
        : `The person has fallen asleep sitting up in bed, eyes closed, breathing slowly and gently, head resting on the pillow. ${still}`;
    case "working":
      return `The person is awake and absorbed, ${p.works}, with small natural movements and occasional blinks. ${still}`;
    case "thinking":
      return `The person pauses and looks up thoughtfully, tapping a finger to their chin, then a small smile of an idea. ${still}`;
    case "needs_you":
      return `The person looks towards the camera and politely raises one hand, as if to say they need help. ${still}`;
  }
}

export interface AvatarManifest {
  agent: AgentKey;
  scene?: AvatarScene;
  status: "generating" | "ready" | "failed";
  step: string;
  error: string | null;
  still: string | null;
  /** Storage keys of the finished clips (kept until a full new set is ready). */
  clips: Partial<Record<AvatarState, string>>;
  updated_at: string;
}

const key = (agent: AgentKey, file: string) => `avatars/${agent}/${file}`;

export async function getAvatar(agent: AgentKey): Promise<AvatarManifest | null> {
  const f = await getStorage().get(key(agent, "manifest.json"));
  return f ? (JSON.parse(f.data.toString("utf8")) as AvatarManifest) : null;
}

/** Clip URLs per agent for the AI Team room (only agents that have clips). */
export async function avatarClips(): Promise<Partial<Record<AgentKey, Partial<Record<AvatarState, string>>>>> {
  const out: Partial<Record<AgentKey, Partial<Record<AvatarState, string>>>> = {};
  for (const agent of Object.keys(AGENT_BY_KEY) as AgentKey[]) {
    const m = await getAvatar(agent);
    if (!m || !Object.keys(m.clips).length) continue;
    out[agent] = Object.fromEntries(Object.entries(m.clips).map(([s, k]) => [s, `/api/studio/avatars/${agent}/${k!.split("/").pop()}?v=${encodeURIComponent(m.updated_at)}`]));
  }
  return out;
}

/** Everyone's progress, for the AI Team page. */
export async function avatarProgress(): Promise<{ ready: number; generating: number; failed: { agent: AgentKey; error: string }[]; total: number }> {
  const agents = Object.values(AGENT_BY_KEY).filter((a) => !a.human);
  const ms = await Promise.all(agents.map((a) => getAvatar(a.key)));
  return {
    total: agents.length,
    ready: ms.filter((m) => m?.status === "ready").length,
    generating: ms.filter((m) => m?.status === "generating").length,
    failed: ms.flatMap((m) => (m?.status === "failed" ? [{ agent: m.agent, error: m.error ?? "" }] : [])),
  };
}

async function save(m: AvatarManifest) {
  m.updated_at = nowIso();
  await getStorage().put(key(m.agent, "manifest.json"), Buffer.from(JSON.stringify(m)), "application/json");
}

const running = new Set<AgentKey>();

/** Start filming one agent in the background. Returns immediately. */
export async function startAvatar(agent: AgentKey, scene: AvatarScene = "bedroom"): Promise<AvatarManifest> {
  if (!env.falKey) throw new Error("Connect a FAL_KEY to generate animated agents.");
  const existing = await getAvatar(agent);
  if (running.has(agent) && existing) return existing;
  running.add(agent);
  const m: AvatarManifest = { agent, scene, status: "generating", step: "Painting the portrait", error: null, still: null, clips: existing?.clips ?? {}, updated_at: nowIso() };
  await save(m);
  void filmAvatar(m);
  return m;
}

/** Film every agent, three at a time. Skips agents already filmed in this scene unless `redo`. */
export async function startAllAvatars(scene: AvatarScene, redo = false): Promise<{ queued: AgentKey[] }> {
  if (!env.falKey) throw new Error("Connect a FAL_KEY to generate animated agents.");
  const queue: AgentKey[] = [];
  for (const a of Object.values(AGENT_BY_KEY)) {
    if (a.human || running.has(a.key)) continue;
    const m = await getAvatar(a.key);
    if (!redo && m?.status === "ready" && (m.scene ?? "bedroom") === scene) continue;
    queue.push(a.key);
  }
  for (const agent of queue) {
    running.add(agent);
    const prev = await getAvatar(agent);
    await save({ agent, scene, status: "generating", step: "Waiting its turn", error: null, still: null, clips: prev?.clips ?? {}, updated_at: nowIso() });
  }
  const pending = [...queue];
  const worker = async () => {
    for (let agent = pending.shift(); agent; agent = pending.shift()) {
      const m = (await getAvatar(agent))!;
      m.step = "Painting the portrait";
      await save(m);
      await filmAvatar(m);
    }
  };
  void Promise.all([worker(), worker(), worker()]);
  return { queued: queue };
}

/** Paint the still, then film the four state clips. Never throws; failures are recorded on the manifest. */
async function filmAvatar(m: AvatarManifest): Promise<void> {
  const agent = m.agent;
  const scene = m.scene ?? "bedroom";
  try {
    const storage = getStorage();
    const settings = await getStudioSettings();
    const img = await falNanoBanana(env.falKey!, { prompt: stillPrompt(agent, scene), endpoint: settings.fal_image_endpoint, aspectRatio: "4:3" });
    m.still = key(agent, `${scene}-still.png`);
    await storage.put(m.still, img.data, img.mimeType);
    const imageUrl = `data:${img.mimeType};base64,${img.data.toString("base64")}`;
    const fresh: Partial<Record<AvatarState, string>> = {};
    for (const state of ["working", "resting", "thinking", "needs_you"] as AvatarState[]) {
      m.step = `Animating: ${state.replace("_", " ")} (${Object.keys(fresh).length}/4)`;
      await save(m);
      const out = await falQueue<{ video?: { url: string } }>(env.falKey!, VIDEO_ENDPOINT, { prompt: motionPrompt(agent, state, scene), image_url: imageUrl, duration: "5" });
      if (!out.video?.url) throw new Error(`No video returned for ${state}.`);
      const vid = await fetch(out.video.url);
      if (!vid.ok) throw new Error(`Couldn't download the ${state} clip (${vid.status}).`);
      const k = key(agent, `${scene}-${state}.mp4`);
      await storage.put(k, Buffer.from(await vid.arrayBuffer()), "video/mp4");
      fresh[state] = k;
    }
    m.clips = fresh; // switch to the new set only once all four are done
    m.status = "ready";
    m.step = "Done";
    await save(m);
  } catch (err) {
    m.status = "failed";
    m.error = err instanceof Error ? err.message : String(err);
    await save(m);
    log.error("avatars", "generation failed", { agent, error: m.error });
  } finally {
    running.delete(agent);
  }
}
