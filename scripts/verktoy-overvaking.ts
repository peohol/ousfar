/**
 * Kildeovervåkingen for OUSFAR Verktøy (P12.1 og P12.5 i
 * `docs/verktøy-utviklingsplan.md`, `docs/verktøy-p12-overvaking.md`).
 * GitHub Actions kjører den hver uke (`.github/workflows/verktoy-overvaking.yml`);
 * den kan også kjøres for hånd.
 *
 *   npm run verktoy:overvaking -- kontroll [--psychiatrienet] [--uten-dokumenter] [--uten-fest] [--provesak] [--ut <mappe>]
 *
 * `--provesak` lager bare et syntetisk funn som prøver varslingen i appen.
 *
 * Skriver `rapport.md` og `funn.json` (`Overvakingsrapport`) i `<mappe>`
 * (standard `overvaking-resultat`, som ikke er en del av repoet) og et
 * sammendrag i terminalen. Avslutter med 0 også når noe krever vurdering;
 * arbeidsflyten sender `funn.json` til appen (`/api/kildeovervaking`).
 *
 * Miljøet for FEST: `SUPABASE_URL` og `SUPABASE_PUBLISHABLE_KEY` med
 * testbrukeren (`OUSFAR_TESTBRUKER`, `OUSFAR_TESTPASSORD`), som i
 * kuratorjobbene, eller `VITE_SUPABASE_URL` og `SUPABASE_SECRET_KEY`. Uten
 * noen av dem er FEST ikke kontrollert: rapporten har det som en feil, og
 * arbeidsflyten blir rød. `--uten-fest` utelater FEST med vilje, for prøving.
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
import { kreverVurdering, lagOvervakingsrapport } from '../src/verktoy/overvaking/rapport'

const lesJson = <T>(fil: string) => JSON.parse(readFileSync(new URL(`../${fil}`, import.meta.url), 'utf8')) as T

/** Det FEST-delen står som når ingen tilkobling er satt; da er FEST ikke kontrollert, og kjøringen er ikke i orden. */
const MANGLER_FEST = 'mangler tilkoblingen (verken testbrukeren eller nøkkelen er satt), så FEST er ikke kontrollert.'

/**
 * En lesing av FEST nå, med testbrukeren eller nøkkelen, eller feilen som
 * hindret den. En ordinær kontroll uten tilkobling er en feil, ikke en del som
 * bare ikke ble kjørt; bare `--uten-fest` utelater FEST med vilje.
 */
async function festlesing(): Promise<((ider: string[]) => Promise<Legemiddelutvalg>) | { feil: string }> {
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
  if (!process.env.OUSFAR_TESTBRUKER) return { feil: MANGLER_FEST }
  const innlogget = await loggInnSomTestbruker().catch((e: unknown) => ({ feil: e instanceof Error ? e.message : String(e) }))
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
  const regler = godkjenteRegler()

  const lesing = flagg.has('--uten-fest') ? null : await festlesing()
  const festfeil = lesing && 'feil' in lesing ? lesing.feil : null
  const virkestofferFor = (sett: string) => virkestofferForFest(regler.filter((g) => g.regelsett === sett))

  const rapport = await kjorOvervaking({
    regler,
    provesak: flagg.has('--provesak'),
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
  writeFileSync(join(ut, 'funn.json'), `${JSON.stringify(rapport, null, 1)}\n`)
  console.log(`→ ${join(ut, 'rapport.md')}, ${join(ut, 'funn.json')}`)
  for (const g of rapport.grunnlag) console.log(`${g.kjort ? '✓' : '–'} ${g.kilde}: ${g.beskrivelse}`)
  console.log(`${kreverVurdering(rapport).length} krever ny faglig vurdering, ${rapport.funn.length - kreverVurdering(rapport).length} informative, ${rapport.feil.length} feil`)
  for (const f of kreverVurdering(rapport)) console.log(`! ${f.id}: ${f.berorte.map((b) => `${b.regel} v${b.versjon}`).join(', ')}`)
  for (const f of rapport.feil) console.error(`✗ ${f}`)
}

const BRUK = 'Bruk: npm run verktoy:overvaking -- kontroll [--psychiatrienet] [--uten-dokumenter] [--uten-fest] [--provesak] [--ut <mappe>]'
const [kommando, ...resten] = process.argv.slice(2).filter((a) => a !== '--')
if (kommando === 'kontroll') await kontroll(resten)
else {
  console.error(BRUK)
  process.exit(1)
}
