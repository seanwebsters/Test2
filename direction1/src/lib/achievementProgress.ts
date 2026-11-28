import { ACHIEVEMENTS } from '../data/gamification';
import { levelFromXp } from '../data/gamification';
import { FEATURED_SIMS } from '../sims';
import type { useGame } from '../store/game';

type S = ReturnType<typeof useGame.getState>;

export function achievementProgress(id: string, s: S): [number, number] {
  const worlds = new Set(s.activities.map((a) => a.world)).size;
  const sims = s.activities.filter((a) => a.kind === 'sim');
  switch (id) {
    case 'first-sim': return [Math.min(1, sims.length), 1];
    case 'five-sims': return [Math.min(5, sims.length), 5];
    case 'all-core': return [FEATURED_SIMS.filter((x) => sims.some((a) => a.ref === x)).length, FEATURED_SIMS.length];
    case 'three-worlds': return [Math.min(3, worlds), 3];
    case 'six-worlds': return [Math.min(6, worlds), 6];
    case 'streak-3': return [Math.min(3, s.streak.count), 3];
    case 'streak-7': return [Math.min(7, s.streak.count), 7];
    case 'saver': return [Math.min(3, s.saved.length), 3];
    case 'chatty': return [Math.min(5, s.chatCount), 5];
    case 'level-5': return [Math.min(5, levelFromXp(s.xp).level), 5];
    case 'roadmap': return [Math.min(1, s.goals.length), 1];
    case 'lessons-5': return [Math.min(5, s.activities.filter((a) => a.kind === 'lesson').length), 5];
    case 'listener': return [Object.values(s.episodeProg).some((v) => v >= 0.99) ? 1 : 0, 1];
    case 'honest': return [s.activities.some((a) => a.enjoy === 1) ? 1 : 0, 1];
    default: return [s.achievements[id] ? 1 : 0, 1];
  }
}

export function nextAchievement(s: S) {
  const pending = ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.id !== 'honest')
    .map((a) => ({ a, p: achievementProgress(a.id, s) }))
    .sort((x, y) => y.p[0] / y.p[1] - x.p[0] / x.p[1]);
  return pending[0];
}
