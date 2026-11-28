// Core data architecture for DIRECTION.
// Everything content-shaped (worlds, careers, lessons, simulations, episodes)
// is plain data keyed by id so it can be extended — or later served from a CMS
// or partner API — without touching UI code.

export const TRAITS = [
  'creative', 'analytical', 'caring', 'leading', 'hands', 'tech',
  'nature', 'active', 'risk', 'wealth', 'impact', 'explore',
] as const;
export type Trait = (typeof TRAITS)[number];
export type TraitVector = Partial<Record<Trait, number>>;

export const TRAIT_LABEL: Record<Trait, string> = {
  creative: 'Creative', analytical: 'Analytical', caring: 'Caring', leading: 'Leading',
  hands: 'Hands-on', tech: 'Techy', nature: 'Nature-loving', active: 'Active',
  risk: 'Bold', wealth: 'Ambitious', impact: 'Purpose-driven', explore: 'Curious',
};

export const SKILLS = [
  'creativity', 'communication', 'problem', 'leadership', 'empathy',
  'digital', 'analysis', 'craft', 'resilience', 'curiosity', 'storytelling', 'commercial',
] as const;
export type SkillId = (typeof SKILLS)[number];

export type WorldId =
  | 'creative' | 'tech' | 'business' | 'film' | 'science' | 'health'
  | 'law' | 'engineering' | 'nature' | 'sport' | 'travel' | 'trades';

export interface World {
  id: WorldId;
  name: string;
  short: string;
  tagline: string;
  glyph: GlyphName;
  palette: { sky: string; sky2: string; land: string; land2: string; accent: string; deep: string; soft: string };
  guide: { name: string; species: string; ears: 'cat' | 'bunny' | 'antenna' | 'leaf' | 'round' | 'horn'; hat?: HatId; line: string };
  traits: TraitVector;
}

export interface SalaryBand { entry: [number, number]; experienced: [number, number]; senior?: [number, number] }

export interface Route {
  type: 'university' | 'apprenticeship' | 'self-taught' | 'entrepreneur' | 'college' | 'on-the-job';
  title: string;
  detail: string;
  time: string;
}

export interface Career {
  id: string;
  title: string;
  world: WorldId;
  glyph: GlyphName;
  oneLiner: string;
  involves: string;
  day: [string, string][];
  salary: SalaryBand;
  /** null for illustrative prototype data. Set a source + date once verified. */
  salaryVerified: null | { source: string; date: string };
  qualifications: string;
  routes: Route[];
  apprenticeships: string;
  skills: string[];
  lifestyle: { hours: string; setting: string; flexibility: 'Low' | 'Medium' | 'High'; travel: 'Rare' | 'Some' | 'Lots' };
  related: string[];
  sim?: string;
  traits: TraitVector;
  lesserKnown?: boolean;
  plus?: boolean;
}

export type HatId =
  | 'none' | 'explorer' | 'beret' | 'hardhat' | 'headphones' | 'goggles'
  | 'crown' | 'cap' | 'chef' | 'flower' | 'wizard' | 'headband' | 'grad' | 'party';

export type GlyphName =
  | 'palette' | 'gamepad' | 'ball' | 'friends' | 'tree' | 'wrench' | 'flask' | 'book'
  | 'chef' | 'music' | 'rocket' | 'trophy' | 'heart' | 'bulb' | 'megaphone' | 'hammer'
  | 'compass' | 'crown' | 'handshake' | 'brain' | 'chat' | 'clipboard' | 'eye' | 'shield'
  | 'easel' | 'office' | 'mountain' | 'microscope' | 'plane' | 'laptop' | 'spotlight' | 'cross'
  | 'beach' | 'city' | 'house' | 'globe' | 'coin' | 'coins' | 'piggy' | 'dice' | 'ladder'
  | 'parachute' | 'pencil' | 'code' | 'calculator' | 'mic' | 'gear' | 'camera' | 'film'
  | 'scales' | 'leaf' | 'dumbbell' | 'suitcase' | 'chart' | 'target' | 'star' | 'robot'
  | 'phone' | 'map' | 'bridge' | 'paw' | 'wave' | 'stethoscope' | 'cup' | 'shirt'
  | 'sun' | 'moon' | 'drop' | 'bolt' | 'key' | 'flag' | 'ticket' | 'tent' | 'check' | 'gift';
