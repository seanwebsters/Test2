import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Dog } from './art/Dog';
import { Icon } from './art/Icons';
import { ENERGY, levelFromXp, LEVEL_TITLES } from './game/data';
import { GameProvider, useGame } from './game/store';
import type { Energy } from './game/types';
import { dayKey, phaseOf, type Phase } from './game/util';
import type { LevelDef } from './match3/levels';
import { Academy } from './screens/Academy';
import { AdventureScreen } from './screens/Adventure';
import { DiaryScreen } from './screens/Diary';
import { FriendsScreen } from './screens/Friends';
import { Onboarding } from './screens/Onboarding';
import { nextLevel, PlayScreen, PreLevel } from './screens/Play';
import { Puzzle } from './screens/Puzzle';
import { PlusSheet, WorldScreen } from './screens/World';
import { RewardOverlay, Sheet, Sim, TabBar, Toast, type Tab } from './ui/Common';

function usePhase(): Phase {
  const { s } = useGame();
  const [p, setP] = useState(phaseOf());
  useEffect(() => {
    const t = window.setInterval(() => setP(phaseOf()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return s.timeMode === 'auto' ? p : s.timeMode === 'day' ? 'day' : s.timeMode;
}

function Game() {
  const { s, actions } = useGame();
  const [tab, setTab] = useState<Tab>('world');
  const [pre, setPre] = useState<LevelDef | null>(null);
  const [playing, setPlaying] = useState<{ level: LevelDef; bonus: number; key: number } | null>(null);
  const [academy, setAcademy] = useState(false);
  const [profile, setProfile] = useState(false);
  const [plus, setPlus] = useState(false);
  const [build, setBuild] = useState(false);
  const phase = usePhase();

  useEffect(() => {
    actions.ensureDay();
    const onFocus = () => actions.ensureDay();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [actions]);

  if (!s.profile) return <Onboarding />;

  const questsLeft = s.quests.filter((q) => !q.done).length;
  const today = dayKey();
  const mailWaiting = s.lastMailDay !== today && s.friends.length > 0 && s.activities.some((a) => !a.sample);

  const startLevel = (useBonus: boolean) => {
    if (!pre) return;
    const bonus = useBonus ? s.puzzle.bonusMoves : 0;
    actions.startPuzzle(!!pre.map, useBonus);
    setPlaying({ level: pre, bonus, key: Date.now() });
    setPre(null);
  };

  return (
    <>
      <AnimatePresence mode="popLayout">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} style={{ position: 'absolute', inset: 0 }}>
          {tab === 'world' && <WorldScreen phase={phase} onPlay={() => setPre(nextLevel(s.puzzle.best))} onTab={setTab} onProfile={() => setProfile(true)} buildOpen={build} setBuildOpen={setBuild} />}
          {tab === 'play' && <PlayScreen onPick={setPre} onBuild={() => { setTab('world'); setBuild(true); }} />}
          {tab === 'adventure' && <AdventureScreen onAcademy={() => setAcademy(true)} />}
          {tab === 'diary' && <DiaryScreen onPlus={() => setPlus(true)} />}
          {tab === 'friends' && <FriendsScreen />}
        </motion.div>
      </AnimatePresence>

      {tab === 'world' && mailWaiting && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, -6, 6, 0] }} transition={{ rotate: { repeat: Infinity, duration: 2, repeatDelay: 1 } }} onClick={actions.collectMail} style={{ position: 'absolute', right: 16, top: 'calc(var(--safe-top) + 410px)', zIndex: 6, width: 56, height: 56, borderRadius: 18, background: '#fff', boxShadow: 'var(--shadow)', display: 'grid', placeItems: 'center' }} aria-label="A gift from a friend">
          <svg viewBox="0 0 40 40" width="36" height="36">
            <rect x="4" y="10" width="32" height="22" rx="4" fill="#fbe1e8" stroke="#d0587a" strokeWidth="2" />
            <path d="M4 12 L20 24 L36 12" stroke="#d0587a" strokeWidth="2" fill="none" />
            <path d="M20 30 C 14 26, 14 22, 17 21 C 19 20, 20 22, 20 22 C 20 22, 21 20, 23 21 C 26 22, 26 26, 20 30Z" fill="#f0607e" />
          </svg>
        </motion.button>
      )}

      <TabBar tab={tab} onTab={setTab} badges={{ adventure: questsLeft, play: s.puzzle.maps }} />

      <PreLevel level={pre} onClose={() => setPre(null)} onStart={startLevel} />
      <AnimatePresence>
        {playing && (
          <motion.div key={playing.key} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
            <Puzzle
              level={playing.level}
              bonusMoves={playing.bonus}
              onExit={(won) => {
                const lvl = playing.level;
                setPlaying(null);
                if (!won && !lvl.map) setTimeout(() => setPre(lvl), 250);
                if (won && tab !== 'play' && tab !== 'world') setTab('world');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{academy && <Academy onClose={() => setAcademy(false)} onPlus={() => setPlus(true)} />}</AnimatePresence>
      <ProfileSheet open={profile} onClose={() => setProfile(false)} onPlus={() => { setProfile(false); setPlus(true); }} />
      <PlusSheet open={plus} onClose={() => setPlus(false)} />
      <RewardOverlay />
      <Toast />
    </>
  );
}

function ProfileSheet({ open, onClose, onPlus }: { open: boolean; onClose: () => void; onPlus: () => void }) {
  const { s, actions } = useGame();
  const [confirm, setConfirm] = useState(false);
  if (!s.profile) return null;
  const p = s.profile;
  const dog = p.dog;
  const lvl = levelFromXp(s.xp);
  return (
    <Sheet open={open} onClose={onClose} title={`${p.ownerName} & ${dog.name}`}>
      <div className="row" style={{ background: 'linear-gradient(135deg,#efe9fc,#fff)' }}>
        {dog.photo ? <img src={dog.photo} alt="" style={{ width: 64, height: 64, borderRadius: 20, objectFit: 'cover' }} /> : <Dog look={dog.look} size={64} shadow={false} />}
        <div style={{ flex: 1 }}>
          <h4>{LEVEL_TITLES[lvl.level - 1] ?? 'Forever Friends'}</h4>
          <p>
            Friendship level {lvl.level} · {s.xp} XP · best streak {s.streak.best} days
          </p>
          <div className="progress" style={{ marginTop: 6, height: 8 }}>
            <i style={{ width: `${lvl.pct * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="label" style={{ marginTop: 16 }}>
        Names
      </div>
      <div className="grid2" style={{ marginTop: 6 }}>
        <input className="field" style={{ fontSize: 17, height: 48 }} value={p.ownerName} onChange={(e) => actions.updateProfile({ ownerName: e.target.value })} aria-label="Your name" />
        <input className="field" style={{ fontSize: 17, height: 48 }} value={dog.name} onChange={(e) => actions.updateDog({ name: e.target.value })} aria-label="Dog's name" />
      </div>
      <input className="field" style={{ fontSize: 17, height: 48, marginTop: 8 }} value={p.islandName} onChange={(e) => actions.updateProfile({ islandName: e.target.value })} aria-label="Island name" />

      <div className="label" style={{ marginTop: 16 }}>
        {dog.name}’s energy & health — quests adapt to this
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {ENERGY.map((e) => (
          <button key={e.id} className={`pill-btn ${dog.energy === e.id ? 'on' : ''}`} onClick={() => actions.updateDog({ energy: e.id as Energy })}>
            {e.label}
          </button>
        ))}
      </div>
      <div className="label" style={{ marginTop: 12 }}>
        Age: {dog.ageYears} year{dog.ageYears === 1 ? '' : 's'}
      </div>
      <input type="range" min={0} max={18} value={dog.ageYears} onChange={(e) => actions.updateDog({ ageYears: Number(e.target.value) })} style={{ width: '100%', accentColor: '#8f78e0' }} />

      <div className="label" style={{ marginTop: 14 }}>
        Island time
      </div>
      <div className="seg" style={{ marginTop: 6 }}>
        {(['auto', 'day', 'sunset', 'night'] as const).map((m) => (
          <button key={m} className={s.timeMode === m ? 'on' : ''} onClick={() => actions.setTimeMode(m)}>
            {m === 'auto' ? 'Real time' : m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <button className="row" style={{ marginTop: 14, background: '#3d3a6b', color: '#fff' }} onClick={onPlus}>
        <div className="thumb" style={{ background: '#ffe38a', color: '#3d3a6b' }}>
          <Icon name="sparkle" size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: '#ffe38a' }}>{s.plus ? 'WAG Plus active' : 'WAG Plus'}</h4>
          <p style={{ color: '#ddd6f6' }}>£6.99/month or £39.99/year · extra territory, advanced training & more</p>
        </div>
      </button>

      <div className="card" style={{ marginTop: 14, padding: 14 }}>
        <h4>About this prototype</h4>
        <div className="stack" style={{ marginTop: 8, gap: 6, fontSize: 13.5, fontWeight: 600 }}>
          <div><Sim live>Working</Sim> Profiles, progress, Match-3 engine, quests, currencies, island building, decorations, garden, diary generation & photos — all saved on this device.</div>
          <div><Sim live>Working</Sim> Optional real GPS distance on adventures, photo colour matching, diary share images.</div>
          <div><Sim>Simulated</Sim> Location-based discoveries, friends, gifts, community totals and Plus purchases.</div>
          <div><Sim>Simulated</Sim> Diary entries come from an on-device template engine, not an AI service.</div>
        </div>
      </div>

      {!confirm ? (
        <button className="btn cream full" style={{ marginTop: 14 }} onClick={() => setConfirm(true)}>
          <Icon name="trash" /> Start a new story
        </button>
      ) : (
        <div className="grid2" style={{ marginTop: 14 }}>
          <button className="btn cream" onClick={() => setConfirm(false)}>
            Keep {dog.name}
          </button>
          <button
            className="btn rose"
            onClick={() => {
              actions.reset();
              onClose();
            }}
          >
            Erase everything
          </button>
        </div>
      )}
    </Sheet>
  );
}

export default function App() {
  return (
    <GameProvider>
      <div className="stage">
        <aside className="stage-caption">
          <h1>WAG</h1>
          <p>A little world for your best friend. A cosy game you play with your real dog — every walk, trick and quiet moment brings their island to life.</p>
          <div className="legend">
            <b>Try the loop:</b> complete a quest in Adventure → collect bonus moves → win a Treasure Trails puzzle in Play → spend stars in World → Build. Then read tonight’s diary.
          </div>
        </aside>
        <div className="phone">
          <Game />
        </div>
        <div />
      </div>
    </GameProvider>
  );
}
