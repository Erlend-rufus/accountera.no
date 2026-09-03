import { patternTile } from '../assets/pattern/tile';

type Props = {
  /** Toner mønsteret ut mot venstre, som i footeren. */
  fadeLeft?: boolean;
  className?: string;
};

/** Merkemønsteret «A + Ξ =» som repeterende SVG-flis. Alltid dekorativt, alltid på navy. */
export function BrandPattern({ fadeLeft = false, className }: Props) {
  const cls = ['ds-pattern', fadeLeft ? 'ds-pattern--fade-left' : '', className].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      aria-hidden="true"
      style={{
        backgroundImage: `url("${patternTile.dataUri}")`,
        backgroundSize: `${patternTile.width}px ${patternTile.height}px`,
      }}
    />
  );
}
