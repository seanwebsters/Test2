export interface SaveData {
  v: 1;
  pos: [number, number, number];
  yaw: number;
  cam: { yaw: number; pitch: number; dist: number };
  discovered: string[];
  playTime: number;
  /** completed three-breath exercises */
  breaths?: number;
  /** ids of the Calmlings you have met, and who is walking with you */
  met?: string[];
  companion?: string | null;
  /** seconds spent walking with each Calmling */
  bonds?: Record<string, number>;
  /** time of day, 0–24 */
  hour?: number;
  /** ids of Calmlings whose practice you have completed */
  practices?: string[];
  garden?: { t: number; w: number }[];
  seeds?: number[];
  bestSkips?: number;
  viewpoints?: string[];
  cairns?: number[];
  /** one-off things done, for the journal */
  flags?: string[];
  /** the date (YYYY-M-D) on which today's moment was last received */
  dailyDone?: string;
  /** keepsakes already shown in the nook */
  keepsakes?: string[];
  /** patches of the map cleared of mist: x, z, radius */
  reveals?: number[][];
}

const KEY = 'calmlings.save.v1';

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== 1 || !Array.isArray(d.pos) || d.pos.some((n) => !Number.isFinite(n))) return null;
    return d;
  } catch {
    return null;
  }
}

export function writeSave(d: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
