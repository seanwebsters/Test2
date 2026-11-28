import type { Career, WorldId } from './types';
import { CAREERS_A } from './careersA';
import { CAREERS_B } from './careersB';
import { CAREERS_C } from './careersC';
import { CAREERS_D } from './careersD';

const ALL: Career[] = [...CAREERS_A, ...CAREERS_B, ...CAREERS_C, ...CAREERS_D];
const IDS = new Set(ALL.map((c) => c.id));

// Drop any dangling related links so content authors can't break the UI.
export const CAREERS: Career[] = ALL.map((c) => ({ ...c, related: c.related.filter((r) => IDS.has(r) && r !== c.id) }));
export const CAREER_BY_ID: Record<string, Career> = Object.fromEntries(CAREERS.map((c) => [c.id, c]));
export const careersInWorld = (w: WorldId) => CAREERS.filter((c) => c.world === w);

export const ROUTE_LABEL: Record<Career['routes'][number]['type'], string> = {
  university: 'University', apprenticeship: 'Apprenticeship', 'self-taught': 'Self-taught',
  entrepreneur: 'Start your own', college: 'College & courses', 'on-the-job': 'Learn on the job',
};

export const SALARY_NOTE =
  'Illustrative prototype figures, rounded from typical UK ranges. Not verified current data — always check up-to-date sources such as the National Careers Service before deciding.';
