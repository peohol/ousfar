/**
 * Den tekniske vakten for FEST-synkroniseringen (`src/legemiddeldata/vakt.ts`,
 * F4 i `docs/verktøy-vdr4-tilgjengelighet.md`):
 *
 *   npm run legemiddeldata:vakt [-- --prove | --prove-lesefeil]
 *
 * Leser de siste kjøringene i produksjonen med `VITE_SUPABASE_URL` og
 * `SUPABASE_SECRET_KEY` og skriver hva som må følges opp. Avslutter med 0 når
 * alt er i orden, 1 når noe må følges opp, og 2 når statusen ikke kunne leses
 * (det er også noe som må følges opp). `--prove` bruker en syntetisk feilet
 * kjøring i minnet i stedet for produksjonen, for å prøve hele varslingen;
 * den leser og skriver ingenting. `--prove-lesefeil` prøver varslingen når
 * statusen ikke kan leses (avslutningskode 2), uten å kontakte produksjonen.
 *
 * Den planlagte oppgaven som kjører skriptet hver morgen og varsler teknisk
 * ansvarlig, har teksten sin i `scripts/legemiddeldata-vakt-oppgave.md`.
 *
 * Skriptet bare leser, og skriver aldri til databasen.
 */
import { festvakt, lesVaktkjoringer, provestatus, type Vaktkjoring } from '../src/legemiddeldata/vakt'

async function lesStatus(): Promise<Vaktkjoring[]> {
  const url = process.env.VITE_SUPABASE_URL
  const nokkel = process.env.SUPABASE_SECRET_KEY
  if (!url || !nokkel) throw new Error('VITE_SUPABASE_URL og SUPABASE_SECRET_KEY må være satt.')
  const svar = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/legemiddeldata_status`, {
    method: 'POST',
    headers: { apikey: nokkel, Authorization: `Bearer ${nokkel}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(30_000),
  })
  if (!svar.ok) throw new Error(`Statusen svarte ${svar.status} ${svar.statusText}`.trim())
  return lesVaktkjoringer(await svar.json())
}

const prove = process.argv.includes('--prove')
const proveLesefeil = process.argv.includes('--prove-lesefeil')
const naa = new Date()
try {
  if (proveLesefeil) throw new Error('PRØVE: syntetisk lesefeil, produksjonen er ikke kontaktet.')
  const r = festvakt(prove ? provestatus(naa) : await lesStatus(), naa)
  if (prove) console.log('PRØVE: statusen under er syntetisk og gjelder ikke produksjonen.')
  console.log(r.iOrden ? 'FEST-vakten: alt i orden.' : 'FEST-vakten: noe må følges opp.')
  for (const f of r.funn) console.log(`- ${f}`)
  if (r.kontrollertKl) console.log(`Sist kontrollert mot FEST: ${r.kontrollertKl}. Verktøyene stopper ${r.verktoyeneStopperKl} uten en ny vellykket kjøring.`)
  process.exitCode = r.iOrden ? 0 : 1
} catch (e) {
  console.log('FEST-vakten: statusen kunne ikke leses, så synkroniseringen er ikke kontrollert.')
  console.log(`- ${e instanceof Error ? e.message : String(e)}`)
  process.exitCode = 2
}
