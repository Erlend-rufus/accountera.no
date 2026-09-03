import type { BrregMatch } from '../../src/shared/brreg';
import type { LeadFields, LeadMeta, Outcome } from '../../src/shared/validate';
import { formatPhone, toE164 } from '../../src/shared/validate';

export type TaskFacts = {
  lead: LeadFields;
  meta: LeadMeta;
  outcome: Outcome;
  brreg: BrregMatch;
  leadId: string;
  duplicate: boolean;
  submittedAt: number;
};

export function taskName(lead: LeadFields): string {
  return `${lead.company} · ${lead.name}`;
}

/** Tagger: vinkel-a|b|c, og kvalifisert, diskvalifisert eller ikke-verifisert. Pluss duplikat ved behov. */
export function buildTags(f: Pick<TaskFacts, 'meta' | 'outcome' | 'brreg' | 'duplicate'>): string[] {
  const tags = [`vinkel-${f.meta.v}`];
  if (f.outcome === 'diskvalifisert') tags.push('diskvalifisert');
  else if (f.brreg.status === 'verifisert') tags.push('kvalifisert');
  else tags.push('ikke-verifisert');
  if (f.duplicate) tags.push('duplikat');
  return tags;
}

export function priorityFor(outcome: Outcome): number {
  return outcome === 'diskvalifisert' ? 4 : 1;
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

export function buildDescription(f: TaskFacts): string {
  const { lead, meta, brreg } = f;
  const lines: string[] = [];
  lines.push(`**Telefon:** [${formatPhone(lead.tel)}](tel:${toE164(lead.tel)})`);
  lines.push(`**E-post:** ${esc(lead.email)}`);
  lines.push(`**Regnskapsprogram:** ${esc(lead.program)}`);
  lines.push(`**Bransje:** ${esc(lead.bransje)}`);
  lines.push('');
  lines.push('**Melding:**');
  lines.push(lead.msg ? esc(lead.msg) : '_(ingen melding)_');
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
  lines.push(`**Utfall:** ${f.outcome}${f.duplicate ? ' · duplikat (samme telefonnummer siste 24 timer)' : ''}`);
  lines.push(`**Variant:** ${meta.v}`);
  const utm = [
    ['utm_source', meta.utm_source],
    ['utm_medium', meta.utm_medium],
    ['utm_campaign', meta.utm_campaign],
    ['utm_content', meta.utm_content],
    ['fbclid', meta.fbclid ? 'ja' : ''],
  ].filter(([, v]) => v);
  lines.push(`**UTM:** ${utm.length ? utm.map(([k, v]) => `${k}=${esc(v)}`).join(', ') : '(ingen)'}`);
  lines.push(`**Sendt inn:** ${formatOsloTime(f.submittedAt)} (norsk tid)`);
  lines.push(`**leadId:** ${f.leadId}`);
  return lines.join('\n');
}
