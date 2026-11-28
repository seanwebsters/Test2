import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { HatId } from '../data/types';
import { useGame } from '../store/game';
import { Hat } from './Hat';

export type Mood = 'happy' | 'excited' | 'think' | 'wave' | 'cheer' | 'calm';

/**
 * Scout: a small purple explorer with tall tufted ears, huge eyes,
 * a lime scarf and an orange explorer backpack.
 */
export function Scout({ size = 120, mood = 'happy', hat, bob = true, className }: { size?: number; mood?: Mood; hat?: HatId; bob?: boolean; className?: string }) {
  const equipped = useGame((s) => s.hat);
  const reduced = useGame((s) => s.reducedMotion);
  const h = hat ?? equipped;
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let t: number;
    const loop = () => { t = window.setTimeout(() => { setBlink(true); window.setTimeout(() => setBlink(false), 140); loop(); }, 2400 + Math.random() * 2600); };
    loop();
    return () => window.clearTimeout(t);
  }, []);
  const look = mood === 'think' ? { x: 3, y: -4 } : { x: 0, y: 0 };
  const armL = mood === 'cheer' ? -130 : 0;
  const armR = mood === 'wave' ? -120 : mood === 'cheer' ? 130 : mood === 'think' ? -70 : 0;

  return (
    <motion.svg
      viewBox="0 -14 120 150" width={size} height={size * 1.25} className={className} role="img" aria-label="Scout, your explorer guide"
      animate={bob && !reduced ? { y: [0, -4, 0] } : undefined}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* shadow */}
      <ellipse cx="60" cy="131" rx="30" ry="5" fill="#2B2347" opacity=".12" />
      {/* backpack (behind) */}
      <rect x="78" y="62" width="26" height="40" rx="9" fill="#FF9A2E" stroke="#C2621A" strokeWidth="3" />
      <rect x="84" y="72" width="16" height="12" rx="4" fill="#FFC928" stroke="#C2621A" strokeWidth="2.5" />
      <path d="M86 58c0-6 10-6 10 0v6" fill="none" stroke="#C2621A" strokeWidth="3" />
      {/* ears */}
      <path d="M30 52C20 34 20 14 28 2c8 10 16 26 18 40Z" fill="#7C3AED" stroke="#41188A" strokeWidth="3" strokeLinejoin="round" />
      <path d="M90 52c10-18 10-38 2-50-8 10-16 26-18 40Z" fill="#7C3AED" stroke="#41188A" strokeWidth="3" strokeLinejoin="round" />
      <path d="M31 42c-4-10-4-22 0-30 4 8 8 17 9 26Z" fill="#FF8FB8" />
      <path d="M89 42c4-10 4-22 0-30-4 8-8 17-9 26Z" fill="#FF8FB8" />
      {/* arms */}
      <motion.g style={{ originX: '26px', originY: '78px' }} animate={{ rotate: armL }} transition={{ type: 'spring', stiffness: 120, damping: 10 }}>
        <path d="M28 76c-10 4-14 14-12 22" stroke="#41188A" strokeWidth="13" strokeLinecap="round" fill="none" />
        <path d="M28 76c-10 4-14 14-12 22" stroke="#7C3AED" strokeWidth="8" strokeLinecap="round" fill="none" />
      </motion.g>
      <motion.g style={{ originX: '94px', originY: '78px' }}
        animate={mood === 'wave' && !reduced ? { rotate: [armR, armR - 25, armR] } : { rotate: armR }}
        transition={mood === 'wave' ? { duration: 0.6, repeat: Infinity } : { type: 'spring', stiffness: 120, damping: 10 }}>
        <path d="M92 76c10 4 14 14 12 22" stroke="#41188A" strokeWidth="13" strokeLinecap="round" fill="none" />
        <path d="M92 76c10 4 14 14 12 22" stroke="#7C3AED" strokeWidth="8" strokeLinecap="round" fill="none" />
      </motion.g>
      {/* body */}
      <path d="M60 28c26 0 38 22 38 52 0 30-16 46-38 46S22 110 22 80c0-30 12-52 38-52Z" fill="#7C3AED" stroke="#41188A" strokeWidth="3" />
      <path d="M60 78c14 0 22 10 22 22s-9 20-22 20-22-8-22-20 8-22 22-22Z" fill="#B794FF" />
      <path d="M36 50c4-8 12-13 20-14" stroke="#9A66FF" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* straps */}
      <path d="M80 60c2 14 0 30-4 44" stroke="#FFC928" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* scarf */}
      <path d="M33 74c16 8 38 8 54 0l-2 9c-16 7-34 7-50 0Z" fill="#9BE22F" stroke="#478A06" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M44 82l-4 16 9-3 2-12" fill="#9BE22F" stroke="#478A06" strokeWidth="2.5" strokeLinejoin="round" />
      {/* face */}
      <g>
        <ellipse cx="45" cy="58" rx="12" ry={blink ? 1.5 : 13} fill="#fff" stroke="#41188A" strokeWidth="2.5" />
        <ellipse cx="75" cy="58" rx="12" ry={blink ? 1.5 : 13} fill="#fff" stroke="#41188A" strokeWidth="2.5" />
        {!blink && <>
          <circle cx={46 + look.x} cy={60 + look.y} r={mood === 'excited' ? 8 : 7} fill="#1E1A33" />
          <circle cx={74 + look.x} cy={60 + look.y} r={mood === 'excited' ? 8 : 7} fill="#1E1A33" />
          <circle cx={49 + look.x} cy={56 + look.y} r="3" fill="#fff" />
          <circle cx={77 + look.x} cy={56 + look.y} r="3" fill="#fff" />
          <circle cx={44 + look.x} cy={63 + look.y} r="1.3" fill="#fff" />
          <circle cx={72 + look.x} cy={63 + look.y} r="1.3" fill="#fff" />
        </>}
        <ellipse cx="34" cy="70" rx="5" ry="3" fill="#FF8FB8" opacity=".8" />
        <ellipse cx="86" cy="70" rx="5" ry="3" fill="#FF8FB8" opacity=".8" />
        <path d="M57 67l3 3 3-3Z" fill="#FF7A66" stroke="#B02A1A" strokeWidth="1.5" strokeLinejoin="round" />
        {mood === 'excited' || mood === 'cheer'
          ? <path d="M52 72c2 7 14 7 16 0Z" fill="#B02A1A" stroke="#41188A" strokeWidth="2" strokeLinejoin="round" />
          : mood === 'think'
            ? <path d="M55 74h9" stroke="#41188A" strokeWidth="2.5" strokeLinecap="round" />
            : <path d="M53 72c3 4 11 4 14 0" stroke="#41188A" strokeWidth="2.5" strokeLinecap="round" fill="none" />}
      </g>
      {/* feet */}
      <ellipse cx="46" cy="126" rx="10" ry="5" fill="#5620B5" />
      <ellipse cx="74" cy="126" rx="10" ry="5" fill="#5620B5" />
      {/* hat */}
      <g transform="translate(0 2)"><Hat id={h} /></g>
      {mood === 'excited' && <g fill="#FFC928"><path d="M12 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" /><path d="M106 22l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" /></g>}
    </motion.svg>
  );
}

export function ScoutFace({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="14 -2 92 92" width={size} height={size} aria-hidden="true">
      <path d="M30 52C20 34 20 14 28 2c8 10 16 26 18 40Z" fill="#7C3AED" stroke="#41188A" strokeWidth="3" strokeLinejoin="round" />
      <path d="M90 52c10-18 10-38 2-50-8 10-16 26-18 40Z" fill="#7C3AED" stroke="#41188A" strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 28c26 0 38 22 38 44 0 10-4 14-38 14S22 82 22 72c0-22 12-44 38-44Z" fill="#7C3AED" stroke="#41188A" strokeWidth="3" />
      <ellipse cx="45" cy="58" rx="12" ry="13" fill="#fff" stroke="#41188A" strokeWidth="2.5" />
      <ellipse cx="75" cy="58" rx="12" ry="13" fill="#fff" stroke="#41188A" strokeWidth="2.5" />
      <circle cx="46" cy="60" r="7" fill="#1E1A33" /><circle cx="74" cy="60" r="7" fill="#1E1A33" />
      <circle cx="49" cy="56" r="3" fill="#fff" /><circle cx="77" cy="56" r="3" fill="#fff" />
      <path d="M53 74c3 4 11 4 14 0" stroke="#41188A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
