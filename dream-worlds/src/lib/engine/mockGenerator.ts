/**
 * Mock Dream Engine.
 *
 * Deterministically composes a realistic DreamEngineOutput from the request,
 * the world lore and the character sheets — so the whole experience works
 * without API keys. It follows the same rules the system prompt asks of the
 * real model (falling intensity, fewer lines of dialogue, more ambience,
 * no cliffhangers late, continuity carried forward).
 */
import type {
  Chapter,
  Character,
  ContinuityData,
  DialogueLine,
  DreamEngineInput,
  DreamEngineOutput,
  DreamTone,
  IPWorld,
  Location,
  SceneKind,
  SleepCurvePoint,
  SleepStage,
  Sleepiness,
} from "../types";
import { worldById } from "../data/worlds";
import { characterById } from "../data/characters";
import { loreDocuments } from "../data/partners";

/* ---------------- utilities ---------------- */

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

export function shortName(c: Character) {
  if (c.name.startsWith("The ")) return c.name.split(" ").slice(-1)[0];
  return c.name.split(" ")[0];
}
const ref = (c: Character) => (c.name.startsWith("The ") ? c.name.replace(/^The /, "the ") : c.name);

/* ---------------- world flavour ---------------- */

const SCENE: Record<SceneKind, { nouns: string[]; verb: string; vessel: string; sky: string; texture: string[] }> = {
  space: { nouns: ["Silver Comet", "Quiet Nebula", "Lumen Gate", "Last Lighthouse", "Sleeping Star"], verb: "drifted past", vessel: "the starship", sky: "the slow wheel of distant suns", texture: ["the hull hummed like a held note", "starlight pooled on the floor", "frost flowered on the observation glass"] },
  academy: { nouns: ["Midnight Library", "Second Moon", "Whispering Corridor", "Candle Tower", "Silver Key"], verb: "wandered through", vessel: "the old Academy", sky: "two moons over the black lake", texture: ["candles leaned toward each other", "pages turned by themselves", "the fire settled into embers"] },
  sea: { nouns: ["Midnight Ship", "Lantern Isles", "Quiet Water", "Silver Tide", "Harbour of Stars"], verb: "sailed beyond", vessel: "the ship", sky: "a sky full of unfamiliar constellations", texture: ["the timbers creaked softly", "the lantern swung in slow circles", "waves folded against the hull"] },
  kingdom: { nouns: ["Glass Spire", "Humming Road", "Poppy Meadows", "Green Lantern", "Sleeping City"], verb: "walked through", vessel: "the Glass City", sky: "a sky tinted the colour of sea-glass", texture: ["the spires breathed light in and out", "chimes rang somewhere far away", "the meadow grass sighed"] },
  blocks: { nouns: ["Lantern Lighthouse", "Crystal Cave", "Cloud Farm", "Starlit Village", "First Block"], verb: "built a home in", vessel: "the little village", sky: "a square moon over square hills", texture: ["windows lit one by one", "a river clicked over cobbles", "crickets kept time"] },
  stadium: { nouns: ["Floodlit Night", "Final Whistle", "Old Ground", "Second Chance", "North Terrace"], verb: "walked out onto", vessel: "the old stadium", sky: "floodlights haloed in mist", texture: ["the floodlights buzzed gently", "the nets rustled", "an old chant echoed and faded"] },
  train: { nouns: ["Northern Lights", "Last Train", "Snowfield Halt", "Sleeper Carriage", "Aurora Line"], verb: "rode the night train to", vessel: "the sleeper train", sky: "ribbons of green and violet aurora", texture: ["the rails kept their slow rhythm", "snow brushed the window", "the carriage swayed like a cradle"] },
  garden: { nouns: ["Moonflower", "Glass Dome", "Lily Pond", "Night Bloom", "Humming Garden"], verb: "wandered the paths of", vessel: "the glasshouse", sky: "moonlight through a thousand panes of glass", texture: ["water dripped from broad leaves", "the blooms hummed", "warm air rose from the soil"] },
};

const TONE_WORD: Record<DreamTone, { adj: string; arc: string; titleTail: string[] }> = {
  cozy: { adj: "cosy", arc: "a small, warm errand", titleTail: ["A Quiet Evening", "Warm Lights"] },
  adventure: { adj: "gentle adventure", arc: "a voyage toward something no one had seen", titleTail: ["Beyond the Map", "The Long Way Home"] },
  mystery: { adj: "soft mystery", arc: "a quiet riddle with a kind answer", titleTail: ["The Hidden Door", "A Secret Kept"] },
  funny: { adj: "lighthearted", arc: "a small misunderstanding that turned into a lovely evening", titleTail: ["A Ridiculous Night", "The Wrong Teapot"] },
  romantic: { adj: "tender", arc: "two people noticing each other under the same sky", titleTail: ["Under the Same Stars", "A Slow Dance"] },
  epic: { adj: "epic", arc: "a great journey told in a whisper", titleTail: ["The Long Voyage", "Where the Legends Rest"] },
  nostalgic: { adj: "nostalgic", arc: "a return to somewhere that remembered them", titleTail: ["Remember This Night", "The Old Songs"] },
  "very-sleepy": { adj: "very sleepy", arc: "almost nothing at all, very slowly", titleTail: ["Nowhere to Be", "Slow Light"] },
};

const STAGE_PLAN: Record<Sleepiness, [number, number, number]> = {
  light: [0.35, 0.65, 0.85],
  relaxed: [0.25, 0.55, 0.8],
  sleepy: [0.15, 0.42, 0.7],
  deep: [0.08, 0.3, 0.55],
};

export function stageAt(fraction: number, sleepiness: Sleepiness): SleepStage {
  const [a, b, c] = STAGE_PLAN[sleepiness];
  if (fraction < a) return "awake";
  if (fraction < b) return "drifting";
  if (fraction < c) return "sleepy";
  return "asleep";
}

export function totalMinutesFor(length: DreamEngineInput["length"]) {
  return length === "all-night" ? 480 : length;
}
/** All-night dreams tell a 90-minute story and then hold ambience until morning. */
function storyMinutes(length: DreamEngineInput["length"]) {
  return length === "all-night" ? 90 : length;
}

/* ---------------- narration templates ---------------- */

const OPENERS = [
  "The night began, as the best ones do, without any hurry at all. {Sky} hung over {vessel}, and {texture}.",
  "Somewhere between one breath and the next, {vessel} came into view beneath {sky}. {Texture}.",
  "It was the hour when even the stars seem to lower their voices. Over {vessel}, {sky} turned slowly, and {texture}.",
];

const AWAKE = [
  "{c1} was the first to notice it: {locDesc}. {C1style}",
  "They reached {loc} just as {texture}. It was {locDesc}, and for a while nobody said anything, because nothing needed saying.",
  "{c2} laughed — a low, warm sound — and pointed toward the horizon, where {sky} seemed to be opening like a door.",
  "There was {arc} waiting for them tonight, and {they} could feel it, the way you feel weather coming before you can see it.",
  "{c1} and {c2} stood side by side at {loc}, an unlikely pair, and yet somehow it felt as if they had always known each other.",
];

const DRIFT = [
  "The pace of things began to soften. {Texture}, and the conversation grew quieter, with longer spaces in between.",
  "They moved on toward {loc} — {locDesc} — not because they had to, but because it seemed like the gentlest place to be.",
  "{c1} sat down, which was a rare thing, and let out a long, slow breath. The others did the same.",
  "Whatever question the night had asked earlier now had its answer, and the answer was kind. There was nothing left to solve.",
];

const SLEEPY = [
  "Slowly… {texture}. The light grew golden, then amber, then the soft grey-blue of almost-sleep.",
  "At {loc}, everything was still. {locDesc}. The sounds of the evening came and went like slow tides…",
  "{c1} pulled a blanket a little higher. Nobody spoke for a long while… and that was perfect.",
  "Far away, {sound}. Closer, the quiet rhythm of everyone's breathing, settling into one slow pattern…",
];

const ASLEEP = [
  "{Sound}… and the night went on, softly, all by itself…",
  "Light, and then less light… warm air… the faint hush of {sound}…",
  "Nothing to do now… nowhere to be… {texture}…",
  "The stars held their places… the world was gentle… and everyone was resting…",
];

const LINES_BY_STAGE: Record<SleepStage, string[]> = {
  awake: ["Look at that. Have you ever seen anything like it?", "Well. This is unexpected. I rather like it.", "Stay close. I want you to see this.", "I think tonight is going to be a good one."],
  drifting: ["Let's slow down a little. We have all night.", "Listen… can you hear that?", "I'm glad we came here.", "Rest your eyes, if you like. I'll keep watch."],
  sleepy: ["Goodnight… we'll go further tomorrow.", "Mm. Just a little longer…", "Sleep well."],
  asleep: [],
};

/* ---------------- main generator ---------------- */

export function generateMockDream(input: DreamEngineInput): DreamEngineOutput {
  const seed = hash(JSON.stringify([input.worlds, input.characters, input.tone, input.length, input.sleepiness, input.user_prompt, input.story_history.length])) + (input.seed ?? 0);
  const r = rng(seed);

  const worlds = input.worlds.map(worldById).filter(Boolean) as IPWorld[];
  const chars = input.characters.map(characterById).filter(Boolean) as Character[];
  const primary = worlds[0] ?? worldById(chars[0]?.worldId ?? "starlight-armada")!;
  const scene = SCENE[primary.visualStyle.scene];
  const tone = TONE_WORD[input.tone];
  const prev = input.story_history[input.story_history.length - 1];
  const episode = (prev?.continuity.episode ?? 0) + 1;
  const participate = input.story_role === "participate";
  const they = participate ? "you" : "they";

  const c1 = chars[0];
  const c2 = chars[1] ?? chars[0];

  /* title */
  const noun = pick(r, scene.nouns);
  let dream_title: string;
  if (chars.length >= 2 && r() > 0.25) dream_title = `The ${shortName(c1)} and the ${noun}`;
  else if (chars.length === 1) dream_title = `${c1.name.startsWith("The ") ? c1.name : c1.name}: ${pick(r, tone.titleTail)}`;
  else dream_title = `${noun}: ${pick(r, tone.titleTail)}`;
  if (episode > 1) dream_title = prev.title.replace(/ · Night \d+$/, "") + ` · Night ${episode}`;

  /* locations: calmer places later */
  const allLocs: Location[] = worlds.flatMap((w) => w.locations);
  const prevLocs = new Set(prev?.continuity.locationsVisited ?? []);
  const sortedLocs = [...allLocs].sort((a, b) => a.calm - b.calm + (prevLocs.has(a.id) ? 0.05 : 0));

  /* chapters */
  const sMin = storyMinutes(input.length);
  const nCh = input.length === 20 ? 4 : input.length === 40 ? 6 : input.length === 60 ? 7 : 8;
  const chDur = sMin / nCh;
  const sounds = worlds.flatMap((w) => w.sounds.flatMap((s) => s.layers));

  const chapters: Chapter[] = [];
  const allDialogue: DialogueLine[] = [];
  const events: string[] = [];

  for (let i = 0; i < nCh; i++) {
    const startMinute = Math.round(i * chDur);
    const frac = (i + 0.5) / nCh;
    const stage = stageAt(i / nCh, input.sleepiness);
    const loc =
      i === 0
        ? [...primary.locations].sort((a, b) => a.calm - b.calm)[0]
        : sortedLocs[Math.min(sortedLocs.length - 1, Math.floor((i / nCh) * sortedLocs.length))] ?? primary.locations[0];
    const present = stage === "asleep" ? chars.slice(0, 1) : stage === "sleepy" ? chars.slice(0, Math.min(2, chars.length)) : chars;
    const lead = present[i % present.length] ?? c1;
    const other = present[(i + 1) % present.length] ?? c2;
    const vars = {
      c1: ref(lead), C1: cap(ref(lead)), c2: ref(other), loc: loc.name, locDesc: loc.description,
      LocDesc: cap(loc.description), sky: scene.sky, Sky: cap(scene.sky), vessel: scene.vessel,
      texture: pick(r, scene.texture), Texture: cap(pick(r, scene.texture)), sound: pick(r, sounds) ?? "the wind",
      Sound: cap(pick(r, sounds) ?? "the wind"), arc: tone.arc, they,
      C1style: `"${pick(r, lead.sampleLines)}" ${ref(lead)} said, ${lower(lead.speakingStyle.split(".")[0])}.`,
    };

    const narration: string[] = [];
    if (i === 0) {
      if (prev) narration.push(`Last time, ${lower(prev.summary.replace(/\.$/, ""))}. Tonight, the story picks up exactly where it was left — ${prev.continuity.openThreads[0] ? lower(prev.continuity.openThreads[0]) : "gently, and with nowhere to hurry"}.`);
      narration.push(fill(pick(r, OPENERS), { ...vars, Sky: cap(scene.sky) }).replace(/^./, (m) => m.toUpperCase()));
      if (input.user_prompt.trim()) narration.push(`Tonight's dream had been asked for in a particular way: ${lower(input.user_prompt.trim().replace(/\.$/, ""))}. And so, softly, that is how it began.`);
      if (chars.length > 1 && new Set(chars.map((c) => c.worldId)).size > 1) {
        const a = chars[0], b = chars.find((c) => c.worldId !== chars[0].worldId)!;
        narration.push(`No one could quite say how ${ref(b)} came to be here, so far from ${worldById(b.worldId)!.title}. Perhaps a door had been left open between one dream and another. ${cap(ref(a))} simply nodded, as if guests from other worlds arrived every night, and made room.`);
        events.push(`${b.name} crossed over from ${worldById(b.worldId)!.title} to meet ${a.name}`);
      }
      if (participate) narration.push(`And you were there too — welcomed without fuss, given a warm place to sit and a good view of everything.`);
    }
    const pool = stage === "awake" ? AWAKE : stage === "drifting" ? DRIFT : stage === "sleepy" ? SLEEPY : ASLEEP;
    const paraCount = stage === "awake" ? 3 : stage === "drifting" ? 3 : stage === "sleepy" ? 2 : 2;
    const used = new Set<number>();
    for (let p = 0; p < paraCount; p++) {
      let idx = Math.floor(r() * pool.length);
      while (used.has(idx) && used.size < pool.length) idx = (idx + 1) % pool.length;
      used.add(idx);
      narration.push(cap(fill(pool[idx], vars)));
    }
    if (i === nCh - 1) narration.push(`And so ${they === "you" ? "you rested" : "they rested"}, there at ${loc.name}, under ${scene.sky}… safe… warm… and the dream carried on quietly, long after anyone needed to listen.`);

    const lineCount = stage === "awake" ? Math.min(3, present.length + 1) : stage === "drifting" ? 2 : stage === "sleepy" ? 1 : 0;
    const dialogue: DialogueLine[] = [];
    for (let d = 0; d < lineCount; d++) {
      const sp = present[d % present.length];
      if (!sp) break;
      const own = sp.sampleLines.filter((l) => !dialogue.some((x) => x.line === l));
      const line = stage === "awake" && own.length && r() > 0.35 ? pick(r, own) : pick(r, LINES_BY_STAGE[stage].length ? LINES_BY_STAGE[stage] : ["…"]);
      dialogue.push({ characterId: sp.id, line });
    }
    allDialogue.push(...dialogue);

    const intensity = Math.max(0.04, stage === "awake" ? 0.75 - i * 0.04 : stage === "drifting" ? 0.5 - frac * 0.2 : stage === "sleepy" ? 0.22 - frac * 0.08 : 0.06);
    const titles: Record<SleepStage, string[]> = {
      awake: [`Arrival at ${loc.name.replace(/^The /, "the ")}`, `${noun}`, `A Visitor from Far Away`, `Under ${cap(scene.sky.replace(/^a |^the /, ""))}`],
      drifting: [`The Long Way Round`, `Slower Now`, `${loc.name}`, `Lanterns Low`],
      sleepy: [`A Hush Falls`, `Warm and Still`, `Soft Hours`],
      asleep: [`Only the Night`, `Deep Water`, `Starlight, Breathing`],
    };
    chapters.push({
      index: i,
      title: i === 0 ? titles.awake[0] : pick(r, titles[stage]),
      stage,
      startMinute,
      durationMinutes: Math.round(chDur),
      locationId: loc.id,
      presentCharacterIds: present.map((c) => c.id),
      narration,
      character_dialogue: dialogue,
      intensity: Number(intensity.toFixed(2)),
    });
    if (stage === "awake" || stage === "drifting") events.push(`${cap(ref(lead))} and ${ref(other)} spent time at ${loc.name}`);
  }

  /* sleep curve, sampled every ~5 minutes across the full listening length */
  const total = totalMinutesFor(input.length);
  const sleep_curve: SleepCurvePoint[] = [];
  for (let m = 0; m <= total; m += total > 120 ? 15 : 5) {
    const f = m / total;
    const stage = stageAt(m / sMin > 1 ? 1 : m / sMin, input.sleepiness);
    const intensity = Math.max(0.03, 0.8 * Math.pow(1 - Math.min(1, m / sMin), 1.6));
    sleep_curve.push({
      minute: m,
      intensity: Number(intensity.toFixed(2)),
      musicLevel: Number(Math.max(0.05, 0.7 - f * 0.7).toFixed(2)),
      ambienceLevel: Number(Math.min(0.9, 0.3 + f * 0.6).toFixed(2)),
      narrationDensity: Number(Math.max(0, 1 - Math.min(1, m / sMin) * 1.05).toFixed(2)),
      stage,
    });
  }

  /* continuity */
  const relationships = [] as ContinuityData["relationships"];
  for (let a = 0; a < chars.length; a++)
    for (let b = a + 1; b < chars.length; b++)
      relationships.push({ a: chars[a].id, b: chars[b].id, bond: pick(r, ["shared a quiet watch", "became unlikely friends", "trusted each other a little more", "promised to meet again"]) });

  const locationsVisited = [...new Set([...(prev?.continuity.locationsVisited ?? []), ...chapters.map((c) => c.locationId)])];
  const importantChoices = [...(prev?.continuity.importantChoices ?? [])];
  if (input.user_prompt.trim()) importantChoices.push(`Night ${episode}: ${input.user_prompt.trim()}`);
  if (participate) importantChoices.push(`Night ${episode}: you joined the crew as a welcome guest`);

  const lastAwakeLoc = allLocs.find((l) => l.id === chapters.find((c) => c.stage === "drifting")?.locationId) ?? loc0(chapters, allLocs);
  const openThreads = [
    pick(r, [
      `${cap(ref(c1))} still wants to show everyone ${lastAwakeLoc.name} by daylight`,
      `there is one more ${noun.toLowerCase()} said to be waiting further on`,
      `${cap(ref(c2))} has promised to tell the rest of an old story`,
    ]),
  ];

  const continuity_data: ContinuityData = {
    episode,
    events: [...(prev?.continuity.events ?? []), ...events.slice(0, 4)],
    relationships: mergeRelationships(prev?.continuity.relationships ?? [], relationships),
    locationsVisited,
    importantChoices,
    openThreads,
    loreVersions: Object.fromEntries(loreDocuments.filter((d) => input.worlds.includes(d.worldId)).map((d) => [d.id, d.version])),
  };

  const names = chars.map((c) => ref(c));
  const nameList = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0] ?? "old friends";
  const verbLoc = primary.locations.find((l) => chapters.some((c) => c.locationId === l.id)) ?? primary.locations[0];
  const summary = `You ${scene.verb} ${verbLoc.name.replace(/^The /, "the ")} with ${nameList}.`;
  const host = chars.find((c) => c.worldId === primary.id) ?? chars[0];
  const guest = chars.find((c) => c.id !== host?.id);
  const firstLoc = primary.locations.find((l) => l.id === chapters[0]?.locationId) ?? primary.locations[0];
  const at = firstLoc.name.replace(/^The /, "the ");
  const hook = prev
    ? `Night ${episode}. Last time, ${lower(prev.summary.replace(/^You /, "you ").replace(/\.$/, ""))}. Tonight, ${prev.continuity.openThreads[0] ? lower(prev.continuity.openThreads[0]) : "the story drifts on"}…`
    : guest
      ? `${cap(ref(guest))} has arrived ${scene === SCENE.sea ? `aboard ${ref(host)}'s ship` : `at ${at}`} under ${scene.sky}, and ${tone.arc} is about to begin…`
      : `${cap(ref(c1))} is waiting at ${at}, under ${scene.sky}. Tonight: ${tone.arc}…`;

  const visual_prompts = chapters.map(
    (c) =>
      `${primary.visualStyle.mood}; ${allLocs.find((l) => l.id === c.locationId)?.description}; ${c.stage === "asleep" ? "very dark, almost abstract, soft bokeh" : c.stage === "sleepy" ? "dim, warm, hazy" : "cinematic, painterly, wide"}; palette ${primary.visualStyle.palette.join(" ")}; no text`,
  );

  return {
    dream_title,
    summary,
    hook,
    chapters,
    narration: chapters.flatMap((c) => c.narration).join("\n\n"),
    character_dialogue: allDialogue,
    soundscape: {
      base: primary.sounds[0]?.name ?? "Night air",
      cues: chapters.map((c, i) => ({ minute: c.startMinute, layer: sounds[i % Math.max(1, sounds.length)] ?? "wind", level: Number(Math.min(0.9, 0.3 + (i / chapters.length) * 0.6).toFixed(2)) })),
    },
    visual_prompts,
    sleep_curve,
    continuity_data,
  };
}

function loc0(chapters: Chapter[], locs: Location[]) {
  return locs.find((l) => l.id === chapters[0]?.locationId) ?? locs[0];
}

function mergeRelationships(a: ContinuityData["relationships"], b: ContinuityData["relationships"]) {
  const out = [...a];
  for (const r of b) {
    const i = out.findIndex((x) => (x.a === r.a && x.b === r.b) || (x.a === r.b && x.b === r.a));
    if (i >= 0) out[i] = { ...out[i], bond: `${out[i].bond}, then ${r.bond}` };
    else out.push(r);
  }
  return out;
}
