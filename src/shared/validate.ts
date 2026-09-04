/**
 * Validering av skjemaet. Kjøres både i nettleseren (opplevelsen) og i funksjonen (fordi nettleseren ikke kan stoles på).
 * Samme regler, samme tekster. Ingen DOM-avhengigheter.
 */
import { BRANSJE_OPTIONS, DISQUALIFYING_BRANSJER, MSG_MAX, PROGRAM_OPTIONS, errors } from './form-content';

export type LeadFieldName = 'name' | 'company' | 'tel' | 'email' | 'program' | 'bransje' | 'msg';

export type LeadFields = {
  name: string;
  company: string;
  /** Åtte sifre uten landkode, f.eks. «40156666». */
  tel: string;
  email: string;
  program: string;
  bransje: string;
  msg: string;
};

export type FieldError = { field: LeadFieldName; message: string };

export type ValidationResult = { ok: true; data: LeadFields } | { ok: false; errors: FieldError[] };

export type Outcome = 'kvalifisert' | 'diskvalifisert';

const FIELD_ORDER: LeadFieldName[] = ['name', 'company', 'tel', 'email', 'program', 'bransje', 'msg'];

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

/**
 * Norsk mobil- eller fasttelefonnummer: åtte sifre som starter på 2 til 9, med eller uten «+47» / «0047».
 * Mellomrom, bindestrek, punktum og parenteser fjernes før test. Returnerer de åtte sifrene, eller null.
 */
export function normalizePhone(raw: string): string | null {
  const cleaned = str(raw).replace(/[\s\-.()]/g, '');
  const m = /^(?:\+47|0047|47)?([2-9]\d{7})$/.exec(cleaned);
  return m ? m[1] : null;
}

/** E.164 for Meta og ClickUp: «+4740156666». */
export function toE164(eightDigits: string): string {
  return `+47${eightDigits}`;
}

/** Visning: «40 15 66 66». */
export function formatPhone(eightDigits: string): string {
  return eightDigits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
}

export function isValidEmail(raw: string): boolean {
  const s = str(raw).trim();
  if (s.length < 5 || s.length > 254) return false;
  // Ett @, ingen mellomrom, domene med minst ett punktum og gyldige tegn.
  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(s);
}

export function decideOutcome(bransje: string): Outcome {
  return DISQUALIFYING_BRANSJER.includes(str(bransje).trim()) ? 'diskvalifisert' : 'kvalifisert';
}

export function validateLead(input: Record<string, unknown>): ValidationResult {
  const errs: FieldError[] = [];
  const name = str(input.name).trim();
  const company = str(input.company).trim();
  const telRaw = str(input.tel).trim();
  const email = str(input.email).trim();
  const program = str(input.program).trim();
  const bransje = str(input.bransje).trim();
  const msg = str(input.msg).trim();

  if (!name) errs.push({ field: 'name', message: errors.name });
  if (!company) errs.push({ field: 'company', message: errors.company });

  let tel = '';
  if (!telRaw) errs.push({ field: 'tel', message: errors.telMissing });
  else {
    const n = normalizePhone(telRaw);
    if (!n) errs.push({ field: 'tel', message: errors.telInvalid });
    else tel = n;
  }

  if (!email) errs.push({ field: 'email', message: errors.emailMissing });
  else if (!isValidEmail(email)) errs.push({ field: 'email', message: errors.emailInvalid });

  if (!(PROGRAM_OPTIONS as readonly string[]).includes(program)) errs.push({ field: 'program', message: errors.program });
  if (!(BRANSJE_OPTIONS as readonly string[]).includes(bransje)) errs.push({ field: 'bransje', message: errors.bransje });

  if (msg.length > MSG_MAX) errs.push({ field: 'msg', message: errors.msgTooLong });

  if (errs.length) {
    errs.sort((a, b) => FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field));
    return { ok: false, errors: errs };
  }
  return { ok: true, data: { name, company, tel, email: email.toLowerCase(), program, bransje, msg } };
}

/** Skjulte felt som følger med skjemaet. */
export type LeadMeta = {
  v: 'a' | 'b' | 'c';
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  fbclid: string;
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
    fbclid: str(input.fbclid).slice(0, 500),
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
