import { getStore } from '@netlify/blobs';

export const PAGES = ['v-a', 'v-b', 'v-c', 'p-takk'] as const;
export type PageKey = (typeof PAGES)[number];

/** «v=a» → «v-a», «p=takk» → «p-takk». Alt annet: null. */
export function pageKeyFrom(params: URLSearchParams): PageKey | null {
  const v = params.get('v');
  if (v === 'a' || v === 'b' || v === 'c') return `v-${v}`;
  const p = params.get('p');
  if (p === 'takk') return 'p-takk';
  return null;
}

/** Dato i norsk tid, YYYY-MM-DD. */
export function osloDate(ms: number): string {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  return parts;
}

/**
 * Øker en daglig teller. Betinget skriving mot etag (onlyIfMatch / onlyIfNew) med noen forsøk,
 * slik at samtidige økninger ikke går tapt. Mangler etag fra lageret, skrives ubetinget.
 */
export async function increment(key: string, attempts = 5): Promise<void> {
  const store = getStore('views');
  for (let i = 0; i < attempts; i++) {
    const cur = await store.getWithMetadata(key, { type: 'text' });
    if (!cur) {
      const created = await store.set(key, '1', { onlyIfNew: true });
      if (created.modified !== false) return;
      continue;
    }
    let etag: string | undefined = cur.etag;
    if (!etag) etag = (await store.getMetadata(key))?.etag;
    const next = String((Number(cur.data) || 0) + 1);
    const res = etag ? await store.set(key, next, { onlyIfMatch: etag }) : await store.set(key, next);
    if (res.modified !== false) return;
  }
}

export async function readAll(): Promise<{ days: Record<string, Record<string, number>>; totals: Record<string, number> }> {
  const store = getStore('views');
  const days: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {};
  const { blobs } = await store.list();
  for (const b of blobs) {
    const [day, page] = b.key.split('/');
    if (!day || !page) continue;
    const n = Number((await store.get(b.key, { type: 'text' })) ?? 0) || 0;
    (days[day] ??= {})[page] = n;
    totals[page] = (totals[page] ?? 0) + n;
  }
  return { days, totals };
}
