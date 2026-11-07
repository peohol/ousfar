/**
 * K3: bytte av antipsykotika (`docs/verktøy-k3-antipsykotika.md`).
 *
 * - De sju reglene består kontrollene (kilder, kildeoppføringer og
 *   regneeksempler). Tre er klinisk godkjent av den uavhengige kontrolløren
 *   for nøyaktig sin versjon og sitt fingeravtrykk (`ANTIPSYKOTIKAVEDTAK`,
 *   04.11.2026) og gir en ekte plan på verktøysiden uten simulert
 *   godkjenning; de fire andre står til faglig kontroll og gir ingen plan.
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
import { ANTIPSYKOTIKASETT, ANTIPSYKOTIKAVEDTAK, FEST_ANTIPSYKOTIKA } from '../verktoy/regler/antipsykotikabytter'
import { erKliniskGodkjent, fingeravtrykk, godkjenn } from '../verktoy/regler/godkjenning'
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
/** Regler med åpne OUSFAR-valg som kontrolløren må avklare: tiden på 10 mg olanzapin før den valgte måldosen. */
const MED_APNE_VALG = ['antipsykotikabytte-aripiprazol-olanzapin']
/** Regler med OUSFAR-vurderinger, også de kontrolløren har avklart (avgrensningen til 3 mg risperidon før Xeplion, 04.11.2026). */
const MED_OUSFAR_VURDERING = [...MED_APNE_VALG, 'antipsykotikabytte-aripiprazol-risperidon', 'depot-risperidon-xeplion', 'antipsykotikabytte-olanzapin-aripiprazol', 'antipsykotikabytte-risperidon-aripiprazol']
/** Reglene kontrolløren har godkjent klinisk (ellevte gjennomgang, 04.11.2026), med fingeravtrykket godkjenningen gjelder. */
const GODKJENT: Partial<Record<string, string>> = {
  'depot-risperidon-xeplion': '1672334c468f28cf181aa4d786370e60f3f232f76f63d374e0c505d847ab184e',
  'antipsykotikabytte-olanzapin-aripiprazol': 'f141a13a9e9368542d7719cfb0abea7cfb77a41d7d89248e5f9e1d70e0aa5f5e',
  'antipsykotikabytte-risperidon-aripiprazol': '866ac93c58fb921c78cd71518ec91637cb31a175b7a9a480552fcebe54cca870',
}
/** Kontrollørens avklaringer i den åttende gjennomgangen (04.11.2026): regelen og versjonen kontrolløren vurderte. */
const AVKLART_STARTDOSE: Partial<Record<string, number>> = {
  'depot-risperidon-xeplion': 7,
  'antipsykotikabytte-olanzapin-aripiprazol': 6,
  'antipsykotikabytte-risperidon-aripiprazol': 6,
}
/** Versjonene etter kontrollørens gjennomganger av #320 (03.–04.11.2026); de andre er versjon 1. */
const VERSJON: Partial<Record<string, number>> = {
  'depot-risperidon-xeplion': 8,
  'depot-consta-xeplion': 3,
  'antipsykotikabytte-aripiprazol-olanzapin': 2,
  'antipsykotikabytte-aripiprazol-risperidon': 5,
  'antipsykotikabytte-kariprazin-kvetiapin': 2,
  'antipsykotikabytte-olanzapin-aripiprazol': 8,
  'antipsykotikabytte-risperidon-aripiprazol': 8,
}
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
      expect(r.beregnbarhet, r.id).toBe(MED_OUSFAR_VURDERING.includes(r.id) ? 'beregnbar_etter_avklaring' : 'entydig_beregnbar')
      expect(apneValg(r).length > 0, r.id).toBe(MED_APNE_VALG.includes(r.id))
      expect(r.eksempler.some((e) => !e.stopp), `${r.id}: minst ett komplett forløp`).toBe(true)
      expect(r.eksempler.some((e) => e.stopp), `${r.id}: minst ett stopp`).toBe(true)
    }
  })

  it('tre er klinisk godkjent for nøyaktig sin versjon og sitt fingeravtrykk; de fire andre står til faglig kontroll og gir ingen klinisk plan', () => {
    expect(Object.keys(ANTIPSYKOTIKAVEDTAK.regler).sort()).toEqual(Object.keys(GODKJENT).sort())
    for (const r of ANTIPSYKOTIKASETT.regler) {
      expect(r.versjon, r.id).toBe(VERSJON[r.id] ?? 1)
      const sist = r.godkjenning.historikk.at(-1)!
      expect(sist.regelversjon, r.id).toBe(r.versjon)
      const avtrykk = GODKJENT[r.id]
      if (avtrykk) {
        // Godkjenningen er kontrollørens, ikke utviklernes, og gjelder nøyaktig fingeravtrykket kontrolløren godkjente.
        expect(fingeravtrykk(r), r.id).toBe(avtrykk)
        expect(r.godkjenning.status, r.id).toBe('klinisk_godkjent')
        expect(sist, r.id).toMatchObject({ status: 'klinisk_godkjent', av: 'ChatGPT (uavhengig fagkontrollør)', rolle: 'uavhengig_kontrollor', dato: '2026-11-04', fingeravtrykk: avtrykk })
        expect(sist.merknad, r.id).toMatch(/ellevte gjennomgang av 63464bd .*kommentar 6626569802.*bare for nøyaktig denne avgrensede situasjonen: bare /)
        expect(r.godkjenning.historikk.slice(0, -1).every((s) => s.rolle === 'utvikler' && s.status !== 'klinisk_godkjent'), r.id).toBe(true)
        expect(erKliniskGodkjent(r), r.id).toBe(true)
      } else {
        expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
        expect(r.godkjenning.historikk.every((s) => s.rolle === 'utvikler' && s.status !== 'klinisk_godkjent'), r.id).toBe(true)
        expect(erKliniskGodkjent(r), r.id).toBe(false)
      }
    }
    // Endres en godkjent regel, gjelder godkjenningen ikke: vedtaket registreres bare for nøyaktig fingeravtrykket.
    const endret = structuredClone(regel('depot-risperidon-xeplion'))
    endret.fortolkning.forutsetninger.push('Syntetisk testendring etter godkjenningen.')
    endret.godkjenning = { status: 'til_faglig_kontroll', historikk: endret.godkjenning.historikk.slice(0, -1) }
    expect(godkjenn([endret], ANTIPSYKOTIKAVEDTAK)[0]!.godkjenning.status).toBe('til_faglig_kontroll')
    // Kontrollørens avklaringer gjelder bare startdoseavgrensningen, for versjonen kontrolløren vurderte, og er ingen godkjenning.
    for (const r of ANTIPSYKOTIKASETT.regler) {
      const g = r.inndata.find((i) => i.navn === 'startdose')?.grunnlag
      const avklaring = g?.type === 'ousfar_vurdering' ? g.avklaring : null
      if (AVKLART_STARTDOSE[r.id] === undefined) {
        expect(avklaring, r.id).toBeNull()
        continue
      }
      expect(avklaring, r.id).toMatchObject({ dato: '2026-11-04', av: 'ChatGPT (uavhengig fagkontrollør)', rolle: 'uavhengig_kontrollor', regelversjon: AVKLART_STARTDOSE[r.id] })
      expect(avklaring?.merknad, r.id).toMatch(/gjennomgang av 65c3fb8 .*kommentar 6620232533.*ingen klinisk godkjenning av regelen/)
    }
    for (const [id, v] of Object.entries(VALG)) {
      const t = tilgjengelighet(BYTTE, v)
      expect(t.regler.map((r) => r.id), id).toContain(id)
      if (GODKJENT[id]) {
        expect(t.status, id).toBe('tilgjengelig')
        continue
      }
      expect(t.status, id).toBe('til_kontroll')
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
    expect(linjer(kjor('depot-risperidon-xeplion', '3', { maldose: '75', startdato: '2026-12-01' }))).toEqual([
      'Fra dag 1 (fra 01.12.2026): Risperidon peroralt: Seponert',
      'Dag 1 (01.12.2026): Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)',
      'Dag 8 (08.12.2026): Vurdering (Paliperidon): Før endringen, punkt 1: Før injeksjonen dag 8 og før hver månedlige vedlikeholdsinjeksjon: psykotiske symptomer, ekstrapyramidale og andre bivirkninger og reaksjoner etter forrige injeksjon vurderes, og pasienten følges tett gjennom byttet.',
      'Dag 8 (08.12.2026): Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)',
      'Hver måned fra 1 måned etter dag 8 (første 08.01.2027): Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)',
    ])
    // Planen gjelder bare 3 mg risperidon, der anbefalte 75 mg og Russu 2018 er enige.
    // For lav vedlikeholdseksponering: ved 4–6 mg tilsvarer 75 mg etter simuleringene mindre enn dagens dose, så 75 mg stopper der.
    for (const risperidon of ['4', '5', '6']) {
      const u = kjor('depot-risperidon-xeplion', risperidon, { maldose: '75' })
      expect(u.utfall, risperidon).not.toBe('plan')
      expect(grunner(u), risperidon).toMatch(new RegExp(`Startdosen ${risperidon} mg er utenfor det regelen gjelder for \\(3 mg\\)`))
    }
    // Rett ved grensen og de usannsynlige yttertilfellene stopper også.
    for (const risperidon of ['0,5', '2', '2,5', '3,5', '6,5', '8', '16']) {
      expect(grunner(kjor('depot-risperidon-xeplion', risperidon, { maldose: '75' })), risperidon).toMatch(new RegExp(`Startdosen ${risperidon} mg er utenfor det regelen gjelder for \\(3 mg\\)`))
    }
    // En annen vedlikeholdsdose stopper, også med begrunnelse og også simuleringens doser (4 → 100, 6 → 150 mg): de er ikke prøvd ut klinisk.
    const FRITEKST = { begrunnelse: 'Syntetisk eksempel: fedme og tidligere effekt.' }
    for (const [risperidon, xeplion] of [['4', '100'], ['6', '150'], ['3', '50'], ['3', '100']] as const) {
      expect(grunner(kjor('depot-risperidon-xeplion', risperidon, { maldose: xeplion, ...FRITEKST })), `${risperidon} → ${xeplion}`).toMatch(new RegExp(`Måldosen ${xeplion} mg er utenfor det regelen gjelder for \\(75 mg\\)`))
    }
    // Ved grensene i preparatomtalen: 25 og 175 mg og risperidon 17 mg stopper.
    expect(kjor('depot-risperidon-xeplion', '3', { maldose: '25', ...FRITEKST }).utfall).not.toBe('plan')
    expect(kjor('depot-risperidon-xeplion', '3', { maldose: '175', ...FRITEKST }).utfall).not.toBe('plan')
    expect(kjor('depot-risperidon-xeplion', '17', { maldose: '75' }).utfall).not.toBe('plan')
    // Den strukturerte vurderingen: effekt og toleranse av dagens dose må bekreftes, og overvekt eller fedme stopper.
    expect(grunner(kjor('depot-risperidon-xeplion', '3', { maldose: '75', bekreftet: ['indikasjon', 'tidligere_toleranse'] }))).toMatch(/god og stabil effekt, uten bivirkninger som har begrenset dosen/)
    expect(grunner(kjor('depot-risperidon-xeplion', '3', { maldose: '75', pasientforhold: { overvekt: true } }))).toMatch(/Pasienten har overvekt eller fedme/)
    expect(grunner(kjor('depot-risperidon-xeplion', '3', { maldose: '75' }, { ubesvart: ['overvekt'] }))).toMatch(/overvekt eller fedme/)
    // Legemidler som endrer omsetningen av risperidon: simuleringene tar ikke hensyn til dem, så regelen gjelder ikke, og ubesvart stopper.
    expect(grunner(kjor('depot-risperidon-xeplion', '3', { maldose: '75', pasientforhold: { risperidon_interaksjon: true } }))).toMatch(/Regelen gjelder ikke: Pasienten bruker en CYP2D6-hemmer/)
    expect(grunner(kjor('depot-risperidon-xeplion', '3', { maldose: '75' }, { ubesvart: ['risperidon_interaksjon'] }))).toMatch(/CYP2D6-hemmer/)
    // Oppfølgingen står i planen: et vurderingspunkt før injeksjonen dag 8 og før hver vedlikeholdsinjeksjon.
    const plan = kjor('depot-risperidon-xeplion', '3', { maldose: '75' })
    expect(plan.utfall).toBe('plan')
    expect(plan.tekst).toMatch(/Før injeksjonen dag 8 og før hver månedlige vedlikeholdsinjeksjon: psykotiske symptomer/)
    // Når en individuell vurdering overstyrer planens vedlikeholdsdose, står konkret i planen.
    expect(plan.tekst).toMatch(/Ved funn: Planens 75 mg gjelder ikke lenger, og vedlikeholdsdosen vurderes individuelt, ved forverring eller tilbakefall av psykotiske symptomer, dosebegrensende eller ekstrapyramidale bivirkninger, overfølsomhet, nedsatt nyrefunksjon eller utviklet overvekt eller fedme/)
    // Kontrolløren har avklart avgrensningen til 3 mg (04.11.2026); regelen har ingen åpne valg, men er fortsatt ikke godkjent.
    expect(apneValg(regel('depot-risperidon-xeplion'))).toEqual([])
    const fagtekst = JSON.stringify(regel('depot-risperidon-xeplion').fortolkning)
    expect(fagtekst).toMatch(/begrenset startstrategi, ikke en doseekvivalens/)
    expect(fagtekst).toMatch(/simuleringen er ingen garanti for den enkelte pasienten/)
    // Dokumentert tidligere toleranse er en egen bekreftelse.
    expect(grunner(kjor('depot-risperidon-xeplion', '3', { maldose: '75', bekreftet: ['indikasjon', 'effekt_toleranse'] }))).toMatch(/har tålt peroral risperidon over tid/)
  })

  it('et preparat som mangler i FEST, stopper planen i stedet for å bytte til et annet', () => {
    const uten150 = { ...UTTREKKENE, pilot: utenPakninger(UTTREKKENE.pilot, /^Xeplion .*150 mg/) }
    const u = kjorKasus({ id: 'uten-150', kategori: 'vanlig_dose', hva: 'uten Xeplion 150 mg', verktoy: BYTTE.id, valg: VALG['depot-risperidon-xeplion'], uttrekk: 'pilot', dose: '3', skjema: { maldose: '75' }, regel: godkjent('depot-risperidon-xeplion'), forventet: { utfall: 'stopp', grunner: [] } }, uten150)
    expect(u.utfall).not.toBe('plan')
    expect(grunner(u)).toMatch(/injeksjonen dag 1 er 150 mg, men FEST har ingen brukbar injeksjon med den styrken/)
  })

  it('Risperdal Consta → Xeplion: Xeplion i stedet for neste Consta-injeksjon, dosen fra tabellen, deretter månedlig', () => {
    expect(linjer(kjor('depot-consta-xeplion', '37,5', { startdato: '2026-12-15' }))).toEqual([
      'Fra dag 1 (fra 15.12.2026): Risperidon depotinjeksjon: Seponert = ingen flere injeksjoner',
      'Dag 1 (15.12.2026): Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (deltoideus eller setemuskel)',
      'Dag 1 (15.12.2026): Vurdering (Paliperidon): Punkt 1: Ved byttet (dag 1) og før hver månedlige injeksjon: effekt og psykotiske symptomer, ekstrapyramidale og andre bivirkninger, toleranse og reaksjoner etter forrige injeksjon vurderes, og pasienten følges tett gjennom byttet.',
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
    // Kontrollørens ellevte gjennomgang: oppfølgingen står i den kopierbare planen, med når dosen må vurderes individuelt.
    const tekst = kjor('depot-consta-xeplion', '37,5').tekst ?? ''
    expect(tekst).toMatch(/Paliperidon, dag 1: Ved byttet \(dag 1\) og før hver månedlige injeksjon: .* Ved funn: Planens dose gjelder ikke lenger, og vedlikeholdsdosen vurderes individuelt, ved utilstrekkelig effekt.*full effekt av en endret dose kan først sees etter flere måneder/)
    // Utilstrekkelig effekt (ikke bekreftet god og stabil effekt), nedsatt nyrefunksjon og et annet depot stopper uten planrader.
    const stopp = [
      kjor('depot-consta-xeplion', '37,5', { bekreftet: ['indikasjon', 'preparat_consta', 'neste_injeksjon'] }),
      kjor('depot-consta-xeplion', '37,5', {}, { ubesvart: ['nedsatt_nyrefunksjon'] }),
      kjor('depot-consta-xeplion', '37,5', { bekreftet: ['indikasjon', 'neste_injeksjon', 'effekt_toleranse'] }),
    ]
    expect(grunner(stopp[0]!)).toMatch(/dagens Consta-dose har gitt god og stabil effekt/)
    expect(grunner(stopp[1]!)).toMatch(/kreatininclearance under 80 ml\/min/)
    expect(grunner(stopp[2]!)).toMatch(/Depotet er Risperdal Consta hver 2\. uke, ikke Okedi/)
    for (const u of stopp) {
      expect(u.utfall).not.toBe('plan')
      expect('linjer' in u ? u.linjer : []).toEqual([])
    }
  })

  it('aripiprazol → olanzapin: aripiprazol stoppes, olanzapin 10 mg fra dag 1 og den valgte måldosen etter en ny vurdering', () => {
    // Olanzapin finnes i flere legemiddelformer i FEST; forskriveren velger tabletter. Aripiprazol bare stoppes, så formen spørres ikke om.
    expect(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { maldose: '15' })).toEqual({ utfall: 'formvalg', forlop: ['til'] })
    const T = { formvalg: { til: TABLETTER } }
    expect(linjer(kjor('antipsykotikabytte-aripiprazol-olanzapin', '15', { ...T, maldose: '15', startdato: '2026-12-07' }))).toEqual([
      'Dag 1–7 (07.12.2026–13.12.2026): Aripiprazol peroralt: Seponert; Olanzapin peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 8 (14.12.2026): Vurdering (Olanzapin): Før endringen, punkt 1: Ny klinisk vurdering av effekt og bivirkninger, og av at aripiprazol er stoppet, før dosen endres.',
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

  it('aripiprazol → risperidon: 2 mg dag 1–4, første økning dag 5 og den valgte måldosen 4–6 mg etter en ny vurdering', () => {
    // Kontrollørens ellevte gjennomgang: én uke på 4 mg før 5–6 mg er avklart som OUSFARs selvstendige kliniske vurdering, men regelen er ikke godkjent.
    const fase = regel('antipsykotikabytte-aripiprazol-risperidon').plan.forlop[1]!.faser[0]!
    if (fase.type !== 'opptrapping') throw new Error('Uventet plan')
    const uke = fase.trinn[1]!.dager
    expect(uke.verdi).toBe(7)
    expect(uke.grunnlag.type === 'ousfar_vurdering' && uke.grunnlag.begrunnelse).toMatch(/^OUSFARs selvstendige kliniske vurdering, ikke fra kildene/)
    expect(uke.grunnlag.type === 'ousfar_vurdering' && uke.grunnlag.avklaring).toMatchObject({ av: 'ChatGPT (uavhengig fagkontrollør)', rolle: 'uavhengig_kontrollor', regelversjon: 4 })
    expect(uke.grunnlag.type === 'ousfar_vurdering' && uke.grunnlag.avklaring && uke.grunnlag.avklaring.merknad).toMatch(/gjennomgang av 63464bd .*kommentar 6626569802.*ingen klinisk godkjenning av regelen/)
    expect(apneValg(regel('antipsykotikabytte-aripiprazol-risperidon'))).toEqual([])
    expect(regel('antipsykotikabytte-aripiprazol-risperidon').godkjenning.status).toBe('til_faglig_kontroll')
    const plan = (maldose: string) => linjer(kjor('antipsykotikabytte-aripiprazol-risperidon', '15', { maldose }))
    const doser = (maldose: string) => plan(maldose).filter((l) => !l.includes('Vurdering'))
    const vurderinger = (maldose: string) => plan(maldose).filter((l) => l.includes('Vurdering')).map((l) => l.split(':')[0])
    // Kontrollørens tiende gjennomgang: byteverktøyets forsiktigere start ved bytte fra aripiprazol (høyst 50 % av måldosen dag 1–4,
    // første økning dag 5), ikke preparatomtalens 4 mg dag 2. Begge ytterpunktene av måldosen, og 5 mg, gir en komplett plan.
    expect(doser('4')).toEqual([
      'Dag 1–4: Aripiprazol peroralt: Seponert; Risperidon peroralt: 2 mg = 1 tablett à 2 mg',
      'Fra dag 5: Risperidon peroralt: 4 mg = 1 tablett à 4 mg',
    ])
    expect(vurderinger('4')).toEqual(['Dag 5'])
    expect(doser('6')).toEqual([
      'Dag 1–4: Aripiprazol peroralt: Seponert; Risperidon peroralt: 2 mg = 1 tablett à 2 mg',
      'Dag 5–11: Risperidon peroralt: 4 mg = 1 tablett à 4 mg',
      'Fra dag 12: Risperidon peroralt: 6 mg = 2 tabletter à 3 mg',
    ])
    expect(vurderinger('6')).toEqual(['Dag 5', 'Dag 12'])
    expect(doser('5').at(-1)).toMatch(/^Fra dag 12: Risperidon peroralt: 5 mg/)
    expect(vurderinger('5')).toEqual(['Dag 5', 'Dag 12'])
    for (const maldose of ['4', '5', '6']) {
      // Ingen dose over 2 mg før dag 5, og 2 mg er høyst halvparten av måldosen.
      expect(doser(maldose)[0], maldose).toMatch(/^Dag 1–4: .*Risperidon peroralt: 2 mg = /)
      expect(2, maldose).toBeLessThanOrEqual(Number(maldose) / 2)
      // Vurderingen før økningen gjelder blodtrykket og toleransen.
      expect(plan(maldose).find((l) => l.startsWith('Dag 5') && l.includes('Vurdering')), maldose).toMatch(/blodtrykk/)
    }
    // Kontrollørens niende gjennomgang: planen går fra 4 mg rett til måldosen, så bare 4–6 mg gir plan. Høyere mål (4 → 16 mg er et stort
    // sprang uten opptrapping) og lavere mål stopper uten delplan, også med skriftlig begrunnelse.
    for (const maldose of ['3', '3,5', '6,5', '8', '10', '12', '16', '20']) {
      for (const begrunnelse of [undefined, 'Syntetisk eksempel.']) {
        const u = kjor('antipsykotikabytte-aripiprazol-risperidon', '15', { maldose, ...(begrunnelse && { begrunnelse }) })
        expect(u.utfall, maldose).not.toBe('plan')
        expect(grunner(u), maldose).toMatch(new RegExp(`Måldosen ${maldose} mg er utenfor`))
        expect('linjer' in u ? u.linjer : [], maldose).toEqual([])
      }
    }
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
    // Vurderingspunktet står før hver reduksjon og før siste trinn til 0, og pasienten vurderes igjen 14 dager etter seponeringen (forslag).
    const olanzapinplan = linjer(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15' }))
    const vurderinger = olanzapinplan.filter((l) => l.includes('Vurdering (Olanzapin)'))
    expect(vurderinger.map((l) => l.split(':')[0])).toEqual(['Dag 29', 'Dag 43', 'Dag 57', 'Dag 71', 'Dag 84'])
    // Kontrollørens niende gjennomgang: toleransen vurderes før hver økning av aripiprazol (5 → 10 → 15 mg).
    const okninger = olanzapinplan.filter((l) => l.includes('Vurdering (Aripiprazol)'))
    expect(okninger.map((l) => l.split(':')[0])).toEqual(['Dag 8', 'Dag 15'])
    for (const l of okninger) expect(l).toMatch(/Før hver økning av aripiprazol: toleransen vurderes \(akatisi, uro, aktivering og søvnvansker\)/)
    expect(vurderinger[3]).toMatch(/også det siste trinnet til 0: tilstanden vurderes/)
    // Hva som gjøres ved funn, står i planen.
    expect(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15' }).tekst).toMatch(/Ved funn: Ved forverring, uro eller seponeringsplager holdes dosen, og resten av nedtrappingen planlegges individuelt/)
    expect(vurderinger[4]).toMatch(/Olanzapin er seponert: tilstanden vurderes på nytt/)
    // Stoffspesifikke seponeringsplager (Keks 2019 tabell 2, kolinergt syndrom ved olanzapin) i vurderingene og i vurderingen av siste trinn.
    for (const l of vurderinger) expect(l).toMatch(/kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi/)
    expect(regel('antipsykotikabytte-olanzapin-aripiprazol').bekreftelser.find((b) => b.id === 'siste_trinn')?.tekst).toMatch(/seponeringsplager kan være kvalme, oppkast, hodepine/)
    // Siste trinn til 0 krever en egen vurdering av pasienten, og tidligere seponeringsplager stopper planen.
    expect(grunner(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15', bekreftet: ['indikasjon', 'peroral_formulering', 'spesialist_risiko'] }))).toMatch(/Må bekreftes før beregning: Siste trinn er vurdert for denne pasienten/)
    expect(grunner(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose: '15', pasientforhold: { seponeringsplager: true } }))).toMatch(/tidligere fått seponeringsplager/)
    expect(grunner(kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { ...TO_TABLETTER, maldose: '10' }, { ubesvart: ['seponeringsplager'] }))).toMatch(/seponeringsplager/)
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
    // Risperdal-preparatomtalens råd om seponering og plagene den nevner, står i vurderingene.
    const risperidonplan = linjer(kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { ...TO_TABLETTER, maldose: '10' }))
    const vurderinger = risperidonplan.filter((l) => l.includes('Vurdering (Risperidon)'))
    expect(vurderinger.map((l) => l.split(':')[0])).toEqual(['Dag 29', 'Dag 43', 'Dag 57', 'Dag 71', 'Dag 84'])
    expect(risperidonplan.filter((l) => l.includes('Vurdering (Aripiprazol)')).map((l) => l.split(':')[0])).toEqual(['Dag 8'])
    for (const l of vurderinger) expect(l).toMatch(/kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi/)
    expect(regel('antipsykotikabytte-risperidon-aripiprazol').fortolkning.kildetro.map((u) => u.tekst).join(' ')).toMatch(/Seponering av risperidon: Ved seponering anbefales gradvis nedtrapping/)
    expect(kjor('antipsykotikabytte-risperidon-aripiprazol', '20', { ...TO_TABLETTER, maldose: '10' }).utfall).not.toBe('plan')
  })

  it('til aripiprazol: bare kildens eget forløp, så siste trinn til 0 og hvert trinn før står i kilden', () => {
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
    /** Kildens forløp kontrollert på planen: hold i 28 dager, så 25 % av startdosen ned hver 14. dag til seponert dagen etter siste trinn. */
    const somKilden = (u: ReturnType<typeof kjor>, navn: string, start: number) => {
      const { doser, seponert } = nedtrapping(u, navn)
      expect(u.utfall === 'plan' && u.tekst, `${navn} ${start}`).toContain(KOMPLETT)
      const trinn = doser.filter(([fra]) => fra >= 29)
      for (const [fra, til] of trinn) expect(til - fra + 1, `${navn} ${start}: dag ${fra}–${til}`).toBe(14)
      expect(seponert, `${navn} ${start}: seponert dagen etter siste trinn`).toBe(trinn.at(-1)![1] + 1)
      return [...trinn.map(([, , mg]) => mg), 0]
    }
    // Kildens egne eksempler, nøyaktig: 20 → 15 → 10 → 5 mg og 4 → 3 → 2 → 1 mg og så stopp, med begge måldosene.
    for (const maldose of ['10', '15']) {
      expect(somKilden(kjor('antipsykotikabytte-olanzapin-aripiprazol', '20', { ...TO_TABLETTER, maldose }), 'Olanzapin', 20)).toEqual([15, 10, 5, 0])
      expect(somKilden(kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { ...TO_TABLETTER, maldose }), 'Risperidon', 4)).toEqual([3, 2, 1, 0])
    }
    // Alle andre startdoser stopper uten plan, også der hvert trinn kunne gis (olanzapin 10 mg, risperidon 1–16 mg): kilden viser ikke det forløpet.
    const utfall = (id: Regelid, dose: number, maldose: string) => kjor(id, String(dose), { ...TO_TABLETTER, maldose })
    for (const d of [2.5, 5, 7.5, 10, 12.5, 15, 17.5]) {
      const u = utfall('antipsykotikabytte-olanzapin-aripiprazol', d, '15')
      expect(u.utfall, `olanzapin ${d}`).not.toBe('plan')
      expect(grunner(u), `olanzapin ${d}`).toMatch(new RegExp(`Startdosen ${String(d).replace('.', ',')} mg er utenfor det regelen gjelder for \\(20 mg\\)`))
      expect(linjer(u).join(' '), `olanzapin ${d}`).not.toContain('Seponert')
    }
    for (const d of [0.5, 1, 2, 3, 5, 6, 8, 12, 16]) {
      const u = utfall('antipsykotikabytte-risperidon-aripiprazol', d, '10')
      expect(u.utfall, `risperidon ${d}`).not.toBe('plan')
      expect(grunner(u), `risperidon ${d}`).toMatch(new RegExp(`Startdosen ${String(d).replace('.', ',')} mg er utenfor det regelen gjelder for \\(4 mg\\)`))
    }
    // Ingen egne lavdosetrinn: planen tilbyr verken et mindre siste trinn eller et valg av nærmeste dose.
    for (const [id, dose] of [['antipsykotikabytte-olanzapin-aripiprazol', '20'], ['antipsykotikabytte-risperidon-aripiprazol', '4']] as const) {
      expect(kjor(id, dose, { ...TO_TABLETTER, maldose: '10' }).resultat?.trinnvalg ?? [], id).toEqual([])
      const st = regel(id).plan.forlop[0]!.faser.find((f) => f.type === 'nedtrapping')
      expect(st && 'trinnvalg' in st, id).toBe(false)
      expect(st?.type === 'nedtrapping' && 'mellomtrinn' in st.strategi, id).toBe(false)
    }
    // Avgrensningen til kildens eksempel er avklart av kontrolløren (04.11.2026); vurderingen av siste trinn bygger på kildens
    // forløp og Keks-verktøyets stoffspesifikke råd. Aripiprazoldosene og tiden til vurderingen etter seponeringen er fortsatt åpne.
    for (const id of ['antipsykotikabytte-olanzapin-aripiprazol', 'antipsykotikabytte-risperidon-aripiprazol'] as const) {
      // Ukedosene og tiden til vurderingen etter seponeringen er avklart i den niende gjennomgangen (aadcf57, regelversjon 7).
      expect(apneValg(regel(id)), id).toEqual([])
      const fase = regel(id).plan.forlop[1]!.faser[0]!
      const etter = regel(id).plan.forlop[0]!.vurderinger?.find((v) => v.id === 'etter_seponering')?.nar
      const avklart = [...(fase.type === 'opptrapping' ? fase.trinn.map((t) => t.mg.grunnlag) : []), etter?.type === 'etter_seponering' ? etter.dager.grunnlag : null]
      expect(avklart.length, id).toBe(3)
      for (const g of avklart) {
        expect(g?.type === 'ousfar_vurdering' && g.avklaring, id).toMatchObject({ av: 'ChatGPT (uavhengig fagkontrollør)', rolle: 'uavhengig_kontrollor', regelversjon: 7 })
        expect(g?.type === 'ousfar_vurdering' && g.avklaring && g.avklaring.merknad, id).toMatch(/gjennomgang av aadcf57 .*kommentar 6623643706.*ingen klinisk godkjenning av regelen/)
      }
      const siste = regel(id).bekreftelser.find((b) => b.id === 'siste_trinn')?.grunnlag
      expect(siste?.type, id).toBe('kilde')
      expect(siste?.type === 'kilde' && siste.henvisninger.filter((k) => k.kilde === 'keks-2019-verktoy').length, id).toBe(3)
      // Den raskere nedtrappingen i Keks-verktøyet er bevisst ikke tatt inn, og avgrensningen kan ikke overføres til ren seponering.
      const fagtekst = JSON.stringify(regel(id).fortolkning)
      expect(fagtekst, id).toMatch(/verktøyets raskere nedtrapping og start med 10 mg aripiprazol er ikke tatt inn/)
      expect(fagtekst, id).toMatch(/kan ikke overføres til ren seponering av antipsykotika, tidligere seponeringsplager, ustabil psykose eller andre startdoser/)
    }
  })

  it('byttene til aripiprazol gir ingen plan før de åpne valgene er avklart, selv med godkjenning', () => {
    // Alle valgene er avklart nå; sperren prøves på en kopi der avklaringen av ukedosen første uke er tatt bort.
    const utenAvklaring = (r: Regel) => {
      const fase = r.plan.forlop[1]!.faser[0]!
      if (fase.type !== 'opptrapping' || fase.trinn[0]!.mg.grunnlag.type !== 'ousfar_vurdering') throw new Error('Uventet plan')
      fase.trinn[0]!.mg.grunnlag.avklaring = null
    }
    const uavklart = {
      id: 'antipsykotikabytte-risperidon-aripiprazol',
      endre: { hva: 'uten avklaring, med godkjenning', endre: (r: Regel) => { utenAvklaring(r); simulerGodkjenning(r, { id: r.id, versjon: r.versjon, fingeravtrykk: fingeravtrykk(r) }, '2026-11-03') } },
    }
    const u = kjor('antipsykotikabytte-risperidon-aripiprazol', '4', { formvalg: { fra: TABLETTER, til: TABLETTER }, maldose: '10' }, { regel: uavklart })
    expect(grunner(u)).toMatch(/åpne valg som må avklares faglig/)
  })
})

describe('K3: planutfallet', () => {
  it('hvert forløp er en komplett plan til sluttmålet, ikke en delplan', () => {
    const planer = [
      kjor('depot-risperidon-xeplion', '3', { maldose: '75' }),
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

describe('K3: de tre godkjente reglene gir en ekte plan på verktøysiden, uten simulert godkjenning', () => {
  /** Kasuset med regelen slik den står i appen: ingen simulert godkjenning og ingen endring. */
  const ekte = (id: Regelid, dose: string, skjema: Partial<Planskjema> = {}, ekstra: Partial<Pilotkasus> = {}) => kjor(id, dose, skjema, { regel: { id }, ...ekstra })

  it('gir hele den kopierbare planen med norske preparater fra FEST, merket som godkjent og komplett', () => {
    const planer = {
      'depot-risperidon-xeplion': ekte('depot-risperidon-xeplion', '3', { maldose: '75', startdato: '2026-12-01' }),
      'antipsykotikabytte-olanzapin-aripiprazol': ekte('antipsykotikabytte-olanzapin-aripiprazol', '20', { formvalg: { fra: TABLETTER, til: TABLETTER }, maldose: '15', startdato: '2026-12-01' }),
      'antipsykotikabytte-risperidon-aripiprazol': ekte('antipsykotikabytte-risperidon-aripiprazol', '4', { formvalg: { fra: TABLETTER, til: TABLETTER }, maldose: '10' }),
    }
    for (const [id, u] of Object.entries(planer)) {
      expect(u.utfall, id).toBe('plan')
      expect(u.tekst, id).toContain(KOMPLETT)
      expect(u.tekst, id).toMatch(/Beregnet etter en klinisk godkjent regelversjon/)
      expect(u.tekst, id).toContain(`Regel ${id}, versjon 8, fingeravtrykk ${GODKJENT[id]!.slice(0, 12)}`)
      expect(u.tekst, id).not.toMatch(/Simulert|Delplan/)
    }
    expect(linjer(planer['depot-risperidon-xeplion'])).toEqual([
      'Fra dag 1 (fra 01.12.2026): Risperidon peroralt: Seponert',
      'Dag 1 (01.12.2026): Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)',
      'Dag 8 (08.12.2026): Vurdering (Paliperidon): Før endringen, punkt 1: Før injeksjonen dag 8 og før hver månedlige vedlikeholdsinjeksjon: psykotiske symptomer, ekstrapyramidale og andre bivirkninger og reaksjoner etter forrige injeksjon vurderes, og pasienten følges tett gjennom byttet.',
      'Dag 8 (08.12.2026): Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)',
      'Hver måned fra 1 måned etter dag 8 (første 08.01.2027): Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)',
    ])
    expect(linjer(planer['antipsykotikabytte-olanzapin-aripiprazol']).filter((l) => !l.includes('Vurdering'))).toEqual([
      'Dag 1–7 (01.12.2026–07.12.2026): Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 5 mg = 1 tablett à 5 mg',
      'Dag 8–14 (08.12.2026–14.12.2026): Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 15–28 (15.12.2026–28.12.2026): Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 29–42 (29.12.2026–11.01.2027): Olanzapin peroralt: 15 mg = 2 tabletter à 7,5 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 43–56 (12.01.2027–25.01.2027): Olanzapin peroralt: 10 mg = 1 tablett à 10 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 57–70 (26.01.2027–08.02.2027): Olanzapin peroralt: 5 mg = 1 tablett à 5 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      'Fra dag 71 (fra 09.02.2027): Olanzapin peroralt: Seponert; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
    ])
    expect(linjer(planer['antipsykotikabytte-risperidon-aripiprazol']).filter((l) => !l.includes('Vurdering'))).toEqual([
      'Dag 1–7: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 5 mg = 1 tablett à 5 mg',
      'Dag 8–28: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 29–42: Risperidon peroralt: 3 mg = 1 tablett à 3 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 43–56: Risperidon peroralt: 2 mg = 1 tablett à 2 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 57–70: Risperidon peroralt: 1 mg = 1 tablett à 1 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      'Fra dag 71: Risperidon peroralt: Seponert; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
    ])
    // Vurderingspunktene står i den kopierbare planen: før hver reduksjon, også siste, og 14 dager etter seponeringen.
    expect(linjer(planer['antipsykotikabytte-risperidon-aripiprazol']).filter((l) => l.includes('Vurdering')).map((l) => l.split(':')[0])).toEqual(['Dag 8', 'Dag 29', 'Dag 43', 'Dag 57', 'Dag 71', 'Dag 84'])
  })

  it('stopper fortsatt utenfor den godkjente avgrensningen', () => {
    // Xeplion: bare fra 3 mg risperidon og bare 75 mg; 4–6 mg → 75 mg er fortsatt avvist.
    for (const dose of ['2', '4', '5', '6']) expect(grunner(ekte('depot-risperidon-xeplion', dose, { maldose: '75' })), dose).toMatch(new RegExp(`Startdosen ${dose} mg er utenfor`))
    expect(ekte('depot-risperidon-xeplion', '3', { maldose: '100' }).utfall).not.toBe('plan')
    expect(grunner(ekte('depot-risperidon-xeplion', '3', { maldose: '75', pasientforhold: { overvekt: true } }))).toMatch(/Pasienten har overvekt eller fedme/)
    // Kryss-titreringene: bare kildens startdoser, og tidligere seponeringsplager eller manglende vurdering av siste trinn stopper.
    expect(grunner(ekte('antipsykotikabytte-olanzapin-aripiprazol', '15', { formvalg: { fra: TABLETTER, til: TABLETTER }, maldose: '15' }))).toMatch(/Startdosen 15 mg er utenfor/)
    expect(grunner(ekte('antipsykotikabytte-risperidon-aripiprazol', '6', { formvalg: { fra: TABLETTER, til: TABLETTER }, maldose: '10' }))).toMatch(/Startdosen 6 mg er utenfor/)
    expect(ekte('antipsykotikabytte-risperidon-aripiprazol', '4', { formvalg: { fra: TABLETTER, til: TABLETTER }, maldose: '20' }).utfall).not.toBe('plan')
    for (const id of ['antipsykotikabytte-olanzapin-aripiprazol', 'antipsykotikabytte-risperidon-aripiprazol'] as const) {
      const dose = id === 'antipsykotikabytte-olanzapin-aripiprazol' ? '20' : '4'
      const u = ekte(id, dose, { formvalg: { fra: TABLETTER, til: TABLETTER }, maldose: '10', pasientforhold: { seponeringsplager: true } })
      expect(u.utfall, id).not.toBe('plan')
      expect(grunner(u), id).toMatch(/Pasienten har tidligere fått seponeringsplager/)
    }
  })

  it('FEST-kopien må være fersk også for de godkjente: 47 timer gir plan, 49 timer gir ingen', () => {
    expect(ekte('depot-risperidon-xeplion', '3', { maldose: '75' }, { timer: 47 }).utfall).toBe('plan')
    expect(grunner(ekte('depot-risperidon-xeplion', '3', { maldose: '75' }, { timer: 49 }))).toMatch(/sist kontrollert mot FEST/)
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
    expect(kjor('depot-risperidon-xeplion', '3', { maldose: '75' }, { timer: 47 }).utfall).toBe('plan')
    const u = kjor('depot-risperidon-xeplion', '3', { maldose: '75' }, { timer: 49 })
    expect(u.utfall).toBe('stopp')
    expect(grunner(u)).toMatch(/sist kontrollert mot FEST/)
  })

  it('uten simulert godkjenning gir en regel som står til kontroll, ingen plan', () => {
    for (const [id, dose] of [['antipsykotikabytte-kariprazin-kvetiapin', '4,5'], ['depot-consta-xeplion', '37,5'], ['antipsykotikabytte-aripiprazol-risperidon', '15']] as const) {
      const u = kjor(id, dose, { maldose: '6' }, { regel: { id } })
      expect(u.utfall, id).toBe('stopp')
      expect(grunner(u), id).toMatch(/til faglig kontroll, ikke klinisk godkjent/)
      expect(regel(id).godkjenning.status, id).toBe('til_faglig_kontroll')
    }
  })
})
