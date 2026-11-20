export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** The season on the real calendar (northern hemisphere), unless one is forced. */
export function currentSeason(force?: string | null): Season {
  if (force && (SEASONS as string[]).includes(force)) return force as Season;
  const m = new Date().getMonth();
  return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
}

/** Chosen once at start-up: the island is painted and planted for this season. */
export let SEASON: Season = 'spring';
export function setSeason(s: Season): void {
  SEASON = s;
}
