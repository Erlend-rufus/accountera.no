import type { BrregMatch } from '../../src/shared/brreg';
import type { LeadMeta, Step1Fields } from '../../src/shared/validate';
import { formatPhone, toE164 } from '../../src/shared/validate';

export type TaskFacts = {
  lead: Step1Fields;
  meta: LeadMeta;
  brreg: BrregMatch;
  leadId: string;
  duplicate: boolean;
  submittedAt: number;
};

export function taskName(lead: Step1Fields): string {
  return `${lead.company} · ${lead.name}`;
}

/**
 * Tagger: vinkel-a|b|c, og om firmaet ble verifisert i Enhetsregisteret. Pluss duplikat ved behov.
 * Ingen diskvalifisering lenger (bransje samles ikke inn i steg 1, se design-handoff «Ring meg opp»,
 * 8. oktober 2026, AO-7) - alle henvendelser er likeverdige her, Marius vurderer bransje i samtalen.
 */
export function buildTags(f: Pick<TaskFacts, 'meta' | 'brreg' | 'duplicate'>): string[] {
  const tags = [`vinkel-${f.meta.v}`, f.brreg.status === 'verifisert' ? 'brreg-verifisert' : 'brreg-ikke-verifisert'];
  if (f.duplicate) tags.push('duplikat');
  return tags;
}

/**
 * Steg 1-raden til Zapier Catch Hook → Google Sheet. `leadId` er nå med (motsatt av forrige
 * kontrakt, som bevisst utelot den) - steg 2 må kunne finne raden igjen på den. Ingen e-post eller
 * bransje: feltene samles ikke lenger inn i steg 1.
 */
export function buildStep1SheetPayload(f: TaskFacts): Record<string, string> {
  const brreg = f.brreg;
  const orgnr = brreg.status === 'verifisert' ? brreg.enhet.organisasjonsnummer : '';
  return {
    leadId: f.leadId,
    timestamp: new Date(f.submittedAt).toISOString(),
    navn: f.lead.name,
    firma: f.lead.company,
    telefon: toE164(f.lead.tel),
    telefon_oppgitt: f.lead.telRaw,
    vinkel: f.meta.v,
    utm_source: f.meta.utm_source,
    utm_medium: f.meta.utm_medium,
    utm_campaign: f.meta.utm_campaign,
    utm_content: f.meta.utm_content,
    utm_term: f.meta.utm_term,
    orgnr,
    brreg_treff: brreg.status === 'verifisert' ? 'ja' : 'nei',
    side_url: f.meta.pageUrl,
  };
}

export type Step2SheetInput = {
  leadId: string;
  har: string;
  program: string;
  msg: string;
  step2Status: 'sendt' | 'hoppet_over';
  step2At: number;
};

/** Steg 2-raden: finnes/oppdateres i Zapen på `leadId`. Skal aldri opprette en ny rad (AO-3). */
export function buildStep2SheetPayload(s: Step2SheetInput): Record<string, string> {
  return {
    leadId: s.leadId,
    har: s.har,
    regnskapsprogram: s.program,
    melding: s.msg,
    step2_status: s.step2Status,
    step2_tidspunkt: new Date(s.step2At).toISOString(),
  };
}

export function formatOsloTime(ms: number): string {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Oslo',
  }).format(new Date(ms));
}

function esc(s: string): string {
  return s.replace(/[<>]/g, '');
}

/** ClickUp-beskrivelsen. Sekundært verktøy, oppdateres ikke ved steg 2 (bare Zap/Sheet er det, AO-2/AO-3). */
export function buildDescription(f: TaskFacts): string {
  const { lead, meta, brreg } = f;
  const lines: string[] = [];
  lines.push(`**Telefon:** [${formatPhone(lead.tel)}](tel:${toE164(lead.tel)}) (oppgitt: ${esc(lead.telRaw)})`);
  lines.push('');
  lines.push('**Enhetsregisteret:**');
  if (brreg.status === 'verifisert') {
    const e = brreg.enhet;
    lines.push(`- Org.nr: ${e.organisasjonsnummer} (${esc(e.navn)})`);
    if (e.organisasjonsform?.kode) lines.push(`- Organisasjonsform: ${e.organisasjonsform.kode}${e.organisasjonsform.beskrivelse ? ` – ${esc(e.organisasjonsform.beskrivelse)}` : ''}`);
    if (e.naeringskode1?.kode) lines.push(`- Næringskode: ${e.naeringskode1.kode}${e.naeringskode1.beskrivelse ? ` – ${esc(e.naeringskode1.beskrivelse)}` : ''}`);
    if (typeof e.antallAnsatte === 'number') lines.push(`- Antall ansatte: ${e.antallAnsatte}`);
  } else {
    lines.push(`- Ikke verifisert (${brreg.grunn === 'ingen' ? 'ingen treff' : brreg.grunn === 'flere' ? 'flere treff' : 'usikkert treff'}). Avgjøres manuelt.`);
    for (const k of brreg.kandidater) lines.push(`  - ${k.organisasjonsnummer} ${esc(k.navn)}${k.organisasjonsform?.kode ? ` (${k.organisasjonsform.kode})` : ''}`);
  }
  lines.push('');
  if (f.duplicate) lines.push('**Merk:** samme telefonnummer siste 24 timer (duplikat).');
  lines.push(`**Variant:** ${meta.v}`);
  const utm = [
    ['utm_source', meta.utm_source],
    ['utm_medium', meta.utm_medium],
    ['utm_campaign', meta.utm_campaign],
    ['utm_content', meta.utm_content],
    ['utm_term', meta.utm_term],
    ['fbclid', meta.fbclid ? 'ja' : ''],
  ].filter(([, v]) => v);
  lines.push(`**UTM:** ${utm.length ? utm.map(([k, v]) => `${k}=${esc(v)}`).join(', ') : '(ingen)'}`);
  lines.push(`**Sendt inn:** ${formatOsloTime(f.submittedAt)} (norsk tid)`);
  lines.push(`**leadId:** ${f.leadId}`);
  return lines.join('\n');
}
