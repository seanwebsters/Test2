import { useEffect } from 'react';
import { Town } from './explore/Town';
import { useGame } from './game/store';
import { setMuted, unlockAudio } from './game/audio';
import { SvgDefs } from './ui/ItemIcon';
import { MergeScreen } from './ui/MergeScreen';
import { Book } from './ui/Book';
import { Awakening, FlyLayer, Dialogue, Fade, LovePanel, Nav, Objective, Prompt, Title, Toasts, TopBar } from './ui/Overlay';

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
        <Town />
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
          <Dialogue />
          <Toasts />
          <Awakening />
          <FlyLayer />
          {!bookOpen && <Nav />}
        </div>
      )}
      <Book />
      <Fade />
    </div>
  );
}
