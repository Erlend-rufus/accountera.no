import { DiagonalSplit, Logo } from '../ds';
import { site } from '../content/site';

type Props = {
  /** Skrå hette over footeren (undersidene). Forsiden har rett overkant. */
  cap?: boolean;
  /** Lenke til skjemaet. Bare på forsiden. */
  showBook?: boolean;
};

export function Footer({ cap = false, showBook = false }: Props) {
  return (
    <DiagonalSplit variant="footer" cap={cap}>
      <footer className={['ftr', cap ? '' : 'ftr--flat'].filter(Boolean).join(' ')}>
        <div className="ds-container ftr__in">
          <div className="ftr__brand">
            <Logo variant="lockup" height={44} />
            <p>{site.footerLine}</p>
          </div>
          <div className="ftr__links">
            <a className="ftr__phone" href={site.phoneHref}>
              {site.phoneDisplay}
            </a>
            {showBook && (
              <a className="ds-link" href={site.formAnchor}>
                {site.bookLabel}
              </a>
            )}
            <a className="ds-link" href={site.privacyHref}>
              {site.privacyLabel}
            </a>
          </div>
        </div>
      </footer>
    </DiagonalSplit>
  );
}
