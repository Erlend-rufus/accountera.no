import type { ReactNode } from 'react';
import { BrandPattern } from './BrandPattern';

type HeroProps = {
  variant: 'hero';
  /** Foto i stedet for mønster. Ikke i bruk før det finnes bilder. Aldri plassholder. */
  photo?: { src: string; alt: string } | null;
  children?: ReactNode;
  className?: string;
};
type FooterProps = {
  variant: 'footer';
  /** `false` gir rett overkant uten hette (forsiden). */
  cap?: boolean;
  children?: ReactNode;
  className?: string;
};

/**
 * Diagonalen på 36°. `hero`: navy panel øverst til høyre (blokk øverst på mobil).
 * `footer`: navy flate som skrår opp mot høyre over footeren.
 */
export function DiagonalSplit(props: HeroProps | FooterProps) {
  if (props.variant === 'hero') {
    const { photo, children, className } = props;
    return (
      <div className={['ds-diag', 'ds-diag--hero', className].filter(Boolean).join(' ')}>
        <div className="ds-diag__panel" aria-hidden="true">
          {photo ? <img className="ds-diag__photo" src={photo.src} alt="" loading="eager" /> : <BrandPattern />}
        </div>
        <div className="ds-diag__content">{children}</div>
      </div>
    );
  }
  const { cap = true, children, className } = props;
  return (
    <div className={['ds-diag', 'ds-diag--footer', cap ? '' : 'ds-diag--flat', className].filter(Boolean).join(' ')}>
      <div className="ds-diag__panel" aria-hidden="true">
        <BrandPattern fadeLeft />
      </div>
      <div className="ds-diag__content">{children}</div>
    </div>
  );
}
