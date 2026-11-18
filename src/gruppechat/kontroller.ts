/**
 * Én åpen chat: henting, dørklokken, gjenoppkobling, livstegn, sending og
 * lest-merking (docs/gruppechat.md, «Sanntiden»). Kontrolleren er uten React,
 * så den kan prøves med falske kall og en falsk kanal; `useGruppechat` er det
 * tynne laget visningen bruker.
 *
 * Reglene:
 * - Den første siden er de nyeste meldingene. Eldre hentes på forespørsel.
 * - Dørklokken, ny tilkobling, synlig fane, nettet tilbake og livstegnet hvert
 *   45. sekund fører alle til samme henting: endringene siden
 *   endringstelleren, én henting om gangen, og til det ikke er mer å hente.
 * - Svarer databasen at den innloggede ikke har tilgang (`IngenTilgang`), er
 *   chatten stengt: meldingene tømmes, og abonnementet og livstegnet stopper.
 * - Egne meldinger sendes én om gangen, i den rekkefølgen de ble skrevet,
 *   med en `klient_id` som gjør at et nytt forsøk aldri gir en melding til.
 *
 * Meldingsteksten skrives aldri i logger.
 */
import { IngenTilgang } from './kall'
import type { Chatendringer, Chatlesere, Chatside, Chatstatus, Gruppechat, Gruppemelding, Tilkobling, Ventende } from './modell'
import { GRUPPECHAT_GRENSER } from './modell'
import type { Abonner, Kanalstatus } from './dorklokke'
import { eldsteNr, medEldre, medEndringer, medForsteSide, medMelding, TOM_MELDINGSTILSTAND, type Meldingstilstand } from './tilstand'

/**
 * Hvor ofte chatten henter endringene uten hendelser, mens den står åpen og
 * synlig. Kontrakten krever at en åpen chat tømmes innen ett minutt etter at
 * tilgangen er tatt (docs/gruppechat.md); 45 s gir rom for et tregt svar også
 * når tilgangen tas rett etter et livstegn.
 */
export const LIVSTEGN_MS = 45_000
/** Meldinger per side. */
export const SIDESTORRELSE = 50

export interface Chatavhengigheter {
  lesGruppechat: (gruppe: string, forNr: number | null, antall: number) => Promise<Chatside>
  hentChatendringer: (gruppe: string, etter: number) => Promise<Chatendringer>
  sendGruppemelding: (gruppe: string, klientId: string, tekst: string) => Promise<Gruppemelding>
  endreGruppemelding: (melding: string, tekst: string) => Promise<Gruppemelding>
  slettGruppemelding: (melding: string) => Promise<Gruppemelding>
  merkGruppechatLest: (gruppe: string, tilNr: number) => Promise<void>
  abonner: Abonner
  nyKlientId: () => string
  /**
   * Tallet på uleste i gruppen kan ha endret seg (meldinger merket lest, eller
   * tilgangen er borte); samtalelista og gruppesiden henter det på nytt.
   */
  ulesteEndret: (gruppe: string) => void
}

export interface Chatkontroller {
  /** Det visningen ser nå. Samme objekt så lenge ingenting er endret. */
  hent: () => Gruppechat
  /** Kaller `lytter` ved hver endring; gir tilbake funksjonen som slutter å lytte. */
  lytt: (lytter: () => void) => () => void
  start: () => void
  stopp: () => void
}

interface Indre extends Meldingstilstand {
  status: Chatstatus
  feil: string | null
  kanal: Tilkobling
  /** Siste henting feilet; tilkoblingen vises som brutt til en henting lykkes. */
  nettfeil: boolean
  henterEldre: boolean
  lestTilNr: number
  kanSkrive: boolean
  kanModerere: boolean
  lesere: Chatlesere
  grenser: Gruppechat['grenser']
}

const STARTTILSTAND: Indre = {
  ...TOM_MELDINGSTILSTAND,
  status: 'laster',
  feil: null,
  kanal: 'kobler_til',
  nettfeil: false,
  henterEldre: false,
  lestTilNr: 0,
  kanSkrive: false,
  kanModerere: false,
  lesere: { medlemmer: 0, systemarkitekter: true },
  grenser: { ...GRUPPECHAT_GRENSER },
}

const feiltekst = (feil: unknown): string => (feil instanceof Error && feil.message ? feil.message : 'Noe gikk galt. Prøv igjen.')

const erSynlig = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
const erPaNett = () => typeof navigator === 'undefined' || navigator.onLine !== false

export function lagChatkontroller(gruppe: string, avh: Chatavhengigheter): Chatkontroller {
  let t: Indre = STARTTILSTAND
  let utsnitt: Gruppechat | null = null
  const lyttere = new Set<() => void>()

  /** Øker ved hver start og stopp; svar fra en tidligere runde overses. */
  let runde = 0
  let aktiv = false
  let rydd: (() => void)[] = []

  let synker = false
  let synkIgjen = false
  let sendekjede: Promise<void> = Promise.resolve()
  let lestSkrives = false
  let lestSkrevet = 0

  const sett = (endring: Partial<Indre>) => {
    t = { ...t, ...endring }
    utsnitt = null
    for (const lytter of [...lyttere]) lytter()
  }
  const settMeldinger = (ny: Meldingstilstand) => {
    if (ny.meldinger !== t.meldinger || ny.ventende !== t.ventende || ny.sisteEndring !== t.sisteEndring || ny.flereEldre !== t.flereEldre) sett(ny)
  }
  /** Gjør `f` bare om runden fortsatt er den samme. */
  const iRunden = <A extends unknown[]>(f: (...a: A) => void) => {
    const min = runde
    return (...a: A) => {
      if (aktiv && runde === min) f(...a)
    }
  }

  const stengUte = (feil: unknown) => {
    const forste = t.status !== 'ingen_tilgang'
    sett({ ...TOM_MELDINGSTILSTAND, status: 'ingen_tilgang', feil: feiltekst(feil), henterEldre: false, kanSkrive: false, kanModerere: false })
    frigjor()
    if (forste) avh.ulesteEndret(gruppe)
  }
  /** `true` når feilen stengte chatten. */
  const hvisUtestengt = (feil: unknown): boolean => {
    if (!(feil instanceof IngenTilgang)) return false
    stengUte(feil)
    return true
  }

  const brukMeta = (side: Chatside) =>
    sett({
      kanSkrive: side.kan_skrive,
      kanModerere: side.kan_moderere,
      lesere: side.lesere,
      grenser: side.grenser,
      lestTilNr: Math.max(t.lestTilNr, side.lest_til_nr),
    })

  const lastForste = async () => {
    const ok = iRunden((side: Chatside) => {
      settMeldinger(medForsteSide(t, side))
      brukMeta(side)
      sett({ status: 'klar', feil: null, nettfeil: false })
    })
    const min = runde
    try {
      ok(await avh.lesGruppechat(gruppe, null, SIDESTORRELSE))
    } catch (feil) {
      if (!aktiv || runde !== min || hvisUtestengt(feil)) return
      sett(t.status === 'klar' ? { nettfeil: true } : { status: 'feil', feil: feiltekst(feil), nettfeil: true })
      return
    }
    // Det som skjedde mens siden ble lest og abonnementet ble satt opp.
    if (t.kanal === 'tilkoblet') void synk()
  }

  /** Henter det som har skjedd siden endringstelleren, til det ikke er mer. */
  const synk = async (): Promise<void> => {
    if (!aktiv || t.status === 'ingen_tilgang') return
    if (t.status !== 'klar') {
      if (t.status === 'feil') return lastForste()
      return
    }
    if (synker) {
      synkIgjen = true
      return
    }
    synker = true
    const min = runde
    try {
      do {
        synkIgjen = false
        const fra = t.sisteEndring
        const e = await avh.hentChatendringer(gruppe, fra)
        if (!aktiv || runde !== min) return
        settMeldinger(medEndringer(t, e))
        if (t.nettfeil) sett({ nettfeil: false })
        // Mer å hente bare når telleren faktisk flyttet seg, så en feil i svaret ikke gir en evig løkke.
        if (e.flere && t.sisteEndring > fra) synkIgjen = true
      } while (synkIgjen)
    } catch (feil) {
      if (aktiv && runde === min && !hvisUtestengt(feil)) sett({ nettfeil: true })
    } finally {
      if (runde === min) synker = false
    }
  }

  /** Henter også rettighetene og leserne på nytt, etter et brudd. */
  const oppfriskMeta = async () => {
    if (!aktiv || t.status !== 'klar') return
    const min = runde
    try {
      const side = await avh.lesGruppechat(gruppe, null, 1)
      if (aktiv && runde === min) brukMeta(side)
    } catch (feil) {
      if (aktiv && runde === min) hvisUtestengt(feil)
    }
  }

  const vedKanal = (status: Kanalstatus) => {
    const varBrutt = t.kanal === 'frakoblet'
    sett({ kanal: status })
    if (status !== 'tilkoblet') return
    void synk()
    if (varBrutt) void oppfriskMeta()
  }

  const vedRinging = (sisteEndring: number | null) => {
    if (sisteEndring !== null && sisteEndring <= t.sisteEndring) return
    void synk()
  }

  const frigjor = () => {
    aktiv = false
    runde += 1
    for (const f of rydd) f()
    rydd = []
    synker = false
    synkIgjen = false
    lestSkrives = false
  }

  /* --- Sending -------------------------------------------------------------- */

  const oppdaterVentende = (klientId: string, endring: Partial<Ventende> | null) => {
    const ventende = endring
      ? t.ventende.map((v) => (v.klient_id === klientId ? { ...v, ...endring } : v))
      : t.ventende.filter((v) => v.klient_id !== klientId)
    sett({ ventende })
  }

  const sendNa = async (klientId: string) => {
    const v = t.ventende.find((x) => x.klient_id === klientId)
    if (!aktiv || !v || t.status === 'ingen_tilgang') return
    const min = runde
    try {
      const melding = await avh.sendGruppemelding(gruppe, klientId, v.tekst)
      if (!aktiv || runde !== min) return
      settMeldinger(medMelding(t, melding))
      oppdaterVentende(klientId, null)
    } catch (feil) {
      if (!aktiv || runde !== min || hvisUtestengt(feil)) return
      // Kan den alt ha kommet med endringene, er den ikke lenger ventende.
      if (t.ventende.some((x) => x.klient_id === klientId)) oppdaterVentende(klientId, { status: 'feilet', feil: feiltekst(feil) })
    }
  }

  const iKo = (klientId: string) => {
    sendekjede = sendekjede.then(() => sendNa(klientId))
  }

  const send = (tekst: string) => {
    if (!aktiv || t.status !== 'klar' || tekst.trim() === '') return
    const klient_id = avh.nyKlientId()
    sett({ ventende: [...t.ventende, { klient_id, tekst, sendt_kl: new Date().toISOString(), status: 'sender', feil: null }] })
    iKo(klient_id)
  }

  const provIgjen = (klientId: string) => {
    const v = t.ventende.find((x) => x.klient_id === klientId)
    if (!aktiv || !v || v.status !== 'feilet') return
    oppdaterVentende(klientId, { status: 'sender', feil: null })
    iKo(klientId)
  }

  const forkast = (klientId: string) => {
    if (t.ventende.some((x) => x.klient_id === klientId && x.status === 'feilet')) oppdaterVentende(klientId, null)
  }

  /** Endrer eller sletter; kaster med feilen på norsk når det ikke går. */
  const endreMed = async (kall: () => Promise<Gruppemelding>) => {
    if (!aktiv || t.status !== 'klar') throw new Error('Chatten er ikke klar.')
    const min = runde
    try {
      const melding = await kall()
      if (aktiv && runde === min) settMeldinger(medMelding(t, melding))
    } catch (feil) {
      if (aktiv && runde === min) hvisUtestengt(feil)
      throw feil instanceof Error ? feil : new Error(feiltekst(feil))
    }
  }

  /* --- Lest ----------------------------------------------------------------- */

  const skrivLest = async () => {
    if (lestSkrives || !aktiv) return
    lestSkrives = true
    const min = runde
    try {
      while (aktiv && runde === min && t.lestTilNr > lestSkrevet) {
        const til = t.lestTilNr
        await avh.merkGruppechatLest(gruppe, til)
        lestSkrevet = Math.max(lestSkrevet, til)
        avh.ulesteEndret(gruppe)
      }
    } catch (feil) {
      // Neste merking prøver igjen; tallet her står.
      if (aktiv && runde === min) hvisUtestengt(feil)
    } finally {
      if (runde === min) lestSkrives = false
    }
  }

  const merkLest = (nr: number) => {
    if (!aktiv || t.status !== 'klar' || !(nr > t.lestTilNr)) return
    sett({ lestTilNr: nr })
    void skrivLest()
  }

  /* --- Eldre ---------------------------------------------------------------- */

  const hentEldre = async () => {
    const for_ = eldsteNr(t)
    if (!aktiv || t.status !== 'klar' || !t.flereEldre || t.henterEldre || for_ === null) return
    sett({ henterEldre: true })
    const min = runde
    try {
      const side = await avh.lesGruppechat(gruppe, for_, SIDESTORRELSE)
      if (!aktiv || runde !== min) return
      settMeldinger(medEldre(t, side))
      sett({ henterEldre: false })
    } catch (feil) {
      if (!aktiv || runde !== min || hvisUtestengt(feil)) return
      sett({ henterEldre: false, nettfeil: true })
    }
  }

  /* --- Utsnittet -------------------------------------------------------------- */

  const handlinger = {
    hentEldre,
    send,
    provIgjen,
    forkast,
    endre: (melding: string, tekst: string) => endreMed(() => avh.endreGruppemelding(melding, tekst)),
    slett: (melding: string) => endreMed(() => avh.slettGruppemelding(melding)),
    merkLest,
  }

  const tilkobling = (): Tilkobling => {
    if (t.status === 'ingen_tilgang') return 'frakoblet'
    if (t.nettfeil || !erPaNett()) return 'frakoblet'
    return t.kanal
  }

  const hent = (): Gruppechat => {
    utsnitt ??= {
      status: t.status,
      feil: t.feil,
      tilkobling: tilkobling(),
      meldinger: t.meldinger,
      ventende: t.ventende,
      flereEldre: t.flereEldre,
      henterEldre: t.henterEldre,
      lestTilNr: t.lestTilNr,
      kanSkrive: t.kanSkrive,
      kanModerere: t.kanModerere,
      lesere: t.lesere,
      grenser: t.grenser,
      ...handlinger,
    }
    return utsnitt
  }

  const start = () => {
    if (aktiv) return
    aktiv = true
    runde += 1
    t = STARTTILSTAND
    utsnitt = null
    lestSkrevet = 0
    sendekjede = Promise.resolve()

    rydd.push(avh.abonner(gruppe, { vedRinging: iRunden(vedRinging), vedStatus: iRunden(vedKanal) }))

    const naarSynlig = iRunden(() => {
      if (erSynlig()) void synk()
    })
    const paNett = iRunden(() => {
      sett({})
      void synk()
      void oppfriskMeta()
    })
    const avNett = iRunden(() => sett({}))
    const livstegn = setInterval(naarSynlig, LIVSTEGN_MS)
    // Uten nettleser (kontrollene i det lokale testmiljøet) er det bare livstegnet og dørklokken.
    const dok = typeof document === 'undefined' ? null : document
    const vindu = typeof window === 'undefined' ? null : window
    dok?.addEventListener('visibilitychange', naarSynlig)
    vindu?.addEventListener('online', paNett)
    vindu?.addEventListener('offline', avNett)
    rydd.push(() => {
      clearInterval(livstegn)
      dok?.removeEventListener('visibilitychange', naarSynlig)
      vindu?.removeEventListener('online', paNett)
      vindu?.removeEventListener('offline', avNett)
    })

    sett({})
    void lastForste()
  }

  const stopp = () => {
    if (aktiv) frigjor()
  }

  return {
    hent,
    lytt: (lytter) => {
      lyttere.add(lytter)
      return () => lyttere.delete(lytter)
    },
    start,
    stopp,
  }
}
