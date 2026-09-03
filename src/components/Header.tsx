import { Icon, Logo } from '../ds';
import { site } from '../content/site';

export function Header() {
  return (
    <header className="hdr">
      <div className="ds-container hdr__in">
        <a className="hdr__logo" href="/" aria-label="Accountera, til forsiden">
          <Logo height={22} />
        </a>
        <a className="hdr__phone" href={site.phoneHref}>
          <Icon name="phone" />
          <span>{site.phoneDisplay}</span>
        </a>
      </div>
    </header>
  );
}
