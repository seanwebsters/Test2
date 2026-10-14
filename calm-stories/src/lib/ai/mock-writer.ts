/**
 * Deterministic, template-based story generator used when no writing model
 * is configured. Output is always flagged `simulated: true` in the UI so it
 * is never mistaken for real AI generation. Seeded by the inputs, so the
 * same request produces the same text (useful for tests and demos).
 */
import type { ConceptProposal, DirectionProposal, Genre, SceneKind, ScriptSettings } from "@/lib/types";
import { hashString, pick, prng, shuffle } from "@/lib/util";

type Rand = () => number;

interface Setting {
  scene: SceneKind;
  keywords: string[];
  places: string[];
  worldNames: string[];
  sounds: string[];
  smells: string[];
  textures: string[];
  lights: string[];
  locations: { name: string; description: string }[];
}

const SETTINGS: Setting[] = [
  {
    scene: "forest",
    keywords: ["forest", "wood", "woods", "tree", "fae", "fairy", "grove"],
    places: ["Thornwood", "Elderglade", "Mossmere", "Willowmere", "Fernhollow"],
    worldNames: ["The Elderglade", "Mossmere Reach", "The Hollow Wood"],
    sounds: ["the hush of leaves settling", "a distant owl calling once, then again", "the soft tick of rain on bracken", "a stream murmuring over smooth stones"],
    smells: ["damp moss and pine resin", "wild thyme crushed underfoot", "rain on old bark", "woodsmoke drifting from somewhere far away"],
    textures: ["cool moss beneath the fingertips", "the smooth grey bark of a beech", "a cloak heavy with evening dew", "soft pine needles thick as a carpet"],
    lights: ["fireflies drifting like slow sparks", "moonlight sifting through the canopy", "a lantern glowing amber between the trunks", "silver light pooling in the clearings"],
    locations: [
      { name: "The Old Oak", description: "A vast oak at the forest's heart, its roots wide enough to sit within." },
      { name: "The Lantern Path", description: "A winding trail marked by small lanterns that never quite go out." },
      { name: "Mossmere Pool", description: "A still, dark pool where the stars are reflected twice." },
      { name: "The Boundary Stones", description: "Ancient standing stones that mark where the forest begins." },
    ],
  },
  {
    scene: "kingdom",
    keywords: ["kingdom", "king", "queen", "prince", "princess", "court", "castle", "palace", "royal", "rival"],
    places: ["Aurelune", "Silverhold", "Vesperine", "Calloway", "Merrowmere"],
    worldNames: ["The Kingdom of Vesperine", "The Silver Realm", "The Twin Courts"],
    sounds: ["the far-off chime of the palace bells", "silk slippers whispering on marble", "a harp being tuned in a distant hall", "snow sliding softly from the battlements"],
    smells: ["beeswax candles and winter roses", "warm bread from the palace kitchens", "cold stone and lavender", "cedar chests full of folded linen"],
    textures: ["a velvet cloak against cold shoulders", "the worn brass of an old banister", "smooth, cool marble steps", "heavy pages of an old atlas"],
    lights: ["candlelight trembling along the corridor", "moonlight on the frozen lake below", "the soft blue glow of snow at night", "a single lamp burning in the tower"],
    locations: [
      { name: "The Moon Gallery", description: "A long hall of tall windows where moonlight falls in silver squares." },
      { name: "The Tower Library", description: "A round room full of maps, candles and very old books." },
      { name: "The Winter Garden", description: "A glasshouse where flowers bloom even in the snow." },
      { name: "The River Bridge", description: "An arched stone bridge between the two courts, lined with lamps." },
    ],
  },
  {
    scene: "space",
    keywords: ["space", "star", "stars", "planet", "galaxy", "ship", "station", "orbit", "sci-fi", "science", "future", "robot"],
    places: ["Halcyon", "Meridian", "Vela", "Lumen Station", "Ione"],
    worldNames: ["The Quiet Reach", "The Halcyon System", "The Long Orbit"],
    sounds: ["the low, steady hum of the engines", "a soft chime as the corridor lights dim", "the gentle hiss of air through the vents", "the far-off song of the station's systems"],
    smells: ["warm metal and fresh coffee", "the green scent of the hydroponic gardens", "clean, cool recycled air", "cinnamon tea in the galley"],
    textures: ["a soft blanket in the observation lounge", "the cool curve of a viewport", "the smooth handrail along the ring", "a well-worn star chart"],
    lights: ["a ringed planet turning slowly beyond the glass", "the violet glow of a distant nebula", "starlight wheeling past the viewport", "the dim amber of night-cycle lamps"],
    locations: [
      { name: "The Observation Lounge", description: "A curved room of glass where the stars turn slowly past." },
      { name: "The Garden Ring", description: "A ring of hydroponic gardens humming with growing things." },
      { name: "The Galley", description: "A small, warm kitchen that always smells of tea." },
      { name: "The Navigation Deck", description: "Quiet consoles and star charts glowing in the dark." },
    ],
  },
  {
    scene: "ocean",
    keywords: ["ocean", "sea", "coast", "beach", "lighthouse", "harbour", "harbor", "island", "shore", "boat", "whale"],
    places: ["Lumen Bay", "Saltmere", "Port Halloway", "Gull Island", "Tidewater"],
    worldNames: ["The Saltmere Coast", "The Isles of Lumen", "The Quiet Shore"],
    sounds: ["waves folding gently onto the sand", "rigging creaking in the harbour", "gulls settling for the night", "the slow tolling of a buoy bell"],
    smells: ["salt and seaweed on the evening air", "fresh rope and tar", "hot chips and vinegar from the harbour", "rain on warm stone"],
    textures: ["cool sand between the toes", "a thick knitted jumper", "smooth sea glass in an open palm", "a wooden rail worn soft by salt"],
    lights: ["the lighthouse beam sweeping slowly across the water", "moonlight laid like a path over the sea", "lamps glowing in the harbour windows", "the last pink light along the horizon"],
    locations: [
      { name: "The Lighthouse", description: "A white tower on the headland whose beam sweeps the bay all night." },
      { name: "The Harbour Wall", description: "A long stone wall where boats rock gently on their moorings." },
      { name: "The Bookshop by the Quay", description: "A crooked little shop full of sea charts and poetry." },
      { name: "Shell Cove", description: "A sheltered beach of pale sand and quiet rock pools." },
    ],
  },
  {
    scene: "village",
    keywords: ["village", "town", "mystery", "detective", "bakery", "inn", "cottage", "cosy", "cozy", "tea"],
    places: ["Larch Hollow", "Little Wren", "Ashby-under-Hill", "Bramblecombe", "Fennick"],
    worldNames: ["Bramblecombe", "Little Wren", "Larch Hollow"],
    sounds: ["the kettle beginning to sing", "the church clock striking the half hour", "rain pattering on the cobbles", "a cat padding across the windowsill"],
    smells: ["fresh scones and strong tea", "woodsmoke from a dozen chimneys", "old books and lavender polish", "apples stored in the cool pantry"],
    textures: ["a heavy woollen blanket", "the warm handle of a teapot", "a creaking floorboard underfoot", "a well-thumbed notebook"],
    lights: ["lamplight in the cottage windows", "the soft glow of the fire", "snow catching the light of the street lamps", "a candle burning low on the kitchen table"],
    locations: [
      { name: "The Village Green", description: "A wide green with an old well and a single, ancient chestnut tree." },
      { name: "The Tea Room", description: "A cosy room of mismatched teacups and secrets." },
      { name: "The Post Office", description: "Where every letter in the village passes through kind hands." },
      { name: "The Old Mill", description: "A quiet mill by the stream, its wheel turning slowly." },
    ],
  },
  {
    scene: "garden",
    keywords: ["garden", "flower", "orchard", "magic", "magical", "enchanted", "spell", "witch", "wizard"],
    places: ["Hollowmere", "Briarwick", "The Walled Garden", "Rosemoor", "Glimmerdell"],
    worldNames: ["Glimmerdell", "The Walled Gardens of Rosemoor", "Briarwick"],
    sounds: ["bees humming sleepily in the lavender", "a fountain trickling into its stone bowl", "the rustle of night-blooming flowers opening", "wind chimes turning slowly"],
    smells: ["honeysuckle and warm earth", "roses after rain", "crushed mint and cut grass", "night jasmine heavy in the air"],
    textures: ["soft petals brushing the wrists", "a sun-warmed stone bench", "cool, damp soil in cupped hands", "the velvet leaves of lamb's ear"],
    lights: ["glow-worms in the hedgerow", "moonlight on the pond", "paper lanterns swaying between the arches", "silver dew catching the starlight"],
    locations: [
      { name: "The Ivy Door", description: "A small green door hidden behind a curtain of ivy." },
      { name: "The Moon Pond", description: "A still pond that reflects stars which aren't in the sky." },
      { name: "The Glasshouse", description: "A Victorian glasshouse full of sleeping orchids." },
      { name: "The Sundial Lawn", description: "A circle of lawn around a sundial that tells time by moonlight." },
    ],
  },
];

const GENRE_KEYWORDS: [Genre, string[]][] = [
  ["Sleep Romantasy", ["romance", "romantic", "love", "romantasy", "rival", "rivals", "courtship", "kingdom", "fae"]],
  ["Cosy Mystery", ["mystery", "detective", "clue", "puzzle", "missing", "secret", "whodunit"]],
  ["Sci-Fi & Space", ["space", "planet", "star", "galaxy", "sci-fi", "science", "station", "robot", "future"]],
  ["Coastal Romance", ["coast", "seaside", "lighthouse", "harbour", "harbor"]],
  ["Nature & Journeys", ["journey", "walk", "mountain", "river", "nature", "travel"]],
  ["Gentle Adventure", ["adventure", "voyage", "quest", "expedition", "caravan"]],
  ["Magical Worlds", ["magic", "magical", "enchanted", "spell", "witch", "wizard", "dragon", "garden"]],
];

const GENRE_TAG: Record<Genre, string> = {
  "Sleep Romantasy": "romance",
  "Cosy Mystery": "mystery",
  "Magical Worlds": "magic",
  "Sci-Fi & Space": "space",
  "Nature & Journeys": "nature",
  "Gentle Adventure": "adventure",
  "Coastal Romance": "seaside",
};

const FIRST_NAMES = [
  "Elowen", "Rowan", "Isolde", "Caspian", "Wren", "Ambrose", "Seren", "Lior", "Odile", "Tamsin", "Corin", "Maren",
  "Felix", "Ottilie", "Ilya", "Juno", "Hazel", "Emrys", "Linnea", "Soren", "Clementine", "Bastian", "Nell", "Arlo",
];
const ROLES_PERSONALITY = [
  "patient and observant, with a dry, gentle humour",
  "warm-hearted, a little shy, and endlessly curious",
  "steady and kind, slow to speak but always worth listening to",
  "thoughtful and wry, secretly sentimental",
  "quietly brave, practical, and fond of small rituals",
];
const MENTORS = ["an old cartographer", "a retired lighthouse keeper", "the village's oldest gardener", "a kindly archivist", "a wise and sleepy cat"];

const ADJS = ["Silver", "Moonlit", "Quiet", "Lantern", "Starlit", "Willow", "Hidden", "Gentle", "Midnight", "Amber", "Velvet", "Drifting"];
const NOUNS: Record<SceneKind, string[]> = {
  forest: ["Bough", "Glade", "Hollow", "Thicket", "Grove"],
  kingdom: ["Court", "Crown", "Throne", "Kingdom", "Accord"],
  space: ["Orbit", "Station", "Voyage", "Constellation", "Express"],
  ocean: ["Tide", "Harbour", "Lighthouse", "Shore", "Current"],
  village: ["Hollow", "Teacup", "Lane", "Almanac", "Inn"],
  garden: ["Garden", "Orchard", "Glasshouse", "Bloom", "Arbour"],
  cabin: ["Cabin", "Pines"],
  coast: ["Coast"],
  desert: ["Dunes"],
  aurora: ["Lights"],
  city: ["City"],
  lake: ["Lake"],
  library: ["Library"],
  portrait: ["Portrait"],
};

function seedFrom(...parts: string[]): Rand {
  return prng(hashString(parts.join("|")));
}

export function detectSetting(text: string): Setting {
  // "set in a magical forest" outranks other keywords elsewhere in the idea.
  const where = /\b(?:set in|set on|set at|takes place in|aboard|in an?)\s+([a-z\s-]{3,40})/i.exec(text);
  if (where?.[1]) {
    const phrase = where[1].toLowerCase();
    const hit = SETTINGS.find((s) => s.keywords.some((k) => phrase.includes(k)));
    if (hit) return hit;
  }
  const t = text.toLowerCase();
  let best = SETTINGS[0]!;
  let score = 0;
  for (const s of SETTINGS) {
    const sc = s.keywords.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0);
    if (sc > score) {
      score = sc;
      best = s;
    }
  }
  if (score === 0) best = SETTINGS[hashString(t) % SETTINGS.length]!;
  return best;
}

export function settingForScene(scene: SceneKind): Setting {
  return SETTINGS.find((s) => s.scene === scene) ?? SETTINGS[0]!;
}

export function detectGenre(text: string): Genre {
  const t = text.toLowerCase();
  let best: Genre = "Magical Worlds";
  let score = 0;
  for (const [g, words] of GENRE_KEYWORDS) {
    const sc = words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
    if (sc > score) {
      score = sc;
      best = g;
    }
  }
  return best;
}

const SURPRISE_IDEAS = [
  "a night-ferry captain who carries sleeping travellers across a lake of stars",
  "a quiet mystery in a seaside village where someone keeps leaving poems in the lighthouse",
  "two rival royal gardeners from neighbouring kingdoms tending one enchanted greenhouse",
  "a gentle voyage aboard a sleeper train between peaceful planets",
];

export function mockConcept(rawIdea: string): ConceptProposal {
  const idea = /surprise me/i.test(rawIdea) || rawIdea.trim().length < 8 ? pick(seedFrom(rawIdea, "surprise"), SURPRISE_IDEAS) : rawIdea.trim();
  const rand = seedFrom(idea);
  const setting = detectSetting(idea);
  const genre = detectGenre(idea);
  const place = pick(rand, setting.places);
  const noun = pick(rand, NOUNS[setting.scene]);
  const title = rand() < 0.5 ? `The ${pick(rand, ADJS)} ${noun}` : `${pick(rand, ["Beneath", "Beyond", "Letters from", "Nights in", "The Keeper of"])} ${place}`;
  const names = shuffle(rand, FIRST_NAMES);
  const twoLeads = /two|rival|pair|both|lovers|romance|romantic/i.test(idea);
  const leadA = names[0]!;
  const leadB = names[1]!;
  const characters = [
    { name: leadA, role: "Protagonist", sketch: `${leadA} is ${pick(rand, ROLES_PERSONALITY)}.` },
    ...(twoLeads
      ? [{ name: leadB, role: genre === "Sleep Romantasy" || genre === "Coastal Romance" ? "Love interest" : "Companion", sketch: `${leadB} is ${pick(rand, ROLES_PERSONALITY)}.` }]
      : []),
    { name: names[2]!, role: "Mentor", sketch: `${names[2]} is ${pick(rand, MENTORS)} who knows more than they say.` },
  ];
  const rivalry = /rival/i.test(idea);
  const synopsis = [
    `In ${place}, where ${pick(rand, setting.lights)} and ${pick(rand, setting.sounds)} fill the evenings, ${leadA} ${rivalry ? `meets ${leadB}, who belongs to the other side of an old and gentle rivalry` : "begins a new chapter of a quiet life"}.`,
    `Each night brings a small discovery: ${pick(rand, setting.locations).name.toLowerCase()}, a forgotten story, a kindness returned.`,
    rivalry
      ? `Slowly, between shared silences and long walks, the two learn that the old rivalry was never really theirs to keep.`
      : `Slowly, ${leadA} learns that this place has been waiting for someone exactly like them.`,
  ].join(" ");
  return {
    title,
    tagline: rivalry ? `Two ${setting.scene === "kingdom" ? "courts" : "worlds"}. One gentle night at a time.` : `A peaceful story told one night at a time.`,
    synopsis,
    genre,
    tags: [setting.scene, GENRE_TAG[genre], rivalry ? "rivals-to-lovers" : "slow-life"],
    narrative_arc: `Season one follows ${leadA}${twoLeads ? ` and ${leadB}` : ""} from first meeting to a shared sense of home, with one small, restful discovery per episode and no cliffhangers.`,
    characters,
    scene: setting.scene,
    follow_up_questions: [
      twoLeads ? `Should ${leadA} and ${leadB}'s story be romantic, or a deep friendship?` : `Would you like ${leadA} to have a companion on the journey?`,
      "Roughly how long should episodes be – 20, 30 or 45 minutes?",
    ],
    original_idea: rawIdea,
  };
}

export function mockWorld(input: { title: string; synopsis: string; scene: SceneKind }) {
  const rand = seedFrom(input.title, "world");
  const s = settingForScene(input.scene);
  const name = pick(rand, s.worldNames);
  return {
    world_name: name,
    geography: `${name} is a place of ${s.locations.map((l) => l.name.replace(/^The /, "").toLowerCase()).slice(0, 3).join(", ")}, wrapped in ${pick(rand, s.lights)}. Paths are short and winding; nothing here is ever more than an evening's gentle walk away.`,
    culture: `People in ${name} keep small rituals: a lamp left burning for travellers, tea shared before any important conversation, and a quiet hour after dusk when no one hurries.`,
    history: `Long ago, ${name} was a busier place. Over the years it grew quieter by choice, and the people who stayed learned to love the slower rhythm of its nights.`,
    atmosphere: `${cap(pick(rand, s.sounds))}; ${pick(rand, s.smells)}; ${pick(rand, s.lights)}. Calm, safe and softly lit.`,
    rules: [
      "Nothing here is truly dangerous – tension always resolves gently.",
      `The ${pick(rand, s.locations).name.replace(/^The /, "")} is a place where only kind words are spoken.`,
      "Magic, where it exists, is quiet, warm and never frightening.",
    ],
    themes: ["Belonging", "Small kindnesses", "Rest and patience"],
    locations: s.locations.map((l) => ({ ...l, recurring: true })),
  };
}

export function mockCharacter(input: { seriesTitle: string; scene: SceneKind; name?: string; role?: string; index: number }) {
  const rand = seedFrom(input.seriesTitle, "char", String(input.index), input.name ?? "");
  const name = input.name ?? pick(rand, FIRST_NAMES);
  const s = settingForScene(input.scene);
  const role = input.role ?? pick(rand, ["Protagonist", "Companion", "Mentor", "Neighbour", "Love interest"]);
  return {
    name,
    age_range: pick(rand, ["Early twenties", "Late twenties", "Thirties", "Sixties", "Ageless"]),
    personality: cap(pick(rand, ROLES_PERSONALITY)) + ".",
    backstory: `${name} came to this place years ago with a single suitcase and has never quite managed to leave. They know every path by ${pick(rand, s.lights)}.`,
    motivations: pick(rand, ["To find somewhere to belong.", "To keep an old promise.", "To finish something they started long ago.", "To make the evenings a little kinder for everyone."]),
    narrative_role: role,
    voice_profile: pick(rand, ["Soft and unhurried, with long pauses.", "Warm, low and slightly amused.", "Clear and bright, a storyteller's voice.", "Quiet and precise, chooses words carefully."]),
    arc: pick(rand, ["Learns to accept help from others.", "Opens up and shares an old secret.", "Discovers the courage to stay.", "Finds rest after a long, busy life."]),
  };
}

const BEATS = [
  ["Arrival", "arrives as the evening settles and discovers"],
  ["The Lantern Hour", "spends a slow evening tending to small tasks and notices"],
  ["A Letter", "finds an old letter that mentions"],
  ["The First Snow", "watches the first snow fall and remembers"],
  ["Tea and Silence", "shares a long, quiet pot of tea and learns about"],
  ["The Night Walk", "takes a moonlit walk to"],
  ["The Map", "studies an old map that leads to"],
  ["Rain at the Window", "listens to the rain and finally talks about"],
  ["The Festival of Lights", "helps prepare the evening festival at"],
  ["The Hidden Room", "discovers a forgotten room near"],
  ["Morning Mist", "wakes before dawn and walks to"],
  ["Homecoming", "returns at last to"],
];

export function mockSeasonOutline(input: {
  seriesTitle: string;
  scene: SceneKind;
  characterNames: string[];
  threads: string[];
  episodeCount: number;
  startNumber?: number;
}) {
  const rand = seedFrom(input.seriesTitle, "outline", String(input.episodeCount));
  const s = settingForScene(input.scene);
  const lead = input.characterNames[0] ?? "Our traveller";
  const second = input.characterNames[1];
  const beats = shuffle(rand, BEATS.slice(1));
  const usedTitles = new Set<string>();
  const episodes = Array.from({ length: input.episodeCount }, (_, i) => {
    const beat = (i === 0 && (input.startNumber ?? 1) === 1 ? BEATS[0] : beats[i % beats.length])!;
    const loc = s.locations[(i + Math.floor(rand() * 4)) % s.locations.length]!;
    const who = second && i % 3 === 1 ? `${lead} and ${second}` : lead;
    const thread = input.threads[i % Math.max(1, input.threads.length)];
    let title = `${beat[0]}${rand() < 0.5 ? ` at ${loc.name.replace(/^The /, "")}` : ""}`;
    if (usedTitles.has(title)) title = `${beat[0]} at ${loc.name.replace(/^The /, "")}`;
    if (usedTitles.has(title)) title = `${beat[0]}, Again`;
    usedTitles.add(title);
    return {
      number: (input.startNumber ?? 1) + i,
      title,
      summary: `${who} ${beat[1]} ${loc.name.replace(/^The /, "the ")}${thread && i % 2 === 0 ? `, drawing a little closer to ${lower(thread)}` : ""}. The night ends quietly, with ${pick(rand, s.lights)}.`,
    };
  });
  return {
    synopsis: `A season of ${input.episodeCount} restful evenings in which ${lead}${second ? ` and ${second}` : ""} slowly uncover the gentle secrets of this place.`,
    arc: `From arrival to belonging. Each episode resolves on its own; together they ${input.threads.length ? `answer ${lower(input.threads[0]!)}` : "build a sense of home"}.`,
    episodes,
    milestones: [
      `Episode ${Math.ceil(input.episodeCount / 3)}: a first real conversation.`,
      `Episode ${Math.ceil((input.episodeCount * 2) / 3)}: an old secret is shared.`,
      `Episode ${input.episodeCount}: a quiet homecoming.`,
    ],
  };
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function lower(s: string) {
  const t = s.replace(/[.?!]$/, "");
  return t.charAt(0).toLowerCase() + t.slice(1);
}

const PACE_WPM: Record<ScriptSettings["pacing"], number> = { "very-slow": 95, slow: 110, gentle: 125 };

/** Generate a full narration script of roughly the requested duration. */
export function mockScript(input: {
  seriesTitle: string;
  episodeTitle: string;
  summary: string;
  scene: SceneKind;
  characters: { name: string; personality: string }[];
  worldName: string;
  settings: ScriptSettings;
  previously?: string | null;
}): string {
  const rand = seedFrom(input.seriesTitle, input.episodeTitle, JSON.stringify(input.settings));
  const s = settingForScene(input.scene);
  const lead = input.characters[0]?.name ?? "the traveller";
  const other = input.characters[1]?.name;
  const you = input.settings.perspective === "second";
  const first = input.settings.perspective === "first";
  const subj = you ? "you" : first ? "I" : lead;
  const poss = you ? "your" : first ? "my" : `${lead}'s`;
  const target = input.settings.duration_minutes * PACE_WPM[input.settings.pacing];
  const paras: string[] = [];

  paras.push(
    `Welcome. Before we begin, let your shoulders soften, and let the day slip a little further away. Take a slow breath in… and let it go. Tonight we return to ${input.worldName}, for ${input.episodeTitle.toLowerCase().startsWith("the") ? input.episodeTitle : `"${input.episodeTitle}"`}.`,
  );
  if (input.previously) paras.push(`Last time, ${lower(input.previously)}. And now the evening has come round again, soft and unhurried.`);
  paras.push(
    `${cap(pick(rand, s.lights))}. ${cap(pick(rand, s.sounds))} drifts on the cool air, and there is the faint scent of ${pick(rand, s.smells)}. ${cap(subj)} ${you || first ? "notice" : "notices"} it all slowly, the way you notice things at the very end of a long day.`,
  );
  paras.push(`${cap(input.summary.replace(/\.$/, ""))}. There is no hurry. There never is, here.`);

  const verb = (base: string, third: string) => (you || first ? base : third);
  const sensoryT = [
    () => `${cap(pick(rand, s.sounds))}. ${cap(pick(rand, s.textures))}. Somewhere close by, ${pick(rand, s.lights)}, and the air carries ${pick(rand, s.smells)}. ${cap(subj)} ${verb("pause", "pauses")} to take it in, letting each detail settle like snow.`,
    () => `For a long moment there is only ${pick(rand, s.sounds)}. Then, beneath it, something softer: ${pick(rand, s.sounds)}. ${cap(subj)} ${verb("breathe", "breathes")} in ${pick(rand, s.smells)} and out again, slowly, slowly.`,
    () => `The light here is the kind you only find late at night: ${pick(rand, s.lights)}. It catches on everything it touches, and ${subj} ${verb("watch", "watches")} it move, the way you might watch embers in a fire.`,
    () => `${cap(pick(rand, s.textures))}. ${cap(pick(rand, s.smells))}. Small things, ordinary things, and yet tonight each one feels like a gift, offered quietly and without fuss.`,
  ];
  const walkT = [
    (l: { name: string; description: string }) => `The path leads gently on towards ${l.name.replace(/^The /, "the ")}. ${l.description} ${cap(poss)} footsteps are soft and even, and with each step the world grows a little quieter.`,
    (l: { name: string; description: string }) => `Before long, ${l.name.replace(/^The /, "the ")} comes into view. ${l.description} ${cap(subj)} ${verb("linger", "lingers")} at its edge for a while, in no hurry at all to arrive.`,
    (l: { name: string; description: string }) => `There is a way round by ${l.name.replace(/^The /, "the ")} that takes a little longer, and tonight ${subj} ${verb("choose", "chooses")} it. ${l.description} Longer is better, on a night like this.`,
  ];
  const reflectT = [
    () => `${cap(subj)} ${verb("think", "thinks")} for a while about nothing in particular. About the warmth of a cup held in both hands. About how evening light lingers on the edges of things.`,
    () => `A memory drifts up, soft and unhurried: a kitchen long ago, a window misted with rain, someone humming while they worked. ${cap(subj)} ${verb("hold", "holds")} it gently for a moment, then ${verb("let", "lets")} it go.`,
    () => `There is nothing that needs doing. No list, no hurry, no one waiting. Only this slow evening, unfolding one gentle moment at a time.`,
    () => `${cap(subj)} ${verb("notice", "notices")} how heavy ${you ? "your" : first ? "my" : "their"} eyelids have become, how loose and easy ${you ? "your" : first ? "my" : "their"} shoulders feel. It is a good tiredness – the kind that comes after a long, kind day.`,
  ];
  const actionT = [
    () => `${cap(subj)} ${verb("fill", "fills")} a small copper kettle and ${verb("set", "sets")} it to warm. While it gathers itself, ${pick(rand, s.sounds)} fills the quiet, and the first wisp of steam curls up into the lamplight.`,
    () => `A lamp needs lighting, so ${subj} ${verb("light", "lights")} it – one careful match, one small flame – and a warm circle of gold opens up in the dark, just wide enough for one.`,
    () => `${cap(subj)} ${verb("pull", "pulls")} a thick blanket a little closer and ${verb("settle", "settles")} back. ${cap(pick(rand, s.textures))}. ${cap(pick(rand, s.lights))}.`,
  ];
  const sensory = () => pick(rand, sensoryT)();
  const walk = () => pick(rand, walkT)(pick(rand, s.locations));
  const reflect = () => pick(rand, reflectT)();
  const action = () => pick(rand, actionT)();
  const dialogue = () => {
    if (input.settings.dialogue === "none" || !other || you) return reflect();
    const lines = [
      [`"It's quieter than I expected," ${lead} says softly.`, `"It always is, at this hour," ${other} replies, smiling. "That's the best thing about it."`],
      [`"Will you stay a little longer?" ${other} asks.`, `${lead} nods. "Just a little. Just until the lamps go out."`],
      [`"Listen," ${other} whispers.`, `They listen together: ${pick(rand, s.sounds)}, and beneath it, the slow rhythm of their own breathing.`],
      [`"Do you remember the first night you came here?" ${other} asks.`, `"I remember the quiet," ${lead} says. "I'd never heard anything so quiet."`],
      [`"Tea?" ${lead} offers, already reaching for the second cup.`, `"Always," says ${other}, and settles in beside the warmth.`],
    ];
    const [a, b] = pick(rand, lines);
    const warmth =
      input.settings.romance === "warm"
        ? ` Their hands rest close together, not quite touching, and neither of them minds the silence.`
        : input.settings.romance === "gentle"
          ? ` They share a small, tired smile.`
          : "";
    return `${a} ${b}${warmth}`;
  };
  const generators = [sensory, walk, reflect, dialogue, action, sensory, walk, reflect];
  const used = new Set<string>();
  let words = paras.join(" ").split(/\s+/).length;
  let i = 0;
  const closing = [
    `And so the night deepens. ${cap(pick(rand, s.lights))}; ${pick(rand, s.sounds)}. ${cap(subj)} ${you || first ? "are" : "is"} warm, and safe, and very, very sleepy.`,
    `There will be more to discover tomorrow. But for now there is only this: the soft dark, the slow breath, and the gentle weight of rest. Sleep well.`,
  ];
  const closingWords = closing.join(" ").split(/\s+/).length;
  while (words + closingWords < target && i < 400) {
    let p = generators[(i + Math.floor(rand() * 2)) % generators.length]!();
    for (let tries = 0; used.has(p) && tries < 6; tries++) p = generators[Math.floor(rand() * generators.length)]!();
    used.add(p);
    paras.push(p);
    words += p.split(/\s+/).length;
    i++;
  }
  paras.push(...closing);
  return paras.join("\n\n");
}

export type RewriteInstruction =
  | "rewrite"
  | "expand"
  | "shorten"
  | "atmospheric"
  | "dialogue"
  | "sensory"
  | "relaxing"
  | "ending"
  | "continuity";

const STIMULATING: [RegExp, string][] = [
  [/\bscream(ed|s|ing)?\b/gi, "called softly"],
  [/\bshout(ed|s|ing)?\b/gi, "said quietly"],
  [/\bran\b/gi, "wandered"],
  [/\brushed\b/gi, "drifted"],
  [/\bsuddenly\b/gi, "slowly"],
  [/\bterrified\b/gi, "a little uncertain"],
  [/\bcrash(ed)?\b/gi, "settled"],
  [/!+/g, "."],
];

export function mockRewrite(passage: string, instruction: RewriteInstruction, scene: SceneKind, seed = ""): string {
  const rand = seedFrom(passage, instruction, seed);
  const s = settingForScene(scene);
  const trimmed = passage.trim();
  switch (instruction) {
    case "expand":
      return `${trimmed} ${cap(pick(rand, s.sounds))} fills the pause that follows. ${cap(pick(rand, s.textures))}, and the faint scent of ${pick(rand, s.smells)}. There is time, here, to notice everything.`;
    case "shorten": {
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
      return sentences.filter((_, i) => i % 2 === 0).join(" ").trim();
    }
    case "atmospheric":
      return `${cap(pick(rand, s.lights))}. ${trimmed} All around, ${pick(rand, s.sounds)}.`;
    case "sensory":
      return `${trimmed} ${cap(pick(rand, s.textures))}. The air smells of ${pick(rand, s.smells)}.`;
    case "dialogue":
      return `${trimmed}\n\n"It's beautiful tonight," someone says quietly. "Isn't it?" And it is.`;
    case "relaxing": {
      let out = trimmed;
      for (const [re, rep] of STIMULATING) out = out.replace(re, rep);
      return `${out} Let the breath slow. There is nothing to do now but rest.`;
    }
    case "ending":
      return `And so, beneath ${pick(rand, s.lights)}, everything grows still. The story will wait patiently for tomorrow. For now, there is only rest, and the soft, safe dark. Sleep well.`;
    case "continuity":
      return trimmed;
    default: {
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
      return sentences.map((x) => x.trim().replace(/\bvery\b/gi, "deeply").replace(/\bthe\b/, "the soft")).join(" ");
    }
  }
}

export function mockDirection(input: { seriesTitle: string; scene: SceneKind; lead: string; threads: string[]; lastSummary: string | null; nextNumber: number }): DirectionProposal {
  const rand = seedFrom(input.seriesTitle, "direction", String(input.nextNumber));
  const s = settingForScene(input.scene);
  const thread = input.threads[0];
  const loc = pick(rand, s.locations);
  const beat = pick(rand, BEATS);
  return {
    episode_title: `${beat[0]}${rand() < 0.5 ? ` at ${loc.name.replace(/^The /, "")}` : ""}`,
    summary: `${input.lead} ${beat[1]} ${loc.name.replace(/^The /, "the ")}${thread ? `, and finds a small clue about ${lower(thread)}` : ""}. Nothing is rushed; the episode ends warm and settled.`,
    beats: [
      `Open with a slow arrival at ${loc.name}.`,
      input.lastSummary ? `A gentle callback: ${lower(input.lastSummary)}.` : "Establish the evening's mood.",
      thread ? `Advance one thread softly: ${lower(thread)}.` : "A small discovery.",
      "Close somewhere warm, with an invitation to rest.",
    ],
    threads_advanced: thread ? [thread] : [],
  };
}

export function mockDescription(title: string, summary: string): string {
  return `${summary.replace(/\.$/, "")}. A gentle, restful episode – settle in and let ${title.replace(/^The /, "the ")} carry you towards sleep.`;
}
