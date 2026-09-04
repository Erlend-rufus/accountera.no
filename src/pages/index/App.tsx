import { useMemo, useRef, useState } from 'react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { ConsentBar } from '../../components/ConsentBar';
import { StickyCta } from '../../components/StickyCta';
import { Hero } from './sections/Hero';
import { Recognize } from './sections/Recognize';
import { How } from './sections/How';
import { Team } from './sections/Team';
import { LeadSection } from './sections/LeadSection';
import type { Variant } from '../../content/site';
import type { Utm } from '../../lib/storage';

export function App({ variant, utm }: { variant: Variant; utm: Utm }) {
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLElement | null>(null);
  const watch = useMemo(() => [ctaRef, formRef], []);
  const [consented, setConsented] = useState(false);

  return (
    <>
      <Header />
      <main id="main">
        <Hero variant={variant} ctaRef={ctaRef} />
        <Recognize variant={variant} />
        <How />
        <Team />
        <LeadSection variant={variant} utm={utm} sectionRef={formRef} />
      </main>
      <Footer showBook />
      <StickyCta watch={watch} enabled={consented} />
      <ConsentBar onChange={(c) => setConsented(!!c)} />
    </>
  );
}
