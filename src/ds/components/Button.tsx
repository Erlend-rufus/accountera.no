import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

type Common = {
  variant?: 'primary' | 'secondary';
  icon?: 'arrow-right' | 'arrow-left';
  full?: boolean;
  children: ReactNode;
  className?: string;
};
type AsButton = Common & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;
type AsLink = Common & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'>;

/** Én primærknapp per skjerm. Lenke når `href` er satt, ellers `<button>`. */
export function Button(props: AsButton | AsLink) {
  const { variant = 'primary', icon, full, children, className, ...rest } = props;
  const cls = ['ds-btn', `ds-btn--${variant}`, full ? 'ds-btn--full' : '', className].filter(Boolean).join(' ');
  const inner = (
    <>
      {icon === 'arrow-left' && <Icon name="arrow-left" className="ds-btn__icon" />}
      <span>{children}</span>
      {icon === 'arrow-right' && <Icon name="arrow-right" className="ds-btn__icon" />}
    </>
  );
  if ('href' in rest && typeof rest.href === 'string') {
    const a = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a className={cls} {...a}>
        {inner}
      </a>
    );
  }
  const b = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type="button" className={cls} {...b}>
      {inner}
    </button>
  );
}
