import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Glyph } from '../components/Glyph';
import { Guide } from '../components/Guide';
import { Icon } from '../components/Icon';
import { DailyQuests } from '../components/Quests';
import { Scout } from '../components/Scout';
import { Bubble, Button, Confetti, Pill, Sheet, Stats } from '../components/ui';
import { WorldArt } from '../components/WorldArt';
import type { World } from '../data/types';
import { isDone, nodesForWorld, type PathNode } from '../lib/journey';
import { rankCareers, rankWorlds } from '../lib/recommend';
import { useRecState } from '../lib/useRec';
import { useGame } from '../store/game';
import { useNav } from '../store/nav';

const NODE_GLYPH = { lesson: 'book', sim: 'gamepad', story: 'mic', chest: 'gift', landmark: 'flag' } as const;

export function Journey() {
  const rs = useRecState();
  const profile = useGame((s) => s.profile);
  const unlocked = useGame((s) => s.unlockedWorlds);
  const activities = useGame((s) => s.activities);
  const claimedNodes = useGame((s) => s.claimedNodes);
  const episodeProg = useGame((s) => s.episodeProg);
  const keys = useGame((s) => s.keys);
  const claimNode = useGame((s) => s.claimNode);
  const unlockWorld = useGame((s) => s.unlockWorld);
  const push = useNav((s) => s.push);
  const [reward, setReward] = useState<null | { title: string; text: string; glyph: 'gift' | 'flag' }>(null);
  const [lockSheet, setLockSheet] = useState<World | null>(null);

  const ranked = useMemo(() => rankWorlds(rs).map((x) => x.w), [rs]);
  const order = [...ranked.filter((w) => unlocked.includes(w.id)), ...ranked.filter((w) => !unlocked.includes(w.id))];
  const recOrder = useMemo(() => rankCareers(rs).map((x) => x.c.id), [rs]);
  const ds = { activities, claimedNodes, episodeProg };

  let globalCurrent: string | null = null;
  const sections = order.map((w) => {
    const nodes = nodesForWorld(w, recOrder);
    const open = unlocked.includes(w.id);
    const firstTodo = nodes.find((n) => !isDone(n, ds));
    if (open && firstTodo && !globalCurrent) globalCurrent = firstTodo.id;
    return { w, nodes, open, firstTodo };
  });

  const tapNode = (n: PathNode, available: boolean) => {
    if (!available) return;
    if (n.kind === 'lesson') push({ name: 'lesson', careerId: n.ref });
    else if (n.kind === 'sim') push({ name: 'sim', id: n.ref });
    else if (n.kind === 'story') push({ name: 'episode', id: n.ref });
    else if (n.kind === 'chest') { claimNode(n.id, 30, 1); setReward({ title: 'Reward chest!', text: '+30 Sparks and a Curiosity Key — use keys to unlock new worlds.', glyph: 'gift' }); }
    else { claimNode(n.id, 50, 0); setReward({ title: 'Destination reached!', text: 'You’ve explored this whole world. Its mastery badge is now in your cabinet.', glyph: 'flag' }); }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 flex items-center justify-between bg-white/95 px-4 py-3 backdrop-blur">
        <div className="font-display text-xl font-semibold text-grape-600">Hi {profile?.name}!</div>
        <Stats />
      </div>

      <div className="px-4">
        <div className="flex items-end gap-1">
          <Scout size={64} mood="happy" />
          <Bubble className="mb-5 flex-1 text-sm">
            {activities.length === 0 ? 'Your path is personalised. Tap the glowing circle to start your first adventure!' : 'Your path reshuffles as you discover what you enjoy. No pressure — just curiosity.'}
          </Bubble>
        </div>
        <DailyQuests />
      </div>

      {sections.map(({ w, nodes, open, firstTodo }, si) => {
        const mastered = nodes.every((n) => isDone(n, ds));
        return (
          <section key={w.id} className="relative mt-8" style={{ background: `linear-gradient(${w.palette.soft}, #fff)` }}>
            <div className="relative mx-4 overflow-hidden rounded-3xl text-white shadow-[0_5px_0_rgba(0,0,0,.12)]" style={{ background: w.palette.accent }}>
              <div className="absolute inset-0 opacity-50"><WorldArt world={w} height={120} landmark={false} /></div>
              <div className="relative flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {si === 0 && open && <Pill color="#fff" text={w.palette.deep}>Recommended start</Pill>}
                    {mastered && <Pill color="#FFC21A" text="#5A3E00">Mastered</Pill>}
                    {!open && <Pill color="rgba(0,0,0,.35)" text="#fff"><Icon name="lock" size={12} /> Locked</Pill>}
                  </div>
                  <h2 className="mt-1.5 font-display text-2xl font-semibold drop-shadow" style={{ color: w.id === 'film' ? '#fff' : w.palette.deep }}>{w.name}</h2>
                  <p className="text-sm font-bold" style={{ color: w.id === 'film' ? '#E9DDFF' : w.palette.deep }}>{w.tagline}</p>
                </div>
                <Guide world={w} size={64} />
              </div>
              <button onClick={() => push({ name: 'world', id: w.id })} className="relative flex w-full items-center justify-between border-t border-white/30 bg-black/10 px-4 py-2 text-sm font-extrabold">
                Explore {w.short} freely <Icon name="chevron" size={18} />
              </button>
            </div>

            {!open ? (
              <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border-2 border-dashed border-grape-100 bg-white p-3">
                <Icon name="lock" className="shrink-0 text-grape-300" />
                <p className="flex-1 text-sm font-bold text-ink-500">{nodes.length} adventures inside. Use a Curiosity Key to add them to your path (you have {keys}).</p>
                <Button size="sm" tone="sun" disabled={keys < 1} onClick={() => unlockWorld(w.id)}><Icon name="key" size={16} />Unlock</Button>
              </div>
            ) : (
            <div className="relative py-6">
              {nodes.map((n, i) => {
                const done = isDone(n, ds);
                const available = open && (done || n.id === firstTodo?.id);
                const current = n.id === globalCurrent;
                const x = Math.sin(i * 1.1) * 70;
                return (
                  <div key={n.id} className="relative flex h-[96px] justify-center" style={{ transform: `translateX(${x}px)` }}>
                    {current && (
                      <motion.div className="absolute -top-8 z-10 rounded-xl border-2 border-grape-100 bg-white px-3 py-1 font-display text-sm font-semibold text-grape-600 shadow" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
                        START<span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-grape-100 bg-white" />
                      </motion.div>
                    )}
                    <motion.button whileTap={available ? { scale: 0.9, y: 4 } : undefined} onClick={() => (open ? tapNode(n, available && !(done && (n.kind === 'chest' || n.kind === 'landmark'))) : setLockSheet(w))}
                      aria-label={`${n.label}${done ? ' (done)' : available ? '' : ' (locked)'}`}
                      className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full"
                      style={{
                        background: done ? '#FFC21A' : available ? w.palette.accent : '#E5E1EE',
                        boxShadow: `0 7px 0 ${done ? '#C79100' : available ? w.palette.deep : '#C9C3D8'}`,
                      }}>
                      {current && <motion.span className="absolute -inset-2 rounded-full border-4" style={{ borderColor: w.palette.accent + '55' }} animate={{ scale: [1, 1.12, 1], opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} />}
                      <span className={available || done ? '' : 'opacity-40 grayscale'}><Glyph name={n.kind === 'lesson' || n.kind === 'sim' ? NODE_GLYPH[n.kind] : NODE_GLYPH[n.kind]} size={42} /></span>
                      {done && <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-lime-400 text-[#1F3A00]"><Icon name="check" size={14} stroke={3.5} /></span>}
                    </motion.button>
                    <span className="absolute top-[84px] whitespace-nowrap text-[11px] font-extrabold text-ink-500">{n.kind === 'sim' ? `Simulation: ${n.label}` : n.kind === 'lesson' ? n.label : n.label}</span>
                  </div>
                );
              })}
            </div>
            )}
          </section>
        );
      })}
      <p className="px-8 pb-6 text-center text-sm font-semibold text-ink-400">Earn Curiosity Keys by levelling up, opening chests and finishing weekly challenges.</p>

      <Sheet open={!!reward} onClose={() => setReward(null)}>
        {reward && <>
          <Confetti />
          <div className="text-center">
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }}><Glyph name={reward.glyph} size={110} className="mx-auto" /></motion.div>
            <h2 className="mt-2 font-display text-2xl font-semibold">{reward.title}</h2>
            <p className="mt-1 font-semibold text-ink-500">{reward.text}</p>
            <Button tone="lime" full className="mt-5" onClick={() => setReward(null)}>Brilliant</Button>
          </div>
        </>}
      </Sheet>
      <Sheet open={!!lockSheet} onClose={() => setLockSheet(null)}>
        {lockSheet && <div className="text-center">
          <Guide world={lockSheet} size={90} />
          <h2 className="mt-2 font-display text-2xl font-semibold">{lockSheet.name}</h2>
          <p className="mt-1 font-semibold text-ink-500">“{lockSheet.guide.line}” — {lockSheet.guide.name}</p>
          <div className="mt-4 flex gap-2">
            <Button tone="white" className="flex-1" onClick={() => { setLockSheet(null); push({ name: 'world', id: lockSheet.id }); }}>Peek inside</Button>
            <Button tone="sun" className="flex-1" disabled={keys < 1} onClick={() => { unlockWorld(lockSheet.id); setLockSheet(null); }}><Icon name="key" size={16} />Unlock ({keys})</Button>
          </div>
        </div>}
      </Sheet>
    </div>
  );
}
