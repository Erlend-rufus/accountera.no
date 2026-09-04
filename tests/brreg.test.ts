import { describe, expect, it } from 'vitest';
import { normalizeCompanyName, pickBestMatch, type BrregEnhet } from '../src/shared/brreg';

const e = (orgnr: string, navn: string, extra: Partial<BrregEnhet> = {}): BrregEnhet => ({ organisasjonsnummer: orgnr, navn, ...extra });

describe('normalizeCompanyName', () => {
  it('små bokstaver, uten AS/ENK/DA, tegnsetting og doble mellomrom', () => {
    expect(normalizeCompanyName('Eksempel AS')).toBe('eksempel');
    expect(normalizeCompanyName('EKSEMPEL   HÅNDVERK  ENK')).toBe('eksempel håndverk');
    expect(normalizeCompanyName('Nordmann & Sønn DA')).toBe('nordmann sønn');
    expect(normalizeCompanyName('Bygg-Mester AS.')).toBe('bygg mester');
    expect(normalizeCompanyName('  ')).toBe('');
  });
  it('fjerner organisasjonsform bare som eget ord', () => {
    expect(normalizeCompanyName('Dasa AS')).toBe('dasa');
    expect(normalizeCompanyName('Asas Handel')).toBe('asas handel');
  });
});

describe('pickBestMatch', () => {
  it('ett eksakt normalisert treff er verifisert', () => {
    const r = pickBestMatch('Eksempel AS', [e('1', 'EKSEMPEL AS'), e('2', 'EKSEMPEL HOLDING AS')]);
    expect(r.status).toBe('verifisert');
    if (r.status === 'verifisert') expect(r.enhet.organisasjonsnummer).toBe('1');
  });
  it('eksakt treff vinner selv om input mangler AS', () => {
    const r = pickBestMatch('eksempel', [e('1', 'EKSEMPEL AS'), e('2', 'EKSEMPEL HOLDING AS')]);
    expect(r.status).toBe('verifisert');
  });
  it('ett eneste treff som starter på navnet er verifisert', () => {
    const r = pickBestMatch('Nordmann Bygg', [e('9', 'NORDMANN BYGG OG ANLEGG AS')]);
    expect(r.status).toBe('verifisert');
  });
  it('ett eneste treff som ikke starter på navnet er usikkert', () => {
    const r = pickBestMatch('Nordmann', [e('9', 'KARI NORDMANN')]);
    expect(r.status).toBe('ikke-verifisert');
    if (r.status === 'ikke-verifisert') expect(r.grunn).toBe('usikker');
  });
  it('ingen treff', () => {
    const r = pickBestMatch('Eksempel AS', []);
    expect(r).toEqual({ status: 'ikke-verifisert', kandidater: [], grunn: 'ingen' });
  });
  it('flere treff uten eksakt gir inntil tre kandidater', () => {
    const r = pickBestMatch('Eksempel', [e('1', 'EKSEMPEL HOLDING AS'), e('2', 'EKSEMPEL BYGG AS'), e('3', 'EKSEMPEL EIENDOM AS'), e('4', 'EKSEMPEL INVEST AS')]);
    expect(r.status).toBe('ikke-verifisert');
    if (r.status === 'ikke-verifisert') {
      expect(r.grunn).toBe('flere');
      expect(r.kandidater).toHaveLength(3);
    }
  });
  it('to eksakte treff (samme navn, ulik form) er ikke entydig', () => {
    const r = pickBestMatch('Eksempel', [e('1', 'EKSEMPEL AS'), e('2', 'EKSEMPEL ENK')]);
    expect(r.status).toBe('ikke-verifisert');
    if (r.status === 'ikke-verifisert') expect(r.grunn).toBe('flere');
  });
  it('kaster ikke på ufullstendige kandidater', () => {
    const r = pickBestMatch('X', [{ organisasjonsnummer: '', navn: '' } as BrregEnhet]);
    expect(r.status).toBe('ikke-verifisert');
  });
});
