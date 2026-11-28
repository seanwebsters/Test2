import { motion } from 'framer-motion';
import { useState } from 'react';
import { CareerAvatar } from '../components/CareerAvatar';
import { Glyph } from '../components/Glyph';
import { Icon } from '../components/Icon';
import { Scout } from '../components/Scout';
import { Button, Pill, Progress, Section } from '../components/ui';
import { CAREER_BY_ID } from '../data/careers';
import { ACHIEVEMENTS, SKILL_INFO } from '../data/gamification';
import { DEMO_PARTNERS } from '../data/partners';
import { SKILLS, TRAITS, TRAIT_LABEL, type WorldId } from '../data/types';
import { WORLDS, WORLD_BY_ID } from '../data/worlds';
import { rankCareers } from '../lib/recommend';
import { useRecState } from '../lib/useRec';
import { SIM_BY_ID } from '../sims';
import { useGame, useLevel } from '../store/game';
import { useNav } from '../store/nav';

export function You() {
  const s = useGame();
  const rs = useRecState();
  const { level, into, need } = useLevel();
  const push = useNav((n) => n.push);
  const [goal, setGoal] = useState('');
  const [horizon, setHorizon] = useState<'short' | 'long'>('short');
  const partner = DEMO_PARTNERS.find((p) => p.code === s.partner);

  const traitRows = [...TRAITS].map((t) => ({ t, v: s.traits[t], d: s.traits[t] - (s.baseline?.traits[t] ?? 0) })).sort((a, b) => b.v - a.v).slice(0, 6);
  const maxT = Math.max(1, ...traitRows.map((r) => r.v));
  const rising = WORLDS.map((w) => ({ w, d: (s.worldAff[w.id] ?? 0) - (s.baseline?.worldAff[w.id as WorldId] ?? 0) })).filter((x) => Math.abs(x.d) > 0.3).sort((a, b) => b.d - a.d);
  const recs = rankCareers(rs).slice(0, 3).map((x) => x.c);
  const recent = [...s.activities].reverse().slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-b from-grape-500 to-grape-600 px-5 pb-6 pt-4 text-white">
        <div className="flex justify-end"><button onClick={() => push({ name: 'settings' })} aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><Icon name="settings" /></button></div>
        <div className="flex items-center gap-4">
          <button onClick={() => push({ name: 'wardrobe' })} className="relative" aria-label="Change Scout's outfit">
            <Scout size={96} mood="happy" />
            <span className="absolute bottom-1 right-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-grape-600">Outfits</span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-semibold">{s.profile?.name}</h1>
            <div className="flex flex-wrap gap-1.5">
              <Pill color="rgba(255,255,255,.18)" text="#fff">Level {level} explorer</Pill>
              {s.plus && <Pill color="#FFD23F" text="#5A3E00"><Icon name="crown" size={12} />Plus</Pill>}
            </div>
            <div className="mt-2"><Progress value={into / need} color="#9BE22F" track="rgba(255,255,255,.2)" h={10} /><div className="mt-1 text-xs font-bold text-grape-100">{need - into} XP to level {level + 1}</div></div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[['bolt', s.xp, 'Total XP', 'text-sun-300'], ['flame', s.streak.count, `Streak (best ${s.streak.best})`, 'text-coral-300'], ['gem', s.sparks, 'Sparks', 'text-sky-300'], ['key', s.keys, 'Keys', 'text-lime-300']].map(([ic, v, l, c]) => (
            <div key={l as string} className="rounded-2xl bg-white/10 p-2"><Icon name={ic as 'bolt'} size={18} className={`mx-auto ${c}`} /><div className="font-display text-lg font-semibold">{v as number}</div><div className="text-[10px] font-bold leading-tight text-grape-100">{l as string}</div></div>
          ))}
        </div>
      </div>

      {!s.plus && (
        <button onClick={() => push({ name: 'plus' })} className="mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-3xl bg-gradient-to-r from-sun-300 to-coral-300 p-4 text-left">
          <Icon name="crown" size={30} className="text-white" /><div className="flex-1"><div className="font-display font-semibold">Direction Plus</div><div className="text-sm font-semibold text-ink-700">Deeper simulations & advanced roadmaps. Core discovery stays free.</div></div><Icon name="chevron" />
        </button>
      )}
      {partner && <div className="mx-4 mt-4 rounded-3xl border-2 border-sky-300 bg-sky-100 p-4"><div className="text-xs font-extrabold uppercase tracking-wider text-sky-600">Partner</div><div className="font-display font-semibold">{partner.name}</div>
        <ul className="mt-2 space-y-1">{partner.opportunities.map((o) => <li key={o.title} className="text-sm font-semibold"><b>{o.title}</b> — {o.detail}</li>)}</ul></div>}

      <Section title="My Future">
        <div className="space-y-4 px-4">
          <button onClick={() => push({ name: 'roadmap' })} className="relative w-full overflow-hidden rounded-3xl bg-ink-900 p-5 text-left text-white">
            <svg viewBox="0 0 300 80" className="absolute inset-x-0 bottom-0 opacity-60" aria-hidden="true"><path d="M0 60 C60 20 100 70 160 40 S260 10 300 30" stroke="#9BE22F" strokeWidth="4" strokeDasharray="8 8" fill="none" />{[30, 120, 200, 280].map((x, i) => <circle key={x} cx={x} cy={[48, 52, 28, 30][i]} r="7" fill={['#FFC21A', '#4FB8FF', '#FF4F8B', '#9BE22F'][i]} />)}</svg>
            <div className="relative"><div className="text-xs font-extrabold uppercase tracking-wider text-lime-300">Your roadmap</div><div className="mt-1 font-display text-xl font-semibold">{s.target ? `Towards ${CAREER_BY_ID[s.target].title}` : 'Map a path to any career'}</div><div className="mt-1 text-sm font-semibold text-white/70">University, apprenticeships, self-teaching and more</div>
              <span className="mt-8 inline-flex items-center gap-1 rounded-full bg-lime-400 px-3 py-1.5 text-sm font-extrabold text-[#1F3A00]">Open roadmap <Icon name="chevron" size={16} /></span></div>
          </button>

          <Card title="Strengths profile" sub="Grows with what you enjoy, not just what you’re good at">
            <div className="space-y-2.5">
              {traitRows.map(({ t, v, d }) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-28 text-sm font-extrabold">{TRAIT_LABEL[t]}</span>
                  <div className="flex-1"><Progress value={Math.max(0.04, v / maxT)} h={12} color="#7C3AED" /></div>
                  <span className={`w-10 text-right text-xs font-extrabold ${d > 0.2 ? 'text-lime-600' : d < -0.2 ? 'text-coral-500' : 'text-ink-300'}`}>{d > 0.2 ? '▲' : d < -0.2 ? '▼' : '•'}{Math.abs(d) > 0.2 ? Math.abs(d).toFixed(1) : ''}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Emerging interests" sub="How your worlds have shifted since onboarding">
            {rising.length === 0 ? <p className="text-sm font-semibold text-ink-400">Play a few activities and rate them — your interests will start to show here.</p> : (
              <div className="flex flex-wrap gap-2">{rising.map(({ w, d }) => <span key={w.id} className="flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-sm font-extrabold" style={{ background: w.palette.soft, color: w.palette.deep }}><Glyph name={w.glyph} size={24} />{w.short} {d > 0 ? '▲' : '▼'}</span>)}</div>
            )}
          </Card>

          <Card title="Recommended paths right now">
            <div className="space-y-2">{recs.map((c) => (
              <div key={c.id} className="flex w-full items-center gap-3 rounded-2xl border-2 border-grape-50 p-2"><button onClick={() => push({ name: 'career', id: c.id })} className="flex flex-1 items-center gap-3 text-left"><CareerAvatar career={c} size={44} /><span className="flex-1 font-display font-semibold">{c.title}</span></button><button onClick={() => push({ name: 'roadmap', careerId: c.id })} className="rounded-xl bg-grape-50 px-2.5 py-1.5 text-xs font-extrabold text-grape-600">Roadmap</button></div>
            ))}</div>
          </Card>

          <Card title={`Saved careers (${s.saved.length})`}>
            {s.saved.length === 0 ? <p className="text-sm font-semibold text-ink-400">Tap the bookmark on any career to save it here.</p> : (
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">{s.saved.map((id) => { const c = CAREER_BY_ID[id]; return c && (
                <button key={id} onClick={() => push({ name: 'career', id })} className="w-[110px] shrink-0 text-left"><CareerAvatar career={c} size={56} /><div className="mt-1 text-sm font-extrabold leading-tight">{c.title}</div></button>
              ); })}</div>
            )}
          </Card>

          <Card title="My goals" sub="Small steps count. Tick them off as you go.">
            <div className="flex gap-1 rounded-xl bg-cloud p-1">{(['short', 'long'] as const).map((h) => <button key={h} onClick={() => setHorizon(h)} className={`flex-1 rounded-lg py-1.5 text-xs font-extrabold ${horizon === h ? 'bg-white text-grape-600 shadow-sm' : 'text-ink-400'}`}>{h === 'short' ? 'Next 6 months' : 'Long term'}</button>)}</div>
            <ul className="mt-3 space-y-2">
              {s.goals.filter((g) => g.horizon === horizon).map((g) => (
                <li key={g.id} className="flex items-center gap-2">
                  <button onClick={() => s.toggleGoal(g.id)} aria-label={g.done ? 'Mark not done' : 'Mark done'} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${g.done ? 'border-lime-500 bg-lime-400 text-[#1F3A00]' : 'border-grape-200'}`}>{g.done && <Icon name="check" size={16} stroke={3} />}</button>
                  <span className={`flex-1 text-sm font-bold ${g.done ? 'text-ink-300 line-through' : ''}`}>{g.text}</span>
                  <button onClick={() => s.removeGoal(g.id)} aria-label="Delete goal" className="text-ink-300"><Icon name="trash" size={18} /></button>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); if (goal.trim()) { s.addGoal(goal.trim(), horizon); setGoal(''); } }} className="mt-3 flex gap-2">
              <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={horizon === 'short' ? 'e.g. Make a portfolio piece' : 'e.g. Work in a design studio'} aria-label="New goal" className="h-11 flex-1 rounded-xl border-2 border-grape-100 px-3 text-sm font-semibold outline-none focus:border-grape-400" />
              <Button size="sm" tone="grape" type="submit" className="h-11"><Icon name="plus" size={18} /></Button>
            </form>
          </Card>
        </div>
      </Section>

      <Section title="Skill tree">
        <div className="px-4"><SkillTree pts={s.skillPts} /></div>
      </Section>

      <Section title="Achievement cabinet" action={<button onClick={() => push({ name: 'achievements' })} className="text-sm font-extrabold text-grape-500">See all</button>}>
        <div className="mx-4 grid grid-cols-5 gap-2 rounded-3xl bg-[#6B3207] p-3 shadow-inner">
          {ACHIEVEMENTS.slice(0, 10).map((a) => (
            <div key={a.id} className="flex aspect-square items-center justify-center rounded-2xl bg-[#8A4B1A]" title={a.title}>
              {s.achievements[a.id] ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}><Glyph name={a.glyph} size={36} /></motion.span> : <Icon name="lock" size={18} className="text-[#B8794A]" />}
            </div>
          ))}
        </div>
        <div className="mx-4 mt-3 flex flex-wrap gap-2">
          {WORLDS.map((w) => { const n = s.activities.filter((x) => x.world === w.id).length; const tier = n >= 5 ? 'Gold' : n >= 3 ? 'Silver' : n >= 1 ? 'Bronze' : null; return tier && (
            <span key={w.id} className="flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-xs font-extrabold" style={{ background: tier === 'Gold' ? '#FFF0B3' : tier === 'Silver' ? '#EEF0F4' : '#F6E2D0', color: '#3D3758' }}><Glyph name={w.glyph} size={22} />{w.short} · {tier}</span>
          ); })}
        </div>
      </Section>

      <Section title="Recent activity">
        <div className="space-y-2 px-4">
          {recent.length === 0 && <p className="text-sm font-semibold text-ink-400">Nothing yet — your adventures will appear here.</p>}
          {recent.map((a) => {
            const w = WORLD_BY_ID[a.world];
            const label = a.kind === 'sim' ? SIM_BY_ID[a.ref]?.title : a.kind === 'lesson' ? `Lesson: ${CAREER_BY_ID[a.ref]?.title}` : 'Day in the Life';
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-cloud p-2.5">
                <Glyph name={a.kind === 'sim' ? 'gamepad' : a.kind === 'lesson' ? 'book' : 'mic'} size={34} tile={w.palette.soft} />
                <div className="flex-1"><div className="text-sm font-extrabold">{label}</div><div className="text-xs font-bold text-ink-400">{w.short} · +{a.xp} XP</div></div>
                <span className="text-xs font-extrabold text-ink-500">{a.enjoy === 3 ? 'Loved it' : a.enjoy === 2 ? 'OK' : a.enjoy === 1 ? 'Not for me' : 'Unrated'}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <div className="h-6" />
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return <div className="rounded-3xl border-2 border-grape-50 bg-white p-4 shadow-[0_4px_0_#F1ECFA]"><h3 className="font-display text-lg font-semibold">{title}</h3>{sub && <p className="mb-3 text-xs font-bold text-ink-400">{sub}</p>}{!sub && <div className="mb-3" />}{children}</div>;
}

function SkillTree({ pts }: { pts: Partial<Record<(typeof SKILLS)[number], number>> }) {
  // trunk-and-branches layout: three tiers of four
  const pos = SKILLS.map((_, i) => ({ x: 45 + (i % 4) * 90, y: 240 - Math.floor(i / 4) * 85 }));
  const tier = (p: number) => (p >= 6 ? 3 : p >= 3 ? 2 : p >= 1 ? 1 : 0);
  return (
    <div className="rounded-3xl bg-gradient-to-b from-lime-100 to-white p-2">
      <svg viewBox="0 0 360 300" width="100%" aria-label="Skill tree">
        <path d="M180 300 C180 220 180 180 180 30" stroke="#C9874A" strokeWidth="14" strokeLinecap="round" />
        {pos.map((p, i) => <path key={i} d={`M180 ${p.y + 20} Q ${(180 + p.x) / 2} ${p.y + 30} ${p.x} ${p.y}`} stroke="#C9874A" strokeWidth="5" fill="none" strokeLinecap="round" />)}
        {SKILLS.map((k, i) => {
          const p = pos[i]; const info = SKILL_INFO[k]; const v = pts[k] ?? 0; const t = tier(v);
          return (
            <g key={k}>
              <circle cx={p.x} cy={p.y} r={t ? 22 + t * 2 : 20} fill={t ? info.color : '#E5E1EE'} stroke="#fff" strokeWidth="4" />
              <svg x={p.x - 14} y={p.y - 14} width="28" height="28" viewBox="0 0 48 48" opacity={t ? 1 : 0.45}><Glyph name={info.glyph} size={48} /></svg>
              {[0, 1, 2].map((d) => <circle key={d} cx={p.x - 8 + d * 8} cy={p.y + 33} r="3" fill={d < t ? '#FFC21A' : '#D9D3E6'} />)}
              <text x={p.x} y={p.y + 50} textAnchor="middle" fontSize="10" fontWeight="800" fill="#3D3758" fontFamily="Nunito Variable, sans-serif">{info.label}</text>
            </g>
          );
        })}
      </svg>
      <p className="px-2 pb-1 text-center text-xs font-bold text-ink-400">Skills grow as you show them in simulations. 3 leaves = a strong strength.</p>
    </div>
  );
}
