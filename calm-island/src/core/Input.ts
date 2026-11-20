/** Keyboard + mouse state. Mouse deltas accumulate until consumed each frame. */
export class Input {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  dx = 0;
  dy = 0;
  wheel = 0;
  locked = false;
  private dragging = false;
  /** When false, clicks never capture the pointer (used by automated tests). */
  allowPointerLock = true;
  enabled = false;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (this.enabled && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', () => {
      if (!this.enabled) return;
      this.dragging = true;
      this.requestLock();
    });
    window.addEventListener('mouseup', () => (this.dragging = false));
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled || !(this.locked || this.dragging)) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    canvas.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.wheel += e.deltaY;
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      this.onLockChange?.(this.locked);
    });
  }

  onLockChange?: (locked: boolean) => void;

  requestLock(): void {
    if (!this.allowPointerLock || this.locked) return;
    try {
      const p = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      p?.catch?.(() => {});
    } catch {
      /* dragging still works without pointer lock */
    }
  }

  releaseLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  down(...codes: string[]): boolean {
    return this.enabled && codes.some((c) => this.keys.has(c));
  }

  /** True once per key press. */
  hit(...codes: string[]): boolean {
    return codes.some((c) => this.pressed.has(c));
  }

  endFrame(): void {
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
    this.pressed.clear();
  }
}
