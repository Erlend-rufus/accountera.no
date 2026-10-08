/**
 * Validering av to-stegs leadskjemaet. Kjøres både i nettleseren (opplevelsen) og i funksjonene
 * (fordi nettleseren ikke kan stoles på). Samme regler, samme tekster. Ingen DOM-avhengigheter.
 *
 * Steg 1 (navn, telefon, firmanavn) er obligatorisk og valideres strengt. Steg 2 (har/program/msg)
 * er valgfritt i sin helhet og valideres aldri bort - se design-handoff «Ring meg opp», 8. oktober 2026.
 */
import { HAR_OPTIONS, MSG_MAX, PROGRAM_OPTIONS, errors } from './form-content';

export type Step1FieldName = 'name' | 'tel' | 'company';

export type Step1Fields = {
  name: string;
  company: string;
  /** Åtte sifre uten landkode, f.eks. «91234567». */
  tel: string;
  /** Det besøkeren faktisk skrev, bevart for visning («912 34 567», se AO-2 punkt 2). */
  telRaw: string;
};

export type FieldError = { field: Step1FieldName; message: string };

export type ValidationResult = { ok: true; data: Step1Fields } | { ok: false; errors: FieldError[] };

const FIELD_ORDER: Step1FieldName[] = ['name', 'tel', 'company'];

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

/**
 * Norsk mobil- eller fasttelefonnummer: åtte sifre som starter på 2 til 9, med eller uten «+47» / «0047».
 * Mellomrom, bindestrek, punktum og parenteser fjernes før test. Returnerer de åtte sifrene, eller null.
 * Regex er eksakt den arbeidsordren oppgir: `^(\+47|0047)?[2-9]\d{7}$`.
 */
export function normalizePhone(raw: string): string | null {
  const cleaned = str(raw).replace(/[\s\-.()]/g, '');
  const m = /^(?:\+47|0047)?([2-9]\d{7})$/.exec(cleaned);
  return m ? m[1] : null;
}

/** E.164 for Meta: «+4791234567». */
export function toE164(eightDigits: string): string {
  return `+47${eightDigits}`;
}

/** Visning: «91 23 45 67». */
export function formatPhone(eightDigits: string): string {
  return eightDigits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
}

export function validateStep1(input: Record<string, unknown>): ValidationResult {
  const errs: FieldError[] = [];
  const name = str(input.name).trim();
  const telRaw = str(input.tel).trim();
  const company = str(input.company).trim();

  if (!name) errs.push({ field: 'name', message: errors.name });

  let tel = '';
  if (!telRaw) errs.push({ field: 'tel', message: errors.telMissing });
  else {
    const n = normalizePhone(telRaw);
    if (!n) errs.push({ field: 'tel', message: errors.telInvalid });
    else tel = n;
  }

  if (!company) errs.push({ field: 'company', message: errors.company });

  if (errs.length) {
    errs.sort((a, b) => FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field));
    return { ok: false, errors: errs };
  }
  return { ok: true, data: { name, tel, telRaw, company } };
}

/** Steg 2: tre valgfrie spørsmål. Aldri feil, bare sanert. Ukjent/tomt gir tom streng. */
export type HarValue = 'selv' | 'byraa' | 'ingen' | '';

export type Step2Fields = {
  har: HarValue;
  program: string;
  msg: string;
  skipped: boolean;
};

const HAR_VALUES = HAR_OPTIONS.map((o) => o.value) as readonly string[];

export function parseStep2(input: Record<string, unknown>): Step2Fields {
  const har = str(input.har);
  const program = str(input.program).trim();
  return {
    har: (HAR_VALUES.includes(har) ? har : '') as HarValue,
    program: (PROGRAM_OPTIONS as readonly string[]).includes(program) ? program : '',
    msg: str(input.msg).trim().slice(0, MSG_MAX),
    skipped: input.skipped === true,
  };
}

/** Skjulte felt som følger med steg 1. */
export type LeadMeta = {
  v: 'a' | 'b' | 'c';
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  fbclid: string;
  pageUrl: string;
  clientEventId: string;
  t0: number;
  consent: 'all' | 'necessary' | '';
};

export function parseVariant(v: unknown): 'a' | 'b' | 'c' {
  return v === 'b' || v === 'c' ? v : 'a';
}

export function parseMeta(input: Record<string, unknown>): LeadMeta {
  const t0 = Number(input.t0);
  const c = input.consent;
  return {
    v: parseVariant(input.v),
    utm_source: str(input.utm_source).slice(0, 200),
    utm_medium: str(input.utm_medium).slice(0, 200),
    utm_campaign: str(input.utm_campaign).slice(0, 200),
    utm_content: str(input.utm_content).slice(0, 200),
    utm_term: str(input.utm_term).slice(0, 200),
    fbclid: str(input.fbclid).slice(0, 500),
    pageUrl: str(input.pageUrl).slice(0, 500),
    clientEventId: str(input.clientEventId).trim().slice(0, 100),
    t0: Number.isFinite(t0) ? t0 : NaN,
    consent: c === 'all' || c === 'necessary' ? c : '',
  };
}

export const SPAM_MIN_MS = 3000;

/**
 * Stille avvisning: honningfelle fylt ut, eller innsending mindre enn tre sekunder etter t0.
 * Mangler t0 helt, har ikke skjemaet kjørt i en vanlig nettleser. Negativ avstand (klokkeskjevhet) slippes gjennom.
 */
export function isSpam(input: Record<string, unknown>, now: number): boolean {
  if (str(input.website).trim() !== '') return true;
  const t0 = Number(input.t0);
  if (!Number.isFinite(t0)) return true;
  const elapsed = now - t0;
  return elapsed >= 0 && elapsed < SPAM_MIN_MS;
}
