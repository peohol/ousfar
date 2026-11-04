/**
 * B2 i `docs/verktøy-brukervennlighet-2026-11.md`: escitalopram med tabletter
 * så lenge de gir dosen, så dråper (`regler/k1.ts`, versjon 14), med
 * kontrollgrunnlaget `docs/verktøy-b2-escitalopram-kontrollgrunnlag.md`.
 *
 * Testene viser at versjon 14 er en egen regel som ikke arver godkjenningen
 * av versjon 13, at versjon 13 gjelder uendret til versjon 14 er godkjent og
 * da trekkes, at dråpepasienter får nøyaktig den samme planen som før, og
 * kasusene i kontrollgrunnlaget. Alle doser er syntetiske.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FORSLAG_B2, FORSLAG_K1, KONTROLLFORSLAG, kontrollavvik, omfangsplaner, type Omfangsplan } from '../verktoy/kontrollgrunnlag'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { erErstattet, erKliniskGodkjent, erstatningsfeil, fingeravtrykk, godkjenningsfeil } from '../verktoy/regler/godkjenning'
import { B2_ESCITALOPRAM, K1_OVERGANGER, medFormovergang } from '../verktoy/regler/k1'
import { alleGrunnlag, formovergangsfeil, type Regel } from '../verktoy/regler/modell'
import { simulerGodkjenning } from '../verktoy/regler/pilotmatrise'
import { REGELSETT } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekkene = { pilot: JSON.parse(les(FEST_PILOT)) as Festuttrekk, aksept: JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk }
const i = (id: string) => REGELSETT.regler.find((r) => r.id === id)!
const V13 = 'seponering-escitalopram'
const V14 = B2_ESCITALOPRAM.id

describe('Versjon 14 (B2)', () => {
  it('er en egen regel med fingeravtrykket i kontrollgrunnlaget, som erstatter versjon 13', () => {
    const r = i(V14)
    expect(K1_OVERGANGER).toEqual([B2_ESCITALOPRAM])
    expect(KONTROLLFORSLAG).toContain(FORSLAG_B2)
    expect([r.versjon, fingeravtrykk(r)]).toEqual([14, FORSLAG_B2.regler[0]!.fingeravtrykk])
    expect(r.erstatter).toEqual([V13])
    expect(erstatningsfeil([r], REGELSETT.regler)).toEqual([])
    expect(formovergangsfeil(r)).toEqual([])
  })

  it('arver ikke godkjenningen: står til faglig kontroll med overgangen og dråpepreferansen som åpne forslag', () => {
    const r = i(V14)
    expect(r.godkjenning.status).toBe('til_faglig_kontroll')
    expect(erKliniskGodkjent(r)).toBe(false)
    const apne = alleGrunnlag(r).filter(([, g]) => g.type === 'ousfar_vurdering' && !g.avklaring)
    expect(apne.map(([sti]) => sti)).toEqual(['fra.formoverganger[0]', 'fra.dosevalg.praktisk'])
    // Selv en registrert godkjenning gir ingen plan før valgene er avklart.
    const kopi = structuredClone(r)
    simulerGodkjenning(kopi, { id: kopi.id, versjon: kopi.versjon, fingeravtrykk: fingeravtrykk(kopi) }, '2026-11-04')
    expect(godkjenningsfeil(kopi).join(' ')).toMatch(/åpne valg/)
  })

  it('endrer ikke versjon 13: samme fingeravtrykk, fortsatt godkjent og ikke trukket', () => {
    const r = i(V13)
    expect([r.versjon, fingeravtrykk(r), erKliniskGodkjent(r)]).toEqual([13, FORSLAG_K1.regler[0]!.fingeravtrykk, true])
    expect(erErstattet(r, REGELSETT.regler)).toBe(false)
  })

  it('trekker versjon 13 i det øyeblikket versjon 14 er gyldig godkjent', () => {
    const ny = structuredClone(i(V14))
    for (const [, g] of alleGrunnlag(ny))
      if (g.type === 'ousfar_vurdering' && !g.avklaring) g.avklaring = { dato: '2026-11-04', av: 'Simulert i testen', rolle: 'uavhengig_kontrollor', regelversjon: 14, merknad: 'Bare i testen.' }
    simulerGodkjenning(ny, { id: ny.id, versjon: ny.versjon, fingeravtrykk: fingeravtrykk(ny) }, '2026-11-04')
    expect(erKliniskGodkjent(ny)).toBe(true)
    const regler = REGELSETT.regler.map((r) => (r.id === V14 ? ny : r))
    expect(erErstattet(i(V13), regler)).toBe(true)
  })

  it('endrer bare overgangen, den praktiske doseringen, tablettilfellet og teksten om overgangen', () => {
    const [gammel, ny] = [i(V13), i(V14)]
    const uten = (r: Regel) => {
      const x = structuredClone(r) as Partial<Regel> & Regel
      const f = x.plan.forlop[0]!
      delete f.formoverganger
      delete f.dosevalg!.praktisk
      return {
        ...x,
        id: '',
        tittel: '',
        versjon: 0,
        erstatter: undefined,
        godkjenning: undefined,
        klinisk_omfang: { ...x.klinisk_omfang!, tilfeller: x.klinisk_omfang!.tilfeller.filter((t) => t.legemiddelform === '748') },
        fortolkning: { ...x.fortolkning, tilpasninger: x.fortolkning.tilpasninger.filter((u) => !/^En pasient som bruker escitalopram tabletter/.test(u.tekst)) },
      }
    }
    expect(uten(ny)).toEqual(uten(gammel))
    expect(ny.godkjenning.historikk.slice(0, gammel.godkjenning.historikk.length)).toEqual(gammel.godkjenning.historikk)
  })

  it('bygges bare på nøyaktig versjonen forslaget gjelder', () => {
    const r = i(V13)
    expect(() => medFormovergang({ ...r, versjon: 12 }, B2_ESCITALOPRAM)).toThrow(/bygger på versjon 13/)
    expect(() => medFormovergang(r, { ...B2_ESCITALOPRAM, regel: 'seponering-sertralin' })).toThrow(/gjelder seponering-sertralin/)
    expect(() => medFormovergang(r, { ...B2_ESCITALOPRAM, tilpasning: { ...B2_ESCITALOPRAM.tilpasning, erstatter: /^Finnes ikke/ } })).toThrow(/fant ingen tekst om overgangen/)
  })
})

describe('Planene', () => {
  const planer = omfangsplaner(FORSLAG_B2, uttrekkene)
  const k1 = omfangsplaner(FORSLAG_K1, uttrekkene)
  const kort = (o: Omfangsplan) =>
    o.veier.map((v) => ({ valg: v.valg.map((x) => x.valgt), linjer: 'linjer' in v.utfall ? v.utfall.linjer : undefined, grunner: 'grunner' in v.utfall ? v.utfall.grunner : undefined }))
  const fra = (p: Omfangsplan[], form: string, mg: number, lang: boolean) => p.find((o) => o.form === form && o.startdose_mg === mg && !!o.tilfelle.svar.lang_behandlingstid === lang)!

  it('gir dråpepasienter nøyaktig de samme planene, valgene og stoppene som versjon 13', () => {
    for (const mg of [10, 20]) for (const lang of [false, true]) expect(kort(fra(planer, '748', mg, lang)), `${mg} mg ${lang ? 'lang' : 'kort'}`).toEqual(kort(fra(k1, '748', mg, lang)))
  })

  it('gir tablettpasienter en komplett plan der tablettene bare brukes så lenge hele tabletter gir dosen, og aldri etter dråper', () => {
    for (const mg of [10, 20]) {
      const o = fra(planer, '53', mg, false)
      expect(o.veier.length, `${mg} mg`).toBeGreaterThan(0)
      for (const v of o.veier) {
        expect(v.utfall.utfall, `${mg} mg`).toBe('plan')
        const doser = (v.utfall as { linjer: string[] }).linjer.filter((l) => /peroralt: \d/.test(l))
        const tablett = doser.map((l) => /tablett/.test(l))
        // Tablettene står først, og ingen dose blander former.
        expect(tablett).toEqual([...tablett].sort((a, b) => Number(b) - Number(a)))
        for (const l of doser) expect(/tablett/.test(l) && /dråpe/.test(l), l).toBe(false)
      }
    }
  })
})

describe('Kasusene i kontrollgrunnlaget', () => {
  it.each(FORSLAG_B2.kasus.map((k) => [k.id, k] as const))('%s', (_, k) => {
    expect(kontrollavvik(k, uttrekkene)).toEqual([])
  })
})
