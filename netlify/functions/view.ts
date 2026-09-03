import type { Config } from '@netlify/functions';
import { increment, osloDate, pageKeyFrom } from '../lib/counters';
import { log } from '../lib/log';

/** Teller en visning. Ingen IP, ingen informasjonskapsel, ingen fingeravtrykk. */
export default async function handler(req: Request): Promise<Response> {
  const headers = { 'cache-control': 'no-store, private' };
  if (req.method !== 'GET') return new Response(null, { status: 405, headers });
  const key = pageKeyFrom(new URL(req.url).searchParams);
  if (!key) return new Response(null, { status: 204, headers });
  try {
    await increment(`${osloDate(Date.now())}/${key}`);
  } catch (e) {
    log('warn', 'view.failed', { error: e instanceof Error ? e.message : String(e) });
  }
  return new Response(null, { status: 204, headers });
}

export const config: Config = { path: '/api/view' };
