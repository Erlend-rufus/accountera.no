import type { RefObject } from 'react';
import { Logo } from '../../../ds';
import { proof, type Variant } from '../../../content/site';
import { config } from '../../../lib/config';
import type { Utm } from '../../../lib/storage';
import { LeadForm } from '../LeadForm';

export function LeadSection({ variant, utm, sectionRef }: { variant: Variant; utm: Utm; sectionRef: RefObject<HTMLElement | null> }) {
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
          <ul className="proof__facts">
            {proof.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          {config.quote && (
            <figure className="quote">
              <blockquote>{config.quote.text}</blockquote>
              {config.quote.by && <figcaption className="ds-small ds-muted">{config.quote.by}</figcaption>}
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
