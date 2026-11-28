import type { GlyphName, TraitVector, WorldId } from './types';

export interface QOption { id: string; label: string; sub?: string; glyph: GlyphName; traits?: TraitVector; worlds?: Partial<Record<WorldId, number>> }
export interface Question {
  id: string;
  kind: 'single' | 'multi' | 'name' | 'age';
  scout: string;
  title: string;
  hint?: string;
  max?: number;
  options?: QOption[];
}

export const QUESTIONS: Question[] = [
  { id: 'name', kind: 'name', scout: 'First things first…', title: 'What should I call you?' },
  { id: 'age', kind: 'age', scout: 'Nice to meet you, {name}!', title: 'How old are you?' },
  {
    id: 'stage', kind: 'single', scout: 'No wrong answers — everyone’s timeline is different.', title: 'Where are you right now?',
    options: [
      { id: 'school', label: 'At school', sub: 'GCSEs or similar', glyph: 'book' },
      { id: 'sixth', label: 'Sixth form or college', sub: 'A-levels, T-levels, BTECs', glyph: 'pencil' },
      { id: 'uni', label: 'At university', glyph: 'flag' },
      { id: 'appr', label: 'On an apprenticeship', glyph: 'wrench' },
      { id: 'work', label: 'Working', glyph: 'suitcase' },
      { id: 'figuring', label: 'Taking time out', sub: 'Figuring things out', glyph: 'compass' },
    ],
  },
  {
    id: 'saturday', kind: 'multi', max: 3, scout: 'Let’s start with the fun stuff.', title: 'You’ve got a completely free Saturday. What sounds best?', hint: 'Pick up to 3',
    options: [
      { id: 'make', label: 'Making something creative', glyph: 'palette', traits: { creative: 2 }, worlds: { creative: 2 } },
      { id: 'games', label: 'Gaming or tinkering with tech', glyph: 'gamepad', traits: { tech: 2 }, worlds: { tech: 2 } },
      { id: 'sport', label: 'Playing sport or training', glyph: 'ball', traits: { active: 2 }, worlds: { sport: 2 } },
      { id: 'friends', label: 'Hanging out with friends', glyph: 'friends', traits: { caring: 1, leading: 1 } },
      { id: 'outdoors', label: 'Getting outdoors', glyph: 'mountain', traits: { nature: 2, active: 1 }, worlds: { nature: 2 } },
      { id: 'fix', label: 'Building or fixing things', glyph: 'hammer', traits: { hands: 2 }, worlds: { trades: 2, engineering: 1 } },
      { id: 'videos', label: 'Falling down a science video hole', glyph: 'flask', traits: { analytical: 2, explore: 1 }, worlds: { science: 2 } },
      { id: 'films', label: 'Watching films back-to-back', glyph: 'film', traits: { creative: 1 }, worlds: { film: 2 } },
      { id: 'hustle', label: 'Working on a side hustle', glyph: 'rocket', traits: { risk: 1, wealth: 1, leading: 1 }, worlds: { business: 2 } },
      { id: 'cook', label: 'Cooking something amazing', glyph: 'chef', traits: { creative: 1, hands: 1 }, worlds: { travel: 2 } },
    ],
  },
  {
    id: 'verb', kind: 'single', scout: 'Go with your gut on this one.', title: 'Would you rather…',
    options: [
      { id: 'build', label: 'Build something', glyph: 'hammer', traits: { hands: 2, creative: 1 }, worlds: { engineering: 1, trades: 1 } },
      { id: 'help', label: 'Help someone', glyph: 'heart', traits: { caring: 3 }, worlds: { health: 2 } },
      { id: 'discover', label: 'Discover something', glyph: 'microscope', traits: { analytical: 2, explore: 2 }, worlds: { science: 2 } },
      { id: 'lead', label: 'Lead something', glyph: 'flag', traits: { leading: 3 }, worlds: { business: 1, law: 1 } },
    ],
  },
  {
    id: 'proud', kind: 'single', scout: 'Imagine it’s five years from now…', title: 'Which of these would make you feel most proud?',
    options: [
      { id: 'made', label: 'Millions of people used something I made', glyph: 'phone', traits: { tech: 1, creative: 1, wealth: 1 }, worlds: { tech: 2 } },
      { id: 'saved', label: 'I helped save someone’s life', glyph: 'cross', traits: { caring: 2, impact: 2 }, worlds: { health: 2 } },
      { id: 'boss', label: 'I built my own business', glyph: 'crown', traits: { risk: 2, leading: 1, wealth: 2 }, worlds: { business: 2 } },
      { id: 'award', label: 'My work won an award', glyph: 'trophy', traits: { creative: 2 }, worlds: { creative: 1, film: 1 } },
      { id: 'planet', label: 'I protected part of the planet', glyph: 'globe', traits: { nature: 2, impact: 2 }, worlds: { nature: 2 } },
      { id: 'justice', label: 'I fought for something unfair to change', glyph: 'scales', traits: { impact: 2, leading: 1 }, worlds: { law: 2 } },
    ],
  },
  {
    id: 'friends', kind: 'multi', max: 2, scout: 'Your friends probably know your strengths better than you do.', title: 'What do friends come to you for?', hint: 'Pick up to 2',
    options: [
      { id: 'ideas', label: 'Ideas', glyph: 'bulb', traits: { creative: 2 } },
      { id: 'advice', label: 'Advice & a good listen', glyph: 'chat', traits: { caring: 2 } },
      { id: 'tech', label: 'Fixing their tech', glyph: 'laptop', traits: { tech: 2 } },
      { id: 'plans', label: 'Making plans happen', glyph: 'clipboard', traits: { leading: 2 } },
      { id: 'logic', label: 'Working out tricky problems', glyph: 'brain', traits: { analytical: 2 } },
      { id: 'hype', label: 'Hype and motivation', glyph: 'megaphone', traits: { leading: 1, active: 1 } },
    ],
  },
  {
    id: 'place', kind: 'single', scout: 'Picture a Tuesday at work…', title: 'Where would you love to spend your working day?',
    options: [
      { id: 'studio', label: 'A buzzing creative studio', glyph: 'easel', traits: { creative: 1 }, worlds: { creative: 1, film: 1 } },
      { id: 'office', label: 'A sleek city office', glyph: 'office', traits: { wealth: 1 }, worlds: { business: 1, law: 1 } },
      { id: 'outside', label: 'Outdoors, whatever the weather', glyph: 'tree', traits: { nature: 2, active: 1 }, worlds: { nature: 1, sport: 1 } },
      { id: 'lab', label: 'A lab or workshop', glyph: 'microscope', traits: { analytical: 1, hands: 1 }, worlds: { science: 1, engineering: 1 } },
      { id: 'move', label: 'On the move, somewhere new', glyph: 'plane', traits: { explore: 2 }, worlds: { travel: 2 } },
      { id: 'home', label: 'From home, my own hours', glyph: 'house', traits: { tech: 1, risk: 1 }, worlds: { tech: 1 } },
      { id: 'people', label: 'Out with people, helping', glyph: 'handshake', traits: { caring: 2 }, worlds: { health: 1, travel: 1 } },
    ],
  },
  {
    id: 'dream', kind: 'single', scout: 'Dream big. Nobody’s judging.', title: 'What does your dream life look like?',
    options: [
      { id: 'laptop', label: 'Laptop on a beach, working from anywhere', glyph: 'beach', traits: { explore: 2, tech: 1, risk: 1 } },
      { id: 'city', label: 'A flat in the city, life at full speed', glyph: 'city', traits: { wealth: 2, leading: 1 } },
      { id: 'cosy', label: 'A cosy home, people I love, balance', glyph: 'house', traits: { caring: 1 } },
      { id: 'adventure', label: 'Constant adventure', glyph: 'mountain', traits: { explore: 2, active: 2 } },
      { id: 'mission', label: 'Known for making a difference', glyph: 'heart', traits: { impact: 3 } },
    ],
  },
  {
    id: 'money', kind: 'single', scout: 'Money talk — totally valid.', title: 'How important is a big salary to you?',
    options: [
      { id: 'top', label: 'Very — I want to earn serious money', glyph: 'coins', traits: { wealth: 3 } },
      { id: 'comfy', label: 'Enough to be comfortable', glyph: 'piggy', traits: { wealth: 1 } },
      { id: 'meaning', label: 'Meaning matters more than money', glyph: 'heart', traits: { impact: 2 } },
      { id: 'unsure', label: 'Honestly not sure yet', glyph: 'compass', traits: {} },
    ],
  },
  {
    id: 'risk', kind: 'single', scout: 'There’s no right answer here.', title: 'Safe, steady path or big leap?',
    options: [
      { id: 'safe', label: 'Safe and steady, please', glyph: 'shield', traits: { risk: -1 } },
      { id: 'mostly', label: 'Mostly safe, a few risks', glyph: 'ladder', traits: { risk: 1 } },
      { id: 'leap', label: 'Big leap — fortune favours the bold', glyph: 'parachute', traits: { risk: 3 } },
      { id: 'dice', label: 'Depends on the day', glyph: 'dice', traits: { risk: 1, explore: 1 } },
    ],
  },
  {
    id: 'skills', kind: 'multi', max: 4, scout: 'You know more than you think.', title: 'What can you already do?', hint: 'Pick any that apply',
    options: [
      { id: 'draw', label: 'Draw or design', glyph: 'pencil', traits: { creative: 2 } },
      { id: 'code', label: 'Code a bit', glyph: 'code', traits: { tech: 2 } },
      { id: 'write', label: 'Write well', glyph: 'book', traits: { creative: 1, analytical: 1 } },
      { id: 'maths', label: 'Do maths in my head', glyph: 'calculator', traits: { analytical: 2 } },
      { id: 'talk', label: 'Talk to anyone', glyph: 'chat', traits: { caring: 1, leading: 1 } },
      { id: 'organise', label: 'Organise events', glyph: 'clipboard', traits: { leading: 2 } },
      { id: 'edit', label: 'Edit videos', glyph: 'camera', traits: { creative: 1, tech: 1 }, worlds: { film: 1 } },
      { id: 'repair', label: 'Fix things', glyph: 'wrench', traits: { hands: 2 } },
      { id: 'lang', label: 'Speak another language', glyph: 'globe', traits: { explore: 2 } },
      { id: 'care', label: 'Look after people', glyph: 'heart', traits: { caring: 2 } },
    ],
  },
  {
    id: 'curious', kind: 'multi', max: 4, scout: 'Last one! Which worlds make you curious?', title: 'Which industries are you curious about?', hint: 'Pick up to 4 — curiosity counts',
    options: [],
  },
];
