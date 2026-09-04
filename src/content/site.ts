/**
 * Felles tekster. Transkribert ordrett fra Claude Design-rendringene (runde 1) med runde 2-endringene i briefen.
 * Skal kontrolleres mot «Accountera Landingsside.dc.html» etter runde 2 når filen foreligger. Ikke omskriv.
 */
export const site = {
  name: 'Accountera',
  phoneDisplay: '40 15 66 66',
  phoneHref: 'tel:+4740156666',
  footerLine: 'Kristiansand. Kunder over hele landet.',
  privacyLabel: 'Personvernerklæring',
  privacyHref: '/personvern',
  bookLabel: 'Book en samtale',
  backLabel: 'Tilbake til forsiden',
  ctaSub: 'Uforpliktende. Du snakker med en regnskapsfører, ikke en selger.',
  formAnchor: '#skjema',
  titles: {
    index: 'Accountera – regnskapsbyrå i Kristiansand',
    takk: 'Takk – velg et tidspunkt',
    takkerNei: 'Takk for henvendelsen',
    personvern: 'Personvernerklæring – Accountera',
  },
} as const;

export type Variant = 'a' | 'b' | 'c';
export type CardKey = 'selv' | 'brev' | 'byra';

export const heroes: Record<
  Variant,
  { kicker: string; title: readonly string[]; lead: string; card: CardKey }
> = {
  a: {
    kicker: 'For deg som fører regnskapet selv',
    title: ['Fått brev fra Skatteetaten?', 'Vi leser det sammen med deg.'],
    lead: 'Du får en autorisert regnskapsfører som ser på brevet, finner ut hva som er feil, og sier hva som må gjøres. 30 minutter, uforpliktende.',
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
      title: 'En samtale på 30 minutter.',
      body: 'Du forteller hvor skoen trykker. Vi sier ærlig om vi er riktig byrå for deg.',
    },
    {
      title: 'Du får én fast regnskapsfører.',
      body: 'Ett menneske som kjenner bedriften din og svarer på e-post og telefon.',
    },
    {
      title: 'Vi ordner overgangen.',
      body: 'Fra forrige byrå eller fra programmet du fører i selv. Du slipper å sitte i midten.',
    },
  ],
};

export const team = {
  heading: ['Sju mennesker i Kristiansand.', 'Ikke et servicesenter.'],
  body: 'Kunder over hele landet, men alle som jobber her sitter i samme lokale. Når du ringer, svarer den som fører regnskapet ditt.',
};

export const proof = {
  heading: ['Fortell oss kort hva', 'det gjelder'],
  lead: 'Fyll ut skjemaet, så velger du et tidspunkt for samtalen med en gang. Samtalen tar 30 minutter og er uforpliktende.',
  facts: ['Autorisert regnskapsførerselskap', 'Sju ansatte i Kristiansand', 'Kunder over hele landet'],
};

/**
 * Kundesitat ved skjemaet, statisk tekst (ikke CMS, ikke database). Fra en kunde Sondre ringte
 * 4. september 2026. Gates bak config.quoteApproved, som er «false» inntil skriftlig «ja»
 * foreligger, se tillegg til byggebrief 08. Ikke omskriv. Ingen navn, firmanavn eller by.
 *
 * Kunden ga tre sitater. Et tredje («byttet på grunn av pris») skal aldri brukes: kampanjens
 * premiss er at usikkerhet er smertepunktet, ikke pris. To sitater finnes her for rotasjon;
 * uten en rotasjonskomponent vises «primary» alene, som avtalt i tillegget.
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

export const takk = {
  kicker: 'Meldingen er sendt',
  titleWithName: (firstName: string) => `Takk, ${firstName}. Velg et tidspunkt som passer deg.`,
  titleNoName: 'Takk. Velg et tidspunkt som passer deg.',
  lead: 'Så ringer en av regnskapsførerne våre deg på tidspunktet du velger. Ikke et servicesenter, ikke en selger.',
  prepare: {
    heading: 'Ha gjerne dette klart',
    items: [
      'Hvilket regnskapsprogram du bruker i dag',
      'Omtrent hvor mange bilag du har i måneden',
      'Eventuelle brev fra Skatteetaten',
    ],
  },
  noTimeBefore: 'Passer ingen av tidene? Ring ',
  noTimeAfter: ', eller vent, så ringer vi deg.',
  calendlyFailed: 'Kalenderen lastet ikke. Vi ringer deg i stedet.',
  calendlyLoading: 'Kalenderen laster.',
  confirmed: {
    kicker: 'Tidspunkt bekreftet',
    titleWithTime: (when: string) => `Vi ringer deg ${when}.`,
    titleNoTime: 'Vi ringer deg på tidspunktet du valgte.',
    lead: 'Du får en bekreftelse på e-post. Samtalen tas av en regnskapsfører, ikke et servicesenter.',
  },
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
