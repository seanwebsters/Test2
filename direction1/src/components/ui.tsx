import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ACHIEVEMENTS } from '../data/gamification';
import { useGame, useLevel } from '../store/game';
import { useNav } from '../store/nav';
import { Glyph } from './Glyph';
import { Icon } from './Icon';

type Tone = 'grape' | 'lime' | 'sun' | 'sky' | 'coral' | 'white' | 'ghost';
const TONES: Record<Tone, string> = {
  grape: 'bg-grape-500 text-white shadow-[0_5px_0_#41188A] active:shadow-[0_1px_0_#41188A]',
  lime: 'bg-lime-400 text-[#1F3A00] shadow-[0_5px_0_#478A06] active:shadow-[0_1px_0_#478A06]',
  sun: 'bg-sun-400 text-[#5A3E00] shadow-[0_5px_0_#C79100] active:shadow-[0_1px_0_#C79100]',
  sky: 'bg-sky-500 text-white shadow-[0_5px_0_#0C5E99] active:shadow-[0_1px_0_#0C5E99]',
  coral: 'bg-coral-500 text-white shadow-[0_5px_0_#B02A1A] active:shadow-[0_1px_0_#B02A1A]',
  white: 'bg-white text-grape-700 border-2 border-grape-100 shadow-[0_4px_0_#E4DAF7] active:shadow-[0_1px_0_#E4DAF7]',
  ghost: 'bg-transparent text-grape-600 shadow-none',
};

export function Button({ tone = 'grape', className = '', children, full, size = 'md', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; full?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'h-14 px-6 text-lg' : size === 'sm' ? 'h-10 px-4 text-sm' : 'h-12 px-5 text-base';
  return (
    <button
      {...rest}
      className={`chunky ${TONES[tone]} ${sz} ${full ? 'w-full' : ''} inline-flex select-none items-center justify-center gap-2 rounded-2xl font-display font-semibold tracking-wide transition-[transform,box-shadow] active:translate-y-1 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  );
}

export function Progress({ value, color = '#9BE22F', track = '#EDE7F8', h = 14, className = '' }: { value: number; color?: string; track?: string; h?: number; className?: string }) {
  return (
    <div className={`relative w-full overflow-hidden rounded-full ${className}`} style={{ height: h, background: track }} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={false} animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} transition={{ type: 'spring', stiffness: 90, damping: 18 }}>
        <div className="mx-2 mt-[3px] h-[4px] rounded-full bg-white/40" />
      </motion.div>
    </div>
  );
}

export function Stats({ dark = false }: { dark?: boolean }) {
  const streak = useGame((s) => s.streak.count);
  const sparks = useGame((s) => s.sparks);
  const plus = useGame((s) => s.plus);
  const { level } = useLevel();
  const push = useNav((s) => s.push);
  const base = dark ? 'bg-white/15 text-white' : 'bg-white text-ink-900 shadow-sm';
  return (
    <div className="flex items-center gap-2">
      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-extrabold ${base}`} title="Daily streak"><Icon name="flame" size={18} className="text-coral-500" />{streak}</span>
      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-extrabold ${base}`} title="Sparks"><Icon name="gem" size={16} className="text-sky-500" />{sparks}</span>
      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-extrabold ${base}`} title="Level"><Icon name="bolt" size={16} className="text-sun-500" />Lv {level}</span>
      {!plus && <button onClick={() => push({ name: 'plus' })} aria-label="Direction Plus" className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sun-300 to-coral-400 text-white shadow-sm"><Icon name="crown" size={16} /></button>}
    </div>
  );
}

export function Header({ title, onBack, right, tint = 'white' }: { title?: ReactNode; onBack?: () => void; right?: ReactNode; tint?: string }) {
  const back = useNav((s) => s.back);
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center gap-2 px-3" style={{ background: tint }}>
      <button onClick={onBack ?? back} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-black/5" aria-label="Back"><Icon name="back" /></button>
      <div className="min-w-0 flex-1 truncate font-display text-lg font-semibold text-ink-900">{title}</div>
      {right}
    </div>
  );
}

export function Pill({ children, color = '#F5F0FF', text = '#5620B5', className = '' }: { children: ReactNode; color?: string; text?: string; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${className}`} style={{ background: color, color: text }}>{children}</span>;
}

export function Section({ title, action, children, className = '' }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mt-6 ${className}`}>
      <div className="mb-3 flex items-end justify-between px-4"><h2 className="font-display text-xl font-semibold text-ink-900">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export function Bubble({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-3xl border-2 border-grape-100 bg-white px-4 py-3 font-semibold text-ink-900 shadow-[0_4px_0_#EDE4FB] ${className}`}>
      {children}
      <span className="absolute -left-2 top-6 h-4 w-4 rotate-45 border-b-2 border-l-2 border-grape-100 bg-white" />
    </div>
  );
}

const COLORS = ['#7C3AED', '#9BE22F', '#FFC21A', '#1CA0F2', '#FF5A45', '#FF4F8B'];
export function Confetti({ n = 60 }: { n?: number }) {
  const reduced = useGame((s) => s.reducedMotion);
  if (reduced) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => {
        const x = Math.random() * 100;
        const d = 1.6 + Math.random() * 1.6;
        const r = Math.random() * 720 - 360;
        const s = 6 + Math.random() * 8;
        return (
          <motion.span key={i} className="absolute top-[-20px] block"
            style={{ left: `${x}%`, width: s, height: s * (i % 3 ? 0.5 : 1), background: COLORS[i % COLORS.length], borderRadius: i % 2 ? 99 : 2 }}
            initial={{ y: -20, opacity: 1, rotate: 0 }} animate={{ y: '110vh', x: (Math.random() - 0.5) * 160, rotate: r, opacity: [1, 1, 0.8] }} transition={{ duration: d, delay: Math.random() * 0.4, ease: 'easeIn' }} />
        );
      })}
    </div>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  const t = toasts[0];
  useEffect(() => {
    if (!t) return;
    const id = window.setTimeout(() => dismiss(t.id), 3200);
    return () => window.clearTimeout(id);
  }, [t, dismiss]);
  const a = t?.achievement ? ACHIEVEMENTS.find((x) => x.id === t.achievement) : undefined;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] mx-auto flex max-w-[440px] justify-center px-4">
      <AnimatePresence>
        {t && (
          <motion.button key={t.id} onClick={() => dismiss(t.id)} className="pointer-events-auto flex w-full items-center gap-3 rounded-3xl border-2 border-sun-300 bg-white p-3 text-left shadow-xl"
            initial={{ y: -80, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -80, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
            {a ? <Glyph name={a.glyph} size={44} tile={a.color + '22'} /> : <Glyph name="star" size={44} tile="#F5F0FF" />}
            <div className="min-w-0">
              <div className="text-xs font-extrabold uppercase tracking-wider text-sun-600">{a ? 'Achievement unlocked' : 'Nice!'}</div>
              <div className="font-display text-base font-semibold text-ink-900">{a ? a.title : t.text}</div>
              {a && <div className="text-xs font-semibold text-ink-500">{a.desc}{a.reward ? ' · new outfit for Scout!' : ''}</div>}
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] mx-auto flex max-w-[440px] items-end bg-ink-900/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" className="max-h-[85vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 pb-8" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink-300/50" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
