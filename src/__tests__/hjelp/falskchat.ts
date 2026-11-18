/**
 * En falsk chatserver og en falsk sanntidskanal for testene av
 * `useGruppechat` og kontrolleren (docs/gruppechat.md, «Sanntiden»). Serveren
 * oppfører seg som funksjonene i kontrakten: løpenummer, endringsteller,
 * samme `klient_id` gir samme melding, `klient_id` bare på egne meldinger, og
 * `IngenTilgang` for den som ikke er med. Hver skriving ringer på dørklokken
 * hos dem som er tilkoblet og har tilgang, slik radsikkerheten i Realtime gjør.
 *
 * Bare syntetiske personer og tekster.
 */
import { IngenTilgang } from '../../gruppechat/kall'
import type { Chatavhengigheter } from '../../gruppechat/kontroller'
import type { Chatendringer, Chatside, Gruppemelding } from '../../gruppechat/modell'
import { GRUPPECHAT_GRENSER } from '../../gruppechat/modell'
import type { Dorklokkevalg, Kanalstatus } from '../../gruppechat/dorklokke'
import { TESTPERSONER } from './testchat'

interface Rad {
  id: string
  nr: number
  endring: number
  forfatter: string
  klient_id: string
  tekst: string | null
  skrevet_kl: string
  redigert_kl: string | null
  slettet: null | { av: 'forfatter' | 'moderator'; kl: string }
}

export interface Falskkanal {
  bruker: string
  gruppe: string
  valg: Dorklokkevalg
  tilkoblet: boolean
  stoppet: boolean
  /** Setter statusen kanalen melder. */
  status: (s: Kanalstatus) => void
}

const PERSONER = Object.values(TESTPERSONER)

export class Falskchatserver {
  readonly gruppe = '30000000-0000-4000-8000-000000000001'
  rader: Rad[] = []
  sisteEndring = 0
  tilgang = new Set<string>()
  kanaler: Falskkanal[] = []
  lest = new Map<string, number>()
  /** Høyst så mange endringer per henting (kontrakten: 200). */
  endringerPerHenting = 200
  /** Neste sending lagres, men svaret går tapt på veien. */
  mistNesteSvar = false
  /** Antall kall per funksjon. */
  kall: Record<string, number> = {}
  private lopenr = 0

  constructor(medlemmer: string[] = PERSONER.map((p) => p.id)) {
    for (const m of medlemmer) this.tilgang.add(m)
  }

  private tell(navn: string) {
    this.kall[navn] = (this.kall[navn] ?? 0) + 1
  }

  private krevTilgang(bruker: string) {
    if (!this.tilgang.has(bruker)) throw new IngenTilgang('Du har ikke tilgang til denne gruppen.')
  }

  private ring() {
    for (const k of this.kanaler) {
      if (k.tilkoblet && !k.stoppet && this.tilgang.has(k.bruker)) k.valg.vedRinging(this.sisteEndring)
    }
  }

  private vis(rad: Rad, bruker: string): Gruppemelding {
    const egen = rad.forfatter === bruker
    return {
      id: rad.id,
      nr: rad.nr,
      endring: rad.endring,
      forfatter: PERSONER.find((p) => p.id === rad.forfatter) ?? null,
      klient_id: egen ? rad.klient_id : null,
      tekst: rad.slettet ? null : rad.tekst,
      skrevet_kl: rad.skrevet_kl,
      redigert_kl: rad.redigert_kl,
      slettet: rad.slettet,
      egen,
      kan_endre: egen && !rad.slettet,
      kan_slette: egen && !rad.slettet,
    }
  }

  /** En melding skrevet direkte på serveren, som av en annen nettleser. */
  skriv(bruker: string, tekst: string, klientId = `k-${++this.lopenr}`): Gruppemelding {
    const finnes = this.rader.find((r) => r.forfatter === bruker && r.klient_id === klientId)
    if (finnes) return this.vis(finnes, bruker)
    this.sisteEndring += 1
    const nr = (this.rader.at(-1)?.nr ?? 0) + 1
    const rad: Rad = {
      id: `40000000-0000-4000-8000-${String(nr).padStart(12, '0')}`,
      nr,
      endring: this.sisteEndring,
      forfatter: bruker,
      klient_id: klientId,
      tekst,
      skrevet_kl: new Date(Date.UTC(2026, 10, 17, 8, 0, nr)).toISOString(),
      redigert_kl: null,
      slettet: null,
    }
    this.rader.push(rad)
    this.ring()
    return this.vis(rad, bruker)
  }

  endre(id: string, tekst: string, bruker?: string): Gruppemelding {
    const rad = this.rader.find((r) => r.id === id)
    if (!rad) throw new Error('Meldingen finnes ikke.')
    this.sisteEndring += 1
    Object.assign(rad, { tekst, endring: this.sisteEndring, redigert_kl: new Date().toISOString() })
    this.ring()
    return this.vis(rad, bruker ?? rad.forfatter)
  }

  slett(id: string, av: 'forfatter' | 'moderator' = 'forfatter', bruker?: string): Gruppemelding {
    const rad = this.rader.find((r) => r.id === id)
    if (!rad) throw new Error('Meldingen finnes ikke.')
    if (!rad.slettet) {
      this.sisteEndring += 1
      Object.assign(rad, { tekst: null, endring: this.sisteEndring, slettet: { av, kl: new Date().toISOString() } })
      this.ring()
    }
    return this.vis(rad, bruker ?? rad.forfatter)
  }

  /** Det en bruker ville sett om hen hentet alt på nytt. */
  alt(bruker: string): Gruppemelding[] {
    return this.rader.map((r) => this.vis(r, bruker))
  }

  /** Kallene slik kontrolleren bruker dem, for brukeren. */
  for(bruker: string, ekstra: Partial<Chatavhengigheter> = {}): Chatavhengigheter {
    let id = 0
    return {
      lesGruppechat: async (_gruppe, forNr, antall): Promise<Chatside> => {
        this.tell('lesGruppechat')
        await Promise.resolve()
        this.krevTilgang(bruker)
        const for_ = this.rader.filter((r) => forNr === null || r.nr < forNr)
        const side = for_.slice(-antall)
        return {
          meldinger: side.map((r) => this.vis(r, bruker)),
          flere_eldre: for_.length > side.length,
          siste_endring: this.sisteEndring,
          lest_til_nr: this.lest.get(bruker) ?? 0,
          kan_skrive: true,
          kan_moderere: false,
          lesere: { medlemmer: this.tilgang.size, systemarkitekter: true },
          grenser: { ...GRUPPECHAT_GRENSER },
        }
      },
      hentChatendringer: async (_gruppe, etter): Promise<Chatendringer> => {
        this.tell('hentChatendringer')
        await Promise.resolve()
        this.krevTilgang(bruker)
        const alle = this.rader.filter((r) => r.endring > etter).sort((a, b) => a.endring - b.endring)
        const del = alle.slice(0, this.endringerPerHenting)
        const flere = alle.length > del.length
        return {
          meldinger: del.map((r) => this.vis(r, bruker)),
          siste_endring: flere ? del.at(-1)!.endring : Math.max(etter, this.sisteEndring),
          flere,
        }
      },
      sendGruppemelding: async (_gruppe, klientId, tekst) => {
        this.tell('sendGruppemelding')
        await Promise.resolve()
        this.krevTilgang(bruker)
        const melding = this.skriv(bruker, tekst, klientId)
        if (this.mistNesteSvar) {
          this.mistNesteSvar = false
          throw new Error('Kunne ikke nå serveren.')
        }
        return melding
      },
      endreGruppemelding: async (melding, tekst) => {
        this.tell('endreGruppemelding')
        await Promise.resolve()
        this.krevTilgang(bruker)
        return this.endre(melding, tekst, bruker)
      },
      slettGruppemelding: async (melding) => {
        this.tell('slettGruppemelding')
        await Promise.resolve()
        this.krevTilgang(bruker)
        return this.slett(melding, 'forfatter', bruker)
      },
      merkGruppechatLest: async (_gruppe, tilNr) => {
        this.tell('merkGruppechatLest')
        await Promise.resolve()
        this.krevTilgang(bruker)
        this.lest.set(bruker, Math.max(this.lest.get(bruker) ?? 0, tilNr))
      },
      abonner: (gruppe, valg) => {
        const kanal: Falskkanal = {
          bruker,
          gruppe: gruppe ?? 'alle',
          valg,
          tilkoblet: false,
          stoppet: false,
          status: (s) => {
            kanal.tilkoblet = s === 'tilkoblet'
            if (!kanal.stoppet) valg.vedStatus(s)
          },
        }
        this.kanaler.push(kanal)
        // Som Supabase: kanalen melder at den er tilkoblet litt etter at den er satt opp.
        queueMicrotask(() => {
          if (!kanal.stoppet) kanal.status('tilkoblet')
        })
        return () => {
          kanal.stoppet = true
          kanal.tilkoblet = false
        }
      },
      nyKlientId: () => `${bruker.slice(-4)}-klient-${++id}`,
      varslerEndret: () => this.tell('varslerEndret'),
      ...ekstra,
    }
  }

  /** Den siste kanalen brukeren har åpnet. */
  kanal(bruker: string): Falskkanal | undefined {
    return this.kanaler.filter((k) => k.bruker === bruker).at(-1)
  }
}

/** Lar alle ventende løfter og mikrooppgaver bli ferdige. */
export async function vent(ganger = 20): Promise<void> {
  for (let i = 0; i < ganger; i++) await Promise.resolve()
}
