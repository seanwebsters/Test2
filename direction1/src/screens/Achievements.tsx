import { Glyph } from '../components/Glyph';
import { Icon } from '../components/Icon';
import { Header, Progress } from '../components/ui';
import { ACHIEVEMENTS, OUTFITS } from '../data/gamification';
import { achievementProgress } from '../lib/achievementProgress';
import { useGame } from '../store/game';

export function Achievements() {
  const s = useGame();
  const n = Object.keys(s.achievements).length;
  return (
    <div className="min-h-screen bg-white pb-10">
      <Header title="Achievement cabinet" />
      <div className="px-4">
        <div className="rounded-3xl bg-sun-100 p-4"><div className="font-display text-2xl font-semibold">{n} / {ACHIEVEMENTS.length}</div><div className="text-sm font-bold text-ink-500">Every badge rewards curiosity — never pressure.</div><Progress value={n / ACHIEVEMENTS.length} color="#FFC21A" className="mt-2" /></div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const got = !!s.achievements[a.id];
            const [cur, tot] = achievementProgress(a.id, s);
            const reward = a.reward && OUTFITS.find((o) => o.id === a.reward);
            return (
              <div key={a.id} className={`rounded-3xl border-2 p-3 ${got ? 'border-transparent' : 'border-grape-50 bg-white'}`} style={got ? { background: a.color + '1F' } : undefined}>
                <div className={got ? '' : 'opacity-35 grayscale'}><Glyph name={a.glyph} size={52} tile={got ? '#fff' : '#F1EEF7'} /></div>
                <div className="mt-2 font-display font-semibold leading-tight">{a.title}</div>
                <div className="text-xs font-semibold text-ink-500">{a.desc}</div>
                {!got && tot > 1 && <div className="mt-2 flex items-center gap-1.5"><Progress value={cur / tot} h={8} color={a.color} /><span className="text-[10px] font-extrabold text-ink-400">{cur}/{tot}</span></div>}
                {reward && <div className="mt-1.5 flex items-center gap-1 text-[11px] font-extrabold text-grape-500"><Icon name="gift" size={12} />Unlocks {reward.label}</div>}
                {got && <div className="mt-1.5 text-[11px] font-extrabold text-lime-700">Unlocked {new Date(s.achievements[a.id]).toLocaleDateString('en-GB')}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
