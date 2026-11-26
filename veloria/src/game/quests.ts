import { ItemKey } from './items';
import { ScriptId, STEP } from './story';

export type RestoreId = 'clock' | 'fountain' | 'garden' | 'bookshop' | 'bell' | 'lanterns' | 'festival';

export interface Quest {
  id: string;
  step: number;
  title: string;
  ask: string;
  requires: ItemKey[];
  reward: { dew: number; energy: number };
  restores?: RestoreId;
  /** script played once the order is delivered */
  after: ScriptId;
  /** where in the world the restoration happens (camera focus) */
  place: 'square' | 'garden' | 'bookshop' | 'tower' | 'canal';
}

export const QUESTS: Quest[] = [
  {
    id: 'q1',
    step: STEP.q1,
    title: 'A Small Spark',
    ask: 'Gather the lights that followed you in, and grow something new: a Rosebud.',
    requires: ['bloom:3'],
    reward: { dew: 10, energy: 15 },
    after: 'q1_done',
    place: 'square',
  },
  {
    id: 'q2',
    step: STEP.q2,
    title: 'The Silent Fountain',
    ask: 'The fountain was the first thing to stop. Bring a Velorian Rose and a Brass Gear to wake it.',
    requires: ['bloom:4', 'clock:3'],
    reward: { dew: 20, energy: 20 },
    restores: 'fountain',
    after: 'q2_done',
    place: 'square',
  },
  {
    id: 'q3',
    step: STEP.q3,
    title: 'The Sleeping Garden',
    ask: "His mother's garden is closed tight. A Moonbloom and a Crystal Cluster might coax it open.",
    requires: ['bloom:5', 'crystal:3'],
    reward: { dew: 30, energy: 20 },
    restores: 'garden',
    after: 'q3_done',
    place: 'garden',
  },
  {
    id: 'q4',
    step: STEP.q4,
    title: 'Pages Left Unread',
    ask: 'Someone locked Hollow & Quill after the city stopped. Bring a Journal and a Brass Key.',
    requires: ['ink:4', 'key:2'],
    reward: { dew: 30, energy: 25 },
    restores: 'bookshop',
    after: 'q4_done',
    place: 'bookshop',
  },
  {
    id: 'q5',
    step: STEP.q5,
    title: 'The Stopped Hour',
    ask: 'The great bell has not rung in a century. A Pocket Watch and an Hourglass, for the tower.',
    requires: ['clock:5', 'time:3'],
    reward: { dew: 50, energy: 30 },
    restores: 'bell',
    after: 'q5_done',
    place: 'tower',
  },
  {
    id: 'q6',
    step: STEP.q6,
    title: 'Lanterns on the Water',
    ask: 'Cassian needs a Silver Key for the lamp lockers and a Moonstone for the flames, so Lucien can find his way down.',
    requires: ['key:3', 'crystal:4'],
    reward: { dew: 50, energy: 30 },
    restores: 'lanterns',
    after: 'q6_done',
    place: 'canal',
  },
  {
    id: 'q7',
    step: STEP.q7,
    title: 'A Night Without End',
    ask: 'Finish the Lantern Festival the city never had: a Moonbloom for the square and a Shard of Time to keep the night from ending.',
    requires: ['bloom:5', 'time:4'],
    reward: { dew: 60, energy: 40 },
    restores: 'festival',
    after: 'q7_done',
    place: 'square',
  },
];

export function questForStep(step: number): Quest | undefined {
  return QUESTS.find((q) => q.step === step);
}
