/**
 * Den tekniske vakten for FEST-synkroniseringen (F4 i
 * `docs/verktøy-vdr4-tilgjengelighet.md`): hva den sier fra om, ved
 * grensene, og at den aldri leser en ukjent form som «i orden».
 */
import { describe, expect, it } from 'vitest'
import { FEST_FORELDET_ETTER_TIMER } from '../legemiddeldata/referanser'
import { festvakt, lesVaktkjoringer, provestatus, VAKT_MAKS_MINUTTER_PAGAR, VAKT_MAKS_TIMER_UTEN_KONTROLL, type Vaktkjoring } from '../legemiddeldata/vakt'

const T = 3_600_000
const NAA = new Date('2026-11-03T06:07:00Z')
const for_ = (ms: number) => new Date(NAA.getTime() - ms).toISOString()
let neste = 100
const kjoring = (status: Vaktkjoring['status'], siden: number, mer: Partial<Vaktkjoring> = {}): Vaktkjoring => ({
  id: neste--,
  kilde: 'FEST',
  status,
  startet_kl: for_(siden),
  avsluttet_kl: status === 'pagar' ? null : for_(siden),
  feil: status === 'feilet' ? 'FEST svarte 503' : null,
  ...mer,
})

describe('FEST-vakten', () => {
  it('er i orden etter en vellykket natt, og sier når verktøyene ellers ville stoppet', () => {
    neste = 100
    const r = festvakt([kjoring('uendret', 2 * T), kjoring('fullfort', 26 * T)], NAA)
    expect(r).toEqual({ iOrden: true, funn: [], kontrollertKl: for_(2 * T), verktoyeneStopperKl: for_(2 * T - FEST_FORELDET_ETTER_TIMER * T) })
  })

  it('sier fra etter første natt som feilet, med trinnet, om en ny fil var oppdaget, og når verktøyene stopper', () => {
    neste = 100
    const r = festvakt([kjoring('feilet', 2 * T, { trinn: 'lesing', ny_fil: true }), kjoring('uendret', 26 * T)], NAA)
    expect(r.iOrden).toBe(false)
    expect(r.funn[0]).toMatch(/^Siste FEST-kjøring \(03\.11\.2026, 05:07\) feilet mens filen ble lest: FEST svarte 503\. En ny FEST-fil var oppdaget, men ble ikke lest inn\.$/)
    expect(r.funn.at(-1)).toBe('Verktøyene slutter å beregne 04.11.2026, 05:07 hvis ingen kjøring går bra før da.')
    neste = 100
    expect(festvakt([kjoring('feilet', T, { ny_fil: false }), kjoring('uendret', 25 * T)], NAA).funn[0]).toMatch(/feilet: FEST svarte 503\. Filen var den samme som sist\.$/)
  })

  it(`sier fra når ingen kjøring har gått bra på mer enn ${VAKT_MAKS_TIMER_UTEN_KONTROLL} timer, også når ingen har feilet`, () => {
    neste = 100
    expect(festvakt([kjoring('uendret', VAKT_MAKS_TIMER_UTEN_KONTROLL * T)], NAA).iOrden).toBe(true)
    neste = 100
    const r = festvakt([kjoring('uendret', VAKT_MAKS_TIMER_UTEN_KONTROLL * T + 1_000)], NAA)
    expect(r.funn[0]).toMatch(/^Ingen FEST-kjøring har gått bra siden /)
  })

  it('sier at verktøyene har stoppet når siste vellykkede er mer enn 48 timer gammel', () => {
    neste = 100
    const r = festvakt([kjoring('feilet', T), kjoring('feilet', 25 * T), kjoring('uendret', FEST_FORELDET_ETTER_TIMER * T + 1_000)], NAA)
    expect(r.funn.at(-1)).toMatch(/^Verktøyene beregner ikke lenger: FEST-kopien ble sist kontrollert .*, mer enn 48 timer siden\.$/)
  })

  it(`sier fra om en kjøring som har stått uavsluttet i mer enn ${VAKT_MAKS_MINUTTER_PAGAR} minutter, men ikke om en som nettopp startet`, () => {
    neste = 100
    expect(festvakt([kjoring('pagar', VAKT_MAKS_MINUTTER_PAGAR * 60_000), kjoring('uendret', 24 * T)], NAA).iOrden).toBe(true)
    neste = 100
    expect(festvakt([kjoring('pagar', VAKT_MAKS_MINUTTER_PAGAR * 60_000 + 1_000), kjoring('uendret', 24 * T)], NAA).funn[0]).toMatch(/har stått uavsluttet siden/)
  })

  it('sier fra når det ikke finnes noen kjøring eller ingen har gått bra, og ser bare på FEST', () => {
    expect(festvakt([], NAA).funn).toEqual(['Det finnes ingen FEST-kjøringer i statusen.', 'Ingen FEST-kjøring i statusen har gått bra.'])
    neste = 100
    expect(festvakt([kjoring('uendret', T, { kilde: 'ANNEN' })], NAA).iOrden).toBe(false)
  })

  it('godtar svaret fra statusen, og kaster på en form den ikke kjenner i stedet for å si «i orden»', () => {
    const rad = { id: 1, kilde: 'FEST', status: 'uendret', startet_kl: '2026-11-03T04:15:06+00:00', avsluttet_kl: '2026-11-03T04:15:07+00:00', kildedato: null, antall: null, feil: null }
    expect(lesVaktkjoringer([rad])).toEqual([{ ...{ id: 1, kilde: 'FEST', status: 'uendret', startet_kl: rad.startet_kl, avsluttet_kl: rad.avsluttet_kl, feil: null }, trinn: null, ny_fil: null }])
    for (const feil of [null, {}, [{ ...rad, status: 'ok' }], [{ ...rad, id: '1' }], [{ ...rad, startet_kl: 'i går' }]]) {
      expect(() => lesVaktkjoringer(feil)).toThrow(/form vakten ikke kjenner/)
    }
  })

  it('prøven er syntetisk, merket som prøve, og gir et varsel', () => {
    const r = festvakt(provestatus(NAA), NAA)
    expect(r.iOrden).toBe(false)
    expect(r.funn[0]).toMatch(/PRØVE AV VAKTEN/)
  })
})
