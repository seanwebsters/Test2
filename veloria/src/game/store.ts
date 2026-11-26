import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Board, bumpUid, drop, nearestEmpty, firstEmpty, starterBoard, take, uid, idx } from './board';
import { GeneratorId, ItemKey, key, parse, rollGenerator, sellValue, itemName } from './items';
import { QUESTS, questForStep, RestoreId } from './quests';
import { GIFT_LINES, IDLE_LINES, INSPECT, LetterId, Line, MEMORIES, SCRIPTS, ScriptId, STEP, TIERS } from './story';
import { GLIMMERS, GLIMMER_RESPAWN_MS, PLACES, V2 } from './layout';
import { sfx } from './audio';

export const MAX_ENERGY = 100;
export const ENERGY_MS = 20_000;
export const SATCHEL_SIZE = 10;
export const GIFTS_PER_DAY = 4;

export type Tab = 'explore' | 'merge' | 'story' | 'love' | 'satchel';
export type Focus = 'square' | 'garden' | 'bookshop' | 'tower' | 'tree' | 'alone' | null;

interface Toast {
  id: number;
  text: string;
  item?: ItemKey;
  heart?: boolean;
}

interface Dialogue {
  id: ScriptId | 'inspect' | 'gift';
  lines: Line[];
  i: number;
}

interface BookState {
  open: boolean;
  view: 'chapters' | 'chapter' | 'letters' | 'letter' | 'end';
  chapter: number;
  page: number;
  letter?: LetterId;
}

interface Saved {
  step: number;
  board: Board;
  energy: number;
  energyAt: number;
  dew: number;
  satchel: (ItemKey | null)[];
  affection: number;
  gifts: { day: string; n: number };
  restored: Partial<Record<RestoreId, number>>;
  letters: LetterId[];
  lettersRead: LetterId[];
  inspected: string[];
  memories: ScriptId[];
  knowName: boolean;
  player: V2;
  glimmers: Record<string, number>;
  mergeTutorial: boolean;
  muted: boolean;
  delivered: string[];
}

interface Live {
  screen: 'title' | 'game';
  tab: Tab;
  dialogue: Dialogue | null;
  focus: Focus;
  vanish: number; // 0 visible .. 1 gone
  book: BookState;
  toasts: Toast[];
  fade: number; // full-screen white fade target 0..1
  selected: number | null;
  /** player is told to walk somewhere: set by the world on tap */
  walkTo: V2 | null;
  hint: string | null;
  near: string | null;
  himSaid: string | null;
}

interface Actions {
  begin(): void;
  closeBook(): void;
  openBook(view?: BookState['view'], chapter?: number): void;
  setBook(b: Partial<BookState>): void;
  setTab(t: Tab): void;
  play(id: ScriptId): void;
  say(lines: Line[], id?: Dialogue['id']): void;
  next(): void;
  choose(i: number): void;
  inspect(id: string): void;
  tapGenerator(i: number): boolean;
  dropCell(from: number, to: number): void;
  sell(i: number): void;
  store(i: number): void;
  unstore(slot: number): void;
  gift(i: number): void;
  deliver(questId: string): void;
  collectGlimmer(id: string): void;
  tickEnergy(): void;
  buyEnergy(): void;
  toast(t: Omit<Toast, 'id'>): void;
  setSelected(i: number | null): void;
  setWalkTo(p: V2 | null): void;
  setNear(id: string | null): void;
  setPlayer(p: V2): void;
  readLetter(id: LetterId): void;
  sleepAgain(): void;
  playMemory(id: ScriptId): void;
  toggleMute(): void;
  finishMergeTutorial(): void;
  talkToHim(): void;
  resetSave(): void;
}

export type State = Saved & Live & Actions;

function fresh(): Saved {
  return {
    step: STEP.title,
    board: starterBoard(),
    energy: MAX_ENERGY,
    energyAt: Date.now(),
    dew: 40,
    satchel: new Array(SATCHEL_SIZE).fill(null),
    affection: 0,
    gifts: { day: '', n: 0 },
    restored: {},
    letters: [],
    lettersRead: [],
    inspected: [],
    memories: [],
    knowName: false,
    player: [...PLACES.wake] as V2,
    glimmers: {},
    mergeTutorial: false,
    muted: false,
    delivered: [],
  };
}

let toastId = 1;
const today = () => new Date().toISOString().slice(0, 10);

export function timeLevel(restored: Saved['restored']): number {
  return (['clock', 'fountain', 'garden', 'bookshop', 'bell'] as RestoreId[]).filter((r) => restored[r]).length;
}

export function tierOf(aff: number) {
  let t = TIERS[0];
  let i = 0;
  TIERS.forEach((x, j) => {
    if (aff >= x.at) {
      t = x;
      i = j;
    }
  });
  const nextAt = TIERS[i + 1]?.at ?? 100;
  return { ...t, index: i, nextAt, progress: Math.min(1, (aff - t.at) / Math.max(1, nextAt - t.at)) };
}

export const useGame = create<State>()(
  persist(
    (set, get) => {
      /** after a script ends */
      const onEnd = (id: Dialogue['id']) => {
        const s = get();
        switch (id) {
          case 'wake':
            set({ step: STEP.explore, hint: 'Wander the silent streets. Someone is waiting at the clock tower.' });
            break;
          case 'meet':
            set({ step: STEP.q1, hint: null, focus: null });
            break;
          case 'q1_done':
            set({ step: STEP.q2, focus: null });
            break;
          case 'q2_done':
            set({ step: STEP.q3, focus: null });
            break;
          case 'q3_done':
            set({ step: STEP.ending1 });
            setTimeout(() => get().play('ending1'), 600);
            break;
          case 'wake2':
            set({ step: STEP.q4, focus: null });
            break;
          case 'q4_done':
            set({ step: STEP.q5, focus: null });
            break;
          case 'mem_boats':
          case 'mem_ledge':
            if (!s.memories.includes(id)) set({ memories: [...s.memories, id] });
            set({ focus: null });
            break;
          default:
            set({ focus: null });
        }
      };

      const runAction = (a: string) => {
        const s = get();
        if (a === 'clockStart') {
          set({ restored: { ...s.restored, clock: Date.now() }, focus: 'tower' });
          sfx('restore');
          setTimeout(() => get().focus === 'tower' && set({ focus: null }), 5200);
        } else if (a === 'follow') {
          set({ focus: null });
        } else if (a === 'knowName') {
          set({ knowName: true });
        } else if (a.startsWith('letter:')) {
          const id = a.slice(7) as LetterId;
          if (!s.letters.includes(id)) {
            set({ letters: [...s.letters, id] });
            get().toast({ text: 'A letter has been added to your book' });
            sfx('letter');
          }
        } else if (a === 'vanish') {
          set({ vanish: 1 });
          sfx('vanish');
        } else if (a === 'aloneShot') {
          set({ focus: 'alone', fade: 0 });
        } else if (a === 'endChapter1') {
          setTimeout(() => {
            set({ fade: 1 });
            setTimeout(() => {
              set({ step: STEP.ch1End, focus: null, book: { open: true, view: 'end', chapter: 0, page: 0 } });
              set({ fade: 0 });
            }, 1400);
          }, 900);
        } else if (a === 'endChapter2') {
          setTimeout(() => {
            set({ step: STEP.ch2End, focus: null, book: { open: true, view: 'end', chapter: 1, page: 0 } });
          }, 1200);
        }
      };

      return {
        ...fresh(),
        screen: 'title',
        tab: 'explore',
        dialogue: null,
        focus: null,
        vanish: 0,
        book: { open: false, view: 'chapters', chapter: 0, page: 0 },
        toasts: [],
        fade: 0,
        selected: null,
        walkTo: null,
        hint: null,
        near: null,
        himSaid: null,

        begin() {
          const s = get();
          set({ screen: 'game', tab: 'explore' });
          if (s.step === STEP.title) {
            set({ step: STEP.prologue, book: { open: true, view: 'chapter', chapter: 0, page: 0 } });
          } else if (s.step === STEP.wake) {
            get().play('wake');
          } else if (s.step === STEP.ending1) {
            get().play('ending1');
          } else if (s.step === STEP.ch1End) {
            set({ book: { open: true, view: 'end', chapter: 0, page: 0 } });
          } else if (s.step === STEP.explore) {
            set({ hint: 'Wander the silent streets. Someone is waiting at the clock tower.' });
          } else if (s.step === STEP.wake2) {
            set({ focus: 'tree' });
            setTimeout(() => get().play('wake2'), 1200);
          } else {
            // a delivered order whose scene was interrupted by closing the game
            const q = questForStep(s.step);
            if (q && s.delivered.includes(q.id)) setTimeout(() => get().play(q.after), 1000);
          }
        },

        openBook(view = 'chapters', chapter = 0) {
          sfx('page');
          set({ book: { open: true, view, chapter, page: 0 } });
        },
        setBook(b) {
          set({ book: { ...get().book, ...b } });
        },
        closeBook() {
          const s = get();
          set({ book: { ...s.book, open: false } });
          if (s.step === STEP.prologue) {
            set({ step: STEP.wake, player: [...PLACES.wake] as V2, fade: 1 });
            setTimeout(() => set({ fade: 0 }), 300);
            setTimeout(() => get().play('wake'), 1800);
          }
        },

        setTab(t) {
          if (get().dialogue) return;
          sfx('tab');
          if (t === 'story') {
            get().openBook('chapters');
            return;
          }
          set({ tab: t, selected: null });
        },

        play(id) {
          get().say(SCRIPTS[id], id);
        },
        say(lines, id = 'inspect') {
          set({ dialogue: { id, lines: lines.slice(), i: 0 }, tab: 'explore' });
          const first = lines[0];
          if (first?.action) runAction(first.action);
          sfx('blip');
        },
        next() {
          const d = get().dialogue;
          if (!d) return;
          const cur = d.lines[d.i];
          if (cur?.choices) return;
          const i = d.i + 1;
          if (i >= d.lines.length) {
            set({ dialogue: null });
            onEnd(d.id);
            return;
          }
          set({ dialogue: { ...d, i } });
          const ln = d.lines[i];
          if (ln.action) runAction(ln.action);
          sfx('blip');
        },
        choose(ci) {
          const d = get().dialogue;
          if (!d) return;
          const cur = d.lines[d.i];
          const c = cur?.choices?.[ci];
          if (!c) return;
          const lines = d.lines.slice();
          lines.splice(d.i, 1, { who: 'you', text: c.text }, ...(c.reply ?? []));
          if (c.aff) {
            set({ affection: Math.min(100, get().affection + c.aff) });
            if (c.tone === 'heart') sfx('heart');
            get().toast({ text: c.aff >= 3 ? 'He will remember that.' : 'He noticed.', heart: true });
          }
          sfx('choose');
          set({ dialogue: { ...d, lines } });
          // jump past "your" spoken line straight to his reply
          setTimeout(() => {
            const dd = get().dialogue;
            if (dd && dd.lines === lines) get().next();
          }, 650);
        },

        inspect(id) {
          const s = get();
          const lvl = timeLevel(s.restored);
          let text = INSPECT[id];
          if (id === 'fountain' && s.restored.fountain) text = INSPECT.fountain_alive;
          if (id === 'garden' && s.restored.garden) text = INSPECT.garden_alive;
          if (id === 'bookshop' && s.restored.bookshop) text = INSPECT.bookshop_alive;
          if (id === 'bird' && lvl >= 3) text = 'The sparrow is gone. Somewhere above the rooftops, it is very busy being a sparrow.';
          if (id === 'canal' && lvl >= 1) text = 'The paper boat has begun, very slowly, to drift towards the bridge.';
          if (id === 'lamp' && lvl >= 2) text = 'The flame dances now, warm and a little vain about it.';
          if (id === 'tree' && s.letters.includes('roots')) text = 'The blossom tree. You could swear it leans, very slightly, towards the city.';
          const lines: Line[] = [{ who: 'narr', text }];
          if (id === 'tree' && !s.letters.includes('roots')) lines[0].action = 'letter:roots';
          if (!s.inspected.includes(id)) set({ inspected: [...s.inspected, id] });
          get().say(lines, 'inspect');
        },

        tapGenerator(i) {
          const s = get();
          const c = s.board[i];
          if (!c || c.kind !== 'gen' || c.frozen) return false;
          get().tickEnergy();
          if (get().energy < 1) {
            get().toast({ text: 'Out of energy. Rest a moment, or gather lights in the city.' });
            sfx('deny');
            return false;
          }
          const to = nearestEmpty(s.board, i);
          if (to < 0) {
            get().toast({ text: 'The board is full. Merge, sell or store something.' });
            sfx('deny');
            return false;
          }
          const item = rollGenerator(c.gen as GeneratorId, Math.random(), Math.random());
          const board = s.board.slice();
          board[to] = { kind: 'item', item, uid: uid() };
          set({ board, energy: get().energy - 1 });
          sfx('spawn');
          return true;
        },

        dropCell(from, to) {
          const s = get();
          const { board, res } = drop(s.board, from, to);
          if (res.type === 'none') return;
          set({ board, selected: to });
          if (res.type === 'merge') {
            sfx('merge', parse(res.result).level);
            if (res.thawed.length) setTimeout(() => sfx('thaw'), 180);
          } else sfx('place');
        },

        sell(i) {
          const s = get();
          const c = s.board[i];
          if (!c || c.kind !== 'item' || c.frozen) return;
          const board = s.board.slice();
          board[i] = null;
          set({ board, dew: s.dew + sellValue(c.item), selected: null });
          sfx('coin');
        },

        store(i) {
          const s = get();
          const c = s.board[i];
          if (!c || c.kind !== 'item' || c.frozen) return;
          const slot = s.satchel.findIndex((x) => !x);
          if (slot < 0) {
            get().toast({ text: 'Your satchel is full.' });
            return;
          }
          const board = s.board.slice();
          board[i] = null;
          const satchel = s.satchel.slice();
          satchel[slot] = c.item;
          set({ board, satchel, selected: null });
          sfx('place');
        },

        unstore(slot) {
          const s = get();
          const it = s.satchel[slot];
          if (!it) return;
          const to = firstEmpty(s.board);
          if (to < 0) {
            get().toast({ text: 'The board is full.' });
            return;
          }
          const board = s.board.slice();
          board[to] = { kind: 'item', item: it, uid: uid() };
          const satchel = s.satchel.slice();
          satchel[slot] = null;
          set({ board, satchel });
          sfx('spawn');
        },

        gift(i) {
          const s = get();
          const c = s.board[i];
          if (!c || c.kind !== 'item' || c.frozen) return;
          if (s.step < STEP.q1) return;
          const g = s.gifts.day === today() ? s.gifts : { day: today(), n: 0 };
          if (g.n >= GIFTS_PER_DAY) {
            get().toast({ text: 'He has had enough presents for one night. He insists.' });
            return;
          }
          const { chain, level } = parse(c.item);
          const mult = chain === 'ink' ? 2 : chain === 'bloom' ? 1.5 : 1;
          const gain = Math.max(1, Math.round(level * mult));
          const board = s.board.slice();
          board[i] = null;
          set({ board, affection: Math.min(100, s.affection + gain), gifts: { day: g.day, n: g.n + 1 }, selected: null });
          const lines = GIFT_LINES[chain];
          set({ himSaid: lines[Math.floor(Math.random() * lines.length)] });
          get().toast({ text: `You gave him a ${itemName(c.item)}  ·  +${gain} affection`, heart: true });
          sfx('heart');
        },

        deliver(qid) {
          const s = get();
          const q = QUESTS.find((x) => x.id === qid);
          if (!q || questForStep(s.step)?.id !== qid) return;
          const board = take(s.board, q.requires);
          if (!board) return;
          const restored = { ...s.restored };
          if (q.restores) restored[q.restores] = Date.now() + 1600;
          set({
            board,
            dew: s.dew + q.reward.dew,
            energy: Math.min(MAX_ENERGY + 50, s.energy + q.reward.energy),
            delivered: [...s.delivered, qid],
            tab: 'explore',
            focus: q.place,
            restored,
            selected: null,
          });
          sfx('quest');
          if (q.restores) setTimeout(() => sfx('restore'), 1500);
          get().toast({ text: `${q.title} — complete` });
          if (q.id === 'q4') {
            // the writing desk wakes with the bookshop, if it has not already
            const b = get().board.map((c) => (c && c.kind === 'gen' && c.gen === 'desk' ? { ...c, frozen: false } : c));
            set({ board: b });
          }
          setTimeout(() => get().play(q.after), q.restores ? 4200 : 900);
        },

        collectGlimmer(id) {
          const s = get();
          if ((s.glimmers[id] ?? 0) > Date.now()) return;
          const g = GLIMMERS.find((x) => x.id === id);
          if (!g) return;
          const level = Math.random() < 0.25 ? 2 : 1;
          const item = key(g.chain, level);
          const to = firstEmpty(s.board);
          const board = s.board.slice();
          if (to >= 0) board[to] = { kind: 'item', item, uid: uid() };
          set({
            board,
            energy: Math.min(MAX_ENERGY + 50, s.energy + 3),
            glimmers: { ...s.glimmers, [id]: Date.now() + GLIMMER_RESPAWN_MS },
          });
          get().toast({ text: to >= 0 ? `${itemName(item)}  ·  +3 energy` : 'Board full — the light slips away.', item });
          sfx('collect');
        },

        tickEnergy() {
          const s = get();
          const now = Date.now();
          if (s.energy >= MAX_ENERGY) {
            if (now - s.energyAt > ENERGY_MS) set({ energyAt: now });
            return;
          }
          const n = Math.floor((now - s.energyAt) / ENERGY_MS);
          if (n > 0) set({ energy: Math.min(MAX_ENERGY, s.energy + n), energyAt: s.energyAt + n * ENERGY_MS });
        },

        buyEnergy() {
          const s = get();
          if (s.dew < 25) {
            get().toast({ text: 'You need 25 dewdrops. Sell items you no longer need.' });
            sfx('deny');
            return;
          }
          set({ dew: s.dew - 25, energy: s.energy + 40 });
          sfx('collect');
        },

        toast(t) {
          const id = toastId++;
          set({ toasts: [...get().toasts, { ...t, id }].slice(-3) });
          setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== id) }), 2800);
        },
        setSelected(i) {
          set({ selected: i });
        },
        setWalkTo(p) {
          set({ walkTo: p });
        },
        setNear(id) {
          if (get().near !== id) set({ near: id });
        },
        setPlayer(p) {
          set({ player: p });
        },
        readLetter(id) {
          const s = get();
          sfx('page');
          set({ book: { ...s.book, open: true, view: 'letter', letter: id } });
          if (!s.lettersRead.includes(id)) set({ lettersRead: [...s.lettersRead, id] });
        },
        sleepAgain() {
          const s = get();
          if (s.step !== STEP.ch1End) return;
          set({ book: { ...s.book, open: false }, fade: 1, vanish: 0 });
          setTimeout(() => {
            const board = get().board.map((c) => (c && c.kind === 'gen' && c.gen === 'desk' ? { ...c, frozen: false } : c));
            set({ step: STEP.wake2, player: [...PLACES.wake] as V2, board, focus: 'tree', energy: Math.max(get().energy, 60) });
            setTimeout(() => set({ fade: 0 }), 500);
            setTimeout(() => get().play('wake2'), 2200);
          }, 1300);
        },
        playMemory(id) {
          const m = MEMORIES.find((x) => x.id === id);
          if (!m || get().affection < m.at) return;
          set({ tab: 'explore' });
          get().play(id);
        },
        toggleMute() {
          set({ muted: !get().muted });
        },
        finishMergeTutorial() {
          set({ mergeTutorial: true });
        },
        talkToHim() {
          const s = get();
          if (s.step === STEP.explore) {
            get().play('meet');
            return;
          }
          if (s.himSaid) {
            const said = s.himSaid;
            set({ himSaid: null });
            get().say([{ who: 'him', text: said }], 'gift');
            return;
          }
          const line = IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)];
          const base = s.step <= STEP.q3 ? SCRIPTS.idle_ch1 : s.step < STEP.ch2End ? SCRIPTS.idle_ch2 : SCRIPTS.idle_free;
          get().say(Math.random() < 0.5 ? base : [{ who: 'him', text: line }], 'gift');
        },
        resetSave() {
          try {
            localStorage.removeItem('veloria-save-v1');
          } catch {
            // storage unavailable: nothing saved to forget
          }
          location.reload();
        },
      };
    },
    {
      name: 'veloria-save-v1',
      version: 1,
      partialize: (s) => {
        const out: Partial<Saved> = {};
        (Object.keys(fresh()) as (keyof Saved)[]).forEach((k) => ((out as Record<string, unknown>)[k] = s[k]));
        return out as Saved;
      },
      onRehydrateStorage: () => (s) => {
        if (s) {
          bumpUid(s.board);
          // resume mid-script safely: restart the step's opening state
          if (s.step === STEP.prologue) s.step = STEP.title;
        }
      },
    },
  ),
);

/** fraction of required quest items present on the board */
export function questReady(board: Board, requires: ItemKey[]): boolean[] {
  const pool = board.slice();
  return requires.map((it) => {
    const i = pool.findIndex((c) => c && c.kind === 'item' && !c.frozen && c.item === it);
    if (i < 0) return false;
    pool[i] = null;
    return true;
  });
}

export { idx };
