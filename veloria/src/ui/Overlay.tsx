import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useGame, tierOf, MAX_ENERGY, ENERGY_MS, questReady, GIFTS_PER_DAY } from '../game/store';
import { questForStep } from '../game/quests';
import { MEMORIES, STEP, TRAITS } from '../game/story';
import { SPOTS } from '../game/layout';
import { ItemIcon } from './ItemIcon';
import { Portrait, ART } from './Art';
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
  if (screen !== 'title') return null;
  const hasSave = step > STEP.title;
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
            begin();
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
  } else if (step === STEP.ch2End) {
    title = 'Veloria, awake';
    sub = 'Wander, merge gifts for him, relive your memories';
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
  if (!near || dialogue || tab !== 'explore') return null;
  const spot = SPOTS.find((s) => s.id === near);
  const label = near === 'him' ? `Talk to ${knowName ? 'Lucien' : 'him'}` : spot?.label;
  return (
    <button className="prompt" onClick={() => (near === 'him' ? talk() : inspect(near))}>
      {near === 'him' ? <IconHeart size={16} filled={!!himSaid} /> : <span className="eye">◦</span>}
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
  const alone = useGame.getState().focus === 'alone';
  const cg = alone ? 'cg_alone' : CG[d.id as string];
  const bust = !cg && line.who !== 'narr' ? (line.who === 'him' ? (line.choices ? 'bust_him' : heartish(text) ? 'bust_him_smile' : 'bust_him') : 'bust_her') : null;
  const who = line.who;
  const name = who === 'him' ? (knowName ? 'Lucien' : 'Him') : who === 'you' ? 'You' : '';
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
          <div className="cg-blur" style={{ backgroundImage: `url(${ART}${cg}.webp)` }} />
          <div className="cg-plate">
            <img src={`${ART}${cg}.webp`} alt="" draggable={false} />
          </div>
        </div>
      )}
      {bust && <img key={bust} className={`bust ${line.who}`} src={`${ART}${bust}.webp`} alt="" draggable={false} />}
      {line.choices ? (
        <div className="choices">
          {line.choices.map((c, i) => (
            <button
              key={i}
              className={`choice ${c.tone === 'heart' ? 'heart' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                choose(i);
              }}
            >
              {c.tone === 'heart' && <IconHeart size={16} />}
              {c.text}
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
  const knowName = useGame((s) => s.knowName);
  const step = useGame((s) => s.step);
  const memories = useGame((s) => s.memories);
  const playMemory = useGame((s) => s.playMemory);
  const gifts = useGame((s) => s.gifts);
  const tier = tierOf(affection);
  const met = step >= STEP.q1;
  const giftsLeft = GIFTS_PER_DAY - (gifts.day === new Date().toISOString().slice(0, 10) ? gifts.n : 0);
  return (
    <Sheet title="Love">
      <div className="love-card panel">
        <Portrait size={132} mystery={!met} smile={tier.index >= 2} />
        <div className="love-name">{met ? (knowName ? 'Lucien Vale' : 'The man by the clock') : '???'}</div>
        <div className="love-epithet">{met ? 'Keeper of Veloria · Slow burn' : 'Someone is waiting beneath the clock tower.'}</div>
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
            <p className="tier-line">{tier.line}</p>
          </>
        )}
      </div>
      {met && (
        <>
          <h4 className="section">What you know of him</h4>
          <ul className="traits">
            {TRAITS.map((t, i) => (
              <li key={i} className={affection >= t.at ? '' : 'locked'}>
                {affection >= t.at ? t.text : 'Grow closer to learn more…'}
              </li>
            ))}
          </ul>
          <h4 className="section">Memories</h4>
          <div className="memories">
            {MEMORIES.map((m) => {
              const open = affection >= m.at && step >= STEP.q4;
              return (
                <button key={m.id} className={`memory ${open ? '' : 'locked'}`} disabled={!open} onClick={() => playMemory(m.id)}>
                  <div className="memory-title">
                    {!open && <IconLock />} {m.title}
                    {memories.includes(m.id) && <span className="seen">relived</span>}
                  </div>
                  <div className="memory-blurb">{open ? m.blurb : step < STEP.q4 ? 'Unlocks in Chapter II' : `Unlocks at ${m.at} affection`}</div>
                </button>
              );
            })}
          </div>
          <p className="gift-note">
            <IconHeart size={14} /> Give him gifts from the Merge board. He is especially fond of books, letters and flowers. {giftsLeft} gifts left tonight.
          </p>
        </>
      )}
    </Sheet>
  );
}

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
