import type { Config } from '@netlify/functions';
import { timingSafeEqual } from 'node:crypto';
import { readAll } from '../lib/counters';

function keyOk(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Tellerne som JSON, bak en enkel nøkkel. Til ukesgjennomgangen. */
export default async function handler(req: Request): Promise<Response> {
  const expected = process.env.STATS_KEY;
  if (!expected) return new Response(JSON.stringify({ error: 'STATS_KEY er ikke satt' }), { status: 503, headers: { 'content-type': 'application/json' } });
  const url = new URL(req.url);
  const given = req.headers.get('x-stats-key') ?? url.searchParams.get('key');
  if (!keyOk(given, expected)) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  const data = await readAll();
  return new Response(JSON.stringify(data, null, 2), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

export const config: Config = { path: '/api/stats' };
