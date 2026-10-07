import type { Dream, DreamEngineInput, UserPreferences } from "../types";
import { curatedDreams, curatedById, type CuratedDream } from "../data/catalog";
import { generateMockDream, totalMinutesFor } from "../engine/mockGenerator";

export const DEFAULT_PREFS: UserPreferences = {
  displayName: "Sam",
  favouriteWorlds: ["endless-seas", "starlight-armada", "moonlit-academy"],
  favouriteCharacters: ["star-admiral", "sea-captain", "professor-quill", "sorrel-greenwitch"],
  preferredVoiceId: "v-hearth",
  usualSleepTime: "22:45",
  defaultLength: 40,
  defaultSleepiness: "relaxed",
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function toFullInput(req: CuratedDream["request"], prefs: UserPreferences = DEFAULT_PREFS): DreamEngineInput {
  return { ...req, user_id: "demo-user", story_history: [], user_preferences: prefs };
}

const cache = new Map<string, Dream>();

/** Curated (Calm Original / creator) dreams are materialised deterministically. */
export function curatedToDream(cd: CuratedDream): Dream {
  const hit = cache.get(cd.id);
  if (hit) return hit;
  const request = toFullInput(cd.request);
  const output = { ...generateMockDream(request), dream_title: cd.title, hook: cd.blurb };
  const d: Dream = {
    id: cd.id,
    createdAt: Date.UTC(2026, 9, 1),
    request,
    output,
    seriesId: cd.id,
    episode: 1,
    totalMinutes: totalMinutesFor(request.length),
    saved: false,
    author: cd.author,
  };
  cache.set(cd.id, d);
  return d;
}

export const allCurated = () => curatedDreams.map(curatedToDream);

export function resolveDream(id: string, userDreams: Dream[]): Dream | undefined {
  const own = userDreams.find((d) => d.id === id);
  if (own) return own;
  const cd = curatedById(id);
  return cd ? curatedToDream(cd) : undefined;
}

export const lengthLabel = (l: DreamEngineInput["length"]) => (l === "all-night" ? "All night" : `${l} min`);

export const TONES: { id: DreamEngineInput["tone"]; label: string; hint: string }[] = [
  { id: "cozy", label: "Cozy", hint: "Warm, safe, small" },
  { id: "adventure", label: "Adventure", hint: "A gentle voyage" },
  { id: "mystery", label: "Mystery", hint: "A soft riddle" },
  { id: "funny", label: "Funny", hint: "Light and silly" },
  { id: "romantic", label: "Romantic", hint: "Tender moments" },
  { id: "epic", label: "Epic", hint: "Grand, in a whisper" },
  { id: "nostalgic", label: "Nostalgic", hint: "Old memories" },
  { id: "very-sleepy", label: "Very Sleepy", hint: "Almost nothing happens" },
];

export const toneLabel = (t: DreamEngineInput["tone"]) => TONES.find((x) => x.id === t)?.label ?? t;

export const SLEEPINESS: { id: DreamEngineInput["sleepiness"]; label: string; hint: string }[] = [
  { id: "light", label: "Light", hint: "Story-forward" },
  { id: "relaxed", label: "Relaxed", hint: "Balanced" },
  { id: "sleepy", label: "Sleepy", hint: "Winds down early" },
  { id: "deep", label: "Deep Sleep", hint: "Mostly ambience" },
];
export const sleepinessLabel = (s: DreamEngineInput["sleepiness"]) => SLEEPINESS.find((x) => x.id === s)?.label ?? s;
