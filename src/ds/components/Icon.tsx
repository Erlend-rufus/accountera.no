type Name = 'arrow-right' | 'arrow-left' | 'phone' | 'chevron-down' | 'alert' | 'info';

const paths: Record<Name, string> = {
  'arrow-right': 'M4 12h16m0 0-6-6m6 6-6 6',
  'arrow-left': 'M20 12H4m0 0 6-6m-6 6 6 6',
  phone:
    'M5.5 3h3l1.6 4.2-2 1.4a11.5 11.5 0 0 0 5.3 5.3l1.4-2 4.2 1.6v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3.5 5.2 2 2 0 0 1 5.5 3Z',
  'chevron-down': 'm6 9 6 6 6-6',
  alert: 'M12 8v5m0 3h.01M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z',
  info: 'M12 11v5m0-8h.01M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z',
};

/** Strekikoner, 24-rutenett, 1,75 px strek, farge via `currentColor`. */
export function Icon({ name, className }: { name: Name; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
