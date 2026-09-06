import { useMemo, useRef, useState } from 'react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { ConsentBar } from '../../components/ConsentBar';
import { StickyCta } from '../../components/StickyCta';
import { Hero } from '../index/sections/Hero';
import { Recognize } from '../index/sections/Recognize';
import { Team } from '../index/sections/Team';
import { HowConnected } from './sections/HowConnected';
import { LeadSectionByq } from './sections/LeadSectionByq';
import type { Variant } from '../../content/site';
import type { Utm } from '../../lib/storage';

// Intern forhåndsvisning av tre BYQ Supply-inspirerte justeringer, bygget på en egen side
// slik at den live forsiden (src/pages/index) ikke er rørt. Se sections/HowConnected.tsx
// og sections/LeadSectionByq.tsx for hva som faktisk er endret.
export function App({ variant, utm }: { variant: Variant; utm: Utm }) {
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLElement | null>(null);
  const watch = useMemo(() => [ctaRef, formRef], []);
  const [consented, setConsented] = useState(false);

  return (
    <>
      <p className="byq-banner">
        <strong>Intern forhåndsvisning.</strong> Ikke lenket fra den live siden. Skjemaet under er
        det ekte skjemaet og går til de samme systemene som produksjon (ClickUp, Google Sheet, Meta).
      </p>
      <Header />
      <main id="main">
        <Hero variant={variant} ctaRef={ctaRef} />
        <Recognize variant={variant} />
        <HowConnected />
        <Team />
        <LeadSectionByq variant={variant} utm={utm} sectionRef={formRef} />
      </main>
      <Footer showBook />
      <StickyCta watch={watch} enabled={consented} />
      <ConsentBar onChange={(c) => setConsented(!!c)} />
    </>
  );
}
