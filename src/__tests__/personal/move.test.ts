import { describe, expect, it } from 'vitest';
import './hjelp';
import { added, d, makeState } from './fixtures';
import { defaultRuleSet, RULES_EPOCH, STATUS_IDS as S } from '@delt/personal/catalog';
import { setEntryLocked } from '@delt/personal/allocation/index';
import { setStatus } from '@delt/personal/commands';
import { PermissionError } from '@delt/personal/permissions';
import { analyzeMove, commitMove, describeMove, type MoveKind } from '@delt/personal/move';
import { entryAt, entryProblems } from '@delt/personal/rules';
import type { PlannerState } from '@delt/personal/types';

/** Syntetiske data (oppdiktede navn). */
const TUE = '2026-11-24';
const WED = '2026-11-25';
const SAT = '2026-11-28';

const idAt = (s: PlannerState, personId: string, date: string) => entryAt(s, personId, date)!.id;
const statusAt = (s: PlannerState, personId: string, date: string) => entryAt(s, personId, date)?.statusId;
const kinds = (a: ReturnType<typeof analyzeMove>) => a.options.map((o) => o.kind);
const allValid = (s: PlannerState) => s.entries.every((e) => entryProblems(s, e, TUE).length === 0);
const move = (s: PlannerState, from: [string, string], to: [string, string], kind: MoveKind = 'move') => commitMove(s, 'planner', idAt(s, ...from), { personId: to[0], date: to[1] }, kind, TUE);

describe('flytting til en tom celle', () => {
  it('flytter direkte og beholder ID, klokkeslett, merknad og lås', () => {
    let s = added(makeState(), d('f1', TUE, S.duty1, { time: { start: 480, end: 720 }, note: 'Vakttelefon' }));
    s = setEntryLocked(s, 'planner', idAt(s, 'f1', TUE), true);
    const id = idAt(s, 'f1', TUE);
    const a = analyzeMove(s, 'planner', id, { personId: 'f4', date: WED }, TUE);
    expect(a.outcome).toBe('ok');
    expect(kinds(a)).toEqual(['move']);
    const next = move(s, ['f1', TUE], ['f4', WED]).state;
    expect(next.entries).toEqual([{ id, personId: 'f4', date: WED, statusId: S.duty1, time: { start: 480, end: 720 }, note: 'Vakttelefon', ruleVersion: 1, locked: true }]);
  });

  it('slipp på samme sted gjør ingenting', () => {
    const s = added(makeState(), d('f1', TUE, S.referent));
    const a = analyzeMove(s, 'planner', idAt(s, 'f1', TUE), { personId: 'f1', date: TUE }, TUE);
    expect(a.outcome).toBe('same');
    expect(a.options).toEqual([]);
  });

  it('avviser en mottaker som ikke er kvalifisert, og en vakt til helg', () => {
    const s = added(makeState(), d('f1', TUE, S.duty1));
    const id = idAt(s, 'f1', TUE);
    const toUnqualified = analyzeMove(s, 'planner', id, { personId: 'f3', date: TUE }, TUE);
    expect(toUnqualified.outcome).toBe('rejected');
    expect(toUnqualified.reasons.join(' ')).toMatch(/kvalifisert/);
    expect(analyzeMove(s, 'planner', id, { personId: 'f4', date: SAT }, TUE).outcome).toBe('rejected');
  });

  it('tar aldri over en vakt fra en tredje person', () => {
    let s = added(makeState(), d('f1', TUE, S.duty1));
    s = added(s, d('f4', WED, S.duty1));
    const a = analyzeMove(s, 'planner', idAt(s, 'f1', TUE), { personId: 'f5', date: WED }, TUE);
    expect(a.outcome).toBe('rejected');
    expect(a.reasons.join(' ')).toMatch(/Vakt 1 er alt tildelt Per Hansen/);
  });

  it('sier fra om vakten blir udekket der den flyttes fra', () => {
    const s = added(makeState(), d('f1', TUE, S.duty1));
    const a = analyzeMove(s, 'planner', idAt(s, 'f1', TUE), { personId: 'f4', date: WED }, TUE);
    expect(a.options[0]!.uncovered.map((u) => [u.date, u.statusId])).toEqual([[TUE, S.duty1]]);
  });
});

describe('flytting til en celle med en status', () => {
  it('bytter Vakt 1 og Vakt 2 mellom to kvalifiserte; merknad og tid følger statusene', () => {
    let s = added(makeState(), d('f1', TUE, S.duty1, { note: 'Første' }));
    s = added(s, d('f4', TUE, S.duty2, { time: { start: 600, end: 900 } }));
    const a = analyzeMove(s, 'planner', idAt(s, 'f1', TUE), { personId: 'f4', date: TUE }, TUE);
    expect(a.outcome).toBe('conflict');
    expect(a.blocker?.statusId).toBe(S.duty2);
    expect(kinds(a)).toEqual(['swap', 'replace']);
    const swap = a.options.find((o) => o.kind === 'swap')!;
    expect(swap.removed).toEqual([]);
    expect(swap.uncovered).toEqual([]);
    expect(entryAt(swap.state, 'f4', TUE)).toMatchObject({ statusId: S.duty1, note: 'Første' });
    expect(entryAt(swap.state, 'f1', TUE)).toMatchObject({ statusId: S.duty2, time: { start: 600, end: 900 } });
    expect(allValid(swap.state)).toBe(true);
  });

  it('«Flytt og erstatt» viser statusen som forsvinner og vakten som blir udekket (Vakt 1 er fortsatt dekket)', () => {
    let s = added(makeState(), d('f1', TUE, S.duty1));
    s = added(s, d('f4', TUE, S.duty2));
    const a = analyzeMove(s, 'planner', idAt(s, 'f1', TUE), { personId: 'f4', date: TUE }, TUE);
    const replace = a.options.find((o) => o.kind === 'replace')!;
    expect(replace.removed.map((e) => e.statusId)).toEqual([S.duty2]);
    expect(replace.uncovered.map((u) => u.statusId)).toEqual([S.duty2]);
    expect(statusAt(replace.state, 'f4', TUE)).toBe(S.duty1);
    expect(statusAt(replace.state, 'f1', TUE)).toBeUndefined();
  });

  it('tilbyr ikke bytte når den andre statusen ikke kan stå på det opprinnelige stedet', () => {
    // Referent kan flyttes til f1, men f1s Vakt 2 kan ikke stå hos f3, som ikke er kvalifisert.
    let s = added(makeState(), d('f3', TUE, S.referent));
    s = added(s, d('f1', TUE, S.duty2));
    const a = analyzeMove(s, 'planner', idAt(s, 'f3', TUE), { personId: 'f1', date: TUE }, TUE);
    expect(a.outcome).toBe('conflict');
    expect(kinds(a)).toEqual(['replace']);
    expect(a.reasons.join(' ')).toMatch(/Kan ikke byttes/);
  });

  it('bytte over datoer: hver status vurderes etter reglene på sin nye dato', () => {
    let s = added(makeState(), d('f1', TUE, S.away));
    s = added(s, d('f4', SAT, S.wishOff));
    // Borte kan flyttes til lørdag og Ønske om fri tilbake til tirsdag.
    const a = analyzeMove(s, 'planner', idAt(s, 'f1', TUE), { personId: 'f4', date: SAT }, TUE);
    expect(kinds(a)).toEqual(['swap', 'replace']);
    const next = move(s, ['f1', TUE], ['f4', SAT], 'swap').state;
    expect(statusAt(next, 'f4', SAT)).toBe(S.away);
    expect(statusAt(next, 'f1', TUE)).toBe(S.wishOff);
  });

  it('avviser når statusen ikke kan stå hos mottakeren, uansett hva mottakeren har', () => {
    let s = added(makeState(), d('f1', TUE, S.duty1));
    s = added(s, d('f3', TUE, S.away));
    const a = analyzeMove(s, 'planner', idAt(s, 'f1', TUE), { personId: 'f3', date: TUE }, TUE);
    expect(a.outcome).toBe('rejected');
  });
});

describe('lagring av en flytting', () => {
  it('vurderes på nytt mot gjeldende kalender: et foreldet valg lagrer ingenting', () => {
    let s = added(makeState(), d('f1', TUE, S.referent));
    const id = idAt(s, 'f1', TUE);
    expect(analyzeMove(s, 'planner', id, { personId: 'f4', date: TUE }, TUE).outcome).toBe('ok');
    // I mellomtiden får f4 en status; den direkte flyttingen er ikke lenger mulig.
    s = setStatus(s, 'planner', d('f4', TUE, S.away)).state;
    expect(() => commitMove(s, 'planner', id, { personId: 'f4', date: TUE }, 'move', TUE)).toThrow(/Ingenting er endret/);
  });

  it('bruker regelversjonen som gjelder måldatoen', () => {
    const current = defaultRuleSet();
    let s: PlannerState = { ...makeState(), rules: { ...current, version: 2, effectiveFrom: TUE }, ruleVersions: [{ ...current, version: 1, effectiveFrom: RULES_EPOCH }], ruleVersionSeq: 2 };
    s = { ...s, entries: [{ id: 'v', personId: 'f1', date: '2026-11-19', statusId: S.duty1, ruleVersion: 1 }] };
    expect(commitMove(s, 'planner', 'v', { personId: 'f4', date: '2026-11-20' }, 'move', TUE).state.entries[0]!.ruleVersion).toBe(1);
    expect(commitMove(s, 'planner', 'v', { personId: 'f4', date: WED }, 'move', TUE).state.entries[0]!.ruleVersion).toBe(2);
  });

  it('leser og systemarkitekt uten lokal myndighet kan ikke flytte', () => {
    const s = added(makeState(), d('f1', TUE, S.referent));
    for (const role of ['reader', 'outsideArchitect'] as const) {
      expect(() => analyzeMove(s, role, idAt(s, 'f1', TUE), { personId: 'f4', date: TUE }, TUE)).toThrow(PermissionError);
    }
  });

  it('beskrivelsen sier hva som skjedde, til meldingen og angre-historikken', () => {
    let s = added(makeState(), d('f1', TUE, S.duty1));
    s = added(s, d('f4', TUE, S.duty2));
    const a = analyzeMove(s, 'planner', idAt(s, 'f1', TUE), { personId: 'f4', date: TUE }, TUE);
    expect(describeMove(s, a, 'swap')).toBe('Vakt 1 og Vakt 2 byttet mellom Kari Prøvesen og Per Hansen');
    expect(describeMove(s, a, 'replace')).toBe('Vakt 1 flyttet til Per Hansen og erstattet Vakt 2');
    const b = analyzeMove(s, 'planner', idAt(s, 'f1', TUE), { personId: 'f5', date: WED }, TUE);
    expect(describeMove(s, b, 'move')).toMatch(/^Vakt 1 flyttet til Lise Fiktiv, /);
  });
});
