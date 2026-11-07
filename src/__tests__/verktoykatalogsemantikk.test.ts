/**
 * Semantisk før/etter-kontroll av spørsmålskatalogen fra P2a for hver aktiv
 * regel (ChatGPTs krav 2 til #345). «Før» er regelens egne svar på hver
 * betingelse (reservevisningen), «etter» er katalogens spørsmål.
 *
 * Tre lag:
 * 1. Etterprøvingen (`katalogsemantikk.ts`): hvert svar og ubesvart på
 *    spørsmålene som avgjør hver betingelse gir samme motorinndata og samme
 *    sperre som regelens egne svar, hvert stopp har katalogens forklaring, og
 *    «Vet ikke» eller ubesvart gir aldri plan.
 * 2. Fasiten under, skrevet for hånd fra regelens tekst: for hver betingelse
 *    som avgjøres av flere spørsmål, av et svar som ikke er «Ja»/«Nei», eller
 *    der «Ja» gjør betingelsen usann, står hvilke svar som gjør betingelsen
 *    sann, usann eller uavklart, og om planen kan lages. Den fanger en
 *    avbildning med feil retning, som etterprøvingen alene ikke kan se.
 * 3. Hver annen betingelse har ett spørsmål der «Ja» gjør den sann og «Nei»
 *    usann; den er listet med regelens tekst ved siden av i
 *    `docs/verktøy-sporsmalskatalog.md` til semantisk lesing.
 *
 * Katalogen føres som kontrollert bare i testen. Alle pasientopplysninger er
 * syntetiske.
 */
import { describe, expect, it } from 'vitest'
import { TOMT_SKJEMA } from '../verktoy/doseplan'
import { flyttilstand } from '../verktoy/flyt'
import { flytoppsett, standardId, vurderFlyt, type Flytgrunnlag } from '../verktoy/flyt/flyt'
import { katalogavtrykk } from '../verktoy/flyt/katalogkontroll'
import { apningssvar, etterprov, girPlan, regelensSvar, tillatendeSvar } from '../verktoy/flyt/katalogsemantikk'
import { KATALOGBETINGELSER, type Katalogbetingelse } from '../verktoy/flyt/sporsmal'
import { erErstattet, erKliniskGodkjent, fingeravtrykk } from '../verktoy/regler/godkjenning'
import type { Regel } from '../verktoy/regler/modell'
import { tidFor } from '../verktoy/regler/pilotmatrise'
import { VERKTOY } from '../verktoy/register'
import { REGELSETT } from '../verktoy/tilgjengelighet'
import { katalogkandidater } from './hjelp/katalogkandidater'
import { lesUttrekkene, uttrekkFor } from './qa/brukerforlop'

const KATALOG: Flytgrunnlag = { kontrollerte: katalogkandidater() }
const RESERVE: Flytgrunnlag = { kontrollerte: [] }
/** Reglene appen bruker, med katalog. */
const AKTIVE = REGELSETT.regler.filter((r) => erKliniskGodkjent(r) && !erErstattet(r, REGELSETT.regler) && KATALOG.kontrollerte!.some((k) => k.regel === r.id))
const regel = (id: string) => AKTIVE.find((r) => r.id === id)!

type Felt = `${'pasientforhold' | 'svar' | 'bekreftet'}.${string}`
/** Ett tilfelle i fasiten: svarene (resten tillatende), betingelsens verdi, og om planen da kan lages. */
type Tilfelle = readonly [svar: Record<string, string | undefined>, verdi: boolean | undefined, plan: boolean]
type Fasit = Record<string, Partial<Record<Felt, readonly Tilfelle[]>>>

/** Verdien motoren får for feltet; en bekreftelse er sann bare når den er bekreftet. */
function verdi(r: Regel, felt: Felt, svar: Record<string, string | undefined>, g: Flytgrunnlag) {
  const f = vurderFlyt(r, tillatendeSvar(r, g, svar), g)
  const [del, id] = felt.split('.') as ['pasientforhold' | 'svar' | 'bekreftet', string]
  return { f, v: del === 'bekreftet' ? f.felt.bekreftet.includes(id) : f.felt[del][id] }
}

// --- Fasiten, fra regelens tekst ---
const UNDER_18_ALDER: readonly Tilfelle[] = [
  [{ alder: 'under_18' }, true, false],
  [{ alder: '18_64' }, false, true],
  [{ alder: 'ukjent' }, undefined, false],
]
/** Tre forhold der ett ja er nok (dosen ustabil, uregelmessig bruk, del av et bytte). */
const USTABIL: readonly Tilfelle[] = [
  [{ del_av_bytte: 'ja', ustabil_dose: 'nei', uregelmessig_bruk: 'nei' }, true, false],
  [{ del_av_bytte: 'nei', ustabil_dose: 'ja', uregelmessig_bruk: 'nei' }, true, false],
  [{ del_av_bytte: 'nei', ustabil_dose: 'nei', uregelmessig_bruk: 'ja' }, true, false],
  [{ del_av_bytte: 'ukjent', ustabil_dose: 'ja', uregelmessig_bruk: 'nei' }, true, false],
  [{ del_av_bytte: 'nei', ustabil_dose: 'nei', uregelmessig_bruk: 'nei' }, false, true],
  [{ del_av_bytte: 'nei', ustabil_dose: 'ukjent', uregelmessig_bruk: 'nei' }, undefined, false],
]
/** «65 år eller eldre» (vortioksetin og escitalopram versjon 14): 65 er med. */
const ELDRE_65_ELLER_ELDRE: readonly Tilfelle[] = [
  [{ alder: '18_64' }, false, true],
  [{ alder: '65_eller_eldre' }, true, false],
  [{ alder: 'ukjent' }, undefined, false],
]
/** «Over 65 år»: 65 er ikke over, 66 er over (oppfølgingsspørsmålet). */
const OVER_65: readonly Tilfelle[] = [
  [{ alder: '18_64' }, false, true],
  [{ alder: '65_eller_eldre', eldre_enn_65: 'nei' }, false, true],
  [{ alder: '65_eller_eldre', eldre_enn_65: 'ja' }, true, false],
  [{ alder: '65_eller_eldre', eldre_enn_65: 'ukjent' }, undefined, false],
  [{ alder: 'ukjent' }, undefined, false],
]
/** Depotindikasjonen: voksen med schizofreni, stabilisert på det perorale legemidlet. */
const depotindikasjon = (stabilisert: string): readonly Tilfelle[] => [
  [{ alder: '18_64', schizofreni: 'ja', [stabilisert]: 'ja' }, true, true],
  [{ alder: 'under_18', schizofreni: 'ja', [stabilisert]: 'ja' }, false, false],
  [{ alder: '18_64', schizofreni: 'nei', [stabilisert]: 'ja' }, false, false],
  [{ alder: '18_64', schizofreni: 'ja', [stabilisert]: 'nei' }, false, false],
  [{ alder: '18_64', schizofreni: 'ukjent', [stabilisert]: 'ja' }, false, false],
]
/** Byttene til sertralin: voksne fra 18 til og med 65 år, bytte ved depresjon; 65 er med, 66 er ikke. */
const K2_INDIKASJON: readonly Tilfelle[] = [
  [{ alder: '18_64', depresjon_bytte: 'ja' }, true, true],
  [{ alder: '65_eller_eldre', eldre_enn_65: 'nei', depresjon_bytte: 'ja' }, true, true],
  [{ alder: '65_eller_eldre', eldre_enn_65: 'ja', depresjon_bytte: 'ja' }, false, false],
  [{ alder: 'under_18', depresjon_bytte: 'ja' }, false, false],
  [{ alder: '18_64', depresjon_bytte: 'nei' }, false, false],
  [{ alder: '18_64', depresjon_bytte: 'ukjent' }, false, false],
]
/** Serotonerge legemidler er kontrollert, og pasienten bruker ingen andre: «Nei» på det andre spørsmålet bekrefter. */
const serotonerg = (sporsmal: string): readonly Tilfelle[] => [
  [{ legemidler_kontrollert: 'ja', [sporsmal]: 'nei' }, true, true],
  [{ legemidler_kontrollert: 'ja', [sporsmal]: 'ja' }, false, false],
  [{ legemidler_kontrollert: 'nei', [sporsmal]: 'nei' }, false, false],
  [{ legemidler_kontrollert: 'ja', [sporsmal]: undefined }, false, false],
]
/** K3: indikasjonen (voksen, schizofreni, stabil, poliklinisk, bytte for bivirkninger eller manglende effekt). */
const k3indikasjon = (stoff: string): readonly Tilfelle[] => {
  const ok = { alder: '18_64', schizofreni: 'ja', stabil: 'ja', oppfolging: 'poliklinisk', [`bytteaarsak_${stoff}`]: 'bivirkninger' }
  return [
    [ok, true, true],
    [{ ...ok, [`bytteaarsak_${stoff}`]: 'effekt' }, true, true],
    [{ ...ok, [`bytteaarsak_${stoff}`]: 'annet' }, false, false],
    [{ ...ok, [`bytteaarsak_${stoff}`]: 'ukjent' }, false, false],
    [{ ...ok, oppfolging: 'innlagt' }, false, false],
    [{ ...ok, oppfolging: 'annet' }, false, false],
    [{ ...ok, schizofreni: 'nei' }, false, false],
    [{ ...ok, stabil: 'nei' }, false, false],
    [{ ...ok, alder: 'under_18' }, false, false],
    [{ ...ok, alder: '65_eller_eldre' }, true, false],
  ]
}
/** K3: gjentatte tilbakefall, innleggelse eller ustabil tilstand; ett er nok. */
const TILBAKEFALL: readonly Tilfelle[] = [
  [{ gjentatte_tilbakefall: 'nei', oppfolging: 'poliklinisk', stabil: 'ja' }, false, true],
  [{ gjentatte_tilbakefall: 'ja', oppfolging: 'poliklinisk', stabil: 'ja' }, true, false],
  [{ gjentatte_tilbakefall: 'nei', oppfolging: 'innlagt', stabil: 'ja' }, true, false],
  [{ gjentatte_tilbakefall: 'nei', oppfolging: 'poliklinisk', stabil: 'nei' }, true, false],
  [{ gjentatte_tilbakefall: 'ukjent', oppfolging: 'poliklinisk', stabil: 'ja' }, undefined, false],
]
const K3_ALDER: readonly Tilfelle[] = [
  [{ alder: '18_64' }, false, true],
  [{ alder: '65_eller_eldre' }, true, false],
  [{ alder: 'ukjent' }, undefined, false],
]
const CYP: readonly Tilfelle[] = [
  [{ sterk_cyp_hemmer: 'ja', sterk_cyp3a4_induktor: 'nei' }, true, false],
  [{ sterk_cyp_hemmer: 'nei', sterk_cyp3a4_induktor: 'ja' }, true, false],
  [{ sterk_cyp_hemmer: 'nei', sterk_cyp3a4_induktor: 'nei' }, false, true],
  [{ sterk_cyp_hemmer: 'ukjent', sterk_cyp3a4_induktor: 'nei' }, undefined, false],
]
/** To vurderinger som begge må være gjort («Ikke ennå» gjenstår). */
const begge = (a: string, b: string): readonly Tilfelle[] => [
  [{ [a]: 'ja', [b]: 'ja' }, true, true],
  [{ [a]: 'nei', [b]: 'ja' }, false, false],
  [{ [a]: 'ja', [b]: 'nei' }, false, false],
]
const k3 = (stoff: string): Fasit[string] => ({
  'pasientforhold.tilbakefall_innlagt': TILBAKEFALL,
  'pasientforhold.alder_65': K3_ALDER,
  'pasientforhold.cyp_aripiprazol': CYP,
  'bekreftet.indikasjon': k3indikasjon(stoff),
  'bekreftet.spesialist_risiko': begge('spesialist_vurdert', 'tett_oppfolging'),
  'bekreftet.siste_trinn': begge(`siste_trinn_${stoff}`, `seponering_informert_${stoff}`),
})
const k2 = (stoff: string): Fasit[string] => ({ 'pasientforhold.over_65': OVER_65, 'bekreftet.indikasjon': K2_INDIKASJON, 'bekreftet.serotonerg_sammedisinering': serotonerg(`serotonerge_${stoff}`) })

const FASIT: Fasit = {
  'seponering-escitalopram-tabletter-og-draper': {
    'pasientforhold.under_18': UNDER_18_ALDER,
    'pasientforhold.ustabil_dose_eller_bytte': USTABIL,
    'pasientforhold.qt_forlengelse': [
      [{ qt_forlengelse: 'ja', qt_legemiddel: 'nei' }, true, false],
      [{ qt_forlengelse: 'nei', qt_legemiddel: 'ja' }, true, false],
      [{ qt_forlengelse: 'nei', qt_legemiddel: 'nei' }, false, true],
      [{ qt_forlengelse: 'nei', qt_legemiddel: 'ukjent' }, undefined, false],
      [{ qt_forlengelse: 'ukjent', qt_legemiddel: 'ja' }, true, false],
    ],
    'svar.eldre': ELDRE_65_ELLER_ELDRE,
  },
  'seponering-vortioksetin': { 'pasientforhold.under_18': UNDER_18_ALDER, 'pasientforhold.ustabil_dose_eller_bytte': USTABIL, 'svar.eldre': ELDRE_65_ELLER_ELDRE },
  'bytte-escitalopram-sertralin': k2('escitalopram'),
  'bytte-citalopram-sertralin': k2('citalopram'),
  'kryssnedtrapping-sertralin-mirtazapin': { 'bekreftet.serotonerg_sammedisinering': serotonerg('serotonerge_mirtazapin') },
  'depot-aripiprazol-maintena': { 'bekreftet.indikasjon': depotindikasjon('stabilisert_aripiprazol') },
  'depot-paliperidon-xeplion': { 'bekreftet.indikasjon': depotindikasjon('stabilisert_paliperidon') },
  'depot-risperidon-xeplion': { 'pasientforhold.over_65': OVER_65, 'bekreftet.indikasjon': depotindikasjon('stabilisert_risperidon') },
  'antipsykotikabytte-olanzapin-aripiprazol': k3('olanzapin'),
  'antipsykotikabytte-risperidon-aripiprazol': k3('risperidon'),
  'tillegg-valproat-lamotrigin': {
    'pasientforhold.under_18': UNDER_18_ALDER,
    // Valproat brukes fast og fortsetter uendret: «Nei» på om valproat skal endres, bekrefter.
    'bekreftet.fortsetter_valproat': [
      [{ valproat_fast: 'ja', valproat_endres: 'nei' }, true, true],
      [{ valproat_fast: 'nei', valproat_endres: 'nei' }, false, false],
      [{ valproat_fast: 'ja', valproat_endres: 'ja' }, false, false],
      [{ valproat_fast: 'ja', valproat_endres: 'ukjent' }, false, false],
    ],
    // Det svangerskapsforebyggende programmet: bare når pasienten kan bli gravid, og begge vilkårene for indikasjonen må være oppfylt.
    'bekreftet.ppp_indikasjon': [
      [{ kan_bli_gravid: 'ja', ppp_annen_behandling: 'ja', ppp_spesialist: 'ja' }, true, true],
      [{ kan_bli_gravid: 'ja', ppp_annen_behandling: 'nei', ppp_spesialist: 'ja' }, false, false],
      [{ kan_bli_gravid: 'ja', ppp_annen_behandling: 'ja', ppp_spesialist: 'nei' }, false, false],
      [{ kan_bli_gravid: 'ja', ppp_annen_behandling: 'ja', ppp_spesialist: 'ukjent' }, false, false],
      [{ kan_bli_gravid: 'ukjent' }, false, false],
      [{ kan_bli_gravid: 'nei', ppp_annen_behandling: 'nei' }, false, true],
    ],
    'bekreftet.ppp_prevensjon': [
      [{ kan_bli_gravid: 'ja', ppp_prevensjon: 'ja' }, true, true],
      [{ kan_bli_gravid: 'ja', ppp_prevensjon: 'nei' }, false, false],
      [{ kan_bli_gravid: 'ja', ppp_prevensjon: 'ukjent' }, false, false],
    ],
  },
  'tillegg-litium-lamotrigin': {
    'pasientforhold.under_18': UNDER_18_ALDER,
    'pasientforhold.valproat_eller_induserende': [
      [{ bruker_valproat: 'ja', induserer_glukuronidering: 'nei' }, true, false],
      [{ bruker_valproat: 'nei', induserer_glukuronidering: 'ja' }, true, false],
      [{ bruker_valproat: 'nei', induserer_glukuronidering: 'nei' }, false, true],
      [{ bruker_valproat: 'ukjent', induserer_glukuronidering: 'nei' }, undefined, false],
    ],
    // Litium brukes fast, fortsetter uendret, og serumlitium er kontrollert.
    'bekreftet.fortsetter_litium': [
      [{ litium_fast: 'ja', litium_endres: 'nei', serumlitium: 'ja' }, true, true],
      [{ litium_fast: 'nei', litium_endres: 'nei', serumlitium: 'ja' }, false, false],
      [{ litium_fast: 'ja', litium_endres: 'ja', serumlitium: 'ja' }, false, false],
      [{ litium_fast: 'ja', litium_endres: 'nei', serumlitium: 'nei' }, false, false],
      [{ litium_fast: 'ja', litium_endres: 'nei', serumlitium: 'ukjent' }, false, false],
    ],
  },
}

/** Feltet motoren leser for betingelsen. */
const feltFor = (b: Pick<Katalogbetingelse, 'type' | 'id'>): Felt => `${b.type === 'unntak' ? 'pasientforhold' : b.type === 'sporsmal' ? 'svar' : 'bekreftet'}.${b.id}`

describe('etterprøvingen mot regelens egne svar, for hver aktiv regel', () => {
  it('omfatter de tolv reglene appen bruker med katalog', () => {
    expect(AKTIVE.map((r) => r.id).sort()).toEqual(Object.keys(FASIT).sort())
  })

  it.each(AKTIVE.map((r) => [r.id, r] as const))('%s: samme motorinndata og sperre i hver svarkombinasjon, katalogens forklaring ved hvert stopp, og ingen plan ved «Vet ikke» eller ubesvart', (_, r) => {
    const e = etterprov(r, KATALOG)
    expect(e.avvik).toEqual([])
    expect(e.kombinasjoner).toBeGreaterThan(e.betingelser)
    expect(e.uavklart).toBeGreaterThan(0)
  }, 60_000)

  it('oppdager en avbildning som ikke stemmer med regelens svar: et stopp uten katalogens forklaring', () => {
    const r = regel('seponering-escitalopram-tabletter-og-draper')
    const katalog = KATALOGBETINGELSER.map((b) => (b.regel === r.id && b.id === 'qt_forlengelse' ? { ...b, forklaring: undefined, fra: (b.fra ?? []).map((k) => ({ ...k, forklaring: undefined })) } : b))
    const g: Flytgrunnlag = { katalog, kontrollerte: [{ regel: r.id, regelversjon: r.versjon, fingeravtrykk: fingeravtrykk(r), katalogavtrykk: katalogavtrykk(r, katalog), dato: '', av: 'Test', merknad: '' }] }
    expect(etterprov(r, g).avvik.some((a) => a.betingelse === 'unntak:qt_forlengelse')).toBe(true)
  })
})

describe('fasiten fra regelens tekst (betingelser med flere spørsmål, andre svar enn Ja/Nei, eller omvendt retning)', () => {
  it('oppdager en avbildning med feil retning, som etterprøvingen alene ikke ser', () => {
    const r = regel('antipsykotikabytte-olanzapin-aripiprazol')
    // «Stabil» uten omvendt retning: da ville «Ja» på at pasienten er stabil, gjøre unntaket sant.
    const katalog = KATALOGBETINGELSER.map((b) => (b.regel === r.id && b.id === 'tilbakefall_innlagt' ? { ...b, fra: (b.fra ?? []).map((k) => (k.sporsmal === 'stabil' ? { sporsmal: 'stabil' } : k)) } : b))
    const g: Flytgrunnlag = { katalog, kontrollerte: [{ regel: r.id, regelversjon: r.versjon, fingeravtrykk: fingeravtrykk(r), katalogavtrykk: katalogavtrykk(r, katalog), dato: '', av: 'Test', merknad: '' }] }
    const [svar, forventet] = TILBAKEFALL[0]!
    expect(verdi(r, 'pasientforhold.tilbakefall_innlagt', svar, KATALOG).v).toBe(forventet)
    expect(verdi(r, 'pasientforhold.tilbakefall_innlagt', svar, g).v).not.toBe(forventet)
    expect(etterprov(r, g).avvik).toEqual([])
  }, 60_000)

  const tilfeller = Object.entries(FASIT).flatMap(([id, felt]) => Object.entries(felt).flatMap(([f, liste]) => (liste ?? []).map((t) => [id, f as Felt, ...t] as const)))
  it.each(tilfeller)('%s %s ved %j: verdi %s, plan %s', (id, felt, svar, forventet, plan) => {
    const r = regel(id)
    const { f, v } = verdi(r, felt, svar, KATALOG)
    expect(v).toBe(forventet)
    expect(girPlan(f)).toBe(plan)
    // Før: regelens egne svar for de samme feltene gir samme verdi og samme sperre.
    const for_ = vurderFlyt(r, regelensSvar(r, f.felt), RESERVE)
    expect(for_.felt).toEqual(f.felt)
    if (!plan) expect(girPlan(for_) && f.sporsmal.every((s) => s.valgt !== undefined && s.valgt !== 'ukjent')).toBe(false)
  })

  it('dekker hver betingelse som ikke har ett spørsmål der «Ja» gjør den sann og «Nei» usann; de andre er nettopp slik', () => {
    for (const r of AKTIVE) {
      const o = flytoppsett(r, KATALOG)
      for (const a of o.avbildninger) {
        const enkel = a.fra.length === 1 && !a.fra[0]!.ja && !a.fra[0]!.nei
        const felt = feltFor(a)
        if (!enkel) {
          expect(FASIT[r.id]?.[felt], `${r.id} ${felt} mangler i fasiten`).toBeDefined()
          continue
        }
        // Ett spørsmål: «Ja» gjør betingelsen sann, «Nei» usann, og «Vet ikke» eller ubesvart gir ingen verdi.
        const id = a.fra[0]!.sporsmal
        const s = o.sporsmal.find((x) => x.id === id)!
        // Med svarene som viser spørsmålet, om det bare vises etter et annet svar.
        const apning = apningssvar(r, o, id)
        expect(s.alternativer.map((x) => x.verdi).slice(0, 2), `${r.id} ${id}`).toEqual(['ja', 'nei'])
        expect(verdi(r, felt, { ...apning, [id]: 'ja' }, KATALOG).v, `${r.id} ${felt} ja`).toBe(true)
        expect(verdi(r, felt, { ...apning, [id]: 'nei' }, KATALOG).v, `${r.id} ${felt} nei`).toBe(false)
        if (!felt.startsWith('bekreftet.')) {
          expect(verdi(r, felt, { ...apning, [id]: undefined }, KATALOG).v, `${r.id} ${felt} ubesvart`).toBeUndefined()
          if (s.alternativer.some((x) => x.verdi === 'ukjent')) expect(verdi(r, felt, { ...apning, [id]: 'ukjent' }, KATALOG).v, `${r.id} ${felt} vet ikke`).toBeUndefined()
        }
      }
    }
  })
})

describe('særskilte kontroller etter integrasjonen med spor B', () => {
  describe('escitalopram: lang behandlingstid, med preparatene i FEST (forhåndskontrollen fra spor B)', () => {
    const r = regel('seponering-escitalopram-tabletter-og-draper')
    const uttrekkene = lesUttrekkene()
    const ESC = { fra: { nokkel: 'escitalopram', formulering: 'standard' as const } }
    const uttrekk = uttrekkFor(ESC, uttrekkene)
    const tilstand = (dose: string, legemiddelform: string, svar: Record<string, string | undefined>) =>
      flyttilstand({
        verktoy: VERKTOY.find((v) => v.type === 'seponering')!,
        valg: ESC,
        regelsett: REGELSETT,
        sperrer: [],
        regel: r,
        skjema: { ...TOMT_SKJEMA, startdose: dose, formvalg: { fra: { legemiddelform } }, flytsvar: tillatendeSvar(r, KATALOG, svar) },
        utvalg: uttrekkene[uttrekk]!.utvalg,
        naa: tidFor({ uttrekk: 'pilot' }, { pilot: uttrekkene[uttrekk]!, aksept: uttrekkene[uttrekk]! }),
        flytgrunnlag: KATALOG,
      })
    it.each([
      ['10', '53'],
      ['20', '53'],
      ['10', '748'],
      ['20', '748'],
    ])('%s mg, form %s: «Ja» stopper ved spørsmålet med katalogens forklaring, «Nei» gir plan, «Vet ikke» gir ingen plan', (dose, form) => {
      const ja = tilstand(dose, form, { lang_behandlingstid: 'ja' })
      expect(ja.tilstand.kontroll.utfall).toBe('kan_ikke')
      expect(ja.tilstand.kontroll.grunner).toEqual([
        expect.objectContaining({
          sporsmal: 'lang_behandlingstid',
          tekst: 'Den godkjente planen gjelder bare kort behandlingstid. Etter lang bruk anbefales vanligvis mindre reduksjoner og en langsommere, symptomstyrt nedtrapping. Nedtrappingen må planlegges individuelt.',
        }),
      ])
      expect(tilstand(dose, form, { lang_behandlingstid: 'nei' }).tilstand).toMatchObject({ steg: 'plan', kontroll: { utfall: 'kan_lages_hvis', gjenstar: 0 } })
      expect(tilstand(dose, form, { lang_behandlingstid: 'ukjent' }).tilstand.steg).not.toBe('plan')
    })
  })

  it.each(['bytte-escitalopram-sertralin', 'bytte-citalopram-sertralin'])('%s: 64 og 65 år gir plan, 66 år stopper med forklaring', (id) => {
    const r = regel(id)
    const ved = (svar: Record<string, string>) => vurderFlyt(r, tillatendeSvar(r, KATALOG, svar), KATALOG)
    expect(girPlan(ved({ alder: '18_64' }))).toBe(true)
    expect(girPlan(ved({ alder: '65_eller_eldre', eldre_enn_65: 'nei' }))).toBe(true)
    const over = ved({ alder: '65_eller_eldre', eldre_enn_65: 'ja' })
    expect(girPlan(over)).toBe(false)
    expect(over.stopp.find((x) => x.sporsmal === 'eldre_enn_65')?.tekst).toMatch(/over 65 år/)
  })

  it('hvert sikkerhetskritiske stoppforhold i stoppgruppen spør med Ja / Nei / Vet ikke, eller med alder, oppfølging eller årsak med «Vet ikke»', () => {
    for (const r of AKTIVE)
      for (const s of flytoppsett(r, KATALOG).sporsmal.filter((x) => x.gruppe === 'stopp' && x.kategori === 'sikkerhetsopplysning')) {
        const tekster = s.alternativer.map((a) => a.tekst)
        expect(tekster.at(-1), `${r.id} ${s.id}`).toBe('Vet ikke')
        if (tekster.length === 3) expect(tekster, `${r.id} ${s.id}`).toEqual(['Ja', 'Nei', 'Vet ikke'])
      }
  })

  it('ingen standard-ID fra reservevisningen i katalogen for en aktiv regel', () => {
    for (const r of AKTIVE) expect(flytoppsett(r, KATALOG).sporsmal.filter((s) => s.id.startsWith(standardId('unntak', '').split(':')[0]!))).toEqual([])
  })
})
