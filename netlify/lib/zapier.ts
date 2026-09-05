import { log } from './log';

const MAX_ATTEMPTS = 2;

/**
 * Poster leadet til Zapier Catch Hook, som skriver raden i Google Sheet-registeret (avgjørelse
 * 5. september 2026: arket er lead-registeret, ikke ClickUp). Kritisk: feiler dette permanent,
 * mister vi henvendelsen. Prøver derfor på nytt én gang. Kaster likevel aldri: innsendingen til
 * besøkeren skal alltid lykkes, men total feil etter begge forsøk logges på «error»-nivå med
 * leadId, slik at den kan spores og gjenopprettes manuelt i Netlifys funksjonslogg. Loggen
 * inneholder aldri selve nyttelasten, som har navn, telefon og e-post.
 */
export async function postToZapier(
  url: string,
  payload: Record<string, unknown>,
  leadId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  let reason = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;
      reason = `http ${res.status}`;
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    log('warn', 'zapier.attempt_failed', { leadId, attempt, reason });
  }
  log('error', 'zapier.failed', { leadId, attempts: MAX_ATTEMPTS, reason });
  return false;
}
