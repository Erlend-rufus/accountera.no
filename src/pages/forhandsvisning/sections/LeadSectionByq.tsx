import type { RefObject } from 'react';
import { Logo } from '../../../ds';
import { proof, testimonial, type Variant } from '../../../content/site';
import { config } from '../../../lib/config';
import type { Utm } from '../../../lib/storage';
import { LeadForm } from '../../index/LeadForm';

// Forket fra src/pages/index/sections/LeadSection.tsx. To endringer (idéer fra BYQ Supply):
// 1) proof__facts får en tynnere, «hovedbok»-preget skillelinje via byq-proof-facts.
// 2) sitatet får et dekorativt anførselstegn via byq-quote.
// Begge er nye klassenavn definert i forhandsvisning.html, så proof__facts/quote (og dermed
// den live siden) er urørt.
export function LeadSectionByq({ variant, utm, sectionRef }: { variant: Variant; utm: Utm; sectionRef: RefObject<HTMLElement | null> }) {
  return (
    <section id="skjema" ref={sectionRef} className="sec lead-sec" aria-labelledby="lead-title">
      <div className="ds-container lead-sec__grid">
        <div className="proof">
          <h2 id="lead-title" className="ds-h2">
            {proof.heading[0]}
            <br />
            {proof.heading[1]}
          </h2>
          <p>{proof.lead}</p>
          <div className="proof__logo">
            <Logo variant="lockup" height={44} />
          </div>
          <ul className="proof__facts byq-proof-facts">
            {proof.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          {config.quoteApproved && (
            <figure className="quote byq-quote">
              <blockquote>«{testimonial.primary.quote}»</blockquote>
              <figcaption className="ds-kicker">{testimonial.primary.credit}</figcaption>
            </figure>
          )}
        </div>
        <div className="form-panel">
          <LeadForm variant={variant} utm={utm} />
        </div>
      </div>
    </section>
  );
}
