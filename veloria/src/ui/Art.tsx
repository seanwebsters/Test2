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
};

/** a painted plate from the storybook */
export function Illustration({ art, className }: { art: StoryPage['art']; className?: string }) {
  return <img className={`illus ${className ?? ''}`} src={ART + PAGE_ART[art]} alt="" draggable={false} />;
}

/** Lucien's portrait */
export function Portrait({ size = 120, mystery = false, smile = false }: { size?: number; mystery?: boolean; smile?: boolean }) {
  return (
    <div className={`portrait ${mystery ? 'mystery' : ''}`} style={{ width: size, height: size }}>
      <img src={ART + (smile ? 'bust_him_smile.webp' : 'bust_him.webp')} alt="" draggable={false} />
    </div>
  );
}
