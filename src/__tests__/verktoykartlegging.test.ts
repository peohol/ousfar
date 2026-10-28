/**
 * Kartleggingen for OUSFAR Verktøy (P1 i `docs/verktøy-utviklingsplan.md`):
 * lesingen av switchtabellene, formuleringene i FEST, at kartleggingen stemmer
 * med øyeblikksbildene, de faktiske celletallene, at johannesurt og
 * Start-kolonnen er utelatt, og at rapporten er oppdatert. Og P2: at hvert
 * virkestoff har eller får fagside med kartleggingens FEST-ID-er, uten
 * johannesurt (migrasjonene prøves i `verktoyfagsider.test.ts`).
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Pakningsdata } from '../legemiddeldata/fest'
import { formuleringsklasse, markedsstatus, type Festpreparat } from '../verktoy/festformuleringer'
import { lesKartdata } from '../verktoy/kartdata'
import {
  erSperret,
  importmal,
  kontrollerKartlegging,
  markedsgrunnlag,
  preparaterFor,
  tabelldekning,
  virkestoffstatus,
  type Kartdata,
} from '../verktoy/kartlegging'
import { lesSwitchtabell } from '../verktoy/kildetabeller'
import { lagRapport, RAPPORTFIL } from '../verktoy/rapport'
import { VERKTOY_FAGSIDER, VERKTOY_FESTKOBLINGER, VERKTOY_KATEGORIER } from '../verktoy/fagsider'
import { stoffslug, STOFFREGISTER } from '../domain/stoffregister'

const DATA = lesKartdata()
const kopi = (): Kartdata => structuredClone(DATA)
const tabell = (id: string) => DATA.tabeller.tabeller.find((t) => t.id === id)!

describe('Lesingen av en switchtabell', () => {
  const side = (rader: string) => `<div class="mw-parser-output"><p><b>Tabell</b></p>
    <p><b><a href="/switchdetail/gruppe" title="Gruppe">Gruppe</a></b> = <a href="/switchdetail/a1">A1</a>, <a href="/switchdetail/a2">A2</a>.</p>
    <table class="switchtable"><tbody>
    <tr><th>↓&nbsp;from</th><th>to&nbsp;→</th><th>Aa</th><th>Bb</th><th>Stop</th></tr>
    ${rader}
    </tbody></table><p><b>LA</b> = <i>long acting</i></p></div>
    <!-- Saved in parser cache with key x and timestamp 20260129011006 and revision id 10641 -->`
  const godeRader = `<tr><th>Aa</th><th>Alfa</th><td> — </td><td><a href="/switchdetail/a-b" title="A-B">AaBb</a></td><td><a href="/switchdetail/stop-a">Aa–</a></td></tr>
    <tr><th>Bb</th><th>Beta &amp; co</th><td><a href="/switchdetail/b-a">BbAa</a></td><td> — </td><td> — </td></tr>`

  it('gir rader, kolonner, celler, grupper og revisjon, men ikke fotnoter, lenketitler eller lenketekst', () => {
    const t = lesSwitchtabell('SwitchAntipsychotics', side(godeRader))
    expect(t.radetikett).toBe('from')
    expect(t.kolonneetikett).toBe('to')
    expect(t.rader).toEqual([{ kode: 'Aa', navn: 'Alfa' }, { kode: 'Bb', navn: 'Beta & co' }])
    expect(t.kolonner).toEqual([{ kode: 'Aa', navn: 'Alfa' }, { kode: 'Bb', navn: 'Beta & co' }, { kode: 'Stop', navn: null }])
    expect(t.celler).toHaveLength(6)
    expect(t.celler[1]).toEqual({ rad: 'Aa', kolonne: 'Bb', type: 'lenke', href: '/switchdetail/a-b' })
    expect(t.celler[0]).toEqual({ rad: 'Aa', kolonne: 'Aa', type: 'tom' })
    expect(t.celler.filter((c) => c.type === 'tom').map((c) => `${c.rad}${c.kolonne}`)).toEqual(['AaAa', 'BbBb', 'BbStop'])
    expect(t.grupper).toEqual([
      { navn: 'Gruppe', href: '/switchdetail/gruppe', medlemmer: [{ navn: 'A1', href: '/switchdetail/a1' }, { navn: 'A2', href: '/switchdetail/a2' }] },
    ])
    expect(t).not.toHaveProperty('fotnoter')
    expect(t).not.toHaveProperty('tittel')
    expect(JSON.stringify(t)).not.toMatch(/"A-B"|AaBb|long acting/)
    expect(t.revisjon).toBe(10641)
    expect(t.lagret).toBe('2026-01-29T01:10:06Z')
  })

  it('kaster når en rad har feil antall celler, eller en celle har annet enn én lenke eller «—»', () => {
    expect(() => lesSwitchtabell('SwitchAntipsychotics', side(godeRader.replace('<td> — </td><td> — </td></tr>', '<td> — </td></tr>')))).toThrow(/celler/)
    expect(() => lesSwitchtabell('SwitchAntipsychotics', side(godeRader.replace('<td> — </td><td><a', '<td>se tekst</td><td><a')))).toThrow(/verken/)
    expect(() => lesSwitchtabell('SwitchAntipsychotics', '<p>ingen tabell</p>')).toThrow(/switchtabell/)
  })
})

describe('Formuleringene i FEST', () => {
  it('leses av legemiddelform og administrasjonsvei', () => {
    expect(formuleringsklasse('Tablett', ['Oral bruk'])).toBe('peroral')
    expect(formuleringsklasse('Smeltetablett', ['Oral bruk'])).toBe('peroral')
    expect(formuleringsklasse('Depottablett', ['Oral bruk'])).toBe('peroral_modifisert')
    expect(formuleringsklasse('Tablett med modifisert frisetting', ['Oral bruk'])).toBe('peroral_modifisert')
    expect(formuleringsklasse('Enterokapsel, hard', ['Oral bruk'])).toBe('peroral_modifisert')
    expect(formuleringsklasse('Depotinjeksjonsvæske, suspensjon', ['Intramuskulær bruk'])).toBe('depotinjeksjon')
    expect(formuleringsklasse('Pulver og væske til depotinjeksjonsvæske, suspensjon', ['Intramuskulær bruk'])).toBe('depotinjeksjon')
    expect(formuleringsklasse('Injeksjonsvæske, oppløsning', ['Intramuskulær bruk'])).toBe('injeksjon')
    expect(formuleringsklasse('Stikkpille', ['Rektal bruk'])).toBe('annen')
  })

  it('gir en esterdepot formuleringen fra overstyringen, ikke fra FESTs form', () => {
    const haldol = preparaterFor(DATA, 'haloperidol').filter((p) => p.legemiddelform?.tekst === 'Injeksjonsvæske, oppløsning')
    expect(haldol.filter((p) => p.varenavn === 'Haldol Depot').every((p) => p.klasse === 'depotinjeksjon' && p.overstyrt)).toBe(true)
    expect(haldol.filter((p) => p.varenavn === 'Haldol').every((p) => p.klasse === 'injeksjon' && !p.overstyrt)).toBe(true)
    expect(preparaterFor(DATA, 'zuklopentiksol').filter((p) => p.varenavn === 'Cisordinol-Acutard').map((p) => p.klasse)).toEqual([
      'middels_langtidsvirkende',
    ])
  })

  const pakning = (p: Partial<Pakningsdata>): Pakningsdata =>
    ({ markedsforingsdato: null, midlertidig_utgatt_dato: null, avregistrert_dato: null, ...p }) as Pakningsdata

  it('regner markedsstatus på dagen, med datoene inklusive', () => {
    expect(markedsstatus([], '2026-10-08')).toBe('uten_pakning')
    expect(markedsstatus([pakning({ markedsforingsdato: '2026-10-08' })], '2026-10-08')).toBe('markedsfort')
    expect(markedsstatus([pakning({ markedsforingsdato: '2026-10-09' })], '2026-10-08')).toBe('ikke_markedsfort')
    expect(markedsstatus([pakning({ markedsforingsdato: '2020-01-01', midlertidig_utgatt_dato: '2026-10-08' })], '2026-10-08')).toBe('midlertidig_utgatt')
    expect(markedsstatus([pakning({ markedsforingsdato: '2020-01-01', avregistrert_dato: '2026-10-08' })], '2026-10-08')).toBe('avregistrert')
    expect(markedsstatus([pakning({ markedsforingsdato: '2020-01-01', avregistrert_dato: '2026-10-09' })], '2026-10-08')).toBe('markedsfort')
    expect(
      markedsstatus([pakning({ markedsforingsdato: '2020-01-01', avregistrert_dato: '2025-01-01' }), pakning({ markedsforingsdato: '2020-01-01' })], '2026-10-08'),
    ).toBe('markedsfort')
  })

  it('skiller markedsført legemiddel, bare godkjenningsfritak og ingen preparater, uten kombinasjoner', () => {
    const p = (x: Partial<Festpreparat>) => ({ kombinert_med: [], marked: 'markedsfort', preparattype: 'Legemiddel', ...x }) as Festpreparat
    expect(markedsgrunnlag([])).toBe('ingen_preparater')
    expect(markedsgrunnlag([p({ kombinert_med: ['Annet'] })])).toBe('ingen_preparater')
    expect(markedsgrunnlag([p({ preparattype: 'Krever godkj. Fritak' })])).toBe('kun_godkjenningsfritak')
    expect(markedsgrunnlag([p({ marked: 'avregistrert' })])).toBe('ingen_markedsforte')
    expect(markedsgrunnlag([p({ preparattype: 'Krever godkj. Fritak' }), p({})])).toBe('markedsfort')
  })
})

describe('Kartleggingen', () => {
  it('stemmer med tabellene, lenkene, FEST, fagsidene og stoffregisterfilen', () => {
    expect(kontrollerKartlegging(DATA)).toEqual([])
  })

  it('har de faktiske celletallene per tabell', () => {
    const tall = DATA.tabeller.tabeller.map((t) => {
      const x = tabelldekning(DATA, t)
      return [x.tabell, x.celler, x.lenkede, x.tomme, x.tomme_utenom_diagonal, x.ekskludert.celler, x.ikke_importert.celler, x.importmal, x.importmal_tilgjengelige]
    })
    expect(tall).toEqual([
      ['CombiningMoodstabilizers', 121, 110, 11, 0, 0, 0, 110, 110],
      ['SwitchAntidepressants', 624, 600, 24, 0, 49, 23, 529, 526],
      ['SwitchAntipsychotics', 529, 400, 129, 109, 0, 0, 400, 400],
    ])
    expect(tabelldekning(DATA, tabell('SwitchAntipsychotics')).delte_lenkemal).toEqual([{ href: '/switchdetail/depot-depot', celler: 54 }])
  })

  it('har hver lenket celle med i lenkekontrollen', () => {
    const kjente = new Set(DATA.lenker.sider.map((s) => s.href))
    const mangler = DATA.tabeller.tabeller.flatMap((t) => t.celler.flatMap((c) => (c.type === 'lenke' && !kjente.has(c.href) ? [c.href] : [])))
    expect(mangler).toEqual([])
  })

  it('har 54 virkestoffer, og P2 lager fagsidene de 16 som manglet', () => {
    expect(DATA.kartlegging.virkestoffer).toHaveLength(54)
    expect(Object.keys(VERKTOY_KATEGORIER)).toEqual([
      'agomelatin', 'dosulepin', 'fenelzin', 'flufenazin', 'imipramin', 'loksapin', 'maprotilin', 'moklobemid',
      'penfluridol', 'perisiazin', 'pimozid', 'promazin', 'sulpirid', 'tranylcypromin', 'trazodon', 'trifluoperazin',
    ])
    // Før øyeblikksbildet er tatt på nytt etter utrullingen, mangler de i det; etterpå finnes de.
    const uten = DATA.kartlegging.virkestoffer.filter((v) => !virkestoffstatus(DATA, v).fagside).map((v) => v.nokkel)
    expect(uten.filter((n) => !VERKTOY_KATEGORIER[n])).toEqual([])
  })

  it('holder gruppene som kilderegler, ikke som valgbare virkestoffer', () => {
    const nokler = new Set(DATA.kartlegging.virkestoffer.map((v) => v.nokkel))
    for (const g of DATA.kartlegging.grupper) {
      expect(nokler.has(g.id)).toBe(false)
      expect(g.medlemmer.every((m) => nokler.has(m.virkestoff))).toBe(true)
    }
    expect(DATA.kartlegging.grupper.map((g) => [g.kildenavn, g.medlemmer.length])).toEqual([['Rest AP', 10], ['Partial agonist', 3]])
  })

  it('leser Psychiatrienets «ER» som depotinjeksjon, ikke peroral depottablett', () => {
    const dp = DATA.kartlegging.kildeidentiteter.SwitchAntipsychotics.find((i) => i.kode === 'Dp')
    expect(dp).toMatchObject({ type: 'virkestoff', virkestoff: 'paliperidon', kildeformulering: 'ER' })
    const navn = new Set(dp?.type === 'virkestoff' ? dp.preparater?.map((p) => p.varenavn) : [])
    const preparater = preparaterFor(DATA, 'paliperidon').filter((p) => navn.has(p.varenavn))
    expect(preparater.length).toBeGreaterThan(0)
    expect(preparater.every((p) => p.klasse === 'depotinjeksjon')).toBe(true)
    expect(preparaterFor(DATA, 'paliperidon').some((p) => p.varenavn === 'Invega' && p.klasse === 'peroral_modifisert' && !navn.has(p.varenavn))).toBe(true)
  })

  it('slår ut ved navnekollisjon, ukjent FEST-ID og depot uten tilordning', () => {
    const a = kopi()
    a.kartlegging.virkestoffer.find((v) => v.nokkel === 'olanzapin')!.aliaser.push('quetiapine')
    expect(kontrollerKartlegging(a).join()).toMatch(/kolliderer mellom kvetiapin og olanzapin/)

    const b = kopi()
    b.kartlegging.virkestoffer.find((v) => v.nokkel === 'agomelatin')!.fest = ['ID_FINNES-IKKE']
    expect(kontrollerKartlegging(b).join()).toMatch(/agomelatin: ID_FINNES-IKKE mangler/)

    const c = kopi()
    c.kartlegging.uten_kildevariant = c.kartlegging.uten_kildevariant.filter((u) => u.varenavn !== 'Okedi')
    expect(kontrollerKartlegging(c).join()).toMatch(/Okedi .* tilordnet 0 steder/)
  })
})

describe('Johannesurt og Start-kolonnen', () => {
  const ad = tabell('SwitchAntidepressants')

  it('sperrer johannesurt under alle navn', () => {
    for (const n of ['Johannesurt', 'Hypericum', 'hypericum perforatum', "St. John's wort", 'Prikkperikum', 'perikum']) {
      expect(erSperret(DATA.kartlegging, n), n).toBe(true)
    }
    for (const n of ['Perisiazin', 'Perfenazin', 'Hydroksyzin']) expect(erSperret(DATA.kartlegging, n), n).toBe(false)
  })

  it('har ikke johannesurt som virkestoff, fagside, gruppemedlem eller importmål', () => {
    const k = DATA.kartlegging
    expect(k.virkestoffer.flatMap((v) => [v.navn, v.nokkel, ...v.aliaser]).filter((n) => erSperret(k, n))).toEqual([])
    expect(DATA.fagsider.sider.filter((s) => erSperret(k, s.navn) || erSperret(k, s.slug))).toEqual([])
    expect(DATA.fest.virkestoffer.filter((v) => erSperret(k, v.navn ?? ''))).toEqual([])
    const mal = importmal(DATA)
    expect(mal.filter((c) => c.rad === 'Hy' || c.kolonne === 'Hy' || /hypericum/i.test(c.href))).toEqual([])
    expect(k.kildeidentiteter.SwitchAntidepressants.find((i) => i.kode === 'Hy')).toMatchObject({ type: 'ekskludert' })
    // Kilden har johannesurt som rad og kolonne; det er dem utelatelsen gjelder.
    expect(ad.celler.filter((c) => c.type === 'lenke' && (c.rad === 'Hy' || c.kolonne === 'Hy'))).toHaveLength(48)
  })

  it('slår ut om johannesurt kommer inn som virkestoff', () => {
    const d = kopi()
    const hy = d.kartlegging.kildeidentiteter.SwitchAntidepressants.find((i) => i.kode === 'Hy')!
    Object.assign(hy, { type: 'virkestoff', virkestoff: 'johannesurt', kildeformulering: 'standard' })
    d.kartlegging.virkestoffer.push({ nokkel: 'johannesurt', navn: 'Johannesurt', fest: [], aliaser: ['hypericum'] })
    const feil = kontrollerKartlegging(d).join('\n')
    expect(feil).toMatch(/johannesurt: navnet «Johannesurt» er sperret/)
    expect(feil).toMatch(/er sperret/)
  })

  it('importerer Stop for hvert antidepressivum unntatt johannesurt, og ingen Start', () => {
    const mal = importmal(DATA).filter((c) => c.tabell === 'SwitchAntidepressants')
    expect(mal.filter((c) => c.kolonne === 'Start')).toEqual([])
    expect(mal.filter((c) => c.kolonne === 'Stop').map((c) => c.rad)).toEqual(ad.rader.map((r) => r.kode).filter((k) => k !== 'Hy'))
  })
})

describe('Fagsidene og FEST-koblingene (P2)', () => {
  const kart = (nokkel: string) => DATA.kartlegging.virkestoffer.find((v) => v.nokkel === nokkel)!

  it('gir hver ny side kartleggingens navn og nøkkel, og ingen side som alt finnes under et annet navn', () => {
    for (const [nokkel, side] of Object.keys(VERKTOY_KATEGORIER).map((n, i) => [n, VERKTOY_FAGSIDER[i]!] as const)) {
      expect(side.navn, nokkel).toBe(kart(nokkel).navn)
      expect(stoffslug(side.navn), nokkel).toBe(nokkel)
      const finnes = DATA.fagsider.sider.find((s) => s.slug !== nokkel && [s.navn, s.slug].some((n) => stoffslug(n) === nokkel))
      expect(finnes, nokkel).toBeUndefined()
    }
  })

  it('kobler hver ny side til nøyaktig moderstoffene kartleggingen har i FEST, ingen andre', () => {
    for (const nokkel of Object.keys(VERKTOY_KATEGORIER)) {
      const v = kart(nokkel)
      expect(VERKTOY_FESTKOBLINGER.filter((k) => k.side === v.navn).map((k) => k.fest_id), nokkel).toEqual(v.fest)
    }
    expect(VERKTOY_FESTKOBLINGER).toHaveLength(Object.keys(VERKTOY_KATEGORIER).length)
    expect(new Set(VERKTOY_FESTKOBLINGER.map((k) => k.fest_id)).size).toBe(VERKTOY_FESTKOBLINGER.length)
  })

  it('kobler aldri til et salt eller en ester, som følger moderstoffet av seg selv', () => {
    const salter = new Set(DATA.fest.virkestoffer.flatMap((f) => f.salter.map((s) => s.id)))
    expect(VERKTOY_FESTKOBLINGER.filter((k) => salter.has(k.fest_id))).toEqual([])
    // Flufenazinsiden viser også depotet med esteren (dekanoatet).
    expect(DATA.fest.virkestoffer.find((f) => f.nokkel === 'flufenazin')!.salter.map((x) => x.navn)).toContain('Flufenazindekanoat')
    expect(preparaterFor(DATA, 'flufenazin').some((p) => p.klasse === 'depotinjeksjon')).toBe(true)
  })

  it('har hvert virkestoff i stoffregisterfilen, med nøkkelen og alle kartleggingens søkealiaser', () => {
    for (const v of DATA.kartlegging.virkestoffer) {
      const stoff = STOFFREGISTER.finn(v.nokkel)
      expect(stoff?.navn, v.nokkel).toBe(v.navn)
      for (const alias of v.aliaser) expect(STOFFREGISTER.kanonisk(alias)?.slug, `${v.nokkel}: ${alias}`).toBe(v.nokkel)
    }
  })

  it('lager ingen side og ingen kobling for johannesurt', () => {
    const k = DATA.kartlegging
    expect(VERKTOY_FAGSIDER.filter((s) => erSperret(k, s.navn))).toEqual([])
    expect(VERKTOY_FESTKOBLINGER.filter((x) => erSperret(k, x.side) || DATA.fest.virkestoffer.some((f) => f.id === x.fest_id && erSperret(k, f.navn ?? '')))).toEqual([])
    expect(DATA.stoffregister.stoffer.filter((s) => [s.navn, s.slug, ...(s.aliaser ?? [])].some((n) => erSperret(k, n)))).toEqual([])
  })
})

describe('Rapporten', () => {
  it('er laget av dataene som ligger i repoet', () => {
    const ny = 'Lag den på nytt med `npm run verktoy:kartlegging -- rapport` (den leser også stoffregisterfilen).'
    expect(readFileSync(new URL(`../../${RAPPORTFIL}`, import.meta.url), 'utf8'), ny).toBe(lagRapport(DATA))
  })
})
