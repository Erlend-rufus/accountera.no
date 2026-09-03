import { useEffect, useRef, useState } from 'react';
import { Button, Card, Notice } from '../../ds';
import { Page } from '../../components/Page';
import { ConsentBar } from '../../components/ConsentBar';
import { site, takk } from '../../content/site';
import { config } from '../../lib/config';
import { consumeLeadPending, getStoredLead } from '../../lib/storage';
import { bindPixelToConsent, track } from '../../lib/pixel';
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
const LOAD_TIMEOUT_MS = 5000;

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

type State = 'loading' | 'ready' | 'failed' | 'confirmed';

export function App() {
  const [lead] = useState(() => getStoredLead());
  // Uten Calendly-URL starter siden rett i telefon-fallback, så ingenting flytter seg etter første tegning.
  const [state, setState] = useState<State>(() => (config.calendlyUrl ? 'loading' : 'failed'));
  const [when, setWhen] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const leadPending = useRef<boolean>(false);

  // Lead-hendelsen: bare med gyldig leadId, bare én gang, bare med samtykke. Flagget slettes uansett.
  useEffect(() => {
    leadPending.current = !!lead && consumeLeadPending();
    const unbind = bindPixelToConsent(() => {
      if (leadPending.current && lead) {
        track('Lead', {}, { eventID: lead.leadId });
        leadPending.current = false;
      }
    });
    return unbind;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calendly inline. Laster den ikke innen fem sekunder: telefon-fallback. Leadet er allerede lagret.
  useEffect(() => {
    if (!config.calendlyUrl) return;
    let loaded = false;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!loaded) setState('failed');
    }, LOAD_TIMEOUT_MS);

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== CALENDLY_ORIGIN) return;
      const data = e.data as { event?: string; payload?: Record<string, unknown> } | undefined;
      const ev = data?.event;
      if (typeof ev !== 'string' || !ev.startsWith('calendly.')) return;
      if (!loaded) {
        loaded = true;
        window.clearTimeout(timer);
        setState((s) => (s === 'loading' ? 'ready' : s));
      }
      if (ev === 'calendly.event_scheduled') {
        const p = data?.payload as { event?: { start_time?: string }; scheduled_event?: { start_time?: string } } | undefined;
        const start = p?.event?.start_time ?? p?.scheduled_event?.start_time;
        setWhen(start ? formatWhen(start) : null);
        setState('confirmed');
        track('Schedule');
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
          prefill: lead
            ? {
                name: lead.name || lead.firstName,
                email: lead.email,
                // Telefon som svar på arrangementets første egendefinerte spørsmål.
                customAnswers: { a1: lead.tel },
              }
            : {},
          utm: { utmContent: lead?.taskId ?? '' },
        });
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmed = state === 'confirmed';
  const title = confirmed
    ? when
      ? takk.confirmed.titleWithTime(when)
      : takk.confirmed.titleNoTime
    : lead?.firstName
      ? takk.titleWithName(lead.firstName)
      : takk.titleNoName;

  return (
    <>
      <Page cap>
        <div className="ds-container sub__grid sub__grid--takk">
          <div className="sub__intro" style={{ gridArea: 'intro' }}>
            <p className="ds-kicker">{confirmed ? takk.confirmed.kicker : takk.kicker}</p>
            <h1 className="ds-h1-thin sub__title" aria-live="polite">
              {title}
            </h1>
            <p className="ds-lead">{confirmed ? takk.confirmed.lead : takk.lead}</p>
          </div>

          {!confirmed && state === 'failed' && (
            <div style={{ gridArea: 'cal' }}>
              <Notice role="alert">
                {takk.calendlyFailed}{' '}
                <a className="ds-link" href={site.phoneHref}>
                  {site.phoneDisplay}
                </a>
              </Notice>
            </div>
          )}
          {!confirmed && state !== 'failed' && (
            <div className="cal" style={{ gridArea: 'cal' }} aria-busy={state === 'loading'}>
              <div className="cal__widget" ref={widgetRef} />
              {state === 'loading' && (
                <p className="cal__status" role="status">
                  {takk.calendlyLoading}
                </p>
              )}
            </div>
          )}

          <div className="sub__aside" style={{ gridArea: 'aside' }}>
            <Card variant="outline" className="prepare">
              <h2 className="ds-h3">{takk.prepare.heading}</h2>
              <ul>
                {takk.prepare.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </Card>
            {confirmed ? (
              <Button href="/" variant="secondary" icon="arrow-left" full>
                {site.backLabel}
              </Button>
            ) : (
              <p>
                {takk.noTimeBefore}
                <a className="ds-link" href={site.phoneHref}>
                  {site.phoneDisplay}
                </a>
                {takk.noTimeAfter}
              </p>
            )}
          </div>
        </div>
      </Page>
      <ConsentBar />
    </>
  );
}
