import type { Quality, Settings } from '../core/Settings';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export interface UIHandlers {
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

  constructor(private settings: Settings, private handlers: UIHandlers) {
    $('play').addEventListener('click', () => handlers.onPlay());
    $('resume').addEventListener('click', () => handlers.onResume());
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
    for (const id of ['loading', 'start', 'menu']) $(id).classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('hints').classList.remove('faded');
    clearTimeout(this.hintsTimer);
    this.hintsTimer = window.setTimeout(() => $('hints').classList.add('faded'), 14000);
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
