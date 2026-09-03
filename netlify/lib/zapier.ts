import { log } from './log';

/** Poster hele leadet til Zapier Catch Hook. Kaster aldri; feil logges og innsendingen lykkes likevel. */
export async function postToZapier(url: string, payload: Record<string, unknown>, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      log('warn', 'zapier.failed', { status: res.status });
      return false;
    }
    return true;
  } catch (e) {
    log('warn', 'zapier.failed', { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}
