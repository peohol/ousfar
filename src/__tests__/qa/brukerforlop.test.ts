/**
 * Uavhengig kvalitetskontroll av verktøyene (spor H i
 * `docs/verktøy-klinisk-leveranseplan-2026-11.md`). Testene er skrevet ved
 * siden av domenetrådenes egne tester og bygger på kontrollørens
 * godkjenningstekster og planens akseptkriterier, ikke på reglenes
 * selvbeskrivelse:
 *
 * 1. Ingen regelversjon endrer innhold uten ny versjon, og de klinisk
 *    godkjente versjonene står uendret.
 * 2. Hvert vanlig brukerforløp i katalogen gir et utfall uten QA-avvik, og
 *    rapporten viser det brukeren faktisk får.
 * 3. Hver beregning som er tilgjengelig i dag, gir plan bare innenfor det
 *    godkjente omfanget, og stopper når et unntak gjelder, et spørsmål
 *    besvares med ja eller en bekreftelse mangler.
 * 4. Hvert valg uten godkjent regel avstår eksplisitt, med en grunn.
 *
 * Rapporten skrives med `QA_SKRIV=1 npx vitest run src/__tests__/qa`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { omregningsrader } from '../../verktoy/doseplan'
import type { Doseplanresultat } from '../../verktoy/motor/plan'
import { FORMULERINGSKLASSER, type Formuleringsklasse } from '../../verktoy/festformuleringer'
import { lesKartdata } from '../../verktoy/kartdata'
import { markedsgrunnlag, preparaterFor } from '../../verktoy/kartlegging'
import { kombinasjoner } from '../../verktoy/regeldekning'
import { VERKTOY, virkestoffvalg } from '../../verktoy/register'
import { erKliniskGodkjent, fingeravtrykk, harBeregning } from '../../verktoy/regler/godkjenning'
import type { Regel } from '../../verktoy/regler/modell'
import { SAMMENLIGNINGSSETT } from '../../verktoy/regler/nedtrapping'
import { REGELSETTENE, tilForlop, tilgjengelighet } from '../../verktoy/tilgjengelighet'
import {
  BRUKERFORLOP,
  KLASSENAVN,
  kjorForlop,
  tidslinjeavvik,
  type Tidslinje,
  komplett,
  lagQaRapport,
  lesUttrekkene,
  omfangssveip,
  planfeil,
  planinndata,
  QA_RAPPORT,
  sveiplinjer,
  type Leveranse,
} from './brukerforlop'

const UTTREKK = lesUttrekkene()
const RESULTATER = BRUKERFORLOP.map((f) => kjorForlop(f, UTTREKK))
const SVEIP = omfangssveip(UTTREKK)

/**
 * Hver regelversjon i settene 03.11.2026 (main 7fdd675), med fingeravtrykket.
 * Samme id og versjon skal alltid ha samme innhold; en endret regel får ny
 * versjon. Nye regler legges til her; en regel som får en ny klinisk godkjent
 * versjon, får linjen flyttet til den versjonen (testen krever at versjonen
 * bare øker).
 */
const REGELVERSJONER: Record<string, [number, string]> = {
  // ousfar-verktoy-pilot v17
  'ousfar-verktoy-pilot/kryssnedtrapping-sertralin-mirtazapin': [10, '12801aa22a0ca2a576b9ba737d5d5cb52db3a73dc1b437bde7f20a896214c81a'],
  'ousfar-verktoy-pilot/mao-fluoksetin-fenelzin': [7, 'f5a08286869d143797cb3f032b0781c7c0e5785265d1a9198c7ebaa280402b6a'],
  'ousfar-verktoy-pilot/antipsykotikabytte-olanzapin-kvetiapin': [5, 'af1093a3a02176f584d783b567656bffe5fad00cfffefb75390122a11b951f12'],
  'ousfar-verktoy-pilot/depot-aripiprazol-maintena': [3, '04d1debe48f02ea03a31aab3d7cd5cdeb15c56d4b43797bda353f3d857297f20'],
  'ousfar-verktoy-pilot/depot-paliperidon-xeplion': [3, '21a335eec8c3816ee21627ceec3197e52957ccdf99cdbfaa00a3ca3cb5987bdf'],
  // ousfar-verktoy-nedtrapping v15
  'ousfar-verktoy-nedtrapping/seponering-amitriptylin': [12, 'a43c1164e4061a1757fefea381da027b8cefe92c077d742855fd4e2f5486b6e3'],
  'ousfar-verktoy-nedtrapping/seponering-amitriptylin-langsom': [8, '187bc1250baf2af7c3c969e73e0edee424d2fc1fd8a8874a08523d6730b679ce'],
  // v13 er klinisk godkjent (K1, #323); versjonen øker, aldri motsatt.
  'ousfar-verktoy-nedtrapping/seponering-escitalopram': [13, 'e8a3c17edda10da43b1df4171a733a23133da50ebcda31cd71a771022a8a78d7'],
  'ousfar-verktoy-nedtrapping/seponering-escitalopram-langsom': [8, '4e49c175ac6aa49cba89d7db711f710c14b654681cc3138994dbaaaebb69c095'],
  'ousfar-verktoy-nedtrapping/seponering-fluoksetin': [12, 'df89f2dadfc482e86a6dd8852966922d9834ec6ae728de8ffe2fd5e46cc2951a'],
  'ousfar-verktoy-nedtrapping/seponering-fluoksetin-langsom': [8, 'e9946f1fcd42cb834677d9ef6751307fbbe0a9ec41b28d4d28687ac2efe29ddd'],
  'ousfar-verktoy-nedtrapping/seponering-fluvoksamin': [13, '778344f0ab04ad27d68cc588b868935a00456ae76674d48cbf51e384b5f4d5d0'],
  'ousfar-verktoy-nedtrapping/seponering-fluvoksamin-langsom': [9, '95c2b4eeafb750464f998d390300634837372999a56c077f6bee053279bfa312'],
  'ousfar-verktoy-nedtrapping/seponering-klomipramin': [12, '786fef7ded5f248dce7de7479a76aa5713939ed5e939605a5c9da98a3e71a3b3'],
  'ousfar-verktoy-nedtrapping/seponering-klomipramin-langsom': [8, '11252e56fd5f8aa65f6d180621b259c7adee652cb0077c88a6cf634be6208a40'],
  'ousfar-verktoy-nedtrapping/seponering-nortriptylin': [12, '300a71b147bf87eb61dbeaeccd27aa07add900435b579c14291061f38f63616c'],
  'ousfar-verktoy-nedtrapping/seponering-nortriptylin-langsom': [8, '6637a47e0a0b34b1a271dff2546845840df7c54ccdc428f342ee47fca9b93f69'],
  'ousfar-verktoy-nedtrapping/seponering-sertralin': [12, '5be29652a2afc47a60cbd394a45bf5cdbad92dfe259e1fa263751e5476a8198e'],
  'ousfar-verktoy-nedtrapping/seponering-sertralin-langsom': [8, 'cf874ff4a4e5dbe69da6da154240c70a9f1e0d56d5d80225bafe5901c0a0f642'],
  'ousfar-verktoy-nedtrapping/seponering-vortioksetin': [12, 'b28dec93f5ede06c6565e1ce5d6aa62606c69250f1a9088dae0c57d3121101f3'],
  'ousfar-verktoy-nedtrapping/seponering-vortioksetin-langsom': [8, 'c191fcbc36fa91acdb6b46c3e9451c3b0d8272f0f2f79ffee1e351392c573d73'],
  'ousfar-verktoy-nedtrapping/seponering-fluoksetin-annenhver-dag': [5, '1d807d01fee557b739ce4a4a9f9badaba60aa1ed982c10715fd8b67fe1a70e9f'],
  'ousfar-verktoy-nedtrapping/seponering-bupropion': [5, 'e7536668ac7f2d4dfd9959f24cfdfc4874182a4fc295355f0d10a05f438b5f5f'],
  'ousfar-verktoy-nedtrapping/seponering-agomelatin': [1, '6d42863f3573fb2e0d6dbffd27ff78a7f1c2b539c8dce2cfcd36ad417b61a2d1'],
  'ousfar-verktoy-nedtrapping/seponering-duloksetin': [6, '2c01051c6eebd4a3ff287c2b15c9c89b2870e2b15fd5db0184c6874c21c04edb'],
  'ousfar-verktoy-nedtrapping/seponering-venlafaksin': [6, 'b26a1f0cb66af26725bbf55b7f9cfc04c02004ef38611026b8af3baccc313776'],
  'ousfar-verktoy-nedtrapping/seponering-citalopram': [9, '88744299aa74fa280c6138fbaaec5d972ef02d7cc49ba3c0fbbaa8422f53d541'],
  'ousfar-verktoy-nedtrapping/seponering-mirtazapin': [8, 'c473d6f10c63c423f54886f72456fa87500ec35233651f26de9638333c9efb9f'],
  'ousfar-verktoy-nedtrapping/seponering-moklobemid': [9, '15b8fba1db32d3e677c966e69c8f10aad673201089e30f0462034c3f1692dbc4'],
  'ousfar-verktoy-nedtrapping/seponering-paroksetin': [8, 'afacbd5ff69e87bb36260cb9def2b4d61c573ef5dc38513375778ea679cc4cda'],
  // ousfar-verktoy-nedtrapping-sammenligning v5
  'ousfar-verktoy-nedtrapping-sammenligning/seponering-citalopram-hyperbolsk': [4, '386fedfa94406ae98941d9cd82e81bfd420877d5693a20a0617af303ca8471f7'],
  'ousfar-verktoy-nedtrapping-sammenligning/gruppe-rest-ap-aripiprazol': [5, '256d49b824af879d9b813b8a65c30e0b7f4e318615b7b60d5df17b3802a26e1c'],
  // ousfar-verktoy-antipsykotikabytter (K3, #320): bare de tre klinisk godkjente
  'ousfar-verktoy-antipsykotikabytter/depot-risperidon-xeplion': [8, '1672334c468f28cf181aa4d786370e60f3f232f76f63d374e0c505d847ab184e'],
  'ousfar-verktoy-antipsykotikabytter/antipsykotikabytte-olanzapin-aripiprazol': [8, 'f141a13a9e9368542d7719cfb0abea7cfb77a41d7d89248e5f9e1d70e0aa5f5e'],
  'ousfar-verktoy-antipsykotikabytter/antipsykotikabytte-risperidon-aripiprazol': [8, '866ac93c58fb921c78cd71518ec91637cb31a175b7a9a480552fcebe54cca870'],
  // ousfar-verktoy-tillegg (K4, #322)
  'ousfar-verktoy-tillegg/tillegg-valproat-lamotrigin': [2, '0a9213f31b5f428935fceeef41498a2999682631b1692749bb7ebe19c82639b8'],
  'ousfar-verktoy-tillegg/tillegg-litium-lamotrigin': [2, '786436a0ea8d115b7927a9a20ffabc736b59bc06c59117769551e5f75e89e44b'],
}

/** Versjonene kontrolløren har godkjent (docs/verktøy-utviklingsplan.md, verktøy-rettelse-langvarig.md; K3: docs/verktøy-k3-antipsykotikabytter.md; K4: src/verktoy/regler/tillegg.ts). */
const GODKJENT = [
  'ousfar-verktoy-pilot/kryssnedtrapping-sertralin-mirtazapin',
  'ousfar-verktoy-pilot/depot-aripiprazol-maintena',
  'ousfar-verktoy-pilot/depot-paliperidon-xeplion',
  'ousfar-verktoy-nedtrapping/seponering-vortioksetin',
  'ousfar-verktoy-nedtrapping/seponering-bupropion',
  'ousfar-verktoy-nedtrapping/seponering-agomelatin',
  'ousfar-verktoy-nedtrapping/seponering-escitalopram',
  'ousfar-verktoy-antipsykotikabytter/depot-risperidon-xeplion',
  'ousfar-verktoy-antipsykotikabytter/antipsykotikabytte-olanzapin-aripiprazol',
  'ousfar-verktoy-antipsykotikabytter/antipsykotikabytte-risperidon-aripiprazol',
  'ousfar-verktoy-tillegg/tillegg-valproat-lamotrigin',
  'ousfar-verktoy-tillegg/tillegg-litium-lamotrigin',
]

const SETTENE = [...REGELSETTENE, SAMMENLIGNINGSSETT]
const ALLE = SETTENE.flatMap((s) => s.regler.map((r) => ({ nokkel: `${s.id}/${r.id}`, r })))

describe('QA: regelversjonene (regresjon)', () => {
  it('har samme innhold for samme id og versjon, og ingen regel er borte', () => {
    for (const [nokkel, [versjon, fa]] of Object.entries(REGELVERSJONER)) {
      const x = ALLE.find((y) => y.nokkel === nokkel)
      expect(x, `${nokkel} er borte fra settene`).toBeDefined()
      expect(x!.r.versjon, nokkel).toBeGreaterThanOrEqual(versjon)
      if (x!.r.versjon === versjon) expect(fingeravtrykk(x!.r), `${nokkel} v${versjon} har endret innhold uten ny versjon`).toBe(fa)
    }
  })

  it('har hver klinisk godkjente regel i nøyaktig gjeldende versjon og innhold', () => {
    for (const { nokkel, r } of ALLE.filter((x) => erKliniskGodkjent(x.r)))
      expect(REGELVERSJONER[nokkel], `${nokkel} v${r.versjon} er godkjent, men står ikke slik i REGELVERSJONER`).toEqual([r.versjon, fingeravtrykk(r)])
  })

  it('har de godkjente versjonene uendret og fortsatt klinisk godkjent', () => {
    for (const nokkel of GODKJENT) {
      const x = ALLE.find((y) => y.nokkel === nokkel)!
      const [versjon, fa] = REGELVERSJONER[nokkel]!
      expect([x.r.versjon, fingeravtrykk(x.r), erKliniskGodkjent(x.r)], nokkel).toEqual([versjon, fa, true])
    }
  })
})

describe('QA: vanlige brukerforløp', () => {
  it('har unike id-er og virkestoffer som finnes i verktøyet', () => {
    expect(new Set(BRUKERFORLOP.map((f) => f.id)).size).toBe(BRUKERFORLOP.length)
    for (const r of RESULTATER) {
      if (!r.verktoy) continue
      const nokler = virkestoffvalg(r.verktoy).map((v) => v.nokkel)
      for (const n of [r.forlop.valg.fra.nokkel, r.forlop.valg.til?.nokkel].filter(Boolean)) expect(nokler, `${r.forlop.id}: ${n}`).toContain(n)
    }
  })

  it('gir hvert forløp et utfall uten QA-avvik: ingen delplan vises som klinisk doseplan, og ingen plan uten godkjenning', () => {
    for (const r of RESULTATER) expect(r.feil, r.forlop.id).toEqual([])
  })

  it('stopper aldri uten å si hvorfor', () => {
    for (const r of RESULTATER.filter((x) => ['stoppet', 'ikke_godkjent', 'til_kontroll', 'ikke_stottet', 'skjema'].includes(x.klasse))) expect(r.vist.join('').trim(), r.forlop.id).not.toBe('')
  })
})

describe('QA-kontrollen selv', () => {
  const plan = (id: string) => RESULTATER.find((r) => r.forlop.id === id)!
  it('oppdager en delplan som ikke sier fra, en komplett plan som kaller seg delplan, og en dose enhetene ikke gir', () => {
    // Ingen delplan vises lenger, så kontrollen prøves på en komplett plan som behandles som delplan.
    const komplettPlan = plan('K0-09')
    expect(komplettPlan.klasse).toBe('komplett')
    expect(planfeil(komplettPlan.regel, { ...komplettPlan.utfall!, undertittel: null } as never, 'delplan').join()).toMatch(/sier ikke at den er en delplan/)
    expect(planfeil(komplettPlan.regel, { ...komplettPlan.utfall!, undertittel: 'Delplan: bare starten' } as never, 'komplett').join()).toMatch(/kaller seg delplan/)
    const endret = structuredClone(komplettPlan.utfall!)
    if (endret.resultat?.status !== 'doseplan') throw new Error('ikke plan')
    endret.resultat.forlop.find((f) => f.perioder.length > 0)!.perioder[0]!.mg += 5
    expect(planfeil(komplettPlan.regel, endret, 'komplett').join()).toMatch(/enhetene gir/)
  })

  it('regner ikke et bytte som komplett når det nye legemidlet ikke ender på den kliniske måldosen', () => {
    const x = plan('H-24')
    const res = x.utfall!.resultat!
    if (res.status !== 'doseplan') throw new Error('ikke plan')
    const inn = { startdose_mg: 6 }
    expect(komplett(x.regel!, res, inn)).toBe(true)
    // Vedlikeholdet blir stående på introduksjonsdosen (150 mg) i stedet for måldosen.
    const intro = structuredClone(res)
    for (const f of intro.forlop) for (const i of f.injeksjoner) if (i.vedlikehold) i.mg = 150
    expect(komplett(x.regel!, intro, inn)).toBe(false)
    // En annen startdose i regelens tabell gir en annen måldose enn planen ender på.
    expect(komplett(x.regel!, res, { startdose_mg: 12 })).toBe(false)
    // Et nytt legemiddel som ender i en opptrapping, har ikke noe sluttmål.
    const regel = structuredClone(x.regel!)
    tilForlop(regel)!.faser.push({ type: 'opptrapping', trinn: [] })
    expect(komplett(regel, res, inn)).toBe(false)
  })
})

describe('QA: tidslinjen i appen mot kopien', () => {
  // Syntetisk, i samme form som appen viser og kopierer et tillegg og en depotoppstart.
  const kopi = [
    'Kombinere stemningsstabiliserende',
    '',
    'Dag 1–14: Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose; Lamotrigin peroralt: 2,5 mg = 1 tablett à 2,5 mg',
    'Dag 15: Vurdering (Lamotrigin): Før endringen: Spør etter utslett.',
    'Dag 15–28: Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose; Lamotrigin peroralt: 5 mg = 1 tablett à 5 mg',
    'Dag 1: Lamotrigin depotinjeksjon 400 mg = 1 injeksjon à 400 mg (tidligst 26 dager etter forrige)',
  ].join('\n')
  const litium = '168 mg Li⁺ (24 mmol)\n4 tabletter Lithionit 42 mg depottablett; uendret dose'
  const tabell: Tidslinje = {
    koloner: ['Når', 'Litium peroralt', 'Lamotrigin peroralt', 'Lamotrigin depotinjeksjon'],
    rader: [
      ['Dag 1–14', litium, '2,5 mg\n1 tablett à 2,5 mg', '–'],
      ['Dag 15', '', 'Vurdering Før endringen: Spør etter utslett.', ''],
      ['Dag 15–28', litium, '5 mg\n1 tablett à 5 mg', '–'],
      ['Dag 1', '', '', 'Injeksjon 400 mg\n1 injeksjon à 400 mg\ntidligst 26 dager etter forrige'],
    ],
  }
  const endret = (naar: string, kolonne: number, celle: string): Tidslinje => ({ ...tabell, rader: tabell.rader.map((r) => (r[0] === naar ? r.map((c, i) => (i === kolonne ? celle : c)) : r)) })

  it('godtar en tabell som står slik i kopien, også med to legemidler, vurderinger og injeksjoner', () => {
    expect(tidslinjeavvik(tabell, kopi)).toEqual([])
  })

  it('finner et flyttet desimaltegn (2,5 mot 25 mg) både i tabellen og i kopien', () => {
    expect(tidslinjeavvik(endret('Dag 1–14', 2, '25 mg\n1 tablett à 25 mg'), kopi).join()).toMatch(/cellen «25 mg/)
    expect(tidslinjeavvik(tabell, kopi.replace('2,5 mg = 1 tablett à 2,5 mg', '25 mg = 1 tablett à 25 mg')).join()).toMatch(/cellen «2,5 mg/)
  })

  it('finner doser under feil legemiddel samme dag', () => {
    const byttet: Tidslinje = { ...tabell, rader: tabell.rader.map((r) => (r[0] === 'Dag 1–14' ? [r[0]!, r[2]!, r[1]!, r[3]!] : r)) }
    expect(tidslinjeavvik(byttet, kopi).join()).toMatch(/\(Dag 1–14, Litium peroralt\) står ikke slik i kopien/)
  })

  it('finner en annen dose, en rad som mangler i kopien og en kopilinje uten rad i tabellen', () => {
    expect(tidslinjeavvik(endret('Dag 15–28', 2, '6 mg\n1 tablett à 6 mg'), kopi).join()).toMatch(/cellen «6 mg/)
    expect(tidslinjeavvik({ ...tabell, rader: [...tabell.rader, ['Dag 57', '', '4 mg', '']] }, kopi).join()).toMatch(/cellen «4 mg» \(Dag 57/)
    expect(tidslinjeavvik({ ...tabell, rader: tabell.rader.slice(1) }, kopi).join()).toMatch(/kopiens «Dag 1–14: 168 mg/)
  })
})

describe('QA: K0-01 escitalopram (tablett og dråper)', () => {
  const r = (id: string) => RESULTATER.find((x) => x.forlop.id === id)!
  it('regner ikke tablettvarianten som levert, men gir komplett plan til 0 med dråper fra 10 og 20 mg ved kort behandlingstid', () => {
    const regel = r('H-30').regel
    if (!regel || !erKliniskGodkjent(regel) || regel.versjon < 13) return
    // Fra tablettvalget gir appens automatiske flyt ingen plan; forskriveren må selv bytte til dråper (H-39).
    expect([r('K0-01').klasse, r('K0-01').utfall?.resultat?.status]).not.toContain('komplett')
    expect(r('K0-01').klasse).toBe('stoppet')
    expect(['H-30', 'H-31', 'H-39'].map((id) => [id, r(id).klasse, r(id).feil])).toEqual([
      ['H-30', 'komplett', []],
      ['H-31', 'komplett', []],
      ['H-39', 'komplett', []],
    ])
    // Byttet fra tablett til dråper: først ingen plan, deretter den samme planen som med dråper fra starten.
    expect(r('H-39').forBytte).toBe('stoppet')
    expect(r('H-39').utfall?.tekst).toBe(r('H-30').utfall?.tekst)
    // Lang behandlingstid er utenfor det avgrensede omfanget.
    expect([r('H-32').klasse, r('H-32').vist.join(' ')]).toEqual(['stoppet', expect.stringMatching(/Komplett plan ikke tilgjengelig/)])
  })
})

describe('QA: måldosen må velges', () => {
  it('gir ingen plan for lamotrigin lagt til valproat før måldosen er valgt, og en komplett plan når den er valgt', () => {
    const [uten, med] = ['H-38', 'K0-12'].map((id) => RESULTATER.find((r) => r.forlop.id === id)!)
    if (med!.klasse === 'ikke_stottet') return
    expect([uten!.klasse, uten!.vist.join(' ')]).toEqual(['skjema', expect.stringMatching(/Måldosen/)])
    expect(med!.klasse).toBe('komplett')
  })
})

describe('QA: det eksisterende legemidlet i et tillegg holdes på den faktiske dosen', () => {
  // Kopier av reelle positive K4-resultater, endret ett sted om gangen.
  for (const id of ['K0-11', 'K0-12']) {
    it(`${id}: komplett bare når det eksisterende legemidlet står på forskriverens aktuelle dose hele forløpet`, () => {
      const x = RESULTATER.find((r) => r.forlop.id === id)!
      if (x.klasse !== 'komplett') return
      const regel = x.regel!
      const res = x.utfall!.resultat! as Extract<Doseplanresultat, { status: 'doseplan' }>
      expect(res.status).toBe('doseplan')
      const inn = planinndata(x.forlop.dose, x.skjema?.maldose)
      const fraId = res.forlop.find((f) => f.uendret_mg !== undefined)!.id
      const endret = (endre: (f: (typeof res.forlop)[number]) => void) => {
        const kopi = structuredClone(res)
        endre(kopi.forlop.find((f) => f.id === fraId)!)
        return komplett(regel, kopi, inn)
      }
      const dose = inn.startdose_mg
      expect(komplett(regel, res, inn)).toBe(true)
      expect(komplett(regel, res, { ...inn, startdose_mg: dose * 2 }), 'annen startdose enn planen holder').toBe(false)
      expect(
        endret((f) => (f.uendret_mg = dose / 2)),
        'uendret_mg endret',
      ).toBe(false)
      expect(
        endret((f) => delete f.uendret_mg),
        'planen sier ingenting om det eksisterende legemidlet',
      ).toBe(false)
      const perioder = (mg: number[]) => mg.map((m, i) => ({ ...res.forlop.find((f) => f.id !== fraId)!.perioder[0]!, fra: 1 + 14 * i, til: i === mg.length - 1 ? null : 14 * (i + 1), mg: m }))
      expect(
        endret((f) => (f.perioder = perioder([dose, dose, dose]))),
        'perioder med uendret dose hele veien',
      ).toBe(true)
      expect(
        endret((f) => {
          delete f.uendret_mg
          f.perioder = perioder([dose, dose])
        }),
        'bare perioder, fra dag 1',
      ).toBe(true)
      expect(
        endret((f) => {
          delete f.uendret_mg
          f.perioder = perioder([dose, dose]).map((p) => ({ ...p, fra: p.fra + 14, til: p.til === null ? null : p.til + 14 }))
        }),
        'bare perioder, først fra dag 15',
      ).toBe(false)
      expect(
        endret((f) => (f.perioder = perioder([dose, dose]).map((p) => ({ ...p, fra: p.fra + 14, til: p.til === null ? null : p.til + 14 })))),
        'uendret dose fra start, med overflødige perioder fra dag 15',
      ).toBe(true)
      expect(
        endret((f) => (f.start = 15)),
        'uendret dose, men forløpet starter dag 15',
      ).toBe(false)
      expect(
        endret((f) => (f.perioder = perioder([dose, dose / 2, dose]))),
        'dosen endret i ett trinn',
      ).toBe(false)
      expect(
        endret((f) => (f.perioder = perioder([dose, dose, dose * 2]))),
        'dosen endret ved slutten',
      ).toBe(false)
      expect(
        endret((f) => (f.perioder = perioder([dose, dose]).map((p, i) => (i === 1 ? { ...p, til: 40 } : p)))),
        'det eksisterende legemidlet slutter',
      ).toBe(false)
      expect(
        endret((f) => (f.siste_dosedag = 40)),
        'det eksisterende legemidlet seponeres',
      ).toBe(false)
    })
  }
})

describe('QA: K3 telles for seg (peroral → peroral og depot)', () => {
  const ut = (id: string) => RESULTATER.find((r) => r.forlop.id === id)!
  const godkjent = (id: string) => ALLE.some((x) => x.nokkel.endsWith(`/${id}`) && erKliniskGodkjent(x.r))
  const regelen = (id: string) => ALLE.find((x) => x.nokkel.endsWith(`/${id}`) && erKliniskGodkjent(x.r))!.r

  it('finner godkjenningsfritaket fra FEST: peroral paliperidon bare med fritak, peroral risperidon og aripiprazol markedsført', () => {
    if (!godkjent('depot-paliperidon-xeplion') || !godkjent('depot-risperidon-xeplion')) return
    expect(['depot-paliperidon-xeplion', 'depot-risperidon-xeplion', 'depot-aripiprazol-maintena'].map((id) => startKreverFritak(regelen(id)))).toEqual([true, false, false])
  })

  it('gir komplett plan bare ved regelens start- og måldoser', () => {
    if (!godkjent('antipsykotikabytte-olanzapin-aripiprazol') || !godkjent('antipsykotikabytte-risperidon-aripiprazol') || !godkjent('depot-risperidon-xeplion')) return
    for (const id of ['K0-08', 'H-40', 'H-41', 'H-42']) expect([id, ut(id).klasse, ut(id).feil]).toEqual([id, 'komplett', []])
    // Startdose utenfor (olanzapin 10, risperidon 4 og 2 til Xeplion) og måldose utenfor (aripiprazol 20).
    for (const [id, grunn] of [
      ['K0-07', /Startdosen 10 mg/],
      ['K0-10', /Startdosen 4 mg/],
      ['H-44', /Startdosen 2 mg/],
      ['H-43', /Måldosen 20 mg/],
    ] as const)
      expect([id, ut(id).klasse, ut(id).vist.join(' ')]).toEqual([id, 'stoppet', expect.stringMatching(grunn)])
  })
})

describe('QA: omfanget til beregningene som er tilgjengelige', () => {
  const sveipFor = (id: string) => SVEIP.find((s) => s.regel.id === id)
  const plan = (id: string) => RESULTATER.find((r) => r.forlop.id === id)!

  it('gir planer uten QA-avvik ved hver dose og legemiddelform, og ingen delplan som klinisk doseplan', () => {
    for (const s of SVEIP) for (const t of s.treff) expect(t.resultat.feil, `${s.regel.id} ${t.dose} mg`).toEqual([])
  })

  /** En godkjent regel som bare gir en delplan, viser ingen plan ved noen dose, og sier hvorfor ved de vanlige dosene. */
  const ingenDelplan = (id: string, versjon: number, forlop: string[]) => {
    const s = sveipFor(id)
    if (s?.regel.versjon !== versjon) return
    expect(s.treff.map((t) => `${t.dose} mg: ${KLASSENAVN[t.resultat.klasse]}`)).toEqual([])
    for (const f of forlop) {
      const r = plan(f)
      expect([r.klasse, r.vist.join(' ')], f).toEqual(['stoppet', expect.stringMatching(/Komplett plan ikke tilgjengelig/)])
    }
  }

  it('viser ikke vortioksetin v12 (bare én første reduksjon 20 → 15 mg) som klinisk doseplan', () => ingenDelplan('seponering-vortioksetin', 12, ['H-01']))

  it('viser ikke sertralin → mirtazapin v10 (startforløp uten 25 → 0) som klinisk doseplan', () => ingenDelplan('kryssnedtrapping-sertralin-mirtazapin', 10, ['K0-04', 'H-14']))

  it('gir Maintena som komplett oppstart: 400 mg dag 1 og månedlig, peroral aripiprazol i 14 dager', () => {
    const s = sveipFor('depot-aripiprazol-maintena')
    if (s?.regel.versjon !== 3) return
    expect(s.treff.length).toBeGreaterThan(0)
    for (const t of s.treff) {
      const r = t.resultat.utfall!.resultat!
      if (r.status !== 'doseplan') throw new Error('ikke plan')
      expect(t.resultat.klasse).toBe('komplett')
      const peroral = r.forlop.find((f) => f.administrasjon !== 'depotinjeksjon' && f.injeksjoner.length === 0)!
      expect([peroral.siste_dosedag, peroral.perioder.map((p) => p.mg)]).toEqual([14, [t.dose]])
      const inj = r.forlop.flatMap((f) => f.injeksjoner)
      expect(inj.map((i) => [i.dag, i.mg, i.vedlikehold?.maaneder ?? null])).toEqual([
        [1, 400, null],
        [null, 400, 1],
      ])
    }
  })

  it('gir Xeplion som komplett overgang: peroral seponert, 150 mg dag 1 og 100 mg dag 8, så månedlig, bare fra dosene i regelens tabell', () => {
    const s = sveipFor('depot-paliperidon-xeplion')
    if (s?.regel.versjon !== 3) return
    const tabell = new Set(omregningsrader(s.regel).map((x) => x.fra_mg))
    expect(s.treff.length).toBeGreaterThan(0)
    for (const t of s.treff) {
      const r = t.resultat.utfall!.resultat!
      if (r.status !== 'doseplan') throw new Error('ikke plan')
      expect(t.resultat.klasse).toBe('komplett')
      expect(tabell.has(t.dose), `${t.dose} mg`).toBe(true)
      const inj = r.forlop.flatMap((f) => f.injeksjoner)
      expect(inj.slice(0, 2).map((i) => [i.dag, i.mg])).toEqual([
        [1, 150],
        [8, 100],
      ])
      expect(inj[2]!.vedlikehold).toMatchObject({ maaneder: 1, etter_dag: 8 })
      expect(r.forlop.find((f) => f.injeksjoner.length === 0)!.siste_dosedag).toBe(0)
    }
  })

  it('stopper hver godkjent beregning når et unntak gjelder, et spørsmål besvares ja eller en bekreftelse mangler, også en som bare gjelder ved et bestemt svar', () => {
    // Gjelder de godkjente reglene som gir en komplett plan; de andre viser ingen plan i det hele tatt (testene over).
    for (const s of SVEIP.filter((x) => x.treff.length > 0 && GODKJENT.some((g) => g.endsWith(`/${x.regel.id}`)))) {
      expect(s.endringer.length, s.regel.id).toBeGreaterThan(0)
      // Et ja som bare utløser bekreftelser (`ved`) og ikke krever begrunnelse, gir planen når alt er bekreftet; at hver av bekreftelsene stopper, prøves for seg.
      const betinget = new Set((s.regel.sporsmal ?? []).filter((q) => !q.krever_begrunnelse && s.regel.bekreftelser.some((b) => b.ved?.sporsmal === q.id)).map((q) => `spørsmål ${q.id} = ja`))
      for (const e of s.endringer) {
        // Kontrollprøven for en betinget bekreftelse skal gi planen; alle andre endringer skal stoppe den.
        if (e.hva.endsWith('med begrunnelse og alle bekreftelser') || betinget.has(e.hva)) expect(e.klasse, `${s.regel.id}: ${e.hva}`).toBe('komplett')
        else expect(['komplett', 'delplan'], `${s.regel.id}: ${e.hva}`).not.toContain(e.klasse)
      }
    }
  })
})

describe('QA: valg uten godkjent regel', () => {
  it('avstår eksplisitt med grunn for hvert valg i hvert verktøy, og tilbyr bare godkjente regler', () => {
    for (const v of VERKTOY) {
      for (const valg of kombinasjoner(v)) {
        const t = tilgjengelighet(v, valg)
        const hva = `${v.id} ${JSON.stringify(valg)}`
        if (t.status === 'tilgjengelig') for (const r of t.regler) expect([erKliniskGodkjent(r), harBeregning(r)], hva).toEqual([true, true])
        else if (t.status === 'fagtekst') for (const r of t.regler) expect([erKliniskGodkjent(r), harBeregning(r)], hva).toEqual([true, false])
        else expect(t.grunner.join('').trim(), hva).not.toBe('')
      }
    }
  })
})

/** Dekningsnevnerne (plan §8): hvert valg i verktøyet, etter status. */
function nevnere(): string[] {
  return [
    '## Dekningsnevnere (alle valg i verktøyene)',
    '',
    '| Verktøy | Valg | Beregning | Fagtekst | Ikke godkjent | Til kontroll | Ikke støttet |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...VERKTOY.map((v) => {
      const st = kombinasjoner(v).map((valg) => tilgjengelighet(v, valg).status)
      const n = (s: string) => st.filter((x) => x === s).length
      return `| ${v.navn} | ${st.length} | ${n('tilgjengelig')} | ${n('fagtekst')} | ${n('ikke_godkjent')} | ${n('til_kontroll')} | ${n('ikke_stottet')} |`
    }),
    '',
  ]
}

const KART = lesKartdata()

/**
 * Om pasientens startlegemiddel i regelens fra-forløp i Norge bare finnes med
 * godkjenningsfritak (FEST), i formuleringsklassene forløpet gjelder. Slik er
 * Xeplion v3, som starter fra peroral paliperidon (Invega); leveranseplanen
 * §10.4 teller den for seg.
 */
function startKreverFritak(regel: Regel): boolean {
  const fra = regel.plan?.forlop.find((f) => f.id === 'fra')
  if (fra?.virkestoff.type !== 'virkestoff') return false
  const klasser = fra.klasser ?? (Object.keys(FORMULERINGSKLASSER) as Formuleringsklasse[]).filter((k) => k.startsWith(fra.administrasjon))
  return markedsgrunnlag(preparaterFor(KART, fra.virkestoff.nokkel).filter((p) => klasser.includes(p.klasse))) === 'kun_godkjenningsfritak'
}

/** Minstekravene for første nyttige leveranse (plan §5): ulike klinisk godkjente forløp (regler) med komplett plan, ikke antall positive kasus. */
function minstekrav(): string[] {
  const komplette = (l: Leveranse, filter: (r: (typeof RESULTATER)[number]) => boolean = () => true) => RESULTATER.filter((r) => r.forlop.leveranse === l && r.klasse === 'komplett' && filter(r))
  const regler = (x: readonly { regel?: { id: string; versjon: number } }[]) => [...new Map(x.map((r) => [r.regel!.id, `${r.regel!.id} v${r.regel!.versjon}`])).values()].sort()
  const depot = (r: (typeof RESULTATER)[number]) => r.forlop.valg.til?.formulering !== 'standard' || r.forlop.valg.fra.formulering !== 'standard'
  // Minst null: raden vises, men teller ikke mot noe krav.
  const rader: [string, ReturnType<typeof komplette>, number][] = [
    ['K1 komplette nedtrappinger', komplette('K1'), 2],
    ['K2 komplette antidepressivbytter', komplette('K2'), 3],
    ['K3 komplette perorale antipsykotikabytter (peroral → peroral)', komplette('K3', (r) => !depot(r)), 2],
    ['K3 komplette depotrelaterte antipsykotikabytter fra et markedsført startlegemiddel', komplette('K3', (r) => depot(r) && !startKreverFritak(r.regel!)), 2],
    ['K3 depotrelaterte der startlegemidlet bare finnes med godkjenningsfritak (telles for seg)', komplette('K3', (r) => depot(r) && startKreverFritak(r.regel!)), 0],
    ['K4 komplette tilleggsscenarier', komplette('K4'), 2],
  ]
  return [
    '## Minstekrav for første nyttige leveranse (målt på katalogen)',
    '',
    '| Krav | Ulike godkjente forløp med komplett plan | Positive kasus | Minst | Oppfylt | Regler |',
    '| --- | ---: | ---: | ---: | --- | --- |',
    ...rader.map(([k, x, m]) => `| ${k} | ${regler(x).length} | ${x.length} | ${m || '–'} | ${m === 0 ? 'telles ikke' : regler(x).length < m ? 'nei' : 'ja'} | ${regler(x).join(', ') || '–'} |`),
    '',
    'Kravet telles i ulike klinisk godkjente forløp (regler), ikke i positive kasus: to startdoser eller to legemiddelformer i samme regel er ett forløp. Oppfylt her betyr bare at QA-testen finner så mange; klinisk godkjenning og prøve i appen kreves i tillegg (plan §8). K3 telles for seg som peroral → peroral og depotrelatert (leveranseplanen §10.4). Et depotforløp der pasientens startlegemiddel i FEST bare finnes med godkjenningsfritak (Xeplion v3 fra peroral paliperidon), vises på egen rad og teller ikke mot kravet. Alle de godkjente K3-forløpene gjelder bare avgrensede grupper og doser (se forløpene og omfanget nedenfor).',
    '',
  ]
}

describe('QA-rapporten', () => {
  it('er oppdatert', () => {
    const rapport = lagQaRapport(RESULTATER, [...minstekrav(), ...nevnere(), ...sveiplinjer(SVEIP)])
    if (process.env.QA_SKRIV) writeFileSync(QA_RAPPORT, rapport)
    expect(readFileSync(QA_RAPPORT, 'utf8')).toBe(rapport)
  })
})
