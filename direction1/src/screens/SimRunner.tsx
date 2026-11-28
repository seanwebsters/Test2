import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ActivityResult, type FeedbackItem } from '../components/ActivityResult';
import { Glyph } from '../components/Glyph';
import { Guide } from '../components/Guide';
import { Icon } from '../components/Icon';
import { Scout } from '../components/Scout';
import { Bubble, Button, Pill, Progress } from '../components/ui';
import type { SkillId } from '../data/types';
import { WORLD_BY_ID } from '../data/worlds';
import { SIM_BY_ID } from '../sims';
import { FloorPlan } from '../sims/FloorPlan';
import { AppPreview, PosterPreview, ScenePreview } from '../sims/Previews';
import { RobotCode } from '../sims/RobotCode';
import type { Answers, Opt, Sim, Step, StepResult } from '../sims/types';
import { useGame, type Reward } from '../store/game';
import { useNav } from '../store/nav';

type Done = { result: StepResult; items: FeedbackItem[] };

function scoreChoice(step: Step & { kind: 'choice' }, o: Opt, a: Answers): Done {
  let s = o.score;
  const notes: string[] = [];
  for (const c of o.combo ?? []) if (c.options.includes(a[c.step] as string)) { s += c.delta; notes.push(c.note); }
  s = Math.max(0, Math.min(3, s));
  const text = [o.feedback, ...notes].filter(Boolean).join(' ');
  return { result: { score: s / 3, feedback: [text], skills: o.skills ?? [] }, items: [{ title: `${step.title}: ${o.label}`, text, good: s >= 2 }] };
}

export function SimRunner({ id }: { id: string }) {
  const sim = SIM_BY_ID[id];
  const plus = useGame((s) => !!s.plus);
  const record = useGame((s) => s.recordActivity);
  const back = useNav((s) => s.back);
  const [run, setRun] = useState(0);
  const steps = useMemo(() => sim.steps.filter((s) => !s.plus || plus), [sim, plus]);
  const [i, setI] = useState(-1);
  const [answers, setAnswers] = useState<Answers>({});
  const [results, setResults] = useState<Record<string, StepResult>>({});
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [pending, setPending] = useState<Done | null>(null);
  const [finish, setFinish] = useState<null | { reward: Reward; activityId: string; skills: SkillId[] }>(null);
  const w = WORLD_BY_ID[sim.world];

  const restart = () => { setRun(run + 1); setI(-1); setAnswers({}); setResults({}); setItems([]); setPending(null); setFinish(null); };

  const commit = (step: Step, value: unknown, done: Done) => {
    setAnswers((a) => ({ ...a, [step.id]: value }));
    setPending(done);
  };
  const advance = () => {
    if (!pending) return;
    const step = steps[i];
    const nextResults = { ...results, [step.id]: pending.result };
    const nextItems = [...items, ...pending.items];
    setResults(nextResults); setItems(nextItems); setPending(null);
    if (i + 1 < steps.length) { setI(i + 1); return; }
    // finished
    const outcome = sim.evaluate?.(answers, nextResults);
    const avg = Object.values(nextResults).reduce((s, r) => s + r.score, 0) / Math.max(1, Object.values(nextResults).length);
    const score = outcome?.bonus !== undefined ? avg * 0.7 + outcome.bonus * 0.3 : avg;
    const skills = [...new Set(Object.values(nextResults).flatMap((r) => r.skills))].slice(0, 6) as SkillId[];
    const { activityId, reward } = record({ kind: 'sim', ref: sim.id, world: sim.world, careerId: sim.careerId, xp: 40 + Math.round(score * 50), score, skills });
    setFinish({ reward, activityId, skills });
  };

  if (finish) {
    const outcome = sim.evaluate?.(answers, results);
    return <ActivityResult key={run} heading="Shift complete!" world={sim.world} careerId={sim.careerId} reward={finish.reward} activityId={finish.activityId}
      skills={finish.skills} feedback={items} outcome={outcome} onAgain={restart} plusTeaser={!plus && sim.steps.some((s) => s.plus)} />;
  }

  if (i === -1) return <Intro sim={sim} onStart={() => setI(0)} />;

  const step = steps[i];
  const good = pending ? pending.result.score >= 0.66 : false;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="sticky top-0 z-20 flex items-center gap-3 bg-white px-4 py-3">
        <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-400 hover:bg-grape-50" aria-label="Quit simulation"><Icon name="close" /></button>
        <Progress value={(i + (pending ? 1 : 0)) / steps.length} color={w.palette.accent} />
        <span className="text-xs font-extrabold text-ink-400">{i + 1}/{steps.length}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step.id} className="flex-1 px-4 pb-48" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          <div className="flex items-center gap-2">
            <Pill color={w.palette.soft} text={w.palette.deep}><Glyph name={sim.glyph} size={16} />{sim.role}</Pill>
            {step.plus && <Pill color="#FFF6D6" text="#8A5A00"><Icon name="crown" size={12} />Expert round</Pill>}
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold leading-tight">{step.title}</h1>
          <p className="mt-1 font-semibold text-ink-500">{step.prompt}</p>
          {step.scout && <div className="mt-3 flex items-center gap-2"><Scout size={40} bob={false} mood="think" /><Bubble className="flex-1 py-2 text-sm">{step.scout}</Bubble></div>}
          <div className="mt-4">
            <StepView key={`${run}-${step.id}`} sim={sim} step={step} answers={answers} locked={!!pending} onCommit={(v, d) => commit(step, v, d)} />
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {pending && (
          <motion.div className={`fixed bottom-0 left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 rounded-t-[2rem] px-5 pb-8 pt-5 ${good ? 'bg-lime-100' : 'bg-sun-100'}`}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} role="status">
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${good ? 'bg-lime-400 text-[#1F3A00]' : 'bg-sun-400 text-[#5A3E00]'}`}><Icon name={good ? 'check' : 'sparkle'} stroke={3} /></span>
              <div>
                <div className={`font-display text-xl font-semibold ${good ? 'text-lime-700' : 'text-sun-600'}`}>{good ? 'Great call!' : pending.result.score >= 0.34 ? 'Interesting choice' : 'Hmm, a pro might do it differently'}</div>
                <p className="mt-1 text-sm font-semibold text-ink-700">{pending.result.feedback.join(' ')}</p>
              </div>
            </div>
            <Button tone={good ? 'lime' : 'sun'} full size="lg" className="mt-4" onClick={advance}>{i + 1 < steps.length ? 'Continue' : 'See results'}</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Intro({ sim, onStart }: { sim: Sim; onStart: () => void }) {
  const w = WORLD_BY_ID[sim.world];
  const back = useNav((s) => s.back);
  const plus = useGame((s) => !!s.plus);
  const n = sim.steps.filter((s) => !s.plus || plus).length;
  return (
    <div className="min-h-screen" style={{ background: w.palette.soft }}>
      <div className="relative overflow-hidden rounded-b-[2.5rem] px-5 pb-8 pt-4 text-white" style={{ background: `linear-gradient(160deg, ${w.palette.accent}, ${w.palette.deep})` }}>
        <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15" aria-label="Back"><Icon name="close" /></button>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.2em] opacity-80">Career simulation</div>
            <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">{sim.title}</h1>
            <p className="mt-1 font-display text-lg opacity-90">You are the {sim.role}</p>
          </div>
          <Guide world={w} size={84} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill color="rgba(255,255,255,.2)" text="#fff"><Icon name="clock" size={14} />~{sim.minutes} min</Pill>
          <Pill color="rgba(255,255,255,.2)" text="#fff">{n} decisions</Pill>
          <Pill color="rgba(255,255,255,.2)" text="#fff"><Icon name="bolt" size={14} />Up to 90 XP</Pill>
        </div>
      </div>
      <div className="space-y-4 px-4 pt-5">
        <div className="rounded-3xl bg-white p-4 shadow-[0_4px_0_rgba(0,0,0,.06)]">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider" style={{ color: w.palette.deep }}><Glyph name="clipboard" size={22} />The brief · {sim.client}</div>
          <p className="mt-2 text-[15px] font-semibold leading-relaxed text-ink-700">{sim.brief}</p>
        </div>
        {sim.disclaimer && <p className="flex gap-2 rounded-2xl bg-white/70 p-3 text-xs font-bold text-ink-500"><Icon name="info" size={16} className="shrink-0" />{sim.disclaimer}</p>}
        <div className="flex items-start gap-2"><Scout size={56} mood="excited" /><Bubble className="flex-1 text-sm">There are no wrong answers here — just choices with consequences. Try what feels right!</Bubble></div>
        <Button tone="lime" size="lg" full onClick={onStart}>Start your shift</Button>
      </div>
    </div>
  );
}

function OptionCard({ o, on, onClick, disabled, extra }: { o: Opt; on: boolean; onClick: () => void; disabled?: boolean; extra?: string }) {
  return (
    <motion.button whileTap={disabled ? undefined : { scale: 0.97 }} onClick={onClick} disabled={disabled} aria-pressed={on}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors ${on ? 'border-grape-500 bg-grape-50 shadow-[0_4px_0_#7C3AED]' : 'border-grape-100 bg-white shadow-[0_4px_0_#EDE4FB]'} disabled:opacity-100`}>
      {o.glyph && <Glyph name={o.glyph} size={42} tile />}
      <span className="min-w-0 flex-1"><span className="block font-display text-[16px] font-semibold leading-tight text-ink-900">{o.label}</span>{(o.detail || extra) && <span className="mt-0.5 block text-sm font-semibold text-ink-500">{o.detail}{extra}</span>}</span>
      {on && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grape-500 text-white"><Icon name="check" size={14} stroke={3} /></span>}
    </motion.button>
  );
}

function PreviewFor({ sim, step, a }: { sim: Sim; step: Step; a: Answers }) {
  if (sim.preview === 'poster' && ['concept', 'visual', 'slogan', 'media', 'expert'].includes(step.id)) return <div className="mb-4"><PosterPreview a={a} /></div>;
  if (sim.preview === 'scene' && step.id !== 'tone') return <div className="mb-4"><ScenePreview a={a} /></div>;
  if (sim.preview === 'app' && step.id === 'features') return <div className="mb-4"><AppPreview a={a} /></div>;
  return null;
}

function StepView({ sim, step, answers, locked, onCommit }: { sim: Sim; step: Step; answers: Answers; locked: boolean; onCommit: (v: unknown, d: Done) => void }) {
  const [sel, setSel] = useState<string[]>([]);
  const [alloc, setAlloc] = useState<Record<string, number>>({});
  const range = step.kind === 'slider' ? step.range(answers) : null;
  const [val, setVal] = useState<number>(range?.initial ?? 0);
  const draft: Answers = { ...answers, ...(step.kind === 'choice' && sel[0] ? { [step.id]: sel[0] } : {}), ...(step.kind === 'multi' ? { [step.id]: sel } : {}) };

  switch (step.kind) {
    case 'choice': return (
      <div>
        <PreviewFor sim={sim} step={step} a={draft} />
        <div className="space-y-2.5">{step.options.map((o) => <OptionCard key={o.id} o={o} on={sel[0] === o.id} disabled={locked} onClick={() => setSel([o.id])} />)}</div>
        {!locked && <StickyCheck disabled={!sel[0]} onClick={() => { const o = step.options.find((x) => x.id === sel[0])!; onCommit(o.id, scoreChoice(step, o, answers)); }} />}
      </div>
    );
    case 'multi': return (
      <div>
        <PreviewFor sim={sim} step={step} a={draft} />
        <p className="mb-2 text-sm font-extrabold text-grape-500">Choose {step.pick} · {sel.length} selected</p>
        <div className="space-y-2.5">{step.options.map((o) => (
          <OptionCard key={o.id} o={o} on={sel.includes(o.id)} disabled={locked} onClick={() => setSel(sel.includes(o.id) ? sel.filter((x) => x !== o.id) : sel.length >= step.pick ? [...sel.slice(1), o.id] : [...sel, o.id])} />
        ))}</div>
        {!locked && <StickyCheck disabled={sel.length !== step.pick} onClick={() => {
          const picked = step.options.filter((o) => sel.includes(o.id));
          const s = picked.reduce((t, o) => t + o.score, 0) / (picked.length * 3);
          onCommit(sel, { result: { score: s, feedback: picked.map((o) => `${o.label}: ${o.feedback}`), skills: picked.flatMap((o) => o.skills ?? []) }, items: picked.map((o) => ({ title: `${step.title}: ${o.label}`, text: o.feedback, good: o.score >= 2 })) });
        }} />}
      </div>
    );
    case 'allocate': {
      const used = Object.values(alloc).reduce((s, v) => s + v, 0);
      const left = step.total - used;
      const stepAmt = step.total >= 5000 ? 500 : 50;
      return (
        <div>
          <div className="mb-3 rounded-2xl bg-cloud p-3 text-center"><span className="text-sm font-bold text-ink-500">Left to spend</span><div className="font-display text-3xl font-semibold text-grape-600">£{left.toLocaleString('en-GB')}</div></div>
          <div className="space-y-3">
            {step.channels.map((c) => {
              const v = alloc[c.id] ?? 0;
              return (
                <div key={c.id} className="rounded-2xl border-2 border-grape-100 bg-white p-3">
                  <div className="flex items-center gap-3"><Glyph name={c.glyph} size={36} tile /><div className="flex-1"><div className="font-display font-semibold">{c.label}</div><div className="text-xs font-semibold text-ink-400">{c.detail}</div></div><div className="font-display text-lg font-semibold">£{v.toLocaleString('en-GB')}</div></div>
                  <input type="range" className="mt-2 w-full" min={0} max={v + left} step={stepAmt} value={v} disabled={locked} aria-label={`Budget for ${c.label}`}
                    onChange={(e) => setAlloc({ ...alloc, [c.id]: Number(e.target.value) })} />
                </div>
              );
            })}
          </div>
          {!locked && <StickyCheck label="Lock in budget" disabled={false} onClick={() => {
            const n = Object.values(alloc).filter((v) => v >= step.total * 0.12).length;
            const spentFrac = used / step.total;
            const s = Math.min(1, 0.3 + n * 0.22 + (spentFrac > 0.6 ? 0.15 : 0));
            const text = used === 0 ? 'You kept all your money. Safe — but nobody will hear about you!' : n >= 2 ? `You spread your budget across ${n} channels — testing several is how pros learn what works.` : 'You went all-in on one channel. Bold! It can pay off, but it’s risky.';
            onCommit(alloc, { result: { score: s, feedback: [text], skills: ['commercial', 'analysis'] }, items: [{ title: step.title, text, good: s >= 0.66 }] });
          }} />}
        </div>
      );
    }
    case 'slider': {
      const r = range!;
      return (
        <div>
          <div className="rounded-3xl bg-cloud p-6 text-center">
            <div className="font-display text-5xl font-semibold text-grape-600">{step.unit}{val.toFixed(r.step < 1 ? 2 : 0)}</div>
            {r.hint && <p className="mt-2 text-sm font-bold text-ink-500">{r.hint}</p>}
            <input type="range" className="mt-5 w-full" min={r.min} max={r.max} step={r.step} value={val} disabled={locked} onChange={(e) => setVal(Number(e.target.value))} aria-label={step.title} />
            <div className="flex justify-between text-xs font-extrabold text-ink-400"><span>{step.unit}{r.min}</span><span>{step.unit}{r.max}</span></div>
          </div>
          {!locked && <StickyCheck label="Set price" disabled={false} onClick={() => { const j = step.judge(val, answers); onCommit(val, { result: { score: j.score, feedback: [j.feedback], skills: ['commercial'] }, items: [{ title: `${step.title}: ${step.unit}${val}`, text: j.feedback, good: j.score >= 0.66 }] }); }} />}
        </div>
      );
    }
    case 'spot': return (
      <div>
        <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2">
          {step.evidence.map((e) => (
            <div key={e.label} className="w-[180px] shrink-0 rotate-[-1deg] rounded-2xl border-2 border-[#E2D3BC] bg-[#FFF9EE] p-3 shadow-[0_3px_0_#E2D3BC] odd:rotate-[1deg]">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#7A4A1E]"><Glyph name={e.glyph} size={24} />{e.label}</div>
              <p className="mt-1.5 text-sm font-semibold text-ink-700">{e.text}</p>
            </div>
          ))}
        </div>
        <h3 className="mt-3 font-display font-semibold">Witness statement</h3>
        <p className="mb-2 text-sm font-extrabold text-grape-500">Tap {step.pick} that don’t add up · {sel.length} selected</p>
        <div className="space-y-2">
          {step.items.map((it) => {
            const on = sel.includes(it.id);
            const reveal = locked;
            return (
              <button key={it.id} disabled={locked} onClick={() => setSel(on ? sel.filter((x) => x !== it.id) : sel.length >= step.pick ? [...sel.slice(1), it.id] : [...sel, it.id])}
                className={`w-full rounded-2xl border-2 p-3 text-left text-[15px] font-semibold ${reveal ? (it.flaw ? 'border-coral-400 bg-coral-100' : on ? 'border-sun-400 bg-sun-100' : 'border-grape-100 bg-white') : on ? 'border-grape-500 bg-grape-50' : 'border-grape-100 bg-white'}`}>
                {it.text}
                {reveal && (it.flaw || on) && <span className="mt-1 block text-xs font-bold text-ink-500">{it.flaw ? '✓ Inconsistent: ' : 'Not a contradiction: '}{it.explain}</span>}
              </button>
            );
          })}
        </div>
        {!locked && <StickyCheck disabled={sel.length !== step.pick} onClick={() => {
          const right = step.items.filter((x) => x.flaw && sel.includes(x.id));
          const s = right.length / step.pick;
          const text = right.length === step.pick ? 'You found every inconsistency. Sharp eyes — that’s what lawyers are paid for.' : `You spotted ${right.length} of ${step.pick}. The flaws were about timing, clothing and weather.`;
          onCommit(sel, { result: { score: s, feedback: [text], skills: ['analysis', 'curiosity'] }, items: step.items.filter((x) => x.flaw).map((x) => ({ title: x.text, text: x.explain, good: sel.includes(x.id) })) });
        }} />}
      </div>
    );
    case 'ask': {
      const asked = sel;
      return (
        <div>
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-sky-100 p-3">
            <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true"><circle cx="30" cy="30" r="28" fill="#8FD3FF" /><circle cx="30" cy="25" r="11" fill="#E8B48A" /><path d="M19 22c0-9 5-13 11-13s11 4 11 13c-4-3-8-4-11-4s-7 1-11 4Z" fill="#2B1A12" /><path d="M12 56c2-12 9-17 18-17s16 5 18 17Z" fill="#FF7A66" /><circle cx="26" cy="26" r="1.5" fill="#1E1A33" /><circle cx="34" cy="26" r="1.5" fill="#1E1A33" /><path d="M27 31h6" stroke="#7A3B2A" strokeWidth="1.6" strokeLinecap="round" /></svg>
            <div><div className="font-display font-semibold">Sam, 19 (fictional)</div><div className="text-xs font-bold text-ink-500">“I’ve just been really tired for weeks.”</div></div>
            <span className="ml-auto rounded-full bg-white px-2 py-1 text-xs font-extrabold text-sky-600">{step.maxAsk - asked.length} left</span>
          </div>
          <div className="space-y-2">
            {step.questions.map((q) => {
              const on = asked.includes(q.id);
              return (
                <div key={q.id}>
                  <button disabled={on || locked || asked.length >= step.maxAsk} onClick={() => setSel([...asked, q.id])}
                    className={`w-full rounded-2xl border-2 p-3 text-left text-[15px] font-bold ${on ? 'border-sky-400 bg-white' : 'border-grape-100 bg-white disabled:opacity-40'}`}>{q.q}</button>
                  {on && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="ml-6 mt-1 rounded-2xl rounded-tl-none bg-sky-100 p-2.5 text-sm font-semibold text-ink-700">{q.a}</motion.p>}
                </div>
              );
            })}
          </div>
          {!locked && <StickyCheck label="Finish history" disabled={asked.length !== step.maxAsk} onClick={() => {
            const useful = step.questions.filter((q) => q.useful && asked.includes(q.id)).length;
            const s = useful / step.maxAsk;
            const text = s === 1 ? 'Every question was clinically useful. Brilliant history-taking.' : `${useful} of your ${step.maxAsk} questions were clinically useful. Focused questions save precious minutes.`;
            onCommit(asked, { result: { score: s, feedback: [text], skills: ['communication', 'empathy', 'analysis'] }, items: [{ title: step.title, text, good: s >= 0.66 }] });
          }} />}
        </div>
      );
    }
    case 'floorplan': return <FloorPlan onSubmit={(r) => { const met = Object.values(r.checks).filter(Boolean).length; const tot = Object.keys(r.checks).length; const miss = Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k.toLowerCase());
      const text = miss.length ? `You met ${met} of ${tot} requirements. Missing: ${miss.join(', ')}.` : 'Every requirement met, within budget. The Okafors will love it.';
      onCommit(r, { result: { score: r.score, feedback: [text], skills: ['problem', 'creativity', 'analysis'] }, items: [{ title: 'Floor plan', text, good: r.score >= 0.66 }] }); }} />;
    case 'code': return <RobotCode onSubmit={(r) => { const text = r.attempts <= 1 ? `First-time success in ${r.length} commands. Clean logic!` : `Solved in ${r.attempts} runs. Debugging — trying, failing, fixing — is the real job.`;
      onCommit(r, { result: { score: r.score, feedback: [text], skills: ['problem', 'digital', 'resilience'] }, items: [{ title: 'Robot program', text, good: r.score >= 0.66 }] }); }} />;
  }
}

function StickyCheck({ disabled, onClick, label = 'Check' }: { disabled: boolean; onClick: () => void; label?: string }) {
  return (
    <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-[440px] -translate-x-1/2 border-t-2 border-grape-50 bg-white px-4 pb-6 pt-3">
      <Button tone="lime" size="lg" full disabled={disabled} onClick={onClick}>{label}</Button>
    </div>
  );
}
