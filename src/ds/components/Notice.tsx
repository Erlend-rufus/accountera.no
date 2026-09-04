import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** Melding i ramme. `role="status"` gir skjermlesere beskjed uten å avbryte. */
export function Notice({ children, className, role = 'status' }: { children: ReactNode; className?: string; role?: 'status' | 'alert' }) {
  return (
    <div className={['ds-notice', className].filter(Boolean).join(' ')} role={role} aria-live={role === 'alert' ? 'assertive' : 'polite'}>
      <Icon name="info" />
      <div>{children}</div>
    </div>
  );
}
