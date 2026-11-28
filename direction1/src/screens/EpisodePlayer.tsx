import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CareerAvatar } from '../components/CareerAvatar';
import { EpisodeArt } from '../components/EpisodeArt';
import { Icon } from '../components/Icon';
import { Button, Confetti, Header, Pill } from '../components/ui';
import { CAREER_BY_ID } from '../data/careers';
import { EPISODES } from '../data/episodes';
import { WORLD_BY_ID } from '../data/worlds';
import { useGame } from '../store/game';
import { useNav } from '../store/nav';

const hasTTS = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function EpisodePlayer({ id }: { id: string }) {
  const ep = EPISODES.find((e) => e.id === id)!;
  const w = WORLD_BY_ID[ep.world];
  const saved = useGame((s) => s.episodeProg[id] ?? 0);
  const setEpisode = useGame((s) => s.setEpisode);
  const record = useGame((s) => s.recordActivity);
  const activities = useGame((s) => s.activities);
  const voiceOn = useGame((s) => s.voice);
  const push = useNav((s) => s.push);
  const replace = useNav((s) => s.replace);
  const n = ep.parts.length;
  const [part, setPart] = useState(() => Math.min(n - 1, Math.floor(saved * n)));
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [frac, setFrac] = useState(0);
  const [finished, setFinished] = useState(false);
  const timer = useRef<number | null>(null);
  const partRef = useRef(part);
  partRef.current = part;
  const useVoice = voiceOn && hasTTS();

  const stop = useCallback(() => {
    if (hasTTS()) window.speechSynthesis.cancel();
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
  }, []);

  const complete = useCallback(() => {
    setPlaying(false); setFinished(true); setEpisode(id, 1);
    if (!activities.some((a) => a.kind === 'episode' && a.ref === id)) {
      record({ kind: 'episode', ref: id, world: ep.world, careerId: ep.careers[0], xp: 25, score: 1, skills: ['curiosity'] });
    }
  }, [activities, ep, id, record, setEpisode]);

  const playPart = useCallback((p: number) => {
    stop();
    setPart(p); setFrac(0);
    setEpisode(id, p / n);
    const next = () => { if (p + 1 < n) playPart(p + 1); else complete(); };
    if (useVoice) {
      const u = new SpeechSynthesisUtterance(ep.parts[p]);
      u.lang = 'en-GB'; u.rate = rate;
      const v = window.speechSynthesis.getVoices().find((x) => x.lang === 'en-GB');
      if (v) u.voice = v;
      const words = ep.parts[p].split(' ').length;
      u.onboundary = (e) => setFrac(Math.min(1, e.charIndex / ep.parts[p].length));
      u.onend = () => { if (partRef.current === p) next(); };
      u.onerror = () => {};
      window.speechSynthesis.speak(u);
      void words;
    } else {
      // read-along mode: advance at a comfortable reading pace
      const ms = (ep.parts[p].split(' ').length / (3.2 * rate)) * 1000;
      const start = Date.now();
      timer.current = window.setInterval(() => {
        const k = (Date.now() - start) / ms;
        setFrac(Math.min(1, k));
        if (k >= 1) { if (timer.current) window.clearInterval(timer.current); timer.current = null; next(); }
      }, 100);
    }
  }, [complete, ep.parts, id, n, rate, setEpisode, stop, useVoice]);

  useEffect(() => () => stop(), [stop]);

  const toggle = () => {
    if (playing) { stop(); setPlaying(false); return; }
    setFinished(false); setPlaying(true); playPart(finished ? 0 : part);
  };
  const jump = (d: number) => { const p = Math.max(0, Math.min(n - 1, part + d)); if (playing) playPart(p); else { setPart(p); setFrac(0); } };
  const progress = finished ? 1 : (part + frac) / n;
  const more = EPISODES.filter((e) => e.id !== id).sort((a, b) => (a.world === ep.world ? -1 : 0) - (b.world === ep.world ? -1 : 0)).slice(0, 4);

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(${w.palette.deep}, #1E1A33 60%)` }}>
      {finished && <Confetti n={40} />}
      <Header tint="transparent" title={<span className="text-white/80">Day in the Life</span>} />
      <div className="px-6 text-white">
        <motion.div animate={playing ? { scale: [1, 1.02, 1] } : { scale: 1 }} transition={{ repeat: Infinity, duration: 2 }} className="mx-auto w-fit">
          <EpisodeArt ep={ep} size={230} />
        </motion.div>
        <h1 className="mt-5 font-display text-2xl font-semibold leading-tight">{ep.title}</h1>
        <p className="mt-1 font-semibold text-white/70">{ep.kicker}</p>
        <div className="mt-2"><Pill color="rgba(255,255,255,.12)" text="#E9DDFF"><Icon name="info" size={12} />Original fictional story · not a real interview</Pill></div>

        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-white/15"><motion.div className="h-full rounded-full bg-lime-400" animate={{ width: `${progress * 100}%` }} /></div>
          <div className="mt-1 flex justify-between text-xs font-bold text-white/60"><span>Part {Math.min(part + 1, n)} of {n}</span><span>{Math.round(progress * 100)}%</span></div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6">
          <button onClick={() => setRate(rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1)} className="w-12 rounded-full bg-white/10 py-1 text-sm font-extrabold" aria-label="Playback speed">{rate}×</button>
          <button onClick={() => jump(-1)} aria-label="Previous part" className="text-white/80"><Icon name="skipBack" size={30} /></button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="flex h-20 w-20 items-center justify-center rounded-full bg-lime-400 text-[#1F3A00] shadow-[0_5px_0_#478A06]"><Icon name={playing ? 'pause' : 'playFill'} size={34} /></motion.button>
          <button onClick={() => jump(1)} aria-label="Next part" className="text-white/80"><Icon name="skipFwd" size={30} /></button>
          <span className="w-12 text-center text-white/60"><Icon name={useVoice ? 'volume' : 'mute'} /></span>
        </div>
        <p className="mt-2 text-center text-xs font-bold text-white/50">{useVoice ? 'Read aloud by your browser’s voice' : 'Read-along mode (voice off or unavailable)'}</p>

        <div className="mt-6 space-y-3 rounded-3xl bg-white/5 p-4">
          {ep.parts.map((p, i) => (
            <button key={i} onClick={() => (playing ? playPart(i) : (setPart(i), setFrac(0)))} className={`block text-left text-[15px] font-semibold leading-relaxed transition-colors ${i === part && !finished ? 'text-white' : 'text-white/40'}`}>{p}</button>
          ))}
        </div>

        {finished && (
          <div className="mt-5 rounded-3xl bg-white p-4 text-ink-900">
            <div className="font-display text-lg font-semibold">Episode complete! +25 XP</div>
            <p className="text-sm font-semibold text-ink-500">Curious? Meet the careers in this story:</p>
            <div className="mt-3 space-y-2">
              {ep.careers.map((cid) => { const c = CAREER_BY_ID[cid]; return c && (
                <button key={cid} onClick={() => push({ name: 'career', id: cid })} className="flex w-full items-center gap-3 rounded-2xl border-2 border-grape-50 p-2 text-left"><CareerAvatar career={c} size={40} badge={false} /><span className="flex-1 font-display font-semibold">{c.title}</span><Icon name="chevron" className="text-ink-300" /></button>
              ); })}
            </div>
            {CAREER_BY_ID[ep.careers[0]]?.sim && <Button tone="lime" full className="mt-3" onClick={() => push({ name: 'sim', id: CAREER_BY_ID[ep.careers[0]].sim! })}>Try the simulation</Button>}
          </div>
        )}

        <h2 className="mt-7 font-display text-lg font-semibold">Up next</h2>
        <div className="no-scrollbar -mx-6 mt-2 flex gap-3 overflow-x-auto px-6 pb-10">
          {more.map((e) => (
            <button key={e.id} onClick={() => { stop(); replace({ name: 'episode', id: e.id }); }} className="w-[130px] shrink-0 text-left"><EpisodeArt ep={e} size={130} /><div className="mt-1.5 text-sm font-extrabold leading-tight">{e.title}</div></button>
          ))}
        </div>
      </div>
    </div>
  );
}
