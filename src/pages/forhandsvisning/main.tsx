import { createRoot } from 'react-dom/client';
import '../../ds';
import '../../styles/site.css';
import { App } from './App';
import { initVariant } from '../../lib/variant';
import { bindPixelToConsent } from '../../lib/pixel';

// Ingen countView() her: dette er en intern designforhåndsvisning, ikke en trafikkert side.
const { variant, utm } = initVariant();
bindPixelToConsent();

createRoot(document.getElementById('root')!).render(<App variant={variant} utm={utm} />);
