import { AnimatePresence, motion } from 'framer-motion';
import { Glyph } from '../components/Glyph';
import type { Answers } from './types';

const VIS: Record<string, { bg: string; can: string; ink: string; font: string }> = {
  neon: { bg: 'linear-gradient(135deg,#1E1A33,#5B2A86)', can: 'linear-gradient(#FF4F8B,#FFD23F)', ink: '#9BE22F', font: 'italic' },
  pastel: { bg: 'linear-gradient(135deg,#FFE3F1,#E0F3FF)', can: 'linear-gradient(#B794FF,#8FD3FF)', ink: '#5620B5', font: 'normal' },
  mono: { bg: '#111', can: 'linear-gradient(#fff,#ddd)', ink: '#FF5A45', font: 'normal' },
  retro: { bg: 'linear-gradient(135deg,#FF9A2E,#C2621A)', can: 'linear-gradient(#FFE066,#FF7A66)', ink: '#FFF6D6', font: 'normal' },
};
const SLOGAN: Record<string, string> = { s1: 'Glow on.', s2: 'Refreshingly sugar-free sparkling fruit beverage.', s3: 'For the little moments.', s4: 'Drink Glow. Be better.' };
const CONCEPT: Record<string, string> = { main: 'Main Character Energy', fuel: 'Fuel the Grind', tiny: 'Tiny Joys', science: 'Lab-Tested Refreshment' };

export function PosterPreview({ a }: { a: Answers }) {
  const v = VIS[(a.visual as string) ?? 'pastel'] ?? VIS.pastel;
  const dark = (a.visual as string) === 'neon' || (a.visual as string) === 'mono';
  return (
    <div className="mx-auto flex aspect-[4/3] w-full max-w-[340px] items-center gap-4 overflow-hidden rounded-3xl p-5 shadow-lg transition-all duration-500" style={{ background: v.bg }}>
      <motion.div key={a.visual as string} initial={{ y: 12, rotate: -10 }} animate={{ y: 0, rotate: -6 }} className="relative h-[170px] w-[92px] shrink-0 rounded-[18px] border-2 border-black/10 shadow-xl" style={{ backgroundImage: v.can, backgroundColor: '#B794FF' }}>
        <div className="absolute inset-x-0 top-2 mx-auto h-2 w-1/2 rounded-full bg-black/15" />
        <div className="absolute inset-x-0 top-1/3 text-center font-display text-xl font-bold" style={{ color: dark && a.visual === 'mono' ? '#111' : '#fff', textShadow: '0 2px 0 rgba(0,0,0,.15)' }}>GLOW</div>
        <div className="absolute inset-x-0 bottom-3 text-center text-[9px] font-extrabold uppercase tracking-widest text-black/40">no added sugar</div>
      </motion.div>
      <div className="min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: dark ? '#ffffff99' : '#00000066' }}>{CONCEPT[a.concept as string] ?? 'Your concept'}</div>
        <AnimatePresence mode="wait"><motion.div key={a.slogan as string} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-1 font-display text-2xl font-bold leading-tight" style={{ color: v.ink, fontStyle: v.font }}>
          {SLOGAN[a.slogan as string] ?? 'Your slogan here'}
        </motion.div></AnimatePresence>
        <div className="mt-2 text-[11px] font-bold" style={{ color: dark ? '#ffffffaa' : '#00000080' }}>Fizz & Co. · fictional brand</div>
      </div>
    </div>
  );
}

const LIGHT: Record<string, string> = { golden: 'linear-gradient(#FFB86B,#FF7A66 70%,#6B3207)', blue: 'linear-gradient(#123F8C,#3E5FA8 60%,#0B1B3A)', bright: 'linear-gradient(#4FB8FF,#B7EF5A 70%,#5FAE0E)' };
export function ScenePreview({ a }: { a: Answers }) {
  const shot = (a.shot as string) ?? 'wide';
  const scale = shot === 'close' ? 2.6 : shot === 'handheld' ? 1.5 : 0.8;
  const ending = a.ending as string;
  const gap = ending === 'hug' ? 6 : ending === 'spin' ? 2 : ending === 'hesitate' ? 26 : 60;
  return (
    <div className="relative mx-auto aspect-video w-full max-w-[360px] overflow-hidden rounded-2xl bg-black shadow-lg">
      <motion.div className="absolute inset-0" animate={{ background: LIGHT[(a.light as string) ?? 'golden'] ?? LIGHT.golden }} style={{ background: LIGHT.golden }} />
      {/* platform */}
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-black/35" />
      <div className="absolute inset-x-0 bottom-[30%] h-1 bg-white/30" />
      {shot === 'wide' && <div className="absolute bottom-[30%] left-0 right-0 flex justify-around opacity-50">{Array.from({ length: 9 }).map((_, i) => <span key={i} className="block h-6 w-2 rounded-t-full bg-black/60" />)}</div>}
      <motion.div className="absolute bottom-[18%] left-1/2 flex items-end" animate={{ x: '-50%', scale, gap, rotate: shot === 'handheld' ? [-1.5, 1.5, -1.5] : 0 }} transition={{ type: 'spring', stiffness: 80, damping: 14, rotate: { repeat: Infinity, duration: 0.6 } }} style={{ originY: 1 }}>
        <svg viewBox="0 0 20 40" width="20" height="40"><circle cx="10" cy="7" r="6" fill="#1E1A33" /><path d="M2 40c0-16 4-24 8-24s8 8 8 24Z" fill="#1E1A33" /></svg>
        <svg viewBox="0 0 20 40" width="20" height="40" style={{ marginLeft: gap }}><circle cx="10" cy="7" r="6" fill="#2B2347" /><path d="M2 40c0-16 4-24 8-24s8 8 8 24Z" fill="#2B2347" /></svg>
      </motion.div>
      {a.sound === 'strings' && <div className="absolute right-3 top-8"><Glyph name="music" size={28} /></div>}
      {a.sound === 'pop' && <div className="absolute right-3 top-8"><Glyph name="mic" size={28} /></div>}
      {a.sound === 'silence' && <div className="absolute right-3 top-8 rounded bg-black/40 px-1.5 text-[10px] font-extrabold text-white">SILENCE</div>}
      <div className="absolute inset-x-0 top-0 h-[10%] bg-black" /><div className="absolute inset-x-0 bottom-0 h-[10%] bg-black" />
      <div className="absolute left-2 top-[11%] flex items-center gap-1 text-[10px] font-extrabold text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-coral-500" />REC · SC 12 · TK 1</div>
    </div>
  );
}

const FEAT: Record<string, { label: string; color: string }> = {
  streaks: { label: '', color: '#FF7A1A' }, remind: { label: '', color: '#F0A000' }, stats: { label: '', color: '#0FA38A' },
  social: { label: '', color: '#1CA0F2' }, ai: { label: '', color: '#7C3AED' }, themes: { label: '', color: '#FF4F8B' },
};
const FEAT_NAME: Record<string, string> = { streaks: '7-day streak', remind: 'Reminder · 8pm', stats: 'This week', social: 'Friends', ai: 'AI coach', themes: 'Themes' };
const FEAT_GLYPH = { streaks: 'bolt', remind: 'bulb', stats: 'chart', social: 'friends', ai: 'brain', themes: 'palette' } as const;
export function AppPreview({ a }: { a: Answers }) {
  const f = ((a.features as string[]) ?? []).filter((x) => x in FEAT);
  return (
    <div className="mx-auto w-[190px] rounded-[2rem] border-[6px] border-ink-900 bg-white p-3 shadow-lg">
      <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-ink-900" />
      <div className="font-display text-base font-semibold text-grape-600">Streakly</div>
      <div className="mt-1 rounded-xl bg-grape-50 p-2 text-[11px] font-bold">Drink water · Read 10 pages</div>
      <div className="mt-2 space-y-1.5">
        <AnimatePresence>
          {f.map((k) => (
            <motion.div key={k} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 rounded-xl p-1.5 text-[11px] font-extrabold text-white" style={{ background: FEAT[k].color }}>
              <Glyph name={FEAT_GLYPH[k as keyof typeof FEAT_GLYPH]} size={20} />{FEAT_NAME[k]}
            </motion.div>
          ))}
        </AnimatePresence>
        {f.length === 0 && <div className="py-4 text-center text-[11px] font-bold text-ink-300">Pick features to see them here</div>}
      </div>
    </div>
  );
}
