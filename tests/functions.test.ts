import { describe, expect, it, vi } from 'vitest';
import { buildDescription, buildStep1SheetPayload, buildStep2SheetPayload, buildTags, taskName, type TaskFacts } from '../netlify/lib/describe';
import { buildLeadEvent, fbcFromClid, hashPhone } from '../netlify/lib/meta';
import { lookupCompany } from '../netlify/lib/brreg';
import { pageKeyFrom, osloDate } from '../netlify/lib/counters';
import { postToZapier } from '../netlify/lib/zapier';
import type { LeadMeta, Step1Fields } from '../src/shared/validate';

const lead: Step1Fields = {
  name: 'Kari Nordmann',
  company: 'Eksempel AS',
  tel: '40156666',
  telRaw: '40 15 66 66',
};
const meta: LeadMeta = {
  v: 'b',
  utm_source: 'fb',
  utm_medium: 'paid',
  utm_campaign: 'sept',
  utm_content: 'ad1',
  utm_term: 'regnskap',
  fbclid: 'abc',
  pageUrl: 'https://leads.accountera.no/?v=b',
  clientEventId: 'evt-1',
  t0: 1,
  consent: 'all',
};
const base: TaskFacts = {
  lead,
  meta,
  brreg: { status: 'verifisert', enhet: { organisasjonsnummer: '926445936', navn: 'EKSEMPEL AS', organisasjonsform: { kode: 'AS' }, naeringskode1: { kode: '69.201', beskrivelse: 'Regnskap' }, antallAnsatte: 7 } },
  leadId: 'lead-1',
  duplicate: false,
  submittedAt: Date.UTC(2026, 8, 3, 12, 30),
};

describe('buildTags', () => {
  it('vinkel og verifisert', () => {
    expect(buildTags(base)).toEqual(['vinkel-b', 'brreg-verifisert']);
  });
  it('ikke verifisert i Enhetsregisteret', () => {
    expect(buildTags({ ...base, brreg: { status: 'ikke-verifisert', kandidater: [], grunn: 'ingen' } })).toEqual(['vinkel-b', 'brreg-ikke-verifisert']);
  });
  it('duplikat legges til sist', () => {
    expect(buildTags({ ...base, duplicate: true })).toEqual(['vinkel-b', 'brreg-verifisert', 'duplikat']);
  });
});

describe('beskrivelse', () => {
  it('navn er Firmanavn · Navn', () => {
    expect(taskName(lead)).toBe('Eksempel AS · Kari Nordmann');
  });
  it('inneholder tel-lenke, oppgitt nummer, org.nr, variant, UTM, norsk tid og leadId', () => {
    const d = buildDescription(base);
    expect(d).toContain('[40 15 66 66](tel:+4740156666)');
    expect(d).toContain('oppgitt: 40 15 66 66');
    expect(d).toContain('926445936');
    expect(d).toContain('**Variant:** b');
    expect(d).toContain('utm_campaign=sept');
    expect(d).toContain('utm_term=regnskap');
    expect(d).toContain('14:30');
    expect(d).toContain('**leadId:** lead-1');
  });
  it('nevner duplikat når satt', () => {
    expect(buildDescription({ ...base, duplicate: true })).toContain('duplikat');
  });
  it('lister kandidater når ikke verifisert', () => {
    const d = buildDescription({
      ...base,
      brreg: { status: 'ikke-verifisert', grunn: 'flere', kandidater: [{ organisasjonsnummer: '1', navn: 'A AS' }, { organisasjonsnummer: '2', navn: 'B AS' }] },
    });
    expect(d).toContain('Ikke verifisert (flere treff)');
    expect(d).toContain('- 1 A AS');
    expect(d).toContain('- 2 B AS');
  });
});

describe('Meta CAPI', () => {
  it('hasher telefon slik Meta krever, ingen e-post', () => {
    expect(hashPhone('+4740156666')).toBe(hashPhone('4740156666'));
    expect(hashPhone('+4740156666')).toMatch(/^[0-9a-f]{64}$/);
  });
  it('bygger Lead med event_id = clientEventId, fbc og kilde-URL, uten em', () => {
    const b = buildLeadEvent({ eventId: 'evt-1', phoneE164: '+4740156666', fbclid: 'abc', sourceUrl: 'https://leads.accountera.no/?v=b', now: 1_700_000_000_000 }, 'TEST1');
    const ev = (b.data as Record<string, unknown>[])[0];
    expect(ev.event_name).toBe('Lead');
    expect(ev.event_id).toBe('evt-1');
    expect(ev.event_time).toBe(1_700_000_000);
    expect(ev.event_source_url).toBe('https://leads.accountera.no/?v=b');
    const userData = ev.user_data as Record<string, unknown>;
    expect(userData.fbc).toBe('fb.1.1700000000000.abc');
    expect(userData.em).toBeUndefined();
    expect(b.test_event_code).toBe('TEST1');
    expect(fbcFromClid('', 1)).toBeUndefined();
  });
});

describe('lookupCompany', () => {
  it('bruker Enhetsregisterets svar', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ _embedded: { enheter: [{ organisasjonsnummer: '1', navn: 'EKSEMPEL AS' }] } }), { status: 200 }));
    const r = await lookupCompany('Eksempel AS', fetchImpl as unknown as typeof fetch);
    expect(r.match.status).toBe('verifisert');
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toContain('navn=Eksempel%20AS&size=5');
  });
  it('feil gir ikke-verifisert uten å kaste', async () => {
    const boom = vi.fn(async () => {
      throw new Error('nett');
    });
    const r = await lookupCompany('Eksempel AS', boom as unknown as typeof fetch);
    expect(r.match.status).toBe('ikke-verifisert');
    expect(r.error).toBe('nett');
    const bad = vi.fn(async () => new Response('x', { status: 500 }));
    const r2 = await lookupCompany('Eksempel AS', bad as unknown as typeof fetch);
    expect(r2.error).toBe('http 500');
  });
});

describe('tellere', () => {
  it('nøkler fra spørring', () => {
    expect(pageKeyFrom(new URLSearchParams('v=a'))).toBe('v-a');
    expect(pageKeyFrom(new URLSearchParams('v=c'))).toBe('v-c');
    expect(pageKeyFrom(new URLSearchParams('p=takk'))).toBe('p-takk');
    expect(pageKeyFrom(new URLSearchParams('v=x'))).toBeNull();
    expect(pageKeyFrom(new URLSearchParams(''))).toBeNull();
  });
  it('dato i norsk tid', () => {
    expect(osloDate(Date.UTC(2026, 8, 3, 23, 30))).toBe('2026-09-04');
    expect(osloDate(Date.UTC(2026, 0, 3, 23, 30))).toBe('2026-01-04');
  });
});

describe('buildStep1SheetPayload (nyttelast mot Zapier → Google Sheet, steg 1)', () => {
  it('inneholder eksakt de avtalte nøklene, med riktige verdier ved verifisert treff', () => {
    const p = buildStep1SheetPayload(base);
    expect(Object.keys(p).sort()).toEqual(
      [
        'leadId',
        'timestamp',
        'navn',
        'firma',
        'telefon',
        'telefon_oppgitt',
        'vinkel',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'orgnr',
        'brreg_treff',
        'side_url',
      ].sort(),
    );
    expect(p.leadId).toBe('lead-1');
    expect(p.navn).toBe('Kari Nordmann');
    expect(p.firma).toBe('Eksempel AS');
    expect(p.telefon).toBe('+4740156666');
    expect(p.telefon_oppgitt).toBe('40 15 66 66');
    expect(p.vinkel).toBe('b');
    expect(p.utm_source).toBe('fb');
    expect(p.utm_campaign).toBe('sept');
    expect(p.utm_content).toBe('ad1');
    expect(p.utm_term).toBe('regnskap');
    expect(p.orgnr).toBe('926445936');
    expect(p.brreg_treff).toBe('ja');
    expect(p.side_url).toBe('https://leads.accountera.no/?v=b');
    expect(new Date(p.timestamp).toISOString()).toBe(p.timestamp);
  });
  it('ikke verifisert i Enhetsregisteret', () => {
    const p = buildStep1SheetPayload({ ...base, brreg: { status: 'ikke-verifisert', kandidater: [], grunn: 'ingen' } });
    expect(p.brreg_treff).toBe('nei');
    expect(p.orgnr).toBe('');
  });
  it('ingen epost eller bransje i nyttelasten', () => {
    const p = buildStep1SheetPayload(base);
    expect((p as Record<string, unknown>).epost).toBeUndefined();
    expect((p as Record<string, unknown>).bransje).toBeUndefined();
  });
});

describe('buildStep2SheetPayload (steg 2, finner/oppdaterer raden på leadId)', () => {
  it('inneholder eksakt de avtalte nøklene', () => {
    const p = buildStep2SheetPayload({ leadId: 'lead-1', har: 'selv', program: 'Fiken', msg: 'Hei', step2Status: 'sendt', step2At: Date.UTC(2026, 8, 3, 12, 35) });
    expect(Object.keys(p).sort()).toEqual(['leadId', 'har', 'regnskapsprogram', 'melding', 'step2_status', 'step2_tidspunkt'].sort());
    expect(p.leadId).toBe('lead-1');
    expect(p.har).toBe('selv');
    expect(p.regnskapsprogram).toBe('Fiken');
    expect(p.melding).toBe('Hei');
    expect(p.step2_status).toBe('sendt');
    expect(new Date(p.step2_tidspunkt).toISOString()).toBe(p.step2_tidspunkt);
  });
  it('hoppet over gir step2_status = hoppet_over', () => {
    const p = buildStep2SheetPayload({ leadId: 'lead-1', har: '', program: '', msg: '', step2Status: 'hoppet_over', step2At: 1 });
    expect(p.step2_status).toBe('hoppet_over');
  });
});

describe('postToZapier', () => {
  it('lykkes på første forsøk, ingen retry', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
    const ok = await postToZapier('https://hooks.zapier.com/x', { a: 1 }, 'lead-1', fetchImpl as unknown as typeof fetch);
    expect(ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
  it('feiler første gang, lykkes andre: retry gjenoppretter', async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => (++n === 1 ? new Response(null, { status: 500 }) : new Response(null, { status: 200 })));
    const ok = await postToZapier('https://hooks.zapier.com/x', { a: 1 }, 'lead-1', fetchImpl as unknown as typeof fetch);
    expect(ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it('feiler begge forsøk: gir false, kaster aldri', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 500 }));
    const ok = await postToZapier('https://hooks.zapier.com/x', { a: 1 }, 'lead-1', fetchImpl as unknown as typeof fetch);
    expect(ok).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it('nettverksfeil (kastet unntak) teller som mislykket forsøk, kaster ikke videre', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const ok = await postToZapier('https://hooks.zapier.com/x', { a: 1 }, 'lead-1', fetchImpl as unknown as typeof fetch);
    expect(ok).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
