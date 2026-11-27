import { describe, expect, it } from 'vitest';
import './hjelp';
import { checkNote, NOTE_MAX_LENGTH } from '@delt/personal/privacy';

describe('merknader (ikke-sensitiv planleggingsinformasjon)', () => {
  it.each([
    '01019012345',
    '010190 12345',
    '010190-12345',
    '010190.12345',
    'Ref 31129912345 i notat',
  ])('avviser fødselsnummerlignende tekst: %s', (note) => {
    const r = checkNote(note);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/fødselsnummer/i);
  });

  it.each([
    'Er sykemeldt',
    'syk',
    'Sykdom i familien',
    'Legetime kl 10',
    'legebesøk',
    'Operasjon planlagt',
    'Gravid',
    'Begravelse',
    'Innlagt',
    'Diagnose avklares',
    'Behandling på dagtid',
    'SYKEMELDT',
    'Influensa',
    'Omgangssyke',
    'Forkjølet',
    'Har feber',
    'Covid-19',
  ])('avviser sensitive ord: %s', (note) => {
    expect(checkNote(note).ok).toBe(false);
  });

  it.each([
    'Møte med kollegene',
    'Seminar for legeforeningen? nei – for kollegaer',
    'Rom 3, prosjektmøte',
    'Bytter med Kari',
    'Telefon 12345678',
    'Kursdag 2026-11-24',
    'Uke 48',
  ])('godtar harmløs tekst: %s', (note) => {
    expect(checkNote(note).ok).toBe(true);
  });

  it('tom og manglende merknad er ok', () => {
    expect(checkNote(undefined)).toEqual({ ok: true, value: '' });
    expect(checkNote('   ')).toEqual({ ok: true, value: '' });
  });

  it('normaliserer mellomrom', () => {
    expect(checkNote('  Rom   3  ').value).toBe('Rom 3');
  });

  it(`maks lengde er ${NOTE_MAX_LENGTH} tegn`, () => {
    expect(checkNote('a'.repeat(NOTE_MAX_LENGTH)).ok).toBe(true);
    expect(checkNote('a'.repeat(NOTE_MAX_LENGTH + 1)).ok).toBe(false);
  });
});
