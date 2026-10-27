import type { Repo } from "./store/repo";
import type { Asset, Game, GameVersion, Settings } from "./types";
import type { ConstellationConfig, GardenConfig, TileConfig } from "./engine/schemas";
import { defaultSettings } from "./settings";

/**
 * Studio originals. These are hand-authored (not produced by the agents) and
 * are labelled that way in the library. They exercise all three archetypes.
 */

export const sunsetPath: TileConfig = {
  archetype: "tile-path",
  title: "Apricus' Sunset Path",
  subtitle: "A coastal light puzzle",
  intro: "Turn the old stones so the last of the sunlight can travel along the cliffs and reach the lighthouse. Tap a stone to turn it. There is no timer.",
  completion: "The lighthouse is lit, and the coast settles into evening.",
  flowLabel: "sunlight",
  sourceLabel: "the setting sun",
  targetLabel: "lighthouse",
  breathPacer: false,
  levels: [
    { name: "Cliff Steps", cols: 4, rows: 4, path: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3]], decoyDensity: 0.4, note: "Follow the warm light down the cliff steps." },
    { name: "The Olive Terraces", cols: 5, rows: 5, path: [[0, 4], [0, 3], [1, 3], [2, 3], [2, 2], [2, 1], [3, 1], [4, 1], [4, 0]], decoyDensity: 0.5, note: "Some stones lead nowhere. Let them rest." },
    { name: "Harbour at Dusk", cols: 6, rows: 5, path: [[0, 2], [1, 2], [1, 1], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [4, 3], [5, 3], [5, 4]], decoyDensity: 0.55, note: "The longest path of the evening, all the way to the harbour light." },
  ],
  theme: {
    sky: ["#F7D9B4", "#EBA98E", "#A988B0"],
    ground: "#6E5A7E",
    surface: "#F4E6D4",
    accent: "#FFC979",
    accentSoft: "#F2B8A2",
    ink: "#2A2140",
    glow: "#FFE4B0",
    particles: "dust",
    particleDensity: 0.5,
    motionTempo: 0.85,
    soundScale: "pentatonic",
    soundRoot: 220,
  },
};

export const tidalGarden: GardenConfig = {
  archetype: "garden",
  title: "The Tidal Garden",
  subtitle: "Restore an island garden",
  intro: "Choose a plant, then tap soil to sow it. Soil beside water stays moist; dig channels to carry the spring further, or water by hand. Companions that bloom side by side grow in harmony.",
  completion: "The island garden is whole again, humming with bees and the sound of the tide.",
  levels: [
    {
      name: "The Spring Bed",
      layout: ["..~..", ".....", "#...#", ".....", "....."],
      species: [
        { id: "sea-thrift", name: "Sea thrift", form: "flower", leaf: "#7E9B76", bloom: "#E8A3B3" },
        { id: "lavender", name: "Lavender", form: "shrub", leaf: "#8DA28A", bloom: "#A897D6" },
        { id: "dune-grass", name: "Dune grass", form: "grass", leaf: "#A9B779", bloom: "#E9D7A6" },
      ],
      companions: [["sea-thrift", "lavender"]],
      goalBlooms: 4,
      goalHarmonies: 1,
      channelBudget: 2,
      growthStages: 3,
      note: "Begin beside the spring, where the soil is already moist.",
    },
    {
      name: "Tidewater Terraces",
      layout: ["~.....", "......", ".##...", "......", "...##.", ".....~"],
      species: [
        { id: "sea-thrift", name: "Sea thrift", form: "flower", leaf: "#7E9B76", bloom: "#E8A3B3" },
        { id: "rosemary", name: "Rosemary", form: "shrub", leaf: "#6F8F7A", bloom: "#B9C8E8" },
        { id: "sea-kale", name: "Sea kale", form: "succulent", leaf: "#8FB0A8", bloom: "#F3E3B5" },
        { id: "samphire", name: "Samphire", form: "grass", leaf: "#9DB59A", bloom: "#D9E4A8" },
      ],
      companions: [["sea-thrift", "rosemary"], ["sea-kale", "samphire"]],
      goalBlooms: 8,
      goalHarmonies: 2,
      channelBudget: 4,
      growthStages: 4,
      note: "Two springs feed these terraces. Channels can bring water to the middle beds.",
    },
  ],
  theme: {
    sky: ["#EEF4F1", "#C9DFDF", "#93B7C4"],
    ground: "#7C9A8E",
    surface: "#E8DCC6",
    accent: "#F0B98F",
    accentSoft: "#E9C5B5",
    ink: "#1E2E3A",
    glow: "#FFF3DC",
    particles: "petals",
    particleDensity: 0.4,
    motionTempo: 0.9,
    soundScale: "lydian",
    soundRoot: 261.63,
  },
};

export const breatheAndFlow: TileConfig = {
  archetype: "tile-path",
  title: "Breathe & Flow",
  subtitle: "Water, stone and breath",
  intro: "Guide spring water down to the still pool by turning the channel stones. A soft light breathes with you in the corner; let your taps follow its rhythm.",
  completion: "The pool is full and quiet. Stay a moment and breathe with it.",
  flowLabel: "water",
  sourceLabel: "the spring",
  targetLabel: "still pool",
  breathPacer: true,
  levels: [
    { name: "First Breath", cols: 4, rows: 4, path: [[0, 1], [1, 1], [2, 1], [2, 2], [2, 3], [3, 3]], decoyDensity: 0.3, note: "Breathe in as the light grows. Turn a stone as you breathe out." },
    { name: "Moss Channel", cols: 5, rows: 5, path: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 3], [3, 4], [4, 4]], decoyDensity: 0.4, note: "Slow and steady. The water is in no hurry." },
    { name: "The Long Exhale", cols: 6, rows: 6, path: [[0, 5], [1, 5], [1, 4], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [4, 1], [5, 1], [5, 0]], decoyDensity: 0.45, note: "A winding course for a long, easy exhale." },
  ],
  theme: {
    sky: ["#EDF2EA", "#CADBCF", "#8FB0AE"],
    ground: "#6F8C86",
    surface: "#EDE6D8",
    accent: "#7FB3D0",
    accentSoft: "#B9AEDC",
    ink: "#1F2D33",
    glow: "#E6F3F7",
    particles: "mist",
    particleDensity: 0.5,
    motionTempo: 0.7,
    soundScale: "dorian",
    soundRoot: 196,
  },
};

export const starStories: ConstellationConfig = {
  archetype: "constellation",
  title: "Star Stories",
  subtitle: "Constellations of the quiet coast",
  intro: "Draw lines between stars to reveal the figures above the sea. Drag from one star to another, or tap two stars in turn. The small dots show how many lines each star still needs.",
  completion: "Three old stories now hang over the water, ready for anyone who looks up.",
  levels: [
    {
      name: "The Heron",
      story: "A heron waits at the water's edge, patient as the tide. Fishermen say she keeps watch so the boats come home.",
      stars: [
        { id: "a", x: 0.2, y: 0.7, mag: 2 },
        { id: "b", x: 0.35, y: 0.55, mag: 1 },
        { id: "c", x: 0.5, y: 0.45, mag: 2 },
        { id: "d", x: 0.62, y: 0.3, mag: 1 },
        { id: "e", x: 0.78, y: 0.22, mag: 2 },
        { id: "f", x: 0.5, y: 0.75, mag: 3 },
        { id: "g", x: 0.82, y: 0.7, mag: 3 },
      ],
      edges: [["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"], ["c", "f"]],
      hint: "both",
      note: "Begin with the bright stars of the heron's neck.",
    },
    {
      name: "The Lantern Boat",
      story: "A small boat carries a lantern across the bay each midsummer, so that no one has to cross the dark alone.",
      stars: [
        { id: "a", x: 0.2, y: 0.6, mag: 2 },
        { id: "d", x: 0.32, y: 0.76, mag: 2 },
        { id: "c", x: 0.68, y: 0.76, mag: 2 },
        { id: "b", x: 0.8, y: 0.6, mag: 2 },
        { id: "m", x: 0.5, y: 0.6, mag: 1 },
        { id: "t", x: 0.5, y: 0.22, mag: 1 },
        { id: "s", x: 0.72, y: 0.5, mag: 2 },
        { id: "l", x: 0.3, y: 0.3, mag: 3 },
      ],
      edges: [["a", "d"], ["d", "c"], ["c", "b"], ["b", "m"], ["m", "a"], ["m", "t"], ["t", "s"], ["s", "m"]],
      hint: "degree",
      note: "Hull, mast and sail. One faint star is only a lantern.",
    },
    {
      name: "The Night Garden",
      story: "Some nights a flower opens in the sky, and every garden on the island blooms a little brighter by morning.",
      stars: [
        { id: "c", x: 0.5, y: 0.48, mag: 1 },
        { id: "p1", x: 0.5, y: 0.22, mag: 2 },
        { id: "p2", x: 0.73, y: 0.4, mag: 2 },
        { id: "p3", x: 0.64, y: 0.68, mag: 2 },
        { id: "p4", x: 0.36, y: 0.68, mag: 2 },
        { id: "p5", x: 0.27, y: 0.4, mag: 2 },
        { id: "s", x: 0.48, y: 0.9, mag: 3 },
      ],
      edges: [["c", "p1"], ["c", "p2"], ["c", "p3"], ["c", "p4"], ["c", "p5"], ["p1", "p2"], ["p2", "p3"], ["p3", "p4"], ["p4", "p5"], ["p5", "p1"], ["p4", "s"]],
      hint: "degree",
      note: "Petals first, or the heart first. Either way it will open.",
    },
  ],
  theme: {
    sky: ["#0F1833", "#1E2A52", "#3E4374"],
    ground: "#1A2245",
    surface: "#2A3563",
    accent: "#F1D99B",
    accentSoft: "#B9AEDC",
    ink: "#F4EFE4",
    glow: "#DCE3FF",
    particles: "stars",
    particleDensity: 0.6,
    motionTempo: 0.8,
    soundScale: "lydian",
    soundRoot: 293.66,
  },
};

const emblems: Record<string, string> = {
  "seed-sunset-path": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="30" r="12" fill="#FFC979"/><path d="M6 40h52M12 46h40M18 52h28" stroke="#9C7AA6" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  "seed-tidal-garden": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 50V26" stroke="#7E9B76" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="25" cy="36" rx="7" ry="3.5" fill="#7E9B76" transform="rotate(-30 25 36)"/><g fill="#E8A3B3"><circle cx="32" cy="18" r="5"/><circle cx="26" cy="23" r="5"/><circle cx="38" cy="23" r="5"/></g><path d="M8 54c6 0 6-3 12-3s6 3 12 3 6-3 12-3 6 3 12 3" stroke="#93B7C4" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  "seed-breathe-flow": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="none" stroke="#7FB3D0" stroke-width="2"/><circle cx="32" cy="32" r="11" fill="#B9AEDC" opacity=".7"/><path d="M14 44c6 0 6-3 12-3s6 3 12 3 6-3 12-3" stroke="#6F8C86" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  "seed-star-stories": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M12 44L22 34L32 28L40 18L50 13M32 28L32 48" stroke="#F1D99B" stroke-width="1.8" fill="none" stroke-linecap="round"/><g fill="#fff"><circle cx="12" cy="44" r="2.2"/><circle cx="22" cy="34" r="2.8"/><circle cx="32" cy="28" r="2.2"/><circle cx="40" cy="18" r="2.8"/><circle cx="50" cy="13" r="2.2"/><circle cx="32" cy="48" r="1.6"/></g></svg>`,
};

interface Seed {
  id: string;
  name: string;
  description: string;
  category: Game["category"];
  config?: TileConfig | GardenConfig | ConstellationConfig;
  concept?: Game["concept"];
}

export const SEEDS: Seed[] = [
  { id: "seed-sunset-path", name: sunsetPath.title, description: "A gentle puzzle where players guide sunlight across an ancient coastal landscape.", category: "Puzzle", config: sunsetPath },
  { id: "seed-tidal-garden", name: tidalGarden.title, description: "Restore a peaceful island garden by arranging plants and waterways.", category: "Gardening", config: tidalGarden },
  { id: "seed-breathe-flow", name: breatheAndFlow.title, description: "Guide water through a tranquil environment using rhythmic interactions.", category: "Breathing", config: breatheAndFlow },
  { id: "seed-star-stories", name: starStories.title, description: "Connect constellations to reveal beautiful night-sky compositions.", category: "Exploration", config: starStories },
  {
    id: "seed-colour-island",
    name: "Colour the Island",
    description: "An intricate, adult-oriented digital colouring experience.",
    category: "Colouring",
    concept: {
      mechanic: "Fill finely drawn regions of an island illustration from a curated, harmonious palette; adjacent regions suggest complementary tones.",
      emotionalGoal: "Absorbed, unhurried focus: the satisfaction of craft without having to draw.",
      visualDirection: "Etched line art in the style of an antique map, warm paper texture, muted Mediterranean pigments.",
    },
  },
  {
    id: "seed-daily-rituals",
    name: "Daily Rituals",
    description: "Arrange calming everyday rituals into satisfying interactive sequences.",
    category: "Creativity",
    concept: {
      mechanic: "Drag ritual cards (tea, stretching, journaling, a walk) into a day timeline; well-paced sequences animate into a short, peaceful scene.",
      emotionalGoal: "A sense of gentle order and intention for the day ahead.",
      visualDirection: "Soft paper cut-outs, morning light, sage and peach accents, generous whitespace.",
    },
  },
];

export async function seedStudio(repo: Repo): Promise<void> {
  if (await repo.getSettings()) return;
  const now = new Date().toISOString();
  for (const s of SEEDS) {
    const game: Game = {
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      prompt: s.description,
      status: s.config ? "ready" : "concept",
      origin: "seed",
      currentVersion: s.config ? 1 : 0,
      latestVersion: s.config ? 1 : 0,
      concept: s.concept,
      createdAt: now,
      updatedAt: now,
    };
    await repo.putGame(game);
    if (!s.config) continue;
    const assetIds: string[] = [];
    if (emblems[s.id]) {
      const asset: Asset = { id: `${s.id}-emblem`, name: `${s.name} emblem`, kind: "svg", mime: "image/svg+xml", data: emblems[s.id], source: "seed", approved: true, gameId: s.id, createdAt: now };
      await repo.putAsset(asset);
      assetIds.push(asset.id);
    }
    const version: GameVersion = { gameId: s.id, number: 1, label: "Studio original", saved: true, createdAt: now, build: { mode: "template", config: s.config }, specs: {}, assetIds };
    await repo.putVersion(version);
  }
  const settings: Settings = defaultSettings();
  await repo.putSettings(settings);
}
