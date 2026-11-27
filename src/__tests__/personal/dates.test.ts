import { describe, expect, it } from 'vitest';
import './hjelp';
import { addDays, addMonths, diffDays, eachDay, endOfMonth, holidayName, holidaysForYear, isIsoDate, isoWeek, parseTime, startOfWeek, todayIn, weekdayIndex, workYearRange } from '@delt/personal/dates';

describe('addDays', () => {
  it('går over månedsskifte', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('går over årsskifte i begge retninger', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
  });
  it('håndterer skuddår', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
  it('påvirkes ikke av sommertid', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(diffDays('2026-03-01', '2026-04-01')).toBe(31);
  });
  it('eachDay over årsskifte gir alle datoer inklusive endepunkter', () => {
    expect(eachDay('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });
});

describe('addMonths', () => {
  it('klemmer dagen til siste dag i målmåneden', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
  });
  it('går over årsskifte fremover og bakover', () => {
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2026-06-10', -18)).toBe('2024-12-10');
    expect(addMonths('2026-06-10', 12)).toBe('2027-06-10');
  });
  it('endOfMonth i skuddår og vanlig år', () => {
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonth('2026-12-01')).toBe('2026-12-31');
  });
});

describe('ukedager og ISO-uker', () => {
  it('weekdayIndex har mandag = 0 og søndag = 6', () => {
    expect(weekdayIndex('2026-11-23')).toBe(0); // mandag
    expect(weekdayIndex('2026-11-29')).toBe(6); // søndag
  });
  it('startOfWeek går tilbake til mandag, også over årsskifte', () => {
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28');
    expect(startOfWeek('2026-11-23')).toBe('2026-11-23');
  });
  it.each([
    ['2026-01-01', 1],
    ['2026-12-28', 53],
    ['2026-12-31', 53],
    ['2027-01-01', 53],
    ['2027-01-03', 53],
    ['2027-01-04', 1],
    ['2025-12-29', 1],
    ['2024-12-30', 1],
    ['2021-01-03', 53],
    ['2026-11-24', 48],
  ])('isoWeek(%s) = %i', (date, week) => {
    expect(isoWeek(date)).toBe(week);
  });
});

describe('norske helligdager 2026', () => {
  it.each([
    ['2026-01-01', 'Første nyttårsdag'],
    ['2026-04-02', 'Skjærtorsdag'],
    ['2026-04-03', 'Langfredag'],
    ['2026-04-05', 'Første påskedag'],
    ['2026-04-06', 'Andre påskedag'],
    ['2026-05-01', 'Arbeidernes dag'],
    ['2026-05-14', 'Kristi himmelfartsdag'],
    ['2026-05-17', 'Grunnlovsdagen'],
    ['2026-05-24', 'Første pinsedag'],
    ['2026-05-25', 'Andre pinsedag'],
    ['2026-12-25', 'Første juledag'],
    ['2026-12-26', 'Andre juledag'],
  ])('%s er %s', (date, name) => {
    expect(holidayName(date, 'no')).toBe(name);
  });
  it('har nøyaktig 12 helligdager', () => {
    expect(holidaysForYear(2026).size).toBe(12);
  });
  it('vanlige dager og julaften er ikke helligdager', () => {
    expect(holidayName('2026-04-04', 'no')).toBeUndefined();
    expect(holidayName('2026-12-24', 'no')).toBeUndefined();
    expect(holidayName('2026-11-24', 'no')).toBeUndefined();
  });
  it('påskedag i andre år (uavhengig fasit)', () => {
    expect(holidayName('2027-03-28', 'no')).toBe('Første påskedag');
    expect(holidayName('2025-04-20', 'no')).toBe('Første påskedag');
    expect(holidayName('2024-03-31', 'no')).toBe('Første påskedag');
  });
});

describe('workYearRange', () => {
  it('kalenderår når arbeidsåret starter i januar', () => {
    expect(workYearRange('2026-12-31', 1)).toEqual({ start: '2026-01-01', end: '2026-12-31', label: '2026' });
    expect(workYearRange('2027-01-01', 1)).toEqual({ start: '2027-01-01', end: '2027-12-31', label: '2027' });
  });
  it('arbeidsår som starter i august', () => {
    expect(workYearRange('2026-03-10', 8)).toEqual({ start: '2025-08-01', end: '2026-07-31', label: '2025/26' });
    expect(workYearRange('2026-08-01', 8)).toEqual({ start: '2026-08-01', end: '2027-07-31', label: '2026/27' });
    expect(workYearRange('2026-07-31', 8).start).toBe('2025-08-01');
  });
  it('arbeidsår som starter i mars dekker skuddagen', () => {
    const r = workYearRange('2028-02-29', 3);
    expect(r).toEqual({ start: '2027-03-01', end: '2028-02-29', label: '2027/28' });
  });
});

describe('klokkeslett og tidsrom', () => {
  it('parseTime', () => {
    expect(parseTime('08:00')).toBe(480);
    expect(parseTime('15:30')).toBe(930);
    expect(parseTime('24:00')).toBe(1440);
    expect(parseTime('24:01')).toBeNull();
    expect(parseTime('8')).toBeNull();
  });
  it('isIsoDate avviser umulige datoer', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-13-01')).toBe(false);
  });
});

describe('i dag i fagmiljøets tidssone', () => {
  it('følger tidssonen, ikke maskinens klokke, også rundt midnatt og ved sommertid', () => {
    expect(todayIn('Europe/Oslo', new Date('2026-11-24T22:59:59Z'))).toBe('2026-11-24');
    expect(todayIn('Europe/Oslo', new Date('2026-11-24T23:00:00Z'))).toBe('2026-11-25');
    // Sommertid: UTC+2.
    expect(todayIn('Europe/Oslo', new Date('2026-06-30T21:59:59Z'))).toBe('2026-06-30');
    expect(todayIn('Europe/Oslo', new Date('2026-06-30T22:00:00Z'))).toBe('2026-07-01');
    expect(todayIn('UTC', new Date('2026-06-30T22:00:00Z'))).toBe('2026-06-30');
  });

  it('en kalender uten helligdager har ingen', () => {
    expect(holidayName('2026-12-25', 'no')).toBe('Første juledag');
    expect(holidayName('2026-12-25', 'none')).toBeUndefined();
  });
});
