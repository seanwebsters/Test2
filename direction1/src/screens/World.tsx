import { CareerAvatar } from '../components/CareerAvatar';
import { Glyph } from '../components/Glyph';
import { Guide } from '../components/Guide';
import { Icon } from '../components/Icon';
import { Bubble, Header, Pill } from '../components/ui';
import { WorldArt } from '../components/WorldArt';
import { careersInWorld } from '../data/careers';
import { EPISODES } from '../data/episodes';
import type { WorldId } from '../data/types';
import { WORLD_BY_ID } from '../data/worlds';
import { matchPct } from '../lib/recommend';
import { useRecState } from '../lib/useRec';
import { SIMS } from '../sims';
import { useGame } from '../store/game';
import { useNav } from '../store/nav';

export function WorldScreen({ id }: { id: string }) {
  const w = WORLD_BY_ID[id as WorldId];
  const rs = useRecState();
  const push = useNav((s) => s.push);
  const activities = useGame((s) => s.activities);
  const careers = careersInWorld(w.id).sort((a, b) => matchPct(b, rs) - matchPct(a, rs));
  const sims = SIMS.filter((s) => s.world === w.id || careers.some((c) => c.sim === s.id)).slice(0, 4);
  const eps = EPISODES.filter((e) => e.world === w.id || e.careers.some((c) => careers.some((x) => x.id === c)));
  const tried = activities.filter((a) => a.world === w.id).length;

  return (
    <div className="min-h-screen bg-white">
      <Header tint={w.palette.sky} title={w.name} />
      <div className="relative" style={{ background: w.palette.sky }}>
        <WorldArt world={w} height={190} />
      </div>
      <div className="-mt-6 rounded-t-[2rem] bg-white px-5 pt-5">
        <div className="flex items-start gap-2">
          <Guide world={w} size={70} />
          <div className="flex-1">
            <div className="text-xs font-extrabold uppercase tracking-wider" style={{ color: w.palette.deep }}>Your guide: {w.guide.name} the {w.guide.species}</div>
            <Bubble className="mt-1 text-sm">{w.guide.line} {w.tagline}</Bubble>
          </div>
        </div>
        <div className="mt-3 flex gap-2"><Pill color={w.palette.soft} text={w.palette.deep}>{careers.length} careers</Pill><Pill color={w.palette.soft} text={w.palette.deep}>{tried} activities done</Pill></div>

        <h2 className="mt-6 font-display text-xl font-semibold">Simulations</h2>
        <div className="mt-3 space-y-3">
          {sims.map((s) => (
            <button key={s.id} onClick={() => push({ name: 'sim', id: s.id })} className="flex w-full items-center gap-3 rounded-3xl p-3.5 text-left text-white shadow-[0_5px_0_rgba(0,0,0,.15)]" style={{ background: WORLD_BY_ID[s.world].palette.accent }}>
              <Glyph name={s.glyph} size={48} tile="#ffffff" />
              <div className="flex-1"><div className="font-display text-lg font-semibold">{s.title}</div><div className="text-sm font-semibold opacity-90">{s.role} · {s.minutes} min</div></div>
              <Icon name="playFill" />
            </button>
          ))}
        </div>

        <h2 className="mt-6 font-display text-xl font-semibold">Careers in this world</h2>
        <div className="mt-3 space-y-2.5 pb-6">
          {careers.map((c) => (
            <button key={c.id} onClick={() => push({ name: 'career', id: c.id })} className="flex w-full items-center gap-3 rounded-3xl border-2 border-grape-50 bg-white p-3 text-left shadow-[0_3px_0_#F1ECFA]">
              <CareerAvatar career={c} size={54} />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 font-display font-semibold">{c.title}{c.lesserKnown && <Pill color="#FFF6D6" text="#8A5A00">Gem</Pill>}</div><div className="truncate text-sm font-semibold text-ink-500">{c.oneLiner}</div></div>
              <span className="text-xs font-extrabold" style={{ color: w.palette.deep }}>{matchPct(c, rs)}%</span>
            </button>
          ))}
        </div>

        {eps.length > 0 && <>
          <h2 className="font-display text-xl font-semibold">Stories</h2>
          <div className="mt-3 space-y-2.5 pb-8">
            {eps.map((e) => (
              <button key={e.id} onClick={() => push({ name: 'episode', id: e.id })} className="flex w-full items-center gap-3 rounded-3xl bg-ink-900 p-3 text-left text-white">
                <Glyph name="mic" size={40} tile="#ffffff" /><div className="flex-1 font-display font-semibold">{e.title}</div><Icon name="playFill" />
              </button>
            ))}
          </div>
        </>}
      </div>
    </div>
  );
}
