import { Card } from '../../../ds';
import { heroes, recognize, type Variant } from '../../../content/site';

/** Tre kort i kanonisk rekkefølge. På mobil ligger kortet som matcher hero-varianten først (CSS `order`). */
export function Recognize({ variant }: { variant: Variant }) {
  const active = heroes[variant].card;
  return (
    <section className="sec" aria-labelledby="rec-title">
      <div className="ds-container">
        <h2 id="rec-title" className="ds-h2 sec__head">
          {recognize.heading}
        </h2>
        <div className="rec__grid">
          {recognize.cards.map((c) => (
            <Card
              key={c.key}
              notch={c.key === 'byra'}
              className={['rec__card', c.key === active ? 'rec__card--first' : ''].filter(Boolean).join(' ')}
            >
              <h3 className="ds-h3">{c.title}</h3>
              <p>{c.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
