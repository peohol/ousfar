/**
 * En gruppechat i minnet, med syntetiske personer og meldinger, for
 * komponenttestene til chatvisningen (docs/gruppechat.md, «Brukerflaten»).
 * Den har samme form som `useGruppechat` (`Gruppechat` i
 * `src/gruppechat/modell.ts`), så visningen kan bygges og prøves uten
 * databasen og sanntiden.
 *
 * `useTestchat` oppfører seg som en ekte chat: det som sendes, endres og
 * slettes, står i lista. `lagTestchat` gir et fast øyeblikksbilde. Med
 * `utenfra` kan en test la «noen andre» skrive, som når en melding kommer i
 * sanntid.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import type { Profilkort } from '@delt/profil'
import { lignerPersonnummer, PASIENTREGEL } from '@delt/pasientopplysninger'
import { GRUPPECHAT_GRENSER, type Gruppechat, type Gruppemelding, type Ventende } from '../../gruppechat/modell'

const person = (id: string, username: string, first_name: string, last_name: string): Profilkort => ({
  id,
  username,
  first_name,
  last_name,
  avatar_path: null,
  updated_at: '2026-01-01T00:00:00Z',
})

/** De syntetiske personene i testchatten. `meg` er den innloggede. */
export const TESTPERSONER = {
  meg: person('00000000-0000-4000-8000-000000000001', 'test.meg', 'Test', 'Meg'),
  kari: person('00000000-0000-4000-8000-000000000002', 'test.kari', 'Kari', 'Testesen'),
  ola: person('00000000-0000-4000-8000-000000000003', 'test.ola', 'Ola', 'Prøvesen'),
} as const

const START = Date.parse('2026-11-16T08:00:00Z')

/** Syntetiske meldinger 1…`antall`, fra `kari`, `ola` og `meg` om hverandre, ti minutter fra hverandre. */
export function syntetiskeMeldinger(antall: number, fraNr = 1): Gruppemelding[] {
  const avsendere = [TESTPERSONER.kari, TESTPERSONER.ola, TESTPERSONER.meg]
  return Array.from({ length: antall }, (_, i) => {
    const nr = fraNr + i
    const forfatter = avsendere[nr % avsendere.length]!
    const egen = forfatter.id === TESTPERSONER.meg.id
    return {
      id: `10000000-0000-4000-8000-${String(nr).padStart(12, '0')}`,
      nr,
      endring: nr,
      forfatter,
      tekst: `Syntetisk melding ${nr}`,
      skrevet_kl: new Date(START + (nr - 1) * 600_000).toISOString(),
      redigert_kl: null,
      slettet: null,
      egen,
      klient_id: egen ? `30000000-0000-4000-8000-${String(nr).padStart(12, '0')}` : null,
      kan_endre: egen,
      kan_slette: egen,
    }
  })
}

/** Et fast øyeblikksbilde av en chat; funksjonene gjør ingenting. */
export function lagTestchat(overstyr: Partial<Gruppechat> = {}): Gruppechat {
  const meldinger = overstyr.meldinger ?? syntetiskeMeldinger(5)
  return {
    status: 'klar',
    feil: null,
    tilkobling: 'tilkoblet',
    meldinger,
    ventende: [],
    flereEldre: false,
    henterEldre: false,
    hentEldre: async () => undefined,
    send: () => undefined,
    provIgjen: () => undefined,
    forkast: () => undefined,
    endre: async () => undefined,
    slett: async () => undefined,
    merkLest: () => undefined,
    oppfrisk: () => undefined,
    lestTilNr: meldinger.at(-1)?.nr ?? 0,
    kanSkrive: true,
    kanModerere: false,
    lesere: { medlemmer: 3, systemarkitekter: true },
    grenser: { ...GRUPPECHAT_GRENSER },
    direkte: null,
    ...overstyr,
  }
}

export interface Testchatvalg {
  /** Alle meldingene i chatten; de eldste står bak «Vis eldre». */
  meldinger?: Gruppemelding[]
  /** Hvor mange av de nyeste som vises først. */
  side?: number
  kanModerere?: boolean
  kanSkrive?: boolean
  /** Sendingen feiler med denne teksten, til den settes til `null`. */
  sendefeil?: string | null
}

export interface Testchatstyring {
  /** En annen skriver en melding, som om den kom i sanntid. */
  utenfra: (tekst: string, fra?: Profilkort) => void
  /** Hvilke meldinger som er merket lest, sist først. */
  lest: number[]
}

/** En chat i minnet som oppfører seg som den ekte: sendt, endret og slettet står i lista. */
export function useTestchat(valg: Testchatvalg = {}): Gruppechat & Testchatstyring {
  const alle = useRef(valg.meldinger ?? syntetiskeMeldinger(5))
  const side = valg.side ?? alle.current.length
  const [synligeFra, setSynligeFra] = useState(Math.max(0, alle.current.length - side))
  const [meldinger, setMeldinger] = useState<Gruppemelding[]>(alle.current)
  const [ventende, setVentende] = useState<Ventende[]>([])
  const [lestTilNr, setLestTilNr] = useState(alle.current.at(-1)?.nr ?? 0)
  const lest = useRef<number[]>([])
  const teller = useRef(alle.current.reduce((m, x) => Math.max(m, x.endring), 0))

  const neste = (fra: Profilkort, tekst: string, liste: Gruppemelding[]): Gruppemelding => {
    teller.current += 1
    const egen = fra.id === TESTPERSONER.meg.id
    return {
      id: `20000000-0000-4000-8000-${String(teller.current).padStart(12, '0')}`,
      nr: (liste.at(-1)?.nr ?? 0) + 1,
      endring: teller.current,
      forfatter: fra,
      tekst,
      skrevet_kl: new Date().toISOString(),
      redigert_kl: null,
      slettet: null,
      egen,
      klient_id: egen ? crypto.randomUUID() : null,
      kan_endre: egen,
      kan_slette: egen || valg.kanModerere === true,
    }
  }

  const send = useCallback(
    (tekst: string) => {
      const klient_id = crypto.randomUUID()
      const feil = lignerPersonnummer(tekst) ? PASIENTREGEL.avvist : (valg.sendefeil ?? null)
      if (feil) {
        setVentende((v) => [...v, { klient_id, tekst, sendt_kl: new Date().toISOString(), status: 'feilet', feil }])
        return
      }
      setMeldinger((liste) => [...liste, neste(TESTPERSONER.meg, tekst, liste)])
    },
    [valg.sendefeil],
  )

  const endreMelding = (id: string, endring: (m: Gruppemelding) => Gruppemelding) =>
    setMeldinger((liste) =>
      liste.map((m) => {
        if (m.id !== id) return m
        teller.current += 1
        return { ...endring(m), endring: teller.current }
      }),
    )

  const synlige = useMemo(() => meldinger.slice(synligeFra), [meldinger, synligeFra])

  return {
    ...lagTestchat({ kanModerere: valg.kanModerere ?? false, kanSkrive: valg.kanSkrive ?? true }),
    meldinger: synlige,
    ventende,
    flereEldre: synligeFra > 0,
    hentEldre: async () => setSynligeFra((fra) => Math.max(0, fra - (valg.side ?? 50))),
    send,
    provIgjen: (klientId) => {
      const v = ventende.find((x) => x.klient_id === klientId)
      if (!v) return
      setVentende((liste) => liste.filter((x) => x.klient_id !== klientId))
      send(v.tekst)
    },
    forkast: (klientId) => setVentende((liste) => liste.filter((x) => x.klient_id !== klientId)),
    endre: async (id, tekst) => {
      if (lignerPersonnummer(tekst)) throw new Error(PASIENTREGEL.avvist)
      endreMelding(id, (m) => ({ ...m, tekst, redigert_kl: new Date().toISOString() }))
    },
    slett: async (id) =>
      endreMelding(id, (m) => ({
        ...m,
        tekst: null,
        slettet: { av: m.egen ? 'forfatter' : 'moderator', kl: new Date().toISOString() },
        kan_endre: false,
        kan_slette: false,
      })),
    merkLest: (nr) => {
      lest.current.unshift(nr)
      setLestTilNr((n) => Math.max(n, nr))
    },
    lestTilNr,
    oppfrisk: () => undefined,
    utenfra: (tekst, fra = TESTPERSONER.kari) => setMeldinger((liste) => [...liste, neste(fra, tekst, liste)]),
    lest: lest.current,
  }
}
