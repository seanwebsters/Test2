import { motion } from 'framer-motion';
import type { Enjoy } from '../store/game';

function Face({ v, on }: { v: Enjoy; on: boolean }) {
  const col = v === 3 ? '#9BE22F' : v === 2 ? '#FFC21A' : '#B794FF';
  const dark = v === 3 ? '#478A06' : v === 2 ? '#C79100' : '#5620B5';
  return (
    <svg viewBox="0 0 60 60" width="56" height="56" aria-hidden="true">
      <circle cx="30" cy="30" r="26" fill={on ? col : '#F1EEF7'} stroke={on ? dark : '#D9D3E6'} strokeWidth="3" />
      <circle cx="21" cy="25" r="3.5" fill="#1E1A33" /><circle cx="39" cy="25" r="3.5" fill="#1E1A33" />
      {v === 3 && <path d="M18 35c4 8 20 8 24 0Z" fill="#1E1A33" />}
      {v === 2 && <path d="M20 38h20" stroke="#1E1A33" strokeWidth="3.5" strokeLinecap="round" />}
      {v === 1 && <path d="M20 41c4-5 16-5 20 0" stroke="#1E1A33" strokeWidth="3.5" strokeLinecap="round" fill="none" />}
    </svg>
  );
}

export function EnjoyFaces({ value, onPick }: { value: Enjoy | null; onPick: (v: Enjoy) => void }) {
  const opts: { v: Enjoy; label: string }[] = [{ v: 1, label: 'Not for me' }, { v: 2, label: 'It was OK' }, { v: 3, label: 'Loved it!' }];
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="How much did you enjoy it?">
      {opts.map((o) => (
        <motion.button key={o.v} whileTap={{ scale: 0.9 }} role="radio" aria-checked={value === o.v} onClick={() => onPick(o.v)}
          className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-3 ${value === o.v ? 'border-grape-400 bg-grape-50' : 'border-transparent'}`}>
          <motion.span animate={value === o.v ? { scale: [1, 1.25, 1], rotate: [0, -8, 0] } : {}}><Face v={o.v} on={value === o.v || value === null} /></motion.span>
          <span className="text-xs font-extrabold text-ink-700">{o.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
