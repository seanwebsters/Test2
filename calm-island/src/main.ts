import { Game } from './core/Game';
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
  season: params.get('season'),
  quality: quality === 'low' || quality === 'medium' || quality === 'high' ? (quality as Quality) : undefined,
});
window.__calm = game;

game.init().catch((err: unknown) => {
  console.error(err);
  game.ui.error(err instanceof Error ? err.message : String(err));
});
