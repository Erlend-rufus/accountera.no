/**
 * Navnenormalisering og valg av beste treff mot Enhetsregisteret. Ren logikk, ingen nettverk.
 * Selve oppslaget ligger i netlify/lib/brreg.ts.
 */
export type BrregEnhet = {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: { kode?: string; beskrivelse?: string };
  naeringskode1?: { kode?: string; beskrivelse?: string };
  antallAnsatte?: number;
};

export type BrregMatch =
  | { status: 'verifisert'; enhet: BrregEnhet }
  | { status: 'ikke-verifisert'; kandidater: BrregEnhet[]; grunn: 'ingen' | 'flere' | 'usikker' };

const ORG_FORMS = ['as', 'asa', 'enk', 'da', 'ans', 'nuf', 'sa', 'ba', 'stiftelse', 'ks', 'iks', 'kf', 'fli', 'sf', 'sf'];

/** Små bokstaver, uten organisasjonsform, tegnsetting og doble mellomrom. */
export function normalizeCompanyName(raw: string): string {
  const s = (raw ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !ORG_FORMS.includes(w));
  return s.join(' ').trim();
}

/**
 * Velger beste treff. Entydig treff er ett kandidatnavn som normalisert er identisk med det oppgitte,
 * eller ett eneste treff fra registeret som starter på det oppgitte navnet.
 * Alt annet er ikke-verifisert med inntil tre kandidater.
 */
export function pickBestMatch(query: string, candidates: BrregEnhet[]): BrregMatch {
  const q = normalizeCompanyName(query);
  const list = candidates.filter((c) => c && c.organisasjonsnummer && c.navn);
  if (!q || list.length === 0) return { status: 'ikke-verifisert', kandidater: [], grunn: 'ingen' };
  const exact = list.filter((c) => normalizeCompanyName(c.navn) === q);
  if (exact.length === 1) return { status: 'verifisert', enhet: exact[0] };
  if (exact.length > 1) return { status: 'ikke-verifisert', kandidater: exact.slice(0, 3), grunn: 'flere' };
  if (list.length === 1 && normalizeCompanyName(list[0].navn).startsWith(q)) {
    return { status: 'verifisert', enhet: list[0] };
  }
  return { status: 'ikke-verifisert', kandidater: list.slice(0, 3), grunn: list.length > 1 ? 'flere' : 'usikker' };
}
