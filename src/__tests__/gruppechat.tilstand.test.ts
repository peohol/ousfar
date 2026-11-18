/**
 * Sammenflettingen av chatmeldingene (`src/gruppechat/tilstand.ts`,
 * docs/gruppechat.md, «Sanntiden»): feil rekkefølge, duplikater, samme melding
 * fra svaret og sanntiden, endringer etter sletting, eldre sider og ventende
 * meldinger; og hvordan feilene fra databasen leses (`api.ts`). Bare
 * syntetiske meldinger.
 */
import { describe, expect, it } from 'vitest'
import { IngenTilgang, lagChatapi } from '../gruppechat/api'
import type { Chatside, Gruppemelding, Ventende } from '../gruppechat/modell'
import { GRUPPECHAT_GRENSER } from '../gruppechat/modell'
import {
  flettMeldinger,
  medEldre,
  medEndringer,
  medForsteSide,
  medMelding,
  TOM_MELDINGSTILSTAND,
  ubekreftede,
  type Meldingstilstand,
} from '../gruppechat/tilstand'
import { syntetiskeMeldinger } from './hjelp/testchat'

const m = (nr: number, endring = nr, ekstra: Partial<Gruppemelding> = {}): Gruppemelding => ({
  ...syntetiskeMeldinger(1, nr)[0]!,
  endring,
  ...ekstra,
})

const side = (meldinger: Gruppemelding[], ekstra: Partial<Chatside> = {}): Chatside => ({
  meldinger,
  flere_eldre: false,
  siste_endring: Math.max(0, ...meldinger.map((x) => x.endring)),
  lest_til_nr: 0,
  kan_skrive: true,
  kan_moderere: false,
  lesere: { medlemmer: 3, systemarkitekter: true },
  grenser: { ...GRUPPECHAT_GRENSER },
  direkte: null,
  ...ekstra,
})

const ventende = (klient_id: string): Ventende => ({ klient_id, tekst: 'Syntetisk', sendt_kl: '2026-11-17T08:00:00Z', status: 'sender', feil: null })

const nr = (t: { meldinger: Gruppemelding[] } | Gruppemelding[]) => (Array.isArray(t) ? t : t.meldinger).map((x) => x.nr)

describe('flettMeldinger', () => {
  it('sorterer etter nr uansett rekkefølgen de kommer i', () => {
    expect(nr(flettMeldinger([], [m(3), m(1), m(2)]))).toEqual([1, 2, 3])
    expect(nr(flettMeldinger([m(2)], [m(4), m(1), m(3)]))).toEqual([1, 2, 3, 4])
  })

  it('gir hver melding én gang, også når den kommer flere ganger', () => {
    const liste = flettMeldinger([m(1), m(2)], [m(2), m(2), m(3), m(1)])
    expect(nr(liste)).toEqual([1, 2, 3])
  })

  it('lar høyere endring vinne, og overser en eldre versjon som kommer for sent', () => {
    const redigert = m(2, 7, { tekst: 'Redigert', redigert_kl: '2026-11-17T09:00:00Z' })
    const slettet = m(2, 9, { tekst: null, slettet: { av: 'moderator', kl: '2026-11-17T10:00:00Z' } })
    let liste = flettMeldinger([m(1), m(2)], [slettet])
    liste = flettMeldinger(liste, [redigert, m(2)])
    expect(liste[1]).toEqual(slettet)
    expect(liste[1]!.tekst).toBeNull()
  })

  it('gir samme lista tilbake når ingenting er nytt', () => {
    const liste = [m(1), m(2)]
    expect(flettMeldinger(liste, [m(1), m(2)])).toBe(liste)
    expect(flettMeldinger(liste, [])).toBe(liste)
  })

  it('tar ikke med en endret melding eldre enn det som er hentet, med fraNr', () => {
    const liste = [m(50), m(51)]
    expect(nr(flettMeldinger(liste, [m(3, 60), m(52, 61)], 50))).toEqual([50, 51, 52])
    // En som alt står, oppdateres likevel.
    expect(flettMeldinger(liste, [m(50, 70, { tekst: 'Ny' })], 50)[0]!.tekst).toBe('Ny')
  })
})

describe('ubekreftede', () => {
  it('fjerner de ventende som har fått sin melding, etter klient_id', () => {
    const v = [ventende('a'), ventende('b')]
    expect(ubekreftede(v, [m(1, 1, { klient_id: 'a', egen: true })]).map((x) => x.klient_id)).toEqual(['b'])
    expect(ubekreftede(v, [m(1)])).toBe(v)
  })
})

describe('tilstanden', () => {
  const start = (meldinger: Gruppemelding[], flere_eldre = false): Meldingstilstand =>
    medForsteSide(TOM_MELDINGSTILSTAND, side(meldinger, { flere_eldre }))

  it('den første siden setter endringstelleren og om det er eldre meldinger', () => {
    const t = start([m(51), m(52)], true)
    expect(t.sisteEndring).toBe(52)
    expect(t.flereEldre).toBe(true)
  })

  it('eldre sider legges foran uten duplikater, og flytter ikke endringstelleren', () => {
    let t = start([m(51, 60), m(52, 61)], true)
    t = medEldre(t, side([m(49, 99), m(50, 99), m(51, 60)], { flere_eldre: false, siste_endring: 99 }))
    expect(nr(t)).toEqual([49, 50, 51, 52])
    expect(t.flereEldre).toBe(false)
    expect(t.sisteEndring).toBe(61)
  })

  it('endringene flytter telleren framover, aldri bakover', () => {
    let t = start([m(1), m(2)])
    t = medEndringer(t, { meldinger: [m(3)], siste_endring: 3, flere: false })
    expect(t.sisteEndring).toBe(3)
    t = medEndringer(t, { meldinger: [], siste_endring: 1, flere: false })
    expect(t.sisteEndring).toBe(3)
  })

  it('samme melding fra svaret og sanntiden står én gang, og den ventende forsvinner', () => {
    let t: Meldingstilstand = { ...start([m(1)]), ventende: [ventende('meg-1')] }
    const egen = m(2, 2, { klient_id: 'meg-1', egen: true })
    t = medEndringer(t, { meldinger: [egen], siste_endring: 2, flere: false })
    expect(t.ventende).toEqual([])
    t = medMelding(t, egen)
    expect(nr(t)).toEqual([1, 2])
  })

  it('svaret alene flytter ikke endringstelleren', () => {
    const t = medMelding(start([m(1)]), m(5, 5))
    expect(t.sisteEndring).toBe(1)
    expect(nr(t)).toEqual([1, 5])
  })

  it('endringer i meldinger eldre enn den første siden venter til de eldre hentes', () => {
    let t = start([m(51, 51), m(52, 52)], true)
    t = medEndringer(t, { meldinger: [m(10, 53, { tekst: 'Redigert' })], siste_endring: 53, flere: false })
    expect(nr(t)).toEqual([51, 52])
    expect(t.sisteEndring).toBe(53)
    // Når alt er hentet, tas de med.
    t = medEldre(t, side([m(10, 53, { tekst: 'Redigert' })], { flere_eldre: false }))
    t = medEndringer(t, { meldinger: [m(9, 54)], siste_endring: 54, flere: false })
    expect(nr(t)).toEqual([9, 10, 51, 52])
  })
})

describe('feilene fra databasen (api.ts)', () => {
  const api = (code: string, message: string) =>
    lagChatapi(() => ({ rpc: (async () => ({ data: null, error: { code, message } })) as never }))

  it('gir IngenTilgang ved 42501, og databasens norske tekst ellers', async () => {
    await expect(api('42501', 'Gruppechatten er ikke slått på.').lesGruppechat('g')).rejects.toBeInstanceOf(IngenTilgang)
    await expect(api('42501', 'permission denied').hentChatendringer('g', 0)).rejects.toThrow('Du har ikke tilgang til denne gruppen.')
    for (const kode of ['22023', '54000', '55000']) {
      await expect(api(kode, 'Gruppen er arkivert.').sendGruppemelding('g', 'k', 'x'), kode).rejects.toThrow('Gruppen er arkivert.')
    }
    await expect(api('XX000', 'intern feil').slettGruppemelding('m')).rejects.toThrow(/^Noe gikk galt/)
  })
})
