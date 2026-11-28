import { useMemo } from 'react';
import { useGame } from '../store/game';
import type { RecState } from './recommend';

export function useRecState(): RecState {
  const traits = useGame((s) => s.traits);
  const worldAff = useGame((s) => s.worldAff);
  const saved = useGame((s) => s.saved);
  const activities = useGame((s) => s.activities);
  return useMemo(() => ({ traits, worldAff, saved, activities }), [traits, worldAff, saved, activities]);
}
