/**
 * Skjematekster, valg og feilmeldinger. Delt mellom nettleser og funksjonen /api/lead, slik at feilmeldingene er like.
 * Ingen DOM-avhengigheter her.
 *
 * Feltnavn og rekkefølge er låst i briefens punkt 5. Valgene i nedtrekkene og feilmeldingene skal kontrolleres
 * ordrett mot «Accountera Landingsside.dc.html» etter runde 2. «Fiken», «Bygg, anlegg og håndverk»,
 * «Landbruk og skogbruk» og «Energi og kraftproduksjon» er bekreftet fra rendringene.
 */
export const labels = {
  name: 'Navn',
  company: 'Firmanavn',
  tel: 'Telefon',
  telHint: 'Vi ringer fra et norsk nummer.',
  email: 'E-post',
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
  name: 'Vi trenger navnet ditt.',
  company: 'Vi trenger navnet på bedriften.',
  telMissing: 'Vi trenger et telefonnummer for å ringe deg tilbake.',
  telInvalid: 'Sjekk telefonnummeret. Åtte sifre, med eller uten +47.',
  emailMissing: 'Vi trenger e-postadressen din for bekreftelsen.',
  emailInvalid: 'Sjekk e-postadressen.',
  program: 'Velg regnskapsprogrammet du bruker i dag.',
  bransje: 'Velg hva bedriften driver med.',
  msgTooLong: 'Meldingen kan være på inntil 2000 tegn.',
} as const;
