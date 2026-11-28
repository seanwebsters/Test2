import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Creature } from '../art/Creatures';
import { Deco } from '../art/Decor';
import { Dog, type Pose } from '../art/Dog';
import { Flame, Icon, Seed, Star } from '../art/Icons';
import { Island, WAYPOINTS, type IslandTarget } from '../art/Island';
import { AREAS, BANDANAS, CREATURES, HATS, ITEMS, ITEM_BY_ID, PROJECTS, levelFromXp } from '../game/data';
import { areaUnlocked, plotStage, useGame } from '../game/store';
import type { SeedPlot } from '../game/types';
import { greeting, season, type Phase } from '../game/util';
import { LEVELS } from '../match3/levels';
import { Currencies, Sheet, Sky } from '../ui/Common';
import { nextLevel } from './Play';

const TRICK_POSE: Record<string, Pose> = { wave: 'wave', spin: 'spin', bow: 'bow', perk: 'perk', boop: 'boop', sniff: 'sniff', roll: 'roll' };

export function WorldScreen({ phase, onPlay, onTab, onProfile, buildOpen, setBuildOpen }: { phase: Phase; onPlay: () => void; onTab: (t: 'adventure' | 'diary') => void; onProfile: () => void; buildOpen: boolean; setBuildOpen: (b: boolean) => void }) {
  const { s, actions, say } = useGame();
  const p = s.profile!;
  const dog = p.dog;
  const lvl = levelFromXp(s.xp);
  const next = nextLevel(s.puzzle.best);
  const questsLeft = s.quests.filter((q) => !q.done).length;

  // ---- wandering dog ----
  const [pos, setPos] = useState({ x: 420, y: 420 });
  const [pose, setPose] = useState<Pose>('idle');
  const [flip, setFlip] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [hearts, setHearts] = useState<number[]>([]);
  const holdRef = useRef(0);
  const posRef = useRef(pos);
  posRef.current = pos;
  const points = useMemo(() => {
    const pts = [...WAYPOINTS.meadow];
    if (s.restored.includes('bridge')) pts.push(...WAYPOINTS.bridge);
    if (s.restored.includes('woods')) pts.push(...WAYPOINTS.woods);
    return pts;
  }, [s.restored]);

  useEffect(() => {
    let t: number;
    const tick = () => {
      t = window.setTimeout(() => {
        if (Date.now() < holdRef.current) return tick();
        const cur = posRef.current;
        const target = points[Math.floor(Math.random() * points.length)];
        setFlip(target.x < cur.x);
        setPose('walk');
        setPos(target);
        const d = Math.hypot(target.x - cur.x, target.y - cur.y);
        window.setTimeout(() => {
          const r = Math.random();
          setPose(phase === 'night' && r < 0.5 ? 'sleep' : r < 0.3 ? 'sniff' : r < 0.45 ? 'perk' : 'idle');
        }, Math.max(600, d * 9));
        tick();
      }, 3800 + Math.random() * 3000);
    };
    tick();
    return () => window.clearTimeout(t);
  }, [points, phase]);

  const tapDog = () => {
    holdRef.current = Date.now() + 2600;
    const tricks = s.tricks.map((t) => TRICK_POSE[t]).filter(Boolean);
    const options: Pose[] = ['happy', 'excited', ...tricks];
    const pz = options[Math.floor(Math.random() * options.length)];
    setPose(pz);
    const lines = [`I love you, ${p.ownerName}!`, 'Walk? Did someone say walk?!', 'This is OUR island.', 'Scratch my ears please!', `Look what we built!`, 'Woof! (that means hello)'];
    if (s.tricks.length && pz !== 'happy' && pz !== 'excited') lines.unshift('Watch my trick!');
    setBubble(lines[Math.floor(Math.random() * lines.length)]);
    setHearts((h) => [...h, Date.now()]);
    actions.cuddle();
    if (!s.seenIntro) actions.markIntro();
    window.setTimeout(() => {
      setBubble(null);
      setPose('idle');
    }, 2400);
  };

  // ---- pan & placement ----
  const [placing, setPlacing] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toSvg = (e: React.MouseEvent) => {
    const svg = containerRef.current?.querySelector('svg.island-svg') as SVGSVGElement | null;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const r = pt.matrixTransform(m.inverse());
    return { x: Math.round(r.x), y: Math.round(r.y) };
  };
  const onIslandClick = (e: React.MouseEvent) => {
    if (dragging.current) return;
    if (!placing && !moving) return;
    const pt = toSvg(e);
    if (!pt) return;
    // keep on the grass top
    const nx = (pt.x - 400) / 300;
    const ny = (pt.y - 380) / 140;
    if (nx * nx + ny * ny > 1) {
      say('Place it on the grass, please!');
      return;
    }
    if (placing) {
      actions.place(placing, pt.x, pt.y);
      say(`${ITEM_BY_ID[placing].name} placed!`);
      if ((s.inventory[placing] ?? 0) <= 1) setPlacing(null);
    } else if (moving) {
      actions.move(moving, pt.x, pt.y);
      setMoving(null);
      setSelected(null);
    }
  };

  // ---- sheets ----
  const [sheet, setSheet] = useState<null | 'bag' | 'garden' | 'plus' | 'story'>(null);
  const [story, setStory] = useState<{ title: string; text: string } | null>(null);
  const [focusPlot, setFocusPlot] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);
  const stages = [0, 1, 2].map((i) => {
    const pl = s.plots.find((x) => x.plot === i);
    return pl ? plotStage(pl, now) : -1;
  });

  const onTarget = (t: IslandTarget, extra?: number) => {
    if (dragging.current || placing || moving) return;
    const need: Partial<Record<IslandTarget, string>> = { bridge: 'bridge', tree: 'blossom', cottage: 'cottage', waterfall: 'waterfall', woods: 'woods', grotto: 'grotto', islet: 'islet' };
    const pid = need[t];
    if (pid && !s.restored.includes(pid)) {
      setBuildOpen(true);
      return;
    }
    const stories: Partial<Record<IslandTarget, { title: string; text: string }>> = {
      bridge: { title: 'The little bridge', text: 'Barnaby the badger crosses it every morning now, humming. He left a thank-you acorn.' },
      tree: { title: 'The Wishing Tree', text: `Every lantern is a memory of ${dog.name}. When the wind blows, the petals smell faintly of sunshine and ${dog.name}’s ears.` },
      cottage: { title: `${dog.name}’s cottage`, text: 'A crackling fire, a squashy bed and a window for watching the rain. Home.' },
      waterfall: { title: 'The magical waterfall', text: 'Pip the otter swims here at dawn. The spray makes tiny rainbows if you stand just right.' },
      woods: { title: 'Whispering Woods', text: 'Hazel the owl says the trees remember every walk you take together. Shh — they’re listening.' },
      grotto: { title: 'Waterfall Grotto', text: 'Behind the curtain of water, glowmoths gather around a soft golden light.' },
      islet: { title: 'Starlight Islet', text: 'Luna the star fox maps the sky from her tiny observatory. She says every dog has a star.' },
      pond: { title: 'Lily pond', text: 'Ripples, lily pads and one very relaxed frog.' },
    };
    if (t === 'garden' || t === 'plot') {
      setFocusPlot(t === 'plot' ? (extra ?? 0) : null);
      setSheet('garden');
      return;
    }
    if (t === 'cove') {
      if (s.plus) setStory({ title: 'Crystal Cove', text: 'A WAG Plus territory. The crystals hum a lullaby only dogs can hear.' });
      else setSheet('plus');
      if (s.plus) setSheet('story');
      return;
    }
    const st = stories[t];
    if (st) {
      setStory(st);
      setSheet('story');
    }
  };

  const view = useMemo(
    () => ({ restored: s.restored, placed: s.placed, creatures: s.creatures, plots: s.plots, look: dog.look, plus: !!s.plus, name: p.islandName }),
    [s.restored, s.placed, s.creatures, s.plots, dog.look, s.plus, p.islandName],
  );

  const [w, setW] = useState(400);
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const islandW = Math.max(w * 1.3, 520);
  const islandH = islandW * (760 / 800);

  return (
    <div className="screen" style={{ padding: 0, overflow: 'hidden' }}>
      <Sky phase={phase} />
      {/* island */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <motion.div
          ref={containerRef}
          drag
          dragConstraints={{ left: -(islandW - w) - 20, right: 20, top: -120, bottom: 40 }}
          dragElastic={0.12}
          initial={{ x: -(islandW - w) / 2, y: 20 }}
          onDragStart={() => (dragging.current = true)}
          onDragEnd={() => window.setTimeout(() => (dragging.current = false), 60)}
          onClick={onIslandClick}
          style={{ position: 'absolute', top: 120, width: islandW, height: islandH, cursor: placing || moving ? 'crosshair' : 'grab', touchAction: 'none' }}
        >
          <Island
            view={view}
            phase={phase}
            dogPos={pos}
            dogPose={pose}
            dogFlip={flip}
            dogMs={pose === 'walk' ? 2200 : 300}
            onDog={tapDog}
            onTarget={onTarget}
            onDeco={(uid) => {
              if (dragging.current) return;
              setSelected(uid === selected ? null : uid);
            }}
            selected={selected}
            plotStages={stages}
          />
          {/* speech bubble & hearts in island space */}
          <div style={{ position: 'absolute', left: `${(pos.x / 800) * 100}%`, top: `${((pos.y - 76) / 760) * 100}%`, transform: 'translate(-50%,-100%)', pointerEvents: 'none', transition: 'left 2.2s ease-in-out, top 2.2s ease-in-out' }}>
            <AnimatePresence>
              {bubble && (
                <motion.div initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, opacity: 0 }} style={{ background: '#fff', borderRadius: 16, padding: '6px 12px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', boxShadow: 'var(--shadow)' }}>
                  {bubble}
                </motion.div>
              )}
            </AnimatePresence>
            {hearts.slice(-4).map((h) => (
              <motion.svg key={h} viewBox="0 0 40 40" width="22" height="22" initial={{ y: 0, opacity: 1, x: 0 }} animate={{ y: -70, opacity: 0, x: (h % 40) - 20 }} transition={{ duration: 1.4 }} style={{ position: 'absolute', left: '50%', top: 0 }}>
                <path d="M20 34 C 8 26, 3 19, 6 12 C 9 6, 17 6, 20 12 C 23 6, 31 6, 34 12 C 37 19, 32 26, 20 34Z" fill="#f0607e" />
              </motion.svg>
            ))}
          </div>
        </motion.div>
      </div>

      {/* top HUD */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 'calc(var(--safe-top) + 12px) 14px 0', zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button onClick={onProfile} style={{ position: 'relative', width: 50, height: 50, borderRadius: '50%', overflow: 'hidden', border: '3px solid #fff', boxShadow: 'var(--shadow)', background: '#f6e3c4', flex: 'none' }} aria-label="Profile and settings">
            {dog.photo ? <img src={dog.photo} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ marginTop: -2, marginLeft: -2 }}><Dog look={dog.look} size={54} shadow={false} /></div>}
          </button>
          <Currencies />
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: 13, color: phase === 'night' ? '#e9e2ff' : 'var(--ink-2)' }}>{greeting()},</p>
            <h1 style={{ fontSize: 25, color: phase === 'night' ? '#fff' : 'var(--ink)', textShadow: '0 2px 10px rgba(255,255,255,.4)' }}>
              {p.ownerName} & {dog.name}!
            </h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <span className="chip">
            <Flame /> {s.streak.count || 1} day{(s.streak.count || 1) > 1 ? 's' : ''} together
          </span>
          <span className="chip" title="Friendship level">
            <svg width="18" height="18" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#efe9fc" strokeWidth="5" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f0607e" strokeWidth="5" strokeDasharray={`${lvl.pct * 88} 88`} className="ring-xp" style={{ transformOrigin: 'center' }} strokeLinecap="round" />
            </svg>
            Friendship {lvl.level}
          </span>
        </div>
      </div>

      {/* side actions */}
      <div style={{ position: 'absolute', right: 12, top: 'calc(var(--safe-top) + 170px)', display: 'grid', gap: 10, zIndex: 5 }}>
        <SideBtn label="Build" onClick={() => setBuildOpen(true)} badge={PROJECTS.some((x) => !s.restored.includes(x.id) && s.puzzle.stars >= x.stars && (!x.requires || s.restored.includes(x.requires)))}>
          <Star size={28} />
        </SideBtn>
        <SideBtn label="Decorate" onClick={() => setSheet('bag')}>
          <svg viewBox="-34 -56 68 64" width="30" height="30">
            <Deco id="lantern" />
          </svg>
        </SideBtn>
        <SideBtn label="Garden" onClick={() => setSheet('garden')} badge={stages.some((x) => x >= 3)}>
          <Seed size={26} />
        </SideBtn>
        <SideBtn label={phase === 'night' ? 'Night' : 'Day'} onClick={() => actions.setTimeMode(s.timeMode === 'auto' ? (phase === 'night' ? 'day' : 'night') : s.timeMode === 'day' ? 'sunset' : s.timeMode === 'sunset' ? 'night' : 'auto')}>
          <Icon name={phase === 'night' ? 'moon' : 'sun'} size={24} />
        </SideBtn>
      </div>
      <div style={{ position: 'absolute', left: 12, top: 'calc(var(--safe-top) + 170px)', display: 'grid', gap: 10, zIndex: 5 }}>
        <SideBtn label="Quests" onClick={() => onTab('adventure')} badge={questsLeft > 0} count={questsLeft}>
          <svg viewBox="0 0 32 32" width="28" height="28">
            <rect x="6" y="5" width="20" height="24" rx="4" fill="#fff6e4" stroke="#c9a46a" strokeWidth="2" />
            <rect x="11" y="2" width="10" height="6" rx="2" fill="#c9a46a" />
            <path d="M10 14 l2 2 l4 -4 M10 21 l2 2 l4 -4" stroke="#5fae7a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </svg>
        </SideBtn>
        <SideBtn label="Diary" onClick={() => onTab('diary')}>
          <svg viewBox="0 0 32 32" width="28" height="28">
            <path d="M4 8 Q10 5 16 9 Q22 5 28 8 L28 25 Q22 22 16 26 Q10 22 4 25Z" fill="#fffaf0" stroke="#b8875a" strokeWidth="2" />
            <path d="M16 9 L16 26" stroke="#b8875a" strokeWidth="2" />
            <path d="M20 15 C 18 13, 22 11, 22 14 C 22 11, 26 13, 24 15 L22 18Z" fill="#f0607e" />
          </svg>
        </SideBtn>
      </div>

      {/* placing bar */}
      <AnimatePresence>
        {(placing || moving || selected) && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="glass" style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(var(--safe-bottom) + 178px)', borderRadius: 20, padding: 10, display: 'flex', alignItems: 'center', gap: 10, zIndex: 6 }}>
            {placing && (
              <>
                <svg viewBox="-34 -56 68 64" width="40" height="40">
                  <Deco id={placing} />
                </svg>
                <b style={{ flex: 1 }}>Tap the island to place {ITEM_BY_ID[placing].name}</b>
                <button className="btn cream xs" onClick={() => setPlacing(null)}>
                  Done
                </button>
              </>
            )}
            {!placing && moving && (
              <>
                <b style={{ flex: 1 }}>Tap where it should go</b>
                <button className="btn cream xs" onClick={() => setMoving(null)}>
                  Cancel
                </button>
              </>
            )}
            {!placing && !moving && selected && (
              <>
                <b style={{ flex: 1 }}>{ITEM_BY_ID[s.placed.find((x) => x.uid === selected)?.itemId ?? '']?.name}</b>
                <button className="btn sky xs" onClick={() => setMoving(selected)}>
                  Move
                </button>
                <button
                  className="btn rose xs"
                  onClick={() => {
                    actions.pickUp(selected);
                    setSelected(null);
                  }}
                >
                  Store
                </button>
                <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setSelected(null)}>
                  <Icon name="close" size={16} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play CTA */}
      {!placing && !moving && !selected && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(var(--safe-bottom) + 100px)', display: 'flex', justifyContent: 'center', zIndex: 5 }}>
          <motion.button className="btn" onClick={onPlay} animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 2.2 }} style={{ minHeight: 66, padding: '0 34px', borderRadius: 26, flexDirection: 'row' }}>
            <svg viewBox="0 0 24 24" width="30" height="30">
              <path d="M7 4 L20 12 L7 20Z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <span style={{ display: 'grid', lineHeight: 1, textAlign: 'left' }}>
              <span style={{ fontSize: 24 }}>Play</span>
              <span style={{ fontSize: 14, opacity: 0.95 }}>{s.puzzle.best[LEVELS[LEVELS.length - 1].id] ? 'Replay any level' : `Level ${next.num}`}</span>
            </span>
          </motion.button>
        </div>
      )}

      {/* first-visit coach */}
      <AnimatePresence>
        {!s.seenIntro && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card" style={{ position: 'absolute', left: 20, right: 20, bottom: 'calc(var(--safe-bottom) + 184px)', padding: 14, zIndex: 7, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Icon name="hand" size={30} />
            <p style={{ fontWeight: 700 }}>
              This is {p.islandName}. <b>Tap {dog.name}</b> to say hello — then drag to explore.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <BuildSheet open={buildOpen} onClose={() => setBuildOpen(false)} onPlay={onPlay} />
      <BagSheet open={sheet === 'bag'} onClose={() => setSheet(null)} onPlace={(id) => { setPlacing(id); setSheet(null); }} />
      <GardenSheet open={sheet === 'garden'} onClose={() => setSheet(null)} stages={stages} focus={focusPlot} />
      <Sheet open={sheet === 'story'} onClose={() => setSheet(null)} title={story?.title}>
        <p className="hand" style={{ fontSize: 24 }}>{story?.text}</p>
        <button className="btn full" style={{ marginTop: 18 }} onClick={() => setSheet(null)}>
          Lovely
        </button>
      </Sheet>
      <PlusSheet open={sheet === 'plus'} onClose={() => setSheet(null)} />
    </div>
  );
}

function SideBtn({ children, label, onClick, badge, count }: { children: React.ReactNode; label: string; onClick: () => void; badge?: boolean; count?: number }) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onClick} style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
      <span style={{ position: 'relative', width: 52, height: 52, borderRadius: 18, background: 'rgba(255,250,241,.94)', display: 'grid', placeItems: 'center', boxShadow: '0 4px 0 rgba(110,91,184,.25), var(--shadow-sm)' }}>
        {children}
        {badge && (
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: '#f0607e', color: '#fff', fontSize: 10.5, fontWeight: 900, display: 'grid', placeItems: 'center', border: '2px solid #fff', padding: '0 3px' }}>{count ?? '!'}</span>
        )}
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink)', background: 'rgba(255,255,255,.75)', borderRadius: 8, padding: '0 6px' }}>{label}</span>
    </motion.button>
  );
}

function ProjectArt({ id }: { id: string }) {
  const map: Record<string, React.ReactNode> = {
    bridge: (
      <g>
        <path d="M6 34 Q30 18 54 34 L54 40 Q30 24 6 40Z" fill="#b5835a" />
        <path d="M6 28 Q30 12 54 28" stroke="#8a5d3b" strokeWidth="3" fill="none" />
        <rect x="5" y="22" width="4" height="18" fill="#7a5233" />
        <rect x="51" y="22" width="4" height="18" fill="#7a5233" />
        <path d="M0 44 Q30 40 60 44" stroke="#7dc8ee" strokeWidth="5" fill="none" />
      </g>
    ),
    blossom: (
      <g>
        <rect x="27" y="30" width="6" height="18" fill="#8a5d3b" />
        <circle cx="30" cy="22" r="16" fill="#f59cc2" />
        <circle cx="20" cy="28" r="10" fill="#e985b4" />
        <circle cx="40" cy="28" r="10" fill="#e985b4" />
        <circle cx="26" cy="16" r="7" fill="#ffd0e4" />
      </g>
    ),
    cottage: (
      <g>
        <rect x="12" y="26" width="36" height="22" fill="#fbe9cf" />
        <path d="M6 28 Q30 0 54 28Z" fill="#8c6fd6" />
        <path d="M26 48 L26 38 Q30 32 34 38 L34 48Z" fill="#8a5a3b" />
        <circle cx="18" cy="35" r="4" fill="#bfe3f7" />
        <circle cx="42" cy="35" r="4" fill="#bfe3f7" />
      </g>
    ),
    waterfall: (
      <g>
        <path d="M10 10 L50 10 L46 48 L14 48Z" fill="#a8795a" />
        <rect x="22" y="10" width="16" height="36" fill="#9fe0f5" />
        <path d="M26 10 V46 M34 10 V46" stroke="#fff" strokeWidth="2" strokeDasharray="4 4" />
        <ellipse cx="30" cy="48" rx="14" ry="4" fill="#fff" opacity=".8" />
      </g>
    ),
    woods: (
      <g>
        <path d="M18 8 L30 40 L6 40Z" fill="#3f7d4a" />
        <path d="M40 4 L54 40 L26 40Z" fill="#5b9e5d" />
        <rect x="16" y="40" width="4" height="8" fill="#7b5233" />
        <rect x="38" y="40" width="4" height="8" fill="#7b5233" />
      </g>
    ),
    grotto: (
      <g>
        <path d="M6 48 Q8 10 30 8 Q52 10 54 48Z" fill="#8a634e" />
        <path d="M18 48 Q20 24 30 22 Q40 24 42 48Z" fill="#3d3a6b" />
        <circle cx="30" cy="38" r="5" fill="#ffe38a" />
      </g>
    ),
    islet: (
      <g>
        <path d="M8 30 Q30 22 52 30 Q44 50 30 54 Q16 50 8 30Z" fill="#a8795a" />
        <ellipse cx="30" cy="30" rx="22" ry="6" fill="#8fcb64" />
        <rect x="26" y="10" width="8" height="20" fill="#f5ecff" />
        <path d="M24 10 Q30 0 36 10Z" fill="#6d52b8" />
      </g>
    ),
  };
  return (
    <svg viewBox="0 0 60 56" width="64" height="60">
      {map[id]}
    </svg>
  );
}

export function BuildSheet({ open, onClose, onPlay }: { open: boolean; onClose: () => void; onPlay: () => void }) {
  const { s, actions } = useGame();
  const dog = s.profile!.dog;
  const area = (id?: string) => AREAS.find((a) => a.id === id);
  return (
    <Sheet open={open} onClose={onClose} title="Build your world">
      <div className="row" style={{ background: 'linear-gradient(135deg,#fff3c4,#ffe7b8)' }}>
        <Star size={40} />
        <div style={{ flex: 1 }}>
          <h4>
            {s.puzzle.stars} star{s.puzzle.stars === 1 ? '' : 's'} to spend
          </h4>
          <p>Win Treasure Trails puzzles to earn stars.</p>
        </div>
        <button
          className="btn xs"
          onClick={() => {
            onClose();
            onPlay();
          }}
        >
          Play
        </button>
      </div>
      <div className="grid2" style={{ marginTop: 12 }}>
        {PROJECTS.map((p) => {
          const done = s.restored.includes(p.id);
          const ready = !p.requires || s.restored.includes(p.requires);
          const afford = s.puzzle.stars >= p.stars;
          const a = area(p.area);
          return (
            <motion.div key={p.id} layout className="tile" style={{ padding: 12, opacity: ready || done ? 1 : 0.55, background: done ? 'linear-gradient(180deg,#e9f7e2,#d5efc8)' : a ? 'linear-gradient(180deg,#f4efff,#e5dcfa)' : undefined }}>
              <ProjectArt id={p.id} />
              <b style={{ fontSize: 13.5, lineHeight: 1.2 }}>{p.name.replaceAll('{dog}', dog.name)}</b>
              <span className="tiny" style={{ lineHeight: 1.25 }}>
                {p.story.replaceAll('{dog}', dog.name)}
              </span>
              {a && <span className="sim live" style={{ marginTop: 2 }}>New territory</span>}
              <div style={{ marginTop: 'auto', paddingTop: 6, width: '100%' }}>
                {done ? (
                  <span className="chip" style={{ color: '#3f9a48' }}>
                    <Icon name="check" size={16} /> Restored
                  </span>
                ) : (
                  <button className="btn xs full" disabled={!ready || !afford} onClick={() => actions.build(p.id)}>
                    <Star size={18} /> {p.stars} · Build
                  </button>
                )}
                {!done && !ready && <div className="tiny" style={{ marginTop: 4 }}>Build the previous project first</div>}
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="tiny" style={{ marginTop: 12 }}>
        Your friendship level ({levelFromXp(s.xp).level}) grows from real-world time with {dog.name} and unlocks new shop decorations.
      </p>
    </Sheet>
  );
}

function BagSheet({ open, onClose, onPlace }: { open: boolean; onClose: () => void; onPlace: (id: string) => void }) {
  const { s, actions } = useGame();
  const [tab, setTab] = useState<'bag' | 'shop' | 'dog' | 'book'>('bag');
  const lvl = levelFromXp(s.xp).level;
  const dog = s.profile!.dog;
  const inv = Object.entries(s.inventory).filter(([, n]) => n > 0);
  const sea = season();
  return (
    <Sheet open={open} onClose={onClose} title="Decorate">
      <div className="seg">
        {(
          [
            ['bag', 'Bag'],
            ['shop', 'Shop'],
            ['dog', 'Outfits'],
            ['book', 'Creatures'],
          ] as const
        ).map(([id, l]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'bag' && (
        <div className="grid3" style={{ marginTop: 12 }}>
          {inv.length === 0 && <p className="muted" style={{ gridColumn: '1/-1', fontWeight: 700 }}>Your bag is empty. Visit the shop, complete quests or win puzzles for decorations.</p>}
          {inv.map(([id, n]) => (
            <button key={id} className="tile" onClick={() => onPlace(id)}>
              <svg viewBox="-34 -60 68 68" width="56" height="56">
                <Deco id={id} />
              </svg>
              <b style={{ fontSize: 12.5 }}>{ITEM_BY_ID[id]?.name}</b>
              <span className="tiny">×{n} · Place</span>
            </button>
          ))}
        </div>
      )}
      {tab === 'shop' && (
        <div className="grid3" style={{ marginTop: 12 }}>
          {ITEMS.filter((i) => !i.seasonal || i.seasonal === sea || i.seasonal === 'Autumn').map((i) => {
            const locked = i.level > lvl || (i.plus && !s.plus);
            return (
              <div key={i.id} className="tile" style={{ opacity: locked ? 0.6 : 1 }}>
                {i.seasonal && <span className="sim" style={{ position: 'absolute', top: 6, left: 6, fontSize: 9 }}>{i.seasonal}</span>}
                {i.plus && <span className="sim" style={{ position: 'absolute', top: 6, left: 6, fontSize: 9, background: '#3d3a6b', color: '#ffe38a', borderColor: '#3d3a6b' }}>Plus</span>}
                <svg viewBox="-34 -60 68 68" width="56" height="56">
                  <Deco id={i.id} />
                </svg>
                <b style={{ fontSize: 12.5 }}>{i.name}</b>
                <button className="btn gold xs" disabled={locked || s.coins < i.price} onClick={() => actions.buyItem(i.id)}>
                  {locked ? (i.plus && !s.plus ? 'Plus' : `Lv ${i.level}`) : i.price}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'dog' && (
        <div>
          <div style={{ display: 'grid', placeItems: 'center', margin: '8px 0' }}>
            <Dog look={dog.look} pose="happy" size={130} />
          </div>
          <div className="label">Hats & accessories</div>
          <div className="grid3" style={{ marginTop: 8 }}>
            {HATS.map((h) => {
              const owned = s.ownedHats.includes(h.id);
              const on = dog.look.hat === h.id;
              const locked = h.plus && !s.plus;
              return (
                <button
                  key={h.id}
                  className={`tile ${on ? 'sel' : ''}`}
                  onClick={() => {
                    if (owned) actions.updateDog({ look: { ...dog.look, hat: h.id } });
                    else if (!locked) actions.buyHat(h.id);
                  }}
                  style={{ opacity: locked ? 0.6 : 1 }}
                >
                  <Dog look={{ ...dog.look, hat: h.id }} size={56} shadow={false} />
                  <b style={{ fontSize: 12 }}>{h.name}</b>
                  <span className="tiny">{owned ? (on ? 'Wearing' : 'Wear') : locked ? 'WAG Plus' : `${h.price} coins`}</span>
                </button>
              );
            })}
          </div>
          <div className="label" style={{ marginTop: 14 }}>
            Bandana
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {BANDANAS.map((c) => (
              <button key={c} onClick={() => actions.updateDog({ look: { ...dog.look, bandana: c } })} style={{ width: 40, height: 40, borderRadius: 14, background: c, boxShadow: dog.look.bandana === c ? '0 0 0 3px #fff, 0 0 0 6px var(--lav-deep)' : 'var(--shadow-sm)' }} aria-label="bandana colour" />
            ))}
          </div>
        </div>
      )}
      {tab === 'book' && (
        <div>
          <p className="muted" style={{ fontWeight: 700, margin: '10px 0' }}>
            {s.creatures.length}/{CREATURES.length} creatures befriended. They appear on your island once found.
          </p>
          <div className="grid2">
            {CREATURES.map((c) => {
              const got = s.creatures.includes(c.id);
              return (
                <div key={c.id} className="tile" style={{ background: got ? 'linear-gradient(180deg,#fff,#efe9fc)' : undefined }}>
                  <div className={got ? 'float' : ''}>
                    <Creature id={c.id} size={58} silhouette={!got} />
                  </div>
                  <b>{got ? c.name : '???'}</b>
                  <span className="tiny">{got ? c.desc : `Found on: ${c.where}`}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Sheet>
  );
}

function GardenSheet({ open, onClose, stages, focus }: { open: boolean; onClose: () => void; stages: number[]; focus: number | null }) {
  const { s, actions } = useGame();
  const species: { id: SeedPlot['species']; name: string; c: string }[] = [
    { id: 'moonbloom', name: 'Moonbloom', c: '#c7b2f2' },
    { id: 'sunpetal', name: 'Sunpetal', c: '#ffd36e' },
    { id: 'starbell', name: 'Starbell', c: '#9fd3f2' },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Magic seed garden">
      <p className="muted" style={{ fontWeight: 700 }}>
        Plant magic seeds and they grow over time. Every real-world activity with {s.profile!.dog.name} makes them grow a stage faster.
      </p>
      <Sim_>Prototype speed: 90 seconds per growth stage</Sim_>
      <div className="grid3" style={{ marginTop: 12 }}>
        {[0, 1, 2].map((i) => {
          const pl = s.plots.find((x) => x.plot === i);
          const st = stages[i];
          return (
            <div key={i} className={`tile ${focus === i ? 'sel' : ''}`}>
              <svg viewBox="-24 -44 48 52" width="64" height="64">
                <ellipse rx="18" ry="7" fill="#6d4a33" />
                {st >= 0 && <path d={`M0 0 L0 ${-6 - st * 8}`} stroke="#5f9a4a" strokeWidth="3" />}
                {st >= 1 && <ellipse cx="-6" cy={-8 - st * 3} rx="6" ry="3" fill="#7fbf5f" />}
                {st >= 2 && <ellipse cx="6" cy={-10 - st * 3} rx="6" ry="3" fill="#7fbf5f" />}
                {st >= 3 && (
                  <g transform="translate(0 -32)">
                    {[0, 72, 144, 216, 288].map((r) => (
                      <ellipse key={r} rx="4.5" ry="7" transform={`rotate(${r}) translate(0 -6)`} fill={species.find((x) => x.id === pl?.species)?.c} />
                    ))}
                    <circle r="3.5" fill="#fff6c4" />
                  </g>
                )}
              </svg>
              {!pl && (
                <>
                  <b style={{ fontSize: 12.5 }}>Empty plot</b>
                  <div style={{ display: 'grid', gap: 4, width: '100%' }}>
                    {species.map((sp) => (
                      <button key={sp.id} className="btn lav xs" disabled={s.seeds < 1} onClick={() => actions.plant(i, sp.id)} style={{ fontSize: 12 }}>
                        <Seed size={14} /> {sp.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {pl && st < 3 && (
                <>
                  <b style={{ fontSize: 12.5 }}>{species.find((x) => x.id === pl.species)?.name}</b>
                  <span className="tiny">Stage {st + 1}/4 · growing</span>
                  <div className="progress lav" style={{ width: '100%', height: 8 }}>
                    <i style={{ width: `${((st + 1) / 4) * 100}%` }} />
                  </div>
                </>
              )}
              {pl && st >= 3 && (
                <button className="btn gold xs" onClick={() => actions.harvest(i)}>
                  Harvest
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <Seed size={30} />
        <p style={{ flex: 1 }}>
          You have <b>{s.seeds}</b> magic seed{s.seeds === 1 ? '' : 's'}. Earn more from longer quests and adventures.
        </p>
      </div>
    </Sheet>
  );
}

function Sim_({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 8 }}>
      <span className="sim">{children}</span>
    </div>
  );
}

export function PlusSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, actions, say } = useGame();
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');
  const feats = ['Crystal Cove — an extra island territory', 'Advanced training programmes', 'Unlimited diary rewrites in new moods', 'Exclusive outfits & decorations', 'Seasonal story adventures'];
  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '6px 0 0' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 14, background: '#3d3a6b', color: '#ffe38a', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22 }}>WAG Plus</div>
        <p className="muted" style={{ fontWeight: 700, marginTop: 10 }}>More world to explore. Never more pressure.</p>
      </div>
      <div className="stack" style={{ marginTop: 14 }}>
        {feats.map((f) => (
          <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700 }}>
            <span style={{ color: '#5fae7a', display: 'grid' }}>
              <Icon name="check" />
            </span>
            {f}
          </div>
        ))}
      </div>
      <div className="grid2" style={{ marginTop: 16 }}>
        {(
          [
            ['yearly', '£39.99', 'per year', 'Save 52%'],
            ['monthly', '£6.99', 'per month', ''],
          ] as const
        ).map(([id, price, per, tag]) => (
          <button key={id} className={`tile ${plan === id ? 'sel' : ''}`} onClick={() => setPlan(id)} style={{ padding: 14 }}>
            {tag && <span className="sim live" style={{ position: 'absolute', top: -10 }}>{tag}</span>}
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>{price}</b>
            <span className="tiny">{per}</span>
          </button>
        ))}
      </div>
      {s.plus ? (
        <button
          className="btn cream full"
          style={{ marginTop: 16 }}
          onClick={() => {
            actions.setPlus(null);
            say('WAG Plus cancelled (demo)');
          }}
        >
          Cancel demo subscription
        </button>
      ) : (
        <button
          className="btn lav full"
          style={{ marginTop: 16 }}
          onClick={() => {
            actions.setPlus(plan);
            say('Welcome to WAG Plus! (demo — no payment taken)');
            onClose();
          }}
        >
          Start 7-day free trial
        </button>
      )}
      <p className="tiny" style={{ marginTop: 10, textAlign: 'center' }}>
        <span className="sim">Simulated purchase — no payment is taken in this prototype</span>
        <br />
        Essential care, welfare and training basics are always free. Nobody should pay to look after their dog well.
      </p>
      {areaUnlocked(s, 'cove') && <p className="tiny" style={{ textAlign: 'center' }}>Crystal Cove is open on your island.</p>}
    </Sheet>
  );
}
