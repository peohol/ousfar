import { describe, expect, it } from 'vitest';
import './hjelp';
import { eachDay } from '@delt/personal/dates';
import { dayKind, isScheduledWorkday, outsideEmployment } from '@delt/personal/people';
import { defaultRuleSet } from '@delt/personal/catalog';
import type { Person, RuleSet } from '@delt/personal/types';

const RULES = defaultRuleSet();
const person = (extra: Partial<Person> = {}): Person => ({ id: 'x1', name: 'Testa Oppdiktet', categoryId: 'lis', qualifications: [], active: true, ...extra });

describe('planlagt tilstedeværelse uten arbeidsmønster', () => {
  it('alle hverdager er arbeidsdager, helgen er helg', () => {
    // Uke 48 i 2026: man 23. – søn 29. november
    expect(eachDay('2026-11-23', '2026-11-29').map((d) => dayKind(person(), d, RULES))).toEqual(['work', 'work', 'work', 'work', 'work', 'weekend', 'weekend']);
  });

  it('helligdager regnes ikke som arbeidsdag, også når de faller på en hverdag', () => {
    for (const d of ['2026-04-02', '2026-04-03', '2026-04-06', '2026-05-01', '2026-05-14', '2026-05-25', '2026-12-25']) {
      expect(isScheduledWorkday(person(), d, RULES)).toBe(false);
    }
    expect(dayKind(person(), '2026-05-14', RULES)).toBe('holiday');
    expect(isScheduledWorkday(person(), '2026-05-13', RULES)).toBe(true);
  });

  it('inaktiv eller ikke registrert person er utenfor aktiv periode', () => {
    expect(dayKind(person({ active: false }), '2026-11-24', RULES)).toBe('inactive');
    expect(dayKind(undefined, '2026-11-24', RULES)).toBe('unregistered');
    expect(outsideEmployment('inactive')).toBe(true);
    expect(outsideEmployment('unregistered')).toBe(true);
    expect(outsideEmployment('weekend')).toBe(false);
  });
});

describe('arbeidskalenderen per fagmiljø (B17, A-STA-07)', () => {
  const med = (workCalendar: RuleSet['workCalendar']): RuleSet => ({ ...RULES, ...(workCalendar ? { workCalendar } : {}) });
  const alleDager = med({ weekdays: [true, true, true, true, true, true, true], holidays: true });
  const utenHelligdager = med({ weekdays: [true, true, true, true, true, false, false], holidays: false, holidayCalendar: 'none' });
  const firedagersuke = med({ weekdays: [true, true, false, true, true, false, false], holidays: false });

  it('et fagmiljø med helgebemanning har arbeidsdager også i helger og på helligdager', () => {
    expect(eachDay('2026-11-23', '2026-11-29').map((d) => dayKind(person(), d, alleDager))).toEqual(Array(7).fill('work'));
    expect(dayKind(person(), '2026-12-25', alleDager)).toBe('work');
  });

  it('uten helligdagskalender er helligdagene vanlige ukedager', () => {
    expect(dayKind(person(), '2026-05-14', utenHelligdager)).toBe('work');
    expect(dayKind(person(), '2026-05-14', RULES)).toBe('holiday');
  });

  it('en ukedag uten arbeid er «ikke arbeidsdag», ikke helg', () => {
    expect(dayKind(person(), '2026-11-25', firedagersuke)).toBe('nonWorkday');
    expect(dayKind(person(), '2026-11-28', firedagersuke)).toBe('weekend');
  });

  it('uten arbeidskalender gjelder piloten: mandag–fredag uten helligdager', () => {
    const { workCalendar: _w, ...uten } = RULES;
    expect(eachDay('2026-11-23', '2026-11-29').map((d) => dayKind(person(), d, uten))).toEqual(['work', 'work', 'work', 'work', 'work', 'weekend', 'weekend']);
  });
});
