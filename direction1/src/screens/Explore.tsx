import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CareerAvatar } from '../components/CareerAvatar';
import { EpisodeArt } from '../components/EpisodeArt';
import { Guide } from '../components/Guide';
import { Icon } from '../components/Icon';
import { Pill, Stats } from '../components/ui';
import { WorldArt } from '../components/WorldArt';
import { CAREERS } from '../data/careers';
import { EPISODES } from '../data/episodes';
import type { WorldId } from '../data/types';
import { WORLDS, WORLD_BY_ID } from '../data/worlds';
import { matchPct, rankWorlds } from '../lib/recommend';
import { useRecState } from '../lib/useRec';
import { useGame } from '../store/game';
import { useNav } from '../store/nav';

export function Explore() {
  const seg = useNav((s) => s.exploreSeg);
  const setSeg = useNav((s) => s.setExploreSeg);
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 bg-white/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex items-center justify-between"><h1 className="font-display text-2xl font-semibold">Explore</h1><Stats /></div>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-cloud p-1" role="tablist">
          {(['worlds', 'careers', 'stories'] as const).map((s) => (
            <button key={s} role="tab" aria-selected={seg === s} onClick={() => setSeg(s)} className={`relative rounded-xl py-2 text-sm font-extrabold capitalize ${seg === s ? 'text-grape-600' : 'text-ink-400'}`}>
              {seg === s && <motion.span layoutId="seg" className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
              <span className="relative">{s === 'stories' ? 'Day in the Life' : s}</span>
            </button>
          ))}
        </div>
      </div>
      {seg === 'worlds' ? <Worlds /> : seg === 'careers' ? <Library /> : <Stories />}
    </div>
  );
}

function Worlds() {
  const rs = useRecState();
  const push = useNav((s) => s.push);
  const ranked = rankWorlds(rs).map((x) => x.w);
  return (
    <div className="px-4 pb-6">
      <p className="mt-2 text-sm font-semibold text-ink-500">Every world is open to explore. The top three are where Scout thinks you might start — but wander anywhere.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {ranked.map((w, i) => (
          <motion.button key={w.id} whileTap={{ scale: 0.97 }} onClick={() => push({ name: 'world', id: w.id })} className={`relative overflow-hidden rounded-3xl text-left shadow-[0_5px_0_rgba(0,0,0,.08)] ${i === 0 ? 'col-span-2' : ''}`} style={{ background: w.palette.soft }}>
            <WorldArt world={w} height={i === 0 ? 150 : 100} />
            {i < 3 && <span className="absolute left-2 top-2"><Pill color="#fff" text={w.palette.deep}>For you</Pill></span>}
            <div className="flex items-end justify-between gap-2 p-3">
              <div className="min-w-0"><div className="font-display font-semibold leading-tight">{w.name}</div>{i === 0 && <div className="text-sm font-semibold text-ink-500">{w.tagline}</div>}</div>
              {i === 0 && <Guide world={w} size={48} />}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

type Filter = 'all' | 'gems' | 'appr' | 'nodegree' | 'saved';
function Library() {
  const rs = useRecState();
  const push = useNav((s) => s.push);
  const saved = useGame((s) => s.saved);
  const [q, setQ] = useState('');
  const [world, setWorld] = useState<WorldId | 'all'>('all');
  const [f, setF] = useState<Filter>('all');
  const [sort, setSort] = useState<'match' | 'az' | 'pay'>('match');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    let xs = CAREERS.filter((c) => (world === 'all' || c.world === world)
      && (!t || [c.title, c.oneLiner, c.involves, ...c.skills, WORLD_BY_ID[c.world].name].join(' ').toLowerCase().includes(t))
      && (f === 'all' || (f === 'gems' && c.lesserKnown) || (f === 'appr' && c.routes.some((r) => r.type === 'apprenticeship'))
        || (f === 'nodegree' && c.routes.some((r) => r.type !== 'university')) || (f === 'saved' && saved.includes(c.id))));
    xs = [...xs].sort((a, b) => sort === 'az' ? a.title.localeCompare(b.title) : sort === 'pay' ? b.salary.experienced[1] - a.salary.experienced[1] : matchPct(b, rs) - matchPct(a, rs));
    return xs;
  }, [q, world, f, sort, saved, rs]);
  const FILTERS: [Filter, string][] = [['all', 'All'], ['gems', 'Hidden gems'], ['appr', 'Apprenticeships'], ['nodegree', 'No degree route'], ['saved', `Saved (${saved.length})`]];
  return (
    <div className="pb-6">
      <div className="px-4">
        <label className="mt-2 flex h-12 items-center gap-2 rounded-2xl border-2 border-grape-100 bg-white px-3 focus-within:border-grape-400">
          <Icon name="search" className="text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${CAREERS.length} careers, skills…`} className="h-full flex-1 bg-transparent font-bold outline-none placeholder:text-ink-300" aria-label="Search careers" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search"><Icon name="close" size={18} className="text-ink-400" /></button>}
        </label>
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map(([id, l]) => <button key={id} onClick={() => setF(id)} className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-sm font-extrabold ${f === id ? 'border-grape-500 bg-grape-500 text-white' : 'border-grape-100 text-ink-500'}`}>{l}</button>)}
      </div>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4">
        <button onClick={() => setWorld('all')} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${world === 'all' ? 'bg-ink-900 text-white' : 'bg-cloud text-ink-500'}`}>All worlds</button>
        {WORLDS.map((w) => <button key={w.id} onClick={() => setWorld(w.id)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold" style={world === w.id ? { background: w.palette.accent, color: '#fff' } : { background: w.palette.soft, color: w.palette.deep }}>{w.short}</button>)}
      </div>
      <div className="mt-3 flex items-center justify-between px-4 text-xs font-extrabold text-ink-400">
        <span>{list.length} careers</span>
        <label className="flex items-center gap-1">Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg bg-cloud px-2 py-1 font-extrabold text-ink-700"><option value="match">Best match</option><option value="az">A–Z</option><option value="pay">Pay (illustrative)</option></select>
        </label>
      </div>
      <div className="mt-2 space-y-2.5 px-4">
        {list.map((c) => {
          const w = WORLD_BY_ID[c.world];
          return (
            <button key={c.id} onClick={() => push({ name: 'career', id: c.id })} className="flex w-full items-center gap-3 rounded-3xl border-2 border-grape-50 bg-white p-3 text-left shadow-[0_3px_0_#F1ECFA]">
              <CareerAvatar career={c} size={56} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5"><span className="font-display font-semibold leading-tight">{c.title}</span>{saved.includes(c.id) && <Icon name="bookmarkFill" size={14} className="text-sun-500" />}</div>
                <div className="truncate text-sm font-semibold text-ink-500">{c.oneLiner}</div>
                <div className="mt-1 flex gap-1.5"><Pill color={w.palette.soft} text={w.palette.deep}>{w.short}</Pill>{c.lesserKnown && <Pill color="#FFF6D6" text="#8A5A00">Gem</Pill>}</div>
              </div>
              <div className="text-right"><div className="font-display text-sm font-semibold text-grape-600">{matchPct(c, rs)}%</div><div className="text-[10px] font-bold text-ink-400">match</div></div>
            </button>
          );
        })}
        {list.length === 0 && <p className="py-10 text-center font-bold text-ink-400">No careers match that yet. Try a different word or filter.</p>}
      </div>
    </div>
  );
}

function Stories() {
  const push = useNav((s) => s.push);
  const prog = useGame((s) => s.episodeProg);
  const rs = useRecState();
  const worldRank = rankWorlds(rs).map((x) => x.w.id);
  const recommended = [...EPISODES].sort((a, b) => worldRank.indexOf(a.world) - worldRank.indexOf(b.world));
  const cont = EPISODES.filter((e) => (prog[e.id] ?? 0) > 0 && (prog[e.id] ?? 0) < 0.99);
  const hero = recommended[0];
  return (
    <div className="pb-6">
      <button onClick={() => push({ name: 'episode', id: hero.id })} className="mx-4 mt-2 flex w-[calc(100%-2rem)] items-center gap-4 rounded-3xl bg-ink-900 p-4 text-left text-white">
        <EpisodeArt ep={hero} size={110} rounded="rounded-2xl" />
        <div className="min-w-0"><div className="text-xs font-extrabold uppercase tracking-wider text-lime-300">Top pick for you</div><div className="mt-1 font-display text-lg font-semibold leading-tight">{hero.title}</div><div className="mt-1 text-sm font-semibold text-white/70">{hero.kicker}</div>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-lime-400 px-3 py-1.5 text-sm font-extrabold text-[#1F3A00]"><Icon name="playFill" size={14} />Listen</span></div>
      </button>
      <p className="mx-4 mt-2 flex items-center gap-1.5 text-xs font-bold text-ink-400"><Icon name="info" size={14} />Original, fictional composite stories — not real interviews.</p>
      {cont.length > 0 && <Row title="Continue listening" eps={cont} prog={prog} onOpen={(id) => push({ name: 'episode', id })} />}
      <Row title="Recommended for you" eps={recommended.slice(1, 6)} prog={prog} onOpen={(id) => push({ name: 'episode', id })} />
      <Row title="All episodes" eps={EPISODES} prog={prog} onOpen={(id) => push({ name: 'episode', id })} />
    </div>
  );
}

function Row({ title, eps, prog, onOpen }: { title: string; eps: typeof EPISODES; prog: Record<string, number>; onOpen: (id: string) => void }) {
  return (
    <section className="mt-5">
      <h2 className="px-4 font-display text-lg font-semibold">{title}</h2>
      <div className="no-scrollbar mt-2 flex gap-3 overflow-x-auto px-4 pb-2">
        {eps.map((e) => (
          <button key={e.id} onClick={() => onOpen(e.id)} className="w-[140px] shrink-0 text-left">
            <EpisodeArt ep={e} size={140} />
            {(prog[e.id] ?? 0) > 0 && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cloud"><div className="h-full bg-lime-500" style={{ width: `${(prog[e.id] ?? 0) * 100}%` }} /></div>}
            <div className="mt-1.5 text-sm font-extrabold leading-tight text-ink-900">{e.title}</div>
            <div className="text-xs font-semibold text-ink-400">{WORLD_BY_ID[e.world].short} · ~{Math.max(1, Math.round(e.parts.join(' ').split(' ').length / 150))} min</div>
          </button>
        ))}
      </div>
    </section>
  );
}
