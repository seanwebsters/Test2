import { useGame } from '../game/store';
import { StoryPage } from '../game/story';

export const ART = `${import.meta.env.BASE_URL}art/`;

const PAGE_ART: Record<StoryPage['art'], string> = {
  tower: 'title.webp',
  tree: 'cg_tree.webp',
  meet: 'cg_meet.webp',
  fountain: 'cg_fountain.webp',
  alone: 'cg_alone.webp',
  return: 'cg_return.webp',
  bookshop: 'cg_bookshop.webp',
  bell: 'cg_bell.webp',
  lamp: 'cg_cassian.webp',
  dance: 'cg_dance.webp',
};

/** scenes she appears in, painted once per look */
export const HER_CG = new Set(['cg_tree', 'cg_meet', 'cg_fountain', 'cg_garden', 'cg_return', 'cg_bookshop', 'cg_boats', 'cg_ledge', 'cg_dance', 'cg_almost', 'cg_cassian', 'cg_cassclose']);

export function cgFile(id: string, look: string) {
  return `${ART}${HER_CG.has(id) && look !== 'rose' ? `${id}_${look}` : id}.webp`;
}

export const herSuffix = (look: string) => (look === 'rose' ? '' : `_${look}`);

/** a painted plate from the storybook */
export function Illustration({ art, className }: { art: StoryPage['art']; className?: string }) {
  const look = useGame((s) => s.look);
  return <img className={`illus ${className ?? ''}`} src={cgFile(PAGE_ART[art].replace('.webp', ''), look)} alt="" draggable={false} />;
}

/** Lucien's portrait */
export function Portrait({ size = 120, mystery = false, smile = false }: { size?: number; mystery?: boolean; smile?: boolean }) {
  return (
    <div className={`portrait ${mystery ? 'mystery' : ''}`} style={{ width: size, height: size }}>
      <img src={ART + (smile ? 'bust_him_smile.webp' : 'bust_him.webp')} alt="" draggable={false} />
    </div>
  );
}
