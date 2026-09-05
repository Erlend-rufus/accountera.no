import type { BrregMatch } from '../../src/shared/brreg';
import type { LeadFields, LeadMeta, Outcome } from '../../src/shared/validate';
import { formatPhone, toE164 } from '../../src/shared/validate';
import { REGNSKAPSFORER_TAGS } from '../../src/shared/form-content';

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

/**
 * Tagger: vinkel-a|b|c, og kvalifisert, diskvalifisert eller ikke-verifisert. Pluss duplikat ved behov,
 * og en tagg for regnskapsfører i dag (har-byraa | foerer-selv | tidligere-byraa). Sistnevnte måler
 * bare sammensetning og påvirker aldri f.outcome (tillegg til byggebrief 08, 5. september 2026).
 */
export function buildTags(f: Pick<TaskFacts, 'meta' | 'outcome' | 'brreg' | 'duplicate' | 'lead'>): string[] {
  const tags = [`vinkel-${f.meta.v}`];
  if (f.outcome === 'diskvalifisert') tags.push('diskvalifisert');
  else if (f.brreg.status === 'verifisert') tags.push('kvalifisert');
  else tags.push('ikke-verifisert');
  if (f.duplicate) tags.push('duplikat');
  const regnskapsforerTag = REGNSKAPSFORER_TAGS[f.lead.regnskapsforer];
  if (regnskapsforerTag) tags.push(regnskapsforerTag);
  return tags;
}

export function priorityFor(outcome: Outcome): number {
  return outcome === 'diskvalifisert' ? 4 : 1;
}

/**
 * Nyttelasten til Zapier Catch Hook → Google Sheet, lead-registeret siden 5. september 2026
 * (avgjørelse: Marius valgte Sheet i oppstartsworkshopen, ikke ClickUp). Nøkkelnavnene er en
 * kontrakt mot Zapen, satt av tillegget til byggebrief 08 samme dato: skal sendes eksakt slik,
 * ellers blir kolonner tomme i arket uten at noen får en feilmelding. `clickupUrl` er tom streng
 * når ClickUp ikke ble brukt (manglende token, eller kallet feilet), aldri null.
 */
export function buildSheetPayload(f: TaskFacts, clickupUrl: string): Record<string, string> {
  const brreg = f.brreg;
  const orgnr = brreg.status === 'verifisert' ? brreg.enhet.organisasjonsnummer : '';
  return {
    timestamp: new Date(f.submittedAt).toISOString(),
    navn: f.lead.name,
    firma: f.lead.company,
    telefon: toE164(f.lead.tel),
    epost: f.lead.email,
    har_regnskapsforer: f.lead.regnskapsforer,
    regnskapsprogram: f.lead.program,
    bransje: f.lead.bransje,
    melding: f.lead.msg,
    vinkel: f.meta.v,
    utm_source: f.meta.utm_source,
    utm_campaign: f.meta.utm_campaign,
    utm_content: f.meta.utm_content,
    orgnr,
    brreg_treff: brreg.status === 'verifisert' ? 'ja' : 'nei',
    kvalifisert: f.outcome === 'diskvalifisert' ? 'nei' : brreg.status === 'verifisert' ? 'ja' : 'ikke verifisert',
    clickup_url: clickupUrl,
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

export function buildDescription(f: TaskFacts): string {
  const { lead, meta, brreg } = f;
  const lines: string[] = [];
  lines.push(`**Telefon:** [${formatPhone(lead.tel)}](tel:${toE164(lead.tel)})`);
  lines.push(`**E-post:** ${esc(lead.email)}`);
  lines.push(`**Har regnskapsfører i dag:** ${esc(lead.regnskapsforer)}`);
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
