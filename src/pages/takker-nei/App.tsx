import { Button } from '../../ds';
import { Page } from '../../components/Page';
import { ConsentBar } from '../../components/ConsentBar';
import { site, takkerNei } from '../../content/site';

/**
 * Siden finnes, men ingen sti fra skjemaet fører hit lenger: steg 1 samler ikke inn bransje, så
 * det finnes ingen automatisk avvisning (design-handoff «Ring meg opp», 8. oktober 2026, AO-7).
 * Bare nådd via direkte lenke, f.eks. fra manuell oppfølging.
 */
export function App() {
  return (
    <>
      <Page cap>
        <div className="ds-container sub__grid sub__grid--wide">
          <div className="sub__intro">
            <p className="ds-kicker">{takkerNei.kicker}</p>
            <h1 className="ds-h1 sub__title">{takkerNei.title}</h1>
            <p className="ds-lead">{takkerNei.lead}</p>
            <p>{takkerNei.note}</p>
            <div>
              <Button href="/" variant="secondary" icon="arrow-left" full>
                {site.backLabel}
              </Button>
            </div>
          </div>
          <div className="sub__aside">
            <h2 className="ds-h2" style={{ fontSize: '1.5rem' }}>
              {takkerNei.helpHeading}
            </h2>
            <div className="help">
              {takkerNei.help.map((h) => (
                <p className="help__item" key={h.term}>
                  <b>{h.term}</b> {h.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Page>
      <ConsentBar />
    </>
  );
}
