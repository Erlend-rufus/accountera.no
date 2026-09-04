/**
 * Samtykke for Meta Pixel. Valget lagres i localStorage som `acc_consent`, som er nødvendig for å huske valget.
 * Ingen Meta-skript, ingen fbq, ingen CAPI før «Godta».
 */
export type Consent = 'all' | 'necessary';
const KEY = 'acc_consent';
const listeners = new Set<(c: Consent | null) => void>();

export function getConsent(): Consent | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'all' || v === 'necessary' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(c: Consent) {
  try {
    window.localStorage.setItem(KEY, c);
  } catch {
    /* ignorer: valget gjelder da bare denne visningen */
  }
  listeners.forEach((fn) => fn(c));
}

export function onConsentChange(fn: (c: Consent | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
