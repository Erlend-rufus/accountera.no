import type { Config, Context } from '@netlify/functions';
import { randomUUID } from 'node:crypto';
import { isSpam, parseMeta, toE164, validateStep1 } from '../../src/shared/validate';
import { log } from '../lib/log';
import { lookupCompany } from '../lib/brreg';
import { createTask, ensureTags, PRIORITY } from '../lib/clickup';
import { isDuplicate } from '../lib/dedupe';
import { isRateLimited } from '../lib/ratelimit';
import { postToZapier } from '../lib/zapier';
import { sendLeadToMeta } from '../lib/meta';
import { buildDescription, buildStep1SheetPayload, buildTags, taskName } from '../lib/describe';
import { createLead, findLeadIdByClientEventId, recordIdempotencyKey } from '../lib/leads';

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

  // 1. Spam avvises stille. Spammere skal ikke få vite at de ble avvist.
  if (isSpam(input, now)) {
    log('info', 'lead.spam', { leadId: null });
    return json({ leadId: randomUUID() }, 201);
  }

  // 2. Rate limiting per IP (AO-2). Enkelt, glidende vindu. Svarer 429, ingen detaljer.
  if (await isRateLimited(context.ip || '', now)) {
    log('warn', 'lead.rate_limited', {});
    return json({ error: 'rate_limited' }, 429);
  }

  // 3. Idempotens: samme clientEventId (dobbeltklikk, nettverksretry) gir samme leadId, aldri en ny rad.
  const meta = parseMeta(input);
  if (meta.clientEventId) {
    const existingId = await findLeadIdByClientEventId(meta.clientEventId);
    if (existingId) {
      log('info', 'lead.idempotent_replay', { leadId: existingId });
      return json({ leadId: existingId }, 201);
    }
  }

  // 4. Validering med samme regler og tekster som i nettleseren.
  const v = validateStep1(input);
  if (!v.ok) return json({ errors: v.errors }, 422);
  const lead = v.data;

  // 5. Enhetsregisteret. Blokkerer aldri, feiler aldri.
  const brregResult = await lookupCompany(lead.company);
  const leadId = randomUUID();
  if (brregResult.error) log('warn', 'brreg.failed', { leadId, error: brregResult.error });

  // 6. Lagre raden (steg 1). Kritisk for at steg 2 skal finne den igjen, se netlify/lib/leads.ts.
  const duplicate = await isDuplicate(lead.tel, now);
  const facts = { lead, meta, brreg: brregResult.match, leadId, duplicate, submittedAt: now };
  await createLead({
    id: leadId,
    createdAt: now,
    name: lead.name,
    company: lead.company,
    tel: toE164(lead.tel),
    telRaw: lead.telRaw,
    variant: meta.v,
    utm_source: meta.utm_source,
    utm_medium: meta.utm_medium,
    utm_campaign: meta.utm_campaign,
    utm_content: meta.utm_content,
    utm_term: meta.utm_term,
    fbclid: meta.fbclid,
    pageUrl: meta.pageUrl,
    brreg: brregResult.match,
  });
  if (meta.clientEventId) await recordIdempotencyKey(meta.clientEventId, leadId);

  // 7. ClickUp-task. Sekundært arbeidsverktøy, ikke lead-registeret. Skal aldri kunne stoppe en
  // innsending: feil her er ikke kritisk, logges på «warn». Duplikat: opprett likevel, men tagg.
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
        priority: PRIORITY.urgent,
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

  // 8. Zapier → Google Sheet, steg 1. Dette ER lead-registeret, og dermed kritisk: mister vi denne
  // raden, mister vi henvendelsen. Prøver på nytt ved feil (se postToZapier).
  const zapierUrl = process.env.ZAPIER_HOOK_URL;
  const sheetPayload = buildStep1SheetPayload(facts);
  if (zapierUrl) {
    steps.zapier = await postToZapier(zapierUrl, sheetPayload, leadId);
  } else {
    steps.zapier = false;
    log('error', 'lead.zapier_hook_missing', { leadId });
  }
  if (!steps.zapier) log('error', 'lead.row_not_written', { leadId });

  // 9. Meta Conversions API, bare med samtykke. Samme event_id (clientEventId) som pixelen, se AO-4.
  const pixelId = process.env.META_PIXEL_ID;
  const capiToken = process.env.META_CAPI_TOKEN;
  if (meta.consent === 'all' && meta.clientEventId && pixelId && capiToken) {
    const origin = req.headers.get('origin') || req.headers.get('referer') || process.env.SITE_URL || context.site?.url || '';
    const sourceUrl = origin ? new URL(`/?v=${meta.v}`, origin).toString() : '';
    steps.capi = await sendLeadToMeta(
      pixelId,
      capiToken,
      {
        eventId: meta.clientEventId,
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

  // 10. Svar. Loggen: leadId og steg. Aldri persondata.
  log('info', 'lead.done', { leadId, verifisert: brregResult.match.status, duplikat: duplicate, taskId: task?.id ?? null, steps });
  return json({ leadId }, 201);
}

export const config: Config = { path: '/api/lead' };
