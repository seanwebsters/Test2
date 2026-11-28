import { motion } from 'framer-motion';
import { useState } from 'react';
import { CareerAvatar } from '../components/CareerAvatar';
import { Glyph } from '../components/Glyph';
import { Icon } from '../components/Icon';
import { Button, Header, Pill } from '../components/ui';
import { CAREER_BY_ID, ROUTE_LABEL } from '../data/careers';
import type { Career, GlyphName, Route } from '../data/types';
import { WORLD_BY_ID } from '../data/worlds';
import { rankCareers } from '../lib/recommend';
import { useRecState } from '../lib/useRec';
import { useGame } from '../store/game';
import { useNav } from '../store/nav';

const STAGE: Record<string, string> = { school: 'At school', sixth: 'At sixth form / college', uni: 'At university', appr: 'On an apprenticeship', work: 'Working', figuring: 'Taking time out' };
const LANE_GLYPH: Record<Route['type'], GlyphName> = { university: 'flag', apprenticeship: 'wrench', 'self-taught': 'laptop', entrepreneur: 'rocket', college: 'book', 'on-the-job': 'suitcase' };

function laneSteps(r: Route, c: Career, stage: string): { t: string; d: string }[] {
  const junior = `First role: junior ${c.title.toLowerCase()} (or similar)`;
  switch (r.type) {
    case 'university': return [
      { t: stage === 'uni' ? 'Make the most of your course' : 'Get the entry grades', d: stage === 'uni' ? 'Join societies, find placements and build a portfolio alongside.' : 'A-levels, T-levels, BTECs or an Access course — check course requirements.' },
      { t: r.title, d: `${r.detail} (${r.time})` }, { t: 'Placements & internships', d: 'Summer schemes and year-in-industry options give you a head start.' }, { t: junior, d: 'Graduate schemes and junior roles.' }];
    case 'apprenticeship': return [
      { t: 'Apply for an apprenticeship', d: 'Usually from 16+. You earn a wage and your training is paid for.' }, { t: r.title, d: `${r.detail} (${r.time})` },
      { t: 'Qualify while earning', d: 'Many apprenticeships lead to degree-level qualifications.' }, { t: junior, d: 'Many apprentices are kept on by their employer.' }];
    case 'self-taught': return [
      { t: 'Learn the basics for free', d: `Start with ${c.skills[0].toLowerCase()} using free courses and videos.` }, { t: r.title, d: `${r.detail} (${r.time})` },
      { t: 'Build proof', d: 'A portfolio, projects or small paid jobs that show what you can do.' }, { t: junior, d: 'Apply with your portfolio, freelance, or join a small team.' }];
    case 'entrepreneur': return [
      { t: 'Start a tiny experiment', d: 'Test an idea with real people for under £100.' }, { t: r.title, d: `${r.detail}` },
      { t: 'Find your first customers', d: 'Learn what people will actually pay for.' }, { t: 'Run your own thing', d: 'Grow, pivot, or take your skills elsewhere.' }];
    case 'college': return [
      { t: r.title, d: `${r.detail} (${r.time})` }, { t: 'Work experience', d: 'Part-time work, volunteering or placements.' }, { t: junior, d: 'Entry roles, trainee positions or further study.' }];
    default: return [
      { t: 'Get your foot in the door', d: 'An entry or assistant role in the industry.' }, { t: r.title, d: `${r.detail} (${r.time})` }, { t: junior, d: 'Promotion as you prove yourself.' }];
  }
}

export function Roadmap({ careerId }: { careerId?: string }) {
  const rs = useRecState();
  const target = useGame((s) => s.target);
  const setTarget = useGame((s) => s.setTarget);
  const saved = useGame((s) => s.saved);
  const profile = useGame((s) => s.profile);
  const activities = useGame((s) => s.activities);
  const goals = useGame((s) => s.goals);
  const addGoal = useGame((s) => s.addGoal);
  const plus = useGame((s) => !!s.plus);
  const push = useNav((s) => s.push);
  const top = rankCareers(rs).slice(0, 4).map((x) => x.c.id);
  const [id, setId] = useState(careerId ?? target ?? top[0]);
  const c = CAREER_BY_ID[id];
  const w = WORLD_BY_ID[c.world];
  const lanes = c.routes;
  const [lane, setLane] = useState(0);
  const r = lanes[Math.min(lane, lanes.length - 1)];
  const stage = profile?.stage ?? 'figuring';
  const options = [...new Set([id, ...(target ? [target] : []), ...saved, ...top])].slice(0, 8);
  const tried = activities.filter((a) => a.careerId === c.id || a.world === c.world).length;
  const actions = [
    `Try the ${c.title} simulation or a quick lesson`,
    `Learn one starter skill: ${c.skills[0].toLowerCase()}`,
    'Make one small project you could show someone',
    `Talk to someone who works in ${w.short.toLowerCase()}`,
    `Look into: ${c.routes[0].title.toLowerCase()}`,
  ];
  const hasGoal = (t: string) => goals.some((g) => g.text === t);

  return (
    <div className="min-h-screen bg-white">
      <Header tint="#fff" title="My roadmap" />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
        {options.map((o) => <button key={o} onClick={() => { setId(o); setLane(0); }} className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-sm font-extrabold ${o === id ? 'border-grape-500 bg-grape-500 text-white' : 'border-grape-100 text-ink-500'}`}>{CAREER_BY_ID[o].title}</button>)}
      </div>

      <div className="mx-4 mt-2 flex items-center gap-3 rounded-3xl p-4" style={{ background: w.palette.soft }}>
        <CareerAvatar career={c} size={64} />
        <div className="flex-1"><div className="text-xs font-extrabold uppercase tracking-wider" style={{ color: w.palette.deep }}>Destination</div><div className="font-display text-xl font-semibold">{c.title}</div>
          {target === id ? <Pill color="#fff" text={w.palette.deep}><Icon name="star" size={12} />Your current focus</Pill> : <button onClick={() => setTarget(id)} className="mt-1 text-sm font-extrabold text-grape-600">Set as my focus →</button>}</div>
      </div>
      <p className="mx-4 mt-2 text-xs font-bold text-ink-400">This is one possible path, not a prescription. Lanes cross, people switch, and detours often turn out to be the best bit.</p>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4">
        {lanes.map((l, i) => <button key={l.title} onClick={() => setLane(i)} className={`flex shrink-0 items-center gap-1.5 rounded-2xl border-2 py-1.5 pl-1.5 pr-3 text-sm font-extrabold ${i === lane ? 'border-grape-500 bg-grape-50 text-grape-700' : 'border-grape-100 text-ink-500'}`}><Glyph name={LANE_GLYPH[l.type]} size={26} />{ROUTE_LABEL[l.type]}</button>)}
      </div>

      <div className="relative mx-6 mt-5 border-l-4 border-dashed border-grape-200 pb-4 pl-7">
        <Node color="#FFC21A" glyph="map" title="You are here" sub={`${STAGE[stage] ?? 'Exploring'} · ${tried} related activit${tried === 1 ? 'y' : 'ies'} done`} />
        <Node color="#9BE22F" glyph="compass" title="Explore & test" sub="Try simulations, lessons and stories to check you actually enjoy it.">
          <div className="mt-2 flex gap-2">
            {c.sim && <Button size="sm" tone="lime" onClick={() => push({ name: 'sim', id: c.sim! })}>Simulation</Button>}
            <Button size="sm" tone="white" onClick={() => push({ name: 'lesson', careerId: c.id })}>Quick lesson</Button>
          </div>
        </Node>
        <Node color="#4FB8FF" glyph="target" title="Your next six months" sub="Tap + to add any step to your goals.">
          <ul className="mt-2 space-y-1.5">
            {actions.map((a) => (
              <li key={a} className="flex items-center gap-2 rounded-xl bg-cloud px-3 py-2 text-sm font-bold">
                <span className="flex-1">{a}</span>
                <button onClick={() => !hasGoal(a) && addGoal(a, 'short')} aria-label="Add to goals" className={`flex h-7 w-7 items-center justify-center rounded-lg ${hasGoal(a) ? 'bg-lime-400 text-[#1F3A00]' : 'bg-white text-grape-500'}`}><Icon name={hasGoal(a) ? 'check' : 'plus'} size={16} stroke={3} /></button>
              </li>
            ))}
          </ul>
        </Node>
        {laneSteps(r, c, stage).map((s, i) => (
          <motion.div key={`${r.title}-${i}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
            <Node color={w.palette.accent} glyph={i === 0 ? LANE_GLYPH[r.type] : 'ladder'} title={s.t} sub={s.d} />
          </motion.div>
        ))}
        <Node color="#FF4F8B" glyph="star" title={`Grow as a ${c.title.toLowerCase()}`} sub={`Experienced: around £${c.salary.experienced[0]}k–£${c.salary.experienced[1]}k (illustrative). ${c.related.length ? `Paths branch to ${c.related.slice(0, 2).map((x) => CAREER_BY_ID[x].title.toLowerCase()).join(' or ')}.` : ''}`} />
      </div>
      {!plus ? (
        <button onClick={() => push({ name: 'plus' })} className="mx-4 mb-6 flex w-[calc(100%-2rem)] items-center gap-3 rounded-3xl bg-gradient-to-r from-grape-600 to-sky-500 p-4 text-left text-white">
          <Icon name="crown" size={26} className="text-sun-300" /><div><div className="font-display font-semibold">Advanced roadmaps with Plus</div><div className="text-sm font-semibold opacity-90">Month-by-month plans, compare routes side by side, and printable PDFs.</div></div>
        </button>
      ) : (
        <div className="mx-4 mb-6 rounded-3xl border-2 border-sun-300 bg-sun-100 p-4">
          <div className="flex items-center gap-2 font-display font-semibold"><Icon name="crown" className="text-sun-500" />Plus: compare all routes</div>
          <div className="mt-3 space-y-2">{lanes.map((l) => <div key={l.title} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-bold"><span>{ROUTE_LABEL[l.type]}</span><span className="text-ink-500">{l.time}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}

function Node({ color, glyph, title, sub, children }: { color: string; glyph: GlyphName; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="relative mb-6">
      <span className="absolute -left-[50px] top-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white shadow" style={{ background: color }}><Glyph name={glyph} size={24} /></span>
      <div className="font-display text-[17px] font-semibold leading-tight">{title}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink-500">{sub}</div>
      {children}
    </div>
  );
}
