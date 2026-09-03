import { parseVariant } from '../shared/validate';
import { getStoredUtm, getStoredVariant, setStoredUtm, setStoredVariant, type Utm } from './storage';
import type { Variant } from '../content/site';

/**
 * Leser ?v= og UTM/fbclid fra URL ved lasting og lagrer dem i sessionStorage.
 * URL vinner over lagret verdi. Ukjent eller manglende verdi gir «a».
 */
export function initVariant(): { variant: Variant; utm: Utm } {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('v');
  let variant: Variant;
  if (fromUrl !== null) {
    variant = parseVariant(fromUrl.toLowerCase());
  } else {
    const stored = getStoredVariant();
    variant = stored ? parseVariant(stored) : 'a';
  }
  setStoredVariant(variant);

  const stored = getStoredUtm();
  const pick = (k: keyof Utm) => (params.get(k) ?? stored[k] ?? '').slice(0, 500);
  const utm: Utm = {
    utm_source: pick('utm_source'),
    utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
    utm_content: pick('utm_content'),
    fbclid: pick('fbclid'),
  };
  setStoredUtm(utm);
  return { variant, utm };
}
