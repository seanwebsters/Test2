import type { Goal } from './engine';

export interface Chapter {
  id: string;
  name: string;
  blurb: string;
  sky: [string, string];
  tile: [string, string];
  frame: string;
  dirtName: string;
  host: string;
}

export const CHAPTERS: Chapter[] = [
  { id: 'meadow', name: 'Enchanted Meadows', blurb: 'Where the trail begins, among buttercups and bees.', sky: ['#bfe3f7', '#f7e6c9'], tile: ['#fff6e4', '#f6e8cc'], frame: '#a77a4c', dirtName: 'mud', host: 'Barnaby the badger' },
  { id: 'forest', name: 'Friendship Forest', blurb: 'Mossy paths and buried treasure under the leaves.', sky: ['#a8d5b0', '#eef3d6'], tile: ['#f3f6e6', '#e3ecd0'], frame: '#6f5a3a', dirtName: 'leaf piles', host: 'Hazel the owl' },
  { id: 'blossom', name: 'Blossom Gardens', blurb: 'Petals everywhere, and chests hidden in the hedges.', sky: ['#f6c9dc', '#fdeef0'], tile: ['#fff5f7', '#fbe4ea'], frame: '#b0738b', dirtName: 'petal drifts', host: 'Mabel the hedgehog' },
  { id: 'bay', name: 'Adventure Bay', blurb: 'Salty breezes, rock pools and shipwreck gold.', sky: ['#9fd3f2', '#fdf1d6'], tile: ['#f4fbff', '#e2f1f9'], frame: '#4f7f9c', dirtName: 'sand', host: 'Pip the otter' },
  { id: 'peaks', name: 'Snowy Peaks', blurb: 'Crisp snow, cosy lodges and the bravest puzzles.', sky: ['#c9d7f2', '#f4f6fb'], tile: ['#ffffff', '#eaf0fa'], frame: '#6b7aa6', dirtName: 'snow', host: 'Luna the star fox' },
];

export interface LevelDef {
  id: string;
  num: number;
  chapter: number;
  moves: number;
  colors: number;
  goals: Goal[];
  mask?: string[];
  dirt?: string[];
  treasures?: number;
  map?: boolean;
  title?: string;
}

const FULL = ['########', '########', '########', '########', '########', '########', '########', '########'];
const MASKS: Record<string, string[]> = {
  full: FULL,
  corners: [' ###### ', '########', '########', '########', '########', '########', '########', ' ###### '],
  heart: [' ##  ## ', '########', '########', '########', '########', ' ###### ', '  ####  ', '   ##   '],
  diamond: ['  ####  ', ' ###### ', '########', '########', '########', '########', ' ###### ', '  ####  '],
  ring: ['########', '########', '##    ##', '##    ##', '########', '########', '########', '########'].map((r, i) => (i === 2 || i === 3 ? '###  ###' : r)),
  hourglass: ['########', ' ###### ', '  ####  ', '  ####  ', '  ####  ', '  ####  ', ' ###### ', '########'],
  paw: ['#  ##  #', '## ## ##', '########', '########', '########', '########', '########', ' ###### '],
};
const DIRT: Record<string, string[]> = {
  bottom: ['........', '........', '........', '........', '........', '11111111', '11111111', '11111111'],
  center: ['........', '........', '..1111..', '.111111.', '.111111.', '..1111..', '........', '........'],
  stripes: ['1.1.1.1.', '1.1.1.1.', '1.1.1.1.', '........', '........', '.1.1.1.1', '.1.1.1.1', '.1.1.1.1'],
  heavy: ['........', '........', '11111111', '12222221', '12222221', '11111111', '........', '........'],
  frame: ['11111111', '1......1', '1......1', '1..22..1', '1..22..1', '1......1', '1......1', '11111111'],
  allTwo: ['........', '22222222', '22222222', '11111111', '11111111', '22222222', '22222222', '........'],
};

const countDirt = (d: string[], mask: string[]) =>
  d.reduce((s, row, y) => s + [...row].reduce((t, c, x) => t + (mask[y][x] !== ' ' ? (c === '2' ? 2 : c === '1' ? 1 : 0) : 0), 0), 0);

type Spec = [moves: number, colors: number, goals: Goal[], mask?: string, dirt?: string, treasures?: number, title?: string];

const c = (color: number, n: number): Goal => ({ kind: 'collect', color, n });
const t = (n: number): Goal => ({ kind: 'treasure', n });
const s = (n: number): Goal => ({ kind: 'score', n });
const D = 'DIRT' as const;

// colours: 0 tennis ball, 1 biscuit, 2 paw, 3 squeaky, 4 collar, 5 bone
const SPECS: (Spec | [number, number, (Goal | typeof D)[], string?, string?, number?, string?])[] = [
  // Enchanted Meadows
  [20, 4, [c(0, 12)], 'full', undefined, 0, 'First fetch'],
  [20, 4, [c(1, 14), c(2, 14)], 'full'],
  [22, 4, [s(3000), c(3, 16)], 'corners'],
  [22, 5, [c(0, 18), c(4, 18)], 'full'],
  [24, 5, [c(2, 22), c(1, 22)], 'heart', undefined, 0, 'Puppy love'],
  [25, 5, [c(0, 20), c(3, 20), c(4, 20)], 'diamond', undefined, 0, 'Meadow party'],
  // Friendship Forest
  [22, 5, [D], 'full', 'bottom', 0, 'Dig, dig, dig'],
  [24, 5, [D, c(1, 15)], 'corners', 'center'],
  [24, 5, [D], 'full', 'stripes'],
  [26, 5, [D, c(2, 20)], 'ring', 'bottom'],
  [26, 5, [D, c(0, 18), c(3, 18)], 'full', 'heavy'],
  [28, 5, [D, s(9000)], 'paw', 'frame', 0, 'Hazel’s riddle'],
  // Blossom Gardens
  [22, 5, [t(2)], 'full', undefined, 2, 'Hidden chests'],
  [24, 5, [t(3), c(4, 16)], 'heart', undefined, 3],
  [25, 5, [t(2), D], 'full', 'bottom', 2],
  [26, 5, [t(3), c(2, 20)], 'hourglass', undefined, 3],
  [26, 5, [D, c(1, 22), c(5 % 5, 22)], 'diamond', 'center'],
  [28, 5, [t(4), D], 'corners', 'stripes', 4, 'Mabel’s maze'],
  // Adventure Bay
  [24, 6, [c(5, 20), c(3, 20)], 'full', undefined, 0, 'Bone voyage'],
  [26, 6, [D, t(2)], 'full', 'heavy', 2],
  [26, 6, [c(0, 24), c(1, 24), c(5, 24)], 'ring'],
  [27, 6, [D, c(4, 22)], 'paw', 'allTwo'],
  [28, 6, [t(4), c(2, 22)], 'diamond', undefined, 4],
  [30, 6, [D, t(3), s(14000)], 'full', 'frame', 3, 'Shipwreck gold'],
  // Snowy Peaks
  [26, 6, [D], 'full', 'allTwo', 0, 'First snow'],
  [26, 6, [t(4), c(3, 26)], 'hourglass', undefined, 4],
  [28, 6, [D, c(5, 26), c(1, 26)], 'corners', 'heavy'],
  [28, 6, [t(5), D], 'heart', 'bottom', 5],
  [30, 6, [D, c(0, 30), c(2, 30), c(4, 30)], 'diamond', 'allTwo'],
  [32, 6, [D, t(4), s(20000)], 'paw', 'frame', 4, 'The summit'],
];

export const LEVELS: LevelDef[] = SPECS.map((sp, i) => {
  const [moves, colors, goals, maskId = 'full', dirtId, treasures = 0, title] = sp;
  const mask = MASKS[maskId];
  const dirt = dirtId ? DIRT[dirtId] : undefined;
  return {
    id: `L${i + 1}`,
    num: i + 1,
    chapter: Math.floor(i / 6),
    moves,
    colors,
    mask,
    dirt,
    treasures,
    title,
    goals: goals.map((g) => (g === D ? { kind: 'dirt', n: countDirt(dirt!, mask) } : g)) as Goal[],
  };
});

/** Treasure-map bonus trails, revealed by real walks and explorations. */
export function mapLevel(n: number): LevelDef {
  const chapter = n % CHAPTERS.length;
  const variants: Omit<LevelDef, 'id' | 'num' | 'chapter'>[] = [
    { moves: 18, colors: 5, goals: [t(2)], treasures: 2, mask: MASKS.diamond },
    { moves: 20, colors: 5, goals: [{ kind: 'dirt', n: countDirt(DIRT.center, MASKS.full) }], dirt: DIRT.center, mask: MASKS.full },
    { moves: 18, colors: 5, goals: [s(6000), c(1, 18)], mask: MASKS.heart },
  ];
  return { id: `map-${n}`, num: n + 1, chapter, map: true, title: 'Treasure Trail', ...variants[n % variants.length] };
}

export function starsFor(movesLeft: number, total: number) {
  const f = movesLeft / total;
  return f >= 0.3 ? 3 : f >= 0.12 ? 2 : 1;
}

export const PIECE_NAMES = ['Tennis balls', 'Dog biscuits', 'Paw prints', 'Squeaky toys', 'Collars', 'Rubber bones'];
