import { Fragment, type RefObject } from 'react';
import { Button, DiagonalSplit } from '../../../ds';
import { heroes, site, type Variant } from '../../../content/site';
import { config } from '../../../lib/config';

export function Hero({ variant, ctaRef }: { variant: Variant; ctaRef: RefObject<HTMLDivElement | null> }) {
  const h = heroes[variant];
  const photo = config.heroPhoto ? { src: config.heroPhoto, alt: '' } : null;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <DiagonalSplit variant="hero" photo={photo}>
        <div className="ds-container hero__in">
          <p className="ds-kicker">{h.kicker}</p>
          <h1 id="hero-title" className="ds-h1-thin hero__title">
            {h.title.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </h1>
          <p className="ds-lead hero__lead">{h.lead}</p>
          <div className="hero__cta" ref={ctaRef}>
            <Button href={site.formAnchor} icon="arrow-right" full>
              {site.bookLabel}
            </Button>
          </div>
          <p className="ds-small ds-muted hero__sub">{site.ctaSub}</p>
        </div>
      </DiagonalSplit>
    </section>
  );
}
