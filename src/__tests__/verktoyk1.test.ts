/**
 * K1 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`: nedtrapping av
 * escitalopram, nortriptylin, amitriptylin og sertralin til seponering
 * (`src/verktoy/regler/avslutning.ts`) og kontrollgrunnlaget
 * (`docs/verktøy-k1-nedtrapping-kontrollgrunnlag.md`). De nye versjonene er
 * til faglig kontroll, ikke godkjent; de andre reglene er uendret; avslutningen
 * gjelder nøyaktig fra grensen; og kasusene gir komplette forløp der det går og
 * en delplan som sier hvorfor ellers.
 *
 * Alle doser er syntetiske; ingen pasientopplysninger.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FORSLAG_K1, KONTROLLFORSLAG, kontrollavvik, lagKontrollgrunnlag, omfangsplaner, planutfallstekst } from '../verktoy/kontrollgrunnlag'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { avslutningstekst, K1_AVSLUTNINGER, medAvslutning, medAvslutninger } from '../verktoy/regler/avslutning'
import { beregn, kortform, overAvslutning } from '../verktoy/regler/beregning'
import { erKliniskGodkjent, fingeravtrykk } from '../verktoy/regler/godkjenning'
import { apneValg, avslutningFor, type Regel } from '../verktoy/regler/modell'
import { kontrollerRegelsett } from '../verktoy/regler/kontroll'
import { NEDTRAPPINGSSETT, NEDTRAPPINGSSETT_FOR_AVSLUTNING } from '../verktoy/regler/nedtrapping'
import { DELPLAN, KOMPLETT } from '../verktoy/planvisning'
import { REGELSETT } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekkene = { pilot: JSON.parse(les(FEST_PILOT)) as Festuttrekk, aksept: JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk }
const i = (sett: { regler: Regel[] }, id: string) => sett.regler.find((r) => r.id === id)!
const K1 = K1_AVSLUTNINGER.map((a) => a.regel)
/** Siste fase i regelens forløp, nedtrappingen som får avslutningen. */
const sisteFase = (r: Regel) => r.plan.forlop[0]!.faser.at(-1)!
/** Laveste døgndose i preparatomtalen, slik regelen har den: grensen for avslutningen. */
const lavGrense = (r: Regel) => {
  const f = sisteFase(r)
  return f.type === 'nedtrapping' && f.strategi.type === 'prosent_av_aktuell' ? f.strategi.lav_grense_mg!.verdi! : NaN
}

describe('De nye regelversjonene', () => {
  it('er escitalopram, nortriptylin, amitriptylin og sertralin, én versjon over versjonen før, til faglig kontroll og ikke godkjent', () => {
    expect(K1).toEqual(['seponering-escitalopram', 'seponering-nortriptylin', 'seponering-amitriptylin', 'seponering-sertralin'])
    expect(NEDTRAPPINGSSETT.versjon).toBe(NEDTRAPPINGSSETT_FOR_AVSLUTNING.versjon + 1)
    for (const a of K1_AVSLUTNINGER) {
      const for_ = i(NEDTRAPPINGSSETT_FOR_AVSLUTNING, a.regel)
      const ny = i(NEDTRAPPINGSSETT, a.regel)
      expect(for_.versjon, a.regel).toBe(a.fra_versjon)
      expect(ny.versjon, a.regel).toBe(a.fra_versjon + 1)
      expect(ny.godkjenning.status, a.regel).toBe('til_faglig_kontroll')
      expect(ny.godkjenning.historikk.slice(-2).map((s) => [s.status, s.regelversjon, s.rolle]), a.regel).toEqual([
        ['utkast', ny.versjon, 'utvikler'],
        ['til_faglig_kontroll', ny.versjon, 'utvikler'],
      ])
      expect(erKliniskGodkjent(ny), a.regel).toBe(false)
    }
  })

  it('består kontrollene i regelsettet appen bruker, også regneeksemplene med avslutning og over grensen', () => {
    expect(kontrollerRegelsett(NEDTRAPPINGSSETT)).toEqual([])
    const nye = K1_AVSLUTNINGER.flatMap((a) => (a.nye_eksempler ?? []).map((n) => [a.regel, n.id]))
    expect(nye).toEqual([['seponering-escitalopram', 'fra-20-mg-lang-delplan'], ['seponering-sertralin', 'fra-100-mg-lang-delplan']])
    for (const [id, eks] of nye) expect(i(NEDTRAPPINGSSETT, id!).eksempler.find((e) => e.id === eks)!.forventet.fra!.join('\n'), eks).not.toMatch(/seponert/)
  })

  it('er nøyaktig versjonene og fingeravtrykkene i kontrollgrunnlaget', () => {
    expect(FORSLAG_K1.regler.map((k) => k.id).sort()).toEqual([...K1].sort())
    for (const k of FORSLAG_K1.regler) {
      const r = i(REGELSETT, k.id)
      expect([r.versjon, fingeravtrykk(r)], `${k.id} er endret; kontrollgrunnlaget gjelder ikke lenger`).toEqual([k.versjon, k.fingeravtrykk])
    }
  })

  it('seponerer bare fra laveste døgndose i preparatomtalen eller lavere (5, 25, 10 og 25 mg), med Peders valg som avklaring av grensen', () => {
    expect(K1.map((id) => lavGrense(i(REGELSETT, id)))).toEqual([5, 25, 10, 25])
    for (const id of K1) {
      const r = i(REGELSETT, id)
      const a = avslutningFor(sisteFase(r))!
      expect(a.type, id).toBe('seponering')
      expect(a.type === 'seponering' && a.fra_hoyst_mg, id).toMatchObject({ verdi: lavGrense(r), enhet: 'mg', art: 'bindende_krav' })
      const g = a.type === 'seponering' ? a.fra_hoyst_mg.grunnlag : null
      expect(g?.type === 'ousfar_vurdering' && g.avklaring, id).toMatchObject({ av: 'Peder (faglig beslutningstaker)', rolle: 'faglig_beslutningstaker', regelversjon: r.versjon, dato: '2026-11-03' })
      expect(a.grunnlag.type === 'ousfar_vurdering' && a.grunnlag.begrunnelse, id).toBe(avslutningstekst(r.tittel.replace(/^Seponering av /, '').replace(/,.*$/, ''), lavGrense(r)))
    }
  })

  it('har nøyaktig tre åpne valg til kontrolløren: avslutningens grunnlag, oppfølgingstiden og grunnlaget for vurderingen etter siste dose', () => {
    for (const id of K1)
      expect(apneValg(i(REGELSETT, id)), id).toEqual([
        'plan.forlop[0].vurderinger[1].nar.dager (åpent forslag)',
        'fra.vurderinger.etter_seponering (åpent forslag)',
        'fra.faser[0].avslutning (åpent forslag)',
      ])
  })

  it('vurderer før hver reduksjon og før seponering, og 28 dager etter siste dose', () => {
    for (const id of K1) {
      const v = i(REGELSETT, id).plan.forlop[0]!.vurderinger!
      expect(v.map((x) => [x.id, x.nar.type]), id).toEqual([
        ['for_hver_reduksjon', 'for_hvert_trinn'],
        ['etter_seponering', 'etter_seponering'],
      ])
      expect(v[1]!.nar.type === 'etter_seponering' && v[1]!.nar.dager.verdi, id).toBe(28)
    }
  })

  it('endrer ingen andre regler: de har samme versjon og fingeravtrykk, også de godkjente og de langsomme variantene', () => {
    for (const r of NEDTRAPPINGSSETT.regler.filter((x) => !K1.includes(x.id))) {
      const for_ = i(NEDTRAPPINGSSETT_FOR_AVSLUTNING, r.id)
      expect([r.versjon, fingeravtrykk(r)], r.id).toEqual([for_.versjon, fingeravtrykk(for_)])
      expect(avslutningFor(sisteFase(r))?.type, r.id).not.toBe('seponering')
    }
    // De godkjente reglene, med fingeravtrykkene kontrolløren godkjente.
    expect(fingeravtrykk(i(NEDTRAPPINGSSETT, 'seponering-vortioksetin'))).toBe('b28dec93f5ede06c6565e1ce5d6aa62606c69250f1a9088dae0c57d3121101f3')
    expect(fingeravtrykk(i(NEDTRAPPINGSSETT, 'seponering-bupropion'))).toBe('e7536668ac7f2d4dfd9959f24cfdfc4874182a4fc295355f0d10a05f438b5f5f')
    expect(fingeravtrykk(i(NEDTRAPPINGSSETT, 'seponering-agomelatin'))).toBe('6d42863f3573fb2e0d6dbffd27ff78a7f1c2b539c8dce2cfcd36ad417b61a2d1')
  })

  it('bygger bare på nøyaktig versjonen forslaget gjelder, og arver ingen forventet plan ukontrollert', () => {
    const esc = i(NEDTRAPPINGSSETT_FOR_AVSLUTNING, 'seponering-escitalopram')
    const a = K1_AVSLUTNINGER[0]!
    expect(() => medAvslutning({ ...esc, versjon: esc.versjon + 1 }, a)).toThrow(/bygger på versjon 12/)
    expect(() => medAvslutning(esc, { ...a, eksempler: {} })).toThrow(/mangler forventet plan med avslutning/)
    expect(() => medAvslutning(esc, { ...a, eksempler: { ...a.eksempler, ukjent: [] } })).toThrow(/ukjente regneeksempler: ukjent/)
    expect(() => medAvslutning(i(NEDTRAPPINGSSETT_FOR_AVSLUTNING, 'seponering-bupropion'), { ...a, regel: 'seponering-bupropion', fra_versjon: 5 })).toThrow(/prosentvis nedtrapping/)
    expect(() => medAvslutninger([esc], [{ ...a, regel: 'seponering-finnes-ikke' }])).toThrow(/ukjente regler: seponering-finnes-ikke/)
  })
})

describe('Avslutningen ved grensen', () => {
  // Escitalopram fra 20 mg med 10 % per trinn står på 5,65 mg etter tolv reduksjoner (regneeksempelet over grensen).
  const r = i(REGELSETT, 'seponering-escitalopram')
  const e = r.eksempler.find((x) => x.id === 'fra-20-mg-lang-delplan')!
  const medGrense = (mg: number): Regel => {
    const kopi = structuredClone(r)
    const a = avslutningFor(sisteFase(kopi))
    if (a?.type === 'seponering') a.fra_hoyst_mg.verdi = mg
    return kopi
  }
  const slutt = (x: Regel) => kortform(beregn(x, e.inndata)).fra!.slice(-2)

  it('stopper over grensen som en delplan og seponerer ikke, med regelens egen grense på 5 mg', () => {
    expect(slutt(r)).toEqual(['fra dag 309: 5,65 mg', 'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt'])
  })

  it('seponerer når siste dose er nøyaktig grensen, men ikke 0,01 mg over', () => {
    expect(slutt(medGrense(5.65))).toEqual(['dag 309–336: 5,65 mg', 'fra dag 337: seponert'])
    expect(slutt(medGrense(5.64))).toEqual(['fra dag 309: 5,65 mg', 'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt'])
    const res = beregn(medGrense(5.64), e.inndata)
    expect(res.status === 'modellberegning' && res.forlop[0]!.siste_dosedag).toBe(null)
  })

  it('sier hvorfor avslutningen ikke gjelder når planen står over grensen', () => {
    expect(overAvslutning('escitalopram', 5.65, 5)).toBe('Regelens avslutning av escitalopram gjelder bare fra 5 mg eller lavere, og planen står på 5,65 mg.')
  })
})

describe('Kontrollgrunnlaget', () => {
  it('er oppdatert og er et av kontrollforslagene', () => {
    expect(KONTROLLFORSLAG).toContain(FORSLAG_K1)
    expect(les(FORSLAG_K1.fil), 'Kjør `npm run verktoy:regler -- kontrollgrunnlag`').toBe(lagKontrollgrunnlag(FORSLAG_K1, uttrekkene))
  })

  it.each(FORSLAG_K1.kasus.map((k) => [`${k.id}: ${k.hva}`, k] as const))('%s', (_, k) => {
    expect(kontrollavvik(k, uttrekkene)).toEqual([])
  })

  it('har unike id-er, svarer på K0-01–K0-03 og prøver hver regel med komplett plan eller delplan, stopp og uten godkjenning', () => {
    const ider = FORSLAG_K1.kasus.map((k) => k.id)
    expect(new Set(ider).size).toBe(ider.length)
    expect([...new Set(FORSLAG_K1.kasus.flatMap((k) => (k.ref ? [k.ref] : [])))].sort()).toEqual(['K0-01', 'K0-02', 'K0-03'])
    for (const k of FORSLAG_K1.regler) {
      const utfall = FORSLAG_K1.kasus.filter((x) => x.valg.fra?.nokkel === k.id.replace('seponering-', '')).map((x) => x.forventet.utfall)
      expect(utfall, k.id).toContain('plan')
      expect(utfall, k.id).toContain('ingen')
    }
  })

  it('har minst to komplette forløp til seponering med norske preparater, for to virkestoffer', () => {
    const komplette = FORSLAG_K1.kasus.filter((k) => k.planutfall?.startsWith(KOMPLETT))
    expect(komplette.map((k) => k.id)).toEqual(['K1-01', 'K1-02', 'K1-03', 'K1-04', 'K1-05', 'K1-23', 'K1-24', 'K1-25'])
    expect(new Set(komplette.map((k) => k.valg.fra?.nokkel))).toEqual(new Set(['escitalopram', 'nortriptylin']))
  })

  it('seponerer bare fra grensen eller lavere, og bare som siste dose; hver delplan sier hva den ikke dekker og seponerer aldri', () => {
    const planer = omfangsplaner(FORSLAG_K1, uttrekkene).flatMap((o) => o.veier.map((v) => ({ o, v })))
    expect(planer).toHaveLength(21)
    for (const { o, v } of planer) {
      const hva = `${o.regel.id} ${o.form} ${o.startdose_mg} mg`
      expect(v.utfall.utfall, hva).toBe('plan')
      if (v.utfall.utfall !== 'plan') continue
      const utfall = planutfallstekst(v.utfall)!
      const doser = v.utfall.linjer.filter((l) => !/: Vurdering \(/.test(l))
      if (utfall.startsWith(KOMPLETT)) {
        expect(doser.at(-1), hva).toMatch(/^Fra dag \d+: \w+ peroralt: Seponert$/)
        const siste = Number(/: ([\d,]+) mg/.exec(doser.at(-2)!)![1]!.replace(',', '.'))
        expect(siste, hva).toBeLessThanOrEqual(lavGrense(i(REGELSETT, o.regel.id)))
        expect(siste, hva).toBeGreaterThan(0)
      } else {
        expect(utfall, hva).toMatch(new RegExp(`^${DELPLAN}: \\w+: .+\\.$`))
        expect(doser.join('\n'), hva).not.toMatch(/Seponert|: 0 mg/)
      }
    }
  })

  it('viser ingen tekst eller lenker fra Psychiatrienet, har ingen avvik og sier at ingen regel er godkjent', () => {
    const tekst = les(FORSLAG_K1.fil)
    expect(tekst).toContain('**Ingen regel er godkjent eller aktivert.**')
    expect(tekst).not.toMatch(/psychiatrienet\.(nl|org|com)/i)
    expect(tekst).not.toContain('**avvik:**')
    for (const nr of ['K1.1', 'K1.2', 'K1.3', 'K1.4', 'K1.5', 'K1.6', 'K1.7', 'K1.8']) expect(tekst).toContain(`| ${nr} |`)
  })

  it('endrer ikke reglene i regelsettet: den simulerte avklaringen og godkjenningen finnes bare på kopier', () => {
    for (const id of K1) {
      const r = i(REGELSETT, id)
      expect(erKliniskGodkjent(r), id).toBe(false)
      expect(apneValg(r), id).toHaveLength(3)
    }
  })
})
