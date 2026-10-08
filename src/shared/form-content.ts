/**
 * Skjematekster, valg og feilmeldinger. Delt mellom nettleser og funksjonene, slik at tekstene er like.
 * Ingen DOM-avhengigheter her.
 *
 * Fra design-handoff «Ring meg opp» (8. oktober 2026). Alle tekster er ordrett fra README.md i pakken.
 * Navne-, telefon- og firmafeilene er uendret fra forrige versjon (allerede godkjent ordlyd).
 * Nettverksfeilteksten er et forslag (åpen beslutning #6 i arbeidsordren) og skal godkjennes før lansering.
 */
export const labels = {
  name: 'Navn',
  tel: 'Telefon',
  telHint: 'Vi ringer fra et norsk nummer.',
  company: 'Firmanavn',
  har: 'Har du regnskapsfører i dag?',
  program: 'Hvilket regnskapsprogram bruker du i dag?',
  msg: 'Hva gjelder det?',
  optional: 'Valgfritt',
  select: 'Velg',
  submitStep1: 'Ring meg opp',
  sending: 'Sender',
  sentTitle: 'Nummeret er mottatt',
  sentBody: 'Vi tar deg videre.',
  send: 'Send',
  skip: 'Hopp over',
  step2Intro: 'Mens du venter: tre raske spørsmål, så er regnskapsføreren forberedt når vi ringer.',
  step2Done: 'Takk, vi snakkes i løpet av dagen.',
  privacyNote: 'Vi bruker opplysningene bare til å svare på henvendelsen din.',
  privacyLink: 'Personvernerklæring',
  networkError: 'Noe gikk galt, og vi fikk ikke nummeret ditt. Prøv igjen, eller ring oss på 40 15 66 66.',
  errorSummary: 'Noen felt mangler. Sjekk feltene som er merket.',
} as const;

export const HAR_OPTIONS = [
  { value: 'selv', label: 'Nei, jeg fører selv' },
  { value: 'byraa', label: 'Ja, et byrå eller en regnskapsfører' },
  { value: 'ingen', label: 'Nei, ingen fører det ennå' },
] as const;

export const PROGRAM_OPTIONS = [
  'Fiken',
  'Tripletex',
  'Visma eAccounting',
  'PowerOffice Go',
  'Conta',
  '24SevenOffice',
  'Et byrå fører det for oss',
  'Ingen ennå',
  'Annet',
] as const;

export const MSG_MAX = 2000;

export const errors = {
  name: 'Vi trenger navnet ditt for å vite hvem vi skal ringe.',
  company: 'Vi trenger firmanavnet for å finne virksomheten i Enhetsregisteret.',
  telMissing: 'Vi trenger et telefonnummer for å ringe deg tilbake.',
  telInvalid: 'Telefonnummeret må være et norsk nummer med åtte sifre.',
} as const;
