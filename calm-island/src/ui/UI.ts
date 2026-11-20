import type { Quality, Settings } from '../core/Settings';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export interface LogEntry {
  name: string;
  meaning: string;
  hello: string;
  hint: string;
  met: boolean;
  companion: boolean;
  portrait: string | null;
}

export interface UIHandlers {
  onLog(): void;
  onLogClose(): void;
  onPlay(): void;
  onResume(): void;
  onHome(): void;
  onReset(): void;
  onSettings(s: Settings): void;
}

/** All DOM: loading, title, pause/settings menu and the in-world HUD. */
export class UI {
  private toastTimer = 0;
  private hintsTimer = 0;
  /** set on phones and tablets: shows the on-screen controls */
  touch = false;

  constructor(private settings: Settings, private handlers: UIHandlers) {
    $('play').addEventListener('click', () => handlers.onPlay());
    $('resume').addEventListener('click', () => handlers.onResume());
    $('open-log').addEventListener('click', () => handlers.onLog());
    $('btn-log').addEventListener('click', () => handlers.onLog());
    $('log-close').addEventListener('click', () => handlers.onLogClose());
    $('home').addEventListener('click', () => handlers.onHome());
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
    q.addEventListener('change', () => {
      this.settings.quality = q.value as Quality;
      this.settings.autoQuality = false; // an explicit choice is respected
      handlers.onSettings(this.settings);
    });
    bind('set-music', (el) => (this.settings.musicVolume = +el.value));
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

  showStart(returning: boolean): void {
    $('loading').classList.add('hidden');
    $('start').classList.remove('hidden');
    $('play').textContent = returning ? 'Continue wandering' : 'Begin wandering';
    $('play').focus();
  }

  showGame(): void {
    for (const id of ['loading', 'start', 'menu', 'log']) $(id).classList.add('hidden');
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
        const q = document.createElement('p');
        q.textContent = `“${e.hello}”`;
        item.append(q);
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

  get logOpen(): boolean {
    return !$('log').classList.contains('hidden');
  }

  showMenu(stats: string): void {
    $('menu-stats').textContent = stats;
    $('menu').classList.remove('hidden');
    $('resume').focus();
  }

  get menuOpen(): boolean {
    return !$('menu').classList.contains('hidden');
  }

  toast(kicker: string, title: string, blurb: string): void {
    const el = $('toast');
    el.querySelector('.toast-kicker')!.textContent = kicker;
    el.querySelector('.toast-title')!.textContent = title;
    el.querySelector('.toast-blurb')!.textContent = blurb;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), 4600);
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
