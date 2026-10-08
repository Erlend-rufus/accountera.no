import type { Config, Context } from '@netlify/functions';
import { parseStep2 } from '../../src/shared/validate';
import { log } from '../lib/log';
import { postToZapier } from '../lib/zapier';
import { buildStep2SheetPayload } from '../lib/describe';
import { updateLeadStep2 } from '../lib/leads';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/**
 * Steg 2: PATCH /api/lead/:leadId. Finner raden fra steg 1 og fletter inn de tre valgfrie
 * spørsmålene. Oppretter aldri en ny rad (404 hvis leadId ikke finnes). Gjentatte kall er trygge:
 * siste verdi vinner. Se design-handoff «Ring meg opp», 8. oktober 2026, AO-2.
 */
export default async function handler(req: Request, context: Context): Promise<Response> {
  if (req.method !== 'PATCH') return json({ error: 'method' }, 405);

  const leadId = context.params.leadId;
  if (!leadId) return json({ error: 'leadId' }, 400);

  let input: Record<string, unknown>;
  try {
    input = (await req.json()) as Record<string, unknown>;
    if (!input || typeof input !== 'object') throw new Error('body');
  } catch {
    return json({ error: 'body' }, 400);
  }

  const step2 = parseStep2(input);
  const updated = await updateLeadStep2(leadId, step2);
  if (!updated) return json({ error: 'not_found' }, 404);

  // Zapens oppdateringssteg: egen hook, finner raden på leadId og fyller inn resten. Skal ikke
  // lage en ny rad eller et nytt «ny lead»-varsel (AO-3). Ikke kritisk for svaret til besøkeren.
  const zapierUrl = process.env.ZAPIER_HOOK_URL_STEP2;
  if (zapierUrl) {
    const ok = await postToZapier(
      zapierUrl,
      buildStep2SheetPayload({
        leadId,
        har: step2.har,
        program: step2.program,
        msg: step2.msg,
        step2Status: step2.skipped ? 'hoppet_over' : 'sendt',
        step2At: updated.step2At ?? Date.now(),
      }),
      leadId,
    );
    if (!ok) log('error', 'lead.step2_row_not_written', { leadId });
  } else {
    log('warn', 'lead.step2_zapier_hook_missing', { leadId });
  }

  log('info', 'lead.step2_done', { leadId, step2Status: updated.step2Status });
  return json({ ok: true });
}

export const config: Config = { path: '/api/lead/:leadId' };
