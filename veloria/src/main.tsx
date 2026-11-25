import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/pinyon-script/400.css';
import '@fontsource/homemade-apple/400.css';
import '@fontsource-variable/nunito';
import './styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// handy for testing in the console: __veloria.getState()
import { useGame } from './game/store';
(window as unknown as { __veloria: typeof useGame }).__veloria = useGame;
