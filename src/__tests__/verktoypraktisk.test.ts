/**
 * Tråd B (B1) i `docs/verktøy-brukervennlighet-2026-11.md`: strukturerte
 * stoppkoder, formovergang i et forløp og praktisk belastning i dosevalget,
 * og invarianten S3: motorarbeidet endrer ingen plan verktøyet viser i dag.
 *
 * S3-fasiten (`__snapshots__/verktoy-s3-planer.json`) ble laget med motoren på
 * main før B1 og skal ikke oppdateres for å bli grønn: en endring der betyr
 * at en godkjent plan, et stopp eller et valg verktøyet tilbyr er endret.
 *
 * Alle doser er syntetiske; ingen pasientopplysninger.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { kjorKontrollkasus, KONTROLLFORSLAG, omfangsplaner } from '../verktoy/kontrollgrunnlag'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { kjorKasus, PILOTKASUS, type Pilotutfall } from '../verktoy/regler/pilotmatrise'
import { FEST_TILLEGG, kjorTilleggskasus } from '../verktoy/tilleggsgrunnlag'
import type { Doseplanresultat } from '../verktoy/motor/plan'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekkene = { pilot: JSON.parse(les(FEST_PILOT)) as Festuttrekk, aksept: JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk }
const tillegg = JSON.parse(les(FEST_TILLEGG)) as Festuttrekk

/** Det klinikeren ser og kan velge: utfallet med radene eller grunnene, og dosene som tilbys for neste trinn. */
function kort(u: Pilotutfall & { resultat?: Doseplanresultat }) {
  const { resultat, ...utfall } = u as Pilotutfall & { resultat?: Doseplanresultat; tekst?: string; feil?: string[] }
  delete (utfall as { tekst?: string }).tekst
  const tilbys = resultat?.trinnvalg?.map((t) => `${t.forlop} trinn ${t.trinn} fra ${t.fra_mg} mg: ${t.doser.map((d) => `${d.mg} mg${d.dager !== undefined ? ` (${d.dager} d)` : ''}`).join(' | ')}`)
  return { ...utfall, ...(tilbys && { tilbys }) }
}

/** Alle utfall S3 gjelder: pilotmatrisen, K4-kasusene, kontrollkasusene og hver plan i det kliniske omfanget til reglene i kontrollgrunnlagene. */
function s3utfall() {
  const ut: Record<string, unknown> = {}
  for (const k of PILOTKASUS) ut[`pilot ${k.id}`] = kort(kjorKasus(k, uttrekkene))
  for (const { k, res } of kjorTilleggskasus(tillegg)) ut[`tillegg ${k.id}`] = kort(res)
  for (const f of KONTROLLFORSLAG) {
    for (const k of f.kasus) ut[`kontroll ${f.nr} ${k.id}`] = kort(kjorKontrollkasus(k, uttrekkene))
    for (const o of omfangsplaner(f, uttrekkene)) {
      for (const v of o.veier) ut[`omfang ${f.nr} ${o.regel.id} ${o.form ?? '-'} ${o.startdose_mg} mg [${v.valg.map((x) => x.valgt).join(',')}]`] = kort(v.utfall)
    }
  }
  return ut
}

describe('S3: motorarbeidet endrer ingen plan verktøyet viser', () => {
  it('gir nøyaktig de samme planene, stoppene og valgene som motoren på main før B1', async () => {
    await expect(JSON.stringify(s3utfall(), null, 1)).toMatchFileSnapshot('./__snapshots__/verktoy-s3-planer.json')
  }, 300_000)
})
