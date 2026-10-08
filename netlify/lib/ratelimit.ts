/**
 * Enkel rate limiting per IP for /api/lead (AO-2). Glidende vindu: maks 5 innsendinger per 10
 * minutter per IP. Lagrer bare en hash av IP-en, aldri IP-en selv. Kaster aldri: uten Blobs
 * (lokalt) svarer den «ikke begrenset».
 */
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { log } from './log';

export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const RATE_LIMIT_MAX = 5;

export function ipKey(ip: string): string {
  return `ratelimit/${createHash('sha256').update(`acc:${ip}`).digest('hex')}`;
}

export async function isRateLimited(ip: string, now: number): Promise<boolean> {
  if (!ip) return false;
  try {
    const store = getStore('leads');
    const key = ipKey(ip);
    const prev = (await store.get(key, { type: 'json' })) as { count: number; windowStart: number } | null;
    if (!prev || now - prev.windowStart >= RATE_LIMIT_WINDOW_MS) {
      await store.setJSON(key, { count: 1, windowStart: now });
      return false;
    }
    if (prev.count >= RATE_LIMIT_MAX) return true;
    await store.setJSON(key, { count: prev.count + 1, windowStart: prev.windowStart });
    return false;
  } catch (e) {
    log('warn', 'ratelimit.unavailable', { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}
