import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStore } from '@netlify/blobs';

/**
 * Flyten i /api/lead med all nettverk mocket. Netlify Blobs er et ekte, men flyktig in-memory-lager
 * her (ikke bare "alltid miss" som før): steg 1/steg 2-kobling, idempotens og rate limiting bruker
 * nå Blobs reelt, og må kunne testes mot et lager som faktisk husker mellom kall i samme test.
 */
vi.mock('@netlify/blobs', () => {
  const stores = new Map<string, Map<string, unknown>>();
  const getStore = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const data = stores.get(name)!;
    return {
      get: async (key: string) => (data.has(key) ? data.get(key) : null),
      setJSON: async (key: string, value: unknown) => {
        data.set(key, value);
      },
    };
  };
  (getStore as unknown as { __reset: () => void }).__reset = () => stores.clear();
  return { getStore };
});

type Call = { url: string; init?: RequestInit };
const calls: Call[] = [];

function mockFetch(routes: Record<string, (init?: RequestInit) => Response | Promise<Response>>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    for (const [prefix, fn] of Object.entries(routes)) {
      if (url.startsWith(prefix)) return fn(init);
    }
    return new Response('not mocked', { status: 599 });
  });
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

const brregHit = { _embedded: { enheter: [{ organisasjonsnummer: '926445936', navn: 'EKSEMPEL AS', organisasjonsform: { kode: 'AS' } }] } };

const baseRoutes = {
  'https://data.brreg.no/': () => ok(brregHit),
  'https://api.clickup.com/api/v2/space/': () => ok({ tags: [] }),
  'https://api.clickup.com/api/v2/list/': () => ok({ id: 'task1', url: 'https://app.clickup.com/t/task1' }),
  'https://hooks.zapier.com/': () => ok({ status: 'success' }),
  'https://graph.facebook.com/': () => ok({ events_received: 1 }),
};

function body(over: Record<string, unknown> = {}) {
  return {
    name: 'Kari Nordmann',
    tel: '912 34 567',
    company: 'Eksempel AS',
    v: 'a',
    utm_source: 'fb',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
    fbclid: 'clid',
    pageUrl: 'https://leads.accountera.no/?v=a',
    clientEventId: 'ce-1',
    t0: Date.now() - 60_000,
    consent: 'all',
    website: '',
    ...over,
  };
}

async function post(payload: unknown, ip = '203.0.113.1') {
  const { default: handler } = await import('../netlify/functions/lead');
  const req = new Request('https://leads.accountera.no/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://leads.accountera.no', 'user-agent': 'test' },
    body: JSON.stringify(payload),
  });
  const ctx = { ip, site: { url: 'https://leads.accountera.no' } } as unknown as import('@netlify/functions').Context;
  return handler(req, ctx);
}

describe('/api/lead', () => {
  beforeEach(() => {
    calls.length = 0;
    (getStore as unknown as { __reset: () => void }).__reset();
    process.env.CLICKUP_TOKEN = 'pk_test';
    process.env.ZAPIER_HOOK_URL = 'https://hooks.zapier.com/hooks/catch/1/abc';
    process.env.META_PIXEL_ID = '123';
    process.env.META_CAPI_TOKEN = 'tok';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('gyldig innsending: 201 med leadId, brreg, ClickUp, Zapier (med leadId) og CAPI (uten e-post)', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post(body());
    expect(res.status).toBe(201);
    const resBody = (await res.json()) as { leadId: string };
    expect(resBody.leadId).toMatch(/^[0-9a-f-]{36}$/);

    const clickup = calls.find((c) => c.url.includes('/list/901525768674/task'));
    expect(clickup).toBeDefined();
    const task = JSON.parse(String(clickup!.init!.body)) as { name: string; tags: string[]; priority: number; markdown_description: string };
    expect(task.name).toBe('Eksempel AS · Kari Nordmann');
    expect(task.tags).toEqual(['vinkel-a', 'brreg-verifisert']);
    expect(task.priority).toBe(1);
    expect(task.markdown_description).toContain('926445936');
    expect((clickup!.init!.headers as Record<string, string>).authorization).toBe('pk_test');

    const zap = calls.find((c) => c.url.startsWith('https://hooks.zapier.com/'));
    const zapBody = JSON.parse(String(zap!.init!.body)) as Record<string, unknown>;
    expect(zapBody.leadId).toBe(resBody.leadId);
    expect(zapBody.brreg_treff).toBe('ja');
    expect(zapBody.orgnr).toBe('926445936');
    expect(zapBody.telefon).toBe('+4791234567');
    expect(zapBody.telefon_oppgitt).toBe('912 34 567');
    expect(zapBody.vinkel).toBe('a');
    expect(zapBody).not.toHaveProperty('epost');
    expect(zapBody).not.toHaveProperty('bransje');

    const capi = calls.find((c) => c.url.startsWith('https://graph.facebook.com/'));
    expect(capi).toBeDefined();
    const capiBody = JSON.parse(String(capi!.init!.body)) as { data: { event_id: string; user_data: Record<string, unknown> }[] };
    expect(capiBody.data[0].event_id).toBe('ce-1');
    expect(capiBody.data[0].user_data.fbc).toMatch(/^fb\.1\.\d+\.clid$/);
    expect(capiBody.data[0].user_data.ph).toBeDefined();
    expect(capiBody.data[0].user_data.em).toBeUndefined();
    expect(JSON.stringify(capiBody)).not.toContain('Kari');
  });

  it('uten samtykke sendes ingenting til Meta, men raden i arket og ClickUp-tasken opprettes likevel', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post(body({ consent: 'necessary' }));
    expect(res.status).toBe(201);
    expect(calls.some((c) => c.url.startsWith('https://graph.facebook.com/'))).toBe(false);
    expect(calls.some((c) => c.url.includes('/list/901525768674/task'))).toBe(true);
    expect(calls.some((c) => c.url.startsWith('https://hooks.zapier.com/'))).toBe(true);
  });

  it('honningfelle: 201 med leadId, ingen kall ut', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post(body({ website: 'http://spam' }));
    expect(res.status).toBe(201);
    const resBody = (await res.json()) as { leadId: string };
    expect(resBody.leadId).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it('for rask innsending: 201, ingen kall ut', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post(body({ t0: Date.now() - 500 }));
    expect(res.status).toBe(201);
    expect(calls).toHaveLength(0);
  });

  it('ugyldig: 422 med feltnavn og melding, ingen kall ut', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post(body({ tel: '123', name: '' }));
    expect(res.status).toBe(422);
    const resBody = (await res.json()) as { errors: { field: string; message: string }[] };
    expect(resBody.errors.map((e) => e.field)).toEqual(['name', 'tel']);
    expect(resBody.errors[1].message).toBe('Telefonnummeret må være et norsk nummer med åtte sifre.');
    expect(calls).toHaveLength(0);
  });

  it('idempotens: samme clientEventId to ganger gir samme leadId og ingen nye kall andre gang', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const first = await post(body({ clientEventId: 'ce-double' }));
    const firstBody = (await first.json()) as { leadId: string };
    const callsAfterFirst = calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    const second = await post(body({ clientEventId: 'ce-double' }));
    expect(second.status).toBe(201);
    const secondBody = (await second.json()) as { leadId: string };
    expect(secondBody.leadId).toBe(firstBody.leadId);
    expect(calls).toHaveLength(callsAfterFirst);
  });

  it('rate limiting: 6. innsending fra samme IP innen vinduet avvises med 429', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const ip = '198.51.100.9';
    for (let i = 0; i < 5; i++) {
      const res = await post(body({ clientEventId: `ce-rl-${i}`, tel: `9${i}234567` }), ip);
      expect(res.status).toBe(201);
    }
    const sixth = await post(body({ clientEventId: 'ce-rl-5', tel: '95234567' }), ip);
    expect(sixth.status).toBe(429);
  });

  it('ClickUp nede: ikke kritisk, prøver to ganger, raden skrives til arket, ingen feillogging på høyt nivå', async () => {
    vi.stubGlobal('fetch', mockFetch({ ...baseRoutes, 'https://api.clickup.com/api/v2/list/': () => new Response('down', { status: 503 }) }));
    const res = await post(body());
    expect(res.status).toBe(201);
    expect(calls.filter((c) => c.url.includes('/list/901525768674/task'))).toHaveLength(2);
    expect(calls.some((c) => c.url.startsWith('https://hooks.zapier.com/'))).toBe(true);
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('Zapier nede etter to forsøk: leseren får likevel 201, men den tapte raden logges høyt', async () => {
    vi.stubGlobal('fetch', mockFetch({ ...baseRoutes, 'https://hooks.zapier.com/': () => new Response('down', { status: 500 }) }));
    const res = await post(body());
    expect(res.status).toBe(201);
    const resBody = (await res.json()) as { leadId: string };
    expect(calls.filter((c) => c.url.startsWith('https://hooks.zapier.com/'))).toHaveLength(2);
    expect(console.error).toHaveBeenCalled();
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('zapier.failed');
    expect(logged).toContain('lead.row_not_written');
    expect(logged).toContain(resBody.leadId);
  });

  it('Enhetsregisteret nede eller tregt: innsendingen går likevel, tagg brreg-ikke-verifisert', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        ...baseRoutes,
        'https://data.brreg.no/': () => {
          throw new Error('nett');
        },
      }),
    );
    const res = await post(body());
    expect(res.status).toBe(201);
    const clickup = calls.find((c) => c.url.includes('/list/901525768674/task'));
    const task = JSON.parse(String(clickup!.init!.body)) as { tags: string[]; markdown_description: string };
    expect(task.tags).toEqual(['vinkel-a', 'brreg-ikke-verifisert']);
    expect(task.markdown_description).toContain('Ikke verifisert');
  });

  it('loggen inneholder aldri navn eller telefon', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    await post(body());
    const logged = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('lead.done');
    expect(logged).not.toContain('Kari');
    expect(logged).not.toContain('91234567');
  });

  it('feil metode og ugyldig JSON', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const { default: handler } = await import('../netlify/functions/lead');
    const ctx = { ip: '203.0.113.1' } as unknown as import('@netlify/functions').Context;
    expect((await handler(new Request('https://x/api/lead', { method: 'GET' }), ctx)).status).toBe(405);
    expect((await handler(new Request('https://x/api/lead', { method: 'POST', body: '{bad' }), ctx)).status).toBe(400);
  });
});

describe('PATCH /api/lead/:leadId (steg 2)', () => {
  beforeEach(() => {
    calls.length = 0;
    (getStore as unknown as { __reset: () => void }).__reset();
    process.env.ZAPIER_HOOK_URL = 'https://hooks.zapier.com/hooks/catch/1/abc';
    process.env.ZAPIER_HOOK_URL_STEP2 = 'https://hooks.zapier.com/hooks/catch/1/step2';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function createLead(): Promise<string> {
    const { default: handler } = await import('../netlify/functions/lead');
    const req = new Request('https://leads.accountera.no/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body()),
    });
    const ctx = { ip: '203.0.113.5', site: {} } as unknown as import('@netlify/functions').Context;
    const res = await handler(req, ctx);
    return ((await res.json()) as { leadId: string }).leadId;
  }

  async function patch(leadId: string, payload: unknown) {
    const { default: handler } = await import('../netlify/functions/lead-step2');
    const req = new Request(`https://leads.accountera.no/api/lead/${leadId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const ctx = { params: { leadId } } as unknown as import('@netlify/functions').Context;
    return handler(req, ctx);
  }

  it('oppdaterer samme rad: 200, Zap steg 2 kalt med leadId og feltene, sendt-status', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const leadId = await createLead();
    calls.length = 0;
    const res = await patch(leadId, { har: 'selv', program: 'Fiken', msg: 'Fikk brev.', skipped: false });
    expect(res.status).toBe(200);
    const zap = calls.find((c) => c.url.startsWith('https://hooks.zapier.com/hooks/catch/1/step2'));
    expect(zap).toBeDefined();
    const zapBody = JSON.parse(String(zap!.init!.body)) as Record<string, unknown>;
    expect(zapBody.leadId).toBe(leadId);
    expect(zapBody.har).toBe('selv');
    expect(zapBody.regnskapsprogram).toBe('Fiken');
    expect(zapBody.melding).toBe('Fikk brev.');
    expect(zapBody.step2_status).toBe('sendt');
    // Ingen ny «ny lead»-rad: steg 1-hooken skal ikke kalles på nytt.
    expect(calls.some((c) => c.url.startsWith('https://hooks.zapier.com/hooks/catch/1/abc'))).toBe(false);
  });

  it('«hopp over»: step2Status hoppet_over, raden fra steg 1 er intakt', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const leadId = await createLead();
    calls.length = 0;
    const res = await patch(leadId, { har: '', program: '', msg: '', skipped: true });
    expect(res.status).toBe(200);
    const zapBody = JSON.parse(String(calls.find((c) => c.url.includes('step2'))!.init!.body)) as Record<string, unknown>;
    expect(zapBody.step2_status).toBe('hoppet_over');
  });

  it('ukjent leadId: 404, oppretter ingen ny rad', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await patch('finnes-ikke', { har: 'selv', program: '', msg: '', skipped: false });
    expect(res.status).toBe(404);
    expect(calls.some((c) => c.url.includes('step2'))).toBe(false);
  });

  it('gjentatte kall er trygge: siste verdi vinner', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const leadId = await createLead();
    await patch(leadId, { har: 'selv', program: 'Fiken', msg: '', skipped: false });
    calls.length = 0;
    const res = await patch(leadId, { har: 'byraa', program: 'Tripletex', msg: '', skipped: false });
    expect(res.status).toBe(200);
    const zapBody = JSON.parse(String(calls.find((c) => c.url.includes('step2'))!.init!.body)) as Record<string, unknown>;
    expect(zapBody.har).toBe('byraa');
    expect(zapBody.regnskapsprogram).toBe('Tripletex');
  });

  it('feil metode', async () => {
    const { default: handler } = await import('../netlify/functions/lead-step2');
    const ctx = { params: { leadId: 'x' } } as unknown as import('@netlify/functions').Context;
    expect((await handler(new Request('https://x/api/lead/x', { method: 'GET' }), ctx)).status).toBe(405);
  });
});
