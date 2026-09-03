import { createHash } from 'node:crypto';
import { log } from './log';

const GRAPH = 'https://graph.facebook.com/v21.0';

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** Metas normalisering: e-post små bokstaver uten mellomrom, telefon som sifre med landkode uten «+». */
export function hashEmail(email: string): string {
  return sha256(email.trim().toLowerCase());
}
export function hashPhone(e164: string): string {
  return sha256(e164.replace(/\D/g, ''));
}

/** `fbc` fra fbclid: fb.1.<ms>.<fbclid>. */
export function fbcFromClid(fbclid: string, now: number): string | undefined {
  return fbclid ? `fb.1.${now}.${fbclid}` : undefined;
}

export type CapiLead = {
  eventId: string;
  email: string;
  phoneE164: string;
  fbclid: string;
  sourceUrl: string;
  userAgent?: string;
  ip?: string;
  now: number;
};

export function buildLeadEvent(l: CapiLead, testEventCode?: string) {
  const user_data: Record<string, unknown> = {
    em: [hashEmail(l.email)],
    ph: [hashPhone(l.phoneE164)],
  };
  const fbc = fbcFromClid(l.fbclid, l.now);
  if (fbc) user_data.fbc = fbc;
  if (l.userAgent) user_data.client_user_agent = l.userAgent;
  if (l.ip) user_data.client_ip_address = l.ip;
  const body: Record<string, unknown> = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(l.now / 1000),
        event_id: l.eventId,
        action_source: 'website',
        event_source_url: l.sourceUrl,
        user_data,
      },
    ],
  };
  if (testEventCode) body.test_event_code = testEventCode;
  return body;
}

/** Sender Lead til Conversions API. Samme event_id som pixelen, slik at Meta dedupliserer. Kaster aldri. */
export async function sendLeadToMeta(
  pixelId: string,
  token: string,
  lead: CapiLead,
  testEventCode?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchImpl(`${GRAPH}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildLeadEvent(lead, testEventCode)),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      log('warn', 'meta.capi.failed', { status: res.status, body: text.slice(0, 300) });
      return false;
    }
    return true;
  } catch (e) {
    log('warn', 'meta.capi.failed', { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}
