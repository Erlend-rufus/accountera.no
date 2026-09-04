/**
 * sessionStorage for variant, UTM og lead-flyten. Strengt nødvendig for tjenesten, slettes når nettleseren lukkes.
 * Alt er pakket i try/catch: privat modus og noen innebygde nettlesere kaster på tilgang.
 */
const KEY_VARIANT = 'acc_v';
const KEY_UTM = 'acc_utm';
const KEY_LEAD = 'acc_lead';
const KEY_LEAD_PENDING = 'acc_lead_pending';

export type Utm = { utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string; fbclid: string };
export type StoredLead = { leadId: string; name: string; firstName: string; email: string; tel: string; taskId: string | null; utfall: string };

function get(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* ignorer */
  }
}
function del(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignorer */
  }
}

export function getStoredVariant(): string | null {
  return get(KEY_VARIANT);
}
export function setStoredVariant(v: string) {
  set(KEY_VARIANT, v);
}

export function getStoredUtm(): Utm {
  const empty: Utm = { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', fbclid: '' };
  try {
    const raw = get(KEY_UTM);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<Utm>) } : empty;
  } catch {
    return empty;
  }
}
export function setStoredUtm(u: Utm) {
  set(KEY_UTM, JSON.stringify(u));
}

export function getStoredLead(): StoredLead | null {
  try {
    const raw = get(KEY_LEAD);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<StoredLead>;
    return o && typeof o.leadId === 'string' && o.leadId ? (o as StoredLead) : null;
  } catch {
    return null;
  }
}
export function setStoredLead(l: StoredLead) {
  set(KEY_LEAD, JSON.stringify(l));
  set(KEY_LEAD_PENDING, '1');
}
/** Sann bare første gang etter innsending. Flagget slettes når Lead-hendelsen er fyrt. */
export function consumeLeadPending(): boolean {
  const pending = get(KEY_LEAD_PENDING) === '1';
  if (pending) del(KEY_LEAD_PENDING);
  return pending;
}
