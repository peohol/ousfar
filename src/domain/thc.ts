import type { Analyte } from '../types'

/**
 * THC-syre i urin som oppføring i appen. Koden, analysemetoden og
 * søkeoppføringen står i fagmiljøets analyttkatalog
 * (`src/domain/analyttkatalog.ts`); fortolkningen står i `thcMotor.ts` og
 * leser reglene og tekstene som er publisert i databasen (`docs/thc-syre.md`).
 */

export function erThcAnalytt(analyte: Analyte): boolean {
  return analyte.modul?.type === 'thc'
}
