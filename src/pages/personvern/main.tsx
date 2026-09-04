import { createRoot } from 'react-dom/client';
import '../../ds';
import '../../styles/site.css';
import { App } from './App';
import { bindPixelToConsent } from '../../lib/pixel';

bindPixelToConsent();

createRoot(document.getElementById('root')!).render(<App />);
