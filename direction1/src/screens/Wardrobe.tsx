import { motion } from 'framer-motion';
import { Icon } from '../components/Icon';
import { Scout } from '../components/Scout';
import { Hat } from '../components/Hat';
import { Header } from '../components/ui';
import { ACHIEVEMENTS, OUTFITS } from '../data/gamification';
import { useGame } from '../store/game';

export function Wardrobe() {
  const hats = useGame((s) => s.hats);
  const hat = useGame((s) => s.hat);
  const sparks = useGame((s) => s.sparks);
  const plus = useGame((s) => !!s.plus);
  const buy = useGame((s) => s.buyHat);
  const setHat = useGame((s) => s.setHat);
  const toast = useGame((s) => s.toast);
  return (
    <div className="min-h-screen bg-white pb-10">
      <Header title="Scout’s wardrobe" right={<span className="mr-2 flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-extrabold text-sky-600"><Icon name="gem" size={14} />{sparks}</span>} />
      <div className="mx-4 flex justify-center rounded-[2rem] bg-gradient-to-b from-grape-100 to-grape-50 py-6"><Scout size={150} mood="excited" /></div>
      <p className="mx-4 mt-3 text-center text-sm font-semibold text-ink-500">Earn Sparks by exploring. Some outfits unlock with achievements.</p>
      <div className="mt-4 grid grid-cols-3 gap-3 px-4">
        {OUTFITS.map((o) => {
          const own = hats.includes(o.id);
          const plusOnly = o.id === 'crown' && !own;
          const fromAch = ACHIEVEMENTS.find((a) => a.reward === o.id);
          return (
            <motion.button key={o.id} whileTap={{ scale: 0.94 }} aria-pressed={hat === o.id}
              onClick={() => {
                if (own) return setHat(o.id);
                if (plusOnly && plus) { buy(o.id, 0); return; }
                if (plusOnly) return toast('The golden crown is for Plus explorers (or the Career Sampler badge)');
                if (!buy(o.id, o.price)) toast(`You need ${o.price - sparks} more Sparks`);
              }}
              className={`flex flex-col items-center rounded-3xl border-2 p-2 ${hat === o.id ? 'border-grape-500 bg-grape-50' : 'border-grape-50 bg-white'}`}>
              <svg viewBox="20 -10 80 60" width="70" height="52" aria-hidden="true"><circle cx="60" cy="48" r="26" fill="#7C3AED" opacity=".15" /><Hat id={o.id} /></svg>
              <span className="text-xs font-extrabold leading-tight">{o.label}</span>
              <span className="mt-1 text-[11px] font-extrabold">{own ? (hat === o.id ? <span className="text-grape-600">Wearing</span> : <span className="text-lime-700">Owned</span>) : plusOnly ? <span className="text-sun-600">{plus ? 'Free with Plus' : 'Plus'}</span> : <span className="flex items-center gap-0.5 text-sky-600"><Icon name="gem" size={11} />{o.price}{fromAch ? ' or badge' : ''}</span>}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
