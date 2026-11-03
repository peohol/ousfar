/**
 * K4: tilleggsreglene for kombinasjon av stemningsstabiliserende
 * (`src/verktoy/regler/tillegg.ts`) og kontrollgrunnlaget for dem
 * (`src/verktoy/tilleggsgrunnlag.ts`, `docs/verktøy-k4-kontrollgrunnlag.md`).
 *
 * Dosene i planene er kontrollert for hånd mot tabell 3 i Lamictal-
 * preparatomtalen. Kasusene går den samme veien som verktøysiden, med det
 * lagrede FEST-uttrekket; ingen regel blir godkjent eller tilgjengelig av
 * grunnlaget, og den simulerte godkjenningen finnes bare på kopier.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { VERKTOY } from '../verktoy/register'
import type { Festuttrekk } from '../verktoy/regler/aksepttest'
import { beregn, kortform } from '../verktoy/regler/beregning'
import { erKliniskGodkjent, kontrollutfall } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett } from '../verktoy/regler/kontroll'
import { tilleggsfeil } from '../verktoy/regler/modell'
import { SIMULERT_KONTROLLOR } from '../verktoy/regler/pilotmatrise'
import { LAMICTAL, LITIUM_LAMOTRIGIN, OPPTRAPPING, TILLEGGSSETT, VALPROAT_LAMOTRIGIN } from '../verktoy/regler/tillegg'
import { FEST_TILLEGG, kjorTilleggskasus, lagTilleggsgrunnlag, TILLEGGSGRUNNLAGFIL, TILLEGGSKASUS } from '../verktoy/tilleggsgrunnlag'
import { REGELSETT, reglerFor, tilgjengelighet } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekk = JSON.parse(les(FEST_TILLEGG)) as Festuttrekk
const RESULTATER = kjorTilleggskasus(uttrekk)
const resultat = (id: string) => RESULTATER.find((x) => x.k.id === id)!

const KOMBINERE = VERKTOY.find((v) => v.id === 'kombinere-stemningsstabiliserende')!
const peroral = (nokkel: string) => ({ nokkel, formulering: 'standard' as const })

describe('Tilleggsreglene', () => {
  it('er gyldige etter regelkontrollen og holder retningen eksisterende → tillegg', () => {
    expect(kontrollerRegelsett(TILLEGGSSETT)).toEqual([])
    for (const r of TILLEGGSSETT.regler) {
      expect(tilleggsfeil(r), r.id).toEqual([])
      expect(r.plan.form).toBe('tillegg')
      expect(r.til).toEqual({ type: 'virkestoff', nokkel: 'lamotrigin' })
      // Det eksisterende legemidlet fortsetter uendret; planen beregner det ikke.
      expect(r.plan.forlop[0]!.faser.map((f) => f.type), r.id).toEqual(['uendret'])
      // Måldosen må velges, og regelen gjelder bare preparatomtalens første stabiliserende måldose.
      expect(r.inndata.find((k) => k.navn === 'maldose'), r.id).toMatchObject({ verdier: [OPPTRAPPING[r === VALPROAT_LAMOTRIGIN ? 'hemmer' : 'noytral'].maldose], art: 'bindende_krav' })
      // Østrogenholdig behandling må besvares, og et ja krever en skriftlig vurdering av måldosen.
      expect(r.sporsmal?.find((x) => x.id === 'ostrogen'), r.id).toMatchObject({ krever_begrunnelse: true, grunnlag: { henvisninger: expect.arrayContaining([LAMICTAL.hormonell]) } })
    }
  })

  it('skiller en dose verktøyet kontrollerer fra en dose forskriveren bare bekrefter', () => {
    // Valproat: dosen kontrolleres ikke, og bekreftelsen sier det.
    expect(VALPROAT_LAMOTRIGIN.inndata.filter((k) => k.navn === 'startdose')).toEqual([])
    expect(VALPROAT_LAMOTRIGIN.bekreftelser.find((b) => b.id === 'aktuell_dose')?.tekst).toMatch(/Verktøyet kontrollerer ikke denne dosen mot noe preparat eller område; planen gjentar den bare\.$/)
    // Litium: hele Lithionit-tabletter à 42 mg Li⁺ (6 mmol), 1–10 tabletter, og enheten står i bekreftelsen.
    const litium = LITIUM_LAMOTRIGIN.inndata.filter((k) => k.navn === 'startdose')
    expect(litium).toEqual([expect.objectContaining({ verdier: [42, 84, 126, 168, 210, 252, 294, 336, 378, 420], art: 'bindende_krav' })])
    expect(LITIUM_LAMOTRIGIN.bekreftelser.find((b) => b.id === 'aktuell_dose')?.tekst).toMatch(/Lithionit 42 mg .*mg litium \(Li⁺\).*6 mmol/)
    for (const [id, utfall] of [['K4-35', 'stopp'], ['K4-36', 'stopp'], ['K4-37', 'stopp'], ['K4-38', 'plan'], ['K4-39', 'stopp']] as const) expect(resultat(id).res.utfall, id).toBe(utfall)
    expect(resultat('K4-38').res.tekst).toContain('Litium peroralt: 420 mg Li⁺ (60 mmol) = 10 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST')
  })

  it('skriver litiumdosen i den kopierte planen med preparat, Li⁺, mmol og antall tabletter, og sier om dosen er kontrollert', () => {
    // Den faktiske teksten som kopieres, fra den samme veien som verktøysiden.
    const litium = resultat('K4-30').res.tekst!
    const rader = litium.split('\n').filter((l) => l.includes('Litium peroralt:'))
    expect(rader).toHaveLength(4)
    for (const l of rader) expect(l).toContain('Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke')
    // Den gamle, tvetydige teksten står ingen steder.
    expect(litium).not.toMatch(/Litium peroralt: 168 mg =/)
    expect(litium).not.toMatch(/Litium fortsetter uendret på 168 mg[;.]/)
    // Valproat: dosen er bare bekreftet av forskriveren, og planen sier det.
    const valproat = resultat('K4-10').res.tekst!
    expect(valproat).toContain('Valproat peroralt: 1000 mg = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke')
    expect(valproat).not.toContain('kontrollert mot regelens tillatte doser')
  })

  it('går bare til en måldose forskriveren har valgt, og stopper ved et annet mål', () => {
    for (const id of ['K4-22', 'K4-40']) expect(resultat(id).res.utfall, id).toBe('stopp')
    expect(resultat('K4-10').res.tekst).toContain('Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd.')
    // Østrogenholdig behandling: ubesvart eller uten skriftlig vurdering stopper; med vurdering står den i planen.
    for (const id of ['K4-23', 'K4-25', 'K4-41', 'K4-42']) expect(resultat(id).res.utfall, id).toBe('stopp')
    // Målet er et klinisk avgrensningsvilkår som bekreftes, og ved østrogen en egen bekreftet vurdering, ikke bare fritekst.
    for (const r of TILLEGGSSETT.regler) {
      expect(r.bekreftelser.find((b) => b.id === 'maldose_valgt')?.ved, r.id).toBeUndefined()
      expect(r.bekreftelser.find((b) => b.id === 'ostrogen_maldose')?.ved, r.id).toEqual({ sporsmal: 'ostrogen', svar: true })
    }
    expect(resultat('K4-24').res.tekst).toContain('Syntetisk: måldosen vurderes på nytt')
  })

  it('krever hvert vilkår i det graviditetsforebyggende programmet for valproat bekreftet for seg, bare når pasienten kan bli gravid', () => {
    const ppp = VALPROAT_LAMOTRIGIN.bekreftelser.filter((b) => b.ved?.sporsmal === 'kan_bli_gravid')
    expect(ppp.map((b) => b.id)).toEqual(['ppp_indikasjon', 'ppp_informasjon', 'ppp_prevensjon', 'ppp_graviditet'])
    for (const b of ppp) expect(b.ved, b.id).toEqual({ sporsmal: 'kan_bli_gravid', svar: true })
    expect(VALPROAT_LAMOTRIGIN.sporsmal?.map((x) => x.id)).toContain('kan_bli_gravid')
    expect(LITIUM_LAMOTRIGIN.bekreftelser.some((b) => b.ved?.sporsmal === 'kan_bli_gravid')).toBe(false)
    // Ja og alt bekreftet gir plan med vilkårene i kontrollene; ett som mangler, eller et ubesvart spørsmål, stopper.
    const ja = resultat('K4-14').res.tekst!
    for (const b of ppp) expect(ja, b.id).toContain(`Bekreftet: ${b.tekst.replace(/\.$/, '')}: oppfylt`)
    for (const id of ['K4-26', 'K4-27', 'K4-28']) expect(resultat(id).res.utfall, id).toBe('stopp')
    // Nei: vilkårene spørres ikke etter og står ikke i planen.
    const nei = resultat('K4-29').res.tekst!
    for (const b of ppp) expect(nei, b.id).not.toContain(b.tekst)
  })

  it('stopper ved graviditet sammen med valproat, og sier at det også gjelder valproatbehandlingen', () => {
    const graviditet = VALPROAT_LAMOTRIGIN.unntak.filter((u) => u.id === 'graviditet')
    expect(graviditet).toHaveLength(1)
    expect(graviditet[0]!.tekst).toMatch(/valproat er kontraindisert under graviditet ved bipolar lidelse/)
    expect(LITIUM_LAMOTRIGIN.unntak.find((u) => u.id === 'graviditet')!.tekst).toBe('Pasienten er gravid, planlegger graviditet eller ammer.')
    expect(resultat('K4-13').res.utfall).toBe('stopp')
  })

  it('er ikke godkjent, og verktøyet gir ingen plan for dem i dag', () => {
    for (const r of TILLEGGSSETT.regler) {
      expect(erKliniskGodkjent(r), r.id).toBe(false)
      expect(kontrollutfall(r), r.id).toBe('til_kontroll')
      expect(r.godkjenning.historikk.some((s) => s.av === SIMULERT_KONTROLLOR), r.id).toBe(false)
      const t = tilgjengelighet(KOMBINERE, { fra: peroral(r.fra!.type === 'virkestoff' ? r.fra!.nokkel : ''), til: peroral('lamotrigin') })
      expect(t.status, r.id).toBe('til_kontroll')
    }
  })

  it('følger tabell 3 i preparatomtalen nøyaktig: annenhver dag og lavere måldose med valproat, uten valproat 25 → 50 → 100 → 200 mg', () => {
    expect(OPPTRAPPING.hemmer).toMatchObject({ trinn: [{ mg: 25, dager: 14, hver: 2 }, { mg: 25, dager: 14 }, { mg: 50, dager: 7 }], maldose: 100, maks: { mg: 200 } })
    expect(OPPTRAPPING.noytral).toMatchObject({ trinn: [{ mg: 25, dager: 14 }, { mg: 50, dager: 14 }, { mg: 100, dager: 7 }], maldose: 200 })
    expect(OPPTRAPPING.noytral.maks).toBeUndefined()
    const fullt = (r: typeof VALPROAT_LAMOTRIGIN) => kortform(beregn(r, r.eksempler[0]!.inndata))
    expect(fullt(VALPROAT_LAMOTRIGIN)).toEqual({ fra: [], til: ['dag 1–14: 25 mg annenhver dag', 'dag 15–28: 25 mg', 'dag 29–35: 50 mg', 'fra dag 36: 100 mg'] })
    expect(fullt(LITIUM_LAMOTRIGIN)).toEqual({ fra: [], til: ['dag 1–14: 25 mg', 'dag 15–28: 50 mg', 'dag 29–35: 100 mg', 'fra dag 36: 200 mg'] })
    // Høyeste dose med valproat er et bindende krav fra preparatomtalen.
    expect(VALPROAT_LAMOTRIGIN.plan.forlop[1]!.dosevalg?.maks_mg).toMatchObject({ verdi: 200, art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.hemmerMaks] } })
  })

  it('bruker bare dispergerbare Lamictal-tabletter og deler aldri en tablett', () => {
    for (const r of TILLEGGSSETT.regler) expect(r.plan.forlop[1]!.legemiddelformer, r.id).toEqual(['524'])
    for (const id of ['K4-10', 'K4-30']) {
      const u = resultat(id).res
      const doser = u.utfall === 'plan' ? u.linjer.filter((l) => l.includes('Lamotrigin peroralt')) : []
      expect(doser.length, id).toBe(4)
      for (const l of doser) expect(l, id).toMatch(/Lamotrigin peroralt: \d+ mg( annenhver dag)? = 1 tablett à \d+ mg$/)
      const tekst = u.tekst!
      const preparater = tekst.slice(tekst.indexOf('Preparater planen bygger på:'), tekst.indexOf('Kontroller:')).split('\n').filter((l) => l.startsWith('- '))
      expect(preparater.length, id).toBeGreaterThan(0)
      for (const linje of preparater) expect(linje, id).toMatch(/^- Lamictal tyggetab\/disperg tab \d+ mg /)
    }
  })

  it('tilbys bare i verktøyet for tillegg, aldri i bytteverktøyene, og bare i kildetabellens retning', () => {
    for (const v of VERKTOY.filter((x) => x.type !== 'tillegg')) {
      for (const r of TILLEGGSSETT.regler) {
        const fra = r.fra!.type === 'virkestoff' ? r.fra!.nokkel : ''
        expect(reglerFor(v, { fra: peroral(fra), ...(v.type === 'seponering' ? {} : { til: peroral('lamotrigin') }) }, REGELSETT), `${v.id} ${r.id}`).toEqual([])
      }
    }
    expect(reglerFor(KOMBINERE, { fra: peroral('lamotrigin'), til: peroral('valproat') }, REGELSETT)).toEqual([])
    expect(reglerFor(KOMBINERE, { fra: peroral('valproat'), til: peroral('lamotrigin') }, REGELSETT).map((r) => r.id)).toEqual([VALPROAT_LAMOTRIGIN.id])
  })
})

describe('Kontrollgrunnlaget (ende til ende som verktøysiden)', () => {
  it('gir det hvert kasus forventer', () => {
    for (const { k, avvik } of RESULTATER) expect(avvik, `${k.id}: ${k.hva}`).toEqual([])
    expect(TILLEGGSKASUS.length).toBeGreaterThanOrEqual(20)
  })

  it('viser to komplette planer til sluttmålet, med det eksisterende legemidlet uendret og vurderingspunkter', () => {
    for (const [id, eksisterende, mal] of [
      ['K4-10', 'Valproat fortsetter uendret på 1000 mg', 'Lamotrigin fortsetter på 100 mg fra dag 36'],
      ['K4-30', 'Litium fortsetter uendret på 168 mg Li⁺ (24 mmol)', 'Lamotrigin fortsetter på 200 mg fra dag 36'],
    ] as const) {
      const tekst = resultat(id).res.tekst!
      expect(tekst).toContain(`Komplett plan til sluttmålet: ${eksisterende}; ${mal}.`)
      expect(tekst).toContain('Vurderingspunkter:')
      expect(tekst).toMatch(/før hver doseendring \(dag 15, 29, 36\): Før hver doseøkning: spør etter utslett/)
      expect(tekst).toContain('Kontroller:')
    }
    // Valproatplanen starter med én 25 mg-tablett annenhver dag, aldri 12,5 mg daglig.
    expect(resultat('K4-10').res.tekst).toContain('Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg')
    expect(resultat('K4-10').res.tekst).not.toContain('12,5 mg =')
  })

  it('stopper heller enn å velge en annen dose når 25 mg ikke finnes', () => {
    const u = resultat('K4-18').res
    expect(u.utfall).toBe('stopp')
    expect('grunner' in u && u.grunner.join(' ')).toMatch(/beregningen gjør det ikke selv/)
  })

  it('er oppdatert', () => {
    expect(les(TILLEGGSGRUNNLAGFIL), 'Kjør `npm run verktoy:regler -- tilleggsgrunnlag`').toBe(lagTilleggsgrunnlag(uttrekk))
  })

  it('sier at reglene ikke er godkjent og viser ingen tekst fra Psychiatrienet', () => {
    const tekst = les(TILLEGGSGRUNNLAGFIL)
    expect(tekst).toContain('**Reglene er ikke godkjent.**')
    expect(tekst).not.toContain('psychiatrienet.nl/switchtabel/show')
  })
})
