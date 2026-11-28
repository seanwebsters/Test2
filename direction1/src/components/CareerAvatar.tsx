import { WORLD_BY_ID } from '../data/worlds';
import type { Career } from '../data/types';
import { Glyph } from './Glyph';

const SKIN = ['#F6D2B5', '#E8B48A', '#C98E5F', '#9A6440', '#6B4228'];
const HAIR = ['#2B1A12', '#5A3520', '#A0522D', '#E3B04B', '#7C3AED', '#1E1A33', '#FF7A66'];
const h = (s: string) => { let x = 7; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };

/** Illustrated career character, generated consistently from the career id. */
export function CareerAvatar({ career, size = 72, badge = true }: { career: Career; size?: number; badge?: boolean }) {
  const w = WORLD_BY_ID[career.world];
  const k = h(career.id);
  const skin = SKIN[k % SKIN.length];
  const hair = HAIR[(k >> 3) % HAIR.length];
  const style = (k >> 6) % 4;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <defs><clipPath id={`av-${career.id}`}><rect width="100" height="100" rx="30" /></clipPath></defs>
        <g clipPath={`url(#av-${career.id})`}>
          <rect width="100" height="100" fill={w.palette.sky} />
          <circle cx="78" cy="22" r="14" fill={w.palette.land2} opacity=".5" />
          <path d="M14 104c0-22 16-34 36-34s36 12 36 34Z" fill={w.palette.accent} />
          <path d="M40 72l10 12 10-12" fill="#fff" opacity=".9" />
          <rect x="43" y="56" width="14" height="16" rx="6" fill={skin} />
          {style === 1 && <path d="M26 48c0-18 10-28 24-28s24 10 24 28v24c-6-2-8-8-8-14H34c0 6-2 12-8 14Z" fill={hair} />}
          <ellipse cx="50" cy="46" rx="19" ry="21" fill={skin} />
          {style === 0 && <path d="M31 42c0-14 8-22 19-22s19 8 19 22c-6-6-14-8-22-6-6 1-11 3-16 6Z" fill={hair} />}
          {style === 1 && <path d="M31 40c2-12 10-18 19-18s17 6 19 18c-10-6-26-6-38 0Z" fill={hair} />}
          {style === 2 && <><circle cx="50" cy="22" r="9" fill={hair} /><path d="M31 42c0-14 8-20 19-20s19 6 19 20c-12-8-26-8-38 0Z" fill={hair} /></>}
          {style === 3 && <path d="M29 46c-2-16 6-26 21-26s23 10 21 26c-2-6-4-10-8-12-4 4-22 4-26 0-4 2-6 6-8 12Z" fill={hair} />}
          <circle cx="43" cy="48" r="2.6" fill="#1E1A33" /><circle cx="57" cy="48" r="2.6" fill="#1E1A33" />
          <circle cx="44" cy="47" r=".9" fill="#fff" /><circle cx="58" cy="47" r=".9" fill="#fff" />
          <path d="M45 56c3 3 7 3 10 0" stroke="#7A3B2A" strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="38" cy="54" rx="3.5" ry="2" fill="#FF8FB8" opacity=".6" /><ellipse cx="62" cy="54" rx="3.5" ry="2" fill="#FF8FB8" opacity=".6" />
        </g>
      </svg>
      {badge && (
        <div className="absolute -bottom-1 -right-1 rounded-xl bg-white p-0.5 shadow-sm" style={{ width: size * 0.42, height: size * 0.42 }}>
          <Glyph name={career.glyph} size={size * 0.42 - 4} />
        </div>
      )}
    </div>
  );
}
