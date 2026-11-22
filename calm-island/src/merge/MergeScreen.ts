import { BOARD, type MergeBoard } from './board';
import { CHAINS, COSY, itemName, itemPlural } from './items';

export interface MergeHandlers {
  onClose(): void;
  /** something on the board changed and should be saved */
  onChange(): void;
  onSound(kind: 'tap' | 'merge' | 'win'): void;
  /** a collection was finished for the first time and its reward accepted */
  onReward(chain: number): void;
  /** the player asked to be shown where to find more of a collection */
  onSeek(chain: number): void;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const an = (name: string): string => `${/^[AEIOU]/.test(name) ? 'an' : 'a'} ${name}`;
const buzz = (ms: number | number[]): void => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
};

/** The Merge 3 screen: the board, what the chosen three will make, and the four collections. */
export class MergeScreen {
  private sel: number[] = [];
  private busy = false;
  private cells: HTMLButtonElement[] = [];
  private pendingReward = -1;
  open_ = false;

  constructor(private board: MergeBoard, private icons: string[], private h: MergeHandlers) {
    const grid = $('mg-grid');
    for (let i = 0; i < BOARD; i++) {
      const b = document.createElement('button');
      b.className = 'mg-cell';
      b.addEventListener('click', () => this.tap(i));
      grid.appendChild(b);
      this.cells.push(b);
    }
    $('mg-close').addEventListener('click', () => this.h.onClose());
    $('mg-go').addEventListener('click', () => void this.merge());
    $('mg-seek').addEventListener('click', () => {
      const code = this.sel.length ? this.board.cells[this.sel[0]] : -1;
      if (code >= 0) this.h.onSeek(code >> 2);
    });
    $('mg-reward-go').addEventListener('click', () => {
      $('mg-reward').classList.add('hidden');
      const chain = this.pendingReward;
      this.pendingReward = -1;
      if (chain >= 0) this.h.onReward(chain);
    });
    for (const el of document.querySelectorAll<HTMLImageElement>('.mg-deco')) el.src = this.icons[5] ?? '';
  }

  get isOpen(): boolean {
    return this.open_;
  }

  open(): void {
    this.open_ = true;
    this.sel = [];
    this.board.refill();
    $('merge').classList.remove('hidden');
    $('mg-reward').classList.add('hidden');
    this.render();
    // offer the first ready set straight away, so the next step is always in view
    const ready = this.board.cells.findIndex((c) => c >= 0 && this.board.count(c) >= 3);
    if (ready >= 0) {
      this.sel = this.board.pick(ready);
      this.render();
    }
  }

  close(): void {
    this.open_ = false;
    $('merge').classList.add('hidden');
  }

  private img(code: number): HTMLImageElement {
    const im = new Image();
    im.src = this.icons[code] ?? '';
    im.alt = itemName(code);
    im.draggable = false;
    return im;
  }

  private tap(i: number): void {
    if (this.busy) return;
    const code = this.board.cells[i];
    if (code < 0) {
      this.sel = [];
    } else if (this.sel[0] === i) {
      this.sel = [];
    } else {
      this.sel = this.board.pick(i);
      this.h.onSound('tap');
      buzz(8);
    }
    this.render();
  }

  private render(): void {
    const b = this.board;
    this.cells.forEach((el, i) => {
      const code = b.cells[i];
      el.classList.toggle('sel', this.sel.includes(i) && this.sel.length === 3);
      el.classList.toggle('half', this.sel.includes(i) && this.sel.length < 3);
      el.classList.toggle('full', code >= 0);
      el.setAttribute('aria-label', code >= 0 ? itemName(code) : 'Empty');
      if (el.dataset.code !== String(code)) {
        el.dataset.code = String(code);
        el.replaceChildren(...(code >= 0 ? [this.img(code)] : []));
      }
    });
    const code = this.sel.length ? b.cells[this.sel[0]] : -1;
    const three = $('mg-three');
    const result = $('mg-result');
    const go = $<HTMLButtonElement>('mg-go');
    const seek = $('mg-seek');
    const empty = b.cells.every((c) => c < 0);
    $('mg-preview').classList.toggle('idle', code < 0);
    seek.classList.add('hidden');
    if (code < 0) {
      three.replaceChildren();
      result.replaceChildren();
      go.disabled = true;
      go.textContent = 'Merge!';
      $('mg-lead').textContent = empty ? 'Shells, seeds, acorns and wood are waiting around the island. Collect three of a kind!' : 'Tap an item to choose it and two more like it.';
    } else {
      const have = this.sel.length;
      three.replaceChildren(
        ...[0, 1, 2].map((k) => {
          const s = document.createElement('i');
          if (k < have) s.appendChild(this.img(code));
          else s.className = 'missing';
          return s;
        }),
      );
      result.replaceChildren(this.img(code + 1));
      go.disabled = have < 3;
      go.textContent = 'Merge!';
      if (have < 3) {
        $('mg-lead').textContent = `${3 - have} more ${3 - have === 1 ? itemName(code) : itemPlural(code)} to make ${an(itemName(code + 1))}.`;
        seek.textContent = `Show me where to find ${CHAINS[code >> 2].steps[0]}`;
        seek.classList.remove('hidden');
      } else $('mg-lead').textContent = `Three ${itemPlural(code)} make ${an(itemName(code + 1))}.`;
    }
    // what all this merging is for: the next place to bring back
    const goal = $('mg-goal');
    if (b.done[COSY]) {
      goal.classList.add('done');
      $('mg-goal-text').textContent = 'Campsite restored';
      $('mg-goal-fill').style.width = '100%';
    } else {
      // everything in the Cosy collection, counted in pieces of wood
      const worth = [...b.cells, ...b.bag].reduce((n, c) => n + (c >> 2 === COSY && c >= 0 ? 3 ** (c & 3) : 0), 0);
      goal.classList.remove('done');
      $('mg-goal-text').textContent = 'Restore the campsite';
      $('mg-goal-fill').style.width = `${Math.min(100, Math.round((worth / 27) * 100))}%`;
    }
    $<HTMLImageElement>('mg-goal-img').src = this.icons[COSY * 4 + 3] ?? '';
    $('mg-bag').textContent = b.bag.length ? `+${b.bag.length} waiting for room` : '';
    // the four collections, with what has been discovered so far
    $('mg-chains').replaceChildren(
      ...CHAINS.map((ch, c) => {
        const row = document.createElement('div');
        row.className = `mg-chain${b.done[c] ? ' done' : ''}`;
        row.style.setProperty('--tint', ch.tint);
        for (let t = 0; t < 4; t++) {
          const cell = document.createElement('span');
          const known = b.seen.has(c * 4 + t) || (t === 3 && b.done[c]);
          cell.className = known ? 'known' : 'unknown';
          cell.appendChild(this.img(c * 4 + t));
          row.appendChild(cell);
        }
        return row;
      }),
    );
  }

  private async merge(): Promise<void> {
    if (this.busy || this.sel.length !== 3) return;
    this.busy = true;
    const [target, ...others] = this.sel;
    const to = this.cells[target].getBoundingClientRect();
    // the other two fly into the one that was tapped
    await Promise.all(
      others.map((i) => {
        const el = this.cells[i].firstElementChild as HTMLElement | null;
        if (!el) return Promise.resolve();
        const from = this.cells[i].getBoundingClientRect();
        return el.animate([{ transform: 'none' }, { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(.5)`, opacity: 0.4 }], { duration: 300, easing: 'cubic-bezier(.5,0,.8,.4)' }).finished.catch(() => undefined);
      }),
    );
    const r = this.board.merge(this.sel);
    this.sel = [];
    if (!r) {
      this.busy = false;
      this.render();
      return;
    }
    this.h.onSound(r.finished >= 0 ? 'win' : 'merge');
    buzz(r.finished >= 0 ? [20, 40, 30] : 18);
    this.render();
    this.sparkle(this.cells[target], r.made);
    const cell = this.cells[target];
    if (r.finished >= 0) {
      // the finished piece shows for a moment where it was made, then is carried off
      const im = this.img(r.made);
      im.className = 'mg-final';
      cell.appendChild(im);
      await new Promise((res) => setTimeout(res, 950));
      im.remove();
      cell.dataset.code = '-1';
      if (r.first) this.reward(r.finished);
    } else {
      cell.firstElementChild?.animate([{ transform: 'scale(.3)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    }
    this.h.onChange();
    this.busy = false;
    // carry straight on if the new item completes another set
    const again = this.board.cells[target] >= 0 && this.board.count(this.board.cells[target]) >= 3 ? target : -1;
    if (again >= 0) {
      this.sel = this.board.pick(again);
      this.render();
    }
  }

  private sparkle(cell: HTMLElement, code: number): void {
    const layer = $('mg-fx');
    const host = layer.getBoundingClientRect();
    const r = cell.getBoundingClientRect();
    const cx = r.left + r.width / 2 - host.left;
    const cy = r.top + r.height / 2 - host.top;
    const tint = CHAINS[code >> 2].tint;
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('i');
      s.className = 'mg-spark';
      s.style.left = `${cx}px`;
      s.style.top = `${cy}px`;
      s.style.background = i % 3 ? '#fff6c8' : tint;
      layer.appendChild(s);
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const d = r.width * (0.7 + Math.random() * 0.7);
      s.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 }], { duration: 520 + Math.random() * 260, easing: 'cubic-bezier(.1,.7,.3,1)' }).finished.then(() => s.remove(), () => s.remove());
    }
  }

  private reward(chain: number): void {
    this.pendingReward = chain;
    const camp = chain === COSY;
    $<HTMLImageElement>('mg-reward-img').src = this.icons[chain * 4 + 3] ?? '';
    $('mg-reward-title').textContent = camp ? 'Campsite Restored!' : `${itemName(chain * 4 + 3)}!`;
    $('mg-reward-text').textContent = camp ? "You've unlocked a cosy campsite on Calm Island!" : `The ${CHAINS[chain].name} collection is complete.`;
    $('mg-reward').classList.remove('hidden');
  }
}
