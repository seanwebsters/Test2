/**
 * Deterministic offline generators used when no writing provider is configured.
 *
 * Every result produced here is flagged `simulated: true` and labelled in the
 * UI. Continuity and sleep-suitability checks are genuine rule-based analyses
 * (not model output), so they remain useful without an API key.
 */
import type { Episode, ScriptSettings } from "@/lib/types";
import { hashString, pick, prng, shuffle, wordCount } from "@/lib/util";
import type { StoryContext } from "@/lib/storymaker/context";
import type { CharactersOut, ConceptOut, ContinuityOut, EpisodeOutlineOut, ScriptOut, SeasonOutlineOut, SleepCheckOut, WorldOut } from "./schemas";

type Genre = ConceptOut["genre"];
type Scene = ConceptOut["scene"];

const GENRE_RULES: { test: RegExp; genre: Genre; scene: Scene }[] = [
  { test: /(romantasy|fae|prince|princess|kingdom|court|royal)/i, genre: "Sleep Romantasy", scene: "kingdom" },
  { test: /(romance|love|letters|sweetheart)/i, genre: "Coastal Romance", scene: "coast" },
  { test: /(mystery|detective|clue|missing|sleuth|puzzle)/i, genre: "Cosy Mystery", scene: "village" },
  { test: /(space|planet|star|galaxy|orbit|astronaut|moon base|sci-?fi)/i, genre: "Sci-Fi & Space", scene: "space" },
  { test: /(ocean|sea|whale|reef|island|sail)/i, genre: "Nature & Journeys", scene: "ocean" },
  { test: /(train|journey|road|caravan|river|canal|travel)/i, genre: "Nature & Journeys", scene: "lake" },
  { test: /(magic|enchanted|witch|wizard|spell|dragon|forest|garden|library)/i, genre: "Magical Worlds", scene: "forest" },
];

const SCENE_HINTS: [RegExp, Scene][] = [
  [/forest|woods|grove/i, "forest"],
  [/garden|orchard/i, "garden"],
  [/library|books/i, "library"],
  [/cabin|snow|mountain|alpine/i, "cabin"],
  [/coast|lighthouse|harbou?r|seaside/i, "coast"],
  [/ocean|sea|reef/i, "ocean"],
  [/desert|dune|sand/i, "desert"],
  [/aurora|arctic|northern lights/i, "aurora"],
  [/city|clock|rooftop/i, "city"],
  [/lake|fjord|river|canal/i, "lake"],
  [/village|town/i, "village"],
  [/castle|kingdom|palace/i, "kingdom"],
  [/space|planet|star/i, "space"],
];

const FIRST_NAMES = ["Elara", "Wren", "Rowan", "Isolde", "Thea", "Aurelio", "Mira", "Cassian", "Juniper", "Linden", "Ottilie", "Bram", "Sable", "Emrys", "Ines", "Tobiah", "Hazel", "Corin", "Maren", "Lior", "Neve", "Ansel", "Delphine", "Kit"];
const ADJ = ["Moonlit", "Silver", "Hidden", "Quiet", "Lantern", "Starlit", "Velvet", "Drifting", "Evergreen", "Gentle", "Wandering", "Sleeping"];
const NOUN_BY_SCENE: Record<Scene, string[]> = {
  kingdom: ["Court", "Crown", "Kingdom", "Tower"],
  forest: ["Wood", "Grove", "Forest", "Glade"],
  cabin: ["Cabin", "Ridge", "Pines", "Hearth"],
  space: ["Orbit", "Star Line", "Comet", "Nebula"],
  ocean: ["Tide", "Reef", "Current", "Harbour"],
  garden: ["Garden", "Orchard", "Greenhouse", "Meadow"],
  library: ["Library", "Archive", "Reading Room", "Atlas"],
  village: ["Village", "Lane", "Market", "Hollow"],
  coast: ["Lighthouse", "Shore", "Cove", "Harbour"],
  desert: ["Oasis", "Dunes", "Salt Road", "Caravan"],
  aurora: ["Northern Lights", "Fjord", "Snowfield", "Inn"],
  city: ["Rooftops", "Clocktower", "Observatory", "Quarter"],
  lake: ["Lake", "River", "Fjord", "Waterway"],
};

function sceneFrom(text: string, fallback: Scene): Scene {
  for (const [re, scene] of SCENE_HINTS) if (re.test(text)) return scene;
  return fallback;
}

function settingPhrase(idea: string): string | null {
  const m = /(?:set (?:in|on|aboard)|in|on|aboard) (?:a|an|the) ([a-z' -]{3,60}?)(?:,| with| where| about|\.|$)/i.exec(idea);
  return m?.[1]?.trim() ?? null;
}

export function mockConcept(idea: string): ConceptOut {
  const seed = hashString(idea.toLowerCase().trim() || "surprise");
  const rand = prng(seed);
  const surprise = /surprise/i.test(idea) || idea.trim().length < 4;
  const rule = surprise ? pick(rand, GENRE_RULES) : (GENRE_RULES.find((r) => r.test.test(idea)) ?? { genre: "Magical Worlds" as Genre, scene: "forest" as Scene });
  const scene = surprise ? rule.scene : sceneFrom(idea, rule.scene);
  const setting = (!surprise && settingPhrase(idea)) || { kingdom: "moonlit kingdom", forest: "enchanted forest", cabin: "snowbound mountain village", space: "gentle star line", ocean: "quiet blue sea", garden: "walled night garden", library: "drifting library", village: "sleepy valley village", coast: "lighthouse coast", desert: "starlit desert", aurora: "northern inn", city: "city of clocks", lake: "slow river country" }[scene];
  const names = shuffle(rand, FIRST_NAMES).slice(0, 3);
  const [a, b] = names as [string, string, string];
  const rivals = /rival/i.test(idea);
  const who = surprise ? null : (/(?:with|about|follows?|featuring) (?:a|an) ([a-z' -]{3,40}?)(?:,| who| named| and|\.|$)/i.exec(idea)?.[1]?.trim() ?? null);
  const mystery = rule.genre === "Cosy Mystery";
  const two = rivals || /two (characters|people|friends|lovers)/i.test(idea) || rule.genre === "Sleep Romantasy" || rule.genre === "Coastal Romance";
  const title = `The ${pick(rand, ADJ)} ${pick(rand, NOUN_BY_SCENE[scene])}`;
  const characters = two
    ? [
        { name: a, role: "Protagonist", sketch: `Thoughtful and quietly brave, ${a} ${rivals ? "comes from one of the two rival houses" : "is drawn to the " + setting}.` },
        { name: b, role: rule.genre.includes("Romance") || rule.genre === "Sleep Romantasy" ? "Love interest" : "Companion", sketch: `Patient and warm, ${b} ${rivals ? "belongs to the other side, and is tired of the old quarrel" : "knows every hidden corner of the " + setting}.` },
      ]
    : [{ name: a, role: who ? who.replace(/^./, (c) => c.toUpperCase()) : "Narrator-guide", sketch: `${a}${who ? `, a ${who},` : ""} welcomes the listener into the ${setting}, noticing small, lovely things.` }];
  return {
    title,
    tagline: two ? `Two hearts, one ${setting}, and all the time in the world.` : `A gentle return to the ${setting}, one night at a time.`,
    synopsis: `In the ${setting}, ${characters.map((c) => c.name).join(" and ")} ${two ? (rivals ? "meet across an old divide and discover how much they share" : "find their way towards each other, slowly and kindly") : mystery ? "follows a small, kindly mystery at an unhurried pace" : "explores a place where nothing needs to hurry"}. Each episode is one calm evening: a walk, a conversation, a small discovery, and a restful ending.`,
    genre: rule.genre,
    tags: [...new Set([setting.split(" ").slice(-1)[0] ?? scene, rule.genre.toLowerCase().split(" ")[0] ?? "", "slow", "gentle"])].filter(Boolean),
    narrative_arc: two ? `Across the season, ${a} and ${b} move from wary curiosity to trust${rivals ? ", quietly building a bridge between their two peoples" : ""}, ending with a promise made under a clear night sky.` : mystery ? `${a} gathers small clues about a long-forgotten secret of the ${setting}; the answer, when it comes, is gentle and warm.` : `${a} slowly uncovers the history of the ${setting}, ending the season by sharing it with someone new.`,
    characters,
    scene,
    follow_up_questions: [two ? "Should the romance stay a slow burn all season, or reach a first confession?" : "Would you like a recurring companion for the narrator?", "Roughly how long should episodes be — 20, 30 or 45 minutes?"],
  };
}

export function mockWorld(ctx: StoryContext): WorldOut {
  const s = ctx.series;
  const rand = prng(hashString(s.id + "world"));
  const scene = s.artwork.scene === "portrait" ? "forest" : (s.artwork.scene as Scene);
  const place = `${pick(rand, ["Ever", "Moon", "Still", "Lumen", "Hollow", "Silver", "Wren", "Thistle"])}${pick(rand, ["mere", "vale", "haven", "wick", "fold", "brook", "shore", "holt"])}`;
  const nouns = NOUN_BY_SCENE[scene];
  return {
    world_name: place,
    geography: `${place} lies in a hush of ${scene === "space" ? "slow-turning stars and small, kind planets" : scene === "ocean" || scene === "coast" ? "sheltered coves and long pale beaches" : "soft hills, old paths and quiet water"}, where every path seems to lead somewhere warm.`,
    culture: `People in ${place} keep unhurried customs: lanterns at dusk, tea shared with strangers, stories told in low voices. Kindness is the oldest law.`,
    history: `Long ago ${place} was a crossroads for travellers. Its old disagreements have softened into friendly traditions, though a few memories still linger.`,
    atmosphere: `${s.tags.slice(0, 2).join(" and ") || "Quiet"} evenings, cool air, distant birdsong, the glow of windows, and the feeling that nothing needs to happen quickly.`,
    rules: [`Nothing truly bad happens after nightfall in ${place}.`, "Lanterns lit with good intentions burn until morning.", "Every visitor is offered somewhere warm to rest."],
    themes: ["Patience", "Belonging", "Small kindnesses"],
    locations: nouns.slice(0, 4).map((n, i) => ({ name: `The ${pick(rand, ADJ)} ${n}`, description: [`A favourite place to linger after dark.`, `Where conversations go slower and softer.`, `Quiet, sheltered, and lit by a single lamp.`, `A view across the whole of ${place}.`][i] ?? "" })),
  };
}

export function mockCharacters(ctx: StoryContext, count: number, brief?: string): CharactersOut {
  const rand = prng(hashString(ctx.series.id + "chars" + (brief ?? "") + ctx.characters.length));
  const taken = new Set(ctx.characters.map((c) => c.name));
  const named = brief ? /(?:named|called) ([A-Z][a-z]+)/.exec(brief)?.[1] : undefined;
  const names = [named, ...shuffle(rand, FIRST_NAMES)].filter((n): n is string => !!n && !taken.has(n)).slice(0, count);
  const roles = ["Companion", "Mentor", "Friend", "Keeper", "Traveller"];
  const characters = names.map((name, i) => ({
    name,
    age_range: pick(rand, ["Twenties", "Thirties", "Forties", "Sixties", "Ageless"]),
    personality: pick(rand, ["Gentle, observant and quietly funny.", "Warm, patient, a little shy.", "Curious, steady and kind.", "Wry, generous and fond of old songs."]),
    backstory: `${name} has lived near ${ctx.bible?.world_name ?? "this place"} for years${brief ? `; ${brief.replace(/^(add|create|make)\s+/i, "")}` : ""}.`,
    motivations: pick(rand, ["To keep a promise made long ago.", "To find a place to belong.", "To share something beautiful with someone.", "To finish a small, lovely project."]),
    narrative_role: roles[(ctx.characters.length + i) % roles.length] ?? "Companion",
    voice_profile: pick(rand, ["Low and unhurried.", "Soft, bright and clear.", "Warm with a gentle lilt.", "Measured and kind."]),
    arc: pick(rand, ["Learns to rest without guilt.", "Opens up to a new friendship.", "Lets go of an old worry.", "Discovers courage in quietness."]),
  }));
  const first = ctx.characters[0]?.name;
  return {
    characters,
    relationships: first ? characters.map((c) => ({ a: first, b: c.name, kind: "Friends", description: `${first} and ${c.name} share long evening conversations.` })) : [],
  };
}

export function mockSeasonOutline(ctx: StoryContext, episodeCount: number): SeasonOutlineOut {
  const rand = prng(hashString(ctx.series.id + "season" + ctx.seasons.length + episodeCount));
  const chars = ctx.characters.map((c) => c.name);
  const lead = chars[0] ?? "Our narrator";
  const second = chars[1] ?? "a new friend";
  const places = ctx.locations.map((l) => l.name);
  const place = () => (places.length ? pick(rand, places) : `the edge of ${ctx.bible?.world_name ?? "town"}`);
  const shapes = [
    (n: number) => [`Arrival at ${place()}`, `${lead} arrives as the evening settles, and the first lights come on.`],
    () => [`A Walk to ${place()}`, `${lead} and ${second} take the long way round, talking softly.`],
    () => [`The Lantern Hour`, `Lanterns are lit one by one while ${lead} listens to an old story.`],
    () => [`Rain on the Roof`, `A gentle rain keeps everyone indoors, warm and unhurried.`],
    () => [`Something Small and Lost`, `A misplaced keepsake leads ${lead} on a slow, pleasant search.`],
    () => [`Under the Clear Sky`, `The clouds part and ${lead} and ${second} name the stars together.`],
    () => [`Market Morning, Quiet Night`, `After a busy day, the evening is spent remembering it.`],
    () => [`A Letter Arrives`, `${lead} receives a letter that makes them smile.`],
    () => [`The Long Table`, `Friends gather for a slow supper at ${place()}.`],
    () => [`First Frost`, `The season turns, and the air smells of woodsmoke.`],
  ] as ((n: number) => [string, string])[];
  const episodes = Array.from({ length: episodeCount }, (_, i) => {
    if (i === episodeCount - 1 && episodeCount > 1) return { title: "A Promise Kept", summary: `The season closes with ${lead} and ${second} at ${place()}, content and at rest.` };
    const [title, summary] = (shapes[i % shapes.length] as (n: number) => [string, string])(i);
    return { title: i >= shapes.length ? `${title}, Again` : title, summary };
  });
  return {
    title: `Season ${ctx.seasons.length + 1}: ${pick(rand, ["The Quiet Path", "Lanterns and Rain", "Slow Seasons", "Evenings Together"])}`,
    synopsis: `Across ${episodeCount} gentle evenings, ${lead} ${chars.length > 1 ? `and ${second} ` : ""}explore ${ctx.bible?.world_name ?? "their world"}.`,
    arc: ctx.bible?.unresolved_threads[0] ?? `${lead} finds a sense of belonging.`,
    milestones: [`Episode 1: arrival`, `Episode ${Math.max(1, Math.ceil(episodeCount / 2))}: a deeper friendship`, `Episode ${episodeCount}: a restful resolution`],
    episodes,
  };
}

export function mockEpisodeOutline(ctx: StoryContext, ep: Episode): EpisodeOutlineOut {
  const lead = ctx.characters[0]?.name ?? "Our narrator";
  const loc = ctx.locations[ep.number % Math.max(1, ctx.locations.length)]?.name ?? "a quiet place";
  return {
    title: ep.title,
    summary: ep.summary,
    beats: [`Settling in: the evening, the air, the light at ${loc}.`, `${lead} notices something small and lovely.`, "A slow conversation or memory.", "A gentle discovery that resolves softly.", "Winding down: warmth, quiet, rest."],
  };
}

/* ------------------------------------------------------------------ scripts */

const SENSES = {
  sound: ["the soft hush of leaves", "a far-off bell, once, then quiet", "the slow breathing of the water", "rain whispering against the glass", "the crackle of a small fire", "an owl calling, unhurried"],
  touch: ["the cool evening air on bare hands", "the weight of a wool blanket", "smooth stone, still warm from the day", "the soft give of moss underfoot", "the warmth of a cup held in both hands"],
  scent: ["woodsmoke and pine", "rain on old stone", "night jasmine", "fresh bread from somewhere nearby", "salt and seaweed", "cold, clean air"],
  light: ["the last blue of the evening", "lamplight pooling on the path", "a slow silver moon", "candlelight that barely moves", "stars appearing one at a time"],
};

function para(...sentences: string[]) {
  return sentences.join(" ");
}

export function mockScript(ctx: StoryContext, ep: Episode, settings: ScriptSettings): ScriptOut {
  const rand = prng(hashString(`${ep.id}:${JSON.stringify(settings)}`));
  const lead = ctx.characters[0];
  const friend = ctx.characters[1];
  const leadName = lead?.name ?? "she";
  const world = ctx.bible?.world_name ?? ctx.series.title.replace(/^The /, "");
  const locs = ctx.locations.length ? ctx.locations.map((l) => l.name) : [`the old path`, `the quiet square`, `the water's edge`];
  const you = settings.perspective === "second";
  const subj = you ? "you" : settings.perspective === "first" ? "I" : leadName;
  const s = () => pick(rand, SENSES.sound);
  const t = () => pick(rand, SENSES.touch);
  const sc = () => pick(rand, SENSES.scent);
  const l = () => pick(rand, SENSES.light);
  const slow = settings.pacing === "very-slow" ? "very slowly" : "slowly";

  const out: string[] = [];
  out.push(
    para(
      `Settle in, and let your shoulders soften.`,
      `Tonight we return to ${world}, where the evening is just beginning and there is nowhere at all to be.`,
      `Take a slow breath in… and let it go.`,
    ),
  );
  out.push(
    para(
      `The day has ended in ${world} the way it often does: ${slow}, with ${l()} settling over everything.`,
      `${you ? "You walk" : `${subj} walks`} towards ${pick(rand, locs)}, noticing ${s()}, and ${sc()} drifting on the air.`,
      `There is ${t()}, and a quiet sense that the night is kind.`,
    ),
  );
  out.push(para(`${ep.summary}`, `Nothing about it is urgent. It unfolds the way water finds its level: patiently, and in its own time.`));

  const targetWords = Math.min(1600, Math.max(500, settings.duration_minutes * 40));
  let guard = 0;
  while (wordCount(out.join(" ")) < targetWords && guard++ < 40) {
    const loc = pick(rand, locs);
    const kind = rand();
    if (kind < 0.35) {
      out.push(
        para(
          `At ${loc}, ${l()} lies across the ground like a folded cloth.`,
          `${you ? "You pause" : `${subj} pauses`} there for a while, listening to ${s()}.`,
          `${pick(rand, ["Somewhere, a door closes softly.", "A breeze moves through and then is gone.", "The air cools by a single, pleasant degree."])}`,
          `It is the kind of moment that asks for nothing, and so ${you ? "you give it nothing but your attention" : "it is simply enjoyed"}.`,
        ),
      );
    } else if (kind < 0.6 && friend && settings.dialogue !== "none") {
      const warm = settings.romance === "warm" ? " Their hands brush, and neither of them moves away." : settings.romance === "gentle" ? " There is a small, shy smile." : "";
      out.push(
        para(
          `${friend.name} is waiting by ${loc}, ${pick(rand, ["holding two cups of something warm", "wrapped in a long coat", "watching the sky"])}.`,
          `"I thought you might come this way," ${friend.name} says, ${pick(rand, ["quietly", "with a soft laugh", "in a low, easy voice"])}.`,
          settings.dialogue === "moderate" ? `"I always do," ${leadName} answers. "It's the long way. I like the long way."` : "",
          `They walk on together, saying very little, which is its own kind of conversation.${warm}`,
        ),
      );
    } else if (kind < 0.8) {
      const rule = ctx.bible?.rules.length ? pick(rand, ctx.bible.rules) : null;
      out.push(
        para(
          `People in ${world} have a saying${rule ? `: ${rule.replace(/\.$/, "")}` : " about evenings like this"}.`,
          `${you ? "You think" : `${subj} thinks`} of it now, and of ${sc()}, and of how the oldest customs are often the gentlest ones.`,
        ),
      );
    } else {
      out.push(
        para(
          `${you ? "Your" : "The"} footsteps are soft on the path.`,
          `One… and another… and another.`,
          `With each step, the day before grows a little further away, and the night grows a little closer, like a friend sitting down beside ${you ? "you" : "them"}.`,
        ),
      );
    }
  }
  out.push(
    para(
      `Later, much later, the lamps of ${world} begin to go out one by one.`,
      `${you ? "You find" : `${subj} finds`} somewhere warm to rest, with ${t()}, and ${s()} keeping time.`,
      `There is nothing left to do tonight. Everything that matters will still be here tomorrow.`,
    ),
  );
  out.push(para(`So let the story drift a little further away now…`, `and the quiet grow a little closer…`, `and rest.`));

  return {
    title: ep.title,
    script: out.filter(Boolean).join("\n\n"),
    new_facts: [`In "${ep.title}", ${leadName} spends an evening at ${locs[0]}.`],
  };
}

const REWRITE_OPS: Record<string, (text: string, rand: () => number) => string> = {
  shorten: (t) => {
    const sentences = t.match(/[^.!?…]+[.!?…]+["”]?\s*/g) ?? [t];
    return sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join("").trim();
  },
  expand: (t, r) => `${t.trim()} ${pick(r, [`For a while, nothing else happens, and that is perfectly fine.`, `The moment stretches, unhurried, like a long exhale.`, `Everything around seems to lean in and listen.`])}`,
  atmospheric: (t, r) => `${pick(r, SENSES.light).replace(/^./, (c) => c.toUpperCase())} lingers over everything. ${t.trim()} ${pick(r, SENSES.sound).replace(/^./, (c) => c.toUpperCase())} fills the quiet.`,
  sensory: (t, r) => `${t.trim()} There is ${pick(r, SENSES.scent)}, and ${pick(r, SENSES.touch)}.`,
  relaxing: (t) =>
    t
      .replace(/\b(suddenly|quickly|rushed|ran|raced|shouted|screamed|panicked)\b/gi, (w) => ({ suddenly: "slowly", quickly: "gently", rushed: "wandered", ran: "walked", raced: "drifted", shouted: "called softly", screamed: "sighed", panicked: "paused" })[w.toLowerCase()] ?? w)
      .replace(/!/g, ".")
      .trim() + " There is no hurry. There never was.",
  dialogue: (t, r) => `${t.trim()} "${pick(r, ["Stay a little longer?", "Listen — can you hear that?", "I'm glad you came."])}" someone says, quietly.`,
  ending: (t) => `${t.trim().replace(/[.!?]?$/, ".")} And with that, the evening settles into stillness, and everything is, at last, at rest.`,
  continuity: (t) => t.trim(),
};

export function mockRewrite(text: string, instruction: string): { text: string; op: string } {
  const rand = prng(hashString(text + instruction));
  const i = instruction.toLowerCase();
  const op = /short|trim|tighten/.test(i)
    ? "shorten"
    : /expand|longer|more detail/.test(i)
      ? "expand"
      : /atmos/.test(i)
        ? "atmospheric"
        : /sens/.test(i)
          ? "sensory"
          : /relax|calm|soft/.test(i)
            ? "relaxing"
            : /dialog/.test(i)
              ? "dialogue"
              : /ending|end/.test(i)
                ? "ending"
                : /continu/.test(i)
                  ? "continuity"
                  : "atmospheric";
  return { text: (REWRITE_OPS[op] as (t: string, r: () => number) => string)(text, rand), op };
}

/* ------------------------------------------------------------------ analyses (rule-based, real) */

const PERIL = /\b(blood|kill(?:ed|ing)?|murder|scream(?:ed|ing)?|terrif(?:ied|ying)|horror|monster|attack(?:ed)?|weapon|sword|knife|gun|explod(?:e|ed|ing)|panic(?:ked)?|chase[ds]?|danger(?:ous)?|died|death|fight(?:ing)?|war)\b/gi;
const STIM = /(!|\bsuddenly\b|\burgent(?:ly)?\b|\bracing\b|\bloud(?:ly)?\b|\bslammed\b|\bcrash(?:ed)?\b)/gi;

export function analyseSleepSuitability(script: string): SleepCheckOut {
  const words = Math.max(1, wordCount(script));
  const peril = script.match(PERIL) ?? [];
  const stim = script.match(STIM) ?? [];
  const sentences = script.split(/[.!?…]+/).filter((x) => x.trim()).length || 1;
  const avgLen = words / sentences;
  const lastPara = script.trim().split(/\n\s*\n/).slice(-1)[0] ?? "";
  const restfulEnding = /\b(rest|sleep|drift|quiet|still|settle|dream|peace|calm)\w*/i.test(lastPara) && !/\?\s*$/.test(lastPara.trim());
  let score = 100;
  const notes: string[] = [];
  if (peril.length) {
    score -= Math.min(45, peril.length * 9);
    notes.push(`Potentially distressing words: ${[...new Set(peril.map((p) => p.toLowerCase()))].slice(0, 6).join(", ")}.`);
  }
  if (stim.length / words > 0.004) {
    score -= 15;
    notes.push(`High-arousal markers (exclamations, "suddenly", loud events): ${stim.length}.`);
  }
  if (avgLen < 9) {
    score -= 10;
    notes.push(`Short average sentence length (${avgLen.toFixed(1)} words) – narration may feel brisk.`);
  }
  if (!restfulEnding) {
    score -= 20;
    notes.push("The ending doesn't clearly settle into rest, or ends on a question.");
  }
  if (!notes.length) notes.push("Gentle language, slow pacing and a restful ending.");
  return { score: Math.max(0, Math.round(score)), notes };
}

export function analyseContinuity(ctx: StoryContext, script: string): ContinuityOut {
  const issues: ContinuityOut["issues"] = [];
  const known = new Set(ctx.characters.map((c) => c.name));
  // Capitalised names used in dialogue tags that are not established characters.
  const speakers = [...script.matchAll(/["”]\s*(?:says|said|asks|asked|whispers|whispered|answers|answered)\s+([A-Z][a-z]{2,})/g)].map((m) => m[1] as string);
  for (const name of new Set(speakers)) {
    if (!known.has(name)) issues.push({ severity: "warn", message: `"${name}" speaks but is not in the character list.`, evidence: `…says ${name}…` });
  }
  // Rule checks from the World Bible.
  for (const rule of ctx.bible?.rules ?? []) {
    const r = rule.toLowerCase();
    if (/no blade|weapon/.test(r) && /\b(sword|blade|dagger|knife)\b/i.test(script)) issues.push({ severity: "conflict", message: `Breaks world rule: "${rule}"`, evidence: (/[^.]*\b(sword|blade|dagger|knife)\b[^.]*\./i.exec(script)?.[0] ?? "").trim() });
    if (/nothing (truly )?bad|never in danger|no one is ever truly in danger/.test(r) && PERIL.test(script)) issues.push({ severity: "conflict", message: `Peril conflicts with world rule: "${rule}"`, evidence: (script.match(PERIL) ?? []).slice(0, 3).join(", ") });
    PERIL.lastIndex = 0;
  }
  // Character facts: ages / roles mentioned explicitly.
  for (const c of ctx.characters) {
    const ageMatch = new RegExp(`${c.name}[^.]{0,40}\\b(\\d{1,3}) years? old`, "i").exec(script);
    if (ageMatch && c.age_range && !/\d/.test(c.age_range) && /(twenties|thirties|forties|fifties|sixties|seventies)/i.test(c.age_range)) {
      const decade = { twenties: 2, thirties: 3, forties: 4, fifties: 5, sixties: 6, seventies: 7 }[(/(twenties|thirties|forties|fifties|sixties|seventies)/i.exec(c.age_range)?.[1] ?? "").toLowerCase() as "twenties"];
      const age = Number(ageMatch[1]);
      if (decade && Math.floor(age / 10) !== decade) issues.push({ severity: "conflict", message: `${c.name} is described as ${age}, but the Story Bible says "${c.age_range}".`, evidence: ageMatch[0] });
    }
  }
  // Locations that look like proper places but are not known.
  const placeRefs = [...script.matchAll(/\b(?:at|to|in|towards) (the [A-Z][a-z]+(?: [A-Z][a-z]+){0,3})/g)].map((m) => m[1] as string);
  const knownPlaces = new Set(ctx.locations.map((l) => l.name.toLowerCase()));
  for (const p of new Set(placeRefs)) {
    if (!knownPlaces.has(p.toLowerCase()) && !ctx.bible?.world_name.includes(p.replace(/^the /, ""))) issues.push({ severity: "info", message: `New place mentioned: ${p}. Add it to Locations if it should recur.`, evidence: p });
  }
  // Unresolved threads acknowledgement
  if (ctx.bible?.unresolved_threads.length) issues.push({ severity: "info", message: `Open threads to keep in mind: ${ctx.bible.unresolved_threads.slice(0, 3).join("; ")}`, evidence: "Story Bible" });
  const conflicts = issues.filter((i) => i.severity === "conflict").length;
  return {
    summary: conflicts ? `${conflicts} potential contradiction${conflicts === 1 ? "" : "s"} with established lore. Nothing has been changed.` : "No contradictions found with the Story Bible, characters or world rules.",
    issues: issues.slice(0, 20),
  };
}

export function mockDirection(ctx: StoryContext) {
  const outline = mockSeasonOutline(ctx, ctx.episodes.length + 1);
  const next = outline.episodes[ctx.episodes.length % outline.episodes.length] ?? { title: "A Quiet Evening", summary: "A gentle continuation." };
  const thread = ctx.bible?.unresolved_threads[0];
  return {
    episode_title: next.title,
    summary: `${next.summary}${thread ? ` Along the way, a small step is taken towards: ${thread.replace(/\.$/, "")}.` : ""}`,
    beats: mockEpisodeOutline(ctx, { ...(ctx.episodes[0] as Episode), title: next.title, summary: next.summary, number: ctx.episodes.length + 1 }).beats,
    threads_advanced: thread ? [thread] : [],
  };
}
