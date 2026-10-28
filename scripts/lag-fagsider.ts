/**
 * Lager migrasjonen som legger inn nye fagsider uten faginnhold, for én av
 * importene i `FAGSIDEIMPORTER` i `src/faginnhold/nyefagsider.ts`.
 *
 *   npx vite-node scripts/lag-fagsider.ts -- <brukernavn> <migrasjon> <fil> --agent <nøkkel> [--lenke <PR>]
 *
 * `brukernavn` er administratoren revisjonene føres på, og `migrasjon` navnet
 * på importen (f.eks. `verktoy_fagsider`). Filen legges i
 * `supabase/migrations/` med tidspunktet som versjon, og rulles ut når PR-en
 * slås sammen (`docs/migrasjoner.md`). Koblingene til FEST lages for seg
 * (`scripts/lag-festkoblinger.ts`), i en migrasjon etter denne.
 */
import { writeFileSync } from 'node:fs'
import { FAGSIDEIMPORTER, nyeFagsiderSql } from '../src/faginnhold/nyefagsider'
import { AGENTBRUK, erklartMigrasjon, lesAgentvalg } from './agentvalg'

const valg = lesAgentvalg(process.argv.slice(2))
const [admin, migrasjon, fil] = valg.resten
const valgt = FAGSIDEIMPORTER.find((i) => i.migrasjon === migrasjon)
if (!admin || !valgt || !fil) {
  console.error(`Bruk: <brukernavn> <${FAGSIDEIMPORTER.map((i) => i.migrasjon).join(' | ')}> <fil> ${AGENTBRUK}`)
  process.exit(1)
}

// Uten linjeskift til slutt: apply_migration lagrer teksten uten, og filen skal være lik byte for byte.
writeFileSync(fil, erklartMigrasjon(nyeFagsiderSql(valgt.sider, admin, valgt.kilde, valgt), fil, valg, `Nye fagsider uten faginnhold (${valgt.sider.length})`))
console.log(`${valgt.sider.length} fagsider → ${fil}`)
