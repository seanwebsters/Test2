import { motion } from 'framer-motion';
import type { World } from '../data/types';
import { Hat } from './Hat';

/** Each world's supporting character: same family as Scout, different species. */
export function Guide({ world, size = 80 }: { world: World; size?: number }) {
  const p = world.palette;
  const ears = world.guide.ears;
  const body = p.land;
  const dark = p.deep;
  return (
    <motion.svg viewBox="0 -10 120 140" width={size} height={size * 1.17} aria-label={`${world.guide.name} the ${world.guide.species}`} role="img"
      animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
      <ellipse cx="60" cy="125" rx="28" ry="5" fill="#2B2347" opacity=".12" />
      {ears === 'cat' && <><path d="M30 46L26 14l24 18Z" fill={body} stroke={dark} strokeWidth="3" strokeLinejoin="round" /><path d="M90 46l4-32-24 18Z" fill={body} stroke={dark} strokeWidth="3" strokeLinejoin="round" /></>}
      {ears === 'bunny' && <><ellipse cx="44" cy="16" rx="8" ry="24" fill={body} stroke={dark} strokeWidth="3" /><ellipse cx="76" cy="16" rx="8" ry="24" fill={body} stroke={dark} strokeWidth="3" /><ellipse cx="44" cy="16" rx="3.5" ry="16" fill="#FFD0E1" /><ellipse cx="76" cy="16" rx="3.5" ry="16" fill="#FFD0E1" /></>}
      {ears === 'antenna' && <><path d="M60 30V6" stroke={dark} strokeWidth="3" /><circle cx="60" cy="5" r="6" fill={p.accent} stroke={dark} strokeWidth="2.5" /></>}
      {ears === 'leaf' && <><path d="M36 40C22 32 18 18 22 8c12 4 20 16 20 28Z" fill="#7ED321" stroke="#478A06" strokeWidth="2.5" /><path d="M84 40c14-8 18-22 14-32-12 4-20 16-20 28Z" fill="#7ED321" stroke="#478A06" strokeWidth="2.5" /></>}
      {ears === 'round' && <><circle cx="32" cy="38" r="12" fill={body} stroke={dark} strokeWidth="3" /><circle cx="88" cy="38" r="12" fill={body} stroke={dark} strokeWidth="3" /></>}
      {ears === 'horn' && <><path d="M34 40l-6-24 18 14Z" fill={dark} /><path d="M86 40l6-24-18 14Z" fill={dark} /></>}
      <rect x="22" y="28" width="76" height="94" rx="38" fill={body} stroke={dark} strokeWidth="3" />
      <ellipse cx="60" cy="96" rx="24" ry="20" fill="#fff" opacity=".45" />
      <ellipse cx="46" cy="62" rx="10" ry="11" fill="#fff" stroke={dark} strokeWidth="2.5" />
      <ellipse cx="74" cy="62" rx="10" ry="11" fill="#fff" stroke={dark} strokeWidth="2.5" />
      <circle cx="47" cy="64" r="6" fill="#1E1A33" /><circle cx="73" cy="64" r="6" fill="#1E1A33" />
      <circle cx="49" cy="61" r="2.4" fill="#fff" /><circle cx="75" cy="61" r="2.4" fill="#fff" />
      <path d="M53 78c3 4 11 4 14 0" stroke={dark} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="36" cy="76" rx="5" ry="3" fill="#FF8FB8" opacity=".7" /><ellipse cx="84" cy="76" rx="5" ry="3" fill="#FF8FB8" opacity=".7" />
      {world.guide.hat && <g transform="translate(0 4)"><Hat id={world.guide.hat} /></g>}
    </motion.svg>
  );
}
