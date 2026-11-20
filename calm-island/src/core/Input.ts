/** Keyboard + mouse state. Mouse deltas accumulate until consumed each frame. */
export class Input {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  dx = 0;
  dy = 0;
  wheel = 0;
  /** on-screen thumb stick, each -1..1 */
  joyX = 0;
  joyY = 0;
  private virtualHit = new Set<string>();
  private virtualHeld = new Set<string>();
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

  /** On-screen button pressed (jump, breathe). */
  press(name: string): void {
    this.virtualHit.add(name);
    this.virtualHeld.add(name);
  }

  release(name: string): void {
    this.virtualHeld.delete(name);
  }

  addLook(dx: number, dy: number): void {
    if (!this.enabled) return;
    this.dx += dx;
    this.dy += dy;
  }

  private get shift(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  /** Movement: arrow keys (or WASD) and the thumb stick. x = right, y = forward. */
  moveAxis(out: { x: number; y: number }): number {
    out.x = 0;
    out.y = 0;
    if (!this.enabled) return 0;
    const k = this.keys;
    const arrows = !this.shift;
    out.x = (k.has('KeyD') || (arrows && k.has('ArrowRight')) ? 1 : 0) - (k.has('KeyA') || (arrows && k.has('ArrowLeft')) ? 1 : 0) + this.joyX;
    out.y = (k.has('KeyW') || (arrows && k.has('ArrowUp')) ? 1 : 0) - (k.has('KeyS') || (arrows && k.has('ArrowDown')) ? 1 : 0) + this.joyY;
    const len = Math.hypot(out.x, out.y);
    if (len > 1) {
      out.x /= len;
      out.y /= len;
    }
    return Math.min(1, len);
  }

  /** Camera: hold Shift and use the arrow keys. x = turn left, y = tilt up. */
  cameraAxis(out: { x: number; y: number }): void {
    out.x = 0;
    out.y = 0;
    if (!this.enabled) return;
    const k = this.keys;
    if (this.shift) {
      out.x += (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0);
      out.y = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0);
    }
  }

  jumpPressed(): boolean {
    return this.enabled && (this.pressed.has('Space') || this.virtualHit.has('jump'));
  }

  jumpHeld(): boolean {
    return this.enabled && (this.keys.has('Space') || this.virtualHeld.has('jump'));
  }

  interactPressed(): boolean {
    return this.enabled && (this.pressed.has('KeyE') || this.virtualHit.has('interact'));
  }

  practisePressed(): boolean {
    return this.enabled && (this.pressed.has('KeyQ') || this.virtualHit.has('practise'));
  }

  breathePressed(): boolean {
    return this.enabled && (this.pressed.has('KeyB') || this.virtualHit.has('breathe'));
  }

  endFrame(): void {
    this.virtualHit.clear();
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
    this.pressed.clear();
  }
}
