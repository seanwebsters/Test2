import type { Input } from './Input';

export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

/**
 * On-screen controls for phones and tablets: a thumb stick to move, drag
 * anywhere else to look around, and buttons to hop, breathe and open the menu.
 */
export class TouchControls {
  private joyId = -1;
  private lookId = -1;
  private lastX = 0;
  private lastY = 0;

  constructor(input: Input, canvas: HTMLCanvasElement, onMenu: () => void) {
    const joy = document.getElementById('joy')!;
    const thumb = document.getElementById('joy-thumb')!;
    const REACH = 46;

    const moveStick = (e: PointerEvent): void => {
      const r = joy.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > REACH) {
        dx *= REACH / len;
        dy *= REACH / len;
      }
      thumb.style.transform = `translate(${dx}px, ${dy}px)`;
      input.joyX = dx / REACH;
      input.joyY = -dy / REACH;
    };
    const releaseStick = (e: PointerEvent): void => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = -1;
      thumb.style.transform = '';
      input.joyX = 0;
      input.joyY = 0;
    };
    joy.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.joyId = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      moveStick(e);
    });
    joy.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joyId) moveStick(e);
    });
    joy.addEventListener('pointerup', releaseStick);
    joy.addEventListener('pointercancel', releaseStick);

    // drag on the world itself to look around
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || this.lookId !== -1) return;
      this.lookId = e.pointerId;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      input.addLook((e.clientX - this.lastX) * 2.2, (e.clientY - this.lastY) * 2.2);
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    const endLook = (e: PointerEvent): void => {
      if (e.pointerId === this.lookId) this.lookId = -1;
    };
    window.addEventListener('pointerup', endLook);
    window.addEventListener('pointercancel', endLook);

    const button = (id: string, name: string): void => {
      const el = document.getElementById(id)!;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        input.press(name);
      });
      const up = (): void => input.release(name);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    };
    button('btn-hop', 'jump');
    button('btn-breathe', 'breathe');
    button('btn-hello', 'interact');
    button('btn-practise', 'practise');
    button('btn-skim', 'skim');
    button('btn-kite', 'kite');
    button('btn-fish', 'fish');
    button('btn-sleep', 'sleep');
    document.getElementById('btn-menu')!.addEventListener('click', onMenu);
    // a long press should never pop up the browser's own menu over the game
    window.addEventListener('contextmenu', (e) => {
      if (document.body.classList.contains('is-touch')) e.preventDefault();
    });
  }
}
