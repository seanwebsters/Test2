import type { Theme } from "../lib/engine/schemas";

export interface Pt {
  x: number;
  y: number;
}

/** An input the automated QA driver should perform next, in viewport CSS pixels. */
export type QAAction =
  | { kind: "click"; x: number; y: number; label: string }
  | { kind: "drag"; from: Pt; to: Pt; label: string }
  | { kind: "advance"; ms: number; label: string };

export interface SceneHost {
  theme: Theme;
  reducedMotion: boolean;
  /** Seconds of game time; pauses with the game and can be advanced by QA. */
  time(): number;
  sound: {
    touch(step?: number): void;
    connect(): void;
    miss(): void;
    complete(): void;
  };
  hud: {
    setStatus(text: string): void;
    announce(text: string): void;
    setToolbar(el: HTMLElement | null): void;
  };
  burst(x: number, y: number, color?: string, count?: number): void;
  levelComplete(): void;
  track(name: string, data?: Record<string, unknown>): void;
}

export interface Scene {
  /** Layout for the given play area (CSS pixels, already excluding HUD chrome). */
  resize(area: { x: number; y: number; w: number; h: number }): void;
  draw(ctx: CanvasRenderingContext2D, t: number, dt: number): void;
  pointerDown?(p: Pt): void;
  pointerMove?(p: Pt): void;
  pointerUp?(p: Pt): void;
  key?(e: KeyboardEvent): boolean;
  /** Advance game-time driven systems (growth, flow). */
  update?(t: number): void;
  qaNext(): QAAction | null;
  qaState(): Record<string, unknown>;
  progress(): number;
}
