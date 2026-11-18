// @vitest-environment jsdom
/**
 * Sanntiden i gruppechatten i klienten (`src/gruppechat/kontroller.ts`,
 * docs/gruppechat.md, «Sanntiden»), mot en falsk server og en falsk kanal:
 * dørklokken, gjenoppkobling med riktig historikk (kriterium 7), samtidige
 * meldinger uten tap eller duplikater (kriterium 8), tap av tilgang mens
 * chatten er åpen (kriterium 4 i klienten), dobbel sending, livstegnet og
 * oppryddingen. Tilgangen selv prøves mot databasen (tråd A).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'
import { lagChatkontroller, LIVSTEGN_MS, SIDESTORRELSE, type Chatkontroller } from '../gruppechat/kontroller'
import { Falskchatserver, vent } from './hjelp/falskchat'
import { TESTPERSONER } from './hjelp/testchat'

const MEG = TESTPERSONER.meg.id
const KARI = TESTPERSONER.kari.id
const OLA = TESTPERSONER.ola.id

let aapne: Chatkontroller[] = []

function aapne_(server: Falskchatserver, bruker = MEG, ekstra = {}) {
  const k = lagChatkontroller(server.gruppe, server.for(bruker, ekstra))
  aapne.push(k)
  k.start()
  return k
}

const nr = (k: Chatkontroller) => k.hent().meldinger.map((m) => m.nr)
const tekster = (k: Chatkontroller) => k.hent().meldinger.map((m) => m.tekst)

function settSynlighet(synlig: boolean) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (synlig ? 'visible' : 'hidden') })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
  settSynlighet(true)
})

afterEach(() => {
  for (const k of aapne) k.stopp()
  aapne = []
  vi.useRealTimers()
})

describe('første henting og dørklokken', () => {
  it('henter de nyeste meldingene og blir klar og tilkoblet', async () => {
    const server = new Falskchatserver()
    for (let i = 1; i <= 3; i++) server.skriv(KARI, `Syntetisk ${i}`)
    const k = aapne_(server)
    expect(k.hent().status).toBe('laster')
    await vent()
    expect(k.hent().status).toBe('klar')
    expect(k.hent().tilkobling).toBe('tilkoblet')
    expect(nr(k)).toEqual([1, 2, 3])
    expect(k.hent().kanSkrive).toBe(true)
  })

  it('en melding fra en annen kommer uten at noe lastes på nytt (kriterium 1 i klienten)', async () => {
    const server = new Falskchatserver()
    const k = aapne_(server)
    await vent()
    server.skriv(KARI, 'Hei fra Kari')
    await vent()
    expect(tekster(k)).toEqual(['Hei fra Kari'])
    expect(server.kall.lesGruppechat).toBe(1)
  })

  it('mange ringinger mens en henting pågår, gir høyst én henting til', async () => {
    const server = new Falskchatserver()
    const k = aapne_(server)
    await vent()
    const for_ = server.kall.hentChatendringer ?? 0
    for (let i = 0; i < 10; i++) server.skriv(KARI, `Rask ${i}`)
    await vent(60)
    expect(nr(k)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect((server.kall.hentChatendringer ?? 0) - for_).toBeLessThanOrEqual(2)
  })

  it('henter ikke når ringingen ikke er nyere enn det som er sett', async () => {
    const server = new Falskchatserver()
    aapne_(server)
    await vent()
    const for_ = server.kall.hentChatendringer ?? 0
    server.kanal(MEG)!.valg.vedRinging(0)
    await vent()
    expect(server.kall.hentChatendringer ?? 0).toBe(for_)
  })

  it('henter det som skjedde mellom den første siden og abonnementet', async () => {
    const server = new Falskchatserver()
    server.skriv(KARI, 'Før')
    const avh = server.for(MEG)
    const k = aapne_(server, MEG, {
      // En melding kommer etter at siden er lest, men før den er vist.
      lesGruppechat: async (g: string, forNr: number | null, antall: number) => {
        const side = await avh.lesGruppechat(g, forNr, antall)
        server.skriv(OLA, 'Imellom')
        return side
      },
    })
    await vent()
    expect(tekster(k)).toEqual(['Før', 'Imellom'])
  })
})

describe('frakobling og gjenoppkobling (kriterium 7)', () => {
  it('gir riktig historikk etter et brudd, også med endringer og slettinger', async () => {
    const server = new Falskchatserver()
    for (let i = 1; i <= 3; i++) server.skriv(KARI, `Før ${i}`)
    const k = aapne_(server)
    await vent()
    server.kanal(MEG)!.status('frakoblet')
    expect(k.hent().tilkobling).toBe('frakoblet')

    // Mens kanalen er nede, går ringingene tapt.
    const ny = server.skriv(OLA, 'Under bruddet')
    server.endre(server.rader[0]!.id, 'Før 1, redigert')
    server.slett(server.rader[1]!.id, 'moderator')
    await vent()
    expect(tekster(k)).toEqual(['Før 1', 'Før 2', 'Før 3'])

    server.kanal(MEG)!.status('tilkoblet')
    await vent()
    expect(k.hent().tilkobling).toBe('tilkoblet')
    expect(k.hent().meldinger).toEqual(server.alt(MEG))
    expect(k.hent().meldinger.find((m) => m.id === ny.id)?.tekst).toBe('Under bruddet')
    expect(k.hent().meldinger[1]!.slettet?.av).toBe('moderator')
  })

  it('henter til det ikke er mer når det har skjedd mye', async () => {
    const server = new Falskchatserver()
    server.endringerPerHenting = 7
    const k = aapne_(server)
    await vent()
    server.kanal(MEG)!.status('frakoblet')
    for (let i = 1; i <= 30; i++) server.skriv(i % 2 ? KARI : OLA, `Melding ${i}`)
    server.kanal(MEG)!.status('tilkoblet')
    await vent(200)
    expect(nr(k)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
  })

  it('henter når fanen blir synlig igjen og når nettet er tilbake', async () => {
    const server = new Falskchatserver()
    const k = aapne_(server)
    await vent()
    server.kanal(MEG)!.tilkoblet = false // ringingene når ikke fram
    server.skriv(KARI, 'Mens fanen var skjult')
    settSynlighet(false)
    settSynlighet(true)
    await vent()
    expect(tekster(k)).toEqual(['Mens fanen var skjult'])

    server.skriv(KARI, 'Mens nettet var borte')
    window.dispatchEvent(new Event('online'))
    await vent()
    expect(tekster(k)).toEqual(['Mens fanen var skjult', 'Mens nettet var borte'])
  })

  it('livstegnet henter endringene hvert 45. sekund uten hendelser, men ikke når fanen er skjult', async () => {
    const server = new Falskchatserver()
    const k = aapne_(server)
    await vent()
    server.kanal(MEG)!.tilkoblet = false
    server.skriv(KARI, 'Uten ringing')
    await vent()
    expect(tekster(k)).toEqual([])
    vi.advanceTimersByTime(LIVSTEGN_MS)
    await vent()
    expect(tekster(k)).toEqual(['Uten ringing'])

    settSynlighet(false)
    await vent()
    const for_ = server.kall.hentChatendringer ?? 0
    vi.advanceTimersByTime(LIVSTEGN_MS * 3)
    await vent()
    expect(server.kall.hentChatendringer ?? 0).toBe(for_)
  })

  it('viser tilkoblingen som brutt når en henting feiler, til neste lykkes', async () => {
    const server = new Falskchatserver()
    let feil = false
    const avh = server.for(MEG)
    const k = aapne_(server, MEG, {
      hentChatendringer: async (g: string, e: number) => {
        if (feil) throw new Error('Kunne ikke nå serveren.')
        return avh.hentChatendringer(g, e)
      },
    })
    await vent()
    feil = true
    server.skriv(KARI, 'Kommer senere')
    await vent()
    expect(k.hent().tilkobling).toBe('frakoblet')
    expect(k.hent().status).toBe('klar')
    feil = false
    vi.advanceTimersByTime(LIVSTEGN_MS)
    await vent()
    expect(k.hent().tilkobling).toBe('tilkoblet')
    expect(tekster(k)).toEqual(['Kommer senere'])
  })
})

describe('samtidige meldinger (kriterium 8 i klienten)', () => {
  it('tre som skriver om hverandre, ser de samme meldingene i samme rekkefølge, uten tap eller duplikater', async () => {
    const server = new Falskchatserver()
    const kontrollere = [MEG, KARI, OLA].map((b) => aapne_(server, b))
    await vent()
    for (let runde = 0; runde < 5; runde++) {
      kontrollere.forEach((k, i) => k.hent().send(`Runde ${runde} fra ${i}`))
    }
    await vent(400)
    const fasit = server.rader.map((r) => r.id)
    expect(fasit).toHaveLength(15)
    for (const k of kontrollere) {
      expect(k.hent().meldinger.map((m) => m.id)).toEqual(fasit)
      expect(k.hent().ventende).toEqual([])
    }
  })

  it('egne meldinger sendes én om gangen, i den rekkefølgen de ble skrevet', async () => {
    const server = new Falskchatserver()
    const k = aapne_(server)
    await vent()
    for (const t of ['En', 'To', 'Tre']) k.hent().send(t)
    expect(k.hent().ventende.map((v) => v.tekst)).toEqual(['En', 'To', 'Tre'])
    await vent(100)
    expect(tekster(k)).toEqual(['En', 'To', 'Tre'])
    expect(k.hent().ventende).toEqual([])
  })
})

describe('sending', () => {
  it('sender ikke tom tekst', async () => {
    const server = new Falskchatserver()
    const k = aapne_(server)
    await vent()
    k.hent().send('   \n ')
    await vent()
    expect(k.hent().ventende).toEqual([])
    expect(server.kall.sendGruppemelding).toBeUndefined()
  })

  it('svaret som går tapt, gir ingen dobbel melding: endringene bekrefter den ventende', async () => {
    const server = new Falskchatserver()
    const k = aapne_(server)
    await vent()
    server.mistNesteSvar = true
    k.hent().send('Kommer fram likevel')
    await vent(60)
    expect(tekster(k)).toEqual(['Kommer fram likevel'])
    expect(k.hent().ventende).toEqual([])
  })

  it('«Prøv igjen» bruker samme klient_id og gir den samme meldingen', async () => {
    const server = new Falskchatserver()
    const avh = server.for(MEG)
    let gaarIkke = true
    const k = aapne_(server, MEG, {
      sendGruppemelding: async (g: string, id: string, t: string) => {
        const svar = await avh.sendGruppemelding(g, id, t)
        if (gaarIkke) {
          gaarIkke = false
          throw new Error('Kunne ikke nå serveren.')
        }
        return svar
      },
      // Ingen ringing: bare svaret kan bekrefte meldingen.
      abonner: () => () => undefined,
    })
    await vent()
    k.hent().send('To ganger?')
    await vent()
    const [v] = k.hent().ventende
    expect(v).toMatchObject({ status: 'feilet', feil: 'Kunne ikke nå serveren.' })
    k.hent().provIgjen(v!.klient_id)
    expect(k.hent().ventende[0]!.status).toBe('sender')
    await vent()
    expect(tekster(k)).toEqual(['To ganger?'])
    expect(server.rader).toHaveLength(1)
    expect(k.hent().ventende).toEqual([])
  })

  it('en melding databasen avviser, står med feilen og kan forkastes', async () => {
    const server = new Falskchatserver()
    const k = aapne_(server, MEG, {
      sendGruppemelding: async () => {
        throw new Error('Du sender meldinger for fort. Vent litt og prøv igjen.')
      },
    })
    await vent()
    k.hent().send('For fort')
    await vent()
    expect(k.hent().ventende[0]).toMatchObject({ status: 'feilet', feil: 'Du sender meldinger for fort. Vent litt og prøv igjen.' })
    k.hent().forkast(k.hent().ventende[0]!.klient_id)
    expect(k.hent().ventende).toEqual([])
  })

  it('endre og slette oppdaterer meldingen, og kaster feilen videre', async () => {
    const server = new Falskchatserver()
    const egen = server.skriv(MEG, 'Opprinnelig')
    const k = aapne_(server)
    await vent()
    await k.hent().endre(egen.id, 'Endret')
    expect(tekster(k)).toEqual(['Endret'])
    await k.hent().slett(egen.id)
    expect(k.hent().meldinger[0]!.slettet?.av).toBe('forfatter')
    await expect(k.hent().endre('finnes-ikke', 'x')).rejects.toThrow('Meldingen finnes ikke.')
  })
})

describe('tap av tilgang mens chatten er åpen (kriterium 4 i klienten)', () => {
  it('i verste fall, når tilgangen tas rett etter et livstegn, er chatten tømt før det har gått ett minutt', async () => {
    // Kontrakten: innen ett minutt. Livstegnet må la det være tid igjen til et tregt svar.
    expect(LIVSTEGN_MS).toBeLessThanOrEqual(45_000)
    const server = new Falskchatserver()
    server.skriv(KARI, 'Hemmelig for de fjernede')
    const k = aapne_(server)
    await vent()
    server.kanal(MEG)!.tilkoblet = false
    vi.advanceTimersByTime(LIVSTEGN_MS)
    await vent()
    expect(k.hent().status).toBe('klar')

    server.tilgang.delete(MEG)
    vi.advanceTimersByTime(LIVSTEGN_MS - 1)
    await vent()
    expect(k.hent().meldinger).toHaveLength(1)
    vi.advanceTimersByTime(1)
    await vent()
    expect(k.hent().status).toBe('ingen_tilgang')
    expect(k.hent().meldinger).toEqual([])
    // Bjella og samtalelista i chatmenyen henter på nytt, én gang.
    expect(server.kall.varslerEndret).toBe(1)
    vi.advanceTimersByTime(LIVSTEGN_MS * 3)
    await vent()
    expect(server.kall.varslerEndret).toBe(1)
  })

  it('livstegnet oppdager det: meldingene tømmes og abonnementet stopper', async () => {
    const server = new Falskchatserver()
    server.skriv(KARI, 'Hemmelig for de fjernede')
    const k = aapne_(server)
    await vent()
    expect(nr(k)).toEqual([1])

    server.tilgang.delete(MEG)
    // Radsikkerheten gir ingen ringing; det er livstegnet som oppdager det.
    server.skriv(KARI, 'Etter fjerningen')
    await vent()
    expect(tekster(k)).toEqual(['Hemmelig for de fjernede'])
    vi.advanceTimersByTime(LIVSTEGN_MS)
    await vent()

    const chat = k.hent()
    expect(chat.status).toBe('ingen_tilgang')
    expect(chat.feil).toBe('Du har ikke tilgang til denne gruppen.')
    expect(chat.meldinger).toEqual([])
    expect(chat.ventende).toEqual([])
    expect(chat.kanSkrive).toBe(false)
    expect(server.kanal(MEG)!.stoppet).toBe(true)

    const kall = { ...server.kall }
    vi.advanceTimersByTime(LIVSTEGN_MS * 5)
    settSynlighet(true)
    window.dispatchEvent(new Event('online'))
    chat.send('Prøver likevel')
    await chat.hentEldre()
    await vent()
    expect(server.kall).toEqual(kall)
  })

  it('en sending som avvises med IngenTilgang, stenger chatten', async () => {
    const server = new Falskchatserver()
    const k = aapne_(server)
    await vent()
    server.tilgang.delete(MEG)
    k.hent().send('For sent')
    await vent()
    expect(k.hent().status).toBe('ingen_tilgang')
    expect(k.hent().ventende).toEqual([])
  })

  it('uten tilgang fra start er status ingen_tilgang', async () => {
    const server = new Falskchatserver([KARI])
    const k = aapne_(server)
    await vent()
    expect(k.hent().status).toBe('ingen_tilgang')
    expect(server.kanal(MEG)!.stoppet).toBe(true)
  })
})

describe('eldre meldinger og lest', () => {
  it('henter eldre sider foran, uten duplikater, til det ikke er flere', async () => {
    const server = new Falskchatserver()
    const antall = SIDESTORRELSE * 2 + 10
    for (let i = 1; i <= antall; i++) server.skriv(KARI, `M${i}`)
    const k = aapne_(server)
    await vent()
    expect(nr(k)[0]).toBe(antall - SIDESTORRELSE + 1)
    expect(k.hent().flereEldre).toBe(true)
    const p = k.hent().hentEldre()
    expect(k.hent().henterEldre).toBe(true)
    await p
    await k.hent().hentEldre()
    expect(nr(k)).toEqual(Array.from({ length: antall }, (_, i) => i + 1))
    expect(k.hent().flereEldre).toBe(false)
    expect(k.hent().henterEldre).toBe(false)
  })

  it('merker lest bare framover, ett kall om gangen, og ber bjella hente på nytt', async () => {
    const server = new Falskchatserver()
    for (let i = 1; i <= 5; i++) server.skriv(KARI, `M${i}`)
    const k = aapne_(server)
    await vent()
    k.hent().merkLest(2)
    k.hent().merkLest(4)
    k.hent().merkLest(3)
    expect(k.hent().lestTilNr).toBe(4)
    await vent()
    expect(server.lest.get(MEG)).toBe(4)
    expect(server.kall.merkGruppechatLest).toBe(2)
    expect(server.kall.varslerEndret).toBe(2)
  })
})

describe('oppryddingen', () => {
  it('stopp fjerner abonnementet, livstegnet og lytterne, og svar som kommer etterpå overses', async () => {
    const server = new Falskchatserver()
    const k = aapne_(server)
    const lytter = vi.fn()
    k.lytt(lytter)
    k.stopp()
    await vent()
    expect(server.kanal(MEG)!.stoppet).toBe(true)
    lytter.mockClear()
    vi.advanceTimersByTime(LIVSTEGN_MS * 2)
    window.dispatchEvent(new Event('online'))
    settSynlighet(true)
    await vent()
    expect(lytter).not.toHaveBeenCalled()
    expect(server.kall.hentChatendringer).toBeUndefined()
  })

  it('kan startes på nytt etter stopp, som Reacts strenge modus gjør', async () => {
    const server = new Falskchatserver()
    server.skriv(KARI, 'Står')
    const k = aapne_(server)
    k.stopp()
    k.start()
    await vent()
    expect(k.hent().status).toBe('klar')
    expect(tekster(k)).toEqual(['Står'])
    expect(server.kanaler.filter((x) => !x.stoppet)).toHaveLength(1)
  })
})
