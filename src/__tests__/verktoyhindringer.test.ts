/**
 * Spor B (P2b) i produktrevisjonen: unødvendige hindringer i flyten
 * (`docs/verktøy-p0-rapport-2026-11.md` §8, F1, F4, U1 og M4). Uten
 * nettleser, mot appens regelsett og faktiske godkjenninger. Alle
 * pasientopplysninger er syntetiske.
 */
import { describe, expect, it } from 'vitest'
import { godkjenteVerdier, ikkeGodkjenteJusteringer, justeringsfelt, TOMT_SKJEMA } from '../verktoy/doseplan'
import { FORKLARINGER, stoppforklaringer } from '../verktoy/flyt/stopp'
import type { Doseplanresultat } from '../verktoy/motor/plan'
import { erErstattet, erKliniskGodkjent } from '../verktoy/regler/godkjenning'
import { justerbare } from '../verktoy/regler/modell'
import { VERKTOY } from '../verktoy/register'
import { REGELSETT } from '../verktoy/tilgjengelighet'

const iBruk = REGELSETT.regler.filter((r) => erKliniskGodkjent(r) && !erErstattet(r, REGELSETT.regler))
const regel = (id: string) => iBruk.find((r) => r.id === id)!
const ESCITALOPRAM = 'seponering-escitalopram-tabletter-og-draper'
const PROSENT = 'plan.forlop[0].faser[0].strategi.prosent'
const DAGER = 'plan.forlop[0].faser[0].trinnlengde'

describe('«Tilpass planen» tilbyr bare det den godkjente planen bruker (F1)', () => {
  it('escitalopram: 25 % og 28 dager ved kort behandlingstid, 10 % ved lang, for 10 og 20 mg; ingen for 15 mg', () => {
    const r = regel(ESCITALOPRAM)
    expect(godkjenteVerdier(r, PROSENT, {}, 10)).toEqual([25, 10].sort((a, b) => a - b))
    expect(godkjenteVerdier(r, PROSENT, { lang_behandlingstid: false }, 10)).toEqual([25])
    expect(godkjenteVerdier(r, PROSENT, { lang_behandlingstid: true }, 20)).toEqual([10])
    expect(godkjenteVerdier(r, DAGER, { lang_behandlingstid: false }, 20)).toEqual([28])
    expect(godkjenteVerdier(r, PROSENT, { lang_behandlingstid: false }, 15)).toEqual([])
  })

  it('hvert felt i en regel med klinisk omfang sier hvilke verdier som er godkjent, og nevner ikke modellens område', () => {
    for (const r of iBruk.filter((x) => x.klinisk_omfang && justerbare(x).length > 0)) {
      const svar = Object.fromEntries((r.sporsmal ?? []).map((s) => [s.id, false]))
      const start = r.klinisk_omfang!.tilfeller[0]!.startdoser[0]!
      for (const f of justeringsfelt(r, svar, start)) {
        expect(f.godkjent, `${r.id} ${f.navn}`).toHaveLength(1)
        expect(f.hjelp, `${r.id} ${f.navn}`).not.toMatch(/Regelen tillater/)
        expect(f.hjelp).toMatch(/^Den godkjente planen bruker /)
      }
    }
  })

  it('en dose eller svar uten godkjent plan (escitalopram 15 mg) gir ingen påstått verdi, og ingen egen stopp for feltet', () => {
    const r = regel(ESCITALOPRAM)
    const svar = { lang_behandlingstid: false }
    for (const f of justeringsfelt(r, svar, 15)) {
      expect(f.godkjent).toEqual([])
      expect(f.godkjentTekst).toBe('')
      expect(f.hjelp).toBe('Den godkjente planen gjelder ikke for denne dosen eller disse svarene, så verdien kan ikke tilpasses.')
    }
    expect(ikkeGodkjenteJusteringer(r, { ...TOMT_SKJEMA, startdose: '15', svar, justert: { [PROSENT]: '10' } })).toEqual([])
  })

  it('regler uten klinisk omfang er godkjent for hele området: feltet er som før', () => {
    for (const r of iBruk.filter((x) => !x.klinisk_omfang && justerbare(x).length > 0)) {
      for (const f of justeringsfelt(r)) {
        expect(f.godkjent).toBeUndefined()
        expect(f.hjelp).toMatch(/Regelen tillater /)
      }
    }
  })

  it('en lagret verdi utenfor godkjenningen sies konkret, med verdien som er godkjent; tomt felt og godkjent verdi er i orden', () => {
    const r = regel(ESCITALOPRAM)
    const skjema = { ...TOMT_SKJEMA, startdose: '10', svar: { lang_behandlingstid: false } }
    expect(ikkeGodkjenteJusteringer(r, skjema)).toEqual([])
    expect(ikkeGodkjenteJusteringer(r, { ...skjema, justert: { [PROSENT]: '25' } })).toEqual([])
    expect(ikkeGodkjenteJusteringer(r, { ...skjema, justert: { [PROSENT]: '10', [DAGER]: '14' } }).map((x) => x.tekst)).toEqual([
      'Reduksjon per trinn (% av aktuell dose) 10 % er ikke godkjent: den godkjente planen bruker 25 %.',
      'Minste antall dager per trinn 14 dager er ikke godkjent: den godkjente planen bruker 28 dager.',
    ])
  })
})

describe('stoppmeldingene sier riktig årsak (spor B punkt 2 og 6)', () => {
  const stoppet = (koder: { kode: string; tekst: string }[]): Doseplanresultat => ({ status: 'stoppet', stoppgrunner: koder.map((k) => k.tekst), stoppkoder: koder }) as unknown as Doseplanresultat

  it('manglende godkjenning eller omfang er aldri «Prøv igjen senere»; det er bare en FEST-kopi som ikke er fersk', () => {
    expect(FORKLARINGER.ikke_klinisk.handling).toBeUndefined()
    const omfang = stoppforklaringer(
      stoppet([
        { kode: 'ikke_klinisk', tekst: 'Ingen klinisk doseplan kan vises.' },
        { kode: 'utenfor_omfang', tekst: 'Reduksjon per trinn (% av aktuell dose) 10 % er ikke verdien som er kontrollert (25 %), heller ikke med begrunnelse.' },
      ]),
    )
    // Overskriften er ingen grunn i seg selv og tas bort når motoren sier mer.
    expect(omfang.map((f) => f.kode)).toEqual(['utenfor_omfang'])
    expect(omfang.some((f) => /Prøv igjen/.test(f.handling ?? ''))).toBe(false)
    const godkjenning = stoppforklaringer(stoppet([{ kode: 'ikke_klinisk', tekst: 'Regelversjonen er ikke klinisk godkjent.' }]))
    expect(godkjenning[0]!.handling).toBeUndefined()
    expect(godkjenning[0]!.tekst).toMatch(/^Regelen er ikke gyldig klinisk godkjent for dette tilfellet/)
    const fest = stoppforklaringer(stoppet([{ kode: 'ikke_klinisk', tekst: 'FEST-kopien ble sist kontrollert for mer enn 48 timer siden.' }]))
    expect(fest[0]!).toMatchObject({ handling: 'Prøv igjen senere.', tekst: expect.stringMatching(/^Legemiddeldataene er ikke bekreftet ferske mot FEST/) })
  })

  it('en plan som ikke når sluttmålet, sier at det er en begrensning i verktøyet, ikke en kontraindikasjon', () => {
    expect(FORKLARINGER.ikke_komplett.tekst).toMatch(/begrensning i verktøyet, ikke nødvendigvis en medisinsk grunn mot behandlingen/)
  })
})

describe('undertitlene lover verken en delplan eller mer enn det som er godkjent (F5)', () => {
  it('nedtrapping og bytte av antidepressiv lover en komplett plan bare der et godkjent forløp passer', () => {
    for (const v of VERKTOY) expect(v.beskrivelse).not.toMatch(/første trinnene|starten på et bytte/)
    for (const v of VERKTOY.filter((x) => /antidepressiv/.test(x.beskrivelse))) {
      expect(v.beskrivelse).toMatch(/^Komplett .* der et godkjent forløp passer\. Ellers sier verktøyet hvorfor\.$/)
    }
  })
})
