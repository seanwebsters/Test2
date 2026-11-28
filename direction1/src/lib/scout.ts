import { CAREERS, CAREER_BY_ID } from '../data/careers';
import { WORLDS, WORLD_BY_ID } from '../data/worlds';
import { SIMS } from '../sims';
import { TRAIT_LABEL } from '../data/types';
import type { Chip } from '../store/game';
import { rankCareers, rankWorlds, topTraits, type RecState } from './recommend';

export interface ScoutCtx extends RecState { name: string; stage: string; age: number; target: string | null }
export interface ScoutReply { text: string; chips?: Chip[] }

const STAGE: Record<string, string> = { school: 'at school', sixth: 'at sixth form or college', uni: 'at university', appr: 'on an apprenticeship', work: 'working', figuring: 'taking some time out' };
const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export const STARTERS = [
  'What career would suit me?',
  'What if I don’t want to go to university?',
  'Can I become a designer without qualifications?',
  'What jobs combine creativity and technology?',
  'How can I start my own business?',
  'What should I do over the next six months?',
];

/**
 * Simulated Scout. Clearly labelled in the UI as a prototype assistant: it uses
 * the user's profile and activity history with hand-written guidance, and
 * avoids definitive claims about anyone's potential.
 */
export function scoutReply(raw: string, ctx: ScoutCtx): ScoutReply {
  const t = raw.toLowerCase().replace(/[’']/g, '');
  const recs = rankCareers(ctx).slice(0, 4).map((r) => r.c);
  const worlds = rankWorlds(ctx).slice(0, 3).map((r) => r.w);
  const strengths = topTraits(ctx).map((x) => TRAIT_LABEL[x.t].toLowerCase());
  const loved = ctx.activities.filter((a) => a.enjoy === 3);
  const lovedCareer = loved.map((a) => a.careerId && CAREER_BY_ID[a.careerId]).find(Boolean);
  const name = ctx.name || 'friend';

  // a specific career mentioned?
  const named = CAREERS.find((c) => t.includes(c.title.toLowerCase().split(' (')[0].split(' /')[0]) || t.includes(c.id.replace(/-/g, ' ')));

  if (has(t, 'hello', 'hi scout', 'hey', 'hiya') && t.length < 20)
    return { text: `Hey ${name}! I’m here whenever you want to think out loud. Ask me anything about careers, routes or what to try next.`, chips: [{ label: 'What would suit me?', kind: 'ask', text: 'What career would suit me?' }] };

  if (has(t, 'thank', 'cheers', 'ta '))
    return { text: `Any time, ${name}. Remember: you don’t have to have it all figured out. You just have to stay curious. 💜`.replace(' 💜', '') };

  if (has(t, 'scared', 'anxious', 'worried', 'stress', 'no idea', 'dont know what', 'lost', 'behind'))
    return {
      text: `That feeling is really common, ${name} — most people don’t have a clear plan at your age, and plenty of people change careers several times. You don’t need to pick anything today. A good next step is just to try a couple of things and notice what you enjoy. If you’re feeling really low or overwhelmed, talking to someone you trust, or a service like Childline (under 19) or Samaritans, can genuinely help.`,
      chips: [{ label: `Try ${SIMS.find((s) => s.world === worlds[0]?.id)?.role ?? 'a simulation'}`, kind: 'sim', id: SIMS.find((s) => s.world === worlds[0]?.id)?.id ?? 'creative-director' }],
    };

  if (named && !has(t, 'suit me', 'should i'))
    return {
      text: `${named.title}s ${named.oneLiner.charAt(0).toLowerCase()}${named.oneLiner.slice(1)} ${named.involves.split('. ')[0]}. Ways in include ${list(named.routes.map((r) => r.title.toLowerCase()))}. Typical starting pay is around £${named.salary.entry[0]}k–£${named.salary.entry[1]}k (an illustrative figure — check current data).`,
      chips: [{ label: `Open ${named.title}`, kind: 'career', id: named.id }, ...(named.sim ? [{ label: 'Try the simulation', kind: 'sim' as const, id: named.sim }] : []), { label: 'Show me the roadmap', kind: 'roadmap', id: named.id }],
    };

  if (has(t, 'suit', 'should i do', 'right for me', 'best career', 'what career', 'what job'))
    return {
      text: `Based on what you’ve told me${ctx.activities.length ? ' and what you’ve tried so far' : ''}, you come across as ${list(strengths.slice(0, 3)) || 'curious'}. Right now I’d explore ${list(recs.slice(0, 3).map((c) => c.title))}${lovedCareer ? ` — especially since you loved the ${lovedCareer.title} activity` : ''}. These are starting points, not a verdict: the more you try, the better my suggestions get.`,
      chips: recs.slice(0, 3).map((c) => ({ label: c.title, kind: 'career' as const, id: c.id })),
    };

  if (has(t, 'university', 'uni', 'degree', 'college'))
    return {
      text: `University is one route — not the only one. Lots of careers have paid apprenticeships (including degree apprenticeships, where your employer covers the fees), college courses, or self-taught paths. For example, ${list(recs.filter((c) => c.routes.some((r) => r.type === 'apprenticeship')).slice(0, 2).map((c) => `${c.title.toLowerCase()}s can start via ${c.routes.find((r) => r.type === 'apprenticeship')!.title.toLowerCase()}`))}. Some roles, like doctors or vets, do usually need a degree. It’s worth comparing the routes for the careers you’re curious about.`,
      chips: [{ label: 'See my roadmap', kind: 'roadmap' }, { label: 'Careers with apprenticeships', kind: 'ask', text: 'Which careers have good apprenticeships?' }],
    };

  if (has(t, 'apprentice'))
    return {
      text: `Apprenticeships mean you earn a wage while you train, and many lead to the same qualifications as a degree. From your recommendations: ${recs.slice(0, 3).map((c) => `${c.title} (${c.apprenticeships.split(',')[0]})`).join('; ')}. In England you can search current vacancies on the government’s Find an Apprenticeship service.`,
      chips: recs.slice(0, 2).map((c) => ({ label: c.title, kind: 'career' as const, id: c.id })),
    };

  if (has(t, 'designer', 'design') && has(t, 'qualification', 'without', 'no degree'))
    return {
      text: 'Yes — in design, a strong portfolio often matters more than certificates. Many designers are self-taught or start with an apprenticeship. A practical plan: learn a free tool like Figma, do small real briefs (a logo for a local café, posters for a club), share your process online, and ask for feedback. It takes effort, but it’s a genuine route.',
      chips: [{ label: 'Graphic Designer', kind: 'career', id: 'graphic-designer' }, { label: 'Try Creative Director', kind: 'sim', id: 'creative-director' }, { label: 'UX Designer', kind: 'career', id: 'ux-designer' }],
    };

  if (has(t, 'creativ') && has(t, 'tech', 'computer', 'code', 'digital'))
    return {
      text: 'Great combo! Jobs that mix creativity and tech include creative technologist, UX designer, AI product designer, game developer, animator and sound designer. They’re growing fast, and many value portfolios over degrees.',
      chips: ['creative-technologist', 'ai-product-designer', 'game-developer', 'ux-designer'].map((id) => ({ label: CAREER_BY_ID[id].title, kind: 'career' as const, id })),
    };

  if (has(t, 'business', 'start my own', 'entrepreneur', 'side hustle', 'founder'))
    return {
      text: 'Start tiny. Pick a problem you understand, test it with real people for under £100, and see if anyone pays. Talk to customers more than you think you need to. Watch your cash, not just your sales. Many founders keep a job or studies going while they test. The Entrepreneur simulation is a safe place to practise the big decisions first.',
      chips: [{ label: 'Play the £1,000 Launch', kind: 'sim', id: 'entrepreneur' }, { label: 'Founder / Entrepreneur', kind: 'career', id: 'entrepreneur' }],
    };

  if (has(t, 'six months', '6 months', 'next step', 'plan', 'what now', 'should i do next'))
    {
      const focus = CAREER_BY_ID[ctx.target ?? ''] ?? recs[0];
      return {
        text: `Here’s a gentle six-month plan around ${focus.title.toLowerCase()} — swap it out any time:\n\n• Month 1: Try 2–3 simulations across different worlds and note what you enjoy.\n• Month 2: Learn one starter skill (${focus.skills[0].toLowerCase()}) with a free course or YouTube series.\n• Month 3: Make one small project you can show someone.\n• Month 4: Talk to someone who does the job — a teacher, family friend or an online community.\n• Month 5: Look at routes: ${focus.routes.map((r) => r.title).slice(0, 2).join(' or ')}.\n• Month 6: Look back at what lit you up and pick your next experiment.`,
        chips: [{ label: 'Build my roadmap', kind: 'roadmap', id: focus.id }],
      };
    }

  if (has(t, 'money', 'salary', 'earn', 'pay', 'rich'))
    {
      const rich = [...recs].sort((a, b) => b.salary.experienced[1] - a.salary.experienced[1]).slice(0, 3);
      return {
        text: `Of your current matches, ${list(rich.map((c) => `${c.title.toLowerCase()} (around £${c.salary.experienced[0]}k–£${c.salary.experienced[1]}k with experience)`))} tend to pay more. These are illustrative prototype figures — pay varies a lot by location, employer and specialism. It’s also worth weighing hours and lifestyle, not just salary.`,
        chips: rich.map((c) => ({ label: c.title, kind: 'career' as const, id: c.id })),
      };
    }

  const world = WORLDS.find((w) => t.includes(w.short.toLowerCase()) || t.includes(w.name.toLowerCase().split(' ')[0]));
  if (world)
    return { text: `${world.name}: ${world.tagline} ${world.guide.name} the ${world.guide.species} is your guide there. Want to explore it?`, chips: [{ label: `Visit ${world.short}`, kind: 'world', id: world.id }] };

  if (has(t, 'parents', 'family', 'mum', 'dad'))
    return { text: 'It’s normal for family to have opinions — they usually want you to be secure and happy. It can help to show them what you’ve explored: the routes, the pay ranges, the day-to-day. Your roadmap in the You tab is a good thing to share. In the end it’s your path, and it’s OK to try things before deciding.', chips: [{ label: 'Open my roadmap', kind: 'roadmap' }] };

  return {
    text: `Good question, ${name}. I’m a prototype, so I’m best at careers, routes, skills and planning. From what I know about you (${STAGE[ctx.stage] ?? 'exploring'}, ${list(strengths.slice(0, 2)) || 'curious'}), I’d suggest looking at ${worlds[0]?.name ?? 'a new world'} next. Try asking me about a specific job, apprenticeships, money or what to do in the next six months.`,
    chips: [{ label: 'What should I do in 6 months?', kind: 'ask', text: 'What should I do over the next six months?' }, ...(worlds[0] ? [{ label: `Explore ${worlds[0].short}`, kind: 'world' as const, id: worlds[0].id }] : [])],
  };
}

export const worldName = (id: string) => WORLD_BY_ID[id as keyof typeof WORLD_BY_ID]?.name ?? id;
