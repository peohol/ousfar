/**
 * Kildeovervåkingen for OUSFAR Verktøy (P12.1 og P12.5 i
 * `docs/verktøy-utviklingsplan.md`, `docs/verktøy-p12-overvaking.md`).
 * GitHub Actions kjører den hver uke (`.github/workflows/verktoy-overvaking.yml`);
 * den kan også kjøres for hånd.
 *
 *   npm run verktoy:overvaking -- kontroll [--psychiatrienet] [--uten-dokumenter] [--uten-fest] [--forrige <fil>] [--ut <mappe>]
 *
 * `--forrige` er funnene som krevde vurdering i forrige kjøring (fra saken);
 * de står videre for en del som ikke blir kontrollert på nytt.
 *
 * Skriver `rapport.md` og `funn.json` i `<mappe>` (standard `overvaking-resultat`,
 * som ikke er en del av repoet) og et sammendrag i terminalen. Avslutter med 0
 * også når noe krever vurdering; arbeidsflyten leser `funn.json`.
 *
 * Miljøet for FEST: `SUPABASE_URL` og `SUPABASE_PUBLISHABLE_KEY` med
 * testbrukeren (`OUSFAR_TESTBRUKER`, `OUSFAR_TESTPASSORD`), som i
 * kuratorjobbene, eller `VITE_SUPABASE_URL` og `SUPABASE_SECRET_KEY`. Uten
 * noen av dem kontrolleres ikke FEST, og rapporten sier det.
 *
 * Skriptet bare leser: det skriver ikke til databasen, til grunnlaget eller
 * til kildearkivet, og endrer, godkjenner eller sperrer ingen regel.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { lagLegemiddelleser, type Legemiddelutvalg } from '../src/legemiddeldata/lesing'
import { loggInnSomTestbruker } from '../src/kuratorjobb/testbruker'
import type { Kildearkiv } from '../src/verktoy/kildearkiv'
import { innhentPsychiatrienet } from '../src/verktoy/kildeinnhenting'
import { hentDokument } from '../src/verktoy/kildehenting'
import { festkoblinger, KARTLEGGING } from '../src/verktoy/register'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../src/verktoy/regler/aksepttest'
import { NEDTRAPPINGSSETT } from '../src/verktoy/regler/nedtrapping'
import { PILOTSETT } from '../src/verktoy/regler/pilotsett'
import { godkjenteRegler, virkestofferForFest } from '../src/verktoy/overvaking/berorte'
import { kjorOvervaking } from '../src/verktoy/overvaking/kjoring'
import type { Overvakingsrapport } from '../src/verktoy/overvaking/modell'
import { avtrykk, kreverVurdering, lagOvervakingsrapport } from '../src/verktoy/overvaking/rapport'

const lesJson = <T>(fil: string) => JSON.parse(readFileSync(new URL(`../${fil}`, import.meta.url), 'utf8')) as T

/** En lesing av FEST nå, med testbrukeren eller nøkkelen; `null` når ingen av dem er satt. */
async function festlesing(): Promise<((ider: string[]) => Promise<Legemiddelutvalg>) | { feil: string } | null> {
  const url = process.env.VITE_SUPABASE_URL
  const nokkel = process.env.SUPABASE_SECRET_KEY
  if (url && nokkel) {
    return async (ider) => {
      const svar = await fetch(`${url}/rest/v1/rpc/les_legemidler`, {
        method: 'POST',
        headers: { apikey: nokkel, Authorization: `Bearer ${nokkel}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ virkestoff_ider: ider }),
      })
      if (!svar.ok) throw new Error(`les_legemidler svarte ${svar.status}`)
      return (await svar.json()) as Legemiddelutvalg
    }
  }
  if (!process.env.OUSFAR_TESTBRUKER) return null
  const innlogget = await loggInnSomTestbruker()
  if ('feil' in innlogget) return innlogget
  const leser = lagLegemiddelleser(innlogget.klient)
  return (ider) => leser.les(ider)
}

async function kontroll(argumenter: string[]) {
  const flagg = new Set(argumenter.filter((a) => a.startsWith('--')))
  const verdi = (navn: string) => {
    const i = argumenter.indexOf(navn)
    return i >= 0 && argumenter[i + 1] ? argumenter[i + 1]! : null
  }
  const ut = verdi('--ut') ?? 'overvaking-resultat'
  const forrigefil = verdi('--forrige')
  const forrige = forrigefil ? (JSON.parse(readFileSync(forrigefil, 'utf8')) as Pick<Overvakingsrapport, 'kjort_kl' | 'funn'>) : undefined
  const regler = godkjenteRegler()

  const lesing = flagg.has('--uten-fest') ? null : await festlesing()
  const festfeil = lesing && 'feil' in lesing ? lesing.feil : null
  const virkestofferFor = (sett: string) => virkestofferForFest(regler.filter((g) => g.regelsett === sett))

  const rapport = await kjorOvervaking({
    regler,
    forrige,
    dokumenter: flagg.has('--uten-dokumenter') ? undefined : (url) => hentDokument(url),
    psychiatrienet: flagg.has('--psychiatrienet')
      ? { arkiv: lesJson<Kildearkiv>('src/data/verktoy/psychiatrienet-kildearkiv.json'), innhent: () => innhentPsychiatrienet(KARTLEGGING, { framdrift: (n) => console.log(`Psychiatrienet: ${n} sider`) }) }
      : undefined,
    fest:
      lesing && !('feil' in lesing)
        ? {
            grunnlag: [
              { navn: 'Pilotreglene (fest-pilotsett.json)', uttrekk: lesJson<Festuttrekk>(FEST_PILOT), virkestoffer: virkestofferFor(PILOTSETT.id) },
              { navn: 'Nedtrappingsreglene (fest-aksepttest.json)', uttrekk: lesJson<Festuttrekk>(FEST_AKSEPTTEST), virkestoffer: virkestofferFor(NEDTRAPPINGSSETT.id) },
            ].filter((g) => g.virkestoffer.length > 0),
            les: async (virkestoffer) => {
              const ider = [...new Set(Object.values(festkoblinger(virkestoffer)).flat())].sort()
              return { hentet: new Date().toISOString(), utvalg: await lesing(ider) }
            },
          }
        : undefined,
  })
  if (festfeil) rapport.feil.push(`FEST: ${festfeil}`)

  mkdirSync(ut, { recursive: true })
  writeFileSync(join(ut, 'rapport.md'), lagOvervakingsrapport(rapport))
  writeFileSync(join(ut, 'funn.json'), `${JSON.stringify({ ...rapport, avtrykk: avtrykk(rapport), krever_vurdering: kreverVurdering(rapport).length }, null, 1)}\n`)
  console.log(`→ ${join(ut, 'rapport.md')}, ${join(ut, 'funn.json')}`)
  for (const g of rapport.grunnlag) console.log(`${g.kjort ? '✓' : '–'} ${g.kilde}: ${g.beskrivelse}`)
  console.log(`${kreverVurdering(rapport).length} krever ny faglig vurdering, ${rapport.funn.length - kreverVurdering(rapport).length} informative, ${rapport.feil.length} feil`)
  for (const f of kreverVurdering(rapport)) console.log(`! ${f.id}: ${f.berorte.map((b) => `${b.regel} v${b.versjon}`).join(', ')}`)
  for (const f of rapport.feil) console.error(`✗ ${f}`)
}

const [kommando, ...resten] = process.argv.slice(2).filter((a) => a !== '--')
if (kommando !== 'kontroll') {
  console.error('Bruk: npm run verktoy:overvaking -- kontroll [--psychiatrienet] [--uten-dokumenter] [--uten-fest] [--forrige <fil>] [--ut <mappe>]')
  process.exit(1)
}
await kontroll(resten)
