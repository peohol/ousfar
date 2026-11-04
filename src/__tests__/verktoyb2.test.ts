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
import { B2_PAKNINGER, flaskerOverTid, FORSLAG_B2, FORSLAG_K1, KONTROLLFORSLAG, kontrollavvik, omfangsplaner, type Omfangsplan } from '../verktoy/kontrollgrunnlag'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { erErstattet, erKliniskGodkjent, erstatningsfeil, fingeravtrykk, godkjenningsfeil } from '../verktoy/regler/godkjenning'
import { B2_ESCITALOPRAM, B2_KONTROLL_0411, K1_9_AVGJORELSE, K1_OVERGANGER, medFormovergang } from '../verktoy/regler/k1'
import { alleGrunnlag, formovergangsfeil, type Avklaring, type Regel } from '../verktoy/regler/modell'
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

  it('arver ikke godkjenningen: står til faglig kontroll med overgangen og dråpepreferansen avklart av kontrolløren, uten klinisk godkjenning', () => {
    const r = i(V14)
    expect(r.godkjenning.status).toBe('til_faglig_kontroll')
    expect(erKliniskGodkjent(r)).toBe(false)
    expect(r.godkjenning.historikk.some((h) => h.status === 'klinisk_godkjent' && h.regelversjon === 14)).toBe(false)
    expect(alleGrunnlag(r).filter(([, g]) => g.type === 'ousfar_vurdering' && !g.avklaring)).toEqual([])
    // Avklaringene er kontrollørens (B2.1 og B2.2), for nøyaktig versjon 14.
    const avklart = (sti: string) => alleGrunnlag(r).find(([s]) => s === sti)![1] as { avklaring: Avklaring }
    expect(avklart('fra.formoverganger[0]').avklaring).toEqual(B2_KONTROLL_0411.overgang)
    expect(avklart('fra.dosevalg.praktisk').avklaring).toEqual(B2_KONTROLL_0411.praktisk)
    for (const a of [B2_KONTROLL_0411.overgang, B2_KONTROLL_0411.praktisk]) expect([a.rolle, a.regelversjon]).toEqual(['uavhengig_kontrollor', 14])
    // B2.6 nei: én form per dose.
    expect(r.plan.forlop[0]!.formoverganger![0]!.samtidig).toBeUndefined()
    // Uten en registrert godkjenning gir regelen ingen plan.
    expect(godkjenningsfeil(r).length).toBeGreaterThan(0)
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

  it('endrer bare overgangen, den praktiske doseringen, tablettilfellet, teksten om overgangen og aldersspørsmålet', () => {
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
        sporsmal: x.sporsmal?.filter((q) => q.id !== 'eldre'),
        fortolkning: { ...x.fortolkning, tilpasninger: x.fortolkning.tilpasninger.filter((u) => !/^En pasient som bruker escitalopram tabletter/.test(u.tekst)) },
      }
    }
    expect(uten(ny)).toEqual(uten(gammel))
    expect(ny.godkjenning.historikk.slice(0, gammel.godkjenning.historikk.length)).toEqual(gammel.godkjenning.historikk)
  })

  it('spør om 65 år eller eldre, så 65 år er utenfor Peders avgrensning (K1.9: under 65 år), mens versjon 13 er uendret', () => {
    const sporsmal = (r: Regel) => r.sporsmal!.find((q) => q.id === 'eldre')!
    expect(K1_9_AVGJORELSE.avgrensning).toMatch(/under 65 år/)
    expect([sporsmal(i(V14)).tekst, sporsmal(i(V14)).ja]).toEqual(['Er pasienten 65 år eller eldre?', '65 år eller eldre'])
    expect(sporsmal(i(V13)).tekst).toBe('Er pasienten over 65 år?')
    expect({ ...sporsmal(i(V14)), tekst: '', ja: '' }).toEqual({ ...sporsmal(i(V13)), tekst: '', ja: '' })
    // Alderen 64, 65 og 66 år gir svaret forskriveren skal gi på spørsmålet; bare 64 år gir en plan (kasus B2-17, B2-18/B2-19 og B2-08).
    const svar = (alder: number) => alder >= 65
    const kasus = (id: string) => FORSLAG_B2.kasus.find((k) => k.id === id)!
    for (const [alder, ider] of [
      [64, ['B2-17']],
      [65, ['B2-18', 'B2-19']],
      [66, ['B2-08']],
    ] as const)
      for (const id of ider) {
        expect(kasus(id).skjema?.svar?.eldre, `${alder} år, ${id}`).toBe(svar(alder))
        expect(kasus(id).forventet.utfall === 'plan', `${alder} år, ${id}`).toBe(alder < 65)
      }
    expect(() => medFormovergang(i(V13), { ...B2_ESCITALOPRAM, sporsmal: [{ id: 'finnes_ikke', tekst: '', ja: '', begrunnelse: '' }] })).toThrow(/finnes ikke i regelen/)
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

describe('Pakningene i B2.3', () => {
  type Pakning = { navn_form_styrke: string; avregistrert_dato: string | null; innhold: { mengde: number; enhet: { kode: string } }[] }
  const escitalopram = (uttrekkene.aksept.utvalg as unknown as { pakninger: Pakning[] }).pakninger.filter((p) => /cipralex|escitalopram/i.test(p.navn_form_styrke) && !p.avregistrert_dato)
  const minste = (re: RegExp) => Math.min(...escitalopram.filter((p) => re.test(p.navn_form_styrke)).map((p) => p.innhold[0]!.mengde))

  it('stemmer med FEST-uttrekket: dråpene bare à 15 ml, minste tablettpakning 28 stk for 5 og 10 mg', () => {
    const draper = escitalopram.filter((p) => /dråper/.test(p.navn_form_styrke))
    expect(draper.length).toBeGreaterThan(0)
    expect(new Set(draper.map((p) => `${p.innhold[0]!.mengde} ${p.innhold[0]!.enhet.kode}`))).toEqual(new Set([`${B2_PAKNINGER.flaske_ml} ml`]))
    expect([minste(/tab 5 mg/), minste(/tab 10 mg/)]).toEqual([B2_PAKNINGER.minste_tablettpakning[5], B2_PAKNINGER.minste_tablettpakning[10]])
    // 20 mg/ml og 1 mg per dråpe (preparatomtalen pkt. 2) gir 20 dråper per ml.
    expect(B2_PAKNINGER.draper_per_ml).toBe(20 / 1)
  })

  it('regner riktig: 15 dråper i 28 dager er 420 dråper (21 ml) og krever to flasker, ikke én', () => {
    const b23 = FORSLAG_B2.sporsmal.find((q) => q.nr === 'B2.3')!
    expect(b23.sporsmal).toMatch(/420 dråper eller 21 ml, altså 2 flasker à 15 ml/)
    expect(b23.sporsmal).not.toMatch(/én pakning\)/)
  })

  it('regner flaskene dag for dag med holdbarheten etter anbrudd: 6 flasker etter tablettene, 8 med dråper fra start', () => {
    const b23 = FORSLAG_B2.sporsmal.find((q) => q.nr === 'B2.3')!
    expect(B2_PAKNINGER.holdbarhet_etter_anbrudd_dager).toBe(8 * 7)
    expect(b23.sporsmal).toMatch(/2 tablettpakninger og 6 flasker \(1372 dråper fra dag 29\), i alt 8 pakninger, og med dråper fra start 8 flasker \(1792 dråper\)/)
    expect(b23.sporsmal).toMatch(/Uten holdbarheten ville det vært 5 og 6 flasker/)
    expect(b23.anbefalt).toMatch(/\(2 mot 2\) og i hele forløpet \(8 mot 8\)/)
  })

  it('kan ikke dekke 300 dråper over mer enn 8 uker med én åpnet flaske', () => {
    const dager = (n: number, draper: number) => Array<number>(n).fill(draper)
    // 300 dråper på 56 dager får plass i én flaske; den samme mengden over 60 dager gjør ikke det.
    expect(flaskerOverTid([...dager(55, 5), 25])).toBe(1)
    expect(flaskerOverTid(dager(60, 5))).toBe(2)
    // Selv 1 dråpe daglig krever en ny flaske etter 56 dager, lenge før den er tom.
    expect(flaskerOverTid(dager(56, 1))).toBe(1)
    expect(flaskerOverTid(dager(57, 1))).toBe(2)
    expect(flaskerOverTid(dager(57, 1), 300, Infinity)).toBe(1)
    // En dose som ikke dekkes av resten, tas fra en ny flaske.
    expect(flaskerOverTid([299, 2])).toBe(2)
    expect(() => flaskerOverTid([301])).toThrow(/får ikke plass/)
  })
})

describe('Tabletter og dråper i samme dose (B2.6, ikke i forslaget)', () => {
  it('gir høyst 5 dråper per administrasjon, men flere pakninger, og står bare som spørsmål', () => {
    const b26 = FORSLAG_B2.sporsmal.find((q) => q.nr === 'B2.6')!
    expect(b26.sporsmal).toMatch(/høyst 5 dråper per administrasjon gjennom hele forløpet, mot 12/)
    expect(b26.sporsmal).toMatch(/i alt 11 pakninger: .*mot 8 i versjon 14/)
    // Regelen har ikke samtidig: spørsmålet endrer ingenting før kontrolløren har svart.
    expect(i(V14).plan.forlop[0]!.formoverganger![0]!.samtidig).toBeUndefined()
    expect(FORSLAG_B2.kasus.filter((k) => /B2\.6/.test(k.hva)).map((k) => k.id)).toEqual(['B2-20', 'B2-21'])
  })
})

describe('Kasusene i kontrollgrunnlaget', () => {
  it.each(FORSLAG_B2.kasus.map((k) => [k.id, k] as const))('%s', (_, k) => {
    expect(kontrollavvik(k, uttrekkene)).toEqual([])
  })
})
