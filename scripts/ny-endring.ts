/**
 * Lager fila for en ny endring i endringsloggen, med en ny, permanent ID og
 * tidspunktet nå, uten versjonsnummer (`docs/endringslogg.md`):
 *
 *   npm run endring -- patch
 *   npm run endring -- minor --utproving
 *
 * Leddet er `major`, `minor` eller `patch`. `--utproving` gir en føring for en
 * funksjon under utprøving, som bare systemarkitektene ser
 * (`bareSystemarkitekter`, uten `gjelder`). Fila skrives til
 * `src/data/endringer/<id>.json` med tomme tekstfelt; testene og byggingen
 * stopper til de er fylt ut. Versjonsnummeret får endringen når PR-en er slått
 * sammen og appen bygges.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENDRINGSMAPPE } from '../src/drift/endringshistorikk'
import { SEMVERNIVAER, type Semverniva } from '../src/domain/versjon'
import { lagEndringsId } from '../src/domain/versjonering'

const [niva, ...valg] = process.argv.slice(2) as [Semverniva | undefined, ...string[]]
const utproving = valg.includes('--utproving')
if (!niva || !SEMVERNIVAER.includes(niva) || valg.some((v) => v !== '--utproving')) {
  console.error(`Bruk: npm run endring -- <${SEMVERNIVAER.join('|')}> [--utproving]`)
  process.exit(1)
}

const naa = new Date()
const id = lagEndringsId(naa, randomBytes(3).toString('hex'))
const mappe = join(fileURLToPath(new URL('..', import.meta.url)), ENDRINGSMAPPE)
const fil = join(mappe, `${id}.json`)
if (existsSync(fil)) throw new Error(`${fil} finnes allerede`)
mkdirSync(mappe, { recursive: true })

const foring = {
  id,
  semver: niva,
  opprettet: `${naa.toISOString().slice(0, 19)}Z`,
  sammendrag: '',
  typer: [],
  omfang: 'Mindre omfang',
  ...(utproving ? {} : { gjelder: [] }),
  punkter: [''],
  ...(utproving && { bareSystemarkitekter: true }),
}
writeFileSync(fil, `${JSON.stringify(foring, null, 2)}\n`)
console.log(`${ENDRINGSMAPPE}/${id}.json`)
