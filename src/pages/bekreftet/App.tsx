import { Button } from '../../ds';
import { Page } from '../../components/Page';
import { ConsentBar } from '../../components/ConsentBar';
import { PrepareCard } from '../takk/PrepareCard';
import { bekreftet, site } from '../../content/site';
import { getBookedWhen } from '../../lib/storage';

export function App() {
  const when = getBookedWhen();
  const title = when ? bekreftet.title(when) : 'Vi ringer deg på tidspunktet du valgte.';

  return (
    <>
      <Page cap>
        <div className="ds-container bekreftet">
          <p className="ds-kicker">{bekreftet.eyebrow}</p>
          <h1 className="ds-h1-thin sub__title" aria-live="polite">
            {title}
          </h1>
          <p className="ds-lead bekreftet__lead">{bekreftet.lead}</p>
          <PrepareCard narrow />
          <Button href="/" variant="secondary" icon="arrow-left" className="bekreftet__back">
            {site.backLabel}
          </Button>
        </div>
      </Page>
      <ConsentBar />
    </>
  );
}
