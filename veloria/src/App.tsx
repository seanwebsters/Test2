import { Suspense, useEffect } from 'react';
import { Scene } from './world/Scene';
import { useGame } from './game/store';
import { setMuted, unlockAudio } from './game/audio';
import { SvgDefs } from './ui/ItemIcon';
import { MergeScreen } from './ui/MergeScreen';
import { Book } from './ui/Book';
import { Dialogue, Fade, LovePanel, Nav, Objective, Prompt, SatchelPanel, Title, Toasts, TopBar } from './ui/Overlay';

export function App() {
  const screen = useGame((s) => s.screen);
  const tab = useGame((s) => s.tab);
  const muted = useGame((s) => s.muted);
  const bookOpen = useGame((s) => s.book.open);
  useEffect(() => setMuted(muted), [muted]);
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);
  return (
    <div className="app">
      <SvgDefs />
      <div className="stage">
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </div>
      <div className="vignette" />
      <Title />
      {screen === 'game' && (
        <div className={`ui ${tab !== 'explore' ? 'panel-open' : ''}`}>
          <TopBar />
          <Objective />
          <Prompt />
          {tab === 'merge' && <MergeScreen />}
          {tab === 'love' && <LovePanel />}
          {tab === 'satchel' && <SatchelPanel />}
          <Dialogue />
          <Toasts />
          {!bookOpen && <Nav />}
        </div>
      )}
      <Book />
      <Fade />
    </div>
  );
}
