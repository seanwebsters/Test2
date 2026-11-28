import { CAREERS } from '../data/careers';
import type { Career } from '../data/types';

export interface LessonQ { id: string; prompt: string; options: string[]; answer: number; explain: string; kind: string }

const seeded = (seed: string) => {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
};
function shuffle<T>(arr: T[], rnd: () => number) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Generates a quick, ~90-second lesson from any career's structured data. */
export function buildLesson(c: Career): LessonQ[] {
  const rnd = seeded(c.id);
  const others = shuffle(CAREERS.filter((x) => x.world !== c.world), rnd);
  const qs: LessonQ[] = [];
  const mk = (id: string, kind: string, prompt: string, right: string, wrongs: string[], explain: string) => {
    const opts = shuffle([right, ...wrongs.slice(0, 2)], rnd);
    qs.push({ id, kind, prompt, options: opts, answer: opts.indexOf(right), explain });
  };
  const day = c.day[Math.floor(rnd() * c.day.length)];
  mk('day', 'A day in the life', `Which of these could be a normal part of a ${c.title}’s day?`, day[1], others.slice(0, 2).map((o) => o.day[1][1]), `${day[0]} — ${day[1]}. ${c.involves.split('. ')[0]}.`);
  mk('skill', 'Key skills', `Which skill is especially important for a ${c.title}?`, c.skills[0], others.slice(2, 4).map((o) => o.skills[0]).filter((s) => !c.skills.includes(s)), `Top skills: ${c.skills.join(', ')}.`);
  const nonUni = c.routes.some((r) => r.type !== 'university');
  qs.push({ id: 'myth', kind: 'Myth or fact?', prompt: `“You can only become a ${c.title} by going to university.”`, options: ['Myth', 'Fact'], answer: nonUni ? 0 : 1,
    explain: nonUni ? `Myth! Routes include: ${c.routes.filter((r) => r.type !== 'university').map((r) => r.title).join('; ')}.` : `For now, university is the main route: ${c.qualifications}` });
  const r = c.routes[0];
  mk('route', 'Ways in', `Which of these is a genuine route towards becoming a ${c.title}?`, r.title, others.slice(4, 6).map((o) => o.routes[0].title), `${r.title}: ${r.detail}`);
  const lo = c.salary.entry[0], hi = c.salary.entry[1];
  const fmt = (a: number, b: number) => `£${a}k–£${b}k`;
  const right = fmt(lo, hi);
  const w1 = fmt(lo + 25, hi + 35), w2 = lo > 12 ? fmt(Math.max(8, lo - 12), Math.max(12, hi - 10)) : fmt(hi + 60, hi + 90);
  mk('pay', 'Money (illustrative)', `Roughly what might a new ${c.title} earn per year in the UK?`, right, [w1, w2], `Illustrative prototype range: ${right} to start, ${fmt(...c.salary.experienced)} with experience. Always check current sources.`);
  return qs;
}
