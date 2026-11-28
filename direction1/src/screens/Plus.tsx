import { motion } from 'framer-motion';
import { useState } from 'react';
import { Glyph } from '../components/Glyph';
import { Icon } from '../components/Icon';
import { Scout } from '../components/Scout';
import { Button, Confetti } from '../components/ui';
import type { GlyphName } from '../data/types';
import { useGame } from '../store/game';
import { useNav } from '../store/nav';

const PERKS: [GlyphName, string, string][] = [
  ['gamepad', 'Deeper simulations', 'Expert rounds in every simulation with trickier, real-world curveballs.'],
  ['chat', 'Extended Scout coaching', 'Longer, more detailed planning conversations.'],
  ['map', 'Advanced roadmaps', 'Compare routes side by side, month-by-month plans.'],
  ['book', 'More learning content', 'Extra lessons and Day in the Life episodes.'],
  ['crown', 'Exclusive Scout outfits', 'A golden crown and more, just for Plus explorers.'],
];

export function PlusScreen() {
  const plus = useGame((s) => s.plus);
  const setPlus = useGame((s) => s.setPlus);
  const toast = useGame((s) => s.toast);
  const back = useNav((s) => s.back);
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [done, setDone] = useState(false);

  if (plus || done) return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-grape-600 to-grape-800 px-6 pt-12 text-center text-white">
      {done && <Confetti />}
      <Scout size={140} mood="cheer" hat="crown" />
      <h1 className="mt-4 font-display text-3xl font-semibold">You’re on Direction Plus</h1>
      <p className="mt-2 font-semibold text-grape-100">{plus?.plan === 'partner' ? 'Provided by your school partner.' : `Plan: ${plus?.plan === 'yearly' ? '£49.99 / year' : '£6.99 / month'} (prototype — no payment taken).`}</p>
      <div className="mt-8 w-full space-y-3">
        <Button tone="white" full onClick={back}>Back to exploring</Button>
        {plus?.plan !== 'partner' && <button onClick={() => { setPlus(null); setDone(false); toast('Plus cancelled (prototype)'); }} className="w-full py-2 text-sm font-bold text-grape-200 underline">Cancel subscription</button>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-grape-600 via-grape-600 to-grape-800 pb-10 text-white">
      <div className="flex justify-end p-3"><button onClick={back} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><Icon name="close" /></button></div>
      <div className="px-5 text-center">
        <Scout size={110} mood="excited" hat="crown" className="mx-auto" />
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sun-400 px-3 py-1 font-display text-sm font-semibold text-[#5A3E00]"><Icon name="crown" size={16} />Direction Plus</div>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">Go deeper, whenever you’re ready</h1>
        <p className="mt-2 font-semibold text-grape-100">Core career discovery is — and always will be — free. Plus is for when you want more.</p>
      </div>
      <ul className="mx-4 mt-6 space-y-2.5">
        {PERKS.map(([g, t, d], i) => (
          <motion.li key={t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
            <Glyph name={g} size={40} tile="#ffffff" /><div><div className="font-display font-semibold">{t}</div><div className="text-sm font-semibold text-grape-100">{d}</div></div>
          </motion.li>
        ))}
      </ul>
      <div className="mx-4 mt-6 grid grid-cols-2 gap-3">
        {([['yearly', '£49.99', 'per year', 'Save 40% · £4.17/mo'], ['monthly', '£6.99', 'per month', 'Cancel anytime']] as const).map(([id, p, per, note]) => (
          <button key={id} onClick={() => setPlan(id)} aria-pressed={plan === id} className={`relative rounded-3xl border-4 p-4 text-left ${plan === id ? 'border-lime-400 bg-white text-ink-900' : 'border-white/20 bg-white/5'}`}>
            {id === 'yearly' && <span className="absolute -top-3 left-3 rounded-full bg-lime-400 px-2 py-0.5 text-[11px] font-extrabold text-[#1F3A00]">Best value</span>}
            <div className="text-xs font-extrabold uppercase tracking-wider opacity-70">{id}</div>
            <div className="font-display text-2xl font-semibold">{p}</div><div className="text-sm font-bold opacity-70">{per}</div>
            <div className={`mt-1 text-xs font-extrabold ${plan === id ? 'text-lime-700' : 'text-lime-300'}`}>{note}</div>
          </button>
        ))}
      </div>
      <div className="mx-4 mt-5">
        <Button tone="lime" size="lg" full onClick={() => { setPlus(plan); setDone(true); }}>Start Plus (prototype)</Button>
        <p className="mt-3 text-center text-xs font-semibold text-grape-200">Prototype only: no payment is taken and nothing is charged. In a live app this would use App Store / Google Play billing. Schools and employers can provide Plus for free.</p>
        <button onClick={back} className="mt-2 w-full py-2 text-sm font-extrabold text-white/80">Maybe later</button>
      </div>
    </div>
  );
}
