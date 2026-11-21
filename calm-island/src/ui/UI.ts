import type { Quality, Settings } from '../core/Settings';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export interface ChoiceRow {
  id: string;
  name: string;
  note: string;
  /** CSS colour for the swatch */
  color: string;
  /** price in starberries, moon melons, sun pods */
  cost?: number[];
  action: string;
  enabled: boolean;
}

export interface LogEntry {
  name: string;
  meaning: string;
  hello: string;
  hint: string;
  met: boolean;
  companion: boolean;
  portrait: string | null;
  /** friendship, 0–3 hearts */
  hearts: number;
  story: string | null;
  /** the practice they taught you, once completed */
  practice: string | null;
  /** the fruit they love, and whether you have brought them one */
  likes: string;
  gifted: boolean;
}

export interface JournalItem {
  title: string;
  hint: string;
  done: boolean;
}

export interface UIHandlers {
  onSeason(): void;
  onWake(): void;
  onJournal(): void;
  onPhoto(): void;
  onMap(): void;
  onPhotoSave(): void;
  onLog(): void;
  onLogClose(): void;
  onPlay(): void;
  onResume(): void;
  onHome(): void;
  onArrive(): void;
  onEat(kind: number): void;
  onSkipIntro(): void;
  /** the title screen's time-of-day buttons */
  onTitleTime(hour: number): void;
  onReset(): void;
  onSettings(s: Settings): void;
}

/** All DOM: loading, title, pause/settings menu and the in-world HUD. */
export class UI {
  private toastTimer = 0;
  private hintsTimer = 0;
  /** set on phones and tablets: shows the on-screen controls */
  touch = false;
  private fromTitle = false;

  constructor(private settings: Settings, private handlers: UIHandlers) {
    $('play').addEventListener('click', () => handlers.onPlay());
    // the title screen: a short list, walked with the arrow keys
    const items = ['play', 'title-how', 'title-settings', 'title-credits'].map((id) => $(id));
    $('start').addEventListener('keydown', (e) => {
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.code === 'ArrowDown') items[(i + 1) % items.length].focus();
      else if (e.code === 'ArrowUp') items[(i + items.length - 1) % items.length].focus();
      else return;
      e.preventDefault();
    });
    const sub = (open: string, card: string, close: string): void => {
      $(open).addEventListener('click', () => $(card).classList.remove('hidden'));
      $(close).addEventListener('click', () => {
        $(card).classList.add('hidden');
        $(open).focus();
      });
    };
    sub('title-how', 'how', 'how-close');
    sub('title-credits', 'credits', 'credits-close');
    $('title-settings').addEventListener('click', () => {
      this.fromTitle = true;
      $('menu').classList.add('from-title');
      $('menu-stats').textContent = 'These can be changed at any time from the menu.';
      $('menu').classList.remove('hidden');
      $('resume').textContent = 'Back';
    });
    for (const [id, hour] of [['time-dawn', 6.6], ['time-day', 13], ['time-night', 22]] as [string, number][]) $(id).addEventListener('click', () => handlers.onTitleTime(hour));
    $('resume').addEventListener('click', () => {
      if (this.fromTitle) {
        // opened from the title screen: Back returns there instead of starting the game
        this.fromTitle = false;
        $('menu').classList.remove('from-title');
        $('menu').classList.add('hidden');
        $('resume').textContent = 'Keep wandering';
        $('title-settings').focus();
        return;
      }
      handlers.onResume();
    });
    $('open-log').addEventListener('click', () => handlers.onLog());
    $('btn-log').addEventListener('click', () => handlers.onLog());
    $('log-close').addEventListener('click', () => handlers.onLogClose());
    $('map-close').addEventListener('click', () => handlers.onLogClose());
    $('photo-exit').addEventListener('click', () => handlers.onLogClose());
    $('photo-save').addEventListener('click', () => handlers.onPhotoSave());
    $('open-map').addEventListener('click', () => handlers.onMap());
    $('sleep').addEventListener('pointerdown', () => handlers.onWake());
    $('open-journal').addEventListener('click', () => handlers.onJournal());
    $('btn-journal').addEventListener('click', () => handlers.onJournal());
    $('journal-close').addEventListener('click', () => handlers.onLogClose());
    $('btn-photo').addEventListener('click', () => handlers.onPhoto());
    $('btn-map').addEventListener('click', () => handlers.onMap());
    $('home').addEventListener('click', () => handlers.onHome());
    $('arrive').addEventListener('click', () => handlers.onArrive());
    $('skip-tut').addEventListener('click', () => handlers.onSkipIntro());
    $('letter-close').addEventListener('click', () => handlers.onLogClose());
    $('choices-close').addEventListener('click', () => handlers.onLogClose());
    $('next').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.nextHidden = this.nextText;
      $('next').classList.add('hidden');
    });
    for (let i = 0; i < 3; i++) $(`eat${i}`).addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handlers.onEat(i);
    });
    $('reset').addEventListener('click', () => {
      if (confirm('Forget your discoveries and start again in the garden?')) handlers.onReset();
    });
    const q = $<HTMLSelectElement>('set-quality');
    const bind = (id: string, apply: (el: HTMLInputElement) => void): void => {
      $<HTMLInputElement>(id).addEventListener('input', (e) => {
        apply(e.target as HTMLInputElement);
        handlers.onSettings(this.settings);
      });
    };
    const season = $<HTMLSelectElement>('set-season');
    season.value = this.settings.tropical ? 'tropical' : this.settings.season;
    season.addEventListener('change', () => {
      this.settings.tropical = season.value === 'tropical';
      if (!this.settings.tropical) this.settings.season = season.value as Settings['season'];
      handlers.onSettings(this.settings);
      handlers.onSeason();
    });
    q.addEventListener('change', () => {
      this.settings.quality = q.value as Quality;
      this.settings.autoQuality = false; // an explicit choice is respected
      handlers.onSettings(this.settings);
    });
    bind('set-music', (el) => (this.settings.musicVolume = +el.value));
    bind('set-sound', (el) => (this.settings.soundVolume = +el.value));
    bind('set-shadows', (el) => (this.settings.shadows = el.checked));
    bind('set-grass', (el) => (this.settings.grassDensity = +el.value));
    bind('set-scale', (el) => (this.settings.renderScale = +el.value));
    bind('set-sens', (el) => (this.settings.sensitivity = +el.value));
    bind('set-invert', (el) => (this.settings.invertY = el.checked));
    bind('set-fps', (el) => (this.settings.showFps = el.checked));
    this.syncSettings();
  }

  syncSettings(): void {
    const s = this.settings;
    $<HTMLSelectElement>('set-quality').value = s.quality;
    $<HTMLInputElement>('set-music').value = String(s.musicVolume);
    $<HTMLInputElement>('set-sound').value = String(s.soundVolume);
    $<HTMLInputElement>('set-shadows').checked = s.shadows;
    $<HTMLInputElement>('set-grass').value = String(s.grassDensity);
    $<HTMLInputElement>('set-scale').value = String(s.renderScale);
    $<HTMLInputElement>('set-sens').value = String(s.sensitivity);
    $<HTMLInputElement>('set-invert').checked = s.invertY;
    $<HTMLInputElement>('set-fps').checked = s.showFps;
    $('fps').classList.toggle('hidden', !s.showFps);
  }

  progress(fraction: number, text: string): void {
    $('bar-fill').style.width = `${Math.round(fraction * 100)}%`;
    $('loading-text').textContent = text;
  }

  /** The logo intro stays up for a few seconds even if the island loads instantly. */
  introMinimum = 3600;

  showStart(returning: boolean): void {
    const intro = $('loading');
    const wait = Math.max(0, this.introMinimum - performance.now());
    window.setTimeout(() => {
      intro.classList.add('out');
      window.setTimeout(() => intro.classList.add('hidden'), 1200);
    }, wait);
    $('start').classList.remove('hidden');
    $('play').textContent = returning ? 'Continue wandering' : 'Begin wandering';
    $('play').focus();
  }

  showGame(): void {
    for (const id of ['loading', 'start', 'menu', 'log', 'map', 'photo-bar', 'journal', 'letter', 'choices', 'how', 'credits']) $(id).classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('touch').classList.toggle('hidden', !this.touch);
    $('hints').classList.remove('faded');
    clearTimeout(this.hintsTimer);
    this.hintsTimer = window.setTimeout(() => $('hints').classList.add('faded'), 14000);
  }

  /** Breathing guide: `fill` 0..1 sizes the ring; pass null to hide it. */
  breath(label: string | null, fill = 0, done = 0, total = 0): void {
    const el = $('breath');
    el.classList.toggle('hidden', label === null);
    if (label === null) return;
    $('breath-fill').style.transform = `scale(${(0.3 + 0.7 * fill).toFixed(3)})`;
    $('breath-label').textContent = label;
    $('breath-count').textContent = '●'.repeat(done) + '○'.repeat(Math.max(0, total - done));
  }

  /** "[E] Say hello" hint, or null to hide it. */
  prompt(text: string | null): void {
    $('prompt').classList.toggle('hidden', text === null);
    $('btn-hello').classList.toggle('hidden', text === null);
    if (text === null) return;
    $('prompt-text').textContent = text;
    $('btn-hello').textContent = text;
  }

  /** Second hint under the first: "[Q] Practise: …". */
  prompt2(text: string | null): void {
    $('prompt2').classList.toggle('hidden', text === null);
    $('btn-practise').classList.toggle('hidden', text === null);
    if (text === null) return;
    $('prompt2-text').textContent = text;
    $('btn-practise').textContent = text;
  }

  showLog(entries: LogEntry[]): void {
    $('menu').classList.add('hidden');
    const met = entries.filter((e) => e.met).length;
    $('log-count').textContent = `${met} of ${entries.length} Calmlings met. One friend can walk with you at a time.`;
    const grid = $('log-grid');
    grid.replaceChildren();
    for (const e of entries) {
      const item = document.createElement('div');
      item.className = `log-item${e.met ? '' : ' unmet'}`;
      if (e.met && e.portrait) {
        const img = document.createElement('img');
        img.src = e.portrait;
        img.alt = e.name;
        item.append(img);
      } else {
        const q = document.createElement('div');
        q.className = 'unknown';
        q.textContent = '?';
        item.append(q);
      }
      const h = document.createElement('h3');
      h.textContent = e.met ? e.name : 'Not met yet';
      const p = document.createElement('p');
      p.textContent = e.met ? e.meaning : e.hint;
      item.append(h, p);
      if (e.met) {
        const hearts = document.createElement('p');
        hearts.textContent = '♥'.repeat(e.hearts) + '♡'.repeat(3 - e.hearts);
        hearts.style.cssText = 'color:#f2678a;font-size:17px;letter-spacing:.15em';
        const q = document.createElement('p');
        q.textContent = e.story ? `“${e.story}”` : `“${e.hello}” Walk together to hear more.`;
        item.append(hearts, q);
        const likes = document.createElement('p');
        likes.textContent = e.gifted ? `✓ Loved the ${e.likes} you brought. Their lantern hangs at your treehouse` : `Loves ${e.likes}. Bring one from your fruit patch`;
        likes.style.cssText = e.gifted ? 'color:#2f8a5a;font-weight:700' : 'color:#b0668f;font-weight:700';
        item.append(likes);
        if (e.practice) {
          const pr = document.createElement('p');
          pr.textContent = `✓ Practice learned: ${e.practice}`;
          pr.style.cssText = 'color:#2f8a5a;font-weight:700';
          item.append(pr);
        }
      }
      if (e.companion) {
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = 'Walking with you';
        item.append(pill);
      }
      grid.append(item);
    }
    $('log').classList.remove('hidden');
    $('log-close').focus();
  }

  /** Skim and Fish only show beside water; `fishLabel` changes while a line is out. */
  skim(show: boolean, fishLabel = 'Fish'): void {
    $('btn-skim').classList.toggle('hidden', !show);
    $('btn-fish').classList.toggle('hidden', !show && fishLabel === 'Fish');
    $('btn-fish').textContent = fishLabel;
  }

  sleepButton(show: boolean): void {
    $('btn-sleep').classList.toggle('hidden', !show);
  }

  sleeping(on: boolean): void {
    $('sleep').classList.toggle('hidden', !on);
  }

  showJournal(items: JournalItem[]): void {
    $('menu').classList.add('hidden');
    const done = items.filter((i) => i.done).length;
    $('journal-count').textContent = `${done} of ${items.length} done. No rush, and no order.`;
    const list = $('journal-list');
    list.replaceChildren();
    for (const it of items) {
      const row = document.createElement('div');
      row.className = `j-item${it.done ? ' done' : ''}`;
      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.textContent = it.done ? '✓' : '○';
      const text = document.createElement('span');
      text.textContent = it.title;
      const small = document.createElement('small');
      small.textContent = it.hint;
      text.append(small);
      row.append(tick, text);
      list.append(row);
    }
    $('journal').classList.remove('hidden');
    $('journal-close').focus();
  }

  private basketKey = '';
  private nextText = '';
  private nextHidden = '';

  /** The one-line suggestion under the logo. Tapping it puts it away until it changes. */
  next(text: string | null): void {
    const t = text ?? '';
    if (t === this.nextText) return;
    this.nextText = t;
    $('next').textContent = t;
    $('next').classList.toggle('hidden', !t || t === this.nextHidden);
  }

  /** A list to pick from: the market stall, or the chest of things for the room. */
  showChoices(title: string, lead: string, rows: ChoiceRow[], onPick: (id: string) => void): void {
    $('menu').classList.add('hidden');
    $('choices-title').textContent = title;
    $('choices-lead').textContent = lead;
    const list = $('choices-list');
    list.replaceChildren();
    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'c-item';
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = r.color;
      const text = document.createElement('div');
      const b = document.createElement('b');
      b.textContent = r.name;
      const small = document.createElement('small');
      small.textContent = r.note;
      text.append(b, small);
      if (r.cost) {
        const cost = document.createElement('div');
        cost.className = 'cost';
        r.cost.forEach((n, i) => {
          if (!n) return;
          const chip = document.createElement('span');
          chip.className = `fruit-dot ${['f-star', 'f-moon', 'f-sun'][i]}`;
          chip.textContent = String(n);
          cost.append(chip);
        });
        text.append(cost);
      }
      const btn = document.createElement('button');
      btn.textContent = r.action;
      btn.disabled = !r.enabled;
      btn.addEventListener('click', () => onPick(r.id));
      row.append(sw, text, btn);
      list.append(row);
    }
    $('choices').classList.remove('hidden');
  }

  /** While falling in from the sky there is nothing to press: the controls and counters stay out of the way. */
  arriving(on: boolean): void {
    $('hud').classList.toggle('arriving', on);
  }

  /** A handwritten letter, shown as its own card. */
  showLetter(from: string, paragraphs: string[]): void {
    $('menu').classList.add('hidden');
    $('letter-kicker').textContent = from;
    const body = $('letter-body');
    body.replaceChildren();
    for (const line of paragraphs) {
      const p = document.createElement('p');
      p.textContent = line;
      body.append(p);
    }
    $('letter').classList.remove('hidden');
    $('letter-close').focus();
  }

  /** The menu offers to skip the introduction only while it is running. */
  introRunning(on: boolean): void {
    $('skip-tut').classList.toggle('hidden', !on);
  }

  /** Fruit carried, and seconds left of each fruit's effect. */
  basket(counts: number[], effects: number[]): void {
    const key = counts.join() + '|' + effects.map((e) => Math.ceil(e)).join();
    if (key === this.basketKey) return;
    this.basketKey = key;
    $('basket').classList.toggle('hidden', counts.every((c) => c === 0) && effects.every((e) => e <= 0));
    for (let i = 0; i < 3; i++) {
      const el = $(`eat${i}`);
      el.textContent = effects[i] > 0 ? `${counts[i]} · ${Math.ceil(effects[i])}s` : this.touch ? `${counts[i]}` : `${counts[i]}  [${i + 1}]`;
      el.classList.toggle('empty', counts[i] === 0 && effects[i] <= 0);
      el.classList.toggle('on', effects[i] > 0);
    }
  }

  seeds(found: number, total: number): void {
    $('seeds').classList.toggle('hidden', found === 0);
    $('seeds').textContent = `✦ ${found} of ${total} calm seeds`;
  }

  showMap(caption: string): HTMLCanvasElement {
    $('menu').classList.add('hidden');
    $('map-count').textContent = caption;
    $('map').classList.remove('hidden');
    $('map-close').focus();
    return $<HTMLCanvasElement>('map-canvas');
  }

  showPhoto(): void {
    $('hud').classList.add('hidden');
    $('photo-bar').classList.remove('hidden');
  }

  get logOpen(): boolean {
    return ['log', 'map', 'photo-bar', 'journal', 'letter', 'choices'].some((id) => !$(id).classList.contains('hidden'));
  }

  showMenu(stats: string): void {
    $('menu-stats').textContent = stats;
    $('menu').classList.remove('hidden');
    $('resume').focus();
  }

  get menuOpen(): boolean {
    return !$('menu').classList.contains('hidden');
  }

  /** A toast for the big moments: larger, and it lingers. */
  moment(kicker: string, title: string, blurb: string): void {
    this.toast(kicker, title, blurb, true);
  }

  toast(kicker: string, title: string, blurb: string, big = false): void {
    const el = $('toast');
    el.classList.toggle('moment', big);
    el.querySelector('.toast-kicker')!.textContent = kicker;
    el.querySelector('.toast-title')!.textContent = title;
    el.querySelector('.toast-blurb')!.textContent = blurb;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), big ? 8200 : 4600);
  }

  fps(text: string): void {
    $('fps').textContent = text;
  }

  error(message: string): void {
    for (const id of ['loading', 'start', 'menu']) $(id).classList.add('hidden');
    $('error-text').textContent = message;
    $('error').classList.remove('hidden');
  }
}
