import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CareerAvatar } from '../components/CareerAvatar';
import { Glyph } from '../components/Glyph';
import { Icon } from '../components/Icon';
import { Scout } from '../components/Scout';
import { Bubble, Button, Confetti, Progress } from '../components/ui';
import { WorldArt } from '../components/WorldArt';
import { QUESTIONS, type QOption } from '../data/onboarding';
import { EPISODES } from '../data/episodes';
import { TRAIT_LABEL } from '../data/types';
import { WORLDS } from '../data/worlds';
import { matchPct, rankCareers, rankWorlds, seedFromAnswers, topTraits, TRAIT_BLURB, type RecState } from '../lib/recommend';
import { SIMS } from '../sims';
import { useGame } from '../store/game';

const worldOptions: QOption[] = WORLDS.map((w) => ({ id: w.id, label: w.name, glyph: w.glyph }));

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><rect width="40" height="40" rx="12" fill="#7C3AED" /><path d="M20 7l8 18-8-4-8 4Z" fill="#9BE22F" /><circle cx="20" cy="30" r="3.5" fill="#FFC21A" /></svg>
      <span className="font-display text-[28px] font-bold tracking-[0.06em] text-grape-600">DIRECTION</span>
    </div>
  );
}

export function Onboarding() {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [phase, setPhase] = useState<'q' | 'thinking' | 'reveal'>('q');

  if (step === -1) return <Welcome onStart={() => setStep(0)} />;
  if (phase === 'thinking') return <Thinking onDone={() => setPhase('reveal')} />;
  if (phase === 'reveal') return <Reveal name={name} age={age ?? 18} answers={answers} />;

  const q = QUESTIONS[step];
  const opts = q.id === 'curious' ? worldOptions : q.options ?? [];
  const picked = answers[q.id] ?? [];
  const next = () => (step === QUESTIONS.length - 1 ? setPhase('thinking') : setStep(step + 1));
  const toggle = (id: string) => {
    if (q.kind === 'single') {
      setAnswers({ ...answers, [q.id]: [id] });
      window.setTimeout(next, 380);
      return;
    }
    const has = picked.includes(id);
    const max = q.max ?? 99;
    const nxt = has ? picked.filter((x) => x !== id) : picked.length >= max ? [...picked.slice(1), id] : [...picked, id];
    setAnswers({ ...answers, [q.id]: nxt });
  };
  const canNext = q.kind === 'name' ? name.trim().length > 0 : q.kind === 'age' ? age !== null : picked.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => setStep(step - 1)} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-grape-50" aria-label="Back"><Icon name="back" /></button>
        <Progress value={(step + 1) / QUESTIONS.length} />
        <span className="w-10 text-right text-xs font-extrabold text-ink-400">{step + 1}/{QUESTIONS.length}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} className="flex flex-1 flex-col px-5 pb-6" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
          <div className="mt-4 flex items-end gap-2">
            <Scout size={70} mood={step === QUESTIONS.length - 1 ? 'excited' : step % 3 === 2 ? 'think' : 'happy'} />
            <Bubble className="mb-6 flex-1 text-[15px]">{q.scout.replace('{name}', name.trim() || 'friend')}</Bubble>
          </div>
          <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight text-ink-900">{q.title}</h1>
          {q.hint && <p className="mt-1 text-sm font-bold text-ink-400">{q.hint}</p>}

          {q.kind === 'name' && (
            <input autoFocus value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} onKeyDown={(e) => e.key === 'Enter' && canNext && next()}
              placeholder="Your first name" aria-label="Your first name"
              className="mt-6 h-16 w-full rounded-2xl border-2 border-grape-100 bg-grape-50/40 px-5 font-display text-2xl text-ink-900 outline-none focus:border-grape-400" />
          )}
          {q.kind === 'age' && (
            <div className="mt-6 grid grid-cols-5 gap-2.5">
              {Array.from({ length: 10 }, (_, i) => 16 + i).map((a) => (
                <motion.button whileTap={{ scale: 0.9 }} key={a} onClick={() => { setAge(a); window.setTimeout(next, 300); }}
                  className={`h-16 rounded-2xl border-2 font-display text-2xl font-semibold ${age === a ? 'border-grape-500 bg-grape-500 text-white shadow-[0_4px_0_#41188A]' : 'border-grape-100 bg-white text-ink-700 shadow-[0_4px_0_#EDE4FB]'}`}>
                  {a}{a === 25 ? '+' : ''}
                </motion.button>
              ))}
            </div>
          )}
          {opts.length > 0 && (
            <div className={`mt-5 grid gap-3 ${opts.length > 6 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {opts.map((o, i) => {
                const on = picked.includes(o.id);
                return (
                  <motion.button key={o.id} onClick={() => toggle(o.id)} aria-pressed={on}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, scale: on ? 1.02 : 1 }} transition={{ delay: i * 0.03 }} whileTap={{ scale: 0.95 }}
                    className={`relative flex flex-col items-start gap-2 rounded-3xl border-2 p-3.5 text-left transition-colors ${on ? 'border-grape-500 bg-grape-50 shadow-[0_4px_0_#7C3AED]' : 'border-grape-100 bg-white shadow-[0_4px_0_#EDE4FB]'}`}>
                    <Glyph name={o.glyph} size={46} tile />
                    <span className="font-display text-[15px] font-semibold leading-tight text-ink-900">{o.label}</span>
                    {o.sub && <span className="-mt-1 text-xs font-bold text-ink-400">{o.sub}</span>}
                    {on && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-lime-400 text-[#1F3A00]"><Icon name="check" size={16} stroke={3} /></span>}
                  </motion.button>
                );
              })}
            </div>
          )}
          <div className="flex-1" />
          {q.kind !== 'single' && q.kind !== 'age' && (
            <Button tone="lime" size="lg" full className="mt-6" disabled={!canNext} onClick={next}>
              {step === QUESTIONS.length - 1 ? 'Show me my profile' : 'Continue'}
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-grape-500 via-grape-500 to-grape-700 text-white">
      <svg className="absolute inset-x-0 bottom-0" viewBox="0 0 400 220" preserveAspectRatio="none" width="100%" height="38%" aria-hidden="true">
        <path d="M0 90C80 40 160 60 220 80S340 50 400 70V220H0Z" fill="#9A66FF" opacity=".6" />
        <path d="M0 140C90 100 180 120 260 130S360 110 400 120V220H0Z" fill="#9BE22F" />
        <path d="M0 175C100 160 230 170 400 160V220H0Z" fill="#7ED321" />
      </svg>
      {[[40, 90], [330, 70], [300, 200], [70, 240], [200, 40]].map(([x, y], i) => (
        <motion.span key={i} className="absolute text-sun-300" style={{ left: x, top: y }} animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }} transition={{ duration: 2 + i * 0.4, repeat: Infinity }}><Icon name="sparkle" size={14 + (i % 3) * 6} /></motion.span>
      ))}
      <div className="relative z-10 flex flex-1 flex-col items-center px-6 pt-14 text-center">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2">
          <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><rect width="40" height="40" rx="12" fill="#fff" /><path d="M20 7l8 18-8-4-8 4Z" fill="#7C3AED" /><circle cx="20" cy="30" r="3.5" fill="#FFC21A" /></svg>
          <span className="font-display text-4xl font-bold tracking-[0.08em]">DIRECTION</span>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-2 font-display text-lg text-grape-100">Find your thing. Build your future.</motion.p>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35, type: 'spring' }} className="mt-8">
          <div className="relative mx-auto max-w-[300px] rounded-3xl bg-white px-5 py-4 font-display text-lg font-medium leading-snug text-ink-900 shadow-[0_6px_0_rgba(0,0,0,.15)]">
            Not sure what you want to do with your life? <span className="text-grape-600">That’s exactly why I’m here.</span>
            <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
          </div>
        </motion.div>
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, type: 'spring' }}><Scout size={170} mood="wave" /></motion.div>
      </div>
      <div className="relative z-10 space-y-3 px-6 pb-10">
        <p className="text-center text-sm font-bold text-[#1F3A00]">I’m Scout. Let’s find out what makes you tick — it takes about 3 minutes.</p>
        <Button tone="white" size="lg" full onClick={onStart}>Let’s go!</Button>
      </div>
    </div>
  );
}

function Thinking({ onDone }: { onDone: () => void }) {
  const steps = ['Mapping your strengths', 'Exploring 12 career worlds', 'Matching 75 careers', 'Packing your backpack'];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= steps.length) { const t = window.setTimeout(onDone, 500); return () => window.clearTimeout(t); }
    const t = window.setTimeout(() => setI(i + 1), 650);
    return () => window.clearTimeout(t);
  }, [i, onDone, steps.length]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-grape-50 px-8">
      <Scout size={150} mood="think" />
      <h1 className="mt-4 text-center font-display text-2xl font-semibold text-ink-900">Scout is thinking…</h1>
      <ul className="mt-6 w-full max-w-[280px] space-y-3">
        {steps.map((s, k) => (
          <motion.li key={s} initial={{ opacity: 0.3 }} animate={{ opacity: k <= i ? 1 : 0.3 }} className="flex items-center gap-3 font-bold text-ink-700">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${k < i ? 'bg-lime-400 text-[#1F3A00]' : 'bg-white text-ink-300'}`}>
              {k < i ? <Icon name="check" size={16} stroke={3} /> : <motion.span className="block h-2 w-2 rounded-full bg-grape-400" animate={{ scale: k === i ? [1, 1.6, 1] : 1 }} transition={{ repeat: Infinity, duration: 0.8 }} />}
            </span>{s}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function Reveal({ name, age, answers }: { name: string; age: number; answers: Record<string, string[]> }) {
  const complete = useGame((s) => s.completeOnboarding);
  const seed = useMemo(() => seedFromAnswers(answers), [answers]);
  const rs: RecState = { traits: seed.traits, worldAff: seed.worlds, saved: [], activities: [] };
  const worlds = rankWorlds(rs).slice(0, 3).map((x) => x.w);
  const careers = rankCareers(rs).slice(0, 4).map((x) => x.c);
  const strengths = topTraits(rs, 3);
  const sim = SIMS.find((s) => s.world === worlds[0].id) ?? SIMS[0];
  const ep = EPISODES.find((e) => worlds.some((w) => w.id === e.world)) ?? EPISODES[0];

  const start = () => complete({ name: name.trim() || 'Explorer', age, stage: answers.stage?.[0] ?? 'figuring', answers, createdAt: Date.now() }, seed.traits, seed.worlds, worlds.map((w) => w.id));

  return (
    <div className="min-h-screen bg-grape-50 pb-10">
      <Confetti />
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-b from-grape-500 to-grape-600 px-5 pb-8 pt-10 text-center text-white">
        <Scout size={110} mood="cheer" className="mx-auto" />
        <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.2em] text-lime-300">Your discovery profile</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Nice to meet you properly, {name.trim() || 'Explorer'}!</h1>
        <p className="mx-auto mt-2 max-w-[320px] text-sm font-semibold text-grape-100">This is a first sketch, not a label. It’ll keep changing as you try things — based on what you actually enjoy.</p>
      </div>

      <div className="px-4">
        <h2 className="mt-6 font-display text-xl font-semibold">Your strengths</h2>
        <div className="mt-3 space-y-3">
          {strengths.map(({ t }, i) => (
            <motion.div key={t} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.12 }} className="flex items-center gap-3 rounded-3xl bg-white p-3.5 shadow-[0_4px_0_#E4DAF7]">
              <Glyph name={(['star', 'bulb', 'heart'] as const)[i]} size={44} tile />
              <div><div className="font-display text-lg font-semibold">{TRAIT_LABEL[t]}</div><div className="text-sm font-semibold text-ink-500">{TRAIT_BLURB[t]}</div></div>
            </motion.div>
          ))}
        </div>

        <h2 className="mt-7 font-display text-xl font-semibold">Worlds to start in</h2>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
          {worlds.map((w) => (
            <div key={w.id} className="w-[220px] shrink-0 overflow-hidden rounded-3xl bg-white shadow-[0_4px_0_#E4DAF7]">
              <WorldArt world={w} height={110} />
              <div className="p-3"><div className="font-display font-semibold">{w.name}</div><div className="text-xs font-semibold text-ink-500">{w.tagline}</div></div>
            </div>
          ))}
        </div>

        <h2 className="mt-6 font-display text-xl font-semibold">Careers worth a look</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {careers.map((c) => (
            <div key={c.id} className="rounded-3xl bg-white p-3 shadow-[0_4px_0_#E4DAF7]">
              <CareerAvatar career={c} size={56} />
              <div className="mt-2 font-display font-semibold leading-tight">{c.title}</div>
              <div className="mt-1 text-xs font-extrabold text-grape-500">{matchPct(c, rs)}% early match</div>
            </div>
          ))}
        </div>

        <h2 className="mt-7 font-display text-xl font-semibold">Recommended first steps</h2>
        <ul className="mt-3 space-y-2.5">
          {[
            { g: sim.glyph, t: `Play the ${sim.role} simulation`, s: `${sim.minutes} min · ${sim.title}` },
            { g: careers[0].glyph, t: `Quick lesson: ${careers[0].title}`, s: '90 seconds · myths, routes and pay' },
            { g: 'mic' as const, t: ep.title, s: 'Day in the Life story' },
          ].map((x) => (
            <li key={x.t} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_3px_0_#E4DAF7]"><Glyph name={x.g} size={38} tile /><div><div className="font-bold">{x.t}</div><div className="text-xs font-semibold text-ink-400">{x.s}</div></div></li>
          ))}
        </ul>
        <Button tone="lime" size="lg" full className="mt-8" onClick={start}>Start my journey</Button>
        <p className="mt-3 text-center text-xs font-semibold text-ink-400">Your progress is saved on this device only.</p>
      </div>
    </div>
  );
}
