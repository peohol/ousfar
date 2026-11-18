// @vitest-environment jsdom
/**
 * Direktemeldingene i klienten (docs/direktemeldinger-personvern.md): kallene
 * og hvordan feilene og svarene leses (`src/direktemeldinger/kall.ts`,
 * `modell.ts`), oversikten som skjuler alt når funksjonen er av
 * (`useDirekte.ts`), tekstene i samtalen (`gruppechatvisning.ts`), og at en
 * åpen samtale følger sperren (kontrolleren). Tilgangen selv prøves mot
 * databasen i `direktemeldinger.test.ts`. Bare syntetiske personer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DIREKTE_LESERE, laastTekst, slettetekster, slettettekst } from '../components/grupper/gruppechatvisning'
import { lagDirekteapi } from '../direktemeldinger/kall'
import {
  AVSLAATTE_CHATVALG,
  lesChatvalg,
  lesDirektesamtaler,
  personnavn,
  sokIDirektesamtaler,
  ulesteDirekte,
  type Direktesamtale,
} from '../direktemeldinger/modell'
import { hentDirekteoversikt, UTEN_DIREKTE } from '../direktemeldinger/useDirekte'
import { IngenTilgang, Sperret } from '../gruppechat/kall'
import { lagChatkontroller, type Chatkontroller } from '../gruppechat/kontroller'
import type { Chatside, Direktemeta } from '../gruppechat/modell'
import { Falskchatserver, vent } from './hjelp/falskchat'
import { TESTPERSONER } from './hjelp/testchat'

const { kari, ola } = TESTPERSONER

/** En klient som svarer det `svar` gir for hvert kall, og husker kallene. */
function falskKlient(svar: (navn: string, argumenter: Record<string, unknown>) => { data?: unknown; error?: { code: string; message: string } }) {
  const kall: [string, Record<string, unknown>][] = []
  const klient = {
    rpc: async (navn: string, argumenter: Record<string, unknown>) => {
      kall.push([navn, argumenter])
      const { data = null, error = null } = svar(navn, argumenter)
      return { data, error }
    },
  }
  return { api: lagDirekteapi(() => klient as never), kall }
}

const samtale = (id: string, ekstra: Partial<Direktesamtale> = {}): Direktesamtale => ({
  id,
  motpart: { ...kari },
  siste_kl: '2026-11-18T12:00:00Z',
  uleste: 0,
  dempet: false,
  kan_skrive: true,
  ...ekstra,
})

describe('kallene', () => {
  it('sender argumentene med navnene funksjonene har', async () => {
    const { api, kall } = falskKlient(() => ({ data: [] }))
    await api.sokDirektemottakere('kari')
    await api.settChatvalg({ vis_aktiv: true })
    await api.dempDirektesamtale('s', true)
    expect(kall).toEqual([
      ['sok_direktemottakere', { sok: 'kari' }],
      // Det som er utelatt, sendes som null og står.
      ['sett_chatvalg', { tillat: null, vis_aktiv: true }],
      ['demp_direktesamtale', { samtale: 's', dempet: true }],
    ])
  })

  it('leser 42501 som ingen tilgang, med den felles teksten når databasen ikke gir en', async () => {
    const { api } = falskKlient(() => ({ error: { code: '42501', message: 'permission denied for function les_direktesamtale' } }))
    const feil = await api.lesDirektesamtale('gjettet').catch((e: unknown) => e)
    expect(feil).toBeInstanceOf(IngenTilgang)
    expect((feil as Error).message).toBe('Samtalen finnes ikke, eller du har ikke tilgang til den.')
  })

  it('leser PT409 som en sperre, med teksten databasen ga', async () => {
    const { api } = falskKlient(() => ({ error: { code: 'PT409', message: 'Kan ikke motta nye direktemeldinger.' } }))
    const feil = await api.sendDirektemelding('s', 'k', 'Hei').catch((e: unknown) => e)
    expect(feil).toBeInstanceOf(Sperret)
    expect((feil as Error).message).toBe('Kan ikke motta nye direktemeldinger.')
  })

  it('tåler svar uten riktig form', async () => {
    const { api } = falskKlient((navn) => ({ data: navn === 'aktive_motparter' ? [kari.id, 7, null] : { ikke: 'en liste' } }))
    expect(await api.mineDirektesamtaler()).toEqual([])
    expect(await api.sokDirektemottakere('xx')).toEqual([])
    expect(await api.mineChatvalg()).toEqual(AVSLAATTE_CHATVALG)
    expect(await api.aktiveMotparter()).toEqual([kari.id])
    await expect(api.aapneDirektesamtale(kari.id)).rejects.toThrow('Samtalen kunne ikke åpnes. Prøv igjen.')
  })
})

describe('oversikten', () => {
  it('er tom og avslått når databasen sier at direktemeldingene ikke er slått på', async () => {
    const av = { mineDirektesamtaler: async () => Promise.reject(new IngenTilgang('Direktemeldingene er ikke slått på.')), mineChatvalg: async () => AVSLAATTE_CHATVALG }
    expect(await hentDirekteoversikt(av)).toBe(UTEN_DIREKTE)
  })

  it('gir andre feil videre, så den forrige lista står', async () => {
    const nede = { mineDirektesamtaler: async () => Promise.reject(new Error('Kunne ikke nå serveren.')), mineChatvalg: async () => AVSLAATTE_CHATVALG }
    await expect(hentDirekteoversikt(nede)).rejects.toThrow('Kunne ikke nå serveren.')
  })

  it('gir lista og valgene når den er på', async () => {
    const valg = { tillat_direktemeldinger: true, vis_aktiv: false }
    const pa = { mineDirektesamtaler: async () => [samtale('a')], mineChatvalg: async () => valg }
    expect(await hentDirekteoversikt(pa)).toEqual({ pa: true, samtaler: [samtale('a')], valg })
  })
})

describe('modellen', () => {
  it('leser samtalene, og hopper over det som ikke er en samtale', () => {
    expect(lesDirektesamtaler([{ id: 'a', motpart: null, uleste: -3, dempet: 'ja' }, { uten: 'id' }, null])).toEqual([
      { id: 'a', motpart: null, siste_kl: null, uleste: 0, dempet: false, kan_skrive: false },
    ])
    expect(lesChatvalg({ tillat_direktemeldinger: 'true', vis_aktiv: true })).toEqual({ tillat_direktemeldinger: false, vis_aktiv: true })
  })

  it('teller ikke dempede samtaler på chatknappen', () => {
    expect(ulesteDirekte([samtale('a', { uleste: 2 }), samtale('b', { uleste: 5, dempet: true }), samtale('c', { uleste: 1 })])).toBe(3)
  })

  it('søker i navnet og brukernavnet til den andre, og kaller en slettet konto «Tidligere bruker»', () => {
    const liste = [samtale('a'), samtale('b', { motpart: { ...ola } }), samtale('c', { motpart: null })]
    expect(sokIDirektesamtaler(liste, 'KARI').map((s) => s.id)).toEqual(['a'])
    expect(sokIDirektesamtaler(liste, 'test.ola').map((s) => s.id)).toEqual(['b'])
    expect(sokIDirektesamtaler(liste, 'tidligere').map((s) => s.id)).toEqual(['c'])
    expect(sokIDirektesamtaler(liste, '  ')).toBe(liste)
    expect(personnavn(null)).toBe('Tidligere bruker')
  })
})

describe('tekstene i samtalen', () => {
  const meta = (sperre: Direktemeta['sperre']): Direktemeta => ({ motpart: { ...kari }, sperre, dempet: false })

  it('sier at bare de to leser', () => {
    expect(DIREKTE_LESERE).toBe('Bare dere to kan lese samtalen.')
  })

  it('gir den andre samme låste linje uansett grunn, og den innloggede sin egen', () => {
    expect(laastTekst(true, meta('mottaker'))).toBe('Kari Testesen kan ikke motta nye direktemeldinger. Samtalen kan fortsatt leses.')
    expect(laastTekst(true, meta('selv_av'))).toBe('Du har slått av direktemeldinger. Slå dem på for å skrive.')
    expect(laastTekst(true, meta('selv_blokkert'))).toBe('Du har blokkert Kari Testesen. Opphev blokkeringen for å skrive.')
    expect(laastTekst(true, { motpart: null, sperre: 'mottaker', dempet: false })).toBe(
      'Tidligere bruker kan ikke motta nye direktemeldinger. Samtalen kan fortsatt leses.',
    )
    // Gruppechatten er som før.
    expect(laastTekst(true, null)).toBe('Du kan lese chatten, men ikke skrive i den.')
    expect(laastTekst(false, null)).toBe('Gruppen er arkivert. Chatten kan leses, men ingen kan skrive i den.')
  })

  it('sier hvem som fjernet en melding, og ingenting om moderatorer i en direktesamtale', () => {
    const kl = '2026-11-18T12:00:00Z'
    expect(slettettekst({ egen: true, slettet: { av: 'motpart', kl } }, 'Kari Testesen')).toBe('Fjernet av Kari Testesen')
    expect(slettettekst({ egen: false, slettet: { av: 'motpart', kl } }, 'Kari Testesen')).toBe('Fjernet av deg')
    expect(slettettekst({ egen: true, slettet: { av: 'forfatter', kl } }, 'Kari Testesen')).toBe('Meldingen er slettet')
    expect(slettettekst({ egen: false, slettet: { av: 'moderator', kl } })).toBe('Fjernet av en moderator')

    const andres = slettetekster('Kari Testesen', false, true)
    expect(andres.tittel).toBe('Fjerne meldingen fra Kari Testesen?')
    expect(`${andres.forklaring} ${andres.tekst}`).not.toMatch(/moderator/i)
    expect(andres.tekst).toContain('dere begge')
    expect(slettetekster('Kari Testesen', false, false).tekst).toContain('en moderator fjernet den')
    expect(slettetekster('Meg', true, true)).toMatchObject({ meny: 'Slett', tittel: 'Slette meldingen?' })
  })
})

describe('en åpen samtale følger sperren', () => {
  let aapen: Chatkontroller | null = null

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    aapen?.stopp()
    aapen = null
    vi.useRealTimers()
  })

  /** En direktesamtale mot den falske serveren, der sperren kan endres underveis. */
  function aapneDirekte() {
    const server = new Falskchatserver()
    const avh = server.for(TESTPERSONER.meg.id)
    const tilstand = { sperre: null as Direktemeta['sperre'] }
    const medMeta = (side: Chatside): Chatside => ({
      ...side,
      kan_skrive: tilstand.sperre === null,
      kan_moderere: false,
      lesere: { medlemmer: 2, systemarkitekter: false },
      direkte: { motpart: { ...kari }, sperre: tilstand.sperre, dempet: false },
    })
    const lesninger = vi.fn()
    const k = lagChatkontroller(server.gruppe, {
      ...avh,
      lesGruppechat: async (...args) => {
        lesninger()
        return medMeta(await avh.lesGruppechat(...args))
      },
      hentChatendringer: async (g, etter) => ({
        ...(await avh.hentChatendringer(g, etter)),
        kan_skrive: tilstand.sperre === null,
        direkte: { motpart: { ...kari }, sperre: tilstand.sperre, dempet: false },
      }),
      sendGruppemelding: async (g, id, t) => {
        if (tilstand.sperre) throw new Sperret('Kan ikke motta nye direktemeldinger.')
        return avh.sendGruppemelding(g, id, t)
      },
    })
    aapen = k
    k.start()
    return { k, tilstand, lesninger }
  }

  it('henter sperren med en gang når en sending avvises, og lar meldingen stå med teksten', async () => {
    const { k, tilstand, lesninger } = aapneDirekte()
    await vent()
    expect(k.hent().kanSkrive).toBe(true)
    expect(lesninger).toHaveBeenCalledTimes(1)

    tilstand.sperre = 'mottaker'
    k.hent().send('Hei')
    await vent()
    expect(k.hent().ventende[0]).toMatchObject({ status: 'feilet', feil: 'Kan ikke motta nye direktemeldinger.' })
    expect(lesninger).toHaveBeenCalledTimes(2)
    expect(k.hent().kanSkrive).toBe(false)
    expect(k.hent().direkte?.sperre).toBe('mottaker')
  })

  it('får sperren med endringene, uten å lese samtalen på nytt', async () => {
    const { k, tilstand, lesninger } = aapneDirekte()
    await vent()
    tilstand.sperre = 'selv_blokkert'
    k.hent().oppfrisk()
    await vent()
    expect(k.hent().kanSkrive).toBe(false)
    expect(k.hent().direkte?.sperre).toBe('selv_blokkert')
    tilstand.sperre = null
    k.hent().oppfrisk()
    await vent()
    expect(k.hent().kanSkrive).toBe(true)
    expect(lesninger.mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})
