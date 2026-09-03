import html from 'virtual:md/personvern';
import { Page } from '../../components/Page';
import { ConsentBar } from '../../components/ConsentBar';
import { personvern } from '../../content/site';

/** Innholdet ligger i content/personvern.md og rendres ved bygg. */
export function App() {
  return (
    <>
      <Page cap>
        <div className="ds-container">
          <div className="sub__intro" style={{ marginBottom: '2rem' }}>
            <p className="ds-kicker">{personvern.kicker}</p>
            <h1 className="ds-h1 sub__title">{personvern.title}</h1>
          </div>
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </Page>
      <ConsentBar />
    </>
  );
}
