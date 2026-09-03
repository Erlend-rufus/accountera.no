import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobsServer } from '@netlify/blobs/server';

/**
 * Tellerne mot Netlify Blobs' lokale server (den samme `netlify dev` bruker).
 */
let server: BlobsServer;
let dir: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'acc-blobs-'));
  server = new BlobsServer({ directory: dir, token: 'test-token', port: 0 });
  const { port } = await server.start();
  const ctx = { edgeURL: `http://localhost:${port}`, uncachedEdgeURL: `http://localhost:${port}`, token: 'test-token', siteID: 'test-site' };
  process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify(ctx)).toString('base64');
  process.env.STATS_KEY = 'hemmelig';
});

afterAll(async () => {
  await server.stop();
  rmSync(dir, { recursive: true, force: true });
});

describe('tellere i Netlify Blobs', () => {
  it('øker daglig teller per side og leser alt tilbake', async () => {
    const { increment, readAll } = await import('../netlify/lib/counters');
    await increment('2026-09-03/v-a');
    await increment('2026-09-03/v-a');
    await increment('2026-09-03/p-takk');
    await increment('2026-09-04/v-b');
    const all = await readAll();
    expect(all.days['2026-09-03']).toEqual({ 'v-a': 2, 'p-takk': 1 });
    expect(all.days['2026-09-04']).toEqual({ 'v-b': 1 });
    expect(all.totals).toEqual({ 'v-a': 2, 'p-takk': 1, 'v-b': 1 });
  });

  // Den lokale Blobs-serveren returnerer ingen etag på GET, så samtidighet testes mot et lager med etag-semantikk
  // i tests/counters-concurrency.test.ts. I produksjon gir Netlify etag, og skrivingen blir betinget.

  it('/api/view svarer 204 uten cache og teller bare kjente sider', async () => {
    const { default: view } = await import('../netlify/functions/view');
    const { readAll } = await import('../netlify/lib/counters');
    const before = (await readAll()).totals['v-a'] ?? 0;
    const r1 = await view(new Request('https://x/api/view?v=a'));
    expect(r1.status).toBe(204);
    expect(r1.headers.get('cache-control')).toContain('no-store');
    const r2 = await view(new Request('https://x/api/view?v=z'));
    expect(r2.status).toBe(204);
    const r3 = await view(new Request('https://x/api/view?v=a', { method: 'POST' }));
    expect(r3.status).toBe(405);
    const after = (await readAll()).totals['v-a'];
    expect(after).toBe(before + 1);
  });

  it('/api/stats krever nøkkel og returnerer JSON', async () => {
    const { default: stats } = await import('../netlify/functions/stats');
    expect((await stats(new Request('https://x/api/stats'))).status).toBe(401);
    expect((await stats(new Request('https://x/api/stats?key=feil'))).status).toBe(401);
    const ok = await stats(new Request('https://x/api/stats', { headers: { 'x-stats-key': 'hemmelig' } }));
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { days: Record<string, Record<string, number>>; totals: Record<string, number> };
    expect(body.totals['p-takk']).toBe(1);
    const viaQuery = await stats(new Request('https://x/api/stats?key=hemmelig'));
    expect(viaQuery.status).toBe(200);
  });

  it('/api/stats svarer 503 uten STATS_KEY', async () => {
    const saved = process.env.STATS_KEY;
    delete process.env.STATS_KEY;
    const { default: stats } = await import('../netlify/functions/stats');
    expect((await stats(new Request('https://x/api/stats?key=x'))).status).toBe(503);
    process.env.STATS_KEY = saved;
  });
});
