import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Look, useGame, tierOf, MAX_ENERGY, ENERGY_MS, questReady, GIFTS_PER_DAY } from '../game/store';
import { questForStep } from '../game/quests';
import { CASS_TRAITS, MEMORIES, STEP, TRAITS } from '../game/story';
import { SPOTS } from '../game/layout';
import { ItemIcon } from './ItemIcon';
import { Portrait, ART, cgFile, herSuffix } from './Art';
import {
  Crescent,
  IconClose,
  IconDew,
  IconEnergy,
  IconExplore,
  IconHeart,
  IconLock,
  IconLove,
  IconMerge,
  IconSatchel,
  IconSound,
  IconStory,
  Sprig,
} from './Icons';
import { unlockAudio } from '../game/audio';

export function Title() {
  const screen = useGame((s) => s.screen);
  const step = useGame((s) => s.step);
  const begin = useGame((s) => s.begin);
  const reset = useGame((s) => s.resetSave);
  const [confirm, setConfirm] = useState(false);
  const [creating, setCreating] = useState(false);
  if (screen !== 'title') return null;
  const hasSave = step > STEP.title;
  if (creating) return <Create onDone={() => (unlockAudio(), begin())} onBack={() => setCreating(false)} />;
  return (
    <div className="title-screen" style={{ backgroundImage: `url(${ART}title.webp)` }}>
      <div className="title-top">
        <Crescent size={44} />
        <h1 className="logo">Veloria</h1>
        <div className="logo-sub">A Romantasy Game</div>
        <p className="tagline">
          Somewhere between dreams and reality,
          <br />
          he&rsquo;s waiting for you.
        </p>
      </div>
      <div className="title-bottom">
        <button
          className="btn primary big"
          onClick={() => {
            unlockAudio();
            if (hasSave) begin();
            else setCreating(true);
          }}
        >
          {hasSave ? 'Return to Veloria' : 'Begin your story'} <span className="chev">›</span>
        </button>
        {hasSave &&
          (confirm ? (
            <div className="confirm">
              Forget everything and begin again?
              <button className="link" onClick={reset}>
                Yes
              </button>
              <button className="link" onClick={() => setConfirm(false)}>
                No
              </button>
            </div>
          ) : (
            <button className="link" onClick={() => setConfirm(true)}>
              New story
            </button>
          ))}
        <div className="title-hint">Best with sound · Headphones recommended</div>
      </div>
    </div>
  );
}

const LOOKS: { id: Look; name: string; line: string }[] = [
  { id: 'rose', name: 'Rose', line: 'Dark waves, a rose-red cloak' },
  { id: 'moon', name: 'Moonlight', line: 'Silver hair, a lavender cloak' },
  { id: 'ember', name: 'Ember', line: 'Midnight curls, a sage-green cloak' },
];

/** who she is: a name for him to learn, and a look */
function Create({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const setHero = useGame((s) => s.setHero);
  const [name, setName] = useState('');
  const [look, setLook] = useState<Look>('rose');
  const ok = name.trim().length > 0;
  return (
    <div className="create" style={{ backgroundImage: `url(${ART}title.webp)` }}>
      <div className="create-card">
        <div className="create-kicker">Before you fall asleep</div>
        <h2 className="create-title">Who are you?</h2>
        <div className="looks">
          {LOOKS.map((l) => (
            <button key={l.id} className={`look ${look === l.id ? 'on' : ''}`} onClick={() => setLook(l.id)} aria-pressed={look === l.id}>
              <img src={`${ART}bust_her${herSuffix(l.id)}.webp`} alt="" draggable={false} />
              <span className="look-name">{l.name}</span>
              <span className="look-line">{l.line}</span>
            </button>
          ))}
        </div>
        <label className="name-label" htmlFor="hero-name">
          Your name, the one he will learn
        </label>
        <input
          id="hero-name"
          className="name-input"
          value={name}
          maxLength={18}
          autoComplete="off"
          placeholder="Write your name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && ok) {
              setHero(name, look);
              onDone();
            }
          }}
        />
        <button
          className="btn primary wide"
          disabled={!ok}
          onClick={() => {
            setHero(name, look);
            onDone();
          }}
        >
          Close your eyes
        </button>
        <button className="link dark" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

export function TopBar() {
  const energy = useGame((s) => s.energy);
  const energyAt = useGame((s) => s.energyAt);
  const dew = useGame((s) => s.dew);
  const affection = useGame((s) => s.affection);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const buyEnergy = useGame((s) => s.buyEnergy);
  const step = useGame((s) => s.step);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      useGame.getState().tickEnergy();
      tick((x) => x + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const secs = energy >= MAX_ENERGY ? 0 : Math.max(0, Math.ceil((ENERGY_MS - (Date.now() - energyAt)) / 1000));
  const tier = tierOf(affection);
  return (
    <div className="topbar">
      <div className="stat" title="Affection">
        <IconHeart size={17} />
        <span>{step >= STEP.q1 ? tier.name : '—'}</span>
      </div>
      <button className="stat" onClick={buyEnergy} title="Energy · tap to buy 40 for 25 dewdrops">
        <IconEnergy />
        <span>{energy}</span>
        {secs > 0 && <small>{secs}s</small>}
        <span className="plus">+</span>
      </button>
      <div className="stat" title="Dewdrops">
        <IconDew />
        <span>{dew}</span>
      </div>
      <button className="icon-btn sound" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        <IconSound on={!muted} />
      </button>
    </div>
  );
}

export function Objective() {
  const step = useGame((s) => s.step);
  const board = useGame((s) => s.board);
  const tab = useGame((s) => s.tab);
  const dialogue = useGame((s) => s.dialogue);
  const setTab = useGame((s) => s.setTab);
  const delivered = useGame((s) => s.delivered);
  if (dialogue || tab !== 'explore') return null;
  const q = questForStep(step);
  let title = '';
  let sub = '';
  let ready = false;
  if (step === STEP.explore) {
    title = 'The silent city';
    sub = 'Someone is waiting beneath the clock tower';
  } else if (q && !delivered.includes(q.id)) {
    ready = questReady(board, q.requires).every(Boolean);
    title = q.title;
    sub = ready ? 'Everything is ready · tap to deliver' : 'Gather lights, then merge what the order needs · tap to open';
  } else if (step === STEP.ch3End) {
    title = 'Veloria, awake';
    sub = 'Wander, merge gifts for them, relive your memories';
  } else if (step === STEP.q6 || step === STEP.wake3) {
    title = 'The lamplighter';
    sub = 'Cassian is lighting the lamps along the canal';
  } else return null;
  return (
    <button
      className={`objective ${ready ? 'ready' : ''}`}
      onClick={() => {
        if (!q) return;
        if (ready) useGame.getState().deliver(q.id);
        else setTab('merge');
      }}
    >
      <div className="obj-title">{title}</div>
      <div className="obj-sub">{sub}</div>
      {q && !delivered.includes(q.id) && (
        <div className="obj-items">
          {q.requires.map((it, i) => (
            <ItemIcon key={i} item={it} size={26} />
          ))}
        </div>
      )}
    </button>
  );
}

export function Nav() {
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);
  const dialogue = useGame((s) => s.dialogue);
  const step = useGame((s) => s.step);
  const board = useGame((s) => s.board);
  const lettersNew = useGame((s) => s.letters.filter((l) => !s.lettersRead.includes(l)).length);
  const q = questForStep(step);
  const ready = q ? questReady(board, q.requires).every(Boolean) : false;
  if (dialogue) return null;
  const items: { id: Parameters<typeof setTab>[0]; label: string; icon: React.ReactElement; badge?: boolean }[] = [
    { id: 'explore', label: 'Explore', icon: <IconExplore /> },
    { id: 'merge', label: 'Merge', icon: <IconMerge />, badge: ready },
    { id: 'story', label: 'Story', icon: <IconStory />, badge: lettersNew > 0 },
    { id: 'love', label: 'Love', icon: <IconLove /> },
    { id: 'satchel', label: 'Satchel', icon: <IconSatchel /> },
  ];
  return (
    <nav className="nav">
      {items.map((it) => (
        <button key={it.id} className={`nav-btn ${tab === it.id ? 'on' : ''}`} onClick={() => setTab(it.id)}>
          {it.icon}
          <span>{it.label}</span>
          {it.badge && <i className="badge" />}
        </button>
      ))}
    </nav>
  );
}

export function Prompt() {
  const near = useGame((s) => s.near);
  const dialogue = useGame((s) => s.dialogue);
  const tab = useGame((s) => s.tab);
  const knowName = useGame((s) => s.knowName);
  const inspect = useGame((s) => s.inspect);
  const talk = useGame((s) => s.talkToHim);
  const himSaid = useGame((s) => s.himSaid);
  const knowCass = useGame((s) => s.knowCass);
  const talkCass = useGame((s) => s.talkToCass);
  if (!near || dialogue || tab !== 'explore') return null;
  const spot = SPOTS.find((s) => s.id === near);
  const label = near === 'him' ? `Talk to ${knowName ? 'Lucien' : 'him'}` : near === 'cass' ? `Talk to ${knowCass ? 'Cassian' : 'the lamplighter'}` : spot?.label;
  return (
    <button className="prompt" onClick={() => (near === 'him' ? talk() : near === 'cass' ? talkCass() : inspect(near))}>
      {near === 'him' || near === 'cass' ? <IconHeart size={16} filled={near === 'him' && !!himSaid} /> : <span className="eye">◦</span>}
      {label}
    </button>
  );
}

const CG: Record<string, string> = {
  wake: 'cg_tree',
  meet: 'cg_meet',
  q2_done: 'cg_fountain',
  q3_done: 'cg_garden',
  ending1: 'cg_garden',
  wake2: 'cg_return',
  q4_done: 'cg_bookshop',
  q5_done: 'cg_bell',
  mem_boats: 'cg_boats',
  mem_ledge: 'cg_ledge',
};
const heartish = (t: string) => /you|we |glad|delight|like|laugh|insufferable|smile|thank/i.test(t);

export function Dialogue() {
  const d = useGame((s) => s.dialogue);
  const next = useGame((s) => s.next);
  const choose = useGame((s) => s.choose);
  const knowName = useGame((s) => s.knowName);
  const [shown, setShown] = useState(0);
  const line = d?.lines[d.i];
  const text = line?.text ?? '';
  const raf = useRef(0);
  useEffect(() => {
    setShown(0);
    if (!text) return;
    let n = 0;
    const step = () => {
      n += 2.6;
      setShown(Math.min(text.length, Math.floor(n)));
      if (n < text.length) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [text, d?.i]);
  if (!d || !line) return null;
  const done = shown >= text.length;
  const st = useGame.getState();
  const alone = st.focus === 'alone';
  // a line can change the painted scene for the rest of the script
  let lineCg: string | undefined;
  for (let k = d.i; k >= 0; k--) if (d.lines[k].cg) (lineCg = d.lines[k].cg), (k = -1);
  const cgId = alone ? 'cg_alone' : (lineCg ?? CG[d.id as string]);
  const cg = cgId ? cgFile(cgId, st.look) : null;
  if (cgId && !st.seenCg.includes(cgId)) setTimeout(() => useGame.getState().markCg(cgId), 0);
  const herBust = `bust_her${herSuffix(st.look)}`;
  const bust = !cg && line.who !== 'narr'
    ? line.who === 'him'
      ? line.choices ? 'bust_him' : heartish(text) ? 'bust_him_smile' : 'bust_him'
      : line.who === 'cass'
        ? heartish(text) ? 'bust_cass_smile' : 'bust_cass'
        : herBust
    : null;
  const who = line.who;
  const name =
    who === 'him' ? (knowName ? 'Lucien' : 'Him') : who === 'cass' ? (st.knowCass ? 'Cassian' : 'The Lamplighter') : who === 'you' ? st.heroName || 'You' : '';
  const onTap = () => {
    if (line.choices) return;
    if (!done) {
      cancelAnimationFrame(raf.current);
      setShown(text.length);
      return;
    }
    next();
  };
  return (
    <div className={`dialogue-wrap ${cg ? 'with-cg' : ''}`} onClick={onTap}>
      {cg && (
        <div className="cg" key={cg}>
          <div className="cg-blur" style={{ backgroundImage: `url(${cg})` }} />
          <div className="cg-plate">
            <img src={cg} alt="" draggable={false} />
          </div>
        </div>
      )}
      {bust && <img key={bust} className={`bust ${line.who === 'cass' ? 'him' : line.who}`} src={`${ART}${bust}.webp`} alt="" draggable={false} />}
      {line.choices ? (
        <div className="choices">
          {line.choices.map((c, i) => (
            <button
              key={i}
              className={`choice ${c.tone === 'heart' ? 'heart' : ''} ${c.tone === 'spicy' ? 'spicy' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                choose(i);
              }}
            >
              {c.tone === 'heart' && <IconHeart size={16} />}
              {c.tone === 'spicy' && (
                <span className="spice">
                  <IconHeart size={14} />
                  <IconHeart size={14} />
                </span>
              )}
              {c.text}
              {c.to === 'cass' && <span className="for-cass">Cassian</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className={`dialogue ${who}`}>
          {name && <div className="speaker">{name}</div>}
          <p className={who === 'narr' ? 'narr' : ''}>
            {text.slice(0, shown)}
            <span className="ghost-text">{text.slice(shown)}</span>
          </p>
          {done && <div className="more">›</div>}
        </div>
      )}
    </div>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.heart ? 'heart' : ''}`}>
          {t.item && <ItemIcon item={t.item} size={26} />}
          {t.heart && <IconHeart size={15} />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function Fade() {
  const fade = useGame((s) => s.fade);
  return <div className="fade" style={{ opacity: fade }} />;
}

function Sheet({ title, children }: { title: string; children: React.ReactNode }) {
  const setTab = useGame((s) => s.setTab);
  return (
    <div className="sheet">
      <div className="sheet-head">
        <Sprig />
        <div className="pill-title">{title}</div>
        <Sprig flip />
        <button className="icon-btn sheet-close" onClick={() => setTab('explore')} aria-label="Close">
          <IconClose />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </div>
  );
}

export function LovePanel() {
  const affection = useGame((s) => s.affection);
  const affC = useGame((s) => s.affC);
  const knowName = useGame((s) => s.knowName);
  const knowCass = useGame((s) => s.knowCass);
  const step = useGame((s) => s.step);
  const memories = useGame((s) => s.memories);
  const playMemory = useGame((s) => s.playMemory);
  const gifts = useGame((s) => s.gifts);
  const [who, setWho] = useState<'him' | 'cass'>('him');
  const cassMet = step >= STEP.wake3;
  const isCass = who === 'cass' && cassMet;
  const aff = isCass ? affC : affection;
  const tier = tierOf(aff);
  const met = isCass || step >= STEP.q1;
  const giftsLeft = GIFTS_PER_DAY - (gifts.day === new Date().toISOString().slice(0, 10) ? gifts.n : 0);
  const traits = isCass ? CASS_TRAITS : TRAITS;
  const mems = MEMORIES.filter((m) => m.who === (isCass ? 'cass' : 'him'));
  return (
    <Sheet title="Love">
      {cassMet && (
        <div className="love-tabs">
          <button className={!isCass ? 'on' : ''} onClick={() => setWho('him')}>
            {knowName ? 'Lucien' : 'Him'}
          </button>
          <button className={isCass ? 'on' : ''} onClick={() => setWho('cass')}>
            {knowCass ? 'Cassian' : 'The Lamplighter'}
          </button>
        </div>
      )}
      <div className={`love-card panel ${isCass ? 'cass' : ''}`}>
        {isCass ? (
          <div className="portrait" style={{ width: 132, height: 132 }}>
            <img src={`${ART}${tier.index >= 2 ? 'bust_cass_smile' : 'bust_cass'}.webp`} alt="" draggable={false} />
          </div>
        ) : (
          <Portrait size={132} mystery={!met} smile={tier.index >= 2} />
        )}
        <div className="love-name">{isCass ? (knowCass ? 'Cassian Ashby' : 'The Lamplighter') : met ? (knowName ? 'Lucien Vale' : 'The man by the clock') : '???'}</div>
        <div className="love-epithet">
          {isCass ? 'Lamplighter of Veloria · Dangerous attraction' : met ? 'Keeper of Veloria · Slow burn' : 'Someone is waiting beneath the clock tower.'}
        </div>
        {met && (
          <>
            <div className="tier">
              <span className="tier-name">{tier.name}</span>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${tier.progress * 100}%` }} />
              </div>
              <div className="hearts">
                {[0, 1, 2, 3, 4].map((i) => (
                  <IconHeart key={i} size={16} filled={i <= tier.index} />
                ))}
              </div>
            </div>
            <p className="tier-line">{isCass ? CASS_TIER_LINES[tier.index] : tier.line}</p>
          </>
        )}
      </div>
      {met && (
        <>
          <h4 className="section">What you know of {isCass ? 'him' : 'him'}</h4>
          <ul className="traits">
            {traits.map((t, i) => (
              <li key={i} className={aff >= t.at ? '' : 'locked'}>
                {aff >= t.at ? t.text : 'Grow closer to learn more…'}
              </li>
            ))}
          </ul>
          <h4 className="section">Memories</h4>
          <div className="memories">
            {mems.map((m) => {
              const open = aff >= m.at && step >= m.step;
              return (
                <button key={m.id} className={`memory ${open ? '' : 'locked'}`} disabled={!open} onClick={() => playMemory(m.id)}>
                  <div className="memory-title">
                    {!open && <IconLock />} {m.title}
                    {memories.includes(m.id) && <span className="seen">relived</span>}
                  </div>
                  <div className="memory-blurb">{open ? m.blurb : step < m.step ? `Unlocks in Chapter ${m.step >= STEP.wake3 + 1 ? 'III' : 'II'}` : `Unlocks at ${m.at} affection`}</div>
                </button>
              );
            })}
          </div>
          <p className="gift-note">
            <IconHeart size={14} />{' '}
            {isCass
              ? `Give him gifts from the Merge board. He is fond of crystals, keys and anything that glows. ${giftsLeft} gifts left tonight.`
              : `Give him gifts from the Merge board. He is especially fond of books, letters and flowers. ${giftsLeft} gifts left tonight.`}
          </p>
        </>
      )}
    </Sheet>
  );
}

const CASS_TIER_LINES = [
  'He watches you the way he watches a flame: carefully, and a little too long.',
  'He has started lighting the lamp nearest wherever you are.',
  'He tells you things he has never told anyone. Then pretends he was joking.',
  'He stopped flirting. Now he just looks at you. It is worse.',
  'He would keep every lamp in Veloria burning for you, and never ask for anything back.',
];

export function SatchelPanel() {
  const satchel = useGame((s) => s.satchel);
  const unstore = useGame((s) => s.unstore);
  const letters = useGame((s) => s.letters);
  const openBook = useGame((s) => s.openBook);
  const inspected = useGame((s) => s.inspected);
  return (
    <Sheet title="Satchel">
      <p className="sheet-intro">Things you are keeping for later. Tap one to return it to the board.</p>
      <div className="satchel-grid">
        {satchel.map((it, i) => (
          <button key={i} className="slot" disabled={!it} onClick={() => it && unstore(i)}>
            {it && <ItemIcon item={it} size={44} />}
          </button>
        ))}
      </div>
      <h4 className="section">Keepsakes</h4>
      <div className="keepsakes">
        <button className="keepsake" onClick={() => openBook('letters')}>
          <span className="k-num">{letters.length}</span>
          <span>Letters</span>
        </button>
        <div className="keepsake">
          <span className="k-num">{inspected.length}</span>
          <span>Places noticed</span>
        </div>
      </div>
    </Sheet>
  );
}

const GLOW: Record<string, string> = { bloom: '#f4a9bb', clock: '#f0cf98', crystal: '#c7b2f2', key: '#e8d6a8', ink: '#f4ecdc', time: '#a9d2ec' };

/** collected lights fly to the Merge button */
export function FlyLayer() {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const { x, y, chain } = (e as CustomEvent<{ x: number; y: number; chain: string }>).detail;
      const target = document.querySelector('.nav-btn:nth-child(2)') as HTMLElement | null;
      const host = layer.current;
      if (!target || !host) return;
      const r = target.getBoundingClientRect();
      const tx = r.left + r.width / 2;
      const ty = r.top + r.height / 2 - 6;
      for (let k = 0; k < 3; k++) {
        const orb = document.createElement('div');
        orb.className = 'fly-orb';
        orb.style.setProperty('--gc', GLOW[chain] ?? '#fff');
        host.appendChild(orb);
        const mx = (x + tx) / 2 + (k - 1) * 60;
        const my = Math.min(y, ty) - 120 - k * 20;
        const anim = orb.animate(
          [
            { transform: `translate(${x}px, ${y}px) scale(0.6)`, opacity: 1 },
            { transform: `translate(${mx}px, ${my}px) scale(1.1)`, opacity: 1, offset: 0.45 },
            { transform: `translate(${tx}px, ${ty}px) scale(0.5)`, opacity: 0.9 },
          ],
          { duration: 700 + k * 90, easing: 'cubic-bezier(0.4, 0, 0.6, 1)' },
        );
        anim.onfinish = () => {
          orb.remove();
          if (k === 0) {
            target.classList.remove('bump');
            void target.offsetWidth;
            target.classList.add('bump');
          }
        };
      }
    };
    window.addEventListener('veloria:collect', on);
    return () => window.removeEventListener('veloria:collect', on);
  }, []);
  return <div className="fly-layer" ref={layer} />;
}

/** five marks for the five hours restored */
export function Awakening() {
  const restored = useGame((s) => s.restored);
  const step = useGame((s) => s.step);
  const tab = useGame((s) => s.tab);
  const dialogue = useGame((s) => s.dialogue);
  if (step < STEP.explore || tab !== 'explore' || dialogue) return null;
  const marks: { id: string; label: string }[] = [
    { id: 'clock', label: 'The clock' },
    { id: 'fountain', label: 'The fountain' },
    { id: 'garden', label: 'The garden' },
    { id: 'bookshop', label: 'The bookshop' },
    { id: 'bell', label: 'The bell' },
  ];
  const n = marks.filter((m) => restored[m.id as keyof typeof restored]).length;
  return (
    <div className="awakening" title={`${n} of 5 restored`}>
      <span className="aw-label">Veloria awakens</span>
      <div className="aw-marks">
        {marks.map((m) => (
          <i key={m.id} className={restored[m.id as keyof typeof restored] ? 'on' : ''} title={m.label} />
        ))}
      </div>
    </div>
  );
}
