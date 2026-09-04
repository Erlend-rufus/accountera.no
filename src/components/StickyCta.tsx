import { useEffect, useState, type RefObject } from 'react';
import { Button } from '../ds';
import { site } from '../content/site';

type Props = {
  /** Elementer som, når de er i viewport, skjuler den faste knappen (hero-knappen og skjemaet). */
  watch: RefObject<HTMLElement | null>[];
  /** På mobil viser vi samtykkelinjen i stedet til leseren har valgt. */
  enabled: boolean;
};

/** Fast knapp nederst på mobil. `hidden` når skjult, så den aldri opptar plass eller fanger fokus. */
export function StickyCta({ watch, enabled }: Props) {
  const [inView, setInView] = useState<Set<Element>>(() => new Set());

  useEffect(() => {
    const els = watch.map((r) => r.current).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        setInView((prev) => {
          const next = new Set(prev);
          for (const e of entries) {
            if (e.isIntersecting) next.add(e.target);
            else next.delete(e.target);
          }
          return next;
        });
      },
      { threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [watch]);

  const visible = enabled && inView.size === 0;
  return (
    <div className="sticky" hidden={!visible} aria-hidden={!visible}>
      <Button href={site.formAnchor} icon="arrow-right" full tabIndex={visible ? 0 : -1}>
        {site.bookLabel}
      </Button>
    </div>
  );
}
