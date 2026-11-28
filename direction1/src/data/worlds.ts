import type { World, WorldId } from './types';

export const WORLDS: World[] = [
  {
    id: 'creative', name: 'Creative & Design', short: 'Creative', tagline: 'Make ideas you can see, hold and feel.',
    glyph: 'palette',
    palette: { sky: '#FFE3F1', sky2: '#FFF4E0', land: '#FF8FB8', land2: '#FFB86B', accent: '#FF4F8B', deep: '#B0245C', soft: '#FFF0F6' },
    guide: { name: 'Dot', species: 'paint-splodge fox', ears: 'cat', hat: 'beret', line: 'Every great idea starts as a scribble.' },
    traits: { creative: 3, explore: 1 },
  },
  {
    id: 'tech', name: 'Technology & AI', short: 'Tech & AI', tagline: 'Build the tools everyone uses tomorrow.',
    glyph: 'robot',
    palette: { sky: '#DDF3FF', sky2: '#EDEBFF', land: '#4FB8FF', land2: '#7C8CFF', accent: '#1C7FF2', deep: '#123F8C', soft: '#EEF8FF' },
    guide: { name: 'Bit', species: 'pocket robot', ears: 'antenna', line: 'Computers are just very fast, very literal friends.' },
    traits: { tech: 3, analytical: 2, creative: 1 },
  },
  {
    id: 'business', name: 'Business & Entrepreneurship', short: 'Business', tagline: 'Turn a spark into something people pay for.',
    glyph: 'rocket',
    palette: { sky: '#FFF4CC', sky2: '#FFE9D6', land: '#FFC21A', land2: '#FF8A3D', accent: '#F08A00', deep: '#8A4B00', soft: '#FFF9E6' },
    guide: { name: 'Penny', species: 'go-getter hamster', ears: 'round', hat: 'cap', line: 'Every business started as someone saying “what if?”' },
    traits: { leading: 2, risk: 2, wealth: 2 },
  },
  {
    id: 'film', name: 'Film & Entertainment', short: 'Film & TV', tagline: 'Tell stories that make a million people feel something.',
    glyph: 'film',
    palette: { sky: '#2B1F55', sky2: '#5B2A86', land: '#8C4DFF', land2: '#FF6FA8', accent: '#6D3BD6', deep: '#1A1238', soft: '#F3EEFF' },
    guide: { name: 'Reel', species: 'spotlight owl', ears: 'horn', hat: 'headphones', line: 'Lights, camera… you!' },
    traits: { creative: 2, explore: 1, risk: 1 },
  },
  {
    id: 'science', name: 'Science & Discovery', short: 'Science', tagline: 'Ask big questions. Find out what nobody knows yet.',
    glyph: 'microscope',
    palette: { sky: '#DFFBF4', sky2: '#E4ECFF', land: '#2EC4A6', land2: '#5B8CFF', accent: '#0FA38A', deep: '#0B5E57', soft: '#ECFDF8' },
    guide: { name: 'Quark', species: 'lab axolotl', ears: 'leaf', hat: 'goggles', line: 'Not knowing is the fun bit.' },
    traits: { analytical: 3, explore: 2 },
  },
  {
    id: 'health', name: 'Health & Wellbeing', short: 'Health', tagline: 'Help people feel better, every single day.',
    glyph: 'heart',
    palette: { sky: '#FFE8E8', sky2: '#E8FFF4', land: '#FF7A7A', land2: '#5ED3A0', accent: '#F0484E', deep: '#8C1F2B', soft: '#FFF2F2' },
    guide: { name: 'Patch', species: 'cuddly bear', ears: 'round', line: 'Kindness is a clinical skill.' },
    traits: { caring: 3, analytical: 1, impact: 2 },
  },
  {
    id: 'law', name: 'Law & Politics', short: 'Law', tagline: 'Argue for what’s right. Shape the rules.',
    glyph: 'scales',
    palette: { sky: '#E9E6FF', sky2: '#FFF1DC', land: '#5B4BD6', land2: '#C9A24A', accent: '#4433B8', deep: '#231A6B', soft: '#F2F0FF' },
    guide: { name: 'Judge Hoot', species: 'wise owl', ears: 'horn', line: 'Every detail matters. Every voice too.' },
    traits: { analytical: 2, leading: 2, impact: 2 },
  },
  {
    id: 'engineering', name: 'Engineering & Architecture', short: 'Engineering', tagline: 'Design the places and machines we live with.',
    glyph: 'bridge',
    palette: { sky: '#E3F0FF', sky2: '#FFF1D6', land: '#3E7BFA', land2: '#FFB020', accent: '#2F62D9', deep: '#173A80', soft: '#EEF4FF' },
    guide: { name: 'Girder', species: 'builder beaver', ears: 'round', hat: 'hardhat', line: 'Measure twice, build once.' },
    traits: { analytical: 2, hands: 2, creative: 1, tech: 1 },
  },
  {
    id: 'nature', name: 'Nature & Environment', short: 'Nature', tagline: 'Protect the planet. Work where the wild things are.',
    glyph: 'leaf',
    palette: { sky: '#E6FADD', sky2: '#DFF4FF', land: '#5FBF3B', land2: '#2FA37A', accent: '#3E9B1E', deep: '#1E5A12', soft: '#F0FCEB' },
    guide: { name: 'Fern', species: 'moss hedgehog', ears: 'leaf', hat: 'explorer', line: 'The planet is the biggest client there is.' },
    traits: { nature: 3, impact: 2, active: 1 },
  },
  {
    id: 'sport', name: 'Sport & Fitness', short: 'Sport', tagline: 'Keep people moving, competing and winning.',
    glyph: 'trophy',
    palette: { sky: '#FFF0DB', sky2: '#E2F6FF', land: '#FF7A1A', land2: '#22B8CF', accent: '#E85D00', deep: '#7A2E00', soft: '#FFF6EC' },
    guide: { name: 'Dash', species: 'sprinting hare', ears: 'bunny', hat: 'headband', line: 'Progress beats perfect.' },
    traits: { active: 3, leading: 1, caring: 1 },
  },
  {
    id: 'travel', name: 'Travel & Hospitality', short: 'Travel', tagline: 'Make the world feel welcoming, wherever you are.',
    glyph: 'plane',
    palette: { sky: '#DDF7FF', sky2: '#FFF0E0', land: '#1FC2C2', land2: '#FF9E6B', accent: '#0E9AA8', deep: '#0B5260', soft: '#ECFCFF' },
    guide: { name: 'Jet', species: 'globe-trotting seal', ears: 'round', hat: 'cap', line: 'Home is wherever the good people are.' },
    traits: { explore: 3, caring: 1, active: 1 },
  },
  {
    id: 'trades', name: 'Skilled Trades', short: 'Trades', tagline: 'Real skills, real results, real independence.',
    glyph: 'wrench',
    palette: { sky: '#FFF3E0', sky2: '#E9F1FF', land: '#E0832B', land2: '#4D7FBF', accent: '#C2621A', deep: '#6B3207', soft: '#FFF7EE' },
    guide: { name: 'Bolt', species: 'toolbelt badger', ears: 'round', hat: 'hardhat', line: 'If you can fix it, you’ll always be needed.' },
    traits: { hands: 3, wealth: 1, risk: 1 },
  },
];

export const WORLD_BY_ID = Object.fromEntries(WORLDS.map((w) => [w.id, w])) as Record<WorldId, World>;
