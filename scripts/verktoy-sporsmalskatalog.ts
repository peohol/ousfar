/**
 * Skriver `docs/verktøy-sporsmalskatalog.md` fra spørsmålskatalogen i
 * `src/verktoy/flyt/sporsmal.ts` (tråd C i `docs/verktøy-brukervennlighet-2026-11.md`, §4.4).
 *
 *   npx vite-node scripts/verktoy-sporsmalskatalog.ts
 */
import { writeFileSync } from 'node:fs'
import { KATALOGTABELLFIL, lagKatalogtabell } from '../src/verktoy/flyt/katalogtabell'

writeFileSync(new URL(`../${KATALOGTABELLFIL}`, import.meta.url), lagKatalogtabell())
console.log(`→ ${KATALOGTABELLFIL}`)
