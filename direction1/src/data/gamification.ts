import type { GlyphName, HatId, SkillId } from './types';

export const SKILL_INFO: Record<SkillId, { label: string; glyph: GlyphName; color: string }> = {
  creativity: { label: 'Creativity', glyph: 'palette', color: '#FF4F8B' },
  communication: { label: 'Communication', glyph: 'chat', color: '#1CA0F2' },
  problem: { label: 'Problem solving', glyph: 'brain', color: '#7C3AED' },
  leadership: { label: 'Leadership', glyph: 'flag', color: '#F08A00' },
  empathy: { label: 'Empathy', glyph: 'heart', color: '#FF5A45' },
  digital: { label: 'Digital', glyph: 'laptop', color: '#2F62D9' },
  analysis: { label: 'Analysis', glyph: 'chart', color: '#0FA38A' },
  craft: { label: 'Craft', glyph: 'hammer', color: '#C2621A' },
  resilience: { label: 'Resilience', glyph: 'shield', color: '#5620B5' },
  curiosity: { label: 'Curiosity', glyph: 'compass', color: '#5FAE0E' },
  storytelling: { label: 'Storytelling', glyph: 'book', color: '#B0245C' },
  commercial: { label: 'Commercial sense', glyph: 'coins', color: '#E0A200' },
};

export type QuestKind = 'sim' | 'xp' | 'world' | 'episode' | 'scout' | 'save' | 'lesson' | 'library';
export interface QuestDef { id: string; kind: QuestKind; label: string; target: number; reward: number; glyph: GlyphName }

export const QUEST_POOL: QuestDef[] = [
  { id: 'q-sim', kind: 'sim', label: 'Play a career simulation', target: 1, reward: 20, glyph: 'gamepad' },
  { id: 'q-xp', kind: 'xp', label: 'Earn 80 XP', target: 80, reward: 15, glyph: 'bolt' },
  { id: 'q-lesson', kind: 'lesson', label: 'Finish 2 quick lessons', target: 2, reward: 15, glyph: 'book' },
  { id: 'q-world', kind: 'world', label: 'Try something in a new world', target: 1, reward: 20, glyph: 'compass' },
  { id: 'q-episode', kind: 'episode', label: 'Listen to a Day in the Life', target: 1, reward: 15, glyph: 'mic' },
  { id: 'q-scout', kind: 'scout', label: 'Ask Scout a question', target: 1, reward: 10, glyph: 'chat' },
  { id: 'q-save', kind: 'save', label: 'Save a career you’re curious about', target: 1, reward: 10, glyph: 'star' },
  { id: 'q-library', kind: 'library', label: 'Read 3 career profiles', target: 3, reward: 15, glyph: 'eye' },
];

export interface AchievementDef { id: string; title: string; desc: string; glyph: GlyphName; color: string; reward?: HatId }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'hello', title: 'Hello, Scout', desc: 'Finished onboarding', glyph: 'compass', color: '#7C3AED' },
  { id: 'first-sim', title: 'First Shift', desc: 'Completed your first simulation', glyph: 'gamepad', color: '#1CA0F2', reward: 'cap' },
  { id: 'three-worlds', title: 'World Hopper', desc: 'Tried activities in 3 worlds', glyph: 'globe', color: '#0FA38A', reward: 'explorer' },
  { id: 'six-worlds', title: 'Globetrotter', desc: 'Tried activities in 6 worlds', glyph: 'plane', color: '#0E9AA8', reward: 'flower' },
  { id: 'five-sims', title: 'Job Hopper', desc: 'Completed 5 simulations', glyph: 'suitcase', color: '#F08A00', reward: 'headphones' },
  { id: 'all-core', title: 'Career Sampler', desc: 'Played all 8 featured simulations', glyph: 'trophy', color: '#E0A200', reward: 'crown' },
  { id: 'streak-3', title: 'Warming Up', desc: '3-day streak', glyph: 'bolt', color: '#FF7A1A' },
  { id: 'streak-7', title: 'On a Roll', desc: '7-day streak', glyph: 'sun', color: '#FF5A45', reward: 'party' },
  { id: 'saver', title: 'Collector', desc: 'Saved 3 careers', glyph: 'star', color: '#FFC21A' },
  { id: 'listener', title: 'All Ears', desc: 'Finished a Day in the Life episode', glyph: 'mic', color: '#8C4DFF', reward: 'beret' },
  { id: 'chatty', title: 'Deep Thinker', desc: 'Had 5 chats with Scout', glyph: 'chat', color: '#4FB8FF', reward: 'wizard' },
  { id: 'honest', title: 'Honest Explorer', desc: 'Told us you didn’t enjoy something', glyph: 'heart', color: '#FF4F8B' },
  { id: 'level-5', title: 'Level 5', desc: 'Reached level 5', glyph: 'ladder', color: '#5FAE0E', reward: 'grad' },
  { id: 'roadmap', title: 'Pathfinder', desc: 'Set your first goal', glyph: 'map', color: '#2F62D9' },
  { id: 'lessons-5', title: 'Quick Learner', desc: 'Finished 5 quick lessons', glyph: 'book', color: '#B0245C', reward: 'goggles' },
];

export interface OutfitDef { id: HatId; label: string; price: number; unlock?: string }
export const OUTFITS: OutfitDef[] = [
  { id: 'explorer', label: 'Explorer hat', price: 0 },
  { id: 'none', label: 'No hat', price: 0 },
  { id: 'cap', label: 'Snapback', price: 60 },
  { id: 'beret', label: 'Artist beret', price: 80 },
  { id: 'headphones', label: 'Studio headphones', price: 100 },
  { id: 'hardhat', label: 'Hard hat', price: 80 },
  { id: 'goggles', label: 'Lab goggles', price: 90 },
  { id: 'chef', label: 'Chef’s toque', price: 90 },
  { id: 'flower', label: 'Flower crown', price: 120 },
  { id: 'headband', label: 'Sweatband', price: 60 },
  { id: 'party', label: 'Party hat', price: 120 },
  { id: 'grad', label: 'Graduation cap', price: 150 },
  { id: 'wizard', label: 'Wizard hat', price: 200 },
  { id: 'crown', label: 'Golden crown', price: 300 },
];

export const levelFromXp = (xp: number) => {
  // Gentle curve: each level needs 60 more XP than the last, starting at 120.
  let lvl = 1, need = 120, acc = 0;
  while (xp >= acc + need) { acc += need; lvl++; need += 60; }
  return { level: lvl, into: xp - acc, need };
};
