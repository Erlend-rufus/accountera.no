import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

/** Felles ramme for undersidene: header, innhold, footer med skrå hette. */
export function Page({ children, cap = true }: { children: ReactNode; cap?: boolean }) {
  return (
    <>
      <Header />
      <main id="main" className={['sub', cap ? 'sub--withcap' : ''].filter(Boolean).join(' ')}>
        {children}
      </main>
      <Footer cap={cap} />
    </>
  );
}
