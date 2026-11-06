/**
 * P0 i `docs/verktøy-produktrevisjon-2026-11.md`: reproduksjon av funnene i
 * `docs/verktøy-p0-rapport-2026-11.md` uten nettleser, mot de lagrede
 * FEST-uttrekkene og de faktiske godkjenningene i appens regelsett (ingen
 * simulert godkjenning).
 *
 * To slags tester:
 * - «Reproduksjon» låser dagens oppførsel slik rapporten beskriver den. De skal
 *   endres bevisst når en rettelse endrer oppførselen, sammen med rapporten.
 * - `it.fails` beskriver ønsket oppførsel som i dag ikke er oppfylt (kjent feil).
 *   Testen er grønn så lenge feilen finnes; når feilen er rettet, blir den rød,
 *   og `.fails` tas bort så kravet håndheves videre.
 *
 * Alle pasientopplysninger er syntetiske.
 */
import { describe, expect, it } from 'vitest'
import { flytoppsett, INDIVIDUELT, standardId, UNNTAK_STANDARD, vurderFlyt } from '../verktoy/flyt/flyt'
import { harKontrollertKatalog } from '../verktoy/flyt/katalogkontroll'
import { erErstattet, erKliniskGodkjent } from '../verktoy/regler/godkjenning'
import type { Regel } from '../verktoy/regler/modell'
import { REGELSETT } from '../verktoy/tilgjengelighet'
import { BRUKERFORLOP, kjorForlop, lesUttrekkene, type Brukerforlop } from './qa/brukerforlop'

const uttrekkene = lesUttrekkene()
const forlop = (id: string) => BRUKERFORLOP.find((f) => f.id === id)!
const regel = (id: string) => REGELSETT.regler.find((r) => r.id === id)!
/** Reglene appen faktisk bruker: klinisk godkjent og ikke erstattet av en nyere godkjent versjon. */
const iBruk: Regel[] = REGELSETT.regler.filter((r) => erKliniskGodkjent(r) && !erErstattet(r, REGELSETT.regler))

const ESCITALOPRAM = 'seponering-escitalopram-tabletter-og-draper'
const RESERVE = [ESCITALOPRAM, 'bytte-citalopram-sertralin', 'bytte-escitalopram-sertralin', 'kryssnedtrapping-sertralin-mirtazapin', 'seponering-vortioksetin']
const TIDLIGERE = standardId('unntak', 'tidligere_seponeringssymptomer')

/** Forløpet kjørt to ganger: med den første og med den siste dosen siden tilbyr i hvert trinnvalg. */
const beggeYtterpunkter = (f: Brukerforlop) => [kjorForlop({ ...f, trinn: 'forste' }, uttrekkene), kjorForlop({ ...f, trinn: 'siste' }, uttrekkene)] as const

describe('P0-1 escitalopram: komplett plan bare etter ett dosevalg per trinn, hvert med bare ett alternativ (reproduksjon)', () => {
  const tablett20: Brukerforlop = { ...forlop('K0-01'), id: 'P0-20', hva: 'Escitalopram 20 mg tablett, kort behandlingstid', dose: '20' }
  it.each([
    ['K0-01 (10 mg tablett)', forlop('K0-01'), 5, 197],
    ['20 mg tablett', tablett20, 7, 281],
    ['H-30 (10 mg dråper)', forlop('H-30'), 5, 197],
    ['H-31 (20 mg dråper)', forlop('H-31'), 7, 281],
  ])('%s: komplett plan først etter påkrevde dosevalg', (_, f, valg, dag) => {
    const [forste, siste] = beggeYtterpunkter(f)
    expect(forste.klasse).toBe('komplett')
    expect(forste.regel?.id).toBe(ESCITALOPRAM)
    expect(forste.trinnvalg).toHaveLength(valg)
    // Den første og den siste dosen er den samme i hvert trinn: hvert valg har bare ett alternativ.
    expect(siste.trinnvalg).toEqual(forste.trinnvalg)
    expect(forste.vist).toContain(`Fra dag ${dag}: Escitalopram peroralt: Seponert`)
  })
})

describe('P0-2 reservevisningen med «Gjelder/Gjelder ikke» (reproduksjon)', () => {
  it('fem godkjente regler i bruk har ingen kontrollert spørsmålskatalog og vises med regelens egne tekster', () => {
    expect(iBruk.filter((r) => !harKontrollertKatalog(r) && flytoppsett(r).sporsmal.length > 0).map((r) => r.id).sort()).toEqual([...RESERVE].sort())
  })

  it.each([ESCITALOPRAM, 'bytte-citalopram-sertralin', 'bytte-escitalopram-sertralin'])(
    '%s: «Gjelder» på tidligere seponeringsplager gir «Da gjelder ikke regelen»',
    (id) => {
      const r = regel(id)
      const s = vurderFlyt(r, {}).sporsmal.find((x) => x.id === TIDLIGERE)!
      expect(s.alternativer.map((a) => a.tekst)).toEqual(['Gjelder', 'Gjelder ikke'])
      expect(vurderFlyt(r, { [TIDLIGERE]: 'ja' }).stopp.find((x) => x.sporsmal === TIDLIGERE)?.tekst).toBe(UNNTAK_STANDARD)
    },
  )

  it.fails('ønsket (P2): ingen godkjent regel i bruk vises med reservevisningen', () => {
    expect(iBruk.filter((r) => !harKontrollertKatalog(r) && flytoppsett(r).sporsmal.length > 0).map((r) => r.id)).toEqual([])
  })
})

describe('P0-3 stopp uten konkret grunn', () => {
  /** Alle svar på et synlig spørsmål som stopper planen, med forklaringen klinikeren får. */
  const stoppsvar = (r: Regel) =>
    flytoppsett(r).sporsmal.flatMap((q) => {
      const s = vurderFlyt(r, {}).sporsmal.find((x) => x.id === q.id)
      return (s?.stopperVed ?? []).map((svar) => ({ regel: r.id, sporsmal: q.id, svar, tekst: vurderFlyt(r, { [q.id]: svar }).stopp.find((x) => x.sporsmal === q.id)?.tekst }))
    })
  const generiske = () => iBruk.flatMap(stoppsvar).filter((x) => x.tekst === INDIVIDUELT || x.tekst === UNNTAK_STANDARD)

  it('reproduksjon: 28 stoppende svar i åtte regler gir bare «Da gjelder ikke regelen» eller «Verktøyet lager ingen plan …»', () => {
    const g = generiske()
    expect(g).toHaveLength(28)
    expect([...new Set(g.map((x) => x.regel))].sort()).toEqual(
      ['bytte-citalopram-sertralin', 'bytte-escitalopram-sertralin', 'depot-risperidon-xeplion', 'kryssnedtrapping-sertralin-mirtazapin', ESCITALOPRAM, 'seponering-vortioksetin', 'tillegg-litium-lamotrigin', 'tillegg-valproat-lamotrigin'].sort(),
    )
  })

  it.fails('ønsket (P2): hvert svar som stopper planen, sier hvilket forhold som stopper og hvorfor', () => {
    expect(generiske()).toEqual([])
  })
})

describe('P0-4 lang behandlingstid ved escitalopram med tabletter', () => {
  const LANG = standardId('sporsmal', 'lang_behandlingstid')
  it('reproduksjon: «Ja» stopper ikke ved spørsmålet; planen stopper først i beregningen, uten å si at godkjenningen bare gjelder kort behandlingstid', () => {
    const r = regel(ESCITALOPRAM)
    expect(vurderFlyt(r, {}).sporsmal.find((x) => x.id === LANG)?.stopperVed).toBeUndefined()
    const k = kjorForlop({ ...forlop('K0-01'), id: 'P0-lang', skjema: { ...forlop('K0-01').skjema, svar: { lang_behandlingstid: true } } }, uttrekkene)
    expect(k.klasse).not.toBe('komplett')
    expect(k.vist.join(' ')).not.toMatch(/kort behandlingstid/)
  })

  it.fails('ønsket (P2): «Ja» på lang behandlingstid sier straks at den godkjente planen bare gjelder kort behandlingstid', () => {
    expect(vurderFlyt(regel(ESCITALOPRAM), {}).sporsmal.find((x) => x.id === LANG)?.stopperVed).toContain('ja')
  })
})
