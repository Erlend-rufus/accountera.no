import { createRoot } from 'react-dom/client';
import '../../ds';
import '../../styles/site.css';
import { App } from './App';
import { countView } from '../../lib/view';

countView({ p: 'takk' });

createRoot(document.getElementById('root')!).render(<App />);
