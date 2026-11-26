import { useEffect, useRef, useState } from 'react';
import { useGame, questReady } from '../game/store';
import { COLS } from '../game/board';
import { GeneratorId, GENERATORS, itemLore, itemName, nextOf, parse, sellValue, CHAINS, ItemKey } from '../game/items';
import { questForStep } from '../game/quests';
import { STEP } from '../game/story';
import { ItemIcon, GenIcon } from './ItemIcon';
import { IconHeart, Sprig } from './Icons';
import { unlockAudio } from '../game/audio';

const seen = new Set<number>();

interface Drag {
  from: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  moved: boolean;
  item?: ItemKey;
  gen?: boolean;
}

export function MergeScreen() {
  const board = useGame((s) => s.board);
  const step = useGame((s) => s.step);
  const selected = useGame((s) => s.selected);
  const tutorial = useGame((s) => s.mergeTutorial);
  const fx = useGame((s) => s.fx);
  // the drag lives in a ref so moving a finger never re-renders the board
  const dragRef = useRef<Drag | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [burst, setBurst] = useState<{ i: number; k: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLElement | null>(null);
  const quest = questForStep(step);

  useEffect(() => {
    // the first render marks everything already on the board as seen
    board.forEach((c) => c && seen.add(c.uid));
  });

  const cellEl = (x: number, y: number) => document.elementFromPoint(x, y)?.closest('[data-cell]') as HTMLElement | null;

  const setHover = (el: HTMLElement | null, d: Drag) => {
    if (hoverRef.current === el) return;
    hoverRef.current?.classList.remove('hover', 'can-merge');
    hoverRef.current = el;
    if (!el) return;
    const c = useGame.getState().board[Number(el.dataset.cell)];
    const merge = c && c.kind === 'item' && !!d.item && c.item === d.item && !!nextOf(c.item) && Number(el.dataset.cell) !== d.from;
    el.classList.add(merge ? 'can-merge' : 'hover');
  };

  const onDown = (e: React.PointerEvent, i: number) => {
    unlockAudio();
    const c = board[i];
    if (!c || c.frozen) {
      if (c?.frozen) useGame.getState().setSelected(i);
      return;
    }
    // capture on the whole screen so the drag survives leaving the cell
    rootRef.current?.setPointerCapture?.(e.pointerId);
    dragRef.current = { from: i, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, item: c.kind === 'item' ? c.item : undefined, gen: c.kind === 'gen' };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) {
      d.moved = true;
      setDragFrom(d.from);
    }
    if (d.moved) {
      if (ghostRef.current) ghostRef.current.style.transform = `translate(${d.x}px, ${d.y}px) translate(-50%, -62%) scale(1.12)`;
      setHover(cellEl(e.clientX, e.clientY), d);
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    const s = useGame.getState();
    if (!d.moved) {
      const c = board[d.from];
      if (c?.kind === 'gen') s.tapGenerator(d.from);
      s.setSelected(d.from);
    } else {
      const el = cellEl(e.clientX, e.clientY);
      const to = el ? Number(el.dataset.cell) : null;
      if (to !== null && to !== d.from) {
        const before = s.board[to];
        const wasMerge = before && before.kind === 'item' && d.item && before.item === d.item;
        s.dropCell(d.from, to);
        if (wasMerge && useGame.getState().board[to] !== before) setBurst({ i: to, k: Date.now() });
      }
    }
    hoverRef.current?.classList.remove('hover', 'can-merge');
    hoverRef.current = null;
    setDragFrom(null);
  };
  const dragItem = dragFrom !== null ? board[dragFrom] : null;

  const sel = selected !== null ? board[selected] : null;

  return (
    <div className="merge-screen" ref={rootRef} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => {
        dragRef.current = null;
        setDragFrom(null);
      }}>
      <div className="merge-head">
        <Sprig />
        <div className="pill-title">Merge</div>
        <Sprig flip />
      </div>

      <Orders />

      <div className="board-wrap">
        <div className="board" ref={gridRef} style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {board.map((c, i) => {
            const isNew = c && !seen.has(c.uid);
            const dragging = dragFrom === i;
            const isQuest = c?.kind === 'item' && !c.frozen && quest?.requires.includes(c.item);
            const fresh = fx && c && fx.uid === c.uid && Date.now() - fx.t < 900 ? fx : null;
            const fly = fresh?.kind === 'spawn' ? { '--dc': (fresh.from % COLS) - (i % COLS), '--dr': Math.floor(fresh.from / COLS) - Math.floor(i / COLS) } : undefined;
            return (
              <div
                key={i}
                data-cell={i}
                className={`cell ${c?.frozen ? 'frozen' : ''} ${selected === i ? 'sel' : ''}`}
                onPointerDown={(e) => onDown(e, i)}
              >
                {c && !dragging && (
                  <div
                    key={c.uid}
                    className={`piece ${fresh?.kind === 'spawn' ? 'fly' : fresh?.kind === 'merge' ? 'merged' : isNew ? 'pop' : 'land'} ${c.kind === 'gen' ? 'gen' : ''}`}
                    style={fly as React.CSSProperties | undefined}
                  >
                    {c.kind === 'item' ? <ItemIcon item={c.item} size={64} /> : <GenIcon gen={c.gen} size={64} />}
                    {c.kind === 'item' && !c.frozen && <span className="lvl">{parse(c.item).level}</span>}
                    {isQuest && <span className="quest-dot" />}
                    {c.kind === 'gen' && !c.frozen && <span className="gen-badge">tap</span>}
                  </div>
                )}
                {burst?.i === i && <div key={burst.k} className="merge-burst" />}
                {fresh?.kind === 'merge' && fresh.combo >= 2 && (
                  <div key={`c${fresh.t}`} className="combo">
                    Combo ×{fresh.combo}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div
          className="ghost"
          ref={ghostRef}
          style={{ display: dragItem ? 'block' : 'none', transform: dragRef.current ? `translate(${dragRef.current.x}px, ${dragRef.current.y}px) translate(-50%, -62%) scale(1.12)` : undefined }}
        >
          {dragItem?.kind === 'item' ? <ItemIcon item={dragItem.item} size={64} /> : dragItem?.kind === 'gen' ? <GenIcon gen={dragItem.gen as GeneratorId} size={64} /> : null}
        </div>
      </div>

      <InfoBar sel={sel} idx={selected} />
      {!tutorial && step >= STEP.q1 && <Tutorial />}
    </div>
  );
}

function Orders() {
  const step = useGame((s) => s.step);
  const board = useGame((s) => s.board);
  const deliver = useGame((s) => s.deliver);
  const delivered = useGame((s) => s.delivered);
  const requests = useGame((s) => s.requests);
  const fulfil = useGame((s) => s.fulfil);
  const quest = questForStep(step);
  const story = quest && !delivered.includes(quest.id) ? quest : null;
  const ready = story ? questReady(board, story.requires) : [];
  const all = ready.length > 0 && ready.every(Boolean);
  if (!story && !requests.length) {
    const msg = step <= STEP.explore ? 'The board is waiting. Find someone in the city first.' : 'Merge freely. New wishes are on their way.';
    return (
      <div className="orders empty">
        <p>{msg}</p>
      </div>
    );
  }
  return (
    <div className="order-strip">
      {story && (
        <div className={`order-card story ${all ? 'ready' : ''}`}>
          <div className="oc-head">
            <span className="oc-tag">Story</span>
            <span className="oc-title">{story.title}</span>
          </div>
          <div className="oc-row">
            {story.requires.map((it, i) => (
              <div key={i} className={`order-item ${ready[i] ? 'have' : ''}`} title={itemName(it)}>
                <ItemIcon item={it} size={36} />
                {ready[i] && <span className="tick">✓</span>}
              </div>
            ))}
            <button className="btn deliver" disabled={!all} onClick={() => deliver(story.id)}>
              {all ? 'Deliver' : 'Needed'}
            </button>
          </div>
        </div>
      )}
      {requests.map((r) => {
        const have = questReady(board, r.items);
        const ok = have.every(Boolean);
        return (
          <div key={r.id} className={`order-card wish ${ok ? 'ready' : ''}`}>
            <div className="oc-head">
              <img className="oc-face" src={`${import.meta.env.BASE_URL}art/bust_him.webp`} alt="" />
              <span className="oc-line">{r.line}</span>
            </div>
            <div className="oc-row">
              {r.items.map((it, i) => (
                <div key={i} className={`order-item ${have[i] ? 'have' : ''}`} title={itemName(it)}>
                  <ItemIcon item={it} size={30} />
                  {have[i] && <span className="tick">✓</span>}
                </div>
              ))}
              <button className="btn deliver small-give" disabled={!ok} onClick={() => fulfil(r.id)}>
                {ok ? 'Give' : `+${r.reward.dew}`}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoBar({ sel, idx }: { sel: ReturnType<typeof useGame.getState>['board'][number]; idx: number | null }) {
  const s = useGame();
  if (!sel || idx === null) {
    return (
      <div className="infobar hint">
        <span>Tap a generator to make something. Drag two of a kind together to merge.</span>
      </div>
    );
  }
  if (sel.frozen) {
    return (
      <div className="infobar">
        <div className="info-main">
          <div className="info-name">Suspended in time</div>
          <div className="info-lore">Merge something beside it, or drop its twin on top, and it will wake.</div>
        </div>
      </div>
    );
  }
  if (sel.kind === 'gen') {
    const g = GENERATORS[sel.gen];
    return (
      <div className="infobar">
        <GenIcon gen={sel.gen} size={44} />
        <div className="info-main">
          <div className="info-name">{g.name}</div>
          <div className="info-lore">{g.hint} Costs 1 energy.</div>
        </div>
      </div>
    );
  }
  const { chain, level } = parse(sel.item);
  const next = nextOf(sel.item);
  const canGift = s.step >= STEP.q1;
  return (
    <div className="infobar">
      <ItemIcon item={sel.item} size={44} />
      <div className="info-main">
        <div className="info-name">
          {itemName(sel.item)} <span className="info-lvl">· {CHAINS[chain].name} {level}/{CHAINS[chain].levels.length}</span>
        </div>
        <div className="info-lore">{next ? `${itemLore(sel.item)} Merge two for a ${itemName(next)}.` : `${itemLore(sel.item)} The finest of its kind.`}</div>
      </div>
      <div className="info-actions">
        {canGift && (
          <button className="btn small rose" onClick={() => s.gift(idx)} title="Give to him">
            <IconHeart size={14} /> Gift
          </button>
        )}
        <button className="btn small" onClick={() => s.store(idx)}>
          Store
        </button>
        <button className="btn small ghost-btn" onClick={() => s.sell(idx)}>
          Sell · {sellValue(sel.item)}
        </button>
      </div>
    </div>
  );
}

function Tutorial() {
  const done = useGame((s) => s.finishMergeTutorial);
  const [page, setPage] = useState(0);
  const pages = [
    { t: 'The lights you gathered', b: 'Everything you collect in Veloria appears here. Each generator — the Flower Cart, the Clockmaker’s Box, the Moonlit Geode — makes something new for one energy.' },
    { t: 'Two become one', b: 'Drag an item onto its twin to merge them into something finer. Items frosted over are suspended in time: merge beside them to wake them.' },
    { t: 'Orders', b: 'The card above shows what the city needs. When everything is on the board, tap Deliver — and watch Veloria come back to life.' },
  ];
  const p = pages[page];
  return (
    <div className="tutorial">
      <div className="tutorial-card panel">
        <div className="tut-step">
          {page + 1} / {pages.length}
        </div>
        <h3>{p.t}</h3>
        <p>{p.b}</p>
        <button className="btn primary" onClick={() => (page < pages.length - 1 ? setPage(page + 1) : done())}>
          {page < pages.length - 1 ? 'Next' : 'Begin'}
        </button>
      </div>
    </div>
  );
}
