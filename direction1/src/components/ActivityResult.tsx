import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CAREER_BY_ID, careersInWorld } from '../data/careers';
import { ACHIEVEMENTS, SKILL_INFO } from '../data/gamification';
import type { SkillId, WorldId } from '../data/types';
import { WORLD_BY_ID } from '../data/worlds';
import { nextAchievement } from '../lib/achievementProgress';
import type { Outcome } from '../sims/types';
import { useGame, useLevel, type Enjoy, type Reward } from '../store/game';
import { useNav } from '../store/nav';
import { CareerAvatar } from './CareerAvatar';
import { EnjoyFaces } from './EnjoyFaces';
import { Glyph } from './Glyph';
import { Icon } from './Icon';
import { Scout } from './Scout';
import { Bubble, Button, Confetti, Progress } from './ui';

export interface FeedbackItem { title: string; text: string; good: boolean }

function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (t: number) => { const k = Math.min(1, (t - start) / 900); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v}</>;
}

export function ActivityResult({ heading, world, careerId, reward, activityId, skills, feedback, outcome, onAgain, plusTeaser }: {
  heading: string; world: WorldId; careerId?: string; reward: Reward; activityId: string; skills: SkillId[];
  feedback: FeedbackItem[]; outcome?: Outcome; onAgain?: () => void; plusTeaser?: boolean;
}) {
  const rate = useGame((s) => s.rate);
  const state = useGame();
  const { level, into, need } = useLevel();
  const back = useNav((s) => s.back);
  const push = useNav((s) => s.push);
  const [enjoy, setEnjoy] = useState<Enjoy | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const w = WORLD_BY_ID[world];
  const career = careerId ? CAREER_BY_ID[careerId] : undefined;
  const related = [...new Set([...(career?.related ?? []), ...careersInWorld(world).map((c) => c.id)])].filter((id) => id !== careerId).slice(0, 4).map((id) => CAREER_BY_ID[id]).filter(Boolean);
  const next = nextAchievement(state);
  const goodCount = feedback.filter((f) => f.good).length;

  const pick = (v: Enjoy) => {
    setEnjoy(v);
    rate(activityId, v);
    setReaction(
      v === 3 ? `Love that! I’ve moved ${w.short} up your path and I’ll suggest more like this.`
        : v === 2 ? 'Good to know. Somewhere in the middle is useful info too — I’ll keep it in the mix.'
          : `Thanks for being honest — that’s genuinely useful. I’ll show you less ${w.short} and more of what clicks. Not enjoying something is part of finding your thing.`,
    );
  };

  return (
    <div className="min-h-screen bg-grape-50 pb-10">
      <Confetti n={reward.levelUp ? 90 : 50} />
      <div className="rounded-b-[2.5rem] px-5 pb-6 pt-8 text-center text-white" style={{ background: `linear-gradient(${w.palette.accent}, ${w.palette.deep})` }}>
        <Scout size={96} mood="cheer" className="mx-auto" />
        <h1 className="mt-1 font-display text-3xl font-semibold">{heading}</h1>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/15 p-2"><div className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">XP</div><div className="font-display text-2xl font-semibold text-sun-300">+<CountUp to={reward.xp} /></div></div>
          <div className="rounded-2xl bg-white/15 p-2"><div className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">Sparks</div><div className="font-display text-2xl font-semibold text-sky-300">+{reward.sparks}</div></div>
          <div className="rounded-2xl bg-white/15 p-2"><div className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">Great calls</div><div className="font-display text-2xl font-semibold text-lime-300">{goodCount}/{feedback.length}</div></div>
        </div>
        <div className="mt-4 text-left">
          <div className="mb-1 flex justify-between text-xs font-extrabold"><span>Level {level}</span><span>{into}/{need} XP</span></div>
          <Progress value={into / need} color="#FFD23F" track="rgba(255,255,255,.25)" />
        </div>
        {reward.levelUp && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-3 rounded-2xl bg-sun-400 px-3 py-2 font-display font-semibold text-[#5A3E00]">Level up! You’re now level {reward.levelUp} · +{reward.keys} Curiosity Key</motion.div>}
      </div>

      <div className="space-y-4 px-4 pt-5">
        {reward.achievements.map((id) => { const a = ACHIEVEMENTS.find((x) => x.id === id)!; return (
          <div key={id} className="flex items-center gap-3 rounded-3xl border-2 border-sun-300 bg-sun-100 p-3"><Glyph name={a.glyph} size={44} tile="#fff" /><div><div className="text-[11px] font-extrabold uppercase tracking-wider text-sun-600">Achievement</div><div className="font-display font-semibold">{a.title}</div><div className="text-xs font-semibold text-ink-500">{a.desc}</div></div></div>
        ); })}

        {outcome && (
          <div className="rounded-3xl bg-white p-4 shadow-[0_4px_0_#E4DAF7]">
            <div className="text-xs font-extrabold uppercase tracking-wider text-grape-500">The outcome</div>
            <h2 className="mt-1 font-display text-xl font-semibold leading-snug">{outcome.headline}</h2>
            {outcome.chart && outcome.chart.length > 0 && (
              <div className="mt-4">
                <div className="flex h-32 items-end gap-3">
                  {outcome.chart.map((b, i) => { const max = Math.max(...outcome.chart!.map((x) => x.value), 1); return (
                    <div key={b.label} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-xs font-extrabold text-ink-700">{b.value}</span>
                      <motion.div className="w-full rounded-t-xl" style={{ background: w.palette.accent }} initial={{ height: 0 }} animate={{ height: `${(b.value / max) * 90}px` }} transition={{ delay: 0.2 + i * 0.1, type: 'spring' }} />
                      <span className="text-[11px] font-bold text-ink-500">{b.label}</span>
                    </div>
                  ); })}
                </div>
                {outcome.chartLabel && <p className="mt-1 text-center text-[11px] font-bold text-ink-400">{outcome.chartLabel}</p>}
              </div>
            )}
            <ul className="mt-3 space-y-2">{outcome.lines.map((l) => <li key={l} className="flex gap-2 text-sm font-semibold text-ink-700"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-grape-300" />{l}</li>)}</ul>
          </div>
        )}

        <div className="rounded-3xl bg-white p-4 shadow-[0_4px_0_#E4DAF7]">
          <h3 className="font-display text-lg font-semibold">How much did you enjoy that?</h3>
          <p className="text-sm font-semibold text-ink-500">This matters more than your score. I learn from what you enjoy.</p>
          <div className="mt-3"><EnjoyFaces value={enjoy} onPick={pick} /></div>
          {reaction && <div className="mt-3 flex items-start gap-2"><Scout size={46} mood={enjoy === 1 ? 'calm' : 'excited'} bob={false} /><Bubble className="flex-1 text-sm">{reaction}</Bubble></div>}
        </div>

        {skills.length > 0 && (
          <div className="rounded-3xl bg-white p-4 shadow-[0_4px_0_#E4DAF7]">
            <h3 className="font-display text-lg font-semibold">Skills you showed</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((s) => <span key={s} className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-extrabold" style={{ background: SKILL_INFO[s].color + '1A', color: SKILL_INFO[s].color }}><Glyph name={SKILL_INFO[s].glyph} size={24} />{SKILL_INFO[s].label}</span>)}
            </div>
          </div>
        )}

        <div className="rounded-3xl bg-white p-4 shadow-[0_4px_0_#E4DAF7]">
          <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between" aria-expanded={open}>
            <h3 className="font-display text-lg font-semibold">Feedback on your decisions</h3>
            <Icon name="chevron" className={`text-ink-400 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
          {open && <ul className="mt-3 space-y-3">{feedback.map((f, i) => (
            <li key={i} className="flex gap-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${f.good ? 'bg-lime-400 text-[#1F3A00]' : 'bg-sun-300 text-[#5A3E00]'}`}><Icon name={f.good ? 'check' : 'info'} size={14} stroke={3} /></span>
              <div><div className="text-sm font-extrabold">{f.title}</div><div className="text-sm font-semibold text-ink-500">{f.text}</div></div></li>
          ))}</ul>}
        </div>

        {related.length > 0 && (
          <div>
            <h3 className="px-1 font-display text-lg font-semibold">Related careers worth exploring</h3>
            <div className="no-scrollbar -mx-4 mt-2 flex gap-3 overflow-x-auto px-4 pb-2">
              {related.map((c) => (
                <button key={c.id} onClick={() => push({ name: 'career', id: c.id })} className="w-[150px] shrink-0 rounded-3xl bg-white p-3 text-left shadow-[0_4px_0_#E4DAF7]">
                  <CareerAvatar career={c} size={52} /><div className="mt-2 font-display font-semibold leading-tight">{c.title}</div><div className="mt-0.5 text-xs font-semibold text-ink-400">{c.oneLiner}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {next && (
          <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-[0_4px_0_#E4DAF7]">
            <Glyph name={next.a.glyph} size={44} tile={next.a.color + '22'} />
            <div className="flex-1"><div className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">Next achievement</div><div className="font-display font-semibold">{next.a.title}</div>
              <div className="mt-1 flex items-center gap-2"><Progress value={next.p[0] / next.p[1]} h={10} color={next.a.color} /><span className="text-xs font-extrabold text-ink-400">{next.p[0]}/{next.p[1]}</span></div></div>
          </div>
        )}

        {plusTeaser && (
          <button onClick={() => push({ name: 'plus' })} className="flex w-full items-center gap-3 rounded-3xl bg-gradient-to-r from-grape-600 to-coral-400 p-4 text-left text-white">
            <Icon name="crown" size={28} className="text-sun-300" />
            <div><div className="font-display font-semibold">Expert round available</div><div className="text-sm font-semibold opacity-90">Direction Plus adds deeper, trickier stages to every simulation.</div></div>
          </button>
        )}

        <div className="flex gap-3 pt-2">
          {onAgain && <Button tone="white" className="flex-1" onClick={onAgain}><Icon name="refresh" size={18} />Again</Button>}
          <Button tone="lime" className="flex-[2]" onClick={back}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
