/**
 * Regresjonstest for kontrollørens disposisjon av den første avgrensede
 * leveransen (P4.8 og P7.5, 31.10.2026): nøyaktig seks regelversjoner er
 * klinisk tilgjengelige – tre beregninger i P4, én beregning og to tekstregler
 * i P7 – og hver annen regel i leveransen er kontrollert og ikke godkjent.
 * Ingen av dem, og ingen regel i sammenligningssettet, gir noen gang en
 * klinisk plan, uansett legemiddelform, startdose eller en ny styrke i et
 * senere FEST-uttrekk. Vurderingen «kontrollert, ikke godkjent» gjelder bare
 * nøyaktig de 24 regelversjonene og fingeravtrykkene kontrolløren vurderte: en
 * regel som endres, får ny versjon eller er ny, får ikke kontrollørens steg og
 * står som ikke ferdig kontrollert. Alle data er syntetiske inndata mot de
 * lagrede FEST-uttrekkene.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { byggesteiner, type Preparatgrunnlag } from '../verktoy/motor/byggesteiner'
import { kliniskDoseplan, type Doseplaninndata, type Doseplanresultat } from '../verktoy/motor/plan'
import { festkoblinger, KARTLEGGING, VERKTOY, virkestoffvalg } from '../verktoy/register'
import { besvart, FEST_AKSEPTTEST, FEST_PILOT, omgivelseFor, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { type Disposisjon, disponer, disposisjonsfeil, erKliniskGodkjent, fingeravtrykk, harBeregning, kontrollutfall, vurderingsfeil } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett } from '../verktoy/regler/kontroll'
import type { Forlop, Regel, Regelsett } from '../verktoy/regler/modell'
import { NEDTRAPPINGSDISPOSISJON, NEDTRAPPINGSSETT, SAMMENLIGNINGSSETT } from '../verktoy/regler/nedtrapping'
import { PILOTDISPOSISJON, PILOTSETT } from '../verktoy/regler/pilotsett'
import { REGELRAPPORTER, statustekst } from '../verktoy/regler/rapport'
import { REGELSETT, tilgjengelighet } from '../verktoy/tilgjengelighet'
import { godkjennITest } from './hjelp/verktoyplan'

/** De seks regelversjonene kontrolløren har godkjent i oppgitt omfang, med fingeravtrykket godkjenningen gjelder. */
const GODKJENTE: Record<string, { sett: string; versjon: number; fingeravtrykk: string; beregning: boolean }> = {
  'kryssnedtrapping-sertralin-mirtazapin': { sett: PILOTSETT.id, versjon: 9, fingeravtrykk: 'dc878aa9065c8330f3850567b226ab8d392bcad4cb1dd5cf5cebacda54277881', beregning: true },
  'depot-aripiprazol-maintena': { sett: PILOTSETT.id, versjon: 3, fingeravtrykk: '04d1debe48f02ea03a31aab3d7cd5cdeb15c56d4b43797bda353f3d857297f20', beregning: true },
  'depot-paliperidon-xeplion': { sett: PILOTSETT.id, versjon: 3, fingeravtrykk: '21a335eec8c3816ee21627ceec3197e52957ccdf99cdbfaa00a3ca3cb5987bdf', beregning: true },
  'seponering-vortioksetin': { sett: NEDTRAPPINGSSETT.id, versjon: 11, fingeravtrykk: 'a6e488637de88c9bb109d42153a56a8e616935638c0536d1335076210dd1351e', beregning: true },
  'seponering-bupropion': { sett: NEDTRAPPINGSSETT.id, versjon: 5, fingeravtrykk: 'e7536668ac7f2d4dfd9959f24cfdfc4874182a4fc295355f0d10a05f438b5f5f', beregning: false },
  'seponering-agomelatin': { sett: NEDTRAPPINGSSETT.id, versjon: 1, fingeravtrykk: '6d42863f3573fb2e0d6dbffd27ff78a7f1c2b539c8dce2cfcd36ad417b61a2d1', beregning: false },
}

const SETTENE = [PILOTSETT, NEDTRAPPINGSSETT, SAMMENLIGNINGSSETT]
const ALLE = SETTENE.flatMap((s) => s.regler.map((r) => ({ sett: s, r })))
const ANDRE = ALLE.filter(({ r }) => !(r.id in GODKJENTE))
/** Reglene i leveransen som ikke er godkjent; sammenligningssettet er ikke i verktøyet og står som utkast. */
const IKKE_GODKJENTE = ANDRE.filter(({ sett }) => sett !== SAMMENLIGNINGSSETT)

const les = (fil: string) => JSON.parse(readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')) as Festuttrekk
const UTTREKK = [les(FEST_AKSEPTTEST), les(FEST_PILOT)]

/** Et senere uttrekk der hver styrke er endret med faktoren, så hvert preparat har en styrke som ikke er kontrollert. */
function endretFest(u: Festuttrekk, faktor: number): Festuttrekk {
  const x = structuredClone(u)
  for (const s of x.utvalg.styrker) if (s.styrke) s.styrke = { ...s.styrke, verdi: s.styrke.verdi * faktor }
  return x
}

/** Virkestoffene i et forløp; for en gruppe hvert medlem. */
const virkestoffer = (f: Forlop): string[] =>
  f.virkestoff.type === 'virkestoff' ? [f.virkestoff.nokkel] : (KARTLEGGING.grupper.find((g) => g.id === (f.virkestoff as { gruppe: string }).gruppe)?.medlemmer.map((m) => m.virkestoff) ?? [])

const grunnlagFor = (u: Festuttrekk, r: Regel): Preparatgrunnlag => ({
  utvalg: u.utvalg,
  koblinger: festkoblinger([...new Set(r.plan.forlop.flatMap(virkestoffer))]),
  overstyringer: KARTLEGGING.festoverstyringer,
})

/** Formvalgene å prøve: ingen, og hver legemiddelform i uttrekket for hvert forløp. */
function formvalgene(u: Festuttrekk, r: Regel): (Doseplaninndata['formvalg'] | undefined)[] {
  const g = grunnlagFor(u, r)
  const idag = omgivelseFor(u).idag
  return [
    undefined,
    ...r.plan.forlop.flatMap((f) => {
      const koder = new Set(virkestoffer(f).flatMap((n) => byggesteiner(g, n, idag).flatMap((b) => (b.legemiddelform ? [b.legemiddelform.kode] : []))))
      return [...koder].map((kode) => ({ [f.id]: { legemiddelformer: [kode] } }))
    }),
  ]
}

/** Startdosene å prøve: regneeksemplenes og hver styrke i uttrekket for legemidlet pasienten bruker, også det dobbelte. */
function startdoser(u: Festuttrekk, r: Regel): number[] {
  const g = grunnlagFor(u, r)
  const fra = r.plan.forlop.find((f) => f.utgangsdose === 'startdose') ?? r.plan.forlop[0]!
  const styrker = virkestoffer(fra).flatMap((n) => byggesteiner(g, n, omgivelseFor(u).idag).flatMap((b) => (b.mg === null ? [] : [b.mg, b.mg * 2])))
  return [...new Set([...r.eksempler.map((e) => e.inndata.startdose_mg), ...styrker])]
}

const ikkeKlinisk = (p: Doseplanresultat, hva: string) => {
  expect(p.klinisk, hva).toBe(false)
  expect(p.status, hva).toBe('stoppet')
  expect(p, hva).not.toHaveProperty('trinnvalg')
}

describe('Klinisk tilgjengelige regler i den første avgrensede leveransen (P4.8 og P7.5)', () => {
  it('er nøyaktig de seks regelversjonene kontrolløren har godkjent, med fingeravtrykkene godkjenningen gjelder', () => {
    const godkjente = ALLE.filter(({ r }) => erKliniskGodkjent(r))
    expect(Object.fromEntries(godkjente.map(({ sett, r }) => [r.id, { sett: sett.id, versjon: r.versjon, fingeravtrykk: fingeravtrykk(r), beregning: harBeregning(r) }]))).toEqual(GODKJENTE)
    // Tre beregninger i P4, én beregning og to tekstregler i P7, og ingen i sammenligningssettet.
    const telling = (sett: string, beregning: boolean) => godkjente.filter((x) => x.sett.id === sett && harBeregning(x.r) === beregning).length
    expect([telling(PILOTSETT.id, true), telling(PILOTSETT.id, false), telling(NEDTRAPPINGSSETT.id, true), telling(NEDTRAPPINGSSETT.id, false), godkjente.filter((x) => x.sett === SAMMENLIGNINGSSETT).length]).toEqual([3, 0, 1, 2, 0])
    for (const { r } of godkjente) expect(kontrollutfall(r), r.id).toBe('godkjent')
  })

  it('har hver annen regel kontrollert og ikke godkjent for nøyaktig sin versjon av en uavhengig kontrollør, ikke som et åpent spørsmål', () => {
    expect(IKKE_GODKJENTE).toHaveLength(24)
    for (const { r } of IKKE_GODKJENTE) {
      expect(r.godkjenning.status, r.id).toBe('ikke_godkjent')
      expect(kontrollutfall(r), r.id).toBe(harBeregning(r) ? 'ikke_godkjent' : 'bare_fagtekst')
      expect(r.godkjenning.historikk.at(-1), r.id).toMatchObject({ status: 'ikke_godkjent', rolle: 'uavhengig_kontrollor', regelversjon: r.versjon, dato: '2026-10-31' })
      expect(r.godkjenning.historikk.at(-1)!.merknad, r.id).toMatch(harBeregning(r) ? /ikke godkjent for klinisk doseberegning/ : /bare fagtekst, sperret for beregning/)
    }
    // Kontrollørens egne vurderinger av byttene står på regelen.
    const sist = (id: string) => ALLE.find(({ r }) => r.id === id)!.r.godkjenning.historikk.at(-1)!.merknad
    expect(sist('antipsykotikabytte-olanzapin-kvetiapin')).toMatch(/Ikke godkjent som klinisk bytteplan/)
    expect(sist('mao-fluoksetin-fenelzin')).toMatch(/Sperret som doseplan/)
    // Sammenligningssettet er utenfor verktøyet og er ikke sendt til kontroll.
    for (const r of SAMMENLIGNINGSSETT.regler) expect(r.godkjenning.status, r.id).toBe('utkast')
  })

  it('gir aldri en klinisk plan etter en annen regel, uansett legemiddelform, startdose eller ny styrke i FEST', { timeout: 120_000 }, () => {
    let beregnet = 0
    // Prøven er ikke tom: godkjent bare i testen gir de samme inndataene klinisk plan for disse reglene.
    const kunneGitt = new Set<string>()
    for (const { sett, r } of ANDRE.filter(({ r }) => harBeregning(r))) {
      const iTest = godkjennITest(r, r.id)
      for (const grunn of UTTREKK) {
        const g = grunnlagFor(grunn, r)
        // Bare uttrekkene som har preparater for regelens virkestoffer.
        if (!r.plan.forlop.every((f) => virkestoffer(f).some((n) => byggesteiner(g, n, omgivelseFor(grunn).idag).length > 0))) continue
        for (const [navn, u] of [['kontrollert', grunn], ['halve styrker', endretFest(grunn, 0.5)], ['doble styrker', endretFest(grunn, 2)]] as const) {
          const omgivelse = omgivelseFor(u)
          const inndata: Doseplaninndata[] = [
            ...r.eksempler.map((e) => e.inndata),
            ...startdoser(grunn, r).map((sd) => besvart(r, sd, r.eksempler[0] ? { ...r.eksempler[0].inndata, startdose_mg: sd } : {})),
          ]
          for (const x of inndata) {
            for (const formvalg of formvalgene(grunn, r)) {
              const p = kliniskDoseplan(r, { ...x, godkjenningsfritak: false, ...(formvalg && { formvalg }) }, grunnlagFor(u, r), omgivelse, sett)
              ikkeKlinisk(p, `${r.id}, ${navn}, ${x.startdose_mg} mg, ${JSON.stringify(formvalg)}`)
              beregnet++
              if (u === grunn && !kunneGitt.has(r.id) && kliniskDoseplan(iTest, { ...x, godkjenningsfritak: false, ...(formvalg && { formvalg }) }, grunnlagFor(u, r), omgivelse, sett).klinisk) kunneGitt.add(r.id)
            }
          }
        }
      }
    }
    expect(beregnet).toBeGreaterThan(1000)
    expect([...kunneGitt]).toEqual(
      expect.arrayContaining(['antipsykotikabytte-olanzapin-kvetiapin', 'mao-fluoksetin-fenelzin', 'seponering-escitalopram', 'seponering-fluoksetin', 'seponering-fluvoksamin', 'seponering-sertralin']),
    )
  })

  it('gir i verktøyene en beregning bare etter de godkjente reglene, for hvert virkestoff, hver formulering og hvert bytte', () => {
    const godkjente = new Set(Object.keys(GODKJENTE))
    const sett = new Set<string>()
    for (const v of VERKTOY) {
      const valgene = virkestoffvalg(v).flatMap((x) => x.formuleringer.map((formulering) => ({ nokkel: x.nokkel, formulering })))
      const kombinasjoner = v.type === 'seponering' ? valgene.map((fra) => ({ fra })) : valgene.flatMap((fra) => valgene.map((til) => ({ fra, til })))
      for (const valg of kombinasjoner) {
        const t = tilgjengelighet(v, valg, REGELSETT)
        if (t.status !== 'tilgjengelig' && t.status !== 'fagtekst') continue
        for (const r of t.regler) {
          expect(godkjente.has(r.id), `${v.id} ${JSON.stringify(valg)}: ${r.id}`).toBe(true)
          sett.add(r.id)
        }
      }
    }
    // Hver av de seks kan nås fra et verktøy.
    expect([...sett].sort()).toEqual([...godkjente].sort())
  })

  describe('Vurderingen «kontrollert, ikke godkjent» gjelder bare nøyaktig de vurderte regelversjonene', () => {
    const DISPOSISJONER: readonly [Regelsett, Disposisjon][] = [
      [PILOTSETT, PILOTDISPOSISJON],
      [NEDTRAPPINGSSETT, NEDTRAPPINGSDISPOSISJON],
    ]
    const disposisjonFor = (id: string) => DISPOSISJONER.find(([, d]) => id in d.regler)!
    /** Regelen slik den var før disposisjonen: uten kontrollørens siste steg. */
    const foer = (r: Regel): Regel => {
      const historikk = structuredClone(r.godkjenning.historikk.slice(0, -1))
      return { ...structuredClone(r), godkjenning: { status: historikk.at(-1)!.status, historikk } }
    }
    const endretInnhold = (r: Regel): Regel => {
      const x = structuredClone(r)
      x.fortolkning.forutsetninger.push('Syntetisk testendring av det faglige innholdet etter vurderingen.')
      return x
    }
    const VARIANTER = [
      ['endret innhold uten ny versjon', endretInnhold],
      ['ny versjon', (r: Regel): Regel => ({ ...structuredClone(r), versjon: r.versjon + 1 })],
      ['ny regel', (r: Regel): Regel => ({ ...structuredClone(r), id: `${r.id}-ny` })],
    ] as const
    const VERKTOYVALG = VERKTOY.flatMap((v) => {
      const valgene = virkestoffvalg(v).flatMap((x) => x.formuleringer.map((formulering) => ({ nokkel: x.nokkel, formulering })))
      return (v.type === 'seponering' ? valgene.map((fra) => ({ fra })) : valgene.flatMap((fra) => valgene.map((til) => ({ fra, til })))).map((valg) => ({ v, valg }))
    })

    it('er registrert for en fast liste med nøyaktig de 24 reglene, versjonene og fingeravtrykkene', () => {
      const vurderte = DISPOSISJONER.flatMap(([, d]) => Object.entries(d.regler).map(([id, v]) => [id, v.versjon, v.fingeravtrykk]))
      expect(vurderte.map(([id]) => id).sort()).toEqual(IKKE_GODKJENTE.map(({ r }) => r.id).sort())
      for (const { r } of IKKE_GODKJENTE) expect(vurderte.find(([id]) => id === r.id), r.id).toEqual([r.id, r.versjon, fingeravtrykk(r)])
      // Ingen av de seks godkjente og ingen regel i sammenligningssettet står i listen.
      for (const id of [...Object.keys(GODKJENTE), ...SAMMENLIGNINGSSETT.regler.map((r) => r.id)]) expect(disposisjonFor(id), id).toBeUndefined()
      // Listen er frosset og stemmer med regelsettet, slik kontrollen i CI krever.
      for (const [sett, d] of DISPOSISJONER) {
        expect(Object.isFrozen(d) && Object.isFrozen(d.regler) && Object.values(d.regler).every(Object.isFrozen), sett.id).toBe(true)
        expect(disposisjonsfeil(sett.regler, d), sett.id).toEqual([])
      }
      expect(REGELRAPPORTER.flatMap((x) => (x.disposisjoner ?? []).flatMap((d) => disposisjonsfeil(x.sett.regler, d)))).toEqual([])
      for (const { r } of IKKE_GODKJENTE) {
        expect(vurderingsfeil(r), r.id).toEqual([])
        expect(statustekst(r), r.id).toBe('kontrollert, ikke godkjent')
      }
    })

    it('gir en uendret regel nøyaktig kontrollørens steg, med fingeravtrykket som ble vurdert', () => {
      for (const { r } of IKKE_GODKJENTE) {
        const [, d] = disposisjonFor(r.id)
        const f = foer(r)
        expect(kontrollutfall(f), r.id).toBe('til_kontroll')
        expect(disponer([f], d)[0], r.id).toEqual(r)
      }
    })

    it('gir aldri en endret regel, en ny versjon eller en ny regel kontrollørens steg, og viser den ikke som vurdert', { timeout: 60_000 }, () => {
      const iVerktoyene = new Set<string>()
      for (const { sett, r } of IKKE_GODKJENTE) {
        const [, d] = disposisjonFor(r.id)
        for (const [hva, endre] of VARIANTER) {
          const x = endre(foer(r))
          const navn = `${r.id}, ${hva}`
          // Ingen automatisk steg: regelen kommer uendret tilbake og står som før vurderingen.
          const etter = disponer([x], d)[0]!
          expect(etter, navn).toBe(x)
          expect(etter.godkjenning.historikk.some((s) => s.status === 'ikke_godkjent' || (s.rolle === 'uavhengig_kontrollor' && s.dato === d.dato)), navn).toBe(false)
          expect(kontrollutfall(etter), navn).toBe('til_kontroll')
          expect(statustekst(etter), navn).not.toMatch(/kontrollert, ikke godkjent/)
          expect(erKliniskGodkjent(etter), navn).toBe(false)
          // En endret eller ny versjon av en vurdert regel stopper kontrollen i CI til listen er oppdatert.
          const regler = sett.regler.map((y) => (y.id === r.id && hva !== 'ny regel' ? etter : y))
          if (hva !== 'ny regel') expect(disposisjonsfeil(regler, d).join(), navn).toMatch(new RegExp(`^${r.id}: `))
          // I verktøyene vises den som ikke ferdig kontrollert, aldri som kontrollert og ikke godkjent, og den gir ingen beregning.
          const medEndring: Regelsett = { ...REGELSETT, regler: [...REGELSETT.regler.filter((y) => y.id !== r.id), etter] }
          for (const { v, valg } of VERKTOYVALG) {
            const t = tilgjengelighet(v, valg, medEndring)
            if (!t.regler.includes(etter)) continue
            iVerktoyene.add(r.id)
            expect(t.status, `${navn}, ${v.id} ${JSON.stringify(valg)}`).toBe('til_kontroll')
          }
          if (harBeregning(etter)) {
            for (const e of etter.eksempler) ikkeKlinisk(kliniskDoseplan(etter, { ...e.inndata, godkjenningsfritak: false }, grunnlagFor(UTTREKK[0]!, etter), omgivelseFor(UTTREKK[0]!), sett), navn)
          }
        }
      }
      // Prøven er ikke tom: hver av de 24 vises i et verktøy, unntatt den langsomme vortioksetinregelen, der verktøyet viser den godkjente hovedregelen.
      expect([...iVerktoyene].sort()).toEqual(IKKE_GODKJENTE.map(({ r }) => r.id).filter((id) => id !== 'seponering-vortioksetin-langsom').sort())
    })

    it('godtar ikke en vurdering som ikke lenger stemmer med regelen, eller som mangler fingeravtrykk', () => {
      for (const { sett, r } of IKKE_GODKJENTE) {
        const endret = endretInnhold(r)
        const utenAvtrykk = structuredClone(r)
        delete utenAvtrykk.godkjenning.historikk.at(-1)!.fingeravtrykk
        for (const [hva, x] of [['endret etter vurderingen', endret], ['uten fingeravtrykk', utenAvtrykk]] as const) {
          const navn = `${r.id}, ${hva}`
          expect(vurderingsfeil(x).join(), navn).toMatch(/fingeravtrykket stemmer ikke/)
          expect(kontrollutfall(x), navn).toBe('til_kontroll')
          expect(statustekst(x), navn).toMatch(/^merket kontrollert og ikke godkjent, men ugyldig/)
          expect(kontrollerRegelsett({ ...sett, regler: [x] }).join(), navn).toMatch(/vurderingen er ikke gyldig: Regelen er endret etter vurderingen/)
        }
      }
    })
  })
})
