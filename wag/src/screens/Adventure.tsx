import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Dog } from '../art/Dog';
import { Coin, Heart, Icon, MapIcon, Moves, Seed } from '../art/Icons';
import { BoosterIcon } from '../art/Pieces';
import { CATEGORY_META, DISCOVERIES, QUESTS, WALK_CHALLENGES, ageGroup } from '../game/data';
import { useGame } from '../game/store';
import type { AdventureRecord, QuestDef } from '../game/types';
import { dayKey, fileToDataUrl, fill, fmtTime, haversineKm, uid } from '../game/util';
import { Confetti, Currencies, Sheet, Sim } from '../ui/Common';
import { ALL_LESSONS } from '../game/academy';

const MOODS = ['Overjoyed', 'Happy', 'Calm', 'Tired but happy', 'Curious'];

function QuestArt({ cat }: { cat: QuestDef['category'] }) {
  const m = CATEGORY_META[cat];
  const art: Record<string, React.ReactNode> = {
    explore: <path d="M8 30 L18 12 L24 22 L30 14 L40 30Z M30 8 a4 4 0 1 0 0.1 0" fill={m.color} />,
    senses: (
      <g fill={m.color}>
        <path d="M14 26 Q24 14 34 26 Q34 34 24 36 Q14 34 14 26Z" />
        <path d="M30 12 q4 -4 8 0 M34 6 q4 -4 8 0" stroke={m.color} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
    ),
    train: (
      <g fill={m.color}>
        <path d="M24 8 L27 18 L38 18 L29 24 L32 35 L24 28 L16 35 L19 24 L10 18 L21 18Z" />
      </g>
    ),
    bond: <path d="M24 38 C 10 28, 6 20, 10 13 C 14 7, 21 8, 24 14 C 27 8, 34 7, 38 13 C 42 20, 38 28, 24 38Z" fill={m.color} />,
    play: (
      <g>
        <circle cx="24" cy="24" r="13" fill={m.color} />
        <path d="M13 18 Q24 24 13 31 M35 17 Q24 24 35 31" stroke="#fff" strokeWidth="2.4" fill="none" />
      </g>
    ),
    calm: <path d="M30 10 A14 14 0 1 0 38 30 A11 11 0 0 1 30 10Z" fill={m.color} />,
  };
  return (
    <div className="thumb" style={{ background: m.soft }}>
      <svg viewBox="0 0 48 48" width="34" height="34">
        {art[cat]}
      </svg>
    </div>
  );
}

function rewardsFor(def: QuestDef) {
  const bits: React.ReactNode[] = [
    <span key="c" className="chip" style={{ padding: '3px 8px', boxShadow: 'none', background: '#fff6e0' }}>
      <Coin size={16} /> {20 + Math.round(def.minutes * 1.2)}
    </span>,
  ];
  if (def.category === 'explore')
    bits.push(
      <span key="m" className="chip" style={{ padding: '3px 8px', boxShadow: 'none', background: '#fff1d6' }}>
        <MapIcon size={16} /> map
      </span>,
    );
  if (def.category === 'play' || def.category === 'calm' || def.category === 'bond')
    bits.push(
      <span key="mv" className="chip" style={{ padding: '3px 8px', boxShadow: 'none', background: '#e1f0d9' }}>
        <Moves size={14} /> +{def.category === 'play' ? 3 : 2}
      </span>,
    );
  if (def.category === 'train' || def.category === 'senses')
    bits.push(
      <span key="b" className="chip" style={{ padding: '3px 8px', boxShadow: 'none', background: '#ece5fb' }}>
        <BoosterIcon id={def.category === 'train' ? 'zoomies' : 'sniffer'} size={16} /> booster
      </span>,
    );
  return bits;
}

export function AdventureScreen({ onAcademy }: { onAcademy: () => void }) {
  const { s, actions } = useGame();
  const dog = s.profile!.dog;
  const [open, setOpen] = useState<QuestDef | null>(null);
  const [walking, setWalking] = useState(false);
  const today = dayKey();
  const restedToday = s.restDays.includes(today);
  const defs = s.quests.map((q) => ({ q, def: QUESTS.find((d) => d.id === q.defId)! })).filter((x) => x.def);
  const done = defs.filter((x) => x.q.done).length;
  const lessonsDone = Object.keys(s.lessons).length;
  const group = ageGroup(dog.ageYears);

  return (
    <div className="screen" style={{ background: 'var(--grass)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 26 }}>Adventure</h1>
        <Currencies stars={false} />
      </div>

      {/* Today's quest hero */}
      <div className="paper" style={{ marginTop: 14, padding: '20px 16px 16px', position: 'relative' }}>
        <div className="banner" style={{ position: 'absolute', top: -16, left: 16 }}>
          Today’s Quests
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <p className="hand" style={{ fontSize: 24 }}>
              {done === defs.length ? `All done! ${dog.name} is one happy ${group === 'puppy' ? 'pup' : 'dog'}.` : `${defs.length - done} little adventure${defs.length - done > 1 ? 's' : ''} waiting for you and ${dog.name}.`}
            </p>
            <p className="tiny" style={{ marginTop: 4 }}>
              Chosen for a {dog.ageYears < 1 ? 'puppy' : `${dog.ageYears}-year-old`} who’s {dog.energy === 'gentle' ? 'taking things gently' : dog.energy === 'bouncy' ? 'full of beans' : 'a steady explorer'}.
            </p>
          </div>
          <Dog look={dog.look} pose={done === defs.length ? 'celebrate' : 'happy'} size={86} />
        </div>
        <div className="stack" style={{ marginTop: 12 }}>
          {defs.map(({ q, def }) => (
            <motion.button key={def.id} whileTap={{ scale: 0.98 }} className="row" onClick={() => !q.done && setOpen(def)} style={{ opacity: q.done ? 0.75 : 1 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, border: '2.5px solid ' + (q.done ? '#5fae7a' : '#d9cfe9'), background: q.done ? '#5fae7a' : '#fff', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>{q.done && <Icon name="check" size={18} />}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ textDecoration: q.done ? 'line-through' : undefined }}>{fill(def.title, dog.name)}</h4>
                <p>
                  {CATEGORY_META[def.category].label} · {def.minutes} min
                </p>
                {!q.done && <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>{rewardsFor(def)}</div>}
              </div>
              <QuestArt cat={def.category} />
            </motion.button>
          ))}
        </div>
        <button className="btn full" style={{ marginTop: 14 }} onClick={() => setWalking(true)}>
          <svg viewBox="0 0 32 32" width="26" height="26">
            <g fill="#fff">
              <ellipse cx="16" cy="20" rx="6" ry="5" />
              <ellipse cx="7.5" cy="13" rx="2.6" ry="3.4" />
              <ellipse cx="12.5" cy="7.5" rx="2.6" ry="3.4" />
              <ellipse cx="19.5" cy="7.5" rx="2.6" ry="3.4" />
              <ellipse cx="24.5" cy="13" rx="2.6" ry="3.4" />
            </g>
          </svg>
          Start an adventure
        </button>
      </div>

      {/* rest */}
      <div className="row" style={{ marginTop: 14, background: '#fff' }}>
        <div className="thumb" style={{ background: '#e3dcfb' }}>
          <Dog look={dog.look} pose="sleep" size={48} shadow={false} />
        </div>
        <div style={{ flex: 1 }}>
          <h4>Rest day</h4>
          <p>{restedToday ? 'Logged. Rest days always count — your streak is safe.' : 'Feeling tired, poorly or rained in? Rest is part of a happy life. You’ll still earn bonus moves.'}</p>
        </div>
        <button className="btn lav xs" disabled={restedToday} onClick={actions.logRest}>
          {restedToday ? 'Done' : 'Rest'}
        </button>
      </div>

      {/* academy */}
      <motion.button whileTap={{ scale: 0.98 }} onClick={onAcademy} className="card" style={{ marginTop: 14, padding: 14, width: '100%', display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left' }}>
        <div className="thumb" style={{ width: 56, height: 56, borderRadius: 18, background: '#c9d1f6', display: 'grid', placeItems: 'center', color: '#5a6fc8' }}>
          <Icon name="cap" size={32} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: 18 }}>Paw Academy</h4>
          <p className="tiny" style={{ color: 'var(--ink-2)' }}>
            Short, kind, positive-reinforcement lessons. Learn tricks to unlock island animations and puzzle boosters.
          </p>
          <div className="progress lav" style={{ marginTop: 6 }}>
            <i style={{ width: `${(lessonsDone / ALL_LESSONS.length) * 100}%` }} />
          </div>
          <span className="tiny">
            {lessonsDone}/{ALL_LESSONS.length} lessons
          </span>
        </div>
        <Icon name="chev" />
      </motion.button>

      {/* how it connects */}
      <div className="section-title">
        <h3>Real life powers your world</h3>
      </div>
      <div className="grid2">
        {[
          { i: <MapIcon size={30} />, t: 'Walks', d: 'discover treasure maps for bonus puzzles' },
          { i: <Moves size={28} />, t: 'Play & rest', d: 'earn bonus moves' },
          { i: <BoosterIcon id="bone" size={30} />, t: 'Learning tricks', d: 'unlocks special boosters' },
          { i: <Heart size={28} />, t: 'Every quest', d: 'grows your friendship & diary' },
        ].map((x) => (
          <div key={x.t} className="tile" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
            {x.i}
            <b>{x.t}</b>
            <span className="tiny">{x.d}</span>
          </div>
        ))}
      </div>
      <p className="tiny" style={{ marginTop: 12, textAlign: 'center' }}>
        Puzzles are always playable without any real-world activity. WAG never asks for more exercise than is right for {dog.name}.
      </p>

      {/* recent adventures */}
      {s.adventures.length > 0 && (
        <>
          <div className="section-title">
            <h3>Recent adventures</h3>
          </div>
          <div className="stack">
            {s.adventures
              .slice(-4)
              .reverse()
              .map((a) => (
                <div key={a.id} className="row">
                  <div className="thumb" style={{ background: '#e1f0d9' }}>
                    <Icon name="pin" size={26} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4>
                      {a.minutes} min · {a.distanceKm.toFixed(1)} km
                    </h4>
                    <p>{a.discoveries.slice(0, 2).join(', ') || 'A lovely wander'}</p>
                  </div>
                  <span className="tiny">{new Date(a.endedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>
              ))}
          </div>
        </>
      )}

      <QuestSheet def={open} onClose={() => setOpen(null)} />
      <AnimatePresence>{walking && <Walk onClose={() => setWalking(false)} />}</AnimatePresence>
    </div>
  );
}

function QuestSheet({ def, onClose }: { def: QuestDef | null; onClose: () => void }) {
  const { s, actions } = useGame();
  const dog = s.profile!.dog;
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [mood, setMood] = useState('Happy');
  const [timer, setTimer] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!def) {
      setNote('');
      setPhoto(undefined);
      setTimer(null);
    }
  }, [def]);
  useEffect(() => {
    if (timer === null) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [timer]);
  if (!def) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const m = CATEGORY_META[def.category];
  const elapsed = timer ? (now - timer) / 1000 : 0;
  return (
    <Sheet open={!!def} onClose={onClose}>
      <div className="paper" style={{ padding: 16, transform: 'rotate(-.6deg)' }}>
        <span className="chip" style={{ background: m.soft, color: m.color, boxShadow: 'none' }}>
          {m.label} · {def.minutes} min
        </span>
        <h2 style={{ fontSize: 26, marginTop: 8 }}>{fill(def.title, dog.name)}</h2>
        <p className="hand" style={{ marginTop: 6 }}>
          {fill(def.blurb, dog.name)}
        </p>
        <div style={{ marginTop: 10, padding: 10, borderRadius: 14, background: 'rgba(255,255,255,.7)', fontWeight: 700, fontSize: 14 }}>
          <span className="label" style={{ display: 'block' }}>
            Kind tip
          </span>
          {fill(def.tip, dog.name)}
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <h4>Put your phone down</h4>
          <p>{timer ? `Together for ${fmtTime(elapsed)}` : 'Start a gentle timer, then pop your phone away.'}</p>
        </div>
        <button className="btn sky xs" onClick={() => setTimer(timer ? null : Date.now())}>
          {timer ? 'Stop' : 'Start'}
        </button>
      </div>

      <div className="label" style={{ marginTop: 14 }}>
        How did {dog.name} feel?
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {MOODS.map((x) => (
          <button key={x} className={`pill-btn ${mood === x ? 'on' : ''}`} onClick={() => setMood(x)} style={{ padding: '7px 12px', fontSize: 13 }}>
            {x}
          </button>
        ))}
      </div>
      <div className="label" style={{ marginTop: 14 }}>
        A little note for the diary (optional)
      </div>
      <textarea className="field" style={{ marginTop: 6 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder={`e.g. ${dog.name} found the most enormous stick…`} />
      <label className="row" style={{ marginTop: 10, cursor: 'pointer' }}>
        {photo ? <img src={photo} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }} /> : <div className="thumb" style={{ background: '#efe9fc' }}><Icon name="camera" /></div>}
        <div style={{ flex: 1 }}>
          <h4>{photo ? 'Photo added' : 'Add a photo'}</h4>
          <p>Saved to your diary and friendship garden — stored only on this device.</p>
        </div>
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setPhoto(await fileToDataUrl(f, 640, 0.72));
          }}
        />
      </label>
      <button
        className="btn full"
        style={{ marginTop: 16 }}
        onClick={() => {
          actions.completeQuest(def, { note: note || undefined, photo, mood });
          onClose();
        }}
      >
        <Icon name="check" /> We did it!
      </button>
      <p className="tiny" style={{ textAlign: 'center', marginTop: 8 }}>
        WAG trusts you — quests are honour-based. No tracking needed.
      </p>
    </Sheet>
  );
}

// ---------------- walk tracker ----------------

const SIM_PACE_KMH = 3.6;

function Walk({ onClose }: { onClose: () => void }) {
  const { s, actions } = useGame();
  const dog = s.profile!.dog;
  const [start] = useState(Date.now());
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [boost, setBoost] = useState(1);
  const [gps, setGps] = useState<'off' | 'asking' | 'on' | 'denied'>('off');
  const [km, setKm] = useState(0);
  const lastPos = useRef<GeolocationCoordinates | null>(null);
  const watch = useRef<number | null>(null);
  const [finds, setFinds] = useState<string[]>([]);
  const [pop, setPop] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<AdventureRecord | null>(null);
  const [photo, setPhoto] = useState<string | undefined>();
  const nextFind = useRef(25);

  useEffect(() => {
    if (paused || summary) return;
    const t = window.setInterval(() => {
      setElapsed((e) => {
        const ne = e + boost;
        if (gps !== 'on') setKm((k) => k + (SIM_PACE_KMH / 3600) * boost);
        if (ne >= nextFind.current) {
          nextFind.current = ne + 35 + Math.random() * 40;
          const pool = DISCOVERIES.filter((d) => !finds.includes(d.name));
          const r = Math.random();
          const rare = pool.filter((d) => d.rarity === (r < 0.1 ? 'rare' : r < 0.35 ? 'uncommon' : 'common'));
          const d = (rare.length ? rare : pool)[Math.floor(Math.random() * (rare.length || pool.length))];
          if (d) {
            setFinds((f) => [...f, d.name]);
            setPop(d.name);
            window.setTimeout(() => setPop(null), 2600);
          }
        }
        return ne;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [paused, boost, gps, finds, summary]);

  useEffect(
    () => () => {
      if (watch.current !== null) navigator.geolocation?.clearWatch(watch.current);
    },
    [],
  );

  const enableGps = () => {
    if (!navigator.geolocation) return setGps('denied');
    setGps('asking');
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        setGps('on');
        if (lastPos.current) {
          const d = haversineKm(lastPos.current, p.coords);
          if (d > 0.003 && d < 0.2) setKm((k) => k + d);
        }
        lastPos.current = p.coords;
      },
      () => setGps('denied'),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  };

  const finish = () => {
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const done = WALK_CHALLENGES.filter((c) => (counts[c.id] ?? 0) >= c.target).map((c) => c.id);
    const rec: AdventureRecord = {
      id: uid(),
      startedAt: start,
      endedAt: Date.now(),
      minutes,
      distanceKm: km,
      discoveries: finds,
      challenges: done,
      coins: 15 + Math.min(60, minutes) + finds.length * 8 + done.length * 10,
      xp: 30 + Math.min(60, minutes * 2) + done.length * 10,
      usedGps: gps === 'on',
    };
    setSummary(rec);
  };

  const progress = Math.min(1, elapsed / (30 * 60));

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }} style={{ position: 'absolute', inset: 0, zIndex: 55, background: 'var(--sky-flat)', overflowY: 'auto' }}>
      {!summary ? (
        <div style={{ padding: 'calc(var(--safe-top) + 14px) 16px calc(var(--safe-bottom) + 24px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
            <div className="banner" style={{ fontSize: 18 }}>
              Adventure with {dog.name}
            </div>
            <div style={{ width: 42 }} />
          </div>

          {/* illustrated trail */}
          <div style={{ position: 'relative', height: 250, marginTop: 14, borderRadius: 28, overflow: 'hidden', background: '#e7f4d6', boxShadow: 'var(--shadow)' }}>
            <svg viewBox="0 0 360 250" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
              <path d="M0 150 Q80 100 160 140 Q240 90 360 130 L360 250 L0 250Z" fill="#9fd27e" />
              <path d="M0 190 Q100 160 200 190 Q290 210 360 180 L360 250 L0 250Z" fill="#7fbf5f" />
              {[40, 110, 260, 320].map((x, i) => (
                <g key={x} transform={`translate(${x} ${140 + (i % 2) * 14})`}>
                  <g className="sway">
                    <rect x="-3" y="-12" width="6" height="14" fill="#7a5233" />
                    <circle cy="-26" r="17" fill={i % 2 ? '#f59cc2' : '#6faa4c'} />
                  </g>
                </g>
              ))}
              <path id="trail" d="M20 230 C 90 200, 70 170, 150 180 S 240 200, 260 160 S 300 120, 340 120" stroke="#f3e3c0" strokeWidth="14" fill="none" strokeLinecap="round" />
              <path d="M20 230 C 90 200, 70 170, 150 180 S 240 200, 260 160 S 300 120, 340 120" stroke="#5fae7a" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset={1000 - progress * 420} />
              {finds.map((_, i) => (
                <g key={i} transform={`translate(${60 + i * 50} ${200 - i * 14})`}>
                  <circle r="9" fill="#fff3c4" stroke="#f5b53d" strokeWidth="2" />
                  <path d="M0 -4 L1.2 -1.2 L4 0 L1.2 1.2 L0 4 L-1.2 1.2 L-4 0 L-1.2 -1.2Z" fill="#f5b53d" />
                </g>
              ))}
            </svg>
            <motion.div animate={{ left: `${6 + progress * 76}%`, top: `${74 - progress * 34}%` }} transition={{ duration: 1 }} style={{ position: 'absolute', transform: 'translate(-50%,-90%)' }}>
              <Dog look={dog.look} pose={paused ? 'sniff' : 'walk'} size={70} />
            </motion.div>
            <AnimatePresence>
              {pop && (
                <motion.div initial={{ scale: 0.5, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="card" style={{ position: 'absolute', left: 16, right: 16, top: 14, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapIcon size={34} />
                  <div>
                    <div className="label">Discovery!</div>
                    <b>{pop}</b>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* stats */}
          <div className="grid3" style={{ marginTop: 12 }}>
            <Stat label="Time" value={fmtTime(elapsed)} />
            <Stat label="Distance" value={`${km.toFixed(2)} km`} />
            <Stat label="Finds" value={String(finds.length)} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
            {gps === 'on' ? <Sim live>Live GPS distance</Sim> : <Sim>Simulated distance & discoveries</Sim>}
            {gps === 'off' && (
              <button className="btn sky xs" onClick={enableGps}>
                <Icon name="pin" size={16} /> Use my location
              </button>
            )}
            {gps === 'asking' && <span className="tiny">Waiting for location…</span>}
            {gps === 'denied' && <span className="tiny">Location unavailable — using simulation</span>}
            <button className={`pill-btn ${boost > 1 ? 'on' : ''}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setBoost(boost > 1 ? 1 : 30)}>
              Demo fast-forward {boost > 1 ? 'on' : 'off'}
            </button>
          </div>

          {/* challenges */}
          <div className="section-title">
            <h3>Walk challenges</h3>
            <span className="tiny">optional</span>
          </div>
          <div className="stack">
            {WALK_CHALLENGES.map((c) => {
              const n = counts[c.id] ?? 0;
              const ok = n >= c.target;
              return (
                <div key={c.id} className="row" style={{ background: ok ? '#e9f7e2' : undefined }}>
                  <div style={{ flex: 1 }}>
                    <h4>{c.title}</h4>
                    <div className="progress" style={{ marginTop: 6, height: 8 }}>
                      <i style={{ width: `${Math.min(1, n / c.target) * 100}%` }} />
                    </div>
                  </div>
                  <span className="tiny">
                    {Math.min(n, c.target)}/{c.target}
                  </span>
                  <button className="btn xs" disabled={ok} onClick={() => setCounts((x) => ({ ...x, [c.id]: n + 1 }))}>
                    {ok ? <Icon name="check" size={16} /> : '+1'}
                  </button>
                </div>
              );
            })}
          </div>

          <label className="row" style={{ marginTop: 10, cursor: 'pointer' }}>
            {photo ? <img src={photo} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }} /> : <div className="thumb" style={{ background: '#efe9fc' }}><Icon name="camera" /></div>}
            <div style={{ flex: 1 }}>
              <h4>{photo ? 'Memory captured' : 'Capture a memory'}</h4>
              <p>Then put the phone back in your pocket.</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setPhoto(await fileToDataUrl(f, 640, 0.72));
              }}
            />
          </label>

          <div className="grid2" style={{ marginTop: 16 }}>
            <button className="btn cream" onClick={() => setPaused(!paused)}>
              <Icon name={paused ? 'play' : 'pause'} /> {paused ? 'Resume' : 'Sniff break'}
            </button>
            <button className="btn rose" onClick={finish} disabled={elapsed < 5}>
              <Icon name="stop" /> Finish
            </button>
          </div>
          <p className="tiny" style={{ textAlign: 'center', marginTop: 10 }}>
            Take water, follow {dog.name}’s pace, and stop whenever they want to. Short and sniffy is perfect.
          </p>
        </div>
      ) : (
        <Summary rec={summary} photo={photo} onDone={() => {
          actions.finishAdventure(summary, photo);
          onClose();
        }} />
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile" style={{ padding: 10 }}>
      <span className="tiny">{label}</span>
      <b style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{value}</b>
    </div>
  );
}

function Summary({ rec, photo, onDone }: { rec: AdventureRecord; photo?: string; onDone: () => void }) {
  const { s } = useGame();
  const dog = s.profile!.dog;
  return (
    <div style={{ padding: 'calc(var(--safe-top) + 20px) 16px calc(var(--safe-bottom) + 24px)', position: 'relative' }}>
      <Confetti />
      <motion.div initial={{ scale: 0.8, rotate: -3, opacity: 0 }} animate={{ scale: 1, rotate: -1, opacity: 1 }} className="paper" style={{ padding: 18, position: 'relative' }}>
        <div className="banner" style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%) rotate(-2deg)', whiteSpace: 'nowrap' }}>
          What a day!
        </div>
        <div style={{ height: 190, borderRadius: 18, overflow: 'hidden', position: 'relative', marginTop: 14, background: 'linear-gradient(180deg,#f6b3c8 0 58%,#8fcb64 58%)' }}>
          {photo && <img src={photo} alt="" style={{ position: 'absolute', right: 10, top: 10, width: 96, height: 96, objectFit: 'cover', borderRadius: 6, border: '5px solid #fff', transform: 'rotate(5deg)', boxShadow: 'var(--shadow-sm)' }} />}
          <div style={{ position: 'absolute', left: '50%', bottom: 4, transform: 'translateX(-50%)' }}>
            <Dog look={dog.look} pose="celebrate" size={120} />
          </div>
        </div>
        <p className="hand" style={{ marginTop: 12, textAlign: 'center' }}>
          {rec.minutes} minutes together · {rec.distanceKm.toFixed(1)} km of sniffs
        </p>
        <div className="stack" style={{ marginTop: 10 }}>
          {rec.discoveries.length ? (
            rec.discoveries.map((d) => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <MapIcon size={22} /> {d}
              </div>
            ))
          ) : (
            <p className="muted" style={{ fontWeight: 700, textAlign: 'center' }}>
              No treasures this time — just the best company.
            </p>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <span className="chip">
            <Coin size={18} /> +{rec.coins}
          </span>
          <span className="chip">
            <Heart size={18} /> +{rec.xp}
          </span>
          <span className="chip">
            <MapIcon size={18} /> +{1 + (rec.discoveries.length >= 3 ? 1 : 0)} treasure map
          </span>
          <span className="chip">
            <Seed size={18} /> +{rec.discoveries.length >= 3 ? 2 : 1}
          </span>
        </div>
      </motion.div>
      <button className="btn full" style={{ marginTop: 20 }} onClick={onDone}>
        Collect rewards
      </button>
    </div>
  );
}
