export type Quality = 'low' | 'medium' | 'high' | 'ultra';

export interface Settings {
  quality: Quality;
  shadows: boolean;
  grassDensity: number; // 0..1
  renderScale: number; // multiplier on device pixel ratio
  sensitivity: number;
  invertY: boolean;
  showFps: boolean;
  /** 'auto' follows the real calendar */
  season: 'auto' | 'spring' | 'summer' | 'autumn' | 'winter';
  /** the island's own climate: always lush and in bloom, whatever the calendar says */
  tropical: boolean;
  musicVolume: number; // 0..1
  /** wind, water, birds */
  soundVolume: number;
  /** lower the graphics preset automatically if the frame rate is poor */
  autoQuality: boolean;
}

export const QUALITY_PRESETS: Record<Quality, { maxPixelRatio: number; shadowMap: number; grass: number; distance: number }> = {
  low: { maxPixelRatio: 1, shadowMap: 1024, grass: 0.35, distance: 0.6 },
  medium: { maxPixelRatio: 1.5, shadowMap: 2048, grass: 0.7, distance: 0.85 },
  high: { maxPixelRatio: 2, shadowMap: 4096, grass: 1, distance: 1 },
  // everything on, drawn further out: for a fast desktop graphics card
  ultra: { maxPixelRatio: 2, shadowMap: 4096, grass: 1, distance: 1.3 },
};

const KEY = 'calmlings.settings.v1';

const DEFAULTS: Settings = {
  quality: 'high',
  shadows: true,
  grassDensity: 1,
  renderScale: 1,
  sensitivity: 1,
  invertY: false,
  showFps: false,
  season: 'auto',
  tropical: true,
  musicVolume: 0.6,
  soundVolume: 0.7,
  autoQuality: true,
};

export function hasStoredSettings(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable: fall through to defaults */
  }
  return { ...DEFAULTS };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
