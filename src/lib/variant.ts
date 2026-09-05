import { parseVariant } from '../shared/validate';
import { getStoredUtm, getStoredVariant, setStoredUtm, setStoredVariant, type Utm } from './storage';
import type { Variant } from '../content/site';
import { config } from './config';

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
  // Variant A er tatt ut av rotasjon inntil config.heroAEnabled er satt (tillegg til byggebrief 08,
  // 5. september 2026). Faller tilbake til C. Løses her, før noe annet leser variant, slik at hero,
  // «Kjenner du deg igjen»-kortrekkefølgen, tellere og skjemaets skjulte v-felt alle får C, ikke A.
  if (variant === 'a' && !config.heroAEnabled) variant = 'c';
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
