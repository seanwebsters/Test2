/**
 * "Concept IP" skin.
 *
 * For founder and investor demos, the fictional demo worlds can be shown as the
 * well-known franchises they stand in for. This changes names and copy only:
 * no studio artwork, logos or likenesses are used, and every credit is marked
 * as an unlicensed concept. Toggle in You → Demo content.
 */
import type { Character, IPWorld, Partner } from "../types";

export type ContentMode = "concept" | "fictional";
const KEY = "dw.contentMode";

export function getContentMode(): ContentMode {
  try {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    return v === "fictional" ? "fictional" : "concept";
  } catch {
    return "concept";
  }
}

export function setContentMode(m: ContentMode) {
  try {
    window.localStorage.setItem(KEY, m);
  } catch {}
}

export const CONCEPT_NOTE = "Concept only — franchise names shown for illustration. Not licensed or endorsed.";

const PARTNERS: Record<string, { name: string; credit: string }> = {
  "nova-pictures": { name: "Lucasfilm", credit: "Star Wars · Lucasfilm (concept, not licensed)" },
  harbourlight: { name: "Disney", credit: "Pirates of the Caribbean · Disney (concept, not licensed)" },
  oakhollow: { name: "Warner Bros. / Universal", credit: "Wizarding World · Warner Bros.; Wicked · Universal (concept, not licensed)" },
  brickwork: { name: "Mojang Studios", credit: "Minecraft · Mojang Studios (concept, not licensed)" },
  pitchside: { name: "Premier League", credit: "Premier League (concept, not licensed)" },
};

type W = Partial<Pick<IPWorld, "title" | "tagline" | "description" | "lore" | "genre">> & { locations?: Record<string, string> };

const WORLDS: Record<string, W> = {
  "starlight-armada": {
    title: "Star Wars",
    tagline: "A long time ago, in a galaxy far, far away",
    genre: "Space saga",
    description: "Drift between twin suns, quiet hyperspace lanes and the hush of a starship at rest. The galaxy you love, slowed right down for sleep.",
    lore: "Long after the last battle, the galaxy is quiet. Old friends travel the outer rim simply to see the stars, and the Force hums softly through everything, like a lullaby only some can hear.",
    locations: { bridge: "The Falcon's Cockpit", "lumen-gate": "The Hyperspace Lane", "orchard-deck": "The Gardens of Naboo", "nebula-sea": "The Twin Suns of Tatooine" },
  },
  "moonlit-academy": {
    title: "Harry Potter",
    tagline: "A quiet night at Hogwarts",
    genre: "Wizarding World",
    description: "Candlelit corridors, a common room fire and the moon over the Black Lake. Hogwarts after lights-out, when the castle itself seems to breathe.",
    lore: "On the quietest nights the castle rearranges its staircases slowly, as if it too were settling to sleep. The portraits whisper, the owls doze, and the library keeps its secrets warm.",
    locations: { "night-library": "The Hogwarts Library", "astronomy-tower": "The Astronomy Tower", "common-room": "The Gryffindor Common Room", "moon-lake": "The Black Lake" },
  },
  "endless-seas": {
    title: "Pirates of the Caribbean",
    tagline: "Calm waters off Tortuga",
    genre: "High-seas adventure",
    description: "The Black Pearl at anchor under a fat yellow moon, lanterns swaying, rum-warm laughter fading into the sound of the tide.",
    lore: "Every storm passes, and every crew finds its way home. Beyond the last charted island lies water so still it holds tomorrow's stars, and the compass, for once, simply points to rest.",
    locations: { "lantern-isles": "Tortuga Harbour", "the-deck": "The Deck of the Black Pearl", "quiet-water": "The Still Waters", "captains-cabin": "The Captain's Cabin" },
  },
  "emerald-kingdom": {
    title: "Wicked",
    tagline: "The Emerald City, glowing in the dark",
    genre: "Musical fantasy",
    description: "Green glass towers humming softly over Oz, poppy fields that make everyone yawn, and an unlikely friendship that changed everything.",
    lore: "In the Emerald City the spires breathe light in and out like a sleeper. Out past the poppies, the yellow brick road glows faintly, as if it remembers every traveller who ever walked it.",
    locations: { "glass-city": "The Emerald City", "poppy-fields": "The Poppy Fields", "witch-garden": "Shiz University Gardens" },
  },
  blocklands: {
    title: "Minecraft",
    tagline: "Build something beautiful before bed",
    genre: "Building & exploration",
    description: "A world made of blocks where everything you build stays built, torches flicker in tiny windows and the night is gentle.",
    lore: "In this world nothing is ever lost. The villagers light their windows one by one, the sheep settle on the hills, and a floating island waits for one last block before morning.",
    locations: { "hill-village": "The Village", "crystal-caves": "The Lush Caves", "cloud-farm": "The Sky Island" },
  },
  "stadium-nights": {
    title: "Premier League",
    tagline: "The floodlights, after the final whistle",
    genre: "Football",
    description: "Historic grounds, legendary nights and the hum of a crowd you can still hear long after everyone has gone home.",
    lore: "On quiet nights the old ground replays its favourite moments in the mist over the pitch: last-minute winners, title days, songs that echoed for a century.",
  },
  "aurora-line": {
    title: "The Polar Express",
    tagline: "All aboard, beneath the northern lights",
    genre: "Night journey",
    description: "A steam train through snowfields under the aurora, hot cocoa in the dining car, and a ticket to wherever you most need to go.",
    lore: "The train only runs on nights when someone needs it. The conductor always knows your name, and the journey takes exactly as long as it takes you to fall asleep.",
  },
  "glasshouse-gardens": {
    title: "The Secret Garden",
    tagline: "A hidden garden that blooms after dark",
    genre: "Classic storybook",
    description: "Behind a locked door in a high stone wall, a forgotten garden wakes up again, one slow night bloom at a time.",
    lore: "Mary found the key, and the garden found her. Now it opens only at night, warm and green, for anyone who needs somewhere quiet to rest.",
  },
};

const CHARS: Record<string, Partial<Pick<Character, "name" | "title">> & { lines?: string[] }> = {
  "star-admiral": { name: "Luke Skywalker", title: "Jedi Master", lines: ["There's no hurry tonight. The stars have waited this long.", "Close your eyes. You'll feel it — everything is calm."] },
  "kestrel-vane": { name: "Princess Leia", title: "General of the Resistance", lines: ["Somebody has to keep watch. Might as well be me.", "Get some rest, flyboy. That's an order."] },
  archive: { name: "Obi-Wan Kenobi", title: "Jedi Knight", lines: ["Breathe slowly. Let the quiet do the work."] },
  "tomas-ri": { name: "Rey", title: "Scavenger of Jakku", lines: ["I used to count the stars on Jakku until I fell asleep."] },
  "professor-quill": { name: "Albus Dumbledore", title: "Headmaster of Hogwarts", lines: ["The best spells, I find, are the ones whispered.", "Ah. The staircases are wandering again. How restful."] },
  "wren-ashby": { name: "Hermione Granger", title: "Gryffindor", lines: ["I read that the castle sleeps too, if you're very quiet."] },
  "the-librarian": { name: "Madam Pince", title: "Hogwarts Librarian", lines: ["Shh. The books are dreaming."] },
  "felix-marsh": { name: "Harry Potter", title: "The Boy Who Lived", lines: ["I never had a proper bedtime story before Hogwarts."] },
  "sea-captain": { name: "Captain Jack Sparrow", title: "Captain of the Black Pearl", lines: ["Every storm passes, love. Every single one.", "Hold the wheel. Gently. She knows the way home, savvy?"] },
  "ilo-navigator": { name: "Will Turner", title: "Blacksmith and Sailor", lines: ["The stars are clear tonight. We're nearly there."] },
  "old-barnaby": { name: "Joshamee Gibbs", title: "First Mate", lines: ["Soup's on. Don't tell the Captain I put cinnamon in it."] },
  "marisol-reyes": { name: "Elizabeth Swann", title: "Pirate King", lines: ["There's an island here that isn't on any chart. Let's name it."] },
  "sorrel-greenwitch": { name: "Elphaba", title: "The Wicked Witch of the West", lines: ["Just a little magic, a little light, a little hush to end the night."] },
  "queen-alder": { name: "Glinda", title: "Glinda the Good", lines: ["Rest now, popular or not. Oz will keep."] },
  "tin-sentinel": { name: "The Tin Man", title: "Guardian of the Gate", lines: ["I have stood here a hundred years. Tonight I would like to sit."] },
  "pip-builder": { name: "Steve", title: "The Builder", lines: ["Three more blocks and this lighthouse is finished. Then bed."] },
  "bramble-golem": { name: "Iron Golem", title: "Village Guardian", lines: ["…"] },
  "nell-cartographer": { name: "Alex", title: "The Explorer", lines: ["Wheat's in, sheep are sleeping. Good night, village."] },
  "the-gaffer": { name: "The Gaffer", title: "Legendary Manager" },
  "number-nine": { name: "The Number Nine", title: "Club Captain" },
  "groundskeeper-ada": { name: "The Groundskeeper", title: "Keeper of the Pitch" },
  "booth-voice": { name: "The Commentator", title: "Voice of a Hundred Finals" },
  "conductor-ferro": { name: "The Conductor", title: "Conductor of the Polar Express", lines: ["Next stop… whenever you're ready. Take your time."] },
  "ines-snowfield": { name: "Hero Girl", title: "Passenger", lines: ["The snow is falling upward tonight. Look."] },
  "moss-gardener": { name: "Dickon", title: "Friend of Every Creature", lines: ["Listen. That's the robin. She only sings when it's safe."] },
  "lumen-moth": { name: "The Robin", title: "Keeper of the Key", lines: ["(sings softly, twice)"] },
};

export const CONCEPT_DREAMS: Record<string, { title: string; blurb: string }> = {
  "orig-midnight-ship": { title: "Jack Sparrow and the Jedi", blurb: "Luke Skywalker turns up aboard the Black Pearl under a sky full of unfamiliar stars." },
  "orig-lost-library": { title: "The Library After Midnight", blurb: "Hermione and Dumbledore go looking for a book that only appears at night." },
  "orig-aurora": { title: "The Long Way to the North Pole", blurb: "A sleeper car, a cup of cocoa and the northern lights all night." },
  "orig-poppy": { title: "Through the Poppy Fields", blurb: "Elphaba finds a road in Oz that hums a lullaby." },
  "pop-second-chance": { title: "Floodlights: Second Chance", blurb: "The Gaffer walks the empty pitch and remembers the greatest comeback." },
  "pop-lighthouse": { title: "Steve Builds a Lighthouse", blurb: "One block at a time, until the whole village is lit." },
  "pop-orchard": { title: "Twin Suns Over Tatooine", blurb: "Rey and Obi-Wan watch the suns go down, very slowly." },
  "pop-quiet-water": { title: "Beyond the Still Waters", blurb: "Jack and Will sail somewhere the sea is perfectly calm." },
  "pop-glasshouse": { title: "The Garden Wakes at Night", blurb: "Wait with Dickon for the rarest bloom behind the wall." },
  "pop-crossover-tea": { title: "Tea with Dumbledore on the Falcon", blurb: "Dumbledore is invited aboard for a very civilised evening in hyperspace." },
};

/** Applies the concept skin to the shared data arrays (called once at startup). */
export function applyConceptSkin(worlds: IPWorld[], characters: Character[], partners: Partner[]) {
  for (const p of partners) {
    const o = PARTNERS[p.id];
    if (o) Object.assign(p, o);
  }
  for (const w of worlds) {
    const o = WORLDS[w.id];
    if (!o) continue;
    const { locations, ...rest } = o;
    Object.assign(w, rest);
    if (locations) for (const l of w.locations) if (locations[l.id]) l.name = locations[l.id];
    if (w.partnerId === "calm-studios") w.isOriginal = false;
  }
  for (const c of characters) {
    const o = CHARS[c.id];
    if (!o) continue;
    if (o.name) c.name = o.name;
    if (o.title) c.title = o.title;
    if (o.lines) c.sampleLines = o.lines;
  }
}
