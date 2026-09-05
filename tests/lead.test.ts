import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Flyten i /api/lead med all nettverk mocket. Netlify Blobs finnes ikke her, så duplikatsjekken svarer false.
 */
vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    get: async () => {
      throw new Error('no blobs in test');
    },
    setJSON: async () => {},
  }),
}));

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

const validBody = {
  name: 'Kari Nordmann',
  company: 'Eksempel AS',
  tel: '+47 40 15 66 66',
  email: 'kari@example.com',
  regnskapsforer: 'Ja, jeg bruker et regnskapsbyrå',
  program: 'Fiken',
  bransje: 'Bygg, anlegg og håndverk',
  msg: 'Fikk brev.',
  v: 'a',
  utm_source: 'fb',
  utm_medium: '',
  utm_campaign: '',
  utm_content: '',
  fbclid: 'clid',
  t0: Date.now() - 60_000,
  consent: 'all',
  website: '',
};

async function post(body: unknown) {
  const { default: handler } = await import('../netlify/functions/lead');
  const req = new Request('https://leads.accountera.no/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://leads.accountera.no', 'user-agent': 'test' },
    body: JSON.stringify(body),
  });
  const ctx = { ip: '203.0.113.1', site: { url: 'https://leads.accountera.no' } } as unknown as import('@netlify/functions').Context;
  return handler(req, ctx);
}

describe('/api/lead', () => {
  beforeEach(() => {
    calls.length = 0;
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

  it('gyldig innsending: brreg, ClickUp, Zapier og CAPI, og svarer med leadId, taskId, utfall', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post(validBody);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { leadId: string; taskId: string; utfall: string };
    expect(body.taskId).toBe('task1');
    expect(body.utfall).toBe('kvalifisert');
    expect(body.leadId).toMatch(/^[0-9a-f-]{36}$/);

    const clickup = calls.find((c) => c.url.includes('/list/901525768674/task'));
    expect(clickup).toBeDefined();
    const task = JSON.parse(String(clickup!.init!.body)) as { name: string; tags: string[]; priority: number; markdown_description: string };
    expect(task.name).toBe('Eksempel AS · Kari Nordmann');
    expect(task.tags).toEqual(['vinkel-a', 'kvalifisert', 'har-byraa']);
    expect(task.priority).toBe(1);
    expect(task.markdown_description).toContain('926445936');
    expect((clickup!.init!.headers as Record<string, string>).authorization).toBe('pk_test');

    const zap = calls.find((c) => c.url.startsWith('https://hooks.zapier.com/'));
    const zapBody = JSON.parse(String(zap!.init!.body)) as Record<string, unknown>;
    expect(zapBody.taskId).toBe('task1');
    expect(zapBody.utfall).toBe('kvalifisert');
    expect(zapBody.verifisert).toBe(true);
    expect(zapBody.tel).toBe('+4740156666');
    expect(zapBody.leadId).toBe(body.leadId);
    expect(zapBody.regnskapsforer).toBe('Ja, jeg bruker et regnskapsbyrå');

    const capi = calls.find((c) => c.url.startsWith('https://graph.facebook.com/'));
    expect(capi).toBeDefined();
    const capiBody = JSON.parse(String(capi!.init!.body)) as { data: { event_id: string; user_data: Record<string, unknown> }[] };
    expect(capiBody.data[0].event_id).toBe(body.leadId);
    expect(capiBody.data[0].user_data.fbc).toMatch(/^fb\.1\.\d+\.clid$/);
    expect(capiBody.data[0].user_data.em).toBeDefined();
    expect(JSON.stringify(capiBody)).not.toContain('kari@example.com');
  });

  it('uten samtykke sendes ingenting til Meta, men tasken opprettes', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post({ ...validBody, consent: 'necessary' });
    expect(res.status).toBe(200);
    expect(calls.some((c) => c.url.startsWith('https://graph.facebook.com/'))).toBe(false);
    expect(calls.some((c) => c.url.includes('/list/901525768674/task'))).toBe(true);
  });

  it('diskvalifisert bransje: lav prioritet, diskvalifisert-tagg, utfall i svaret', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post({ ...validBody, bransje: 'Landbruk og skogbruk' });
    const body = (await res.json()) as { utfall: string };
    expect(body.utfall).toBe('diskvalifisert');
    const clickup = calls.find((c) => c.url.includes('/list/901525768674/task'));
    const task = JSON.parse(String(clickup!.init!.body)) as { tags: string[]; priority: number };
    expect(task.tags).toEqual(['vinkel-a', 'diskvalifisert', 'har-byraa']);
    expect(task.priority).toBe(4);
  });

  it('honningfelle: 200 med leadId, ingen kall ut', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post({ ...validBody, website: 'http://spam' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { leadId: string; taskId: null };
    expect(body.leadId).toBeTruthy();
    expect(body.taskId).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('for rask innsending: 200, ingen kall ut', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post({ ...validBody, t0: Date.now() - 500 });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(0);
  });

  it('ugyldig: 400 med feltnavn og melding, ingen kall ut', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const res = await post({ ...validBody, tel: '123', email: '' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { errors: { field: string; message: string }[] };
    expect(body.errors.map((e) => e.field)).toEqual(['tel', 'email']);
    expect(body.errors[0].message).toBe('Telefonnummeret må være et norsk nummer med åtte sifre.');
    expect(calls).toHaveLength(0);
  });

  it('ClickUp nede: prøver to ganger, Zapier får leadet med taskId null, leseren får suksess', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ ...baseRoutes, 'https://api.clickup.com/api/v2/list/': () => new Response('down', { status: 503 }) }),
    );
    const res = await post(validBody);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { taskId: null; utfall: string };
    expect(body.taskId).toBeNull();
    expect(calls.filter((c) => c.url.includes('/list/901525768674/task'))).toHaveLength(2);
    const zap = calls.find((c) => c.url.startsWith('https://hooks.zapier.com/'));
    expect(JSON.parse(String(zap!.init!.body)).taskId).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('Enhetsregisteret nede eller tregt: innsendingen går likevel, tagg ikke-verifisert', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        ...baseRoutes,
        'https://data.brreg.no/': () => {
          throw new Error('nett');
        },
      }),
    );
    const res = await post(validBody);
    expect(res.status).toBe(200);
    const clickup = calls.find((c) => c.url.includes('/list/901525768674/task'));
    const task = JSON.parse(String(clickup!.init!.body)) as { tags: string[]; markdown_description: string };
    expect(task.tags).toEqual(['vinkel-a', 'ikke-verifisert', 'har-byraa']);
    expect(task.markdown_description).toContain('Ikke verifisert');
  });

  it('flere treff i Enhetsregisteret gir kandidater i beskrivelsen', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        ...baseRoutes,
        'https://data.brreg.no/': () =>
          ok({ _embedded: { enheter: [{ organisasjonsnummer: '1', navn: 'EKSEMPEL HOLDING AS' }, { organisasjonsnummer: '2', navn: 'EKSEMPEL BYGG AS' }] } }),
      }),
    );
    const res = await post({ ...validBody, company: 'Eksempel' });
    expect(res.status).toBe(200);
    const clickup = calls.find((c) => c.url.includes('/list/901525768674/task'));
    const task = JSON.parse(String(clickup!.init!.body)) as { markdown_description: string };
    expect(task.markdown_description).toContain('- 1 EKSEMPEL HOLDING AS');
    expect(task.markdown_description).toContain('- 2 EKSEMPEL BYGG AS');
  });

  it('loggen inneholder aldri navn, telefon eller e-post', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    await post(validBody);
    const logged = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('lead.done');
    expect(logged).not.toContain('Kari');
    expect(logged).not.toContain('40156666');
    expect(logged).not.toContain('kari@example.com');
  });

  it('feil metode og ugyldig JSON', async () => {
    vi.stubGlobal('fetch', mockFetch(baseRoutes));
    const { default: handler } = await import('../netlify/functions/lead');
    const ctx = {} as unknown as import('@netlify/functions').Context;
    expect((await handler(new Request('https://x/api/lead', { method: 'GET' }), ctx)).status).toBe(405);
    expect((await handler(new Request('https://x/api/lead', { method: 'POST', body: '{bad' }), ctx)).status).toBe(400);
  });
});
