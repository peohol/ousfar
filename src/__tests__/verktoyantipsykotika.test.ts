/**
 * K3: bytte av antipsykotika (`docs/verktøy-k3-antipsykotika.md`).
 *
 * - De fem regelutkastene består kontrollene (kilder, kildeoppføringer og
 *   regneeksempler), står til uavhengig faglig kontroll og er ikke klinisk
 *   godkjent; verktøysiden gir derfor ingen klinisk plan for dem.
 * - Med en simulert godkjenning av nøyaktig versjonen og fingeravtrykket gir
 *   hvert forløp en komplett plan med norske preparater fra FEST: det gamle
 *   stoppes, og det nye står på et fast eller definert regime.
 * - Varianter kildene ikke dekker, stopper eksplisitt: doser utenfor
 *   preparatomtalen, styrker FEST ikke har, ubesvarte unntak, en endret regel
 *   etter godkjenningen og en FEST-kopi eldre enn 48 timer.
 *
 * Alle doser her er syntetiske eksempler; ingen pasientopplysninger.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Planskjema } from '../verktoy/doseplan'
import { KOMPLETT } from '../verktoy/planvisning'
import { VERKTOY } from '../verktoy/register'
import { FEST_AKSEPTTEST } from '../verktoy/regler/aksepttest'
import { ANTIPSYKOTIKASETT, FEST_ANTIPSYKOTIKA } from '../verktoy/regler/antipsykotikabytter'
import { erKliniskGodkjent, fingeravtrykk } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett } from '../verktoy/regler/kontroll'
import type { Regel } from '../verktoy/regler/modell'
import { kjorKasus, simulerGodkjenning, type Pilotkasus, type Uttrekkene } from '../verktoy/regler/pilotmatrise'
import { REGELSETT, REGELSETTENE, tilgjengelighet, type Verktoyvalg } from '../verktoy/tilgjengelighet'

const les = (f: string) => JSON.parse(readFileSync(f, 'utf8'))
const UTTREKKENE: Uttrekkene = { pilot: les(FEST_ANTIPSYKOTIKA), aksept: les(FEST_AKSEPTTEST) }
const BYTTE = VERKTOY.find((v) => v.id === 'bytte-antipsykotikum')!

type Formulering = Verktoyvalg['fra']['formulering']
const valg = (fra: [string, Formulering], til: [string, Formulering]): Verktoyvalg => ({ fra: { nokkel: fra[0], formulering: fra[1] }, til: { nokkel: til[0], formulering: til[1] } })
const VALG = {
  'depot-risperidon-xeplion': valg(['risperidon', 'standard'], ['paliperidon', 'ER']),
  'depot-consta-xeplion': valg(['risperidon', 'LA'], ['paliperidon', 'ER']),
  'antipsykotikabytte-aripiprazol-olanzapin': valg(['aripiprazol', 'standard'], ['olanzapin', 'standard']),
  'antipsykotikabytte-aripiprazol-risperidon': valg(['aripiprazol', 'standard'], ['risperidon', 'standard']),
  'antipsykotikabytte-kariprazin-kvetiapin': valg(['kariprazin', 'standard'], ['kvetiapin', 'standard']),
} as const
type Regelid = keyof typeof VALG

const regel = (id: string) => ANTIPSYKOTIKASETT.regler.find((r) => r.id === id)!
const TABLETTER = { legemiddelform: '53' }

/** Kopien av regelen godkjent (simulert) med nøyaktig versjonen og fingeravtrykket; `etterpa` endrer den etter godkjenningen. */
const godkjent = (id: string, etterpa?: (r: Regel) => void) => ({
  id,
  endre: {
    hva: 'simulert godkjenning',
    endre: (r: Regel) => {
      simulerGodkjenning(r, { id, versjon: r.versjon, fingeravtrykk: fingeravtrykk(r) }, '2026-11-03')
      etterpa?.(r)
    },
  },
})

/** Kasuset gjennom samme vei som verktøysiden, med regelen godkjent (simulert) og FEST-kopien fra K3. */
const kjor = (id: Regelid, dose: string, skjema: Partial<Planskjema> = {}, ekstra: Partial<Pilotkasus> = {}) =>
  kjorKasus({ id, kategori: 'vanlig_dose', hva: id, verktoy: BYTTE.id, valg: VALG[id], uttrekk: 'pilot', dose, skjema, regel: godkjent(id), forventet: { utfall: 'plan', linjer: [] }, ...ekstra }, UTTREKKENE)

/** Radene i planen; et annet utfall gir ingen rader, så forventningen feiler med utfallet i meldingen. */
const linjer = (u: ReturnType<typeof kjor>): string[] => (u.utfall === 'plan' ? u.linjer : [JSON.stringify(u)])
const grunner = (u: ReturnType<typeof kjor>) => ('grunner' in u ? u.grunner.join(' ') : JSON.stringify(u))

describe('K3: regelutkastene for bytte av antipsykotika', () => {
  it('består kontrollene, med kildene, kildeoppføringene og regneeksemplene', () => {
    expect(kontrollerRegelsett(ANTIPSYKOTIKASETT)).toEqual([])
    expect(ANTIPSYKOTIKASETT.regler.map((r) => r.id)).toEqual(Object.keys(VALG))
    for (const r of ANTIPSYKOTIKASETT.regler) {
      expect(r.beregnbarhet, r.id).toBe('entydig_beregnbar')
      expect(r.eksempler.some((e) => !e.stopp), `${r.id}: minst ett komplett forløp`).toBe(true)
      expect(r.eksempler.some((e) => e.stopp), `${r.id}: minst ett stopp`).toBe(true)
    }
  })

  it('er alle til faglig kontroll og ikke klinisk godkjent, så verktøysiden gir ingen klinisk plan', () => {
    for (const r of ANTIPSYKOTIKASETT.regler) {
      expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
      expect(r.versjon, r.id).toBe(1)
      expect(erKliniskGodkjent(r), r.id).toBe(false)
    }
    for (const [id, v] of Object.entries(VALG)) {
      const t = tilgjengelighet(BYTTE, v)
      expect(t.status, id).toBe('til_kontroll')
      expect(t.regler.map((r) => r.id), id).toContain(id)
      const u = kjorKasus({ id, kategori: 'vanlig_dose', hva: id, verktoy: BYTTE.id, valg: v, uttrekk: 'pilot', dose: '4', forventet: { utfall: 'ingen', status: 'til_kontroll' } }, UTTREKKENE)
      expect(u, id).toMatchObject({ utfall: 'ingen', status: 'til_kontroll' })
    }
  })

  it('er et eget regelsett i appen, uten å endre de andre settene eller godkjenningene', () => {
    expect(REGELSETTENE.map((s) => s.id)).toContain(ANTIPSYKOTIKASETT.id)
    for (const r of ANTIPSYKOTIKASETT.regler) expect(REGELSETT.regler).toContain(r)
    const andre = REGELSETTENE.filter((s) => s !== ANTIPSYKOTIKASETT).flatMap((s) => s.regler)
    expect(andre.map((r) => r.id).filter((id) => id in VALG)).toEqual([])
  })
})

describe('K3: komplette forløp med simulert godkjenning og norske preparater fra FEST', () => {
  it('peroral risperidon → Xeplion: risperidon seponeres, oppstart 150/100 mg og månedlig valgt vedlikehold', () => {
    expect(linjer(kjor('depot-risperidon-xeplion', '4', { maldose: '75', startdato: '2026-12-01' }))).toEqual([
      'Fra dag 1 (fra 01.12.2026): Risperidon peroralt: Seponert',
      'Dag 1 (01.12.2026): Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)',
      'Dag 8 (08.12.2026): Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)',
      'Hver måned fra 1 måned etter dag 8 (første 08.01.2027): Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)',
    ])
    // Ved grensene i preparatomtalen: 150 mg gir plan, 25 mg finnes ikke som Xeplion i FEST og stopper.
    expect(linjer(kjor('depot-risperidon-xeplion', '16', { maldose: '150' })).at(-1)).toMatch(/150 mg = 1 injeksjon à 150 mg/)
    expect(grunner(kjor('depot-risperidon-xeplion', '4', { maldose: '25' }))).toMatch(/vedlikeholdet er 25 mg, men FEST har ingen brukbar injeksjon med den styrken/)
    expect(kjor('depot-risperidon-xeplion', '4', { maldose: '175' }).utfall).not.toBe('plan')
    expect(kjor('depot-risperidon-xeplion', '17', { maldose: '75' }).utfall).not.toBe('plan')
  })

  it('Risperdal Consta → Xeplion: Xeplion i stedet for neste Consta-injeksjon, dosen fra tabellen, deretter månedlig', () => {
    expect(linjer(kjor('depot-consta-xeplion', '37,5', { startdato: '2026-12-15' }))).toEqual([
      'Fra dag 1 (fra 15.12.2026): Risperidon depotinjeksjon: Seponert = ingen flere injeksjoner',
      'Dag 1 (15.12.2026): Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (deltoideus eller setemuskel)',
      'Hver måned fra 1 måned etter dag 1 (første 15.01.2027): Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)',
    ])
    for (const [consta, xeplion] of [['25', 50], ['50', 100]] as const) {
      expect(linjer(kjor('depot-consta-xeplion', consta)).at(-1)).toMatch(new RegExp(`${xeplion} mg = 1 injeksjon à ${xeplion} mg \\(±7 dager`))
    }
    expect(kjor('depot-consta-xeplion', '62,5').utfall).not.toBe('plan')
    expect(grunner(kjor('depot-consta-xeplion', '37,5', {}, { ubesvart: ['over_65'] }))).toMatch(/over 65 år/)
  })

  it('aripiprazol → olanzapin: aripiprazol stoppes og olanzapin 10 mg daglig fra dag 1', () => {
    // Olanzapin finnes i flere legemiddelformer i FEST; forskriveren velger tabletter. Aripiprazol bare stoppes, så formen spørres ikke om.
    expect(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15')).toEqual({ utfall: 'formvalg', forlop: ['til'] })
    expect(linjer(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { formvalg: { til: TABLETTER } }))).toEqual([
      'Fra dag 1: Aripiprazol peroralt: Seponert; Olanzapin peroralt: 10 mg = 1 tablett à 10 mg',
    ])
    expect(kjor('antipsykotikabytte-aripiprazol-olanzapin', '30', { formvalg: { til: TABLETTER } }).utfall).toBe('plan')
    expect(kjor('antipsykotikabytte-aripiprazol-olanzapin', '5', { formvalg: { til: TABLETTER } }).utfall).not.toBe('plan')
    expect(grunner(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { formvalg: { til: TABLETTER }, pasientforhold: { cyp1a2_hemmer: true } }))).toMatch(/CYP1A2/)
  })

  it('aripiprazol → risperidon: 2 mg dag 1 og 4 mg daglig fra dag 2', () => {
    expect(linjer(kjor('antipsykotikabytte-aripiprazol-risperidon', '15'))).toEqual([
      'Dag 1: Aripiprazol peroralt: Seponert; Risperidon peroralt: 2 mg = 1 tablett à 2 mg',
      'Fra dag 2: Risperidon peroralt: 4 mg = 1 tablett à 4 mg',
    ])
    expect(grunner(kjor('antipsykotikabytte-aripiprazol-risperidon', '15', {}, { ubesvart: ['alder_65'] }))).toMatch(/65 år/)
  })

  it('kariprazin → kvetiapin: kvetiapin 50, 100 og 200 mg de tre første dagene og 300 mg daglig fra dag 4, fordelt på to doser', () => {
    expect(linjer(kjor('antipsykotikabytte-kariprazin-kvetiapin', '4,5'))).toEqual([
      'Dag 1: Kariprazin peroralt: Seponert; Kvetiapin peroralt: 50 mg, fordelt på 2 doser: 25 + 25 mg = 2 tabletter à 25 mg',
      'Dag 2: Kvetiapin peroralt: 100 mg, fordelt på 2 doser: 50 + 50 mg = 4 tabletter à 25 mg',
      'Dag 3: Kvetiapin peroralt: 200 mg, fordelt på 2 doser: 100 + 100 mg = 2 tabletter à 100 mg',
      'Fra dag 4: Kvetiapin peroralt: 300 mg, fordelt på 2 doser: 200 + 100 mg (ulik fordeling) = 1 tablett à 100 mg + 1 tablett à 200 mg',
    ])
    expect(kjor('antipsykotikabytte-kariprazin-kvetiapin', '1,5').utfall).toBe('plan')
    expect(kjor('antipsykotikabytte-kariprazin-kvetiapin', '6').utfall).toBe('plan')
    expect(kjor('antipsykotikabytte-kariprazin-kvetiapin', '7,5').utfall).not.toBe('plan')
    expect(grunner(kjor('antipsykotikabytte-kariprazin-kvetiapin', '4,5', { pasientforhold: { cyp3a4_hemmer: true } }))).toMatch(/CYP3A4/)
  })
})

describe('K3: planutfallet', () => {
  it('hvert forløp er en komplett plan til sluttmålet, ikke en delplan', () => {
    const planer = [
      kjor('depot-risperidon-xeplion', '4', { maldose: '75' }),
      kjor('depot-consta-xeplion', '37,5'),
      kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { formvalg: { til: TABLETTER } }),
      kjor('antipsykotikabytte-aripiprazol-risperidon', '15'),
      kjor('antipsykotikabytte-kariprazin-kvetiapin', '4,5'),
    ]
    for (const u of planer) {
      expect(u.utfall).toBe('plan')
      expect(u.tekst).toContain(KOMPLETT)
      expect(u.tekst).not.toMatch(/Delplan/)
    }
  })
})

describe('K3: sikkerhetslåsene gjelder også de nye reglene', () => {
  it('en regel endret etter godkjenningen gir ingen plan, fordi fingeravtrykket ikke stemmer', () => {
    const endret = godkjent('antipsykotikabytte-kariprazin-kvetiapin', (r) => {
      r.inndata = r.inndata.map((i) => (i.navn === 'startdose' ? { ...i, omrade: [1.5, 9] as [number, number] } : i))
    })
    const u = kjor('antipsykotikabytte-kariprazin-kvetiapin', '4,5', {}, { regel: endret })
    expect(u.utfall).toBe('stopp')
    expect(grunner(u)).toMatch(/endret etter godkjenningen \(fingeravtrykket stemmer ikke\)/)
  })

  it('FEST-kopien må være fersk: 47 timer gir plan, 49 timer gir ingen', () => {
    expect(kjor('depot-risperidon-xeplion', '4', { maldose: '75' }, { timer: 47 }).utfall).toBe('plan')
    const u = kjor('depot-risperidon-xeplion', '4', { maldose: '75' }, { timer: 49 })
    expect(u.utfall).toBe('stopp')
    expect(grunner(u)).toMatch(/sist kontrollert mot FEST/)
  })

  it('uten simulert godkjenning gir den samme regelen ingen plan', () => {
    const u = kjor('depot-risperidon-xeplion', '4', { maldose: '75' }, { regel: { id: 'depot-risperidon-xeplion' } })
    expect(u.utfall).toBe('stopp')
    expect(grunner(u)).toMatch(/til faglig kontroll, ikke klinisk godkjent/)
    expect(regel('depot-risperidon-xeplion').godkjenning.status).toBe('til_faglig_kontroll')
  })
})
