import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/600.css';
import '@fontsource/lilita-one';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
