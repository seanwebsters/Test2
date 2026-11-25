import { ItemKey } from './items';
import { ScriptId, STEP } from './story';

export type RestoreId = 'clock' | 'fountain' | 'garden' | 'bookshop' | 'bell';

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
  place: 'square' | 'garden' | 'bookshop' | 'tower';
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
];

export function questForStep(step: number): Quest | undefined {
  return QUESTS.find((q) => q.step === step);
}
