import type { ElementType, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  variant?: 'surface' | 'outline';
  /** Skrått hjørne nede til høyre (36°). */
  notch?: boolean;
  as?: ElementType;
  className?: string;
};

export function Card({ children, variant = 'surface', notch = false, as: Tag = 'div', className }: Props) {
  const cls = ['ds-card', variant === 'outline' ? 'ds-card--outline' : '', notch ? 'ds-card--notch' : '', className]
    .filter(Boolean)
    .join(' ');
  return <Tag className={cls}>{children}</Tag>;
}
