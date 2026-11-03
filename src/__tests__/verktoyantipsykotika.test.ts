/**
 * K3: bytte av antipsykotika (`docs/verktøy-k3-antipsykotika.md`).
 *
 * - De sju regelutkastene består kontrollene (kilder, kildeoppføringer og
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
import { startdosenavn, type Planskjema } from '../verktoy/doseplan'
import { KOMPLETT } from '../verktoy/planvisning'
import { VERKTOY } from '../verktoy/register'
import { FEST_AKSEPTTEST } from '../verktoy/regler/aksepttest'
import { ANTIPSYKOTIKASETT, FEST_ANTIPSYKOTIKA } from '../verktoy/regler/antipsykotikabytter'
import { erKliniskGodkjent, fingeravtrykk } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett } from '../verktoy/regler/kontroll'
import { apneValg, type Regel } from '../verktoy/regler/modell'
import { kjorKasus, SIMULERT_KONTROLLOR, simulerGodkjenning, type Pilotkasus, type Uttrekkene } from '../verktoy/regler/pilotmatrise'
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
  'antipsykotikabytte-olanzapin-aripiprazol': valg(['olanzapin', 'standard'], ['aripiprazol', 'standard']),
  'antipsykotikabytte-risperidon-aripiprazol': valg(['risperidon', 'standard'], ['aripiprazol', 'standard']),
} as const
/**
 * Regler med åpne OUSFAR-valg som kontrolløren må avklare: aripiprazoldosen første og andre uke i byttene til
 * aripiprazol, tiden på startregimet før den valgte måldosen i byttene fra aripiprazol, og avgrensningen til
 * 4–6 mg risperidon før Xeplion.
 */
const MED_APNE_VALG = [
  'depot-risperidon-xeplion',
  'antipsykotikabytte-olanzapin-aripiprazol',
  'antipsykotikabytte-risperidon-aripiprazol',
  'antipsykotikabytte-aripiprazol-olanzapin',
  'antipsykotikabytte-aripiprazol-risperidon',
]
/** Versjonene etter kontrollørens gjennomganger av #320 (03.11.2026); de andre er versjon 1. */
const VERSJON: Partial<Record<string, number>> = {
  'depot-risperidon-xeplion': 5,
  'depot-consta-xeplion': 2,
  'antipsykotikabytte-aripiprazol-olanzapin': 2,
  'antipsykotikabytte-aripiprazol-risperidon': 2,
  'antipsykotikabytte-kariprazin-kvetiapin': 2,
  'antipsykotikabytte-olanzapin-aripiprazol': 3,
  'antipsykotikabytte-risperidon-aripiprazol': 3,
}
/** Krever skriftlig begrunnelse (ordlyden om over eller under grensen er motorens). */
const BEGRUNNES = /krever en skriftlig begrunnelse/
type Regelid = keyof typeof VALG

const regel = (id: string) => ANTIPSYKOTIKASETT.regler.find((r) => r.id === id)!
const TABLETTER = { legemiddelform: '53' }

/** De åpne OUSFAR-valgene avklart på kopien (simulert), slik kontrolløren ville gjort før en godkjenning. */
const avklar = (x: unknown): void => {
  if (Array.isArray(x)) x.forEach(avklar)
  else if (x && typeof x === 'object') {
    const g = x as { type?: string; avklaring?: unknown }
    if (g.type === 'ousfar_vurdering') g.avklaring = { dato: '2026-11-03', av: SIMULERT_KONTROLLOR, rolle: 'uavhengig_kontrollor', regelversjon: 1, merknad: 'Simulert; ingen avklaring.' }
    Object.values(x).forEach(avklar)
  }
}

/** Kopien av regelen godkjent (simulert) med nøyaktig versjonen og fingeravtrykket; `etterpa` endrer den etter godkjenningen. */
const godkjent = (id: string, etterpa?: (r: Regel) => void) => ({
  id,
  endre: {
    hva: 'simulert godkjenning',
    endre: (r: Regel) => {
      avklar(r)
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

/** FEST-kopien uten pakningene med navn som passer `navn`: et preparat som mangler i FEST. */
const utenPakninger = (uttrekk: Uttrekkene['pilot'], navn: RegExp): Uttrekkene['pilot'] => {
  const kopi = structuredClone(uttrekk) as { utvalg: { pakninger: { navn_form_styrke: string }[] } }
  kopi.utvalg.pakninger = kopi.utvalg.pakninger.filter((p) => !navn.test(p.navn_form_styrke))
  return kopi as unknown as Uttrekkene['pilot']
}

describe('K3: regelutkastene for bytte av antipsykotika', () => {
  it('består kontrollene, med kildene, kildeoppføringene og regneeksemplene', () => {
    expect(kontrollerRegelsett(ANTIPSYKOTIKASETT)).toEqual([])
    expect(ANTIPSYKOTIKASETT.regler.map((r) => r.id)).toEqual(Object.keys(VALG))
    for (const r of ANTIPSYKOTIKASETT.regler) {
      expect(r.beregnbarhet, r.id).toBe(MED_APNE_VALG.includes(r.id) ? 'beregnbar_etter_avklaring' : 'entydig_beregnbar')
      expect(apneValg(r).length > 0, r.id).toBe(MED_APNE_VALG.includes(r.id))
      expect(r.eksempler.some((e) => !e.stopp), `${r.id}: minst ett komplett forløp`).toBe(true)
      expect(r.eksempler.some((e) => e.stopp), `${r.id}: minst ett stopp`).toBe(true)
    }
  })

  it('er alle til faglig kontroll og ikke klinisk godkjent, så verktøysiden gir ingen klinisk plan', () => {
    for (const r of ANTIPSYKOTIKASETT.regler) {
      expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
      expect(r.versjon, r.id).toBe(VERSJON[r.id] ?? 1)
      expect(r.godkjenning.historikk.at(-1)?.regelversjon, r.id).toBe(r.versjon)
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
    // Planen gjelder bare 4–6 mg risperidon, dosen de fleste har effekt av: grensene gir en plan, alt utenfor stopper, også de usannsynlige yttertilfellene.
    for (const risperidon of ['4', '5', '6']) expect(linjer(kjor('depot-risperidon-xeplion', risperidon, { maldose: '75' })).at(-1), risperidon).toMatch(/75 mg = 1 injeksjon à 75 mg/)
    for (const risperidon of ['0,5', '2', '3,5', '6,5', '8', '16']) {
      expect(grunner(kjor('depot-risperidon-xeplion', risperidon, { maldose: '75' })), risperidon).toMatch(new RegExp(`Startdosen ${risperidon} mg er utenfor det regelen gjelder for \\(4–6 mg\\)`))
    }
    // En annen vedlikeholdsdose stopper, også med begrunnelse: regelen kan ikke stå for at den passer til risperidondosen.
    const FRITEKST = { begrunnelse: 'Syntetisk eksempel: fedme og tidligere effekt.' }
    for (const [risperidon, xeplion] of [['4', '100'], ['5', '50'], ['6', '150']] as const) {
      expect(grunner(kjor('depot-risperidon-xeplion', risperidon, { maldose: xeplion, ...FRITEKST })), `${risperidon} → ${xeplion}`).toMatch(new RegExp(`Måldosen ${xeplion} mg er utenfor det regelen gjelder for \\(75 mg\\)`))
    }
    // Ved grensene i preparatomtalen: 25 og 175 mg og risperidon 17 mg stopper.
    expect(kjor('depot-risperidon-xeplion', '4', { maldose: '25', ...FRITEKST }).utfall).not.toBe('plan')
    expect(kjor('depot-risperidon-xeplion', '4', { maldose: '175', ...FRITEKST }).utfall).not.toBe('plan')
    expect(kjor('depot-risperidon-xeplion', '17', { maldose: '75' }).utfall).not.toBe('plan')
    // Den strukturerte vurderingen: effekt og toleranse av dagens dose må bekreftes, og overvekt eller fedme stopper.
    expect(grunner(kjor('depot-risperidon-xeplion', '4', { maldose: '75', bekreftet: ['indikasjon', 'tidligere_toleranse'] }))).toMatch(/god og stabil effekt, uten bivirkninger som har begrenset dosen/)
    expect(grunner(kjor('depot-risperidon-xeplion', '4', { maldose: '75', pasientforhold: { overvekt: true } }))).toMatch(/Pasienten har overvekt eller fedme/)
    expect(grunner(kjor('depot-risperidon-xeplion', '4', { maldose: '75' }, { ubesvart: ['overvekt'] }))).toMatch(/overvekt eller fedme/)
    // Uten kontrollørens avklaring av avgrensningen gir regelen ingen plan, selv om den ellers var godkjent.
    expect(apneValg(regel('depot-risperidon-xeplion'))).toEqual(['inndata.startdose (åpent forslag)'])
    // Dokumentert tidligere toleranse er en egen bekreftelse.
    expect(grunner(kjor('depot-risperidon-xeplion', '4', { maldose: '75', bekreftet: ['indikasjon', 'effekt_toleranse'] }))).toMatch(/har tålt peroral risperidon over tid/)
  })

  it('et preparat som mangler i FEST, stopper planen i stedet for å bytte til et annet', () => {
    const uten150 = { ...UTTREKKENE, pilot: utenPakninger(UTTREKKENE.pilot, /^Xeplion .*150 mg/) }
    const u = kjorKasus({ id: 'uten-150', kategori: 'vanlig_dose', hva: 'uten Xeplion 150 mg', verktoy: BYTTE.id, valg: VALG['depot-risperidon-xeplion'], uttrekk: 'pilot', dose: '4', skjema: { maldose: '75' }, regel: godkjent('depot-risperidon-xeplion'), forventet: { utfall: 'stopp', grunner: [] } }, uten150)
    expect(u.utfall).not.toBe('plan')
    expect(grunner(u)).toMatch(/injeksjonen dag 1 er 150 mg, men FEST har ingen brukbar injeksjon med den styrken/)
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
    // Feltet og meldingene sier uttrykkelig at Consta-dosen er per injeksjon hver 2. uke, ikke en døgndose.
    expect(startdosenavn(regel('depot-consta-xeplion'))).toBe('Aktuell dose (mg per injeksjon hver 2. uke)')
    expect(grunner(kjor('depot-consta-xeplion', ''))).toMatch(/Aktuell dose \(mg per injeksjon hver 2\. uke\) må fylles inn/)
    expect(grunner(kjor('depot-consta-xeplion', '37,5', {}, { ubesvart: ['over_65'] }))).toMatch(/over 65 år/)
  })

  it('aripiprazol → olanzapin: aripiprazol stoppes, olanzapin 10 mg fra dag 1 og den valgte måldosen etter en ny vurdering', () => {
    // Olanzapin finnes i flere legemiddelformer i FEST; forskriveren velger tabletter. Aripiprazol bare stoppes, så formen spørres ikke om.
    expect(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { maldose: '15' })).toEqual({ utfall: 'formvalg', forlop: ['til'] })
    const T = { formvalg: { til: TABLETTER } }
    expect(linjer(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { ...T, maldose: '15', startdato: '2026-12-07' }))).toEqual([
      'Dag 1–7 (07.12.2026–13.12.2026): Aripiprazol peroralt: Seponert; Olanzapin peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 8 (14.12.2026): Vurdering (Olanzapin): Før endringen: Ny klinisk vurdering av effekt og bivirkninger, og av at aripiprazol er stoppet, før dosen endres.',
      'Fra dag 8 (fra 14.12.2026): Olanzapin peroralt: 15 mg = 2 tabletter à 7,5 mg',
    ])
    // Måldosen er startdosen: ingen endring og ingen vurdering.
    expect(linjer(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { ...T, maldose: '10' }))).toEqual(['Fra dag 1: Aripiprazol peroralt: Seponert; Olanzapin peroralt: 10 mg = 1 tablett à 10 mg'])
    // Grensene 5 og 20 mg gir plan; utenfor stopper; måldosen må velges.
    for (const maldose of ['5', '20']) expect(linjer(kjor('antipsykotikabytte-aripiprazol-olanzapin', '30', { ...T, maldose })).at(-1), maldose).toMatch(new RegExp(`Fra dag 8: Olanzapin peroralt: ${maldose} mg`))
    expect(grunner(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { ...T, maldose: '25' }))).toMatch(/Måldosen 25 mg er utenfor/)
    expect(grunner(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { ...T, maldose: '2,5' }))).toMatch(/Måldosen 2,5 mg er utenfor/)
    expect(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', T).utfall).not.toBe('plan')
    // Aripiprazoldosen ved grensene: 10 og 30 mg gir plan, 5 og 35 mg stopper.
    expect(kjor('antipsykotikabytte-aripiprazol-olanzapin', '10', { ...T, maldose: '10' }).utfall).toBe('plan')
    for (const dose of ['5', '35']) expect(grunner(kjor('antipsykotikabytte-aripiprazol-olanzapin', dose, { ...T, maldose: '10' })), dose).toMatch(new RegExp(`Startdosen ${dose} mg er utenfor`))
    expect(grunner(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { ...T, maldose: '10', pasientforhold: { cyp1a2_hemmer: true } }))).toMatch(/CYP1A2/)
  })

  it('aripiprazol → risperidon: 2 mg dag 1, 4 mg fra dag 2 og den valgte måldosen etter en ny vurdering', () => {
    expect(linjer(kjor('antipsykotikabytte-aripiprazol-risperidon', '15', { maldose: '6' })).filter((l) => !l.includes('Vurdering'))).toEqual([
      'Dag 1: Aripiprazol peroralt: Seponert; Risperidon peroralt: 2 mg = 1 tablett à 2 mg',
      'Dag 2–8: Risperidon peroralt: 4 mg = 1 tablett à 4 mg',
      'Fra dag 9: Risperidon peroralt: 6 mg = 2 tabletter à 3 mg',
    ])
    // Vurderingen står før hver doseendring.
    expect(linjer(kjor('antipsykotikabytte-aripiprazol-risperidon', '15', { maldose: '6' })).filter((l) => l.includes('Vurdering')).map((l) => l.split(':')[0])).toEqual(['Dag 2', 'Dag 9'])
    expect(linjer(kjor('antipsykotikabytte-aripiprazol-risperidon', '15', { maldose: '4' })).filter((l) => !l.includes('Vurdering'))).toEqual([
      'Dag 1: Aripiprazol peroralt: Seponert; Risperidon peroralt: 2 mg = 1 tablett à 2 mg',
      'Fra dag 2: Risperidon peroralt: 4 mg = 1 tablett à 4 mg',
    ])
    // Utenfor 4–6 mg krever en skriftlig begrunnelse; over 16 mg stopper også med begrunnelse.
    for (const maldose of ['3', '8']) expect(grunner(kjor('antipsykotikabytte-aripiprazol-risperidon', '15', { maldose })), maldose).toMatch(BEGRUNNES)
    expect(linjer(kjor('antipsykotikabytte-aripiprazol-risperidon', '15', { maldose: '8', begrunnelse: 'Syntetisk eksempel.' })).at(-1)).toMatch(/Fra dag 9: Risperidon peroralt: 8 mg/)
    expect(grunner(kjor('antipsykotikabytte-aripiprazol-risperidon', '15', { maldose: '20', begrunnelse: 'Syntetisk eksempel.' }))).toMatch(/Måldosen 20 mg er utenfor/)
    expect(grunner(kjor('antipsykotikabytte-aripiprazol-risperidon', '15', { maldose: '4' }, { ubesvart: ['alder_65'] }))).toMatch(/65 år/)
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
    // Bare doser kapslene gir (1,5, 3, 4,5 og 6 mg).
    for (const dose of ['2', '2,5', '5']) expect(grunner(kjor('antipsykotikabytte-kariprazin-kvetiapin', dose)), dose).toMatch(/er utenfor det regelen gjelder for \(1,5, 3, 4,5, 6 mg\)/)
    expect(kjor('antipsykotikabytte-kariprazin-kvetiapin', '3').utfall).toBe('plan')
    expect(grunner(kjor('antipsykotikabytte-kariprazin-kvetiapin', '4,5', { pasientforhold: { cyp3a4_hemmer: true } }))).toMatch(/CYP3A4/)
    // 300 mg fra dag 4 er et definert sluttmål som forskriveren bekrefter er forsvarlig; uten bekreftelsen stopper planen.
    expect(grunner(kjor('antipsykotikabytte-kariprazin-kvetiapin', '4,5', { bekreftet: ['indikasjon', 'spesialist_risiko'] }))).toMatch(/Må bekreftes før beregning: Sluttmålet er 300 mg kvetiapin daglig fra dag 4/)
  })

  it('olanzapin → aripiprazol: aripiprazol 5, 10 og måldosen; olanzapin uendret i 28 dager og så ned 25 % av dosen hver 14. dag til seponert', () => {
    expect(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { maldose: '15' })).toEqual({ utfall: 'formvalg', forlop: ['fra', 'til'] })
    const TO_TABLETTER = { formvalg: { fra: TABLETTER, til: TABLETTER } }
    expect(linjer(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15', startdato: '2026-12-01' })).filter((l) => !l.includes('Vurdering'))).toEqual([
      'Dag 1–7 (01.12.2026–07.12.2026): Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 5 mg = 1 tablett à 5 mg',
      'Dag 8–14 (08.12.2026–14.12.2026): Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 15–28 (15.12.2026–28.12.2026): Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 29–42 (29.12.2026–11.01.2027): Olanzapin peroralt: 15 mg = 2 tabletter à 7,5 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 43–56 (12.01.2027–25.01.2027): Olanzapin peroralt: 10 mg = 1 tablett à 10 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 57–70 (26.01.2027–08.02.2027): Olanzapin peroralt: 5 mg = 1 tablett à 5 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      'Fra dag 71 (fra 09.02.2027): Olanzapin peroralt: Seponert; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
    ])
    // Vurderingspunktet står før hver reduksjon og før seponeringen.
    const vurderinger = linjer(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15' })).filter((l) => l.includes('Vurdering'))
    expect(vurderinger.map((l) => l.split(':')[0])).toEqual(['Dag 29', 'Dag 43', 'Dag 57', 'Dag 71'])
    expect(grunner(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '20' }))).toMatch(/Måldosen 20 mg er utenfor/)
    expect(grunner(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15', pasientforhold: { tilbakefall_innlagt: true } }))).toMatch(/gjentatte psykotiske tilbakefall/)
  })

  it('risperidon → aripiprazol: 4 mg ned til 3, 2 og 1 mg og så stopp, med aripiprazol 10 mg fra dag 8', () => {
    const TO_TABLETTER = { formvalg: { fra: TABLETTER, til: TABLETTER } }
    expect(linjer(kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { ...TO_TABLETTER, maldose: '10' })).filter((l) => !l.includes('Vurdering'))).toEqual([
      'Dag 1–7: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 5 mg = 1 tablett à 5 mg',
      'Dag 8–28: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 29–42: Risperidon peroralt: 3 mg = 1 tablett à 3 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 43–56: Risperidon peroralt: 2 mg = 1 tablett à 2 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 57–70: Risperidon peroralt: 1 mg = 1 tablett à 1 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      'Fra dag 71: Risperidon peroralt: Seponert; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
    ])
    expect(grunner(kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { ...TO_TABLETTER, maldose: '10' }, { ubesvart: ['cyp_aripiprazol'] }))).toMatch(/CYP3A4- eller CYP2D6-hemmer/)
    expect(kjor('antipsykotikabytte-risperidon-aripiprazol', '20', { ...TO_TABLETTER, maldose: '10' }).utfall).not.toBe('plan')
  })

  it('til aripiprazol (valg c): forskriveren velger blant de nærmeste dosene når et trinn ikke kan gis, og resten regnes fra den valgte dosen', () => {
    const TO_TABLETTER = { formvalg: { fra: TABLETTER, til: TABLETTER } }
    type Valg = [trinn: number, fra_mg: number, mg: number]
    const olanzapin = (dose: string, ...valgt: Valg[]) =>
      kjor('antipsykotikabytte-olanzapin-aripiprazol', dose, { ...TO_TABLETTER, maldose: '15', trinnvalg: valgt.map(([trinn, fra_mg, mg]) => ({ forlop: 'fra', trinn, fra_mg, mg })) })
    // Uten valg gir bare startdoser der hvert trinn kan gis nøyaktig, en plan; verktøyet runder aldri av selv.
    const utfall = (id: Regelid, dose: number, maldose: string) => kjor(id, String(dose), { ...TO_TABLETTER, maldose }).utfall
    expect([5, 7.5, 10, 12.5, 15, 17.5, 20].filter((d) => utfall('antipsykotikabytte-olanzapin-aripiprazol', d, '15') === 'plan')).toEqual([10, 20])
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16].filter((d) => utfall('antipsykotikabytte-risperidon-aripiprazol', d, '10') === 'plan')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16])
    // Olanzapin 15 mg: 11,25 mg kan ikke gis; 10 mg (5 mg reduksjon) varer 14 × 5 / 3,75 → 19 dager, 12,5 mg varer 14 dager.
    expect(grunner(olanzapin('15'))).toMatch(/den ideelle dosen 11,25 mg kan ikke gis.*velge en av de nærmeste dosene som kan gis: 10 mg \(−33,33 %, 19 dager\) eller 12,5 mg \(−16,67 %, 14 dager\)\. Trinnet varer da minst 14 dager.*ikke går raskere enn 25 % av startdosen per 14 dager\. Beregningen velger ikke selv/)
    // Neste trinn regnes fra den valgte dosen: fra 10 mg er det 6,25 mg, fra 5 mg 1,25 mg, der bare 2,5 mg kan gis.
    expect(grunner(olanzapin('15', [1, 15, 10]))).toMatch(/den ideelle dosen 6,25 mg kan ikke gis.*5 mg \(−50 %, 19 dager\) eller 7,5 mg \(−25 %, 14 dager\)/)
    expect(grunner(olanzapin('15', [1, 15, 10], [2, 10, 5]))).toMatch(/den ideelle dosen 1,25 mg kan ikke gis.*velge en av de nærmeste dosene som kan gis: 2,5 mg \(−50 %, 14 dager\)/)
    const ferdig = olanzapin('15', [1, 15, 10], [2, 10, 5], [3, 5, 2.5])
    expect(linjer(ferdig).filter((l) => l.includes('Olanzapin peroralt')).map((l) => l.replace(/; Aripiprazol.*/, ''))).toEqual([
      'Dag 1–7: Olanzapin peroralt: 15 mg = 2 tabletter à 7,5 mg',
      'Dag 8–14: Olanzapin peroralt: 15 mg = 2 tabletter à 7,5 mg',
      'Dag 15–28: Olanzapin peroralt: 15 mg = 2 tabletter à 7,5 mg',
      'Dag 29–47: Olanzapin peroralt: 10 mg = 1 tablett à 10 mg (valgt av forskriveren (beregnet 11,25 mg; −33,33 %))',
      'Dag 48–66: Olanzapin peroralt: 5 mg = 1 tablett à 5 mg (valgt av forskriveren (beregnet 6,25 mg; −50 %))',
      'Dag 67–80: Olanzapin peroralt: 2,5 mg = 1 tablett à 2,5 mg (valgt av forskriveren (beregnet 1,25 mg; −50 %))',
      'Fra dag 81: Olanzapin peroralt: Seponert',
    ])
    expect(ferdig.utfall === 'plan' && ferdig.tekst).toContain(KOMPLETT)
    // Bare en av de nærmeste dosene kan velges.
    expect(grunner(olanzapin('15', [1, 15, 7.5]))).toMatch(/den valgte dosen 7,5 mg for trinn 1 er ikke en av de nærmeste dosene som kan gis \(10 mg eller 12,5 mg\)/)
    // Lave doser: fra 5 mg kan bare 2,5 mg velges (28 dager), og fra 2,5 mg kan ingen lavere dose gis, så planen stopper uten delplan.
    expect(grunner(olanzapin('5'))).toMatch(/2,5 mg \(−50 %, 28 dager\)/)
    const lav = olanzapin('5', [1, 5, 2.5])
    expect(lav.utfall).not.toBe('plan')
    expect(grunner(lav)).toMatch(/den ideelle dosen 1,25 mg kan ikke gis.*ingen lavere dose kan gis\. En annen plan må vurderes individuelt/)
    // Mangler 2,5 mg-tablettene i FEST, kan ingen dose velges fra 5 mg, og planen stopper.
    const uten25 = { ...UTTREKKENE, pilot: utenPakninger(UTTREKKENE.pilot, /^(Olanzapin|Zyprexa).* 2,5 mg/i) }
    const u = kjorKasus(
      { id: 'uten-2-5', kategori: 'vanlig_dose', hva: 'uten olanzapin 2,5 mg', verktoy: BYTTE.id, valg: VALG['antipsykotikabytte-olanzapin-aripiprazol'], uttrekk: 'pilot', dose: '15', skjema: { ...TO_TABLETTER, maldose: '15', trinnvalg: [{ forlop: 'fra', trinn: 1, fra_mg: 15, mg: 10 }, { forlop: 'fra', trinn: 2, fra_mg: 10, mg: 5 }] }, regel: godkjent('antipsykotikabytte-olanzapin-aripiprazol'), forventet: { utfall: 'stopp', grunner: [] } },
      uten25,
    )
    expect(u.utfall).not.toBe('plan')
    expect(grunner(u)).toMatch(/den ideelle dosen 1,25 mg kan ikke gis.*ingen lavere dose kan gis/)
    // Risperidon 10 mg: 7,5 mg kan ikke gis; 7 mg varer 17 dager og 8 mg 14 dager.
    expect(grunner(kjor('antipsykotikabytte-risperidon-aripiprazol', '10', { ...TO_TABLETTER, maldose: '10' }))).toMatch(/7 mg \(−30 %, 17 dager\) eller 8 mg \(−20 %, 14 dager\)/)
  })

  it('til aripiprazol: siste trinn før seponering er aldri større enn kildens (25 % av startdosen, minst 14 dager)', () => {
    const TO_TABLETTER = { formvalg: { fra: TABLETTER, til: TABLETTER } }
    /** Dosene til legemidlet som trappes ned, per periode i planen: [fra dag, til dag, mg], og dagen det er seponert. */
    const nedtrapping = (u: ReturnType<typeof kjor>, navn: string) => {
      const rader = linjer(u).filter((l) => l.includes(`${navn} peroralt`))
      const doser = rader.flatMap((l) => {
        const m = l.match(/^Dag (\d+)(?:–(\d+))?: \S+ peroralt: ([\d,]+) mg/)
        return m ? [[Number(m[1]), Number(m[2] ?? m[1]), Number(m[3]!.replace(',', '.'))] as const] : []
      })
      const seponert = Number(rader.at(-1)?.match(/^Fra dag (\d+): \S+ peroralt: Seponert/)?.[1])
      return { doser, seponert }
    }
    /** Kildens krav til nedtrappingen (25 % av dosen, minst 2 uker mellom reduksjonene, til det er stoppet), kontrollert på planen. Gir dosene etter dag 28 og 0. */
    const somKilden = (u: ReturnType<typeof kjor>, navn: string, start: number) => {
      const { doser, seponert } = nedtrapping(u, navn)
      expect(u.utfall === 'plan' && u.tekst, `${navn} ${start}`).toContain(KOMPLETT)
      expect(Number.isFinite(seponert), `${navn} ${start}: seponert`).toBe(true)
      const trinn = doser.filter(([fra]) => fra >= 29)
      expect(trinn.length, `${navn} ${start}: minst ett trinn`).toBeGreaterThan(0)
      // Hver reduksjon står minst 14 dager og aldri kortere enn 14 dager per 25 % av startdosen den reduserer (valg c).
      let forrige = start
      for (const [fra, til, mg] of trinn) {
        const dager = til - fra + 1
        expect(dager, `${navn} ${start}: ${mg} mg dag ${fra}–${til}`).toBeGreaterThanOrEqual(Math.max(14, Math.ceil((14 * (forrige - mg)) / (start * 0.25) - 1e-9)))
        forrige = mg
      }
      // Siste trinn til 0 er høyst kildens siste trinn: siste dose er høyst 25 % av startdosen, og den har stått minst 14 dager.
      expect(forrige, `${navn} ${start}: siste dose før seponering`).toBeLessThanOrEqual(start * 0.25 + 1e-9)
      expect(seponert, `${navn} ${start}: seponert dagen etter siste trinn`).toBe(trinn.at(-1)![1] + 1)
      return [...trinn.map(([, , mg]) => mg), 0]
    }
    // Kildens egne eksempler, nøyaktig: 20 → 15 → 10 → 5 mg og 4 → 3 → 2 → 1 mg og så stopp.
    expect(somKilden(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15' }), 'Olanzapin', 20)).toEqual([15, 10, 5, 0])
    expect(somKilden(kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { ...TO_TABLETTER, maldose: '10' }), 'Risperidon', 4)).toEqual([3, 2, 1, 0])
    // Samme mønster ved andre startdoser der hvert trinn kan gis nøyaktig: siste dose er 25 % av startdosen.
    expect(somKilden(kjor('antipsykotikabytte-olanzapin-aripiprazol', '10', { ...TO_TABLETTER, maldose: '15' }), 'Olanzapin', 10)).toEqual([7.5, 5, 2.5, 0])
    for (const d of [1, 2, 3, 5, 6, 7, 8, 9, 12, 16]) somKilden(kjor('antipsykotikabytte-risperidon-aripiprazol', String(d), { ...TO_TABLETTER, maldose: '10' }), 'Risperidon', d)
    // Med valgte doser (valg c) fra 15 mg: siste trinn 2,5 → 0 mg er 16,67 % av startdosen, mindre enn kildens.
    const valgt = kjor('antipsykotikabytte-olanzapin-aripiprazol', '15', { ...TO_TABLETTER, maldose: '15', trinnvalg: [{ forlop: 'fra', trinn: 1, fra_mg: 15, mg: 10 }, { forlop: 'fra', trinn: 2, fra_mg: 10, mg: 5 }, { forlop: 'fra', trinn: 3, fra_mg: 5, mg: 2.5 }] })
    expect(somKilden(valgt, 'Olanzapin', 15)).toEqual([10, 5, 2.5, 0])
    // Et valgfritt mindre siste trinn (åpent OUSFAR-valg): uten valg gjelder kildens trinn til 0; tilbudet er den laveste og den nærmeste lavere dosen som kan gis, med samme fartsregel.
    const mellomtrinn = (u: ReturnType<typeof kjor>) => u.resultat?.trinnvalg?.filter((t) => t.mellomtrinn).map((t) => [t.trinn, t.fra_mg, t.doser.map((d) => [d.mg, d.dager])])
    expect(mellomtrinn(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15' }))).toEqual([[4, 5, [[2.5, 14]]]])
    expect(mellomtrinn(kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { ...TO_TABLETTER, maldose: '10' }))).toEqual([[4, 1, [[0.25, 14], [0.75, 14]]]])
    const mindre = kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15', trinnvalg: [{ forlop: 'fra', trinn: 4, fra_mg: 5, mg: 2.5 }] })
    expect(somKilden(mindre, 'Olanzapin', 20)).toEqual([15, 10, 5, 2.5, 0])
    expect(linjer(mindre)).toContain('Fra dag 85: Olanzapin peroralt: Seponert; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg')
    expect(linjer(mindre).join(' ')).toMatch(/2,5 mg = 1 tablett à 2,5 mg \(mindre siste trinn valgt av forskriveren \(−50 %\)\)/)
    const risperidon = (mg: number) => kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { ...TO_TABLETTER, maldose: '10', trinnvalg: [{ forlop: 'fra', trinn: 4, fra_mg: 1, mg }] })
    expect(somKilden(risperidon(0.75), 'Risperidon', 4)).toEqual([3, 2, 1, 0.75, 0])
    expect(risperidon(0.5).utfall).not.toBe('plan')
    // Bare de tilbudte dosene og bare der det finnes en lavere dose: fra 2,5 mg olanzapin (startdose 10 eller valgt fra 15) tilbys ingen, og et annet valg stopper.
    expect(mellomtrinn(kjor('antipsykotikabytte-olanzapin-aripiprazol', '10', { ...TO_TABLETTER, maldose: '15' })) ?? []).toEqual([])
    expect(mellomtrinn(valgt) ?? []).toEqual([])
    expect(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15', trinnvalg: [{ forlop: 'fra', trinn: 4, fra_mg: 5, mg: 4 }] }).utfall).not.toBe('plan')
    // Manglende grunnlag: fra 5 og 7,5 mg kan siste dose ikke bli høyst 25 % av startdosen med tablettene i FEST, så planen stopper uten delplan.
    for (const d of ['5', '7,5']) {
      const u = kjor('antipsykotikabytte-olanzapin-aripiprazol', d, { ...TO_TABLETTER, maldose: '15', trinnvalg: [{ forlop: 'fra', trinn: 1, fra_mg: Number(d.replace(',', '.')), mg: d === '5' ? 2.5 : 5 }] })
      expect(u.utfall, d).not.toBe('plan')
      expect(linjer(u).join(' '), d).not.toContain('Seponert')
    }
  })

  it('byttene til aripiprazol gir ingen plan før de åpne valgene er avklart, selv med godkjenning', () => {
    const uavklart = { id: 'antipsykotikabytte-risperidon-aripiprazol', endre: { hva: 'bare godkjenning', endre: (r: Regel) => simulerGodkjenning(r, { id: r.id, versjon: r.versjon, fingeravtrykk: fingeravtrykk(r) }, '2026-11-03') } }
    const u = kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { formvalg: { fra: TABLETTER, til: TABLETTER }, maldose: '10' }, { regel: uavklart })
    expect(grunner(u)).toMatch(/åpne valg som må avklares faglig/)
  })
})

describe('K3: planutfallet', () => {
  it('hvert forløp er en komplett plan til sluttmålet, ikke en delplan', () => {
    const planer = [
      kjor('depot-risperidon-xeplion', '4', { maldose: '75' }),
      kjor('depot-consta-xeplion', '37,5'),
      kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { formvalg: { til: TABLETTER }, maldose: '15' }),
      kjor('antipsykotikabytte-aripiprazol-risperidon', '15', { maldose: '6' }),
      kjor('antipsykotikabytte-kariprazin-kvetiapin', '4,5'),
      kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { formvalg: { fra: TABLETTER, til: TABLETTER }, maldose: '15' }),
      kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { formvalg: { fra: TABLETTER, til: TABLETTER }, maldose: '10' }),
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
