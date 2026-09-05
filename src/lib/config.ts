/** Konfigurasjon som bygges inn i klienten. Alle verdier kommer fra miljøvariabler med prefiks VITE_. */
const env = import.meta.env;

export const config = {
  /** Calendly-lenken til 30-minutterssamtalen. Tom: takkesiden viser telefon-fallback. */
  calendlyUrl: (env.VITE_CALENDLY_URL ?? '').trim(),
  /** Meta pixel-ID. Tom: ingen pixel lastes, uansett samtykke. */
  metaPixelId: (env.VITE_META_PIXEL_ID ?? '').trim(),
  /** Sti til hero-foto, f.eks. «/hero.jpg». Tom: mønsteret vises. Aldri en plassholder. */
  heroPhoto: (env.VITE_HERO_PHOTO ?? '').trim(),
  /**
   * «true» for å ta hero-variant A tilbake inn i rotasjon. Standard «false»: Accountera vil foreløpig
   * ikke bygge kampanjen rundt «kaos-kunden» variant A er skrevet til. Se tillegg til byggebrief 08,
   * 5. september 2026. `?v=a` faller da tilbake til variant C, se src/lib/variant.ts.
   */
  heroAEnabled: (env.VITE_HERO_A_ENABLED ?? '').trim().toLowerCase() === 'true',
  /** «true» når Accountera har godkjent personvernteksten. Før det vises utkast-varselet på /personvern. */
  privacyApproved: (env.VITE_PRIVACY_APPROVED ?? '').trim().toLowerCase() === 'true',
  /**
   * «true» når det foreligger skriftlig «ja» fra kunden sitatet i src/content/site.ts (`testimonial`)
   * kommer fra. Standard «false». Manuell bryter, ingen annen logikk. Se tillegg til byggebrief 08,
   * 4. september 2026, punkt 0.
   */
  quoteApproved: (env.VITE_QUOTE_APPROVED ?? '').trim().toLowerCase() === 'true',
} as const;
