import type { Creator, DreamEngineInput, WeeklyDrop } from "../types";

export const weeklyDrop: WeeklyDrop = {
  week: "Week of 5 October",
  headline: "Fresh worlds. New characters. More to dream about.",
  stats: [
    { label: "New Worlds", value: 2 },
    { label: "New Characters", value: 6 },
    { label: "New Story Styles", value: 3 },
    { label: "New Voices", value: 4 },
  ],
  worldIds: ["aurora-line", "glasshouse-gardens"],
  characterIds: ["conductor-ferro", "ines-snowfield", "moss-gardener", "tin-sentinel", "marisol-reyes", "booth-voice"],
  styles: [
    { name: "Postcard Dreams", description: "Told as letters from a friend who is travelling somewhere quiet." },
    { name: "Slow Radio", description: "A late-night broadcast that fades into static and rain." },
    { name: "Bedtime Almanac", description: "A gentle encyclopedia entry that drifts into a story." },
  ],
  voiceIds: ["v-tide", "v-ember", "v-conductor", "v-commentator"],
};

/** Curated dream requests used to seed Calm Originals, Popular and Creator shelves. */
export interface CuratedDream {
  id: string;
  title: string;
  blurb: string;
  author: { kind: "calm" | "creator"; name: string };
  plays: string;
  request: Omit<DreamEngineInput, "user_id" | "user_preferences" | "story_history">;
}

const base = { story_role: "watch" as const, user_prompt: "" };

export const curatedDreams: CuratedDream[] = [
  {
    id: "orig-midnight-ship", title: "The Admiral and the Midnight Ship", blurb: "Two captains, one ship, a sky full of unfamiliar constellations.",
    author: { kind: "calm", name: "Calm Originals" }, plays: "1.2M",
    request: { ...base, worlds: ["endless-seas", "starlight-armada"], characters: ["star-admiral", "sea-captain"], tone: "adventure", length: 40, sleepiness: "relaxed",
      user_prompt: "A peaceful journey aboard a pirate ship where the Star Admiral unexpectedly appears and everyone has to work together." },
  },
  {
    id: "orig-lost-library", title: "The Lost Library", blurb: "The Night Library has moved again. Somewhere inside, a book is waiting for you.",
    author: { kind: "calm", name: "Calm Originals" }, plays: "864K",
    request: { ...base, worlds: ["moonlit-academy"], characters: ["professor-quill", "wren-ashby"], tone: "mystery", length: 40, sleepiness: "sleepy" },
  },
  {
    id: "orig-aurora", title: "Last Train to Fjellhavn", blurb: "A sleeper carriage, a cup of cocoa and the northern lights all night.",
    author: { kind: "calm", name: "Calm Originals" }, plays: "402K",
    request: { ...base, worlds: ["aurora-line"], characters: ["conductor-ferro", "ines-snowfield"], tone: "very-sleepy", length: 60, sleepiness: "deep" },
  },
  {
    id: "orig-poppy", title: "A New Path in Emerald Kingdom", blurb: "Sorrel finds a road that hums a lullaby.",
    author: { kind: "calm", name: "Calm Originals" }, plays: "611K",
    request: { ...base, worlds: ["emerald-kingdom"], characters: ["sorrel-greenwitch", "queen-alder"], tone: "cozy", length: 20, sleepiness: "relaxed" },
  },
  {
    id: "pop-second-chance", title: "Stadium Nights: Second Chance", blurb: "The Gaffer walks the empty pitch and remembers the greatest comeback.",
    author: { kind: "calm", name: "Calm Originals" }, plays: "938K",
    request: { ...base, worlds: ["stadium-nights"], characters: ["the-gaffer", "number-nine"], tone: "nostalgic", length: 40, sleepiness: "relaxed" },
  },
  {
    id: "pop-lighthouse", title: "Pip Builds a Lighthouse", blurb: "One block at a time, until the whole valley is lit.",
    author: { kind: "creator", name: "Maya Lund" }, plays: "287K",
    request: { ...base, worlds: ["blocklands"], characters: ["pip-builder", "bramble-golem"], tone: "cozy", length: 20, sleepiness: "sleepy" },
  },
  {
    id: "pop-orchard", title: "Moon-pears on the Orchard Deck", blurb: "A slow night shift tending a garden among the stars.",
    author: { kind: "creator", name: "Theo Okafor" }, plays: "190K",
    request: { ...base, worlds: ["starlight-armada"], characters: ["tomas-ri", "archive"], tone: "very-sleepy", length: 60, sleepiness: "deep" },
  },
  {
    id: "pop-quiet-water", title: "Beyond the Quiet Water", blurb: "The sea so still it reflects tomorrow's stars.",
    author: { kind: "creator", name: "Saoirse Kelly" }, plays: "344K",
    request: { ...base, worlds: ["endless-seas"], characters: ["sea-captain", "ilo-navigator"], tone: "romantic", length: 40, sleepiness: "sleepy" },
  },
  {
    id: "pop-glasshouse", title: "The Moonflower Sings Once", blurb: "Wait with Moss for the rarest bloom in the Gardens.",
    author: { kind: "calm", name: "Calm Originals" }, plays: "121K",
    request: { ...base, worlds: ["glasshouse-gardens"], characters: ["moss-gardener", "lumen-moth"], tone: "very-sleepy", length: 40, sleepiness: "deep" },
  },
  {
    id: "pop-crossover-tea", title: "Tea at the Edge of the Galaxy", blurb: "Professor Quill is invited aboard the Armada for a very civilised evening.",
    author: { kind: "creator", name: "Maya Lund" }, plays: "233K",
    request: { ...base, worlds: ["moonlit-academy", "starlight-armada"], characters: ["professor-quill", "archive", "kestrel-vane"], tone: "funny", length: 40, sleepiness: "relaxed" },
  },
];

export const creators: Creator[] = [
  { id: "maya-lund", name: "Maya Lund", handle: "@mayadreams", bio: "Cosy crossovers and very small adventures.", followers: "48K", hue: "#a99cf0", dreamIds: ["pop-lighthouse", "pop-crossover-tea"] },
  { id: "theo-okafor", name: "Theo Okafor", handle: "@slowspace", bio: "Space stories so slow you'll be asleep by the second planet.", followers: "31K", hue: "#7fb2ff", dreamIds: ["pop-orchard"] },
  { id: "saoirse-kelly", name: "Saoirse Kelly", handle: "@tideandlantern", bio: "Sea stories, lanterns, and a little bit of romance.", followers: "62K", hue: "#7fd0d8", dreamIds: ["pop-quiet-water"] },
  { id: "calm", name: "Calm Originals", handle: "@calm", bio: "Signature Dream Worlds stories from the Calm studio.", followers: "2.1M", hue: "#ecc98a", dreamIds: ["orig-midnight-ship", "orig-lost-library", "orig-aurora", "orig-poppy", "pop-glasshouse"] },
];

export const curatedById = (id: string) => curatedDreams.find((d) => d.id === id);
