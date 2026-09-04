import { wordmark, tagline, lockup } from '../assets/logo/paths';

type Props = {
  /** `wordmark`: ACCOUNTΞRA alene. `lockup`: med «Autorisert regnskapsførerselskap» under. */
  variant?: 'wordmark' | 'lockup';
  /** Høyde i px. Bredden følger. */
  height?: number;
  className?: string;
  /** Tilgjengelig navn. Lockup bruker sin egen standard. */
  label?: string;
};

/** Logoen som vektor. Firmanavnet skrives aldri som tekst der det skal være logo. Farge via `currentColor`. */
export function Logo({ variant = 'wordmark', height, className, label }: Props) {
  const cls = ['ds-logo', className].filter(Boolean).join(' ');
  if (variant === 'wordmark') {
    const h = height ?? 22;
    const w = (h * wordmark.width) / wordmark.height;
    return (
      <svg
        className={cls}
        viewBox={`0 ${wordmark.minY} ${wordmark.width} ${wordmark.height}`}
        width={round(w)}
        height={h}
        role="img"
        aria-label={label ?? 'Accountera'}
        fill="currentColor"
        focusable="false"
      >
        <path d={wordmark.d} />
      </svg>
    );
  }
  const h = height ?? 40;
  const w = (h * wordmark.width) / lockup.height;
  const taglineY = wordmark.height + lockup.gap - tagline.minY * tagline.scale;
  return (
    <svg
      className={cls}
      viewBox={`0 0 ${wordmark.width} ${lockup.height}`}
      width={round(w)}
      height={h}
      role="img"
      aria-label={label ?? 'Accountera, autorisert regnskapsførerselskap'}
      fill="currentColor"
      focusable="false"
    >
      <g transform={`translate(0 ${-wordmark.minY})`}>
        <path d={wordmark.d} />
      </g>
      <g opacity="0.72" transform={`translate(0 ${taglineY}) scale(${tagline.scale})`}>
        <path d={tagline.d} />
      </g>
    </svg>
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
