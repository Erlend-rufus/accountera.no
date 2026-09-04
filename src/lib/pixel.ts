/**
 * Meta Pixel, lastet først etter samtykke. `fbq` finnes ikke på siden før `loadPixel` er kalt.
 * Hendelser sendt før skriptet er lastet, køes av fbq-stubben, slik Metas eget snippet gjør.
 */
import { config } from './config';
import { getConsent, onConsentChange } from './consent';

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...a: unknown[]) => void; push?: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let loaded = false;

function ensureStub(): Fbq {
  if (window.fbq) return window.fbq;
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, args);
    else (fbq.queue as unknown[]).push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  return fbq;
}

/** Laster fbevents.js én gang og sender PageView. Gjør ingenting uten pixel-ID eller uten samtykke. */
export function loadPixel(): boolean {
  if (loaded) return true;
  if (!config.metaPixelId || getConsent() !== 'all') return false;
  const fbq = ensureStub();
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  fbq('init', config.metaPixelId);
  fbq('track', 'PageView');
  loaded = true;
  return true;
}

/** Sender en standardhendelse hvis pixelen er lastet (som forutsetter samtykke). */
export function track(event: 'Lead' | 'Schedule', params: Record<string, unknown> = {}, options: { eventID?: string } = {}) {
  if (!loaded || !window.fbq) return false;
  window.fbq('track', event, params, options.eventID ? { eventID: options.eventID } : undefined);
  return true;
}

export function pixelLoaded() {
  return loaded;
}

/** Kobler pixelen til samtykket: laster ved sidelasting hvis «all» finnes, ellers i det leseren velger «Godta». */
export function bindPixelToConsent(onLoaded?: () => void) {
  if (loadPixel()) onLoaded?.();
  return onConsentChange((c) => {
    if (c === 'all' && loadPixel()) onLoaded?.();
  });
}
