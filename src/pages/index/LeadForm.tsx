import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Input, Notice, Select, Textarea } from '../../ds';
import { site, type Variant } from '../../content/site';
import { BRANSJE_OPTIONS, MSG_MAX, PROGRAM_OPTIONS, REGNSKAPSFORER_OPTIONS, labels } from '../../shared/form-content';
import { toE164, validateLead, type FieldError, type LeadFieldName } from '../../shared/validate';
import { getConsent } from '../../lib/consent';
import { setStoredLead, type Utm } from '../../lib/storage';
import { firstName } from '../../lib/format';

type Values = Record<LeadFieldName, string>;
const initial: Values = { name: '', company: '', tel: '', email: '', regnskapsforer: '', program: '', bransje: '', msg: '' };

type LeadResponse = { leadId: string; taskId: string | null; utfall: 'kvalifisert' | 'diskvalifisert' };

export function LeadForm({ variant, utm }: { variant: Variant; utm: Utm }) {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<LeadFieldName, string>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [announce, setAnnounce] = useState('');
  const t0 = useRef<number>(Date.now());
  const honeypot = useRef<HTMLInputElement>(null);

  const update =
    (field: LeadFieldName) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      setValues((prev) => ({ ...prev, [field]: v }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    };

  function applyErrors(list: FieldError[]) {
    const map: Partial<Record<LeadFieldName, string>> = {};
    for (const e of list) if (!map[e.field]) map[e.field] = e.message;
    setErrors(map);
    setAnnounce(`${labels.errorSummary} ${list.map((e) => e.message).join(' ')}`);
    const first = list[0]?.field;
    if (first) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`f-${first}`);
        if (!el) return;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus({ preventScroll: true });
      });
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    const result = validateLead(values);
    if (!result.ok) {
      applyErrors(result.errors);
      return;
    }
    setStatus('sending');
    setErrors({});
    setAnnounce('');
    const payload = {
      ...values,
      v: variant,
      ...utm,
      t0: t0.current,
      consent: getConsent() ?? '',
      website: honeypot.current?.value ?? '',
    };
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 400) {
        const body = (await res.json().catch(() => null)) as { errors?: FieldError[] } | null;
        if (body && Array.isArray(body.errors) && body.errors.length) applyErrors(body.errors);
        setStatus('idle');
        return;
      }
      if (!res.ok) throw new Error(`http ${res.status}`);
      const body = (await res.json()) as LeadResponse;
      if (!body || typeof body.leadId !== 'string') throw new Error('bad body');
      setStoredLead({
        leadId: body.leadId,
        name: result.data.name,
        firstName: firstName(result.data.name),
        email: result.data.email,
        tel: toE164(result.data.tel),
        taskId: body.taskId ?? null,
        utfall: body.utfall,
      });
      setAnnounce('Meldingen er sendt.');
      window.location.assign(body.utfall === 'diskvalifisert' ? '/takker-nei' : '/takk');
    } catch {
      // Nettverksfeil: behold alt som er fylt ut.
      setStatus('error');
    }
  }

  const sending = status === 'sending';

  return (
    <form className="form" onSubmit={onSubmit} noValidate aria-describedby="form-note">
      <Input id="f-name" name="name" label={labels.name} type="text" autoComplete="name" aria-required="true" value={values.name} onChange={update('name')} error={errors.name} />
      <Input id="f-company" name="company" label={labels.company} type="text" autoComplete="organization" aria-required="true" value={values.company} onChange={update('company')} error={errors.company} />
      <Input id="f-tel" name="tel" label={labels.tel} hint={labels.telHint} type="tel" inputMode="tel" autoComplete="tel" aria-required="true" value={values.tel} onChange={update('tel')} error={errors.tel} />
      <Input id="f-email" name="email" label={labels.email} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" aria-required="true" value={values.email} onChange={update('email')} error={errors.email} />
      <Select id="f-regnskapsforer" name="regnskapsforer" label={labels.regnskapsforer} options={REGNSKAPSFORER_OPTIONS} placeholder={labels.select} aria-required="true" value={values.regnskapsforer} onChange={update('regnskapsforer')} error={errors.regnskapsforer} />
      <Select id="f-program" name="program" label={labels.program} options={PROGRAM_OPTIONS} placeholder={labels.select} aria-required="true" value={values.program} onChange={update('program')} error={errors.program} />
      <Select id="f-bransje" name="bransje" label={labels.bransje} options={BRANSJE_OPTIONS} placeholder={labels.select} aria-required="true" value={values.bransje} onChange={update('bransje')} error={errors.bransje} />
      <Textarea id="f-msg" name="msg" label={labels.msg} optional optionalLabel={labels.optional} maxLength={MSG_MAX} rows={4} value={values.msg} onChange={update('msg')} error={errors.msg} />

      {/* Skjulte felt: variant, UTM, fbclid og t0 følger med i innsendingen. */}
      <input type="hidden" name="v" value={variant} />
      <input type="hidden" name="utm_source" value={utm.utm_source} />
      <input type="hidden" name="utm_medium" value={utm.utm_medium} />
      <input type="hidden" name="utm_campaign" value={utm.utm_campaign} />
      <input type="hidden" name="utm_content" value={utm.utm_content} />
      <input type="hidden" name="fbclid" value={utm.fbclid} />
      <input type="hidden" name="t0" value={t0.current} />
      {/* Honningfelle: skjult for mennesker, skal være tom. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="f-website">Nettside</label>
        <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypot} defaultValue="" />
      </div>

      {status === 'error' && <Notice role="alert">{labels.networkError}</Notice>}

      <div className="form__actions">
        <Button type="submit" icon="arrow-right" full disabled={sending} aria-disabled={sending}>
          {sending ? labels.sending : labels.submit}
        </Button>
        <p id="form-note" className="form__note">
          {labels.privacyNote}{' '}
          <a className="ds-link" href={site.privacyHref}>
            {labels.privacyLink}
          </a>
        </p>
      </div>
      <p className="ds-sr-only" aria-live="polite" role="status">
        {announce}
      </p>
    </form>
  );
}
