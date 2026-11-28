import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { Toasts } from './components/ui';
import { useGame } from './store/game';
import { useNav, type Route } from './store/nav';
import { Achievements } from './screens/Achievements';
import { CareerScreen } from './screens/Career';
import { EpisodePlayer } from './screens/EpisodePlayer';
import { Explore } from './screens/Explore';
import { Journey } from './screens/Journey';
import { LessonRunner } from './screens/Lesson';
import { Onboarding } from './screens/Onboarding';
import { PlayTab } from './screens/Play';
import { PlusScreen } from './screens/Plus';
import { Roadmap } from './screens/Roadmap';
import { ScoutChat } from './screens/ScoutChat';
import { Settings } from './screens/Settings';
import { SimRunner } from './screens/SimRunner';
import { Wardrobe } from './screens/Wardrobe';
import { WorldScreen } from './screens/World';
import { You } from './screens/You';

function RouteView({ r }: { r: Route }) {
  switch (r.name) {
    case 'career': return <CareerScreen id={r.id} />;
    case 'world': return <WorldScreen id={r.id} />;
    case 'sim': return <SimRunner id={r.id} />;
    case 'lesson': return <LessonRunner careerId={r.careerId} />;
    case 'episode': return <EpisodePlayer id={r.id} />;
    case 'plus': return <PlusScreen />;
    case 'roadmap': return <Roadmap careerId={r.careerId} />;
    case 'achievements': return <Achievements />;
    case 'wardrobe': return <Wardrobe />;
    case 'settings': return <Settings />;
  }
}

export default function App() {
  const onboarded = useGame((s) => s.onboarded);
  const ensureDaily = useGame((s) => s.ensureDaily);
  const tab = useNav((s) => s.tab);
  const stack = useNav((s) => s.stack);
  const top = stack[stack.length - 1];

  useEffect(() => { if (onboarded) ensureDaily(); }, [onboarded, ensureDaily]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab, stack.length, onboarded]);

  if (!onboarded) return <div className="app-frame"><Onboarding /><Toasts /></div>;

  const immersive = top && (top.name === 'sim' || top.name === 'lesson' || top.name === 'episode');
  return (
    <div className="app-frame">
      <AnimatePresence mode="wait" initial={false}>
        <motion.main key={top ? `${stack.length}-${JSON.stringify(top)}` : tab}
          initial={{ opacity: 0, x: top ? 24 : 0, y: top ? 0 : 8 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }} className={immersive ? '' : 'pb-28'}>
          {top ? <RouteView r={top} /> : tab === 'journey' ? <Journey /> : tab === 'explore' ? <Explore /> : tab === 'play' ? <PlayTab /> : tab === 'scout' ? <ScoutChat /> : <You />}
        </motion.main>
      </AnimatePresence>
      {!immersive && <BottomNav />}
      <Toasts />
    </div>
  );
}
