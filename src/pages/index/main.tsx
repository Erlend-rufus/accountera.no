import { createRoot } from 'react-dom/client';
import '../../ds';
import '../../styles/site.css';
import { App } from './App';
import { initVariant } from '../../lib/variant';
import { countView } from '../../lib/view';
import { bindPixelToConsent } from '../../lib/pixel';

document.documentElement.classList.add('page-index');
const { variant, utm } = initVariant();
countView({ v: variant });
bindPixelToConsent();

createRoot(document.getElementById('root')!).render(<App variant={variant} utm={utm} />);
