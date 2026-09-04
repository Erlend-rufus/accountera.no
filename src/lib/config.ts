/** Konfigurasjon som bygges inn i klienten. Alle verdier kommer fra miljøvariabler med prefiks VITE_. */
const env = import.meta.env;

export const config = {
  /** Calendly-lenken til 30-minutterssamtalen. Tom: takkesiden viser telefon-fallback. */
  calendlyUrl: (env.VITE_CALENDLY_URL ?? '').trim(),
  /** Meta pixel-ID. Tom: ingen pixel lastes, uansett samtykke. */
  metaPixelId: (env.VITE_META_PIXEL_ID ?? '').trim(),
  /** Sti til hero-foto, f.eks. «/hero.jpg». Tom: mønsteret vises. Aldri en plassholder. */
  heroPhoto: (env.VITE_HERO_PHOTO ?? '').trim(),
  /** «tekst|navn, rolle». Tom: sitatfeltet rendres ikke. Aldri finn på ett. */
  quote: parseQuote(env.VITE_QUOTE),
  /** «true» når Accountera har godkjent personvernteksten. Før det vises utkast-varselet på /personvern. */
  privacyApproved: (env.VITE_PRIVACY_APPROVED ?? '').trim().toLowerCase() === 'true',
} as const;

function parseQuote(raw?: string): { text: string; by: string } | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const [text, by = ''] = s.split('|');
  return text.trim() ? { text: text.trim(), by: by.trim() } : null;
}
