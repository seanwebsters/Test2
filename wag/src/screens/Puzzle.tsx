import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Dog, type Pose } from '../art/Dog';
import { Coin, Icon, Star } from '../art/Icons';
import { BoosterIcon, Piece, PieceDefs, PIECE_COLORS } from '../art/Pieces';
import { useGame } from '../game/store';
import type { BoosterId } from '../game/types';
import {
  H,
  W,
  adjacent,
  clearStep,
  collectTreasure,
  comboSeed,
  createBoard,
  findMove,
  gravity,
  idx,
  isMatchable,
  isValidSwap,
  shuffleBoard,
  spawnInitialTreasure,
  swapCells,
  xy,
  type Board,
  type ClearResult,
  type Effect,
  type Goal,
  type Special,
} from '../match3/engine';
import { CHAPTERS, starsFor, type LevelDef } from '../match3/levels';
import { rng } from '../game/util';
import { Confetti } from '../ui/Common';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const CHAPTER_TREASURE = ['flowerpot', 'mushroom', 'birdhouse', 'tent', 'snowdog'];
const CHEERS = ['Sweet!', 'Paw-some!', 'Good human!', 'Woof!', 'Fetch-tastic!', 'Tail-wagging!'];

interface Fx {
  id: number;
  kind: 'burst' | 'row' | 'col' | 'blast' | 'beam' | 'paw' | 'score' | 'cross' | 'mega';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  color?: string;
  r?: number;
  text?: string;
}

let fxId = 1;

export function Puzzle({ level, bonusMoves, onExit }: { level: LevelDef; bonusMoves: number; onExit: (won: boolean) => void }) {
  const { s, actions } = useGame();
  const dog = s.profile!.dog;
  const chapter = CHAPTERS[level.chapter];
  const rand = useMemo(() => rng(`${level.id}:${Date.now()}`), [level.id]);
  const totalMoves = level.moves + bonusMoves;

  const treasureSpawned = useRef(0);
  const [board, setBoard] = useState<Board>(() => {
    let b = createBoard({ mask: level.mask, dirt: level.dirt, colors: level.colors, rand });
    if (level.treasures) {
      const first = Math.min(2, level.treasures);
      b = spawnInitialTreasure(b, first);
      treasureSpawned.current = first;
    }
    return b;
  });
  const boardRef = useRef(board);
  boardRef.current = board;

  const [moves, setMoves] = useState(totalMoves);
  const [score, setScore] = useState(0);
  const [goals, setGoals] = useState<Goal[]>(() => level.goals.map((g) => ({ ...g })));
  const goalsRef = useRef(goals);
  goalsRef.current = goals;
  const scoreRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [pose, setPose] = useState<Pose>('idle');
  const [bubble, setBubble] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [state, setState] = useState<'play' | 'won' | 'lost' | 'quit'>('play');
  const [booster, setBooster] = useState<BoosterId | null>(null);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [cell, setCell] = useState(44);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [extraUsed, setExtraUsed] = useState(false);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.min(el.clientWidth - 20, 400) - 20;
      const h = el.clientHeight - 24 - 92;
      setCell(Math.max(30, Math.floor(Math.min(w, h) / W)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const poseTimer = useRef<number | undefined>(undefined);
  const react = useCallback((p: Pose, ms = 900, say?: string) => {
    setPose(p);
    if (say) setBubble(say);
    window.clearTimeout(poseTimer.current);
    poseTimer.current = window.setTimeout(() => {
      setPose('idle');
      setBubble(null);
    }, ms);
  }, []);

  const trick = (): Pose => {
    const learned = s.tricks.map((t) => ({ spin: 'spin', bow: 'bow', wave: 'wave', roll: 'roll', perk: 'perk', boop: 'boop', sniff: 'sniff' })[t] as Pose).filter(Boolean);
    const pool: Pose[] = learned.length ? learned : ['spin', 'excited'];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // idle hints
  useEffect(() => {
    if (busy || state !== 'play') return;
    setHint(null);
    const t = window.setTimeout(() => setHint(findMove(boardRef.current)), 6000);
    return () => window.clearTimeout(t);
  }, [board, busy, state]);

  const goalDone = (g: Goal) => (g.kind === 'score' ? scoreRef.current >= g.n : g.n <= 0);
  const allDone = () => goalsRef.current.every(goalDone);
  const wantColors = () => goalsRef.current.filter((g) => g.kind === 'collect' && g.n > 0).map((g) => (g as { color: number }).color);

  const center = (i: number) => {
    const [x, y] = xy(i);
    return { x: (x + 0.5) * cell, y: (y + 0.5) * cell };
  };

  const addFx = (items: Omit<Fx, 'id'>[], life = 750) => {
    const withId = items.map((f) => ({ ...f, id: fxId++ }));
    setFx((cur) => [...cur, ...withId]);
    window.setTimeout(() => setFx((cur) => cur.filter((f) => !withId.includes(f))), life);
  };

  const showEffects = (effects: Effect[], res: ClearResult) => {
    const items: Omit<Fx, 'id'>[] = [];
    for (const e of effects) {
      const c = center(e.at);
      if (e.kind === 'row') items.push({ kind: 'row', ...c });
      else if (e.kind === 'col') items.push({ kind: 'col', ...c });
      else if (e.kind === 'cross') items.push({ kind: 'cross', ...c, r: e.radius ?? 0 });
      else if (e.kind === 'blast') items.push({ kind: 'blast', ...c, r: e.radius ?? 2 });
      else if (e.kind === 'mega') items.push({ kind: 'mega', ...c });
      else if (e.kind === 'sniff')
        e.targets?.forEach((t) => {
          const d = center(t);
          items.push({ kind: 'beam', ...c, x2: d.x, y2: d.y, color: PIECE_COLORS[e.color ?? 0] });
        });
      else if (e.kind === 'paw')
        e.targets?.forEach((t) => {
          const d = center(t);
          items.push({ kind: 'paw', ...c, x2: d.x, y2: d.y });
        });
    }
    for (const cl of res.cleared.slice(0, 40)) {
      const c = center(cl.idx);
      items.push({ kind: 'burst', ...c, color: cl.piece.color >= 0 ? PIECE_COLORS[cl.piece.color] : '#ffe38a' });
    }
    if (res.cleared.length) {
      const mid = center(res.cleared[Math.floor(res.cleared.length / 2)].idx);
      items.push({ kind: 'score', ...mid, text: `+${res.score}` });
    }
    addFx(items, 900);
  };

  const applyResult = (res: ClearResult) => {
    scoreRef.current += res.score;
    setScore(scoreRef.current);
    setGoals((gs) =>
      gs.map((g) => {
        if (g.kind === 'collect') return { ...g, n: Math.max(0, g.n - res.collected[g.color]) };
        if (g.kind === 'dirt') return { ...g, n: Math.max(0, g.n - res.dirt) };
        return g;
      }),
    );
    goalsRef.current = goalsRef.current.map((g) => {
      if (g.kind === 'collect') return { ...g, n: Math.max(0, g.n - res.collected[g.color]) };
      if (g.kind === 'dirt') return { ...g, n: Math.max(0, g.n - res.dirt) };
      return g;
    });
  };

  const spawnTreasure = () => {
    if (!level.treasures || treasureSpawned.current >= level.treasures) return false;
    const onBoard = boardRef.current.cells.filter((p) => p?.treasure).length;
    if (onBoard >= 2) return false;
    if (rand() < 0.07) {
      treasureSpawned.current++;
      return true;
    }
    return false;
  };

  const settle = async (b: Board) => {
    let cur = b;
    for (let k = 0; k < 6; k++) {
      const t = collectTreasure(cur);
      if (!t.got.length) break;
      addFx(t.got.map((i) => ({ kind: 'score' as const, ...center(i), text: 'Treasure!' })), 1000);
      goalsRef.current = goalsRef.current.map((g) => (g.kind === 'treasure' ? { ...g, n: Math.max(0, g.n - t.got.length) } : g));
      setGoals(goalsRef.current);
      react('excited', 900, 'Treasure!!');
      setBoard(t.board);
      boardRef.current = t.board;
      await wait(220);
      cur = gravity(t.board, level.colors, rand, spawnTreasure);
      setBoard(cur);
      boardRef.current = cur;
      await wait(300);
    }
    return cur;
  };

  const cascade = async (start: Board, opts: { swap?: [number, number]; seed?: Partial<Parameters<typeof clearStep>[1]> }) => {
    let b = start;
    let n = 0;
    let first = true;
    let totalSpecials = 0;
    while (n < 30) {
      const res = clearStep(b, { rand, swapCells: first ? opts.swap : undefined, wantColors: wantColors(), cascade: n, ...(first ? opts.seed : {}) });
      first = false;
      if (!res) break;
      applyResult(res);
      showEffects(res.effects, res);
      totalSpecials += res.specialsFired + res.created.length;
      if (res.specialsFired >= 2 || res.effects.some((e) => e.kind === 'cross' || e.kind === 'mega')) react(trick(), 1300, 'Zoomies!!');
      else if (res.created.length) react('excited', 900, res.created[0].piece.special === 'sniffer' ? 'Sniff sniff!' : 'Ooh, shiny!');
      else if (n >= 1) react('happy', 800, CHEERS[n % CHEERS.length]);
      else react('happy', 600);
      if (n === 2) flash('Sweet!');
      if (n === 4) flash('Paw-some!');
      if (n === 6) flash('Un-fur-gettable!');
      setBoard(res.board);
      boardRef.current = res.board;
      await wait(240);
      b = gravity(res.board, level.colors, rand, spawnTreasure);
      setBoard(b);
      boardRef.current = b;
      await wait(300);
      b = await settle(b);
      n++;
    }
    if (totalSpecials >= 4) flash('Best Friends combo!');
    return b;
  };

  const flash = (t: string) => {
    setBanner(t);
    window.setTimeout(() => setBanner((c) => (c === t ? null : c)), 1100);
  };

  const endCheck = async (b: Board, movesLeft: number) => {
    if (allDone()) {
      // turn leftover moves into celebratory zoomies
      let cur = b;
      if (movesLeft > 0) {
        flash('Victory zoomies!');
        react('celebrate', 3000, 'We did it!');
        await wait(500);
        const n = Math.min(movesLeft, 8);
        const slots = cur.cells.map((p, i) => (isMatchable(p) && p.special === 'none' ? i : -1)).filter((i) => i >= 0);
        const conv = slots
          .sort(() => rand() - 0.5)
          .slice(0, n)
          .map((i, k) => ({ idx: i, special: (k % 2 ? 'zrow' : 'zcol') as Special }));
        for (let k = 0; k < conv.length; k++) {
          setMoves((m) => Math.max(0, m - 1));
          await wait(70);
        }
        cur = await cascade(cur, { seed: { convert: conv, seed: conv.map((c) => c.idx) } });
      }
      setState('won');
      react('celebrate', 99999, 'Best day ever!');
      return;
    }
    if (movesLeft <= 0) {
      setState('lost');
      react('sad', 99999);
      return;
    }
    if (!findMove(b)) {
      flash('Shuffle!');
      const sh = shuffleBoard(b, rand);
      setBoard(sh);
      boardRef.current = sh;
    }
  };

  const doSwap = async (a: number, c: number) => {
    if (busy || state !== 'play') return;
    const b = boardRef.current;
    if (!adjacent(a, c) || b.holes[a] || b.holes[c] || !b.cells[a] || !b.cells[c]) return;
    setSel(null);
    setHint(null);
    setBusy(true);
    const swapped = swapCells(b, a, c);
    setBoard(swapped);
    boardRef.current = swapped;
    await wait(170);
    if (!isValidSwap(b, a, c)) {
      setBoard(b);
      boardRef.current = b;
      react('perk', 600);
      await wait(170);
      setBusy(false);
      return;
    }
    const movesLeft = moves - 1;
    setMoves(movesLeft);
    const seed = comboSeed(swapped, a, c, { rand, wantColors: wantColors() });
    const end = await cascade(swapped, { swap: [a, c], seed: seed ?? undefined });
    await endCheck(end, movesLeft);
    setBusy(false);
  };

  const useBoosterAt = async (i: number) => {
    if (!booster || busy) return;
    const b = boardRef.current;
    if (b.holes[i]) return;
    const id = booster;
    setBooster(null);
    actions.useBooster(id);
    setBusy(true);
    const [x, y] = xy(i);
    let seed: number[] = [];
    let eff: Effect[] = [];
    if (id === 'zoomies') {
      seed = Array.from({ length: W }, (_, k) => idx(k, y));
      eff = [{ kind: 'row', at: i }];
    } else if (id === 'bone') {
      for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H) seed.push(idx(xx, yy));
      eff = [{ kind: 'blast', at: i, radius: 1 }];
    } else {
      const col = b.cells[i]?.color ?? 0;
      seed = b.cells.map((p, k) => (isMatchable(p) && p.color === col ? k : -1)).filter((k) => k >= 0);
      eff = [{ kind: 'sniff', at: i, color: col, targets: seed }];
    }
    react(trick(), 1300, 'My turn!');
    const end = await cascade(b, { seed: { seed, seedEffects: eff } });
    await endCheck(end, moves);
    setBusy(false);
  };

  // ---------- input ----------
  const down = useRef<{ i: number; x: number; y: number } | null>(null);
  const cellFromEvent = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / cell);
    const y = Math.floor((e.clientY - r.top) / cell);
    if (x < 0 || y < 0 || x >= W || y >= H) return -1;
    return idx(x, y);
  };
  const onDown = (e: React.PointerEvent) => {
    const i = cellFromEvent(e);
    if (i < 0) return;
    if (booster) {
      useBoosterAt(i);
      return;
    }
    down.current = { i, x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = down.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) < cell * 0.35) return;
    const [x, y] = xy(d.i);
    const tx = Math.abs(dx) > Math.abs(dy) ? x + Math.sign(dx) : x;
    const ty = Math.abs(dx) > Math.abs(dy) ? y : y + Math.sign(dy);
    down.current = null;
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
    doSwap(d.i, idx(tx, ty));
  };
  const onUp = () => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    if (sel === null) setSel(d.i);
    else if (sel === d.i) setSel(null);
    else if (adjacent(sel, d.i)) doSwap(sel, d.i);
    else setSel(d.i);
  };

  // ---------- finishing ----------
  const [claimed, setClaimed] = useState(false);
  const stars = starsFor(moves, totalMoves);
  useEffect(() => {
    if (state === 'won' && !claimed) {
      setClaimed(true);
      const treasure = level.map ? ['lantern', 'mushroom', 'arch', 'picnic', 'birdhouse'][level.num % 5] : level.num % 6 === 0 && !s.puzzle.best[level.id] ? CHAPTER_TREASURE[level.chapter] : undefined;
      window.setTimeout(() => actions.finishPuzzle(level.id, stars, !!level.map, treasure), 1400);
    }
  }, [state, claimed, actions, level, stars, s.puzzle.best]);

  const boardPx = cell * W;
  const tiles = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let i = 0; i < W * H; i++) {
      if (board.holes[i]) continue;
      const [x, y] = xy(i);
      out.push(<div key={i} className="cell-bg" style={{ left: x * cell, top: y * cell, width: cell, height: cell, background: (x + y) % 2 ? chapter.tile[1] : chapter.tile[0] }} />);
    }
    return out;
  }, [board.holes, cell, chapter]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: chapter.sky[0], overflow: 'hidden', zIndex: 50 }}>
      <PieceDefs />
      <ThemeBackdrop chapter={level.chapter} />
      {/* header */}
      <div style={{ padding: 'calc(var(--safe-top) + 12px) 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        <button className="icon-btn" onClick={() => setState('quit')} aria-label="Leave level">
          <Icon name="back" />
        </button>
        <div className="banner" style={{ fontSize: 17, padding: '6px 16px' }}>
          {level.map ? 'Treasure Trail' : `Level ${level.num}`}
        </div>
        <div style={{ width: 42 }} />
      </div>

      {/* dog stage */}
      <div style={{ position: 'relative', height: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2 }}>
        <div style={{ position: 'absolute', left: 12, top: 8, display: 'grid', gap: 6 }}>
          {goals.map((g, k) => (
            <GoalChip key={k} g={g} score={score} />
          ))}
        </div>
        <div style={{ position: 'absolute', right: 12, top: 8, textAlign: 'center', background: '#fff', borderRadius: 20, padding: '6px 14px', boxShadow: '0 5px 0 var(--edge)' }}>
          <div className="tiny">Moves</div>
          <motion.div key={moves} initial={{ scale: 1.4 }} animate={{ scale: 1 }} style={{ fontFamily: 'var(--font-chunk)', fontSize: 34, lineHeight: 1, color: moves <= 3 ? '#e0566e' : 'var(--ink)' }}>
            {moves}
          </motion.div>
        </div>
        <div style={{ position: 'relative', marginBottom: -24 }}>
          <AnimatePresence>
            {bubble && (
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} style={{ position: 'absolute', left: '72%', top: -6, background: '#fff', borderRadius: 14, padding: '4px 10px', fontFamily: 'var(--font-display)', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-sm)', zIndex: 3 }}>
                {bubble}
              </motion.div>
            )}
          </AnimatePresence>
          <Dog look={dog.look} pose={pose} size={118} shadow={false} onClick={() => react(trick(), 1200, `${['Woof!', 'Hi!', 'Again!'][Math.floor(Math.random() * 3)]}`)} />
        </div>
      </div>

      {/* board */}
      <div ref={wrapRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0 10px calc(var(--safe-bottom) + 10px)', position: 'relative', zIndex: 3 }}>
        <div className="board-wrap" style={{ background: chapter.frame, boxShadow: `0 8px 0 color-mix(in srgb, ${chapter.frame} 65%, #000)` }}>
          <div className="board" style={{ width: boardPx, height: boardPx }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
            {tiles}
            {board.dirt.map((d, i) =>
              d > 0 ? (
                <motion.div key={`d${i}`} initial={false} animate={{ opacity: 1 }} style={{ position: 'absolute', left: xy(i)[0] * cell + 2, top: xy(i)[1] * cell + 2, width: cell - 4, height: cell - 4, borderRadius: cell * 0.3 }}>
                  <DirtTile hp={d} chapter={level.chapter} />
                </motion.div>
              ) : null,
            )}
            {sel !== null && <div style={{ position: 'absolute', left: xy(sel)[0] * cell, top: xy(sel)[1] * cell, width: cell, height: cell, borderRadius: 12, background: 'rgba(255,255,255,.65)', boxShadow: '0 0 0 3px #fff inset' }} />}
            <AnimatePresence>
              {board.cells.map((p, i) => {
                if (!p) return null;
                const [x, y] = xy(i);
                const isHint = hint && (hint[0] === i || hint[1] === i);
                return (
                  <motion.div
                    key={p.id}
                    className="piece"
                    style={{ width: cell, height: cell, padding: cell * 0.05, zIndex: p.special !== 'none' ? 2 : 1 }}
                    initial={{ x: x * cell, y: (y - (p.born ?? 0) - 0.5) * cell, scale: 1, opacity: 1 }}
                    animate={{ x: x * cell, y: y * cell, scale: isHint ? [1, 1.12, 1] : sel === i ? 1.1 : 1, opacity: 1 }}
                    exit={{ scale: [1, 1.3, 0], opacity: [1, 1, 0], transition: { duration: 0.24 } }}
                    transition={{ x: { type: 'spring', stiffness: 700, damping: 40 }, y: { type: 'spring', stiffness: 520, damping: 30, mass: 0.8 }, scale: isHint ? { duration: 0.8, repeat: Infinity } : { duration: 0.15 } }}
                  >
                    <Piece color={p.color} special={p.special} treasure={p.treasure} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <FxLayer fx={fx} cell={cell} size={boardPx} />
          </div>
          <AnimatePresence>
            {banner && (
              <motion.div initial={{ scale: 0.3, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} exit={{ scale: 1.4, opacity: 0 }} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 5 }}>
                <span style={{ fontFamily: 'var(--font-chunk)', fontSize: 44, color: '#fff', WebkitTextStroke: '2px #2d2a32', textShadow: '0 5px 0 #2d2a32' }}>{banner}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      {/* booster bar */}
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'center', gap: 14, position: 'relative', zIndex: 3 }}>
        {(['zoomies', 'bone', 'sniffer'] as BoosterId[]).map((b) => {
          const n = s.puzzle.boosters[b];
          const on = booster === b;
          return (
            <motion.button
              key={b}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (busy) return;
                if (n <= 0) {
                  if (s.coins >= 60) actions.buyBooster(b);
                  return;
                }
                setBooster(on ? null : b);
              }}
              style={{ position: 'relative', width: 62, height: 62, borderRadius: '50%', display: 'grid', placeItems: 'center', background: on ? '#fff3c4' : 'rgba(255,255,255,.9)', boxShadow: on ? '0 0 0 4px #f7b928, 0 5px 0 var(--edge)' : '0 5px 0 var(--edge)' }}
              aria-label={b}
            >
              <BoosterIcon id={b} size={40} />
              <span style={{ position: 'absolute', right: -2, bottom: -2, minWidth: 24, height: 24, borderRadius: 12, background: n ? '#8f78e0' : '#f5b53d', color: '#fff', fontWeight: 900, fontSize: 12, display: 'grid', placeItems: 'center', border: '2px solid #fff', padding: '0 4px' }}>{n ? n : <Coin size={14} />}</span>
            </motion.button>
          );
        })}
      </div>
      </div>

      {booster && (
        <div style={{ position: 'absolute', bottom: 'calc(var(--safe-bottom) + 12px)', left: 0, right: 0, textAlign: 'center', zIndex: 6 }}>
          <span className="chip">Tap a piece to use {booster === 'zoomies' ? 'Zoomies (clears a row)' : booster === 'bone' ? 'Golden Bone (3×3 blast)' : 'Super Sniffer (clears a colour)'}</span>
        </div>
      )}

      {/* end screens */}
      <AnimatePresence>
        {state !== 'play' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(40,26,70,.55)', display: 'grid', placeItems: 'center', zIndex: 20, padding: 20 }}>
            {state === 'won' && <Confetti n={40} />}
            <motion.div className="card" initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} style={{ width: '100%', maxWidth: 340, padding: 22, textAlign: 'center', background: '#f8ecd6' }}>
              {state === 'won' && (
                <>
                  <h2 style={{ fontSize: 30 }}>{level.map ? 'Treasure found!' : 'Level complete!'}</h2>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 4, margin: '10px 0' }}>
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.2, type: 'spring' }}>
                        <Star size={i === 1 ? 60 : 46} dim={i >= stars} />
                      </motion.span>
                    ))}
                  </div>
                  <Dog look={dog.look} pose="celebrate" size={110} />
                  <p className="muted" style={{ fontWeight: 700, marginTop: 6 }}>
                    Score {score.toLocaleString('en-GB')} · {dog.name} is so proud of you!
                  </p>
                  <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                    <button className="btn full" onClick={() => onExit(true)}>
                      Continue
                    </button>
                  </div>
                </>
              )}
              {state === 'lost' && (
                <>
                  <h2 style={{ fontSize: 28 }}>So close!</h2>
                  <Dog look={dog.look} pose="sad" size={110} />
                  <p className="muted" style={{ fontWeight: 700, margin: '6px 0 12px' }}>
                    {dog.name} thinks you were brilliant anyway. Try again — there’s no limit and no penalty.
                  </p>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {!extraUsed && (
                      <button
                        className="btn gold full"
                        disabled={s.coins < 80}
                        onClick={() => {
                          actions.spend(80);
                          setExtraUsed(true);
                          setMoves(5);
                          setState('play');
                          react('excited', 900, 'More!');
                        }}
                      >
                        +5 moves · <Coin size={20} /> 80
                      </button>
                    )}
                    <button className="btn full" onClick={() => onExit(false)}>
                      Try again
                    </button>
                  </div>
                </>
              )}
              {state === 'quit' && (
                <>
                  <h2 style={{ fontSize: 24 }}>Leave this puzzle?</h2>
                  <p className="muted" style={{ fontWeight: 700, margin: '8px 0 14px' }}>
                    No worries — you can come back any time. Nothing is lost.
                  </p>
                  <div className="grid2">
                    <button className="btn cream" onClick={() => onExit(false)}>
                      Leave
                    </button>
                    <button className="btn" onClick={() => setState('play')}>
                      Keep playing
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalChip({ g, score }: { g: Goal; score: number }) {
  const done = g.kind === 'score' ? score >= g.n : g.n <= 0;
  let icon: React.ReactNode;
  let label: string;
  if (g.kind === 'collect') {
    icon = (
      <div style={{ width: 28, height: 28 }}>
        <Piece color={g.color} special="none" />
      </div>
    );
    label = String(g.n);
  } else if (g.kind === 'dirt') {
    icon = (
      <div style={{ width: 26, height: 26, borderRadius: 8, overflow: 'hidden' }}>
        <DirtTile hp={1} chapter={0} />
      </div>
    );
    label = String(g.n);
  } else if (g.kind === 'treasure') {
    icon = (
      <div style={{ width: 28, height: 28 }}>
        <Piece color={-1} special="none" treasure />
      </div>
    );
    label = String(g.n);
  } else {
    icon = <Star size={24} />;
    label = `${Math.min(score, g.n).toLocaleString('en-GB')}/${(g.n / 1000).toFixed(0)}k`;
  }
  return (
    <motion.div className={`goal-chip ${done ? 'done' : ''}`} animate={{ scale: done ? [1, 1.15, 1] : 1 }} key={label}>
      {icon}
      {done ? <span style={{ color: '#3f9a48', display: 'grid' }}><Icon name="check" size={18} /></span> : label}
    </motion.div>
  );
}

function DirtTile({ hp, chapter }: { hp: number; chapter: number }) {
  const pal = [
    ['#b98a5e', '#8f6440'],
    ['#9c7a4a', '#6f5530'],
    ['#f2b7cc', '#d987a6'],
    ['#ecd39c', '#cfae6a'],
    ['#ffffff', '#cfdaf0'],
  ][chapter];
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%">
      <rect x="1" y="1" width="38" height="38" rx="11" fill={hp > 1 ? pal[1] : pal[0]} />
      <rect x="1" y="1" width="38" height="38" rx="11" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="2" />
      <circle cx="12" cy="13" r="2.6" fill="#fff" opacity=".35" />
      <circle cx="27" cy="26" r="2" fill="#000" opacity=".12" />
      <circle cx="16" cy="29" r="1.6" fill="#000" opacity=".12" />
      {hp > 1 && <path d="M8 20 Q20 14 32 20" stroke="#fff" strokeOpacity=".4" strokeWidth="2" fill="none" />}
    </svg>
  );
}

function FxLayer({ fx, cell, size }: { fx: Fx[]; cell: number; size: number }) {
  return (
    <div className="fx-layer">
      {fx.map((f) => {
        switch (f.kind) {
          case 'burst':
            return (
              <div key={f.id} style={{ position: 'absolute', left: f.x, top: f.y }}>
                {Array.from({ length: 6 }, (_, k) => {
                  const a = (k / 6) * Math.PI * 2 + f.id;
                  return (
                    <motion.span
                      key={k}
                      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                      animate={{ x: Math.cos(a) * cell * 0.9, y: Math.sin(a) * cell * 0.9, scale: 0, opacity: 0 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      style={{ position: 'absolute', width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: k % 2 ? '50%' : 3, background: f.color, boxShadow: '0 0 6px rgba(255,255,255,.8)' }}
                    />
                  );
                })}
                <motion.span initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.4 }} style={{ position: 'absolute', width: cell, height: cell, marginLeft: -cell / 2, marginTop: -cell / 2, borderRadius: '50%', border: `3px solid ${f.color}` }} />
              </div>
            );
          case 'row':
          case 'col':
          case 'cross':
            return (
              <div key={f.id}>
                {(f.kind === 'row' || f.kind === 'cross') &&
                  Array.from({ length: f.kind === 'cross' && f.r ? 3 : 1 }, (_, k) => (
                    <motion.div key={`r${k}`} initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: 1, opacity: [1, 1, 0] }} transition={{ duration: 0.55 }} style={{ position: 'absolute', left: 0, width: size, top: f.y - cell * 0.32 + (k - (f.r ? 1 : 0)) * cell, height: cell * 0.64, background: 'linear-gradient(180deg, transparent, #fff8c4 30%, #fff 50%, #fff8c4 70%, transparent)', transformOrigin: `${f.x}px 50%` }} />
                  ))}
                {(f.kind === 'col' || f.kind === 'cross') &&
                  Array.from({ length: f.kind === 'cross' && f.r ? 3 : 1 }, (_, k) => (
                    <motion.div key={`c${k}`} initial={{ scaleY: 0, opacity: 1 }} animate={{ scaleY: 1, opacity: [1, 1, 0] }} transition={{ duration: 0.55 }} style={{ position: 'absolute', top: 0, height: size, left: f.x - cell * 0.32 + (k - (f.r ? 1 : 0)) * cell, width: cell * 0.64, background: 'linear-gradient(90deg, transparent, #fff8c4 30%, #fff 50%, #fff8c4 70%, transparent)', transformOrigin: `50% ${f.y}px` }} />
                  ))}
              </div>
            );
          case 'blast':
          case 'mega':
            return (
              <motion.div
                key={f.id}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 1, opacity: [1, 0.9, 0] }}
                transition={{ duration: 0.6 }}
                style={{ position: 'absolute', left: f.x, top: f.y, width: (f.kind === 'mega' ? 12 : (f.r ?? 2) * 2 + 1.6) * cell, height: (f.kind === 'mega' ? 12 : (f.r ?? 2) * 2 + 1.6) * cell, marginLeft: (-(f.kind === 'mega' ? 12 : (f.r ?? 2) * 2 + 1.6) * cell) / 2, marginTop: (-(f.kind === 'mega' ? 12 : (f.r ?? 2) * 2 + 1.6) * cell) / 2, borderRadius: '50%', background: 'radial-gradient(circle, #fff 0%, #fff3a6 30%, rgba(255,190,80,.6) 55%, transparent 70%)' }}
              />
            );
          case 'beam':
            return (
              <svg key={f.id} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} width={size} height={size}>
                <motion.line x1={f.x} y1={f.y} x2={f.x2} y2={f.y2} stroke={f.color} strokeWidth="5" strokeLinecap="round" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: [1, 1, 0] }} transition={{ duration: 0.5 }} />
                <motion.line x1={f.x} y1={f.y} x2={f.x2} y2={f.y2} stroke="#fff" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1, opacity: [1, 0] }} transition={{ duration: 0.5 }} />
              </svg>
            );
          case 'paw':
            return (
              <motion.div key={f.id} initial={{ x: f.x - cell / 2, y: f.y - cell / 2, scale: 1, rotate: 0 }} animate={{ x: f.x2! - cell / 2, y: f.y2! - cell / 2, scale: [1, 1.6, 1], rotate: 360 }} transition={{ duration: 0.55, ease: 'easeInOut' }} style={{ position: 'absolute', width: cell, height: cell }}>
                <Piece color={2} special="paw" />
              </motion.div>
            );
          case 'score':
            return (
              <motion.div key={f.id} initial={{ x: f.x, y: f.y, opacity: 0, scale: 0.6 }} animate={{ y: f.y - cell * 1.2, opacity: [0, 1, 1, 0], scale: 1 }} transition={{ duration: 0.9 }} style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%,-50%)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#fff', WebkitTextStroke: '1.2px #8f5bd8', whiteSpace: 'nowrap', marginLeft: -24 }}>
                {f.text}
              </motion.div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function ThemeBackdrop({ chapter }: { chapter: number }) {
  // soft layered scenery per territory
  const hills = [
    ['#bfe3a0', '#9fd27e'],
    ['#7fb57a', '#5f9a5a'],
    ['#f7bcd2', '#e99ab8'],
    ['#9fd3f2', '#6fb7e3'],
    ['#e9eef9', '#cfd9ef'],
  ][chapter];
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', left: 0, right: 0, top: 40, height: 240, width: '100%', opacity: 0.9 }}>
      <path d="M0 220 Q80 150 160 200 Q240 120 320 190 Q370 160 400 180 L400 300 L0 300Z" fill={hills[0]} />
      <path d="M0 250 Q100 200 200 240 Q300 200 400 230 L400 300 L0 300Z" fill={hills[1]} />
      {chapter === 4 &&
        [60, 300].map((x) => (
          <g key={x}>
            <path d={`M${x - 60} 220 L${x} 110 L${x + 60} 220Z`} fill="#dfe6f5" />
            <path d={`M${x - 20} 147 L${x} 110 L${x + 20} 147 L${x + 8} 140 L${x} 150 L${x - 8} 140Z`} fill="#fff" />
          </g>
        ))}
      {chapter === 3 && <path d="M0 260 Q100 250 200 262 Q300 274 400 260 L400 300 L0 300Z" fill="#5aaee8" opacity=".6" />}
      {(chapter === 1 || chapter === 0) &&
        [40, 120, 300, 360].map((x, i) => (
          <g key={x} transform={`translate(${x} ${200 + (i % 2) * 20})`}>
            <rect x="-3" y="-10" width="6" height="12" fill="#7a5233" />
            <circle cy="-22" r="16" fill={chapter === 1 ? '#4f8a47' : '#8cc77a'} />
          </g>
        ))}
      {chapter === 2 &&
        [50, 340].map((x) => (
          <g key={x} transform={`translate(${x} 210)`}>
            <rect x="-4" y="-16" width="8" height="18" fill="#8a5d3b" />
            <circle cy="-30" r="22" fill="#f59cc2" />
            <circle cx="-14" cy="-22" r="14" fill="#ffc2dc" />
          </g>
        ))}
    </svg>
  );
}

