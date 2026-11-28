import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { CREATURE_BY_ID, ITEM_BY_ID, levelFromXp } from '../game/data';
import { useGame } from '../game/store';
import type { Phase } from '../game/util';
import { Creature } from '../art/Creatures';
import { Deco } from '../art/Decor';
import { Coin, Heart, Icon, MapIcon, Moves, NavIcon, Seed, Star } from '../art/Icons';
import { BoosterIcon } from '../art/Pieces';

export type Tab = 'world' | 'play' | 'adventure' | 'diary' | 'friends';

export function Sky({ phase }: { phase: Phase }) {
  return (
    <div className={`sky ${phase}`}>
      {phase === 'night' ? (
        Array.from({ length: 40 }, (_, i) => <span key={i} className="star-dot" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 55}%`, animationDelay: `${(i % 7) * 0.4}s` }} />)
      ) : (
        <>
          <span className="cloud" style={{ width: 90, height: 26, top: '9%', animationDuration: '70s', animationDelay: '-20s' }} />
          <span className="cloud" style={{ width: 130, height: 34, top: '20%', animationDuration: '95s', animationDelay: '-60s', opacity: 0.6 }} />
          <span className="cloud" style={{ width: 70, height: 20, top: '33%', animationDuration: '80s', animationDelay: '-5s', opacity: 0.5 }} />
        </>
      )}
      <div
        style={{
          position: 'absolute',
          right: 34,
          top: phase === 'sunset' ? '30%' : '8%',
          width: phase === 'night' ? 46 : 64,
          height: phase === 'night' ? 46 : 64,
          borderRadius: '50%',
          background: phase === 'night' ? 'radial-gradient(circle at 35% 35%, #fffbe8, #e8e2c4)' : 'radial-gradient(circle, #fff7d6 30%, #ffd98a 70%)',
          boxShadow: phase === 'night' ? '0 0 40px 10px rgba(255,250,220,.35)' : '0 0 80px 30px rgba(255,220,150,.55)',
          opacity: phase === 'day' ? 0.85 : 1,
          transition: 'all 1s',
        }}
      />
    </div>
  );
}

export function Currencies({ stars = true, seeds = true }: { stars?: boolean; seeds?: boolean }) {
  const { s } = useGame();
  return (
    <div className="topbar" style={{ gap: 6 }}>
      <span className="currency">
        <Coin size={24} />
        <AnimatedNumber n={s.coins} />
      </span>
      {stars && (
        <span className="currency">
          <Star size={24} />
          <AnimatedNumber n={s.puzzle.stars} />
        </span>
      )}
      {seeds && (
        <span className="currency">
          <Seed size={22} />
          {s.seeds}
        </span>
      )}
    </div>
  );
}

export function AnimatedNumber({ n }: { n: number }) {
  const [v, setV] = useState(n);
  useEffect(() => {
    if (v === n) return;
    const start = v;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      setV(Math.round(start + (n - start) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  return <>{v.toLocaleString('en-GB')}</>;
}

export function TabBar({ tab, onTab, badges }: { tab: Tab; onTab: (t: Tab) => void; badges: Partial<Record<Tab, number>> }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'world', label: 'World' },
    { id: 'play', label: 'Play' },
    { id: 'adventure', label: 'Adventure' },
    { id: 'diary', label: 'Diary' },
    { id: 'friends', label: 'Friends' },
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => (
        <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => onTab(t.id)} aria-current={tab === t.id}>
          {tab === t.id && <motion.span layoutId="tabbg" className="tab-bg" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          <motion.span animate={tab === t.id ? { y: [0, -4, 0] } : {}} transition={{ duration: 0.35 }}>
            <NavIcon name={t.id} active={tab === t.id} />
          </motion.span>
          {t.label}
          {!!badges[t.id] && <span className="badge">{badges[t.id]}</span>}
        </button>
      ))}
    </nav>
  );
}

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => i.offset.y > 120 && onClose()}
          >
            <div className="grab" />
            {title && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 22 }}>{title}</h2>
                <button className="icon-btn" onClick={onClose} aria-label="Close">
                  <Icon name="close" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Toast() {
  const { toast } = useGame();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div className="toast" initial={{ opacity: 0, y: -16, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -16, x: '-50%' }}>
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Rays() {
  return (
    <motion.svg viewBox="-100 -100 200 200" style={{ position: 'absolute', width: 520, height: 520, left: '50%', top: '50%', marginLeft: -260, marginTop: -300 }} animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d="M0 0 L-9 -100 L9 -100Z" fill="#fff6c4" opacity=".35" transform={`rotate(${i * 22.5})`} />
      ))}
    </motion.svg>
  );
}

export function Confetti({ n = 28 }: { n?: number }) {
  const cols = ['#f6a8c4', '#ffe38a', '#c7b2f2', '#9fd3f2', '#a6d48f'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: n }, (_, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: (Math.random() - 0.5) * 420, y: 200 + Math.random() * 420, opacity: [1, 1, 0], rotate: Math.random() * 720 }}
          transition={{ duration: 1.8 + Math.random(), ease: 'easeOut', delay: Math.random() * 0.2 }}
          style={{ position: 'absolute', left: '50%', top: '34%', width: 10, height: 7, borderRadius: '60% 40%', background: cols[i % cols.length] }}
        />
      ))}
    </div>
  );
}

export function RewardOverlay() {
  const { rewards, dismissReward, s } = useGame();
  const r = rewards[0];
  const lvl = levelFromXp(s.xp);
  return (
    <AnimatePresence>
      {r && (
        <motion.div key={(r.title ?? '') + rewards.length} style={{ position: 'absolute', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', background: 'rgba(40,26,70,.55)', padding: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Rays />
          <Confetti />
          <motion.div className="card" initial={{ scale: 0.6, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} style={{ position: 'relative', width: '100%', maxWidth: 340, padding: '26px 20px 20px', textAlign: 'center', background: 'linear-gradient(180deg,#fffaf0,#f8ecd6)' }}>
            <div className="banner" style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%) rotate(-2deg)', whiteSpace: 'nowrap' }}>
              {r.title}
            </div>
            <p className="muted" style={{ marginTop: 14, fontWeight: 700 }}>
              {r.subtitle}
            </p>
            {r.kind === 'puzzle' && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.25 + i * 0.18, type: 'spring', stiffness: 400, damping: 12 }}>
                    <Star size={i === 1 ? 62 : 48} dim={i >= (r.stars ?? 0)} />
                  </motion.span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 18 }}>
              {!!r.coins && <RewardPill icon={<Coin size={30} />} label={`+${r.coins}`} sub="Paw Coins" delay={0.1} />}
              {!!r.xp && <RewardPill icon={<Heart size={28} />} label={`+${r.xp}`} sub="Friendship" delay={0.18} />}
              {!!r.seeds && <RewardPill icon={<Seed size={28} />} label={`+${r.seeds}`} sub="Magic seeds" delay={0.26} />}
              {!!r.stars && r.kind !== 'puzzle' && <RewardPill icon={<Star size={28} />} label={`+${r.stars}`} sub="Stars" delay={0.3} />}
              {!!r.maps && <RewardPill icon={<MapIcon size={30} />} label={`+${r.maps}`} sub="Treasure map" delay={0.34} />}
              {!!r.moves && <RewardPill icon={<Moves size={28} />} label={`+${r.moves}`} sub="Bonus moves" delay={0.38} />}
              {r.booster && <RewardPill icon={<BoosterIcon id={r.booster} size={30} />} label="+1" sub={r.booster === 'zoomies' ? 'Zoomies' : r.booster === 'bone' ? 'Golden Bone' : 'Super Sniffer'} delay={0.42} />}
            </div>
            {(r.items?.length || r.creature) && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                {r.items?.map((it, i) => (
                  <motion.div key={i} className="tile" style={{ width: 110 }} initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: 0.5 + i * 0.15 }}>
                    <svg viewBox="-34 -60 68 68" width="64" height="64">
                      <Deco id={it} />
                    </svg>
                    <b style={{ fontSize: 13 }}>{ITEM_BY_ID[it]?.name}</b>
                    <span className="tiny">New decoration</span>
                  </motion.div>
                ))}
                {r.creature && (
                  <motion.div className="tile" style={{ width: 110, background: 'linear-gradient(180deg,#fff,#efe9fc)' }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }}>
                    <div className="float">
                      <Creature id={r.creature} size={56} />
                    </div>
                    <b style={{ fontSize: 13 }}>{CREATURE_BY_ID[r.creature]?.name}</b>
                    <span className="tiny">Creature found!</span>
                  </motion.div>
                )}
              </div>
            )}
            {r.kind !== 'level' && (
              <div style={{ marginTop: 16, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }} className="tiny">
                  <span>Friendship level {lvl.level}</span>
                  <span>
                    {lvl.into}/{lvl.need}
                  </span>
                </div>
                <div className="progress" style={{ marginTop: 4 }}>
                  <i style={{ width: `${lvl.pct * 100}%` }} />
                </div>
              </div>
            )}
            <button className="btn full" style={{ marginTop: 18 }} onClick={dismissReward}>
              Wonderful!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RewardPill({ icon, label, sub, delay }: { icon: ReactNode; label: string; sub: string; delay: number }) {
  return (
    <motion.div initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 400, damping: 16 }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 16, padding: '6px 12px 6px 6px', boxShadow: 'var(--shadow-sm)' }}>
      {icon}
      <div style={{ textAlign: 'left', lineHeight: 1.05 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>{label}</div>
        <div className="tiny">{sub}</div>
      </div>
    </motion.div>
  );
}

export function Sim({ live, children }: { live?: boolean; children: ReactNode }) {
  return <span className={`sim ${live ? 'live' : ''}`}>{children}</span>;
}
