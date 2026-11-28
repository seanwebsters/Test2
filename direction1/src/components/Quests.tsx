import { QUEST_POOL } from '../data/gamification';
import { useGame } from '../store/game';
import { Glyph } from './Glyph';
import { Icon } from './Icon';
import { Button, Progress } from './ui';

export function DailyQuests({ compact = false }: { compact?: boolean }) {
  const daily = useGame((s) => s.daily);
  const claim = useGame((s) => s.claimQuest);
  const weekly = useGame((s) => s.weekly);
  const claimWeekly = useGame((s) => s.claimWeekly);
  return (
    <div className="rounded-3xl border-2 border-grape-100 bg-white p-4 shadow-[0_4px_0_#EDE4FB]">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Daily quests</h3>
        <span className="text-xs font-extrabold text-ink-400">New quests every day</span>
      </div>
      <ul className="mt-3 space-y-3">
        {daily.quests.map((q) => {
          const d = QUEST_POOL.find((x) => x.id === q.id)!;
          const done = q.progress >= d.target;
          return (
            <li key={q.id} className="flex items-center gap-3">
              <Glyph name={d.glyph} size={38} tile />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-ink-900">{d.label}</div>
                <div className="mt-1 flex items-center gap-2"><Progress value={q.progress / d.target} h={10} color={done ? '#9BE22F' : '#FFC21A'} /><span className="w-12 text-right text-[11px] font-extrabold text-ink-400">{Math.min(q.progress, d.target)}/{d.target}</span></div>
              </div>
              {q.claimed ? <span className="flex h-9 w-14 items-center justify-center rounded-xl bg-lime-100 text-lime-700"><Icon name="check" size={18} stroke={3} /></span>
                : <Button size="sm" tone={done ? 'lime' : 'white'} disabled={!done} onClick={() => claim(q.id)} className="w-14 !px-0"><Icon name="gem" size={14} />{d.reward}</Button>}
            </li>
          );
        })}
      </ul>
      {!compact && (
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-sky-100 to-grape-50 p-3">
          <div className="flex items-center gap-3">
            <Glyph name="globe" size={38} />
            <div className="flex-1">
              <div className="text-xs font-extrabold uppercase tracking-wider text-sky-600">Weekly challenge</div>
              <div className="text-sm font-extrabold">Try activities in 3 different worlds</div>
              <div className="mt-1 flex items-center gap-2"><Progress value={weekly.worlds.length / 3} h={10} color="#1CA0F2" /><span className="text-[11px] font-extrabold text-ink-400">{Math.min(3, weekly.worlds.length)}/3</span></div>
            </div>
            {weekly.claimed ? <Icon name="check" className="text-lime-600" /> : <Button size="sm" tone={weekly.worlds.length >= 3 ? 'sky' : 'white'} disabled={weekly.worlds.length < 3} onClick={claimWeekly}><Icon name="key" size={14} />+1</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
