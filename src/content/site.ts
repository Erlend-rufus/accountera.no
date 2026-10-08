/**
 * Felles tekster. Fra design-handoff «Ring meg opp» (8. oktober 2026), README.md, ordrett. Ikke omskriv.
 * Unntak markert i kommentar: nettverksfeil (åpen beslutning #6) og meta-beskrivelsen (åpen beslutning #9)
 * er forslag som skal godkjennes før lansering, ikke avtalt tekst.
 */
export const site = {
  name: 'Accountera',
  phoneDisplay: '40 15 66 66',
  phoneHref: 'tel:+4740156666',
  footerLine: 'Kristiansand. Kunder over hele landet.',
  privacyLabel: 'Personvernerklæring',
  privacyHref: '/personvern',
  ringLabel: 'Ring meg opp',
  backLabel: 'Tilbake til forsiden',
  ctaSub: 'Legg igjen nummeret, så ringer en regnskapsfører deg i løpet av dagen. Uforpliktende.',
  /** Standard av (AO-5). Vises under hero-knappen og skjema-knappen når config.weekendEveningBannerEnabled er på. */
  weekendEveningNote: 'Sender du inn kveld eller helg, ringer vi neste virkedag.',
  formAnchor: '#acc-form',
  heroCtaId: 'acc-hero-cta',
  titles: {
    index: 'Accountera – ring oss, regnskapsbyrå i Kristiansand',
    takk: 'Nummeret er mottatt – Accountera',
    bekreftet: 'Tidspunkt bekreftet – Accountera',
    takkerNei: 'Takk for henvendelsen – Accountera',
    personvern: 'Personvernerklæring – Accountera',
  },
  /**
   * Forslag (åpen beslutning #9 i arbeidsordren). Ikke publisert som endelig - lagt fram til
   * godkjenning sammen med resten av forhåndsvisningen. Ingen «30 minutter», «Book en samtale»,
   * pris eller tidsløfte strengere enn «i løpet av dagen».
   */
  metaDescription:
    'Legg igjen navn, telefon og firmanavn, så ringer en regnskapsfører deg i løpet av dagen. Autorisert regnskapsførerselskap i Kristiansand.',
} as const;

export type Variant = 'a' | 'b' | 'c';
export type CardKey = 'selv' | 'brev' | 'byra';

export const heroes: Record<
  Variant,
  { kicker: string; title: readonly string[]; lead: string; card: CardKey }
> = {
  a: {
    kicker: 'For deg som fører regnskapet selv',
    // Linjeskift mellom disse to kun på desktop (hero__break--desktop i Hero.tsx). Hardt mellomrom
    // mellom «Vi» og «leser» slik at «Vi» aldri står alene på slutten av en linje.
    title: ['Fått brev fra Skatteetaten?', 'Vi leser det sammen med deg.'],
    lead: 'Du får en autorisert regnskapsfører som ser på brevet, finner ut hva som er feil, og sier hva som må gjøres.',
    card: 'brev',
  },
  b: {
    kicker: 'Regnskapsbyrå i Kristiansand, kunder over hele landet',
    title: ['Du har ført regnskapet selv.', 'Nå har bedriften vokst fra det.'],
    lead: 'Én person tar over der du slipper, og svarer på norsk når du ringer. Du beholder oversikten, vi tar bilag, mva, lønn og årsoppgjør.',
    card: 'selv',
  },
  c: {
    kicker: 'Én fast regnskapsfører, fastpris',
    title: ['Du har et byrå,', 'men får ikke svar når du spør.'],
    lead: 'Hos oss svarer den som fører regnskapet ditt. Samme person neste gang du ringer. Fastpris hver måned, ingen oppsamlede regninger etter årsoppgjøret.',
    card: 'byra',
  },
};

export const recognize = {
  heading: 'Kjenner du deg igjen?',
  /** Kanonisk rekkefølge (desktop). På mobil flyttes kortet som matcher varianten først. */
  cards: [
    {
      key: 'selv',
      title: 'Du har ført regnskapet selv, og bedriften har vokst fra det.',
      body: 'Vi tar over der du slipper, med tilgang til det du allerede har ført.',
    },
    {
      key: 'brev',
      title: 'Du har fått brev fra Skatteetaten og vet ikke hva som er feil.',
      body: 'Vi leser brevet sammen med deg, finner feilen og svarer for deg.',
    },
    {
      key: 'byra',
      title: 'Du har et byrå, men får ikke svar når du spør.',
      body: 'Hos oss har du én fast regnskapsfører. Samme person neste gang du ringer.',
    },
  ] as readonly { key: CardKey; title: string; body: string }[],
};

export const how = {
  heading: 'Slik fungerer det',
  steps: [
    {
      title: 'Du legger igjen nummeret ditt.',
      body: 'Navn, telefon og firmanavn. Ingen forpliktelser.',
    },
    {
      title: 'En regnskapsfører ringer deg i løpet av dagen.',
      body: 'Du forteller hvor skoen trykker. Vi sier ærlig om vi er riktig byrå for deg.',
    },
    {
      title: 'Du får én fast regnskapsfører, og vi ordner overgangen.',
      body: 'Fra forrige byrå eller fra programmet du fører i selv. Du slipper å sitte i midten.',
    },
  ],
};

export const team = {
  heading: ['Sju mennesker i Kristiansand.', 'Ikke et servicesenter.'],
  body: 'Kunder over hele landet, men alle som jobber her sitter i samme lokale. Når du ringer, svarer den som fører regnskapet ditt.',
};

export const proof = {
  heading: 'Legg igjen nummeret ditt',
  lead: 'Så ringer en regnskapsfører deg i løpet av dagen. Du snakker med en regnskapsfører, ikke en selger.',
  facts: ['Autorisert regnskapsførerselskap', 'Sju ansatte i Kristiansand', 'Kunder over hele landet'],
};

/**
 * Kundesitat ved skjemaet, statisk tekst (ikke CMS, ikke database). Gates bak config.quoteApproved.
 * Uendret fra forrige versjon - se tillegg til byggebrief 08. Ikke omskriv.
 */
export const testimonial = {
  primary: {
    quote: 'Jeg får rask og god tilbakemelding, de står alltid på og er tilgjengelig for oss. God service',
    credit: 'Daglig leder, omsorgsbransjen',
  },
  secondary: {
    quote: 'Forskjellen er at Accountera er mye mer effektiv',
    credit: 'Daglig leder, omsorgsbransjen',
  },
} as const;

export const consent = {
  text: 'Vi bruker informasjonskapsler fra Meta for å måle annonsene våre.',
  accept: 'Godta',
  necessary: 'Bare nødvendige',
};

/** Samme «Ha gjerne dette klart»-kort på takkesiden og bekreftet-siden. */
export const prepare = {
  heading: 'Ha gjerne dette klart',
  items: ['Hvilket regnskapsprogram du bruker i dag', 'Omtrent hvor mange bilag du har i måneden', 'Eventuelle brev fra Skatteetaten'],
};

export const takk = {
  eyebrow: 'Nummeret er mottatt',
  /** «Takk, Kari. Vi ringer deg på 912 34 567 i løpet av dagen.» Tallet med hardt mellomrom, ikke vanlig. */
  title: (firstName: string, telRaw: string) => `Takk, ${firstName}. Vi ringer deg på ${telRaw.replace(/ /g, ' ')} i løpet av dagen.`,
  step2: {
    eyebrowLabel: 'Valgfritt',
    intro: 'Mens du venter: tre raske spørsmål, så er regnskapsføreren forberedt når vi ringer.',
    done: 'Takk, vi snakkes i løpet av dagen.',
  },
  calendlyPrompt: 'Vil du heller velge tidspunkt selv? ',
  calendlyLink: 'Book en samtale.',
  calendlyFallbackBefore: 'Passer ingen av tidene? Ring ',
  calendlyFallbackAfter: ', eller vent, så ringer vi deg.',
  calendlyFailed: 'Kalenderen lastet ikke. Vi ringer deg i stedet.',
  calendlyLoading: 'Kalenderen laster.',
};

export const bekreftet = {
  eyebrow: 'Tidspunkt bekreftet',
  title: (when: string) => `Vi ringer deg ${when}.`,
  lead: 'Du får en bekreftelse på e-post. Samtalen tas av en regnskapsfører, ikke et servicesenter.',
};

export const takkerNei = {
  kicker: 'Takk for henvendelsen',
  title: 'Vi er ikke riktig byrå for dere.',
  lead: 'Regnskap for landbruk og kraftproduksjon krever spesialkompetanse vi ikke har, og vi vil heller si det nå enn å gjøre en halvgod jobb.',
  note: 'Endrer situasjonen seg, er du velkommen tilbake.',
  helpHeading: 'Dette kan hjelpe deg videre',
  help: [
    {
      term: 'Landbruk og skogbruk:',
      text: 'se etter et byrå med egen landbruksavdeling. Spør om de fører for gårdsbruk i dag, og om du får én fast kontaktperson.',
    },
    {
      term: 'Kraftproduksjon:',
      text: 'se etter et byrå som allerede fører for kraftprodusenter. Skatte- og avgiftsreglene er egne, og erfaring teller.',
    },
    {
      term: 'Brev fra Skatteetaten:',
      text: 'Skatteetaten svarer på telefon og chat om brev du har fått, også om fristene som står i brevet.',
    },
  ],
};

export const personvern = {
  kicker: 'Personvern',
  title: 'Personvernerklæring',
};
