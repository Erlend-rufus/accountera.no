import { pickBestMatch, type BrregEnhet, type BrregMatch } from '../../src/shared/brreg';

const BASE = 'https://data.brreg.no/enhetsregisteret/api/enheter';
export const BRREG_TIMEOUT_MS = 3000;

export type BrregResult = { match: BrregMatch; error?: string };

/** Slår opp firmanavnet. Tidsavbrudd etter tre sekunder. Kaster aldri: feil gir ikke-verifisert. */
export async function lookupCompany(name: string, fetchImpl: typeof fetch = fetch): Promise<BrregResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BRREG_TIMEOUT_MS);
  try {
    const url = `${BASE}?navn=${encodeURIComponent(name)}&size=5`;
    const res = await fetchImpl(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) return { match: { status: 'ikke-verifisert', kandidater: [], grunn: 'ingen' }, error: `http ${res.status}` };
    const body = (await res.json()) as { _embedded?: { enheter?: BrregEnhet[] } };
    const list = body?._embedded?.enheter ?? [];
    return { match: pickBestMatch(name, list) };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === 'AbortError' ? 'timeout' : e.message) : 'unknown';
    return { match: { status: 'ikke-verifisert', kandidater: [], grunn: 'ingen' }, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
