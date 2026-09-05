import { describe, expect, it } from 'vitest';
import { decideOutcome, formatPhone, isSpam, isValidEmail, normalizePhone, parseMeta, parseVariant, toE164, validateLead } from '../src/shared/validate';
import { errors } from '../src/shared/form-content';

describe('normalizePhone', () => {
  it('godtar åtte sifre som starter på 2–9', () => {
    expect(normalizePhone('40156666')).toBe('40156666');
    expect(normalizePhone('22334455')).toBe('22334455');
    expect(normalizePhone('91234567')).toBe('91234567');
  });
  it('godtar +47, 0047 og 47 foran', () => {
    expect(normalizePhone('+47 40 15 66 66')).toBe('40156666');
    expect(normalizePhone('004740156666')).toBe('40156666');
    expect(normalizePhone('4740156666')).toBe('40156666');
  });
  it('fjerner mellomrom, bindestrek, punktum og parenteser', () => {
    expect(normalizePhone('40-15-66-66')).toBe('40156666');
    expect(normalizePhone('40.15.66.66')).toBe('40156666');
    expect(normalizePhone('(+47) 401 56 666')).toBe('40156666');
  });
  it('avviser for få, for mange og nummer som starter på 0 eller 1', () => {
    expect(normalizePhone('4015666')).toBeNull();
    expect(normalizePhone('401566661')).toBeNull();
    expect(normalizePhone('01234567')).toBeNull();
    expect(normalizePhone('12345678')).toBeNull();
    expect(normalizePhone('+46 40156666')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
  it('formaterer', () => {
    expect(toE164('40156666')).toBe('+4740156666');
    expect(formatPhone('40156666')).toBe('40 15 66 66');
  });
});

describe('isValidEmail', () => {
  it('godtar vanlige adresser', () => {
    expect(isValidEmail('kari.nordmann@example.com')).toBe(true);
    expect(isValidEmail('post@firma.no')).toBe(true);
    expect(isValidEmail('a+b@sub.domene.co.uk')).toBe(true);
  });
  it('avviser ufullstendige', () => {
    expect(isValidEmail('kari@example')).toBe(false);
    expect(isValidEmail('kari.example.com')).toBe(false);
    expect(isValidEmail('kari @example.com')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('decideOutcome', () => {
  it('diskvalifiserer landbruk og kraft, alt annet kvalifisert', () => {
    expect(decideOutcome('Landbruk og skogbruk')).toBe('diskvalifisert');
    expect(decideOutcome('Energi og kraftproduksjon')).toBe('diskvalifisert');
    expect(decideOutcome('Bygg, anlegg og håndverk')).toBe('kvalifisert');
    expect(decideOutcome('Annet')).toBe('kvalifisert');
    expect(decideOutcome('')).toBe('kvalifisert');
  });
});

const valid = {
  name: 'Kari Nordmann',
  company: 'Eksempel AS',
  tel: '+47 40 15 66 66',
  email: 'Kari.Nordmann@Example.com',
  regnskapsforer: 'Nei, jeg fører selv',
  program: 'Fiken',
  bransje: 'Bygg, anlegg og håndverk',
  msg: 'Har ført selv i tre år.',
};

describe('validateLead', () => {
  it('godtar gyldig innsending og normaliserer telefon og e-post', () => {
    const r = validateLead(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.tel).toBe('40156666');
      expect(r.data.email).toBe('kari.nordmann@example.com');
      expect(r.data.name).toBe('Kari Nordmann');
    }
  });
  it('tom melding er greit', () => {
    expect(validateLead({ ...valid, msg: '' }).ok).toBe(true);
    expect(validateLead({ ...valid, msg: undefined }).ok).toBe(true);
  });
  it('gir feil i feltrekkefølge med de avtalte tekstene', () => {
    const r = validateLead({ ...valid, name: '', tel: '123', email: '', regnskapsforer: '', program: 'Ukjent', bransje: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.map((e) => e.field)).toEqual(['name', 'tel', 'email', 'regnskapsforer', 'program', 'bransje']);
      expect(r.errors[0].message).toBe(errors.name);
      expect(r.errors[1].message).toBe(errors.telInvalid);
      expect(r.errors[2].message).toBe(errors.emailMissing);
      expect(r.errors[3].message).toBe(errors.regnskapsforer);
      expect(r.errors[4].message).toBe(errors.program);
      expect(r.errors[5].message).toBe(errors.bransje);
    }
  });
  it('manglende telefon gir «Vi trenger et telefonnummer for å ringe deg tilbake.»', () => {
    const r = validateLead({ ...valid, tel: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toEqual({ field: 'tel', message: 'Vi trenger et telefonnummer for å ringe deg tilbake.' });
  });
  it('avviser meldinger over 2000 tegn', () => {
    const r = validateLead({ ...valid, msg: 'x'.repeat(2001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].message).toBe(errors.msgTooLong);
    expect(validateLead({ ...valid, msg: 'x'.repeat(2000) }).ok).toBe(true);
  });
  it('avviser verdier utenfor listene', () => {
    expect(validateLead({ ...valid, regnskapsforer: 'Kanskje' }).ok).toBe(false);
    expect(validateLead({ ...valid, program: 'fiken' }).ok).toBe(false);
    expect(validateLead({ ...valid, bransje: 'Landbruk' }).ok).toBe(false);
  });
  it('tåler ikke-strenger', () => {
    const r = validateLead({ ...valid, name: 42, msg: null, tel: ['40156666'] });
    expect(r.ok).toBe(false);
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
