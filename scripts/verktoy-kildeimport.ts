/**
 * Henter Psychiatrienets anbefalinger inn i kildearkivet for OUSFAR Verktøy
 * (P3 i `docs/verktøy-utviklingsplan.md`), og lager rapporten.
 *
 *   npm run verktoy:kildeimport -- hent      De tre tabellene og hver side de lenker til (én om gangen)
 *   npm run verktoy:kildeimport -- rapport   docs/verktøy-p3-kildegrunnlag.md
 *
 * `hent` legger et nytt uttrekk til `src/data/verktoy/psychiatrienet-kildearkiv.json`
 * og skriver hva som er nytt, endret eller borte siden forrige. Den henter ikke
 * sidene for johannesurt eller Start-kolonnen. Sidene leses i minnet og
 * skrives aldri til disk; arkivet får bare det `src/verktoy/kildeside.ts` og
 * `arkivtabell` leser av dem, ingen anbefalingstekst
 * (`docs/verktøy-p3-rettigheter.md`), og arkivet kontrolleres mot de tillatte
 * feltene før det skrives (`src/verktoy/kildefelt.ts`). Vedvarer en forbigående serverfeil,
 * stopper innhentingen uten å skrive noe (`src/verktoy/kildehenting.ts`).
 * Skriptet skriver ikke til databasen og endrer ingen regel. Innhentingen står i
 * `src/verktoy/kildeinnhenting.ts`, felles med kildeovervåkingen (P12.1).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { registrerInnhenting, TOMT_ARKIV, type Kildearkiv } from '../src/verktoy/kildearkiv'
import { kontrollerKildefelt } from '../src/verktoy/kildefelt'
import { innhentPsychiatrienet } from '../src/verktoy/kildeinnhenting'
import type { Virkestoffkartlegging } from '../src/verktoy/kartlegging'

const ARKIV = new URL('../src/data/verktoy/psychiatrienet-kildearkiv.json', import.meta.url)
const KARTLEGGING = new URL('../src/data/verktoy/virkestoffkartlegging.json', import.meta.url)

async function hentAlt() {
  const k = JSON.parse(readFileSync(KARTLEGGING, 'utf8')) as Virkestoffkartlegging
  const inn = await innhentPsychiatrienet(k, { framdrift: (n) => console.log(`${n} sider`) })
  const forrige = existsSync(ARKIV) ? (JSON.parse(readFileSync(ARKIV, 'utf8')) as Kildearkiv) : TOMT_ARKIV
  const { arkiv, endringer } = registrerInnhenting(forrige, inn)
  kontrollerKildefelt('psychiatrienet-kildearkiv.json', arkiv)
  writeFileSync(ARKIV, `${JSON.stringify(arkiv, null, 1)}\n`)
  console.log(`→ src/data/verktoy/psychiatrienet-kildearkiv.json (uttrekk ${arkiv.uttrekk.at(-1)!.nr}, ${inn.sider.length} sider)`)
  for (const type of ['ny', 'endret', 'forsvunnet'] as const) {
    const e = endringer.filter((x) => x.type === type)
    console.log(`${type}: ${e.length}${e.length && e.length <= 30 ? ` – ${e.map((x) => x.id).join(', ')}` : ''}`)
  }
}

async function rapport() {
  const { lagKilderapport, KILDERAPPORTFIL } = await import('../src/verktoy/kilderapport')
  writeFileSync(new URL(`../${KILDERAPPORTFIL}`, import.meta.url), lagKilderapport())
  console.log(`→ ${KILDERAPPORTFIL}`)
}

const [kommando] = process.argv.slice(2).filter((a) => a !== '--')
const kommandoer: Record<string, () => Promise<void>> = {
  hent: hentAlt,
  rapport,
}
const k = kommando ? kommandoer[kommando] : undefined
if (!k) {
  console.error(`Bruk: npm run verktoy:kildeimport -- <${Object.keys(kommandoer).join(' | ')}>`)
  process.exit(1)
}
await k()
