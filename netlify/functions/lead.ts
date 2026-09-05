import type { Config, Context } from '@netlify/functions';
import { randomUUID } from 'node:crypto';
import { isSpam, parseMeta, toE164, validateLead, decideOutcome } from '../../src/shared/validate';
import { log } from '../lib/log';
import { lookupCompany } from '../lib/brreg';
import { createTask, ensureTags } from '../lib/clickup';
import { isDuplicate } from '../lib/dedupe';
import { postToZapier } from '../lib/zapier';
import { sendLeadToMeta } from '../lib/meta';
import { buildDescription, buildSheetPayload, buildTags, priorityFor, taskName } from '../lib/describe';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async function handler(req: Request, context: Context): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let input: Record<string, unknown>;
  try {
    input = (await req.json()) as Record<string, unknown>;
    if (!input || typeof input !== 'object') throw new Error('body');
  } catch {
    return json({ error: 'body' }, 400);
  }

  const now = Date.now();
  const leadId = randomUUID();

  // 1. Spam avvises stille. Spammere skal ikke få vite at de ble avvist.
  if (isSpam(input, now)) {
    log('info', 'lead.spam', { leadId });
    return json({ leadId, taskId: null, utfall: 'kvalifisert' });
  }

  // 2. Validering med samme regler og tekster som i nettleseren.
  const v = validateLead(input);
  if (!v.ok) return json({ errors: v.errors }, 400);
  const lead = v.data;
  const meta = parseMeta(input);

  // 3. Utfall bygger bare på skjemasvaret.
  const outcome = decideOutcome(lead.bransje);

  // 4. Enhetsregisteret. Blokkerer aldri, feiler aldri.
  const brregResult = await lookupCompany(lead.company);
  if (brregResult.error) log('warn', 'brreg.failed', { leadId, error: brregResult.error });

  // 5. ClickUp-task. Ikke lenger lead-registeret (avgjørelse 5. september 2026, Google Sheet via
  // Zapier er det), bare et sekundært arbeidsverktøy. Skal aldri kunne stoppe en innsending, og
  // feil her er ikke kritisk: logges på «warn», ikke «error». Duplikat: opprett likevel, men tagg.
  const duplicate = await isDuplicate(lead.tel, now);
  const facts = { lead, meta, outcome, brreg: brregResult.match, leadId, duplicate, submittedAt: now };
  const tags = buildTags(facts);
  const steps: Record<string, boolean> = { brreg: !brregResult.error };

  let task: { id: string; url: string } | null = null;
  const clickupToken = process.env.CLICKUP_TOKEN;
  if (clickupToken) {
    void ensureTags(clickupToken);
    try {
      task = await createTask(clickupToken, {
        name: taskName(lead),
        markdown: buildDescription(facts),
        tags,
        priority: priorityFor(outcome),
      });
      steps.clickup = true;
    } catch (e) {
      steps.clickup = false;
      log('warn', 'lead.clickup_failed', { leadId, error: e instanceof Error ? e.message : String(e) });
    }
  } else {
    steps.clickup = false;
    log('warn', 'lead.clickup_token_missing', { leadId });
  }

  // 6. Zapier → Google Sheet. Dette ER lead-registeret nå, og dermed kritisk: mister vi denne
  // raden, mister vi henvendelsen. Prøver på nytt ved feil (se postToZapier), og total feil
  // logges høyt uansett om ClickUp-tasken over lyktes eller ikke.
  const zapierUrl = process.env.ZAPIER_HOOK_URL;
  const sheetPayload = buildSheetPayload(facts, task?.url ?? '');
  if (zapierUrl) {
    steps.zapier = await postToZapier(zapierUrl, sheetPayload, leadId);
  } else {
    steps.zapier = false;
    log('error', 'lead.zapier_hook_missing', { leadId });
  }
  if (!steps.zapier) log('error', 'lead.row_not_written', { leadId });

  // 7. Meta Conversions API, bare med samtykke. Samme event_id som pixelen.
  const pixelId = process.env.META_PIXEL_ID;
  const capiToken = process.env.META_CAPI_TOKEN;
  if (meta.consent === 'all' && pixelId && capiToken) {
    const origin = req.headers.get('origin') || req.headers.get('referer') || process.env.SITE_URL || context.site?.url || '';
    const sourceUrl = origin ? new URL(`/?v=${meta.v}`, origin).toString() : '';
    steps.capi = await sendLeadToMeta(
      pixelId,
      capiToken,
      {
        eventId: leadId,
        email: lead.email,
        phoneE164: toE164(lead.tel),
        fbclid: meta.fbclid,
        sourceUrl,
        userAgent: req.headers.get('user-agent') ?? undefined,
        ip: context.ip || undefined,
        now,
      },
      process.env.META_TEST_EVENT_CODE || undefined,
    );
  } else {
    steps.capi = false;
  }

  // 8. Svar. Loggen: leadId, utfall og steg. Aldri persondata.
  log('info', 'lead.done', { leadId, utfall: outcome, verifisert: brregResult.match.status, duplikat: duplicate, taskId: task?.id ?? null, steps });
  return json({ leadId, taskId: task?.id ?? null, utfall: outcome });
}

export const config: Config = { path: '/api/lead' };
