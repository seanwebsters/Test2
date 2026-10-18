import { hashString } from "@/lib/content/build";
import { seedUniverses } from "@/lib/content/build";
import type { ArtStyle, CardKind, DisplayFont, GenreId, Rarity } from "@/lib/content/types";
import type { Cards, Characters, Concept, Publishing, Story, Visual, World } from "./schemas";

/**
 * Offline template drafts. Deterministic, rule-based writing used when no AI
 * provider is configured — every output is labelled "template" in Studio so
 * nobody mistakes it for model-written content. It still produces a complete,
 * internally consistent universe that passes QA, so the publishing pipeline
 * can be exercised end to end.
 */

function rng(seed: number) {
  let a = seed >>> 0 || 7;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type R = () => number;
const pick = <T,>(r: R, xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const GENRE_WORDS: Record<GenreId, string[]> = {
  mystery: ["mystery", "detective", "secret", "murder", "missing", "clue", "disappear"],
  horror: ["horror", "ghost", "haunt", "creepy", "dread", "fear", "signal"],
  romance: ["love", "romance", "heart", "kiss", "lovers"],
  "sci-fi": ["space", "robot", "future", "station", "cyber", "alien", "android", "planet"],
  fantasy: ["magic", "dragon", "kingdom", "witch", "myth", "spell", "wizard", "fae"],
  cosy: ["cosy", "cozy", "warm", "tiny", "cute", "gentle", "nostalg", "comfort"],
  comedy: ["funny", "comedy", "absurd", "silly", "ridiculous"],
  creatures: ["creature", "animal", "monster", "beast", "critter"],
  adventure: ["adventure", "quest", "journey", "explore", "expedition"],
  surreal: ["dream", "surreal", "impossible", "strange", "uncanny"],
  anime: ["anime", "spirit", "manga"],
  drama: ["family", "politic", "rival", "drama", "dynasty", "betray"],
};

const STYLE_WORDS: [ArtStyle, string[]][] = [
  ["abyss", ["ocean", "sea", "underwater", "deep", "reef", "tide"]],
  ["orbit", ["space", "station", "orbit", "planet", "star", "moon base"]],
  ["grid", ["neon", "cyber", "megacity", "racing", "city"]],
  ["botanical", ["forest", "plant", "garden", "jungle", "greenhouse", "flower"]],
  ["lantern", ["market", "lantern", "festival", "night", "carnival"]],
  ["deco", ["hotel", "deco", "casino", "theatre", "train"]],
  ["road", ["road", "desert", "highway", "motel", "diner"]],
  ["static", ["radio", "signal", "broadcast", "tape", "vhs", "ghost"]],
  ["portrait", ["court", "royal", "throne", "politic", "dynasty", "noble"]],
  ["macro", ["tiny", "small", "mall", "house", "attic", "toy", "miniature"]],
  ["dusk", ["sunset", "dream", "twilight", "dusk", "memory"]],
  ["pop", ["object", "funny", "office", "everyday", "sticker"]],
];

const FONT_FOR: Record<ArtStyle, DisplayFont> = {
  dusk: "fraunces", macro: "fredoka", grid: "chakra", deco: "limelight", pop: "bungee", abyss: "syne",
  road: "abril", static: "vt323", botanical: "cormorant", lantern: "yeseva", orbit: "righteous", portrait: "playfair",
};

export interface BriefInfo {
  brief: string;
  genres: GenreId[];
  style: ArtStyle;
  setting: string;
  beings: string;
  tone: string[];
  seed: number;
}

export function parseBrief(brief: string): BriefInfo {
  const b = brief.toLowerCase();
  const genres = (Object.keys(GENRE_WORDS) as GenreId[]).filter((g) => GENRE_WORDS[g].some((w) => b.includes(w)));
  const style = STYLE_WORDS.find(([, ws]) => ws.some((w) => b.includes(w)))?.[0] ?? (genres.includes("horror") ? "static" : genres.includes("sci-fi") ? "orbit" : "dusk");
  const setting = b.match(/(?:inside|in|on|beneath|under|across|within|aboard)\s+(?:an?\s+|the\s+)?([a-z][a-z\s'-]{3,60}?)(?:,|\.|;| with | where | that | and |$)/)?.[1]?.trim() ?? "a forgotten place";
  const beings = b.match(/about\s+(?:an?\s+|the\s+)?([a-z][a-z\s'-]{3,50}?)\s+(?:living|who|that|in|inside|on|lost|trying|searching)/)?.[1]?.trim() ?? "unlikely heroes";
  const tone = ["warm", "nostalgic", "dark", "playful", "melancholic", "eerie", "hopeful", "epic", "cosy", "tense"].filter((t) => b.includes(t));
  return { brief, genres: (genres.length ? genres : (["adventure", "fantasy"] as GenreId[])).slice(0, 3), style, setting, beings, tone: tone.length ? tone : ["wonder-struck"], seed: hashString(brief) };
}

const SYL = ["ka", "lo", "mi", "ra", "ven", "tho", "si", "el", "an", "dor", "ish", "ma", "pel", "ru", "ty", "bel", "cor", "fen", "lu", "nor", "wyn", "zel", "ori", "ash"];
function name(r: R) {
  const n = 2 + Math.floor(r() * 2);
  let s = "";
  for (let i = 0; i < n; i++) s += pick(r, SYL);
  return cap(s);
}

export function templateConcept(info: BriefInfo): Concept {
  const r = rng(info.seed);
  const key = info.setting.split(/\s+/).filter((w) => w.length > 3).pop() ?? "Hollow";
  const title = `${cap(key)} ${pick(r, ["After Hours", "Kingdom", "Underground", "Lights", "Hollow", "Below", "Beyond"])}`;
  const setting = info.setting.startsWith("a ") ? info.setting : `the ${info.setting}`;
  return {
    title,
    tagline: `${cap(info.beings)}. ${cap(setting)}. ${pick(r, ["Nothing stays forgotten.", "Every secret has a keeper.", "The lights are still on.", "Someone is listening."])}`,
    premise: `Deep ${setting}, ${info.beings} have built a hidden world out of everything people left behind. When something impossible happens, one of them sets out to find out why — and discovers the ${key} has a memory of its own.`,
    synopsis: `A ${info.tone.join(", ")} ${info.genres.map((g) => g.replace("-", " ")).join(" / ")} story set ${setting}. ${info.brief.trim()}`,
    genres: info.genres,
    audience: info.genres.includes("cosy") ? "10–35, cosy fantasy and collectible-creature fans" : "14–35, fans of serialised mysteries and original worlds",
    differentiation: `A ${info.tone[0]} ${info.genres[0]} world built around one vivid place: ${setting}. Every card is a piece of evidence or a resident you can collect.`,
  };
}

export function templateWorld(info: BriefInfo, c: Concept): World {
  const r = rng(info.seed + 1);
  const key = c.title.split(" ")[0]!;
  const fac = [
    { id: "keepers", name: `The ${key} Keepers`, motto: "Leave nothing behind.", description: "Caretakers who maintain the hidden world.", color: "#f2b544" },
    { id: "drifters", name: "The Drifters", motto: "Everything moves on.", description: "Restless explorers who want to see beyond the walls.", color: "#6cc3a0" },
    { id: "shadow", name: "The Quiet Ones", motto: "We remember for you.", description: "A secretive order that hoards the past.", color: "#b48ad8" },
  ];
  const locs = ["Heart", "Gate", "Archive"].map((l) => ({ id: slugify(`${key} ${l}`), name: `The ${l} of ${key}`, description: pick(r, ["Where the oldest light still burns.", "A crossing point nobody uses twice.", "Where everything forgotten is kept."]) }));
  return {
    history: `Long ago, ${info.setting} was abandoned in a single night. ${cap(info.beings)} moved in within the week, and have spent generations turning what was left into a civilisation.`,
    geography: `${locs.map((l) => l.name).join(", ")} — linked by passages only the locals know.`,
    rules: ["Nothing left behind may be destroyed — only reused.", "The old lights must never be switched off.", "Never go further than the last lit corridor alone."],
    culture: "A barter culture of found objects, oral history and elaborate festivals timed to forgotten clocks.",
    mythology: `The locals believe ${info.setting} is alive, and that it chooses one keeper each generation.`,
    conflicts: [`${fac[0]!.name} and ${fac[1]!.name} disagree about leaving.`, "Someone has started switching off the lights."],
    locations: locs,
    secrets: ["The people who left are coming back.", "The keeper was chosen long before they were born."],
    factions: fac,
  };
}

export function templateCharacters(info: BriefInfo, w: World): Characters {
  const r = rng(info.seed + 2);
  const roles = ["lead", "lead", "supporting", "supporting", "antagonist", "mystery"] as const;
  const titles = ["The Reluctant Keeper", "The Explorer", "The Archivist", "The Fixer", "The Collector", "The Voice in the Walls"];
  const people = roles.map((role, i) => {
    const n = name(r);
    return {
      id: slugify(n),
      name: n,
      role,
      title: titles[i]!,
      factionId: w.factions[i % 3]!.id,
      bio: `${n} is ${pick(r, ["the youngest", "the oldest", "the only", "the last"])} ${titles[i]!.toLowerCase().replace("the ", "")} of ${info.setting}.`,
      personality: pick(r, ["Brave, stubborn, secretly anxious.", "Warm, funny, impossible to discourage.", "Precise, quiet, fiercely loyal.", "Charming, restless, hiding something."]),
      motivation: pick(r, ["To find out why the lights are going out.", "To leave — and to be missed.", "To keep everyone safe, whatever it costs.", "To finish what the last keeper started."]),
      visual: `${pick(r, ["A patched coat", "A lantern", "A key on a string", "Oversized goggles"])} and one unmistakable silhouette.`,
      arc: pick(r, ["Learns that leading isn't knowing the way.", "Chooses to stay.", "Becomes the thing they feared.", "Remembers who they were."]),
      relationships: [] as Characters["characters"][number]["relationships"],
    };
  });
  people[0]!.relationships.push({ to: people[1]!.id, type: "ally", note: "Inseparable since childhood." }, { to: people[4]!.id, type: "enemy", note: "Wants what they protect." });
  people[1]!.relationships.push({ to: people[0]!.id, type: "romance", note: "Never says it out loud." });
  people[2]!.relationships.push({ to: people[0]!.id, type: "mentor", note: "Sees the keeper in them." });
  people[4]!.relationships.push({ to: people[5]!.id, type: "mystery", note: "Takes orders from somewhere." });
  return { characters: people };
}

export function templateVisual(info: BriefInfo, c: Concept): Visual {
  const ref = seedUniverses().find((u) => u.style.artStyle === info.style) ?? seedUniverses()[0]!;
  return {
    artStyle: info.style,
    displayFont: FONT_FOR[info.style],
    palette: { ...ref.style.palette, art: [...ref.style.palette.art] },
    lighting: `${cap(info.tone[0]!)} light with strong silhouettes; a single warm source in every frame.`,
    characterRules: "Readable silhouettes; one glowing personal object per character; no realistic faces.",
    frameStyle: "Thin metallic border; rarity colour in the corners.",
    logoDirection: `Display wordmark for "${c.title}" with one letter replaced by a symbol from the world.`,
    keyArtPrompt: `${c.title}: ${info.setting}, ${info.beings}, ${info.tone.join(", ")} mood, cinematic key art`,
  };
}

export function templateStory(info: BriefInfo, c: Concept, w: World, ch: Characters): Story {
  const [a, b, s, f, villain, myst] = ch.characters;
  const L = w.locations;
  const eps = [
    { t: "The Lights Go Out", p: [`The first light went out on a Tuesday. ${a!.name} noticed because nobody else did: one bulb, deep ${info.setting}, flickering once and going dark.`, `${b!.name} laughed at first. Lights failed all the time. But this one had been burning since before the Leaving, and when ${a!.name} touched the glass, it was cold in a way glass shouldn't be.`, `By evening, three more had gone out — in a line, pointing straight at ${L[0]!.name}.`] },
    { t: "The Archivist", p: [`${s!.name} kept the records of everything that had ever been found. ${a!.name} had never been allowed into the Archive. Tonight, the door was open.`, `"The lights aren't failing," ${s!.name} said, unrolling a map older than either of them. "They're being collected."`, `On the map, in faded ink, someone had drawn a door that wasn't there.`] },
    { t: "The Collector", p: [`${villain!.name} arrived with a smile and a sack that clinked. "I'm only tidying," they said. "Someone has to."`, `${f!.name} could fix anything, but not this. Every light ${villain!.name} took left a little more of the world forgotten.`, `${a!.name} made a choice: follow the Collector home.`] },
    { t: "The Voice in the Walls", p: [`Behind ${L[1]!.name}, the walls were warm. And they were talking.`, `"You found me," said ${myst!.name}, in a voice like a building settling at night. "I've been keeping the lights on for a very long time."`, `${a!.name} realised the place they lived in had been protecting them all along — and that it was getting tired.`] },
    { t: "The Last Lit Corridor", p: [`There was one corridor left with every light still on. ${a!.name} and ${b!.name} walked it together.`, `At the end, ${L[2]!.name}, and a door that hadn't been opened since the Leaving.`] },
    { t: "Someone Is Coming Back", p: [`The door opened from the other side.`, `Footsteps — big ones — and a voice nobody had heard in generations: "Hello? Is anyone still here?"`] },
  ];
  return {
    seasonTitle: "The Lights Go Out",
    seasonSynopsis: `Someone is collecting the last lights of ${info.setting}, and ${a!.name} is the only one who has noticed.`,
    plannedEpisodes: 10,
    episodes: eps.map((e, i) => ({
      title: e.t,
      synopsis: e.p[0]!.split(". ")[0]! + ".",
      body: e.p,
      characterIds: [a!.id, [b, s, villain, myst, b, a][i]!.id],
      cliffhanger: i < eps.length - 1 ? `Next: ${eps[i + 1]!.t}.` : "Season 2 is coming.",
    })),
    spinoffs: [`${s!.name}'s Archive: one-shot stories behind each found object.`, `${villain!.name}: Origins.`],
  };
}

export function templateCards(info: BriefInfo, c: Concept, w: World, ch: Characters, st: Story): Cards {
  const r = rng(info.seed + 3);
  const rows: Cards["cards"] = [];
  const add = (nm: string, kind: CardKind, rarity: Rarity, factionId: string, characterId: string, description: string, lore: string, ep: number) =>
    rows.push({ name: nm, kind, rarity, factionId, characterId, description, lore, artPrompt: `${nm} — ${c.title}, ${info.tone.join(", ")}`, episodeNumber: ep });
  const rar: Rarity[] = ["rare", "rare", "uncommon", "uncommon", "epic", "mythic"];
  ch.characters.forEach((p, i) => add(p.name, "character", rar[i]!, p.factionId, p.id, p.title, p.bio, [1, 1, 2, 2, 3, 4][i]!));
  w.locations.forEach((l, i) => add(l.name, "location", (["common", "uncommon", "rare"] as Rarity[])[i]!, "", "", l.description, `${l.name} appears on no map made by people.`, i + 1));
  w.factions.forEach((f, i) => add(`${f.name} Sigil`, "artifact", (["uncommon", "common", "epic"] as Rarity[])[i]!, f.id, "", `The mark of ${f.name}.`, `“${f.motto}”`, i + 1));
  const commons = ["Flickering Bulb", "Found Key", "Lost Ticket", "Dust Moths", "Echo", "Forgotten Map", "Spare Battery", "Paper Lantern", "Old Sign"];
  commons.forEach((n, i) => add(n, pick(r, ["object", "creature", "object", "moment"] as const), i < 7 ? "common" : "uncommon", w.factions[i % 3]!.id, "", `${n} from ${info.setting}.`, `Every ${n.toLowerCase()} here has a story, if you know who to ask.`, (i % 4) + 1));
  add("The Lights Go Out", "event", "epic", "", "", "The night everything began.", st.episodes[0]!.body[0]!, 1);
  add("The Leaving", "moment", "legendary", "", "", "The night the people left.", w.history, 3);
  add("The Last Lit Corridor", "location", "legendary", "", "", "Every light still burning.", "Walk it together, or not at all.", 5);
  return { setName: st.seasonTitle, setCode: c.title.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase(), cards: rows };
}

export function templatePublishing(c: Concept, st: Story, cards: Cards): Publishing {
  return {
    teaser: `${c.tagline}`,
    launchCopy: `${c.title} is now open. ${c.premise}`,
    featuredCardNames: cards.cards.filter((x) => ["mythic", "legendary", "epic"].includes(x.rarity)).map((x) => x.name).slice(0, 4),
    schedule: st.episodes.map((_, i) => ({ episodeNumber: i + 1, dayOffset: i < 3 ? 0 : (i - 2) * 3 })),
    campaign: ["Launch-day featured hero placement", "Starter-pack spotlight in onboarding for matching genres", "Episode 4 release push notification to followers", "Mythic reveal clip for social"],
  };
}
