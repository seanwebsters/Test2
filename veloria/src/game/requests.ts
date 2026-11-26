import { ChainId, ItemKey, key } from './items';
import { STEP } from './story';

/** Small side wishes Lucien makes while you play: always something to merge towards. */
export interface Request {
  id: number;
  items: ItemKey[];
  line: string;
  reward: { dew: number; energy: number; aff: number };
}

const LINES: Record<ChainId, string[]> = {
  bloom: ['Something green for my windowsill?', 'Mother would have wanted these in the garden.', 'A flower. Any flower. I have missed colour.'],
  clock: ['The tower is hungry for parts.', 'I could fix the bakery clock with these.', 'Spare clockwork? I am, apparently, a clockmaker now.'],
  crystal: ['The lamps burn brighter with a crystal in them.', 'Something that catches the light, for the stair.', 'Moonlight keeps better in a crystal.'],
  key: ['There is a door on Lantern Row I have never opened.', 'A key. Humour me.', 'Every lock in this city has a story. I want one.'],
  ink: ['I have read the same eleven books. Please.', 'Paper. I want to write something down before I forget it.', 'Bring me words, and I will read them to you.'],
  time: ['A little time, if you can spare it.', 'Sand that falls. Imagine that.', 'For the hourglass in the tower. It has been empty for years.'],
};

let seq = Date.now() % 100000;

export function makeRequest(step: number, rnd = Math.random): Request {
  const chains: ChainId[] = ['bloom', 'clock', 'crystal'];
  if (step >= STEP.q3) chains.push('key', 'time');
  if (step >= STEP.wake2) chains.push('ink');
  const n = rnd() < 0.55 ? 1 : 2;
  const items: ItemKey[] = [];
  let worth = 0;
  for (let i = 0; i < n; i++) {
    const c = chains[Math.floor(rnd() * chains.length)];
    const lvl = 1 + Math.floor(rnd() * (step >= STEP.q3 ? 3 : 2)) + (n === 1 ? 1 : 0);
    items.push(key(c, lvl));
    worth += Math.pow(2, lvl - 1);
  }
  const first = items[0].split(':')[0] as ChainId;
  const lines = LINES[first];
  return {
    id: seq++,
    items,
    line: lines[Math.floor(rnd() * lines.length)],
    reward: { dew: 4 + worth * 2, energy: 3 + worth, aff: 1 + Math.floor(worth / 3) },
  };
}
