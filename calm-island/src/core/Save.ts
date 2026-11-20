export interface SaveData {
  v: 1;
  pos: [number, number, number];
  yaw: number;
  cam: { yaw: number; pitch: number; dist: number };
  discovered: string[];
  playTime: number;
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
