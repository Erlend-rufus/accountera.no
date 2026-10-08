import { describe, expect, it } from 'vitest';
import { formatPhone, isSpam, normalizePhone, parseMeta, parseStep2, parseVariant, toE164, validateStep1 } from '../src/shared/validate';
import { errors } from '../src/shared/form-content';

describe('normalizePhone', () => {
  it('godtar åtte sifre som starter på 2–9', () => {
    expect(normalizePhone('40156666')).toBe('40156666');
    expect(normalizePhone('22334455')).toBe('22334455');
    expect(normalizePhone('91234567')).toBe('91234567');
  });
  it('godtar +47 og 0047 foran, men ikke bart 47 (eksakt arbeidsordrens regex)', () => {
    expect(normalizePhone('+47 40 15 66 66')).toBe('40156666');
    expect(normalizePhone('004740156666')).toBe('40156666');
    expect(normalizePhone('4740156666')).toBeNull();
  });
  it('fjerner mellomrom, bindestrek, punktum og parenteser', () => {
    expect(normalizePhone('40-15-66-66')).toBe('40156666');
    expect(normalizePhone('40.15.66.66')).toBe('40156666');
    expect(normalizePhone('912.34.567')).toBe('91234567');
    expect(normalizePhone('(+47) 401 56 666')).toBe('40156666');
  });
  it('akseptkriterium 15: godtar de tre eksemplene, avviser de to', () => {
    expect(normalizePhone('+47 912 34 567')).toBe('91234567');
    expect(normalizePhone('91234567')).toBe('91234567');
    expect(normalizePhone('912.34.567')).toBe('91234567');
    expect(normalizePhone('12345678')).toBeNull();
    expect(normalizePhone('9123456')).toBeNull();
  });
  it('avviser for få, for mange og nummer som starter på 0 eller 1', () => {
    expect(normalizePhone('4015666')).toBeNull();
    expect(normalizePhone('401566661')).toBeNull();
    expect(normalizePhone('01234567')).toBeNull();
    expect(normalizePhone('+46 40156666')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
  it('formaterer', () => {
    expect(toE164('91234567')).toBe('+4791234567');
    expect(formatPhone('91234567')).toBe('91 23 45 67');
  });
});

const valid = { name: 'Kari Nordmann', tel: '912 34 567', company: 'Eksempel AS' };

describe('validateStep1', () => {
  it('godtar gyldig innsending, normaliserer telefon og bevarer det oppgitte', () => {
    const r = validateStep1(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.tel).toBe('91234567');
      expect(r.data.telRaw).toBe('912 34 567');
      expect(r.data.name).toBe('Kari Nordmann');
      expect(r.data.company).toBe('Eksempel AS');
    }
  });
  it('gir feil i feltrekkefølge navn, telefon, firmanavn - med de avtalte tekstene', () => {
    const r = validateStep1({ name: '', tel: '123', company: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.map((e) => e.field)).toEqual(['name', 'tel', 'company']);
      expect(r.errors[0].message).toBe(errors.name);
      expect(r.errors[1].message).toBe(errors.telInvalid);
      expect(r.errors[2].message).toBe(errors.company);
    }
  });
  it('manglende telefon gir «Vi trenger et telefonnummer for å ringe deg tilbake.»', () => {
    const r = validateStep1({ ...valid, tel: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toEqual({ field: 'tel', message: errors.telMissing });
  });
  it('tåler ikke-strenger', () => {
    const r = validateStep1({ name: 42, tel: ['91234567'], company: null });
    expect(r.ok).toBe(false);
  });
  it('nøyaktig tre felt: ingen andre valideres', () => {
    const r = validateStep1(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.data).sort()).toEqual(['company', 'name', 'tel', 'telRaw'].sort());
  });
});

describe('parseStep2', () => {
  it('alle tre felt er valgfrie, delvis utfylt godtas', () => {
    expect(parseStep2({})).toEqual({ har: '', program: '', msg: '', skipped: false });
    expect(parseStep2({ har: 'selv' })).toEqual({ har: 'selv', program: '', msg: '', skipped: false });
  });
  it('ukjent har/program-verdi gir tom streng, ikke feil', () => {
    expect(parseStep2({ har: 'kanskje' }).har).toBe('');
    expect(parseStep2({ program: 'fiken' }).program).toBe('');
    expect(parseStep2({ program: 'Fiken' }).program).toBe('Fiken');
  });
  it('skipped som eksakt boolsk true', () => {
    expect(parseStep2({ skipped: true }).skipped).toBe(true);
    expect(parseStep2({ skipped: 'true' }).skipped).toBe(false);
  });
  it('melding kuttes ved MSG_MAX', () => {
    expect(parseStep2({ msg: 'x'.repeat(3000) }).msg).toHaveLength(2000);
  });
});

describe('parseVariant / parseMeta', () => {
  it('ukjent eller manglende variant gir a', () => {
    expect(parseVariant('b')).toBe('b');
    expect(parseVariant('c')).toBe('c');
    expect(parseVariant('d')).toBe('a');
    expect(parseVariant(undefined)).toBe('a');
    expect(parseVariant('A')).toBe('a');
  });
  it('samtykke bare som all eller necessary', () => {
    expect(parseMeta({ consent: 'all' }).consent).toBe('all');
    expect(parseMeta({ consent: 'necessary' }).consent).toBe('necessary');
    expect(parseMeta({ consent: 'yes' }).consent).toBe('');
    expect(parseMeta({}).consent).toBe('');
  });
  it('t0 som tall, ellers NaN', () => {
    expect(parseMeta({ t0: '1700000000000' }).t0).toBe(1700000000000);
    expect(Number.isNaN(parseMeta({ t0: 'nei' }).t0)).toBe(true);
  });
  it('clientEventId og pageUrl leses og trimmes i lengde', () => {
    expect(parseMeta({ clientEventId: 'abc-123' }).clientEventId).toBe('abc-123');
    expect(parseMeta({ pageUrl: 'https://leads.accountera.no/?v=b' }).pageUrl).toBe('https://leads.accountera.no/?v=b');
  });
});

describe('isSpam', () => {
  const now = 1_700_000_010_000;
  it('honningfelle fylt ut er spam', () => {
    expect(isSpam({ website: 'http://x', t0: now - 60_000 }, now)).toBe(true);
    expect(isSpam({ website: ' ', t0: now - 60_000 }, now)).toBe(false);
  });
  it('under tre sekunder etter t0 er spam, tre sekunder eller mer er ikke', () => {
    expect(isSpam({ t0: now - 2_999 }, now)).toBe(true);
    expect(isSpam({ t0: now - 3_000 }, now)).toBe(false);
    expect(isSpam({ t0: now - 120_000 }, now)).toBe(false);
  });
  it('manglende eller ugyldig t0 er spam', () => {
    expect(isSpam({}, now)).toBe(true);
    expect(isSpam({ t0: 'abc' }, now)).toBe(true);
  });
  it('klokke foran serveren (negativ avstand) slippes gjennom', () => {
    expect(isSpam({ t0: now + 60_000 }, now)).toBe(false);
  });
});
