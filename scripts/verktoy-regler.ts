/**
 * Regelmodellen og pilotsettet (P4), doseplanmotoren (P5) og nedtrappingsreglene (P7) for OUSFAR
 * Verktøy (`docs/verktøy-utviklingsplan.md`).
 *
 *   npm run verktoy:regler -- kontroll   Kontrollerer regelsettene (kilder, grunnlag, godkjenning, regneeksempler) og testmatrisen fra P11
 *   npm run verktoy:regler -- rapport    docs/verktøy-p4-pilotsett.md, docs/verktøy-p7-regelutkast.md og docs/verktøy-p7-dekning.md
 *   npm run verktoy:regler -- motorrapport   docs/verktøy-p5-testtilfeller.md (doseplanmotoren, syntetiske data)
 *   npm run verktoy:regler -- aksepttest     docs/verktøy-p7-aksepttest.md (P7-reglene med de norske preparatene i FEST-uttrekket)
 *   npm run verktoy:regler -- pilotmatrise   docs/verktøy-p11-testmatrise.md (de godkjente reglene ende til ende med syntetiske kasus, P11)
 *   npm run verktoy:regler -- regeldekning   docs/verktøy-vdk1-regeldekning.md (hva de tre verktøyene kan beregne, og hvorfor resten stopper, VDK-1)
 *   npm run verktoy:regler -- kontrollgrunnlag   docs/verktøy-vdk3-forslag*-kontrollgrunnlag.md (faglig kontrollgrunnlag for et forslag fra VDK-2, VDK-3)
 *   npm run verktoy:regler -- rettelse       docs/verktøy-rettelse-langvarig.md (kontrollgrunnlag for de nye regelversjonene etter en faktumrettelse)
 *   npm run verktoy:regler -- tilleggsgrunnlag   docs/verktøy-k4-kontrollgrunnlag.md (faglig kontrollgrunnlag for tilleggsreglene i K4)
 *   npm run verktoy:regler -- hent-fest      Henter FEST-uttrekkene til aksepttesten, pilotreglenes og tilleggsreglenes ende-til-ende-tester på nytt (krever VITE_SUPABASE_URL og SUPABASE_SECRET_KEY)
 *
 * Bare `hent-fest` henter noe, og bare ved å lese med `les_legemidler`. Skriptet
 * skriver ikke til databasen og godkjenner ingen regel.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { AKSEPTSTOFFER, AKSEPTTESTFIL, FEST_AKSEPTTEST, FEST_PILOT, lagAksepttestrapport, type Festuttrekk } from '../src/verktoy/regler/aksepttest'
import { PILOTSETT } from '../src/verktoy/regler/pilotsett'
import { festkoblinger } from '../src/verktoy/register'
import { DEKNINGSRAPPORTFIL, lagDekningsrapport } from '../src/verktoy/dekningsrapport'
import { disposisjonsfeil } from '../src/verktoy/regler/godkjenning'
import { kontrollerRegelsett } from '../src/verktoy/regler/kontroll'
import { lagRegelrapport, REGELRAPPORTER } from '../src/verktoy/regler/rapport'
import { lagMotorrapport, MOTORRAPPORTFIL } from '../src/verktoy/motor/rapport'
import { lagRegeldekningsrapport, REGELDEKNINGSFIL } from '../src/verktoy/regeldekning'
import { KONTROLLFORSLAG, lagKontrollgrunnlag } from '../src/verktoy/kontrollgrunnlag'
import { lagRettelseskontroll, RETTELSESKONTROLLFIL } from '../src/verktoy/rettelseskontroll'
import { avvikFra, kjorKasus, lagPilotmatriserapport, PILOTKASUS, PILOTMATRISEFIL } from '../src/verktoy/regler/pilotmatrise'
import { FEST_TILLEGG, kjorTilleggskasus, lagTilleggsgrunnlag, TILLEGGSGRUNNLAGFIL, TILLEGGSKASUS, TILLEGGSSTOFFER } from '../src/verktoy/tilleggsgrunnlag'

const skriv = (fil: string, innhold: string) => {
  writeFileSync(new URL(`../${fil}`, import.meta.url), innhold)
  console.log(`→ ${fil}`)
}

const lesUttrekk = (fil: string) => JSON.parse(readFileSync(new URL(`../${fil}`, import.meta.url), 'utf8')) as Festuttrekk

async function kontroll() {
  let antall = 0
  for (const { sett, disposisjoner = [] } of REGELRAPPORTER) {
    const feil = [...kontrollerRegelsett(sett), ...disposisjoner.flatMap((d) => disposisjonsfeil(sett.regler, d))]
    for (const f of feil) console.error(`✗ ${sett.id}: ${f}`)
    console.log(feil.length === 0 ? `✓ ${sett.id}: ${sett.regler.length} regler uten feil` : `${sett.id}: ${feil.length} feil`)
    antall += feil.length
  }
  // De godkjente reglene ende til ende (P11): hvert kasus må gi utfallet det forventer.
  const uttrekkene = { pilot: lesUttrekk(FEST_PILOT), aksept: lesUttrekk(FEST_AKSEPTTEST) }
  const avvik = PILOTKASUS.flatMap((k) => avvikFra(k, kjorKasus(k, uttrekkene)).map((f) => `${k.id}: ${f}`))
  for (const f of avvik) console.error(`✗ testmatrisen: ${f}`)
  console.log(avvik.length === 0 ? `✓ testmatrisen: ${PILOTKASUS.length} kasus som forventet` : `testmatrisen: ${avvik.length} avvik`)
  // De godkjente tilleggsreglene (K4) ende til ende, i sitt eget kontrollgrunnlag med FEST-uttrekket for tilleggsreglene.
  const tillegg = kjorTilleggskasus(lesUttrekk(FEST_TILLEGG)).flatMap(({ k, avvik }) => avvik.map((f) => `${k.id}: ${f}`))
  for (const f of tillegg) console.error(`✗ kontrollgrunnlaget for tillegg: ${f}`)
  console.log(tillegg.length === 0 ? `✓ kontrollgrunnlaget for tillegg: ${TILLEGGSKASUS.length} kasus som forventet` : `kontrollgrunnlaget for tillegg: ${tillegg.length} avvik`)
  antall += avvik.length + tillegg.length
  if (antall > 0) process.exit(1)
}

async function rapport() {
  for (const r of REGELRAPPORTER) skriv(r.fil, lagRegelrapport(r.sett, r))
  skriv(DEKNINGSRAPPORTFIL, lagDekningsrapport())
}

async function motorrapport() {
  skriv(MOTORRAPPORTFIL, lagMotorrapport())
}

async function aksepttest() {
  skriv(AKSEPTTESTFIL, lagAksepttestrapport(lesUttrekk(FEST_AKSEPTTEST)))
}

async function pilotmatrise() {
  skriv(PILOTMATRISEFIL, lagPilotmatriserapport({ pilot: lesUttrekk(FEST_PILOT), aksept: lesUttrekk(FEST_AKSEPTTEST) }))
}

async function regeldekning() {
  skriv(REGELDEKNINGSFIL, lagRegeldekningsrapport(lesUttrekk(FEST_AKSEPTTEST)))
}

async function kontrollgrunnlag() {
  const uttrekkene = { pilot: lesUttrekk(FEST_PILOT), aksept: lesUttrekk(FEST_AKSEPTTEST) }
  for (const f of KONTROLLFORSLAG) skriv(f.fil, lagKontrollgrunnlag(f, uttrekkene))
}

async function tilleggsgrunnlag() {
  skriv(TILLEGGSGRUNNLAGFIL, lagTilleggsgrunnlag(lesUttrekk(FEST_TILLEGG)))
}

async function rettelse() {
  skriv(RETTELSESKONTROLLFIL, lagRettelseskontroll({ pilot: lesUttrekk(FEST_PILOT), aksept: lesUttrekk(FEST_AKSEPTTEST) }))
}

/** Virkestoffene i pilotreglene; reglene testes ende til ende med preparatene i FEST. */
const pilotstoffer = () => PILOTSETT.regler.flatMap((r) => r.plan.forlop.flatMap((f) => (f.virkestoff.type === 'virkestoff' ? [f.virkestoff.nokkel] : [])))

async function hentFest() {
  const url = process.env.VITE_SUPABASE_URL
  const nokkel = process.env.SUPABASE_SECRET_KEY
  if (!url || !nokkel) throw new Error('VITE_SUPABASE_URL og SUPABASE_SECRET_KEY må være satt.')
  for (const [fil, nokler] of [
    [FEST_AKSEPTTEST, AKSEPTSTOFFER.map((s) => s.nokkel)],
    [FEST_PILOT, [...new Set(pilotstoffer())]],
    [FEST_TILLEGG, TILLEGGSSTOFFER],
  ] as const) {
    const ider = [...new Set(Object.values(festkoblinger(nokler)).flat())].sort()
    const svar = await fetch(`${url}/rest/v1/rpc/les_legemidler`, {
      method: 'POST',
      headers: { apikey: nokkel, Authorization: `Bearer ${nokkel}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ virkestoff_ider: ider }),
    })
    if (!svar.ok) throw new Error(`les_legemidler svarte ${svar.status}: ${await svar.text()}`)
    const uttrekk: Festuttrekk = { hentet: new Date().toISOString(), utvalg: await svar.json() }
    skriv(fil, `${JSON.stringify(uttrekk, null, 1)}\n`)
  }
}

const [kommando] = process.argv.slice(2).filter((a) => a !== '--')
const kommandoer: Record<string, () => Promise<void>> = { kontroll, rapport, motorrapport, aksepttest, pilotmatrise, regeldekning, kontrollgrunnlag, tilleggsgrunnlag, rettelse, 'hent-fest': hentFest }
const k = kommando ? kommandoer[kommando] : undefined
if (!k) {
  console.error(`Bruk: npm run verktoy:regler -- <${Object.keys(kommandoer).join(' | ')}>`)
  process.exit(1)
}
await k()
