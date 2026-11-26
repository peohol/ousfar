/**
 * Teksten om hva en høyere sikkerhetsmargin ville gitt (#576): den kliniske
 * forskjellen står alltid, også utdypingen og indikasjonen etter en eldre
 * prøve, så to marginer med samme konklusjon ikke ser like ut. Med den
 * aktive femprofilsmodellen og oppdiktede prøver.
 */
import { describe, expect, it } from 'vitest'
import { tomBeUrinInndata, type BeUrinProve } from '../beUrinMotor'
import { fortolkBeUrinProfiler, mildereProfilutfall, type BeUrinProfilMildere } from '../beUrinProfiler'
import { BE_URIN_KRONISK_TEKST, BE_URIN_SPORADISK_TEKST, boblelinje, mildereTekst } from '../beUrinProfilvisning'
import { godkjentProfilmodell } from './hjelp/beUrinTestmodell'

const MODELL = godkjentProfilmodell()
const prove = (benzoylekgonin: number, dato: string): BeUrinProve => ({ benzoylekgonin: String(benzoylekgonin), kreatinin: '2', dato })

/** Tekstene for de mildere utfallene, slik resultatet viser dem. */
function mildere(forrige: BeUrinProve, denne: BeUrinProve, margin: number, tidligere: BeUrinProve[] = []) {
  const inn = { ...tomBeUrinInndata(MODELL), forrige, denne, sikkerhetsmargin: margin, tidligere }
  const r = fortolkBeUrinProfiler(inn, MODELL)
  if (r.type !== 'vurdering') throw new Error('Ventet en vurdering')
  return mildereProfilutfall(inn, MODELL, r).map((u) =>
    mildereTekst(u, {
      tekst: u.vurdering === 'sporadisk' ? BE_URIN_SPORADISK_TEKST[r.sammenligning.sporadisk] : BE_URIN_KRONISK_TEKST[r.sammenligning.kronisk],
      samletTreff: u.vurdering === 'kronisk' && Boolean(r.samlet?.treff),
    }),
  )
}

describe('høyere sikkerhetsmargin i tekst', () => {
  it('skiller «svært uvanlig» fra den andre «kan ikke fastslås» ved kronisk bruk (BE 200 → 240, ett døgn, uten margin)', () => {
    // Uten margin: sannsynlig. 90 %: over moderat og treg, ikke over ekstrem. 99 %: under moderat og treg.
    expect(mildere(prove(200, '2026-01-01'), prove(240, '2026-01-02'), 0.5)).toEqual([
      'Ved 90 % sikkerhetsmargin blir vurderingen ved kronisk bruk: Nytt inntak kan ikke fastslås. ' +
        'En såpass treg utskillelse anses likevel som svært uvanlig.',
      'Ved 99 % sikkerhetsmargin blir vurderingen ved sporadisk bruk: Nytt inntak kan ikke fastslås. ' +
        'Endringen er forenlig med utskillelse etter gjentatte doser innenfor et kort tidsrom.',
      'Ved 99 % sikkerhetsmargin blir vurderingen ved kronisk bruk: Nytt inntak kan ikke fastslås.',
    ])
  })

  it('skiller enkeltinntak fra gjentatte doser ved sporadisk bruk', () => {
    const u = (utfall: BeUrinProfilMildere['utfall']): BeUrinProfilMildere =>
      ({ vurdering: 'sporadisk', utfall, samletDato: null, marginer: [0.99] }) as BeUrinProfilMildere
    const gjeldende = { tekst: BE_URIN_SPORADISK_TEKST.forenlig_gjentatte_doser, samletTreff: false }
    expect(mildereTekst(u('forenlig_enkeltinntak'), gjeldende)).toBe(
      'Ved 99 % sikkerhetsmargin blir vurderingen ved sporadisk bruk: Nytt inntak kan ikke fastslås. ' +
        'Endringen er forenlig med utskillelse etter et enkeltinntak.',
    )
    expect(mildereTekst(u('sannsynlig'), { tekst: BE_URIN_SPORADISK_TEKST.nytt_inntak, samletTreff: false })).toBe(
      'Ved 99 % sikkerhetsmargin blir vurderingen ved sporadisk bruk: Sannsynlig nytt inntak.',
    )
  })

  it('sier at bemerkningen om svært uvanlig utskillelse faller bort, med samme konklusjon', () => {
    const u = { vurdering: 'kronisk', utfall: 'uavklart', samletDato: null, marginer: [0.99] } as BeUrinProfilMildere
    expect(mildereTekst(u, { tekst: BE_URIN_KRONISK_TEKST.uavklart_uvanlig, samletTreff: false })).toBe(
      'Ved 99 % sikkerhetsmargin blir vurderingen ved kronisk bruk: Nytt inntak kan ikke fastslås. ' +
        'Uten bemerkningen om svært uvanlig utskillelse.',
    )
  })

  it('tar med indikasjonen etter en eldre prøve, med hele vurderingen', () => {
    // Forrige 100 → denne 150 med en eldre prøve: sannsynlig uten margin, uvanlig med indikasjon ved 99 %.
    expect(mildere(prove(200, '2026-01-02'), prove(300, '2026-01-03'), 0.5, [prove(60, '2025-12-25')])).toContain(
      'Ved 99 % sikkerhetsmargin blir vurderingen ved kronisk bruk: Nytt inntak kan ikke fastslås. ' +
        'En såpass treg utskillelse anses likevel som svært uvanlig. Indikasjon på nytt inntak etter prøven fra ' +
        '25.12.2025, men ikke nødvendigvis etter forrige prøve.',
    )
  })

  it('sier at indikasjonen etter en eldre prøve faller bort', () => {
    const u = { vurdering: 'kronisk', utfall: 'uavklart_uvanlig', samletDato: null, marginer: [0.99] } as BeUrinProfilMildere
    expect(mildereTekst(u, { tekst: BE_URIN_KRONISK_TEKST.uavklart_uvanlig, samletTreff: true })).toBe(
      'Ved 99 % sikkerhetsmargin blir vurderingen ved kronisk bruk: Nytt inntak kan ikke fastslås. ' +
        'En såpass treg utskillelse anses likevel som svært uvanlig. Ingen indikasjon på nytt inntak etter de tidligere prøvene.',
    )
  })
})

describe('høyere sikkerhetsmargin i snakkeboblene', () => {
  const u = (vurdering: 'sporadisk' | 'kronisk', utfall: string, samletDato: string | null = null) =>
    ({ vurdering, utfall, samletDato, marginer: [0.99] }) as BeUrinProfilMildere

  it('gir klinisk ulike utfall ulike linjer, uansett hvilken vurdering som står', () => {
    const utfall = {
      sporadisk: Object.keys(BE_URIN_SPORADISK_TEKST),
      kronisk: Object.keys(BE_URIN_KRONISK_TEKST),
    } as const
    for (const vurdering of ['sporadisk', 'kronisk'] as const) {
      const tekster = vurdering === 'sporadisk' ? BE_URIN_SPORADISK_TEKST : BE_URIN_KRONISK_TEKST
      for (const tekst of Object.values(tekster)) {
        for (const samletTreff of [false, true]) {
          const linjer = utfall[vurdering].map((x) => boblelinje(u(vurdering, x), { tekst, samletTreff }))
          expect(new Set(linjer).size).toBe(linjer.length)
        }
      }
    }
  })

  it('sier utdypingen kort, at bemerkningen faller bort, og indikasjonen etter en eldre prøve med datoen', () => {
    const uvanlig = { tekst: BE_URIN_KRONISK_TEKST.uavklart_uvanlig, samletTreff: false }
    expect(boblelinje(u('sporadisk', 'forenlig_enkeltinntak'), { tekst: BE_URIN_SPORADISK_TEKST.nytt_inntak, samletTreff: false })).toBe(
      'Sporadisk: Kan ikke fastslås – forenlig med enkeltinntak',
    )
    expect(boblelinje(u('kronisk', 'uavklart'), uvanlig)).toBe('Kronisk: Kan ikke fastslås, uten «svært uvanlig utskillelse»')
    expect(boblelinje(u('kronisk', 'uavklart_uvanlig', '2025-12-25'), { tekst: BE_URIN_KRONISK_TEKST.sannsynlig, samletTreff: false })).toBe(
      'Kronisk: Kan ikke fastslås – svært uvanlig utskillelse (indikasjon etter 25.12.2025)',
    )
    expect(boblelinje(u('kronisk', 'uavklart'), { ...uvanlig, samletTreff: true })).toBe(
      'Kronisk: Kan ikke fastslås, uten «svært uvanlig utskillelse», uten indikasjon etter tidligere prøve',
    )
  })
})
