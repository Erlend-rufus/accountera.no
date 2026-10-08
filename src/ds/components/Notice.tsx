import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Props = {
  children: ReactNode;
  className?: string;
  role?: 'status' | 'alert';
  tone?: 'info' | 'success';
  title?: string;
};

/** Melding i ramme. `role="status"` gir skjermlesere beskjed uten å avbryte. Aldri rødt, uansett tone. */
export function Notice({ children, className, role = 'status', tone = 'info', title }: Props) {
  return (
    <div className={['ds-notice', tone === 'success' ? 'ds-notice--success' : '', className].filter(Boolean).join(' ')} role={role} aria-live={role === 'alert' ? 'assertive' : 'polite'}>
      <Icon name="info" />
      <div>
        {title && <p className="ds-notice__title">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
