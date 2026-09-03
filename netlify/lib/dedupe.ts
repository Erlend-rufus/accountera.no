import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { log } from './log';

export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function phoneKey(eightDigits: string): string {
  return `phone/${createHash('sha256').update(`acc:${eightDigits}`).digest('hex')}`;
}

/**
 * Samme telefonnummer siste 24 timer? Lagrer bare en hash av nummeret og et tidsstempel i Netlify Blobs.
 * Kaster aldri: uten Blobs (lokalt) svarer den false.
 */
export async function isDuplicate(eightDigits: string, now: number): Promise<boolean> {
  try {
    const store = getStore('leads');
    const key = phoneKey(eightDigits);
    const prev = (await store.get(key, { type: 'json' })) as { ts?: number } | null;
    const dup = !!prev && typeof prev.ts === 'number' && now - prev.ts < DUPLICATE_WINDOW_MS;
    await store.setJSON(key, { ts: now });
    return dup;
  } catch (e) {
    log('warn', 'dedupe.unavailable', { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}
