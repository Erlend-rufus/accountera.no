/** Teller sidevisning uten informasjonskapsler. Én GET per lasting, ingenting om personen. */
export function countView(query: { v?: string; p?: string }) {
  const qs = new URLSearchParams();
  if (query.v) qs.set('v', query.v);
  if (query.p) qs.set('p', query.p);
  try {
    void fetch(`/api/view?${qs.toString()}`, { method: 'GET', keepalive: true, credentials: 'omit', cache: 'no-store' }).catch(() => {});
  } catch {
    /* ignorer */
  }
}
