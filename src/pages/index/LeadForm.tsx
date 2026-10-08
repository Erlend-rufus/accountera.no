import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Input, Notice } from '../../ds';
import { site, type Variant } from '../../content/site';
import { labels } from '../../shared/form-content';
import { validateStep1, type FieldError, type Step1FieldName } from '../../shared/validate';
import { getConsent } from '../../lib/consent';
import { config } from '../../lib/config';
import { setStoredLead, type Utm } from '../../lib/storage';
import { firstName } from '../../lib/format';

type Values = { name: string; tel: string; company: string };
const initial: Values = { name: '', tel: '', company: '' };

type LeadResponse = { leadId: string };

/** Forsinkelsen er bare for at «Nummeret er mottatt»-meldingen skal rekke å vises, ikke en simulert
 * innsending - selve API-kallet er allerede fullført når denne starter. */
const SENT_PAUSE_MS = 700;

export function LeadForm({ variant, utm }: { variant: Variant; utm: Utm }) {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<Step1FieldName, string>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [announce, setAnnounce] = useState('');
  const t0 = useRef<number>(Date.now());
  const clientEventId = useRef<string>(crypto.randomUUID());
  const honeypot = useRef<HTMLInputElement>(null);

  const update =
    (field: Step1FieldName) =>
    (e: ChangeEvent<HTMLInputElement>) => {
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
    const map: Partial<Record<Step1FieldName, string>> = {};
    for (const e of list) if (!map[e.field]) map[e.field] = e.message;
    setErrors(map);
    setAnnounce(`${labels.errorSummary} ${list.map((e) => e.message).join(' ')}`);
    const first = list[0]?.field;
    if (first) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`f-${first}`);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 160;
        window.scrollTo({ top, behavior: 'smooth' });
        el.focus({ preventScroll: true });
      });
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending' || status === 'sent') return;
    const result = validateStep1(values);
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
      pageUrl: window.location.href,
      clientEventId: clientEventId.current,
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
      if (res.status === 422) {
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
        telRaw: result.data.telRaw,
        v: variant,
        clientEventId: clientEventId.current,
      });
      setStatus('sent');
      setAnnounce(labels.sentTitle);
      window.setTimeout(() => window.location.assign('/takk'), SENT_PAUSE_MS);
    } catch {
      // Nettverksfeil: behold alt som er fylt ut.
      setStatus('error');
    }
  }

  const sending = status === 'sending';
  const sent = status === 'sent';

  return (
    <form className="form" onSubmit={onSubmit} noValidate aria-describedby="form-note">
      <Input id="f-name" name="name" label={labels.name} type="text" autoComplete="name" aria-required="true" value={values.name} onChange={update('name')} error={errors.name} disabled={sent} />
      <Input id="f-tel" name="tel" label={labels.tel} hint={labels.telHint} type="tel" inputMode="tel" autoComplete="tel" aria-required="true" value={values.tel} onChange={update('tel')} error={errors.tel} disabled={sent} />
      <Input id="f-company" name="company" label={labels.company} type="text" autoComplete="organization" aria-required="true" value={values.company} onChange={update('company')} error={errors.company} disabled={sent} />

      {/* Skjult felt: hero-variant følger med innsendingen. */}
      <input type="hidden" name="v" value={variant} />
      {/* Honningfelle: skjult for mennesker, skal være tom. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="f-website">Nettside</label>
        <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypot} defaultValue="" />
      </div>

      {status === 'error' && <Notice role="alert">{labels.networkError}</Notice>}

      <div className="form__actions">
        {sent ? (
          <Notice tone="success" title={labels.sentTitle}>
            {labels.sentBody}
          </Notice>
        ) : (
          <Button type="submit" icon="arrow-right" full size="lg" disabled={sending} aria-disabled={sending}>
            {sending ? labels.sending : labels.submitStep1}
          </Button>
        )}
        {!sent && (
          <p id="form-note" className="form__note">
            {labels.privacyNote}{' '}
            <a className="ds-link" href={site.privacyHref}>
              {labels.privacyLink}
            </a>
          </p>
        )}
        {!sent && config.weekendEveningBannerEnabled && <p className="form__note">{site.weekendEveningNote}</p>}
      </div>
      <p className="ds-sr-only" aria-live="polite" role="status">
        {announce}
      </p>
    </form>
  );
}
