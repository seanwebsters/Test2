import { motion } from 'framer-motion';
import { CareerAvatar } from '../components/CareerAvatar';
import { Glyph } from '../components/Glyph';
import { Guide } from '../components/Guide';
import { Icon } from '../components/Icon';
import { DailyQuests } from '../components/Quests';
import { Pill, Section, Stats } from '../components/ui';
import { WORLD_BY_ID } from '../data/worlds';
import { rankCareers, rankWorlds } from '../lib/recommend';
import { useRecState } from '../lib/useRec';
import { FEATURED_SIMS, SIMS } from '../sims';
import { useGame } from '../store/game';
import { useNav } from '../store/nav';

export function PlayTab() {
  const rs = useRecState();
  const push = useNav((s) => s.push);
  const activities = useGame((s) => s.activities);
  const plus = useGame((s) => !!s.plus);
  const played = (id: string) => activities.filter((a) => a.kind === 'sim' && a.ref === id);
  const worldOrder = rankWorlds(rs).map((x) => x.w.id);
  const sorted = [...SIMS].sort((a, b) => worldOrder.indexOf(a.world) - worldOrder.indexOf(b.world));
  const pick = sorted.find((s) => !played(s.id).length) ?? sorted[0];
  const pw = WORLD_BY_ID[pick.world];
  const lessons = rankCareers(rs).map((x) => x.c).filter((c) => !activities.some((a) => a.kind === 'lesson' && a.ref === c.id)).slice(0, 6);

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 flex items-center justify-between bg-white/95 px-4 py-3 backdrop-blur"><h1 className="font-display text-2xl font-semibold">Play</h1><Stats /></div>
      <div className="px-4">
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => push({ name: 'sim', id: pick.id })} className="relative w-full overflow-hidden rounded-[2rem] p-5 text-left text-white shadow-[0_6px_0_rgba(0,0,0,.15)]" style={{ background: `linear-gradient(150deg, ${pw.palette.accent}, ${pw.palette.deep})` }}>
          <Pill color="rgba(255,255,255,.2)" text="#fff"><Icon name="sparkle" size={12} />Scout recommends</Pill>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div><h2 className="font-display text-2xl font-semibold leading-tight">{pick.title}</h2><p className="font-semibold opacity-90">Be a {pick.role} · {pick.minutes} min</p></div>
            <Guide world={pw} size={72} />
          </div>
          <span className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-display font-semibold" style={{ color: pw.palette.deep }}><Icon name="playFill" size={18} />Play now</span>
        </motion.button>
      </div>

      <Section title="Career simulations">
        <div className="grid grid-cols-2 gap-3 px-4">
          {FEATURED_SIMS.map((id) => SIMS.find((s) => s.id === id)!).map((s) => {
            const w = WORLD_BY_ID[s.world];
            const n = played(s.id).length;
            return (
              <motion.button key={s.id} whileTap={{ scale: 0.96 }} onClick={() => push({ name: 'sim', id: s.id })} className="relative rounded-3xl p-3.5 text-left shadow-[0_5px_0_rgba(0,0,0,.08)]" style={{ background: w.palette.soft }}>
                <Glyph name={s.glyph} size={52} tile="#ffffff" />
                <div className="mt-2 font-display font-semibold leading-tight">{s.role}</div>
                <div className="text-xs font-bold text-ink-500">{s.title}</div>
                <div className="mt-2 flex items-center gap-1 text-[11px] font-extrabold" style={{ color: w.palette.deep }}><Icon name="clock" size={12} />{s.minutes} min{n > 0 && <span className="ml-auto flex items-center gap-0.5 text-lime-700"><Icon name="check" size={12} stroke={3} />{n}×</span>}</div>
                {s.steps.some((x) => x.plus) && <span className="absolute right-3 top-3" title={plus ? 'Expert round unlocked' : 'Expert round with Plus'}><Icon name="crown" size={16} className={plus ? 'text-sun-500' : 'text-ink-300'} /></span>}
              </motion.button>
            );
          })}
        </div>
      </Section>

      <Section title="More quick simulations">
        <div className="space-y-2.5 px-4">
          {SIMS.filter((s) => !FEATURED_SIMS.includes(s.id)).map((s) => {
            const w = WORLD_BY_ID[s.world];
            return (
              <button key={s.id} onClick={() => push({ name: 'sim', id: s.id })} className="flex w-full items-center gap-3 rounded-3xl border-2 border-grape-50 bg-white p-3 text-left">
                <Glyph name={s.glyph} size={44} tile={w.palette.soft} />
                <div className="flex-1"><div className="font-display font-semibold">{s.title}</div><div className="text-xs font-bold text-ink-400">{s.role} · {w.short} · {s.minutes} min</div></div>
                {played(s.id).length > 0 ? <Icon name="check" className="text-lime-600" /> : <Icon name="playFill" className="text-ink-300" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="90-second lessons">
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
          {lessons.map((c) => (
            <button key={c.id} onClick={() => push({ name: 'lesson', careerId: c.id })} className="w-[140px] shrink-0 rounded-3xl border-2 border-grape-50 bg-white p-3 text-left">
              <CareerAvatar career={c} size={48} /><div className="mt-2 font-display text-sm font-semibold leading-tight">{c.title}</div><div className="mt-1 text-[11px] font-extrabold text-grape-500">Myths, routes & pay</div>
            </button>
          ))}
        </div>
      </Section>

      <div className="mt-6 px-4 pb-4"><DailyQuests compact /></div>
    </div>
  );
}
