/** «torsdag 10. september kl. 10.00» i norsk tid. */
export function formatWhen(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Oslo',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekday = get('weekday');
  const day = get('day');
  const month = get('month');
  const hour = get('hour');
  const minute = get('minute');
  if (!weekday || !day || !month || !hour) return null;
  return `${weekday} ${day}. ${month} kl. ${hour}.${minute}`;
}

export function firstName(full: string): string {
  return (full ?? '').trim().split(/\s+/)[0] ?? '';
}
