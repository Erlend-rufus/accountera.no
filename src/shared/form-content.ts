/**
 * Skjematekster, valg og feilmeldinger. Delt mellom nettleser og funksjonen /api/lead, slik at feilmeldingene er like.
 * Ingen DOM-avhengigheter her.
 *
 * Feltnavn og rekkefølge er låst i briefens punkt 5, utvidet med feltet `regnskapsforer` (tillegg til
 * byggebrief 08, 5. september 2026, inn før `program`). Feilmeldingene under `errors` er godkjent ord
 * for ord (rettelse fra co-work-chatten, 4. september 2026), unntatt `regnskapsforer`, som er nytt og
 * følger samme mønster men ikke er ordrett godkjent av noen kilde. Valgene i program/bransje-nedtrekkene
 * skal fortsatt kontrolleres mot «Accountera Landingsside.dc.html» etter runde 2. «Fiken», «Bygg, anlegg
 * og håndverk», «Landbruk og skogbruk» og «Energi og kraftproduksjon» er bekreftet fra rendringene.
 */
export const labels = {
  name: 'Navn',
  company: 'Firmanavn',
  tel: 'Telefon',
  telHint: 'Vi ringer fra et norsk nummer.',
  email: 'E-post',
  regnskapsforer: 'Har du regnskapsfører i dag?',
  program: 'Hvilket regnskapsprogram bruker du i dag?',
  bransje: 'Hva driver bedriften med?',
  msg: 'Hva gjelder det?',
  optional: 'valgfritt',
  select: 'Velg',
  submit: 'Send og velg tidspunkt',
  sending: 'Sender',
  privacyNote: 'Vi bruker opplysningene bare til å svare på henvendelsen din.',
  privacyLink: 'Personvernerklæring',
  networkError: 'Vi fikk ikke sendt meldingen. Prøv igjen, eller ring 40 15 66 66.',
  errorSummary: 'Noen felt mangler. Sjekk feltene som er merket.',
} as const;

export const REGNSKAPSFORER_OPTIONS = [
  'Ja, jeg bruker et regnskapsbyrå',
  'Nei, jeg fører selv',
  'Nei, men jeg har hatt det tidligere',
] as const;

/** ClickUp-tagg per svar. Måler sammensetningen av henvendelser, påvirker ikke kvalifisering. */
export const REGNSKAPSFORER_TAGS: Record<string, string> = {
  'Ja, jeg bruker et regnskapsbyrå': 'har-byraa',
  'Nei, jeg fører selv': 'foerer-selv',
  'Nei, men jeg har hatt det tidligere': 'tidligere-byraa',
};

export const PROGRAM_OPTIONS = [
  'Fiken',
  'Tripletex',
  'Visma eAccounting',
  'PowerOffice Go',
  'Conta',
  'Regneark eller papir',
  'Et annet program',
  'Byrået mitt fører alt',
] as const;

export const BRANSJE_OPTIONS = [
  'Bygg, anlegg og håndverk',
  'Butikk og netthandel',
  'Restaurant, kafé og servering',
  'Transport og logistikk',
  'Konsulent og rådgivning',
  'IT og teknologi',
  'Helse, frisør og velvære',
  'Eiendom og utleie',
  'Landbruk og skogbruk',
  'Energi og kraftproduksjon',
  'Annet',
] as const;

/** Bransjer som gir utfallet «diskvalifisert». Objektiv test på skjemasvaret, ingen vurdering. */
export const DISQUALIFYING_BRANSJER: readonly string[] = ['Landbruk og skogbruk', 'Energi og kraftproduksjon'];

export const MSG_MAX = 2000;

export const errors = {
  name: 'Vi trenger navnet ditt for å vite hvem vi skal ringe.',
  company: 'Vi trenger firmanavnet for å finne virksomheten i Enhetsregisteret.',
  telMissing: 'Vi trenger et telefonnummer for å ringe deg tilbake.',
  telInvalid: 'Telefonnummeret må være et norsk nummer med åtte sifre.',
  emailMissing: 'Vi trenger e-postadressen for å sende deg bekreftelsen på tidspunktet.',
  emailInvalid: 'Sjekk e-postadressen. Den ser ikke ut til å være gyldig.',
  regnskapsforer: 'Velg det som stemmer for dere i dag.',
  program: 'Velg det som ligger nærmest, så vet regnskapsføreren hvor dere står.',
  bransje: 'Velg bransjen som ligger nærmest.',
  msgTooLong: 'Meldingen kan være på inntil 2000 tegn.',
} as const;
