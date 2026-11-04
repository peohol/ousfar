/**
 * K1 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`: escitalopram med
 * dråper helt til seponering (`src/verktoy/regler/k1.ts`), og
 * «komplett plan ikke tilgjengelig» ellers, med kontrollgrunnlaget
 * (`docs/verktøy-k1-nedtrapping-kontrollgrunnlag.md`). Testene viser at den
 * nye versjonen er et forslag til faglig kontroll med sluttdosen og det minste
 * trinnet som åpne valg, at planene i omfanget enten er komplette til
 * seponering fra 1 mg eller stopper uten doser, med de norske preparatene i
 * FEST, og at alle andre regler er uendret.
 *
 * Alle doser er syntetiske; ingen pasientopplysninger.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FORSLAG_K1, kjorKontrollkasus, KONTROLLFORSLAG, kontrollavvik, lagKontrollgrunnlag, omfangsplaner, planutfallstekst, type Kontrollkasus } from '../verktoy/kontrollgrunnlag'
import { KOMPLETT_IKKE_TILGJENGELIG } from '../verktoy/motor/plan'
import { KOMPLETT } from '../verktoy/planvisning'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { erKliniskGodkjent, fingeravtrykk } from '../verktoy/regler/godkjenning'
import { K1_AVSLUTNINGER, K1_ESCITALOPRAM, K1_SLUTTDOSE_PEDER, medAvslutning, medAvslutninger } from '../verktoy/regler/k1'
import { KILDER } from '../verktoy/regler/kilder'
import { apneValg, avslutningFor, type Fase, type Regel } from '../verktoy/regler/modell'
import { kontrollerRegelsett } from '../verktoy/regler/kontroll'
import { NEDTRAPPINGSSETT, NEDTRAPPINGSSETT_FOR_K1 } from '../verktoy/regler/nedtrapping'
import { REGELSETT } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekkene = { pilot: JSON.parse(les(FEST_PILOT)) as Festuttrekk, aksept: JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk }
const i = (sett: { regler: Regel[] }, id: string) => sett.regler.find((r) => r.id === id)!
const ESC = 'seponering-escitalopram'
const nedtrapping = (r: Regel) => r.plan.forlop[0]!.faser[0] as Extract<Fase, { type: 'nedtrapping' }>
const kasus = (id: string) => FORSLAG_K1.kasus.find((k) => k.id === id)!

describe('Den nye versjonen av escitalopramregelen', () => {
  const for_ = i(NEDTRAPPINGSSETT_FOR_K1, ESC)
  const ny = i(NEDTRAPPINGSSETT, ESC)

  it('er bare escitalopram, én versjon over versjon 12, til faglig kontroll og ikke godkjent', () => {
    expect(K1_AVSLUTNINGER.map((a) => a.regel)).toEqual([ESC])
    expect(NEDTRAPPINGSSETT.versjon).toBe(NEDTRAPPINGSSETT_FOR_K1.versjon + 1)
    expect([for_.versjon, ny.versjon]).toEqual([12, 13])
    expect(ny.godkjenning.status).toBe('til_faglig_kontroll')
    expect(ny.godkjenning.historikk.slice(-2).map((s) => [s.status, s.regelversjon, s.rolle])).toEqual([
      ['utkast', 13, 'utvikler'],
      ['til_faglig_kontroll', 13, 'utvikler'],
    ])
    expect(erKliniskGodkjent(ny)).toBe(false)
  })

  it('har sluttdosen avklart av Peder (K1.9) og det minste trinnet og oppfølgingsdagene som åpne forslag', () => {
    expect(apneValg(ny)).toEqual([
      'plan.forlop[0].faser[0].strategi.minste_trinn.fra_mg (åpent forslag)',
      'plan.forlop[0].faser[0].strategi.minste_trinn.maks_prosent (åpent forslag)',
      'plan.forlop[0].vurderinger[1].nar.dager (åpent forslag)',
      'plan.forlop[0].vurderinger[2].nar.dager (åpent forslag)',
      'plan.forlop[0].vurderinger[3].nar.dager (åpent forslag)',
    ])
    // Peders avgjørelse gjelder bare sluttdosen og seponeringen (K1.9), med ordlyden fra beslutningskortet.
    const avslutning = avslutningFor(nedtrapping(ny))!
    for (const g of [avslutning.fra_hoyst_mg.grunnlag, avslutning.grunnlag]) {
      expect(g.type === 'ousfar_vurdering' && g.avklaring).toEqual(K1_SLUTTDOSE_PEDER)
    }
    expect(K1_SLUTTDOSE_PEDER).toMatchObject({ dato: '2026-11-04', rolle: 'faglig_beslutningstaker', regelversjon: 13 })
    expect(K1_SLUTTDOSE_PEDER.merknad).toContain('«Ja, stopp fra 1 mg»')
    expect(K1_SLUTTDOSE_PEDER.merknad).toContain('«Gjelder voksne under 65 år med kort behandlingstid, uten tidligere seponeringsplager. Gir første komplette nedtrapping (fra 10 eller 20 mg), etter ChatGPTs kontroll av resten.»')
    expect(K1_SLUTTDOSE_PEDER.merknad).toContain('«1 mg er 5–10 % av startdosen. Hvert trinn styres av symptomer, og det følges opp etter 7, 14 og 28 dager. Ved plager vurderes resten individuelt.»')
    expect(JSON.stringify(ny.plan).match(/faglig_beslutningstaker/g)).toHaveLength(2)
    // Ingen godkjenning av regelen: historikken har bare utviklerens steg i versjon 13.
    expect(JSON.stringify(ny.godkjenning.historikk.filter((s) => s.regelversjon === 13))).not.toMatch(/uavhengig_kontrollor|faglig_beslutningstaker/)
    expect(ny.godkjenning.status).toBe('til_faglig_kontroll')
  })

  it('går 3 → 2 → 1 mg med dråper og seponerer fra 1 mg, med vurdering før hver endring og 7, 14 og 28 dager etter siste dose', () => {
    const f = nedtrapping(ny)
    if (f.strategi.type !== 'prosent_av_aktuell') throw new Error('ventet prosent av aktuell dose')
    expect([f.strategi.minste_trinn?.fra_mg.verdi, f.strategi.minste_trinn?.maks_prosent.verdi]).toEqual([3, 50])
    expect(avslutningFor(f)?.fra_hoyst_mg.verdi).toBe(1)
    const min = ny.plan.forlop[0]!.dosevalg?.min_mg
    expect(min?.verdi).toBe(1)
    expect(min?.grunnlag).toEqual({ type: 'kilde', henvisninger: [{ kilde: 'dmp-cipralex-draper', sted: 'pkt. 2', faktum: 'Hver dråpe inneholder 1 mg escitalopram (20 mg/ml).' }] })
    const v = ny.plan.forlop[0]!.vurderinger!
    expect(v.map((x) => [x.id, x.nar.type, x.nar.type === 'etter_seponering' ? x.nar.dager.verdi : null])).toEqual([
      ['for_hver_reduksjon', 'for_hvert_trinn', null],
      ['etter_seponering_7', 'etter_seponering', 7],
      ['etter_seponering_14', 'etter_seponering', 14],
      ['etter_seponering_28', 'etter_seponering', 28],
    ])
    // Teksten om at planen aldri går til null, er erstattet; overgangen fra tablett til dråper står i fortolkningen.
    expect(ny.fortolkning.tilpasninger.map((u) => u.tekst).join(' ')).not.toMatch(/går ikke til null/)
    expect(ny.fortolkning.tilpasninger.some((u) => /samme døgndose i mg/.test(u.tekst) && u.henvisninger.some((h) => h.kilde === 'dmp-cipralex-draper' && h.sted === 'pkt. 5.2'))).toBe(true)
    expect(ny.fortolkning.usikkerhet.join(' ')).toMatch(/Sluttdosen 1 mg \(én dråpe\) er ikke en dokumentert terskel/)
  })

  it('er ellers som versjon 12: omfang, trinnstørrelser, trinnlengder, spørsmål og unntak er uendret', () => {
    const uten = (r: Regel) => {
      const k = structuredClone(r)
      const f = nedtrapping(k)
      if (f.strategi.type === 'prosent_av_aktuell') delete f.strategi.minste_trinn
      f.avslutning = 'individuell'
      delete k.plan.forlop[0]!.dosevalg
      delete k.plan.forlop[0]!.vurderinger
      const { versjon: _v, fortolkning: _f, godkjenning: _g, eksempler: _e, ...resten } = k
      return resten
    }
    expect(uten(ny)).toEqual(uten(for_))
    expect(ny.eksempler.map((e) => e.id)).toEqual(for_.eksempler.map((e) => e.id))
    expect(ny.eksempler.filter((e) => e.stopp)).toEqual(for_.eksempler.filter((e) => e.stopp))
  })

  it('registrerer preparatomtalen for dråpene som kilde', () => {
    expect(KILDER.find((k) => k.id === 'dmp-cipralex-draper')).toMatchObject({
      type: 'preparatomtale',
      url: 'https://produktinformasjon.legemiddelsok.no/preparatomtaler/07-4892.pdf',
      versjon: 'Oppdatert 02.05.2024',
      sha256: '8cdc32851beab96c1032d10e444ab372186525790f32dd284dec5ec7a78e68ee',
    })
  })

  it('består kontrollene i regelsettet appen bruker', () => {
    expect(kontrollerRegelsett(NEDTRAPPINGSSETT)).toEqual([])
  })

  it('bygger bare på nøyaktig versjonen forslaget gjelder, og bare på en nedtrapping med valg av dose per trinn', () => {
    expect(() => medAvslutning({ ...for_, versjon: 13 }, K1_ESCITALOPRAM)).toThrow(/bygger på versjon 12/)
    expect(() => medAvslutning(for_, { ...K1_ESCITALOPRAM, regel: 'seponering-sertralin' })).toThrow(/gjelder seponering-sertralin, ikke seponering-escitalopram/)
    const utenValg = structuredClone(for_)
    delete nedtrapping(utenValg).trinnvalg
    expect(() => medAvslutning(utenValg, K1_ESCITALOPRAM)).toThrow(/valg av dose per trinn og individuell avslutning/)
    expect(() => medAvslutning(for_, { ...K1_ESCITALOPRAM, eksempler: {} })).toThrow(/mangler forventet plan med avslutning/)
    expect(() => medAvslutninger([for_], [{ ...K1_ESCITALOPRAM, regel: 'seponering-finnes-ikke' }])).toThrow(/ukjente regler: seponering-finnes-ikke/)
  })
})

describe('Versjon og fingeravtrykk', () => {
  it('escitalopram versjon 13 har fingeravtrykket i kontrollgrunnlaget', () => {
    const r = i(REGELSETT, ESC)
    expect([r.versjon, fingeravtrykk(r)]).toEqual([13, '871e2c72a2b4ca6a57a6025de1918ef3c9074306f20c09aa481db9361c1ce039'])
    expect(FORSLAG_K1.regler).toEqual([{ id: ESC, versjon: 13, fingeravtrykk: fingeravtrykk(r) }])
  })

  it('endrer ingen andre regler: samme versjon og fingeravtrykk, også nortriptylin, amitriptylin, sertralin og de godkjente', () => {
    for (const r of NEDTRAPPINGSSETT.regler.filter((x) => x.id !== ESC)) {
      const for_ = i(NEDTRAPPINGSSETT_FOR_K1, r.id)
      expect([r.versjon, fingeravtrykk(r)], r.id).toEqual([for_.versjon, fingeravtrykk(for_)])
    }
    for (const id of ['seponering-nortriptylin', 'seponering-amitriptylin', 'seponering-sertralin']) expect(i(NEDTRAPPINGSSETT, id).versjon, id).toBe(12)
    expect(fingeravtrykk(i(NEDTRAPPINGSSETT, 'seponering-vortioksetin'))).toBe('b28dec93f5ede06c6565e1ce5d6aa62606c69250f1a9088dae0c57d3121101f3')
    expect(fingeravtrykk(i(NEDTRAPPINGSSETT, 'seponering-bupropion'))).toBe('e7536668ac7f2d4dfd9959f24cfdfc4874182a4fc295355f0d10a05f438b5f5f')
    expect(fingeravtrykk(i(NEDTRAPPINGSSETT, 'seponering-agomelatin'))).toBe('6d42863f3573fb2e0d6dbffd27ff78a7f1c2b539c8dce2cfcd36ad417b61a2d1')
  })

  it('godkjenner ingen regel i appen: den simulerte godkjenningen finnes bare på kopier', () => {
    for (const id of [ESC, 'seponering-nortriptylin', 'seponering-amitriptylin', 'seponering-sertralin']) expect(erKliniskGodkjent(i(REGELSETT, id)), id).toBe(false)
  })
})

/** Dosene i planens første forløp, i rekkefølge, med 0 for seponert. */
const doser = (k: Kontrollkasus) => {
  const u = kjorKontrollkasus(k, uttrekkene)
  if (u.resultat?.status !== 'doseplan') return null
  const f = u.resultat.forlop[0]!
  return [...f.perioder.map((p) => p.mg), ...(f.siste_dosedag != null ? [0] : [])]
}

describe('Ende-til-ende med de norske preparatene i FEST', () => {
  it('kontrollgrunnlaget er oppdatert og er et av kontrollforslagene', () => {
    expect(KONTROLLFORSLAG).toContain(FORSLAG_K1)
    expect(les(FORSLAG_K1.fil), 'Kjør `npm run verktoy:regler -- kontrollgrunnlag`').toBe(lagKontrollgrunnlag(FORSLAG_K1, uttrekkene))
  })

  it.each(FORSLAG_K1.kasus.map((k) => [`${k.id}: ${k.hva}`, k] as const))('%s', (_, k) => {
    expect(kontrollavvik(k, uttrekkene)).toEqual([])
  })

  it('gir komplette planer fra 10 og 20 mg dråper: hele dråper, høyst 25 % over 3 mg, minste trinn bare fra 3 mg og seponering bare fra 1 mg', () => {
    expect(doser(kasus('K1-01'))).toEqual([8, 6, 5, 4, 3, 2, 1, 0])
    expect(doser(kasus('K1-02'))).toEqual([15, 12, 9, 7, 6, 5, 4, 3, 2, 1, 0])
    for (const [id, start] of [['K1-01', 10], ['K1-02', 20]] as const) {
      const d = doser(kasus(id))!
      expect(planutfallstekst(kjorKontrollkasus(kasus(id), uttrekkene)), id).toMatch(new RegExp(`^${KOMPLETT}: Escitalopram seponert fra dag \\d+\\.$`))
      expect(d.every((mg) => Number.isInteger(mg)), id).toBe(true)
      ;[start, ...d.slice(0, -1)].forEach((fra, n) => {
        const til = d[n]!
        if (til === 0) return void expect(fra, `${id}: seponering bare fra 1 mg`).toBe(1)
        expect(((fra - til) / fra) * 100, `${id}: ${fra} → ${til} mg`).toBeLessThanOrEqual(fra > 3 ? 25 + 1e-9 : 50 + 1e-9)
      })
    }
  })

  it('hver plan i omfanget er enten komplett til seponering fra 1 mg eller «komplett plan ikke tilgjengelig» uten doser', () => {
    const planer = omfangsplaner(FORSLAG_K1, uttrekkene).flatMap((o) => o.veier.map((v) => ({ o, v })))
    const komplette = planer.filter(({ v }) => v.utfall.utfall === 'plan')
    expect(komplette.map(({ o }) => [o.form, o.startdose_mg, o.tilfelle.svar])).toEqual([
      ['748', 10, {}],
      ['748', 20, {}],
    ])
    for (const { o, v } of komplette) expect(planutfallstekst(v.utfall), `${o.form} ${o.startdose_mg} mg`).toMatch(new RegExp(`^${KOMPLETT}: `))
    const stopp = planer.filter(({ v }) => v.utfall.utfall !== 'plan')
    expect(stopp).toHaveLength(3)
    for (const { o, v } of stopp) {
      const hva = `${o.form} ${o.startdose_mg} mg ${JSON.stringify(o.tilfelle.svar)}`
      const grunner = 'grunner' in v.utfall ? v.utfall.grunner : []
      expect(grunner, hva).toHaveLength(1)
      expect(grunner[0], hva).toMatch(new RegExp(`^${KOMPLETT_IKKE_TILGJENGELIG}: escitalopram: .+\\.$`))
      // Ingen kopierbar delplan: ingen rader med dager og doser.
      expect(grunner[0], hva).not.toMatch(/Dag \d|dråper à/)
    }
    // Ved hvert valg tilbys nøyaktig én dose, så planene er bestemt av startdosen.
    expect(planer.flatMap(({ v }) => v.valg).every((x) => x.trinn.doser.length === 1)).toBe(true)
  })

  it('gir en kopierbar sluttplan med dråper, seponering, oppfølging og regelversjon, og ingen kopierbar tekst når komplett plan ikke er tilgjengelig', () => {
    for (const [id, siste] of [['K1-01', 197], ['K1-02', 281]] as const) {
      const tekst = kjorKontrollkasus(kasus(id), uttrekkene).tekst!
      expect(tekst, id).toContain(`${KOMPLETT}: Escitalopram seponert fra dag ${siste}.`)
      expect(tekst, id).toMatch(/: 3 mg = 3 dråper à 1 mg\n[^]*: 2 mg = 2 dråper à 1 mg [^]*: 1 mg = 1 dråpe à 1 mg /)
      expect(tekst, id).toContain(`Fra dag ${siste}: Escitalopram peroralt: Seponert`)
      for (const dager of [7, 14, 28]) expect(tekst, id).toContain(`Dag ${siste + dager - 1}: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall ${dager} dager etter siste dose.`)
      expect(tekst, id).toContain('- Cipralex dråper, oppl 20 mg/ml (Hele dråper)')
      // Fingeravtrykket er den simulert avklarte kopiens, ikke 871e2c72… for regelen med åpne valg.
      expect(tekst, id).toMatch(new RegExp(`Regel ${ESC}, versjon 13, fingeravtrykk [0-9a-f]{12}\\n`))
      expect(tekst, id).not.toMatch(/^(Dag|Fra dag) .*tablett/im)
    }
    for (const id of ['K1-06', 'K1-07', 'K1-08', 'K1-14', 'K1-15', 'K1-17', 'K1-18']) {
      const u = kjorKontrollkasus(kasus(id), uttrekkene)
      expect([u.utfall, u.tekst], id).toEqual(['stopp', undefined])
    }
  })

  it('godtar ikke et større siste trinn: 3 → 1 mg (66,67 %) stopper', () => {
    const k1 = kasus('K1-01')
    const trinnvalg = [[1, 10, 8], [3, 6, 5], [4, 5, 4], [6, 3, 1]].map(([trinn, fra_mg, mg]) => ({ forlop: 'fra', trinn: trinn!, fra_mg: fra_mg!, mg: mg! }))
    const u = kjorKontrollkasus({ ...k1, velger: [], skjema: { ...k1.skjema, trinnvalg } }, uttrekkene)
    expect(u.utfall).toBe('stopp')
    expect('grunner' in u && u.grunner.join(' ')).toMatch(/66,67 % fra 3 mg, utenfor valgområdet/)
  })

  it('svarer på K0-01–K0-03: escitalopram komplett med dråper, amitriptylin og sertralin «komplett plan ikke tilgjengelig»', () => {
    const ider = FORSLAG_K1.kasus.map((k) => k.id)
    expect(new Set(ider).size).toBe(ider.length)
    const ref = (r: string) => FORSLAG_K1.kasus.filter((k) => k.ref === r)
    expect(ref('K0-01').map((k) => k.forventet.utfall)).toContain('plan')
    for (const r of ['K0-02', 'K0-03']) {
      const k = ref(r)
      expect(k.some((x) => x.forventet.utfall === 'stopp' && x.forventet.grunner[0]!.startsWith(KOMPLETT_IKKE_TILGJENGELIG)), r).toBe(true)
      expect(k.map((x) => x.forventet.utfall), r).not.toContain('plan')
      expect(k.map((x) => x.forventet.utfall), r).toContain('ingen')
    }
  })

  it('kontrollgrunnlaget viser ingen tekst fra Psychiatrienet, har ingen avvik, sier at ingen regel er godkjent og stiller sluttdosen som spørsmål uten forhåndsgodkjenning', () => {
    const tekst = les(FORSLAG_K1.fil)
    expect(tekst).toContain('**Ingen regel er godkjent eller aktivert.**')
    expect(tekst).not.toMatch(/psychiatrienet\.(nl|org|com)/i)
    expect(tekst).not.toContain('**avvik:**')
    // Peders avgjørelse står ordrett og gjelder bare K1.9; ingen påstand om at han har godkjent noe annet.
    expect(tekst).not.toMatch(/Peder har godkjent (?!åpning)|godkjent av Peder|forhåndsgodkjent av/)
    expect(tekst).toContain('Peder har ikke godkjent noe annet enn K1.9')
    expect(tekst).toContain('## 5. Peders avgjørelse på K1.9')
    expect(tekst).toContain('Valgt alternativ: «Ja, stopp fra 1 mg».')
    expect(tekst).toContain('Avgrensning, ordrett: «Gjelder voksne under 65 år med kort behandlingstid, uten tidligere seponeringsplager. Gir første komplette nedtrapping (fra 10 eller 20 mg), etter ChatGPTs kontroll av resten.»')
    expect(tekst).toContain('Beslutningsregel, ordrett: «1 mg er 5–10 % av startdosen. Hvert trinn styres av symptomer, og det følges opp etter 7, 14 og 28 dager. Ved plager vurderes resten individuelt.»')
    for (let n = 1; n <= 15; n++) expect(tekst).toContain(`| K1.${n} |`)
    expect(FORSLAG_K1.sporsmal.map((x) => x.nr)).toEqual(['K1.9', 'K1.10', 'K1.11', 'K1.12', 'K1.13', 'K1.14', 'K1.15'])
    expect(FORSLAG_K1.sporsmal[0]!.sporsmal).toMatch(/^Sluttdose for escitalopram: er 1 mg/)
  })
})
