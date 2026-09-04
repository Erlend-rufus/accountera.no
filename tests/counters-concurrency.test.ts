import { describe, expect, it, vi } from 'vitest';

/**
 * Samtidige økninger mot et lager med etag-semantikk (som Netlify Blobs i produksjon):
 * onlyIfMatch/onlyIfNew gir `modified: false` ved konflikt, og `increment` prøver på nytt.
 */
type Entry = { value: string; etag: string };
const mem = new Map<string, Entry>();
let seq = 0;
let conflicts = 0;

vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    getWithMetadata: async (key: string) => {
      await new Promise((r) => setTimeout(r, 1));
      const e = mem.get(key);
      return e ? { data: e.value, etag: e.etag, metadata: {} } : null;
    },
    getMetadata: async (key: string) => {
      const e = mem.get(key);
      return e ? { etag: e.etag, metadata: {} } : null;
    },
    set: async (key: string, value: string, opts: { onlyIfMatch?: string; onlyIfNew?: boolean } = {}) => {
      await new Promise((r) => setTimeout(r, 1));
      const e = mem.get(key);
      if (opts.onlyIfNew && e) {
        conflicts++;
        return { modified: false };
      }
      if (opts.onlyIfMatch && (!e || e.etag !== opts.onlyIfMatch)) {
        conflicts++;
        return { modified: false };
      }
      const etag = `"${++seq}"`;
      mem.set(key, { value, etag });
      return { modified: true, etag };
    },
    get: async (key: string) => mem.get(key)?.value ?? null,
    list: async () => ({ blobs: Array.from(mem.keys()).map((key) => ({ key, etag: mem.get(key)!.etag })) }),
  }),
}));

describe('increment med etag', () => {
  it('12 samtidige økninger gir 12, med konflikter underveis', async () => {
    const { increment, readAll } = await import('../netlify/lib/counters');
    await Promise.all(Array.from({ length: 12 }, () => increment('2026-09-05/v-c', 100)));
    const all = await readAll();
    expect(all.days['2026-09-05']['v-c']).toBe(12);
    expect(conflicts).toBeGreaterThan(0);
  });
});
