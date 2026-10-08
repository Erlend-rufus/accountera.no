/**
 * Lagring av leadet mellom steg 1 og steg 2. Netlify Blobs, egen store («lead-records») atskilt fra
 * dedup/tellere («leads»): ulik levetid og formål. Ingen TTL er bygget her - dette er et teknisk
 * mellomlager for å koble steg 1 og steg 2, ikke personvernerklæringens register (det er fortsatt
 * Google Sheet-et via Zapier). Se design-handoff «Ring meg opp», 8. oktober 2026, AO-2.
 */
import { getStore } from '@netlify/blobs';
import type { BrregMatch } from '../../src/shared/brreg';
import type { HarValue } from '../../src/shared/validate';
import { log } from './log';

export type LeadRecord = {
  id: string;
  createdAt: number;
  name: string;
  company: string;
  /** E.164, f.eks. «+4791234567». */
  tel: string;
  /** Det besøkeren skrev, f.eks. «912 34 567». */
  telRaw: string;
  variant: 'a' | 'b' | 'c';
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  fbclid: string;
  pageUrl: string;
  brreg: BrregMatch;
  step: 1 | 2;
  har: HarValue;
  program: string;
  msg: string;
  step2Status: 'ikke_besvart' | 'sendt' | 'hoppet_over';
  step2At: number | null;
  bookedAt: number | null;
};

const STORE = 'lead-records';

function store() {
  return getStore(STORE);
}

function key(id: string): string {
  return `lead/${id}`;
}

export type NewLead = Pick<
  LeadRecord,
  'id' | 'createdAt' | 'name' | 'company' | 'tel' | 'telRaw' | 'variant' | 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term' | 'fbclid' | 'pageUrl' | 'brreg'
>;

/**
 * Oppretter og lagrer raden for steg 1. Kaster aldri: lykkes ikke lagringen, logges det på «error»
 * (steg 2 vil da 404 på denne leaden), men selve innsendingen (Zap/CAPI) fortsetter uansett.
 */
export async function createLead(data: NewLead): Promise<LeadRecord> {
  const record: LeadRecord = {
    ...data,
    step: 1,
    har: '',
    program: '',
    msg: '',
    step2Status: 'ikke_besvart',
    step2At: null,
    bookedAt: null,
  };
  try {
    await store().setJSON(key(record.id), record);
  } catch (e) {
    log('error', 'leads.create_failed', { leadId: record.id, error: e instanceof Error ? e.message : String(e) });
  }
  return record;
}

export async function getLead(id: string): Promise<LeadRecord | null> {
  try {
    return (await store().get(key(id), { type: 'json' })) as LeadRecord | null;
  } catch (e) {
    log('warn', 'leads.get_failed', { leadId: id, error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export type Step2Patch = { har: HarValue; program: string; msg: string; skipped: boolean };

/** Finner raden og fletter inn steg 2. Siste verdi vinner ved gjentatte kall. Null hvis raden ikke finnes. */
export async function updateLeadStep2(id: string, patch: Step2Patch): Promise<LeadRecord | null> {
  const existing = await getLead(id);
  if (!existing) return null;
  const updated: LeadRecord = {
    ...existing,
    har: patch.har,
    program: patch.program,
    msg: patch.msg,
    step: 2,
    step2At: Date.now(),
    step2Status: patch.skipped ? 'hoppet_over' : 'sendt',
  };
  try {
    await store().setJSON(key(id), updated);
  } catch (e) {
    log('error', 'leads.step2_save_failed', { leadId: id, error: e instanceof Error ? e.message : String(e) });
  }
  return updated;
}

/** Idempotens: samme clientEventId skal gi samme leadId, aldri en ny rad. */
export async function findLeadIdByClientEventId(clientEventId: string): Promise<string | null> {
  if (!clientEventId) return null;
  try {
    const v = (await store().get(`idempotency/${clientEventId}`, { type: 'json' })) as { leadId: string } | null;
    return v?.leadId ?? null;
  } catch (e) {
    log('warn', 'leads.idempotency_lookup_failed', { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function recordIdempotencyKey(clientEventId: string, leadId: string): Promise<void> {
  if (!clientEventId) return;
  try {
    await store().setJSON(`idempotency/${clientEventId}`, { leadId });
  } catch (e) {
    log('warn', 'leads.idempotency_write_failed', { leadId, error: e instanceof Error ? e.message : String(e) });
  }
}
