import { describe, expect, it, vi } from 'vitest';
import { buildDescription, buildSheetPayload, buildTags, priorityFor, taskName, type TaskFacts } from '../netlify/lib/describe';
import { buildLeadEvent, fbcFromClid, hashEmail, hashPhone } from '../netlify/lib/meta';
import { lookupCompany } from '../netlify/lib/brreg';
import { pageKeyFrom, osloDate } from '../netlify/lib/counters';
import { postToZapier } from '../netlify/lib/zapier';
import type { LeadFields, LeadMeta } from '../src/shared/validate';

const lead: LeadFields = {
  name: 'Kari Nordmann',
  company: 'Eksempel AS',
  tel: '40156666',
  email: 'kari@example.com',
  regnskapsforer: 'Nei, jeg fører selv',
  program: 'Fiken',
  bransje: 'Bygg, anlegg og håndverk',
  msg: 'Fikk brev fra Skatteetaten.',
};
const meta: LeadMeta = { v: 'b', utm_source: 'fb', utm_medium: 'paid', utm_campaign: 'sept', utm_content: 'ad1', fbclid: 'abc', t0: 1, consent: 'all' };
const base: TaskFacts = {
  lead,
  meta,
  outcome: 'kvalifisert',
  brreg: { status: 'verifisert', enhet: { organisasjonsnummer: '926445936', navn: 'EKSEMPEL AS', organisasjonsform: { kode: 'AS' }, naeringskode1: { kode: '69.201', beskrivelse: 'Regnskap' }, antallAnsatte: 7 } },
  leadId: 'lead-1',
  duplicate: false,
  submittedAt: Date.UTC(2026, 8, 3, 12, 30),
};

describe('tagger og prioritet', () => {
  it('kvalifisert og verifisert', () => {
    expect(buildTags(base)).toEqual(['vinkel-b', 'kvalifisert', 'foerer-selv']);
    expect(priorityFor('kvalifisert')).toBe(1);
  });
  it('kvalifisert men ikke verifisert', () => {
    expect(buildTags({ ...base, brreg: { status: 'ikke-verifisert', kandidater: [], grunn: 'ingen' } })).toEqual(['vinkel-b', 'ikke-verifisert', 'foerer-selv']);
  });
  it('diskvalifisert har lav prioritet, uansett verifisering', () => {
    expect(buildTags({ ...base, outcome: 'diskvalifisert' })).toEqual(['vinkel-b', 'diskvalifisert', 'foerer-selv']);
    expect(priorityFor('diskvalifisert')).toBe(4);
  });
  it('duplikat legges til', () => {
    expect(buildTags({ ...base, duplicate: true })).toEqual(['vinkel-b', 'kvalifisert', 'duplikat', 'foerer-selv']);
  });
  it('regnskapsfører-svar gir riktig tagg, og påvirker ikke kvalifisering', () => {
    expect(buildTags({ ...base, lead: { ...lead, regnskapsforer: 'Ja, jeg bruker et regnskapsbyrå' } })).toEqual(['vinkel-b', 'kvalifisert', 'har-byraa']);
    expect(buildTags({ ...base, lead: { ...lead, regnskapsforer: 'Nei, men jeg har hatt det tidligere' } })).toEqual(['vinkel-b', 'kvalifisert', 'tidligere-byraa']);
  });
  it('ukjent regnskapsfører-svar legger ikke til noen tagg', () => {
    expect(buildTags({ ...base, lead: { ...lead, regnskapsforer: '' } })).toEqual(['vinkel-b', 'kvalifisert']);
  });
});

describe('beskrivelse', () => {
  it('navn er Firmanavn · Navn', () => {
    expect(taskName(lead)).toBe('Eksempel AS · Kari Nordmann');
  });
  it('inneholder tel-lenke, org.nr, variant, UTM, norsk tid og leadId', () => {
    const d = buildDescription(base);
    expect(d).toContain('[40 15 66 66](tel:+4740156666)');
    expect(d).toContain('926445936');
    expect(d).toContain('**Variant:** b');
    expect(d).toContain('utm_campaign=sept');
    expect(d).toContain('14:30');
    expect(d).toContain('**leadId:** lead-1');
    expect(d).toContain('Fikk brev fra Skatteetaten.');
    expect(d).toContain('**Har regnskapsfører i dag:** Nei, jeg fører selv');
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
  it('hasher e-post og telefon slik Meta krever', () => {
    expect(hashEmail('  Kari@Example.com ')).toBe(hashEmail('kari@example.com'));
    expect(hashPhone('+4740156666')).toBe(hashPhone('4740156666'));
    expect(hashEmail('kari@example.com')).toMatch(/^[0-9a-f]{64}$/);
  });
  it('bygger Lead med event_id, fbc og kilde-URL', () => {
    const b = buildLeadEvent({ eventId: 'lead-1', email: 'kari@example.com', phoneE164: '+4740156666', fbclid: 'abc', sourceUrl: 'https://leads.accountera.no/?v=b', now: 1_700_000_000_000 }, 'TEST1');
    const ev = (b.data as Record<string, unknown>[])[0];
    expect(ev.event_name).toBe('Lead');
    expect(ev.event_id).toBe('lead-1');
    expect(ev.event_time).toBe(1_700_000_000);
    expect(ev.event_source_url).toBe('https://leads.accountera.no/?v=b');
    expect((ev.user_data as Record<string, unknown>).fbc).toBe('fb.1.1700000000000.abc');
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

describe('buildSheetPayload (nyttelast mot Zapier → Google Sheet)', () => {
  it('inneholder eksakt de avtalte nøklene, med riktige verdier ved verifisert treff', () => {
    const p = buildSheetPayload(base, 'https://app.clickup.com/t/task1');
    expect(Object.keys(p).sort()).toEqual(
      [
        'bransje',
        'brreg_treff',
        'clickup_url',
        'epost',
        'firma',
        'har_regnskapsforer',
        'kvalifisert',
        'melding',
        'navn',
        'orgnr',
        'regnskapsprogram',
        'telefon',
        'timestamp',
        'utm_campaign',
        'utm_content',
        'utm_source',
        'vinkel',
      ].sort(),
    );
    expect(p.navn).toBe('Kari Nordmann');
    expect(p.firma).toBe('Eksempel AS');
    expect(p.telefon).toBe('+4740156666');
    expect(p.epost).toBe('kari@example.com');
    expect(p.har_regnskapsforer).toBe('Nei, jeg fører selv');
    expect(p.regnskapsprogram).toBe('Fiken');
    expect(p.bransje).toBe('Bygg, anlegg og håndverk');
    expect(p.melding).toBe('Fikk brev fra Skatteetaten.');
    expect(p.vinkel).toBe('b');
    expect(p.utm_source).toBe('fb');
    expect(p.utm_campaign).toBe('sept');
    expect(p.utm_content).toBe('ad1');
    expect(p.orgnr).toBe('926445936');
    expect(p.brreg_treff).toBe('ja');
    expect(p.kvalifisert).toBe('ja');
    expect(p.clickup_url).toBe('https://app.clickup.com/t/task1');
    expect(new Date(p.timestamp).toISOString()).toBe(p.timestamp);
  });
  it('ikke verifisert i Enhetsregisteret, men ikke diskvalifisert: kvalifisert = ikke verifisert', () => {
    const p = buildSheetPayload({ ...base, brreg: { status: 'ikke-verifisert', kandidater: [], grunn: 'ingen' } }, '');
    expect(p.brreg_treff).toBe('nei');
    expect(p.kvalifisert).toBe('ikke verifisert');
    expect(p.orgnr).toBe('');
    expect(p.clickup_url).toBe('');
  });
  it('diskvalifisert bransje: kvalifisert = nei, uansett Enhetsregisteret', () => {
    const p = buildSheetPayload({ ...base, outcome: 'diskvalifisert' }, '');
    expect(p.kvalifisert).toBe('nei');
    expect(p.brreg_treff).toBe('ja');
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
