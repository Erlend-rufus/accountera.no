/** Strukturert logg uten persondata. Aldri navn, telefon eller e-post her. Loggen er ikke et lead-register. */
export function log(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, event, ...data, ts: new Date().toISOString() });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
