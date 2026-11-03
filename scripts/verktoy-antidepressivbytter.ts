/**
 * K2 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`: komplette bytter mellom antidepressiva.
 *
 *   npx vite-node scripts/verktoy-antidepressivbytter.ts -- rapport    docs/verktøy-k2-kontrollgrunnlag.md (regelrapporten skrives av `npm run verktoy:regler -- rapport`)
 *   npx vite-node scripts/verktoy-antidepressivbytter.ts -- hent-fest  Henter FEST-uttrekket for K2 på nytt (krever VITE_SUPABASE_URL og SUPABASE_SECRET_KEY)
 *
 * Bare `hent-fest` henter noe, og bare ved å lese med `les_legemidler`. Skriptet
 * skriver ikke til databasen og godkjenner ingen regel.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import type { Festuttrekk } from '../src/verktoy/regler/aksepttest'
import { festkoblinger } from '../src/verktoy/register'
import { BYTTESETT } from '../src/verktoy/regler/antidepressivbytter'
import { FEST_K2, K2_KONTROLLFIL, lagK2Kontrollgrunnlag } from '../src/verktoy/k2kontroll'

const skriv = (fil: string, innhold: string) => {
  writeFileSync(new URL(`../${fil}`, import.meta.url), innhold)
  console.log(`→ ${fil}`)
}

async function rapport() {
  const uttrekk = JSON.parse(readFileSync(new URL(`../${FEST_K2}`, import.meta.url), 'utf8')) as Festuttrekk
  skriv(K2_KONTROLLFIL, lagK2Kontrollgrunnlag(uttrekk))
}

async function hentFest() {
  const url = process.env.VITE_SUPABASE_URL
  const nokkel = process.env.SUPABASE_SECRET_KEY
  if (!url || !nokkel) throw new Error('VITE_SUPABASE_URL og SUPABASE_SECRET_KEY må være satt.')
  const nokler = [...new Set(BYTTESETT.regler.flatMap((r) => r.plan.forlop.flatMap((f) => (f.virkestoff.type === 'virkestoff' ? [f.virkestoff.nokkel] : []))))].sort()
  const ider = [...new Set(Object.values(festkoblinger(nokler)).flat())].sort()
  const svar = await fetch(`${url}/rest/v1/rpc/les_legemidler`, {
    method: 'POST',
    headers: { apikey: nokkel, Authorization: `Bearer ${nokkel}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ virkestoff_ider: ider }),
  })
  if (!svar.ok) throw new Error(`les_legemidler svarte ${svar.status}: ${await svar.text()}`)
  const uttrekk: Festuttrekk = { hentet: new Date().toISOString(), utvalg: await svar.json() }
  skriv(FEST_K2, `${JSON.stringify(uttrekk, null, 1)}\n`)
}

const [kommando] = process.argv.slice(2).filter((a) => a !== '--')
const kommandoer: Record<string, () => Promise<void>> = { rapport, 'hent-fest': hentFest }
const k = kommando ? kommandoer[kommando] : undefined
if (!k) {
  console.error(`Bruk: npx vite-node scripts/verktoy-antidepressivbytter.ts -- <${Object.keys(kommandoer).join(' | ')}>`)
  process.exit(1)
}
await k()
