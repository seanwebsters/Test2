/**
 * Three slow breaths: in for 4 s, a short hold, out for 6 s. Pure timing —
 * the game reads `fill` to swell the Calmling and the on-screen ring together.
 */
export type BreathPhase = 'in' | 'hold' | 'out';

const IN = 4;
const HOLD = 1.5;
const OUT = 6;
const CYCLE = IN + HOLD + OUT;
export const BREATHS = 3;

const ease = (t: number): number => t * t * (3 - 2 * t);

export class Breathing {
  active = false;
  phase: BreathPhase = 'in';
  /** 0 = lungs empty, 1 = full */
  fill = 0;
  /** which breath we are on, from 0 */
  breath = 0;
  private t = 0;

  start(): void {
    this.active = true;
    this.t = 0;
    this.breath = 0;
    this.fill = 0;
    this.phase = 'in';
  }

  cancel(): void {
    this.active = false;
    this.fill = 0;
  }

  /** Advances the exercise; returns true on the frame the last breath ends. */
  update(dt: number): boolean {
    if (!this.active) return false;
    this.t += dt;
    if (this.t >= CYCLE * BREATHS) {
      this.active = false;
      this.fill = 0;
      return true;
    }
    this.breath = Math.floor(this.t / CYCLE);
    const c = this.t - this.breath * CYCLE;
    if (c < IN) {
      this.phase = 'in';
      this.fill = ease(c / IN);
    } else if (c < IN + HOLD) {
      this.phase = 'hold';
      this.fill = 1;
    } else {
      this.phase = 'out';
      this.fill = 1 - ease((c - IN - HOLD) / OUT);
    }
    return false;
  }
}
