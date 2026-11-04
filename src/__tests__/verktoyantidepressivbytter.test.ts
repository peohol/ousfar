/**
 * K2: komplette bytter mellom antidepressiva (`src/verktoy/regler/antidepressivbytter.ts`,
 * `docs/verktøy-k2-antidepressivbytter.md`). Reglene er til faglig kontroll og
 * ikke godkjent; planene regnes ende til ende med det lagrede FEST-uttrekket
 * på en kopi med simulert avklaring og godkjenning (`k2kontroll.ts`).
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FEST_K2, K2_KONTROLLFIL, K2_REGELRAPPORT, K2KASUS, k2avvik, kjorK2, lagK2Kontrollgrunnlag, somAvklartOgGodkjent, type K2kasus, type Sluttrinn } from '../verktoy/k2kontroll'
import { VERKTOY } from '../verktoy/register'
import { BYTTESETT } from '../verktoy/regler/antidepressivbytter'
import type { Festuttrekk } from '../verktoy/regler/aksepttest'
import { beregn } from '../verktoy/regler/beregning'
import { fingeravtrykk, godkjenningsfeil } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett, lesKontrollgrunnlag } from '../verktoy/regler/kontroll'
import { apneValg, type Beregningsinndata, type Regel } from '../verktoy/regler/modell'
import { PILOTSETT } from '../verktoy/regler/pilotsett'
import { REGELRAPPORTER } from '../verktoy/regler/rapport'
import { REGELSETTENE, samlet, tilgjengelighet } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const UTTREKK = JSON.parse(les(FEST_K2)) as Festuttrekk
const kasus = (id: string) => {
  const k = K2KASUS.find((x) => x.id === id)
  if (!k) throw new Error(id)
  return k
}
const planlinjer = (k: K2kasus) => {
  const u = kjorK2(k, UTTREKK)
  return u.utfall === 'plan' ? u.linjer : [u.utfall, JSON.stringify(u)]
}
const erVurdering = (l: string) => /^Dag \d+ \([^)]*\): Vurdering /.test(l)
/** Doselinjene i planen, uten vurderingspunktene. */
const linjer = (k: K2kasus) => planlinjer(k).filter((l) => !erVurdering(l))
/** Vurderingspunktene i planen: dagen, legemidlet og om det er før endringen. */
const vurderinger = (k: K2kasus) =>
  planlinjer(k)
    .filter(erVurdering)
    .map((l) => l.replace(/^Dag (\d+) \([^)]*\): Vurdering \((\w+)\): (Før endringen: )?.*$/, (_, d: string, navn: string, for_?: string) => `dag ${d} ${navn}${for_ ? ' før' : ''}`))

/** Inndata med alle bekreftelser og nei på alle unntak, på en kopi med simulert avklaring og godkjenning, og sluttrinnet som oppgitt (K2-2). */
function beregnSomGodkjent(r: Regel, x: Partial<Beregningsinndata>, sluttrinn: Sluttrinn = 'laveste_tablett') {
  const kopi = structuredClone(r)
  somAvklartOgGodkjent(kopi, sluttrinn)
  return beregn(kopi, { startdose_mg: 0, bekreftet: r.bekreftelser.map((b) => b.id), pasientforhold: Object.fromEntries(r.unntak.map((u) => [u.id, false])), ...x })
}

describe('K2: regelsettet', () => {
  it('består regelkontrollen', () => {
    expect(kontrollerRegelsett(BYTTESETT, lesKontrollgrunnlag())).toEqual([])
  })

  it('har fem regler, alle til faglig kontroll, uten gyldig godkjenning og med åpne valg', () => {
    expect(BYTTESETT.regler.map((r) => r.id)).toEqual([
      'bytte-sertralin-mirtazapin',
      'bytte-escitalopram-mirtazapin',
      'bytte-citalopram-mirtazapin',
      'bytte-escitalopram-sertralin',
      'bytte-citalopram-sertralin',
    ])
    for (const r of BYTTESETT.regler) {
      expect(r.godkjenning.status).toBe('til_faglig_kontroll')
      expect(godkjenningsfeil(r).length).toBeGreaterThan(0)
      expect(apneValg(r).length).toBeGreaterThan(0)
      expect(beregn(r, r.eksempler[0]!.inndata).klinisk_godkjent).toBe(false)
    }
  })

  it('bygger ikke på Psychiatrienet: bare kildeoppføringens id som referanse', () => {
    for (const r of BYTTESETT.regler) {
      expect(JSON.stringify({ ...r, referanser: [] })).not.toContain('psychiatrienet')
      expect(r.referanser.every((x) => x.kilde === 'psychiatrienet' && 'kildeoppforing' in x && !('faktum' in x))).toBe(true)
    }
  })

  it('lar det godkjente startforløpet fra sertralin til mirtazapin (versjon 10) stå uendret og fortsatt brukes', () => {
    const v10 = PILOTSETT.regler.find((r) => r.id === 'kryssnedtrapping-sertralin-mirtazapin')!
    expect(v10.versjon).toBe(10)
    expect(fingeravtrykk(v10)).toBe('12801aa22a0ca2a576b9ba737d5d5cb52db3a73dc1b437bde7f20a896214c81a')
    const verktoy = VERKTOY.find((v) => v.id === 'bytte-antidepressiv')!
    const t = tilgjengelighet(verktoy, { fra: { nokkel: 'sertralin', formulering: 'standard' }, til: { nokkel: 'mirtazapin', formulering: 'standard' } })
    expect(t.status).toBe('tilgjengelig')
    expect(t.regler.map((r) => `${r.id} v${r.versjon}`)).toEqual(['kryssnedtrapping-sertralin-mirtazapin v10'])
  })

  it('ved aktivering må den komplette regelen erstatte startforløpet: med versjon 10 trukket tilbyr verktøyet bare den komplette planen', () => {
    const verktoy = VERKTOY.find((v) => v.id === 'bytte-antidepressiv')!
    const valg = { fra: { nokkel: 'sertralin', formulering: 'standard' }, til: { nokkel: 'mirtazapin', formulering: 'standard' } } as const
    const aktivert = (trekkV10: boolean) => {
      const settene = structuredClone([...REGELSETTENE])
      const komplett = settene.flatMap((x) => x.regler).find((r) => r.id === 'bytte-sertralin-mirtazapin')!
      somAvklartOgGodkjent(komplett, 'laveste_tablett')
      const v10 = settene.flatMap((x) => x.regler).find((r) => r.id === 'kryssnedtrapping-sertralin-mirtazapin')!
      if (trekkV10) v10.godkjenning = { status: 'trukket', historikk: [...v10.godkjenning.historikk, { ...v10.godkjenning.historikk.at(-1)!, status: 'trukket', dato: '2026-11-03', merknad: 'Erstattet av den komplette regelen (simulert).' }] }
      return tilgjengelighet(verktoy, valg, samlet(settene)).regler.map((r) => r.id)
    }
    // Uten at versjon 10 trekkes, får forskriveren to godkjente planer å velge mellom; godkjenningen av den komplette regelen må derfor trekke versjon 10 i samme endring.
    expect(aktivert(false).sort()).toEqual(['bytte-sertralin-mirtazapin', 'kryssnedtrapping-sertralin-mirtazapin'])
    expect(aktivert(true)).toEqual(['bytte-sertralin-mirtazapin'])
  })

  it('sier at faglig kontroll gjenstår for de nye kombinasjonene', () => {
    const verktoy = VERKTOY.find((v) => v.id === 'bytte-antidepressiv')!
    for (const [fra, til] of [
      ['escitalopram', 'mirtazapin'],
      ['citalopram', 'mirtazapin'],
      ['escitalopram', 'sertralin'],
      ['citalopram', 'sertralin'],
    ] as const) {
      const t = tilgjengelighet(verktoy, { fra: { nokkel: fra, formulering: 'standard' }, til: { nokkel: til, formulering: 'standard' } })
      expect(t.status, `${fra} → ${til}`).toBe('til_kontroll')
    }
  })
})

describe('K2: sluttrinnet ved bytte (K2-2)', () => {
  it('seponerer aldri det gamle SSRI-et uten et avgjort sluttrinn: hver kombinasjon stopper, også simulert godkjent', () => {
    for (const r of BYTTESETT.regler) {
      const fase = r.plan.forlop[0]!.faser[0]!
      expect(fase.type === 'nedtrapping' && typeof fase.avslutning === 'object' && fase.avslutning.fra_hoyst_mg.verdi, r.id).toBeNull()
      expect(apneValg(r)).toContain('fra.faser[0].avslutning (åpent forslag)')
      for (const d of r.inndata.find((x) => x.navn === 'startdose')!.verdier!) {
        const res = beregnSomGodkjent(r, { startdose_mg: d, maldose_mg: r.inndata.find((x) => x.navn === 'maldose')!.verdier![0] }, 'ikke_avgjort')
        expect(res.status, `${r.id} ${d}`).toBe('stoppet')
        expect(res.status === 'stoppet' && res.stoppgrunner.join(' '), `${r.id} ${d}`).toMatch(/avslutning\.fra_hoyst_mg mangler og må avklares faglig/)
      }
    }
  })

  it('begrunner ikke seponeringen med laveste dose i preparatomtalen', () => {
    for (const r of BYTTESETT.regler) {
      const fase = r.plan.forlop[0]!.faser[0]!
      if (fase.type !== 'nedtrapping' || fase.strategi.type !== 'prosent_av_aktuell') throw new Error(r.id)
      const g = fase.strategi.sluttdose_mg!.grunnlag
      expect(g.type === 'ousfar_vurdering' && g.begrunnelse, r.id).toMatch(/ingen seponeringsgrense/)
    }
  })
})

describe('K2: planene hvis sluttrinnet avgjøres som laveste tablettdose (K2-2, ikke avgjort), ende til ende med preparatene i FEST', () => {
  it('K0-04: sertralin 100 mg → mirtazapin 30 mg, til sertralin er seponert og mirtazapin står på 30 mg', () => {
    expect(linjer(kasus('bytte-sertralin-mirtazapin:100-30'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Fra dag 29 (fra 07.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg',
    ])
  })

  it('K0-05: escitalopram 20 mg → mirtazapin 30 mg', () => {
    expect(linjer(kasus('bytte-escitalopram-mirtazapin:20-30'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Fra dag 29 (fra 07.12.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg',
    ])
  })

  it('K0-06: escitalopram 20 mg → sertralin 100 mg, med tre hele dager uten SSRI', () => {
    expect(linjer(kasus('bytte-escitalopram-sertralin:20-100'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg',
      'Dag 29–31 (07.12.2026–09.12.2026): Escitalopram peroralt: Seponert',
      'Dag 32–45 (10.12.2026–23.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg',
      'Fra dag 46 (fra 24.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg',
    ])
  })

  it('citalopram 40 mg → mirtazapin 15 mg og citalopram 20 mg → sertralin 50 mg', () => {
    expect(linjer(kasus('bytte-citalopram-mirtazapin:40-15'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Fra dag 29 (fra 07.12.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
    ])
    expect(linjer(kasus('bytte-citalopram-sertralin:20-50'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 15–17 (23.11.2026–25.11.2026): Citalopram peroralt: Seponert',
      'Fra dag 18 (fra 26.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg',
    ])
  })

  it('har vurderingspunktene på riktige dager: før hver reduksjon og seponering, før økningen og respons fire uker etter hver endring', () => {
    expect(vurderinger(kasus('bytte-sertralin-mirtazapin:100-30'))).toEqual([
      'dag 15 Sertralin før',
      'dag 29 Sertralin før',
      'dag 29 Mirtazapin før',
      'dag 29 Mirtazapin',
      'dag 57 Mirtazapin',
    ])
    expect(vurderinger(kasus('bytte-escitalopram-sertralin:20-100'))).toEqual([
      'dag 15 Escitalopram før',
      'dag 29 Escitalopram før',
      'dag 46 Sertralin før',
      'dag 60 Sertralin',
      'dag 74 Sertralin',
    ])
    // Uten økning er det ingen vurdering før økning, bare responsen etter oppstarten.
    expect(vurderinger(kasus('bytte-citalopram-mirtazapin:40-15'))).toEqual(['dag 15 Citalopram før', 'dag 29 Citalopram før', 'dag 29 Mirtazapin'])
    expect(vurderinger(kasus('bytte-citalopram-sertralin:20-50'))).toEqual(['dag 15 Citalopram før', 'dag 46 Sertralin'])
  })

  it('hver plan i omfanget når sluttmålet: det gamle seponert, det nye på valgt vedlikeholdsdose uten slutt', () => {
    for (const r of BYTTESETT.regler) {
      const start = r.inndata.find((x) => x.navn === 'startdose')!.verdier!
      const mal = r.inndata.find((x) => x.navn === 'maldose')!.verdier!
      for (const d of start) {
        for (const m of mal) {
          const res = beregnSomGodkjent(r, { startdose_mg: d, maldose_mg: m })
          expect(res.status, `${r.id} ${d} → ${m}`).toBe('modellberegning')
          expect(res.klinisk_godkjent).toBe(true)
          if (res.status !== 'modellberegning') continue
          const [fra, til] = res.forlop
          expect(fra!.siste_dosedag, `${r.id} ${d}: seponert`).not.toBeNull()
          expect(til!.siste_dosedag).toBeNull()
          expect(til!.perioder.at(-1)).toMatchObject({ til: null, mg: m })
          // Ingen dag med det nye legemidlet etter at det gamle er seponert uten at det nye er startet, utenom utvaskingen.
          const utvasking = r.plan.forlop[1]!.start.type === 'etter_utvasking' ? 3 : 0
          expect(til!.perioder[0]!.fra).toBe(utvasking === 0 ? 1 : fra!.siste_dosedag! + utvasking + 1)
        }
      }
    }
  })

  it('stopper ved grenseverdier: doser som ikke kan halveres med hele tabletter, og vedlikeholdsdoser utenfor planen', () => {
    const utenfor: Record<string, number[]> = {
      'bytte-sertralin-mirtazapin': [25, 75, 150, 49.99, 100.01, 300],
      'bytte-escitalopram-mirtazapin': [5, 15, 30],
      'bytte-citalopram-mirtazapin': [10, 30, 60],
      'bytte-escitalopram-sertralin': [5, 15, 30],
      'bytte-citalopram-sertralin': [10, 30, 60],
    }
    for (const r of BYTTESETT.regler) {
      const mal = r.inndata.find((x) => x.navn === 'maldose')!.verdier![0]!
      for (const d of utenfor[r.id]!) {
        const res = beregnSomGodkjent(r, { startdose_mg: d, maldose_mg: mal })
        expect(res.status, `${r.id} ${d} mg`).toBe('stoppet')
        expect(res.status === 'stoppet' ? res.stoppgrunner.join(' ') : '').toMatch(/er utenfor det regelen gjelder for/)
      }
      const start = r.inndata.find((x) => x.navn === 'startdose')!.verdier![0]!
      for (const m of r.til?.type === 'virkestoff' && r.til.nokkel === 'mirtazapin' ? [7.5, 22.5, 45, 60] : [25, 75, 150, 200]) {
        const res = beregnSomGodkjent(r, { startdose_mg: start, maldose_mg: m })
        expect(res.status, `${r.id} måldose ${m} mg`).toBe('stoppet')
      }
    }
  })

  it('stopper ved hvert unntak, hvert ubesvart forhold, hver manglende bekreftelse, avregistrert styrke, foreldet FEST og endret regel', () => {
    const avvik = K2KASUS.flatMap((k) => k2avvik(k, kjorK2(k, UTTREKK)).map((f) => `${k.id}: ${f}`))
    expect(avvik).toEqual([])
    const kategorier = new Set(K2KASUS.map((k) => k.kategori))
    for (const k of ['vanlig_dose', 'uvanlig_dose', 'pasientforhold', 'preparat', 'foreldet_fest', 'regelendring', 'ikke_godkjent'] as const) expect(kategorier).toContain(k)
  })
})

describe('K2: rapportene', () => {
  it('regelrapporten skrives og kontrolleres sammen med de andre regelrapportene', () => {
    expect(REGELRAPPORTER.find((r) => r.fil === K2_REGELRAPPORT.fil)?.sett).toBe(BYTTESETT)
  })
  it('kontrollgrunnlaget er oppdatert', () => {
    expect(les(K2_KONTROLLFIL)).toBe(lagK2Kontrollgrunnlag(UTTREKK))
  })
})
