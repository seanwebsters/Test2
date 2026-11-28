import type { Episode } from '../data/episodes';
import { WORLD_BY_ID } from '../data/worlds';
import { Glyph } from './Glyph';
import { CAREER_BY_ID } from '../data/careers';

/** Square "album art" for each episode, built from its world's palette. */
export function EpisodeArt({ ep, size = 140, rounded = 'rounded-3xl' }: { ep: Episode; size?: number | string; rounded?: string }) {
  const w = WORLD_BY_ID[ep.world];
  const c = CAREER_BY_ID[ep.careers[0]];
  return (
    <div className={`relative shrink-0 overflow-hidden ${rounded}`} style={{ width: size, height: size, background: `linear-gradient(145deg, ${w.palette.accent}, ${w.palette.deep})` }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="82" cy="18" r="26" fill="#fff" opacity=".12" />
        <circle cx="10" cy="95" r="34" fill="#fff" opacity=".1" />
        <path d="M0 78c20-10 40-8 60 0s30 6 40 2v20H0Z" fill={w.palette.land2} opacity=".55" />
      </svg>
      <div className="absolute left-[12%] top-[14%]"><Glyph name={c?.glyph ?? w.glyph} size={typeof size === 'number' ? size * 0.42 : 56} /></div>
      <div className="absolute bottom-[10%] left-[10%] right-[10%] font-display text-[11px] font-semibold uppercase leading-tight tracking-wider text-white/90">Day in the Life</div>
    </div>
  );
}
