import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces/full.css';
import { Game } from './core/Game';
import { fogClearAt } from './world/shared';
import type { Quality } from './core/Settings';

declare global {
  interface Window {
    /** Debug / test handle. Not used by the game itself. */
    __calm?: Game;
  }
}

const params = new URLSearchParams(location.search);
const quality = params.get('quality');
const game = new Game(document.getElementById('game') as HTMLCanvasElement, {
  test: params.has('test'),
  sound: params.has('sound'),
  intro: params.has('intro'),
  season: params.get('season'),
  plainPlants: params.has('plain'),
  quality: quality === 'low' || quality === 'medium' || quality === 'high' || quality === 'ultra' ? (quality as Quality) : undefined,
});
window.__calm = game;
(window as unknown as { __calmFog: typeof fogClearAt }).__calmFog = fogClearAt;

game.init().catch((err: unknown) => {
  console.error(err);
  game.ui.error(err instanceof Error ? err.message : String(err));
});
