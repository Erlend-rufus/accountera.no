import { log } from './log';

const API = 'https://api.clickup.com/api/v2';

export const LIST_ID = process.env.CLICKUP_LIST_ID || '901525768674';
export const SPACE_ID = process.env.CLICKUP_SPACE_ID || '90154749971';

/** ClickUp: 1 = urgent, 2 = high, 3 = normal, 4 = low. */
export const PRIORITY = { urgent: 1, low: 4 } as const;

export type TaskInput = {
  name: string;
  markdown: string;
  tags: string[];
  priority: number;
};

export type CreatedTask = { id: string; url: string };

const REQUIRED_TAGS = [
  'vinkel-a',
  'vinkel-b',
  'vinkel-c',
  'kvalifisert',
  'diskvalifisert',
  'ikke-verifisert',
  'duplikat',
  'har-byraa',
  'foerer-selv',
  'tidligere-byraa',
];

let tagsEnsured: Promise<void> | null = null;

function headers(token: string) {
  return { authorization: token, 'content-type': 'application/json', accept: 'application/json' };
}

/** Oppretter taggene i spacet hvis de mangler. Kjøres én gang per kald start, aldri blokkerende for innsendingen. */
export function ensureTags(token: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  if (!tagsEnsured) {
    tagsEnsured = (async () => {
      const res = await fetchImpl(`${API}/space/${SPACE_ID}/tag`, { headers: headers(token) });
      if (!res.ok) throw new Error(`tags http ${res.status}`);
      const body = (await res.json()) as { tags?: { name: string }[] };
      const have = new Set((body.tags ?? []).map((t) => t.name.toLowerCase()));
      for (const name of REQUIRED_TAGS) {
        if (have.has(name)) continue;
        const r = await fetchImpl(`${API}/space/${SPACE_ID}/tag`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ tag: { name, tag_fg: '#EFECE6', tag_bg: '#133C62' } }),
        });
        if (!r.ok) log('warn', 'clickup.tag.create_failed', { tag: name, status: r.status });
      }
    })().catch((e) => {
      tagsEnsured = null;
      log('warn', 'clickup.tags.failed', { error: e instanceof Error ? e.message : String(e) });
    });
  }
  return tagsEnsured;
}

/** Oppretter task. Prøver én gang til ved feil. Kaster hvis begge forsøk feiler. */
export async function createTask(token: string, input: TaskInput, fetchImpl: typeof fetch = fetch): Promise<CreatedTask> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetchImpl(`${API}/list/${LIST_ID}/task`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          name: input.name,
          markdown_description: input.markdown,
          tags: input.tags,
          priority: input.priority,
          notify_all: true,
        }),
      });
      if (!res.ok) throw new Error(`clickup http ${res.status}`);
      const body = (await res.json()) as { id?: string; url?: string };
      if (!body.id) throw new Error('clickup: no id');
      return { id: body.id, url: body.url ?? `https://app.clickup.com/t/${body.id}` };
    } catch (e) {
      lastError = e;
      log('warn', 'clickup.create.failed', { attempt, error: e instanceof Error ? e.message : String(e) });
    }
  }
  throw lastError instanceof Error ? lastError : new Error('clickup failed');
}
