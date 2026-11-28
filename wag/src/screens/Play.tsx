import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Dog } from '../art/Dog';
import { Icon, MapIcon, Moves, Star } from '../art/Icons';
import { BoosterIcon, Piece, PieceDefs } from '../art/Pieces';
import { PROJECTS } from '../game/data';
import { useGame } from '../game/store';
import { CHAPTERS, LEVELS, mapLevel, PIECE_NAMES, type LevelDef } from '../match3/levels';
import { Currencies, Sheet } from '../ui/Common';

export function nextLevel(best: Record<string, number>) {
  return LEVELS.find((l) => !best[l.id]) ?? LEVELS[LEVELS.length - 1];
}

export function nextProject(restored: string[]) {
  return PROJECTS.find((p) => !restored.includes(p.id) && (!p.requires || restored.includes(p.requires)));
}

export function PlayScreen({ onPick, onBuild }: { onPick: (l: LevelDef) => void; onBuild: () => void }) {
  const { s } = useGame();
  const dog = s.profile!.dog;
  const cur = nextLevel(s.puzzle.best);
  const proj = nextProject(s.restored);
  const curRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    curRef.current?.scrollIntoView({ block: 'center' });
  }, []);
  const totalStars = Object.values(s.puzzle.best).reduce((a, b) => a + b, 0);

  return (
    <div className="screen" style={{ background: 'var(--sky-flat)', paddingTop: 0 }}>
      <PieceDefs />
      <div style={{ position: 'sticky', top: 0, zIndex: 5, margin: '0 -16px', padding: 'calc(var(--safe-top) + 12px) 16px 10px', background: 'var(--sky-flat)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="title" style={{ fontSize: 22 }}>Treasure Trails</h1>
            <p className="tiny" style={{ color: '#fff' }}>{totalStars} of {LEVELS.length * 3} stars collected</p>
          </div>
          <Currencies seeds={false} />
        </div>
      </div>

      {/* goal card */}
      {proj && (
        <motion.button whileTap={{ scale: 0.98 }} onClick={onBuild} className="card" style={{ width: '100%', padding: 14, display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left' }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: '#ffd36e', display: 'grid', placeItems: 'center' }}>
            <Star size={36} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">Next on your island</div>
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>{proj.name.replaceAll('{dog}', dog.name)}</b>
            <div className="progress gold" style={{ marginTop: 6 }}>
              <i style={{ width: `${Math.min(1, s.puzzle.stars / proj.stars) * 100}%` }} />
            </div>
            <div className="tiny" style={{ marginTop: 3 }}>
              {Math.min(s.puzzle.stars, proj.stars)}/{proj.stars} stars {s.puzzle.stars >= proj.stars ? '— ready to build!' : ''}
            </div>
          </div>
          <Icon name="chev" />
        </motion.button>
      )}

      {/* real-world bonuses */}
      <div className="grid3" style={{ marginTop: 12 }}>
        <BonusTile icon={<MapIcon size={30} />} n={s.puzzle.maps} label="Treasure maps" hint="From walks & exploring" />
        <BonusTile icon={<Moves size={28} />} n={s.puzzle.bonusMoves} label="Bonus moves" hint="From play & rest days" />
        <BonusTile icon={<BoosterIcon id="zoomies" size={30} />} n={s.puzzle.boosters.zoomies + s.puzzle.boosters.bone + s.puzzle.boosters.sniffer} label="Boosters" hint="From learning tricks" />
      </div>

      {s.puzzle.maps > 0 && (
        <motion.button initial={{ scale: 0.9 }} animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 2 }} onClick={() => onPick(mapLevel(s.puzzle.mapsDone))} className="card" style={{ marginTop: 12, width: '100%', padding: 14, display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', background: '#ffe0b0' }}>
          <MapIcon size={46} />
          <div style={{ flex: 1 }}>
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>A treasure map!</b>
            <p className="tiny" style={{ color: '#8a6a1c' }}>Found on a real walk with {dog.name}. Play a bonus Treasure Trail for big rewards.</p>
          </div>
          <span className="btn gold xs">Play</span>
        </motion.button>
      )}

      {/* trail */}
      {CHAPTERS.map((ch, ci) => {
        const levels = LEVELS.filter((l) => l.chapter === ci);
        return (
          <section key={ch.id} style={{ marginTop: 22, borderRadius: 28, padding: '16px 12px 24px', background: ch.sky[0], boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="banner" style={{ fontSize: 18 }}>
                {ch.name}
              </div>
              <p className="tiny" style={{ marginTop: 8, color: 'var(--ink-2)' }}>
                {ch.blurb} Hosted by {ch.host}.
              </p>
            </div>
            <div style={{ position: 'relative', marginTop: 10 }}>
              <svg viewBox="0 0 300 560" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <path d="M150 20 C 260 70, 260 120, 150 160 S 40 260, 150 300 S 260 400, 150 440 S 60 520, 150 560" stroke="#fff" strokeOpacity=".7" strokeWidth="18" fill="none" strokeLinecap="round" strokeDasharray="2 22" />
              </svg>
              {levels.map((l, k) => {
                const best = s.puzzle.best[l.id] ?? 0;
                const isCur = l.id === cur.id;
                const locked = l.num > cur.num;
                const offset = [0, 60, 0, -60, 0, 60][k];
                return (
                  <div key={l.id} style={{ height: 92, display: 'flex', justifyContent: 'center', alignItems: 'center', transform: `translateX(${offset}px)`, position: 'relative' }}>
                    {isCur && (
                      <div style={{ position: 'absolute', left: '50%', marginLeft: offset > 0 ? -150 : 40, top: -6 }}>
                        <Dog look={dog.look} pose="happy" size={70} />
                      </div>
                    )}
                    <motion.button
                      ref={isCur ? curRef : undefined}
                      whileTap={{ scale: 0.92 }}
                      animate={isCur ? { y: [0, -5, 0] } : {}}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      disabled={locked}
                      onClick={() => onPick(l)}
                      className="lesson-node"
                      style={{
                        width: isCur ? 80 : 68,
                        height: isCur ? 74 : 62,
                        background: locked ? '#cfc6e0' : best ? '#f5b53d' : '#5fb54a',
                        boxShadow: locked ? '0 5px 0 #b7aecb' : best ? '0 5px 0 #c98610, 0 10px 20px rgba(200,130,20,.35)' : '0 6px 0 #3f9a48, 0 10px 22px rgba(60,150,70,.4)',
                        color: locked ? '#9a90b3' : '#fff',
                        textShadow: locked ? 'none' : '0 2px 0 rgba(0,0,0,.2)',
                      }}
                    >
                      {locked ? <Icon name="lock" /> : l.num}
                      {best > 0 && (
                        <span style={{ position: 'absolute', bottom: -14, display: 'flex', gap: 1 }}>
                          {[0, 1, 2].map((i) => (
                            <Star key={i} size={18} dim={i >= best} />
                          ))}
                        </span>
                      )}
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="tiny" style={{ textAlign: 'center', marginTop: 18 }}>
        More trails are being dug up by {dog.name}…
      </p>
    </div>
  );
}

function BonusTile({ icon, n, label, hint }: { icon: React.ReactNode; n: number; label: string; hint: string }) {
  return (
    <div className="tile" style={{ padding: '10px 6px' }}>
      <div style={{ position: 'relative' }}>
        {icon}
        <span style={{ position: 'absolute', right: -12, top: -6, background: n ? '#8f78e0' : '#cfc6e0', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 900, padding: '1px 6px' }}>{n}</span>
      </div>
      <b style={{ fontSize: 12.5 }}>{label}</b>
      <span className="tiny" style={{ fontSize: 10.5, lineHeight: 1.2 }}>
        {hint}
      </span>
    </div>
  );
}

export function PreLevel({ level, onClose, onStart }: { level: LevelDef | null; onClose: () => void; onStart: (useBonus: boolean) => void }) {
  const { s } = useGame();
  const [bonus, setBonus] = useState(true);
  if (!level) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const ch = CHAPTERS[level.chapter];
  const best = s.puzzle.best[level.id] ?? 0;
  return (
    <Sheet open={!!level} onClose={onClose}>
      <PieceDefs />
      <div style={{ textAlign: 'center' }}>
        <div className="label">{level.map ? 'Bonus · Treasure Trail' : ch.name}</div>
        <h2 style={{ fontSize: 28, marginTop: 4 }}>{level.map ? 'Treasure Trail' : `Level ${level.num}`}</h2>
        {level.title && !level.map && <p className="muted" style={{ fontWeight: 700 }}>“{level.title}”</p>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
          {[0, 1, 2].map((i) => (
            <Star key={i} size={30} dim={i >= best} />
          ))}
        </div>
      </div>
      <div className="label" style={{ marginTop: 16 }}>
        Goals
      </div>
      <div className="stack" style={{ marginTop: 8 }}>
        {level.goals.map((g, k) => (
          <div key={k} className="row" style={{ padding: 10 }}>
            <div style={{ width: 40, height: 40 }}>
              {g.kind === 'collect' ? <Piece color={g.color} special="none" /> : g.kind === 'treasure' ? <Piece color={-1} special="none" treasure /> : g.kind === 'dirt' ? <div style={{ width: 36, height: 36, borderRadius: 10, background: '#b98a5e' }} /> : <Star size={38} />}
            </div>
            <b>
              {g.kind === 'collect' && `Collect ${g.n} ${PIECE_NAMES[g.color].toLowerCase()}`}
              {g.kind === 'dirt' && `Clear ${g.n} ${ch.dirtName} tiles`}
              {g.kind === 'treasure' && `Bring ${g.n} treasure chest${g.n > 1 ? 's' : ''} to the bottom`}
              {g.kind === 'score' && `Score ${g.n.toLocaleString('en-GB')} points`}
            </b>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 12, padding: 10 }}>
        <Moves size={34} />
        <div style={{ flex: 1 }}>
          <b>{level.moves} moves</b>
          <p>
            {s.puzzle.bonusMoves > 0 ? `+${s.puzzle.bonusMoves} bonus moves earned by playing with ${s.profile!.dog.name}` : `Play or rest with ${s.profile!.dog.name} in real life to earn bonus moves`}
          </p>
        </div>
        {s.puzzle.bonusMoves > 0 && (
          <button className={`pill-btn ${bonus ? 'on' : ''}`} onClick={() => setBonus(!bonus)}>
            {bonus ? 'Using' : 'Save'}
          </button>
        )}
      </div>
      <p className="tiny" style={{ marginTop: 10 }}>
        Match 4 for Zoomies, an L or T for a Golden Bone, 5 in a row for a Super Sniffer, and a 2×2 square for Paw Power. Swap two specials together for a Best Friends combo!
      </p>
      <button className="btn full" style={{ marginTop: 16 }} onClick={() => onStart(bonus && s.puzzle.bonusMoves > 0)}>
        <Icon name="play" /> Play
      </button>
    </Sheet>
  );
}
