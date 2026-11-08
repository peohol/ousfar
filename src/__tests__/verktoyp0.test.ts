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
import { beregnPlan, entydigeTrinnvalg, medTrinnvalg, TOMT_SKJEMA } from '../verktoy/doseplan'
import { flyttilstand } from '../verktoy/flyt'
import { flytoppsett, INDIVIDUELT, standardId, UNNTAK_STANDARD, vurderFlyt, type Flytgrunnlag } from '../verktoy/flyt/flyt'
import { harKontrollertKatalog, KONTROLLERTE_KATALOGER, type Katalogkontroll } from '../verktoy/flyt/katalogkontroll'
import { erErstattet, erKliniskGodkjent } from '../verktoy/regler/godkjenning'
import type { Regel } from '../verktoy/regler/modell'
import { besvartSkjema, tidFor } from '../verktoy/regler/pilotmatrise'
import { VERKTOY } from '../verktoy/register'
import { REGELSETT } from '../verktoy/tilgjengelighet'
import { katalogkandidater } from './hjelp/katalogkandidater'
import { BRUKERFORLOP, kjorForlop, lesUttrekkene, uttrekkFor, type Brukerforlop } from './qa/brukerforlop'

const uttrekkene = lesUttrekkene()
/** Tidspunktet kontrollmatrisen beregner ved, for uttrekket med dette navnet. */
const tidI = (navn: string) => tidFor({ uttrekk: 'pilot' }, { pilot: uttrekkene[navn]!, aksept: uttrekkene[navn]! })
const forlop = (id: string) => BRUKERFORLOP.find((f) => f.id === id)!
const regel = (id: string) => REGELSETT.regler.find((r) => r.id === id)!
/** Reglene appen faktisk bruker: klinisk godkjent og ikke erstattet av en nyere godkjent versjon. */
const iBruk: Regel[] = REGELSETT.regler.filter((r) => erKliniskGodkjent(r) && !erErstattet(r, REGELSETT.regler))

const ESCITALOPRAM = 'seponering-escitalopram-tabletter-og-draper'
/** Katalogen fra P2a ført som kontrollert bare i testen, slik appen blir når avtrykkene er ført. */
const KANDIDATER = katalogkandidater()
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

describe('P0-2 reservevisningen med «Gjelder/Gjelder ikke» (rettet i P2a, katalogen kontrollert 07.11.2026)', () => {
  /** Reglene i bruk med spørsmål som vises med reservevisningen, med katalogene i `kontrollerte` (ellers appens). */
  const iReserve = (kontrollerte?: Katalogkontroll[]) =>
    iBruk
      .filter((r) => !flytoppsett(r, kontrollerte && { kontrollerte }).katalog && flytoppsett(r).sporsmal.length > 0)
      .map((r) => r.id)
      .sort()
  const RESERVE: Flytgrunnlag = { kontrollerte: [] }

  it('ingen godkjent regel i bruk vises med reservevisningen i appen; avtrykkene i appen er nøyaktig katalogen slik den er nå', () => {
    expect(iReserve()).toEqual([])
    expect(iBruk.filter((r) => flytoppsett(r).sporsmal.length > 0).every(harKontrollertKatalog)).toBe(true)
    for (const k of KONTROLLERTE_KATALOGER) expect(KANDIDATER.find((x) => x.regel === k.regel)?.katalogavtrykk, k.regel).toBe(k.katalogavtrykk)
  })

  it.each([ESCITALOPRAM, 'bytte-citalopram-sertralin', 'bytte-escitalopram-sertralin'])(
    '%s: appen spør med Ja / Nei / Vet ikke og sier hvorfor; reservevisningen sier «Stemmer / Stemmer ikke» og aldri «Da gjelder ikke regelen»',
    (id) => {
      const r = regel(id)
      const q = vurderFlyt(r, {}).sporsmal.find((x) => /^tidligere_seponeringsplager/.test(x.id))!
      expect(q.alternativer.map((a) => a.tekst)).toEqual(['Ja', 'Nei', 'Vet ikke'])
      expect(vurderFlyt(r, { [q.id]: 'ja' }).stopp.find((x) => x.sporsmal === q.id)?.tekst).toMatch(
        /^Verktøyet har foreløpig ingen godkjent standardplan ved tidligere seponeringsvansker\. (Nedtrappingen må tilpasses individuelt|Byttet må planlegges individuelt)/,
      )
      // Reservevisningen, som gjelder når et avtrykk ikke stemmer lenger.
      const s = vurderFlyt(r, {}, RESERVE).sporsmal.find((x) => x.id === TIDLIGERE)!
      expect(s.alternativer.map((a) => a.tekst)).toEqual(['Stemmer', 'Stemmer ikke'])
      const reserve = vurderFlyt(r, { [TIDLIGERE]: 'ja' }, RESERVE).stopp.find((x) => x.sporsmal === TIDLIGERE)?.tekst
      expect(reserve).toBe(UNNTAK_STANDARD)
      expect(reserve).not.toMatch(/gjelder ikke regelen/i)
    },
  )
})

describe('P0-3 stopp uten konkret grunn (rettet i P2a, katalogen kontrollert 07.11.2026)', () => {
  /** Alle svar på et synlig spørsmål som stopper planen, med forklaringen klinikeren får. */
  const stoppsvar = (r: Regel, g?: Flytgrunnlag) =>
    flytoppsett(r, g).sporsmal.flatMap((q) => {
      const s = vurderFlyt(r, {}, g).sporsmal.find((x) => x.id === q.id)
      return (s?.stopperVed ?? []).map((svar) => ({ regel: r.id, sporsmal: q.id, svar, tekst: vurderFlyt(r, { [q.id]: svar }, g).stopp.find((x) => x.sporsmal === q.id)?.tekst }))
    })
  const generiske = (g?: Flytgrunnlag) => iBruk.flatMap((r) => stoppsvar(r, g)).filter((x) => x.tekst === INDIVIDUELT || x.tekst === UNNTAK_STANDARD || /gjelder ikke regelen/i.test(x.tekst ?? ''))

  it('i appen sier hvert svar som stopper planen, hvilket forhold som stopper og hvorfor', () => {
    expect(generiske()).toEqual([])
    // Minst like mange stoppende svar som de 28 generiske i P0-rapporten, og hvert har sin egen tekst.
    const alle = iBruk.flatMap((r) => stoppsvar(r))
    expect(alle.length).toBeGreaterThan(28)
    for (const x of alle) expect(x.tekst, `${x.regel} ${x.sporsmal}=${x.svar}`).toMatch(/\S/)
  })

  it('i reservevisningen kommer hvert generiske stopp fra unntakene, og ingen sier «Da gjelder ikke regelen»', () => {
    const g = generiske({ kontrollerte: [] })
    expect(g.length).toBeGreaterThan(0)
    expect(g.filter((x) => /gjelder ikke regelen/i.test(x.tekst ?? ''))).toEqual([])
  })
})

describe('P0-4 lang behandlingstid ved escitalopram (rettet i spor B)', () => {
  // Katalogens spørsmål, som avgjør regelspørsmålet `lang_behandlingstid` (P2a).
  const LANG = 'lang_behandlingstid'
  const ESC = { fra: { nokkel: 'escitalopram', formulering: 'standard' as const } }
  const uttrekk = uttrekkFor(ESC, uttrekkene)
  const tilstand = (dose: string, legemiddelform: string, flytsvar: Record<string, string> = {}) =>
    flyttilstand({
      verktoy: VERKTOY.find((v) => v.type === 'seponering')!,
      valg: ESC,
      regelsett: REGELSETT,
      sperrer: [],
      regel: regel(ESCITALOPRAM),
      skjema: { ...TOMT_SKJEMA, startdose: dose, formvalg: { fra: { legemiddelform } }, flytsvar },
      utvalg: uttrekkene[uttrekk]!.utvalg,
      naa: tidI(uttrekk),
    })

  it('uten preparatene kan flyten ikke vite det: regelens omfang har et tilfelle med lang behandlingstid (dråper, 10 %)', () => {
    expect(vurderFlyt(regel(ESCITALOPRAM), {}).sporsmal.find((x) => x.id === LANG)?.stopperVed).toBeUndefined()
    const k = kjorForlop({ ...forlop('K0-01'), id: 'P0-lang', skjema: { ...forlop('K0-01').skjema, svar: { lang_behandlingstid: true } } }, uttrekkene)
    expect(k.klasse).not.toBe('komplett')
  })

  it.each([
    ['10', '53'],
    ['20', '53'],
    ['10', '748'],
    ['20', '748'],
  ])('%s mg, form %s: «Ja» stopper ved spørsmålet med grunnen, og steg 2 sier det før spørsmålet besvares', (dose, form) => {
    const for_ = tilstand(dose, form)
    expect(for_.tilstand.kontroll.utfall).toBe('kan_lages_hvis')
    expect(for_.tilstand.kontroll.begrensninger).toContain('lang behandlingstid')
    expect(for_.tilstand.sporsmal.find((x) => x.id === LANG)?.stopperVed).toContain('ja')
    const ja = tilstand(dose, form, { [LANG]: 'ja' })
    expect(ja.tilstand.kontroll.utfall).toBe('kan_ikke')
    expect(ja.tilstand.kontroll.grunner).toEqual([
      expect.objectContaining({ sporsmal: LANG, tekst: expect.stringMatching(/^Den godkjente planen gjelder bare kort behandlingstid\. Etter lang bruk anbefales vanligvis mindre reduksjoner/) }),
    ])
    // Nei gir fortsatt en plan (svaret er tillatende).
    expect(tilstand(dose, form, { [LANG]: 'nei' }).tilstand.kontroll.utfall).toBe('kan_lages_hvis')
  })
})

describe('P0-1 rettet i spor B: dosevalgene med ett alternativ hvert godtas med ett trykk', () => {
  it.each([
    ['10', '53', 5],
    ['20', '53', 7],
    ['10', '748', 5],
    ['20', '748', 7],
  ])('%s mg, form %s: alle %i dosevalgene vises samlet, og med dem blir planen komplett', (dose, form, n) => {
    const f = forlop('K0-01')
    const r = regel(ESCITALOPRAM)
    const uttrekk = uttrekkFor(f.valg, uttrekkene)
    const naa = tidI(uttrekk)
    const utvalg = uttrekkene[uttrekk]!.utvalg
    const skjema = besvartSkjema(r, dose, { formvalg: { fra: { legemiddelform: form } } })
    const valg = entydigeTrinnvalg(r, f.valg, skjema, utvalg, naa)
    expect(valg).toHaveLength(n)
    const medValg = valg!.reduce((s, v) => medTrinnvalg(s, v.trinn, v.dose.mg), skjema)
    // Samme valg som ett og ett: samme regel, samme fingeravtrykk, komplett plan.
    expect(beregnPlan(r, f.valg, medValg, utvalg, naa).status).toBe('doseplan')
    expect(valg!.every((v) => v.trinn.doser.length === 1)).toBe(true)
  })
})
