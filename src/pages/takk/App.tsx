import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Card, Notice, RadioGroup, Select, Textarea } from '../../ds';
import { Page } from '../../components/Page';
import { ConsentBar } from '../../components/ConsentBar';
import { PrepareCard } from './PrepareCard';
import { site, takk } from '../../content/site';
import { config } from '../../lib/config';
import { HAR_OPTIONS, PROGRAM_OPTIONS, labels } from '../../shared/form-content';
import type { HarValue } from '../../shared/validate';
import { consumeLeadPending, getStoredLead, getStoredVariant, setBookedWhen } from '../../lib/storage';
import { bindPixelToConsent, loadPixel, track } from '../../lib/pixel';
import { formatWhen } from '../../lib/format';

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: {
        url: string;
        parentElement: HTMLElement;
        prefill?: Record<string, unknown>;
        utm?: Record<string, string>;
      }) => void;
    };
  }
}

const CALENDLY_SCRIPT = 'https://assets.calendly.com/assets/external/widget.js';
const CALENDLY_ORIGIN = 'https://calendly.com';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing && window.Calendly) return resolve();
    const s = existing ?? document.createElement('script');
    s.addEventListener('load', () => resolve());
    s.addEventListener('error', () => reject(new Error('script')));
    if (!existing) {
      s.src = src;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

function calendlyUrl(base: string): string {
  const u = new URL(base);
  u.searchParams.set('hide_gdpr_banner', '1');
  u.searchParams.set('background_color', 'efece6');
  u.searchParams.set('text_color', '142838');
  u.searchParams.set('primary_color', '133c62');
  return u.toString();
}

type CalState = 'loading' | 'ready' | 'failed';

export function App() {
  const [lead] = useState(() => getStoredLead());
  const [step2Done, setStep2Done] = useState(false);
  const [step2Sending, setStep2Sending] = useState(false);
  const [har, setHar] = useState<HarValue>('');
  const [program, setProgram] = useState('');
  const [msg, setMsg] = useState('');
  const [calOpen, setCalOpen] = useState(false);
  const [calState, setCalState] = useState<CalState>('loading');
  const widgetRef = useRef<HTMLDivElement>(null);

  // Lead-hendelsen: bare med gyldig leadId fra en nettopp fullført innsending, bare én gang
  // (flagget slettes uansett). Samtykke sjekkes akkurat nå, ved sideinnlasting, ikke løpende:
  // gir brukeren samtykke først etter at skjemaet er sendt, er hendelsen tapt, og det er riktig.
  // PageView reagerer fortsatt på samtykke som kommer senere på denne siden (bindPixelToConsent()).
  useEffect(() => {
    const pending = !!lead && consumeLeadPending();
    if (pending && lead && loadPixel()) {
      track('Lead', { content_name: 'skjema', vinkel: lead.v }, { eventID: lead.clientEventId });
    }
    return bindPixelToConsent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calendly: lastes først når containeren åpnes (ikke ved sideinnlasting), se AO-6.
  useEffect(() => {
    if (!calOpen || !config.calendlyUrl) return;
    setCalState('loading');
    let loaded = false;
    let cancelled = false;

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== CALENDLY_ORIGIN) return;
      const data = e.data as { event?: string; payload?: Record<string, unknown> } | undefined;
      const ev = data?.event;
      if (typeof ev !== 'string' || !ev.startsWith('calendly.')) return;
      if (!loaded) {
        loaded = true;
        setCalState('ready');
      }
      if (ev === 'calendly.event_scheduled') {
        const p = data?.payload as { event?: { start_time?: string }; scheduled_event?: { start_time?: string } } | undefined;
        const start = p?.event?.start_time ?? p?.scheduled_event?.start_time;
        const when = start ? formatWhen(start) : null;
        if (when) setBookedWhen(when);
        track('Schedule', { content_name: 'booking', vinkel: getStoredVariant() ?? lead?.v ?? '' });
        window.location.assign('/takk/bekreftet');
      }
    };
    window.addEventListener('message', onMessage);

    loadScript(CALENDLY_SCRIPT)
      .then(() => {
        if (cancelled) return;
        const C = window.Calendly;
        const el = widgetRef.current;
        if (!C || !el) throw new Error('calendly');
        C.initInlineWidget({
          url: calendlyUrl(config.calendlyUrl),
          parentElement: el,
          // Calendly krever e-post, og leadet har ingen (AO-6). leadId følger med som sporingsverdi,
          // slik at bookingen kan knyttes til raden manuelt hvis Calendly-oppsettet senere utvides.
          prefill: lead ? { name: lead.name || lead.firstName } : {},
          utm: { utmContent: lead?.leadId ?? '' },
        });
      })
      .catch(() => {
        if (!cancelled) setCalState('failed');
      });

    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calOpen]);

  async function submitStep2(skipped: boolean, e?: FormEvent) {
    e?.preventDefault();
    if (step2Sending || step2Done) return;
    if (!lead) {
      setStep2Done(true);
      return;
    }
    setStep2Sending(true);
    try {
      await fetch(`/api/lead/${encodeURIComponent(lead.leadId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ har, program, msg, skipped }),
      });
    } catch {
      // Steg 2 er valgfritt og ikke kritisk: feiler kallet, viser vi «ferdig» likevel.
    }
    setStep2Sending(false);
    setStep2Done(true);
  }

  const title = lead ? takk.title(lead.firstName, lead.telRaw) : takk.title('', '');

  return (
    <>
      <Page cap>
        <div className="ds-container sub__grid sub__grid--takk2">
          <div className="sub__intro">
            <p className="ds-kicker">{takk.eyebrow}</p>
            <h1 className="ds-h1-thin sub__title" aria-live="polite">
              {title}
            </h1>
            <PrepareCard />
          </div>

          <Card variant="outline" className="form-panel">
            {step2Done ? (
              <Notice tone="success">{takk.step2.done}</Notice>
            ) : (
              <form className="form" onSubmit={(e) => submitStep2(false, e)} noValidate>
                <div>
                  <p className="ds-kicker">{takk.step2.eyebrowLabel}</p>
                  <p className="form__note" style={{ marginTop: '0.75rem' }}>
                    {takk.step2.intro}
                  </p>
                </div>
                <RadioGroup legend={labels.har} name="har" options={HAR_OPTIONS} value={har} onChange={(v) => setHar(v as HarValue)} />
                <Select id="f2-program" label={labels.program} options={PROGRAM_OPTIONS} placeholder={labels.select} value={program} onChange={(e) => setProgram(e.target.value)} />
                <Textarea id="f2-msg" label={labels.msg} optional optionalLabel={labels.optional} rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} />
                <div className="step2__actions">
                  <Button type="submit" icon="arrow-right" disabled={step2Sending} aria-disabled={step2Sending}>
                    {labels.send}
                  </Button>
                  <button type="button" className="step2__skip" onClick={() => submitStep2(true)} disabled={step2Sending}>
                    {labels.skip}
                  </button>
                </div>
              </form>
            )}
          </Card>
        </div>

        <div className="ds-container takk__cal">
          <p className="ds-small ds-muted">
            {takk.calendlyPrompt}
            <button type="button" className="takk__cal-link" aria-expanded={calOpen} onClick={() => setCalOpen((v) => !v)}>
              {takk.calendlyLink}
            </button>
          </p>
          {calOpen &&
            (calState === 'failed' ? (
              <Notice role="alert" className="takk__cal-fallback">
                {takk.calendlyFailed}{' '}
                <a className="ds-link" href={site.phoneHref}>
                  {site.phoneDisplay}
                </a>
              </Notice>
            ) : (
              <div className="cal takk__cal-fallback" aria-busy={calState === 'loading'}>
                <div className="cal__widget" ref={widgetRef} />
                {calState === 'loading' && (
                  <p className="cal__status" role="status">
                    {takk.calendlyLoading}
                  </p>
                )}
              </div>
            ))}
          <p className="ds-small ds-muted takk__cal-fallback">
            {takk.calendlyFallbackBefore}
            <a className="ds-link" href={site.phoneHref}>
              {site.phoneDisplay}
            </a>
            {takk.calendlyFallbackAfter}
          </p>
        </div>
      </Page>
      <ConsentBar />
    </>
  );
}
