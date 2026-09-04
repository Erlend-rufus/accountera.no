import html from 'virtual:md/personvern';
import { Page } from '../../components/Page';
import { ConsentBar } from '../../components/ConsentBar';
import { personvern } from '../../content/site';
import { config } from '../../lib/config';

const DRAFT_NOTICE = 'Utkast. Skal godkjennes av Accountera før lansering. Dette er ikke juridisk rådgivning.';

/** Innholdet ligger i content/personvern.md og rendres ved bygg. Utkast-varselet styres av VITE_PRIVACY_APPROVED. */
export function App() {
  return (
    <>
      <Page cap>
        <div className="ds-container">
          <div className="sub__intro" style={{ marginBottom: '2rem' }}>
            <p className="ds-kicker">{personvern.kicker}</p>
            <h1 className="ds-h1 sub__title">{personvern.title}</h1>
          </div>
          {!config.privacyApproved && (
            <div className="prose" style={{ marginBottom: '1rem' }}>
              <p>
                <strong>{DRAFT_NOTICE}</strong>
              </p>
            </div>
          )}
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </Page>
      <ConsentBar />
    </>
  );
}
