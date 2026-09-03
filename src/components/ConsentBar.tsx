import { useEffect, useState } from 'react';
import { Button } from '../ds';
import { consent as text, site } from '../content/site';
import { getConsent, onConsentChange, setConsent, type Consent } from '../lib/consent';

/**
 * Samtykkelinje nederst ved første besøk. To knapper med lik vekt: nei skal være like lett som ja.
 * `onChange` lar siden vite når valget er tatt (sticky CTA på mobil venter på det).
 */
export function ConsentBar({ onChange }: { onChange?: (c: Consent | null) => void }) {
  const [value, setValue] = useState<Consent | null>(() => getConsent());

  useEffect(() => {
    onChange?.(value);
    return onConsentChange((c) => {
      setValue(c);
      onChange?.(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (value) return null;

  return (
    <div className="consent" role="region" aria-label="Informasjonskapsler">
      <p className="consent__text">
        {text.text}{' '}
        <a className="ds-link" href={site.privacyHref}>
          {site.privacyLabel}
        </a>
      </p>
      <div className="consent__actions">
        <Button variant="secondary" onClick={() => setConsent('all')}>
          {text.accept}
        </Button>
        <Button variant="secondary" onClick={() => setConsent('necessary')}>
          {text.necessary}
        </Button>
      </div>
    </div>
  );
}
