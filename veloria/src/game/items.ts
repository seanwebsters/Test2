/** Merge chains: two of a level make one of the next. */

export type ChainId = 'bloom' | 'clock' | 'crystal' | 'key' | 'ink' | 'time';

export interface Chain {
  id: ChainId;
  name: string;
  levels: string[];
  /** short flavour line per level, shown when an item is selected */
  lore: string[];
}

export const CHAINS: Record<ChainId, Chain> = {
  bloom: {
    id: 'bloom',
    name: 'Blooms',
    levels: ['Flower Seed', 'Bud', 'Rosebud', 'Velorian Rose', 'Moonbloom', 'Eternal Rose'],
    lore: [
      'Hard and dry, like something waiting.',
      'Green and closed tight against the stillness.',
      'A blush of colour at the tip.',
      'It smells faintly of rain that never fell.',
      'Opens only by moonlight. Or by you.',
      'It will not wilt. Not in a hundred years.',
    ],
  },
  clock: {
    id: 'clock',
    name: 'Clockwork',
    levels: ['Tiny Screw', 'Cog', 'Brass Gear', 'Mainspring', 'Pocket Watch', 'Astral Clock'],
    lore: [
      'Small enough to lose. Important enough to matter.',
      'Its teeth are worn smooth, as if from turning in a dream.',
      'Warm to the touch, though nothing here is warm.',
      'Wound tight, holding its breath.',
      'The hands point to a quarter past eleven. Always.',
      'It keeps the time of stars, not cities.',
    ],
  },
  crystal: {
    id: 'crystal',
    name: 'Crystals',
    levels: ['Crystal Shard', 'Lilac Crystal', 'Crystal Cluster', 'Moonstone', 'Star Gem'],
    lore: [
      'A splinter of light that forgot to move.',
      'It hums when you hold it to your ear.',
      'Grown from a single wish, left too long.',
      'Pale and cool, like the underside of a cloud.',
      'Someone once called it the heart of the sky.',
    ],
  },
  key: {
    id: 'key',
    name: 'Keys',
    levels: ['Rusted Key', 'Brass Key', 'Silver Key', 'Moon Key', 'Key of Hours'],
    lore: [
      'It opens something. It just will not say what.',
      'Engraved with a tiny clock face.',
      'Cold, heavy, and very sure of itself.',
      'The teeth are shaped like the phases of the moon.',
      'Turn it, and an hour you lost comes back.',
    ],
  },
  ink: {
    id: 'ink',
    name: 'Letters & Books',
    levels: ['Torn Page', 'Folded Note', 'Sealed Letter', 'Journal', 'Old Tome', 'Grimoire'],
    lore: [
      'Half a sentence: "...if you are reading this, then—"',
      'Folded small, as if it was never meant to be found.',
      'The wax is pressed with a crescent moon.',
      'The handwriting changes halfway through.',
      'Its last chapter has no ending.',
      'It reads you as much as you read it.',
    ],
  },
  time: {
    id: 'time',
    name: 'Fragments of Time',
    levels: ['Grain of Sand', 'Vial of Sand', 'Hourglass', 'Shard of Time', 'Fragment of Forever'],
    lore: [
      'It refuses to fall.',
      'Each grain is a second someone never spent.',
      'The sand inside hangs in the middle, undecided.',
      'Look closely: a moment is caught inside, still moving.',
      'Everything Veloria has been waiting for.',
    ],
  },
};

export const CHAIN_IDS = Object.keys(CHAINS) as ChainId[];

/** e.g. "bloom:3" */
export type ItemKey = `${ChainId}:${number}`;

export function key(chain: ChainId, level: number): ItemKey {
  return `${chain}:${level}`;
}

export function parse(k: ItemKey): { chain: ChainId; level: number } {
  const [c, l] = k.split(':');
  return { chain: c as ChainId, level: Number(l) };
}

export function maxLevel(chain: ChainId): number {
  return CHAINS[chain].levels.length;
}

export function itemName(k: ItemKey): string {
  const { chain, level } = parse(k);
  return CHAINS[chain].levels[level - 1] ?? '?';
}

export function itemLore(k: ItemKey): string {
  const { chain, level } = parse(k);
  return CHAINS[chain].lore[level - 1] ?? '';
}

export function nextOf(k: ItemKey): ItemKey | null {
  const { chain, level } = parse(k);
  return level < maxLevel(chain) ? key(chain, level + 1) : null;
}

/** dewdrops paid when an item is sold */
export function sellValue(k: ItemKey): number {
  const { level } = parse(k);
  return Math.round(Math.pow(2, level - 1));
}

export type GeneratorId = 'cart' | 'tinker' | 'geode' | 'desk';

export interface Generator {
  id: GeneratorId;
  name: string;
  hint: string;
  /** weighted chain output */
  yields: { chain: ChainId; weight: number }[];
}

export const GENERATORS: Record<GeneratorId, Generator> = {
  cart: { id: 'cart', name: 'Flower Cart', hint: 'Tap for seeds and buds.', yields: [{ chain: 'bloom', weight: 1 }] },
  tinker: {
    id: 'tinker',
    name: "Clockmaker's Box",
    hint: 'Tap for clockwork. Sometimes a key falls out.',
    yields: [
      { chain: 'clock', weight: 0.7 },
      { chain: 'key', weight: 0.3 },
    ],
  },
  geode: {
    id: 'geode',
    name: 'Moonlit Geode',
    hint: 'Tap for crystals, and the odd grain of stubborn sand.',
    yields: [
      { chain: 'crystal', weight: 0.72 },
      { chain: 'time', weight: 0.28 },
    ],
  },
  desk: { id: 'desk', name: 'Writing Desk', hint: 'Tap for pages, notes and letters.', yields: [{ chain: 'ink', weight: 1 }] },
};

/** Which item from a generator, given a random number in [0,1) for chain and one for level. */
export function rollGenerator(gen: GeneratorId, r1: number, r2: number): ItemKey {
  const g = GENERATORS[gen];
  const total = g.yields.reduce((s, y) => s + y.weight, 0);
  let x = r1 * total;
  let chain = g.yields[0].chain;
  for (const y of g.yields) {
    if (x < y.weight) {
      chain = y.chain;
      break;
    }
    x -= y.weight;
  }
  return key(chain, r2 < 0.12 ? 2 : 1);
}
