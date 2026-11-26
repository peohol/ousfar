import { useEffect, useMemo, useState } from 'react'
import { useRettigheter } from '../auth/rettigheter'
import { useSystemarkitekt } from '../auth/systemrolle'
import { FORSIDEADRESSE, FORTOLKNINGSADRESSE, forslagsadresse, gruppeadresse, type Rute } from '../domain/rute'
import type { Stoffregister } from '../domain/stoffregister'
import { useFavoritter } from '../favoritter/Favorittkilde'
import { hentForslagTilMeg } from '../forslag/behandling'
import { useGrupper } from '../grupper/kilde'
import { useBevart } from '../oppdatering/Bevaring'
import { VERKTOY } from '../verktoy/register'
import { useVerktoyeneVises } from '../verktoy/synlighet'
import { CHATIKON } from './chat/chatvisning'
import { useChatstatus, visGruppesamtale } from './chat/chatstyring'
import { nyeIdekommentarer } from './ideer/Idelag'
import { apneIdelag, idestatus } from './ideer/idevisning'
import { adminstatus, adminvalg, apneAdminpanel } from './konto/adminvisning'
import { fagmeny } from './meny/fagmeny'
import { nyttINiva, rensNiva, type Menypunkt, type Menyniva } from './meny/menytre'

const flertall = (antall: number, en: string, flere: string) => `${antall} ${antall === 1 ? en : flere}`

/** Navnet på hovedmenyens øverste nivå, i toppfeltet og for skjermlesere. */
export const HOVEDMENYEN = 'Meny'

/**
 * OUSFAR Personals valg i hovedmenyen, som Kalender. Under utviklingen er
 * de bare for systemarkitektene, og senere per fagmiljø bak funksjonsbryterne
 * (#598, `docs/personal.md`); tilgangen kontrolleres alltid på serveren.
 * Grenen «Personal» vises ikke før den har et valg.
 */
const PERSONALVALG: readonly Menypunkt[] = []

export interface Hovedmenyvalg {
  /** Om menyen står åpen: da hentes tallet på forslag som venter. */
  apen: boolean
  /** Lukker menyen med fokus tilbake til menyknappen, før en handling åpner et vindu. */
  lukk: () => void
  /** Siden brukeren står på, for å merke den i menyen. */
  rute: Rute
  register: Stoffregister
}

/**
 * Hovedmenyens tre (Issue #604; `docs/navigasjon.md`, «Hovedmenyen»): Forsiden,
 * Fortolkning, Fag, Personal, Grupper, Chat og Endringsforslag, og under dem
 * Apputvikling og Administrasjon, med det brukeren har tilgang til. Visningen
 * står i `Sidemeny`, modellen i `meny/menytre.ts`.
 *
 * `varsel` er det som bør få en prikk på menyknappen mens menyen er lukket:
 * alt nytt i treet (en invitasjon til en gruppe, nye kommentarer på idéene og
 * det som bør ses over i administrasjonen). Chatten har sin egen boble, og
 * forslagene sitt tall i kontomenyen, så de står bare som tall i menyen.
 */
export function useHovedmenyen({ apen, lukk, rute, register }: Hovedmenyvalg) {
  const rettigheter = useRettigheter()
  const systemarkitekt = useSystemarkitekt()
  const { invitasjoner } = useGrupper()
  const chat = useChatstatus()
  const ideer = idestatus.bruk()
  const admin = adminstatus.bruk()
  const favoritter = useFavoritter()
  const visVerktoy = useVerktoyeneVises()
  const [visUnderkategorier, setVisUnderkategorier] = useBevart('sidemeny/underkategorier', true)
  const behandler = rettigheter.behandlerForslag
  const [tilMeg, setTilMeg] = useState(0)
  useEffect(() => {
    if (!apen) return
    let gjelder = true
    hentForslagTilMeg(behandler).then(
      (antall) => gjelder && setTilMeg(antall),
      () => undefined,
    )
    return () => {
      gjelder = false
    }
  }, [apen, behandler])

  // Stoffregisteret er den største delen av treet, og bygges bare på nytt når
  // noe i det er endret.
  const fag = useMemo(
    () =>
      fagmeny({
        register,
        favoritter,
        verktoy: visVerktoy ? VERKTOY : [],
        visUnderkategorier,
        settVisUnderkategorier: setVisUnderkategorier,
        rute,
      }),
    [register, favoritter, visVerktoy, visUnderkategorier, setVisUnderkategorier, rute],
  )

  /** Et vindu eller chatten åpnes etter at menyen er lukket, så fokus kommer tilbake til menyknappen. */
  const etter = (handling: () => void) => () => {
    lukk()
    handling()
  }

  const nyInvitasjon =
    invitasjoner.length === 0 ? undefined : invitasjoner.length === 1 ? 'én ny invitasjon' : `${invitasjoner.length} nye invitasjoner`

  const hoved: Menypunkt[] = [
    { id: 'forside', navn: 'Forsiden', ikon: 'hjem', adresse: FORSIDEADRESSE, gjeldende: rute.side === 'forside' },
    { id: 'fortolkning', navn: 'Fortolkning', ikon: 'interp', adresse: FORTOLKNINGSADRESSE, gjeldende: rute.side === 'fortolkning' },
    fag,
    { id: 'personal', navn: 'Personal', ikon: 'kalender', undermeny: { navn: 'Personal', avsnitt: [{ id: 'personal', punkter: PERSONALVALG }] } },
    {
      id: 'grupper',
      navn: 'Grupper',
      ikon: 'grupper',
      adresse: gruppeadresse(),
      gjeldende: rute.side === 'grupper',
      merke: invitasjoner.length > 0 ? flertall(invitasjoner.length, 'invitasjon', 'invitasjoner') : undefined,
      nytt: nyInvitasjon,
    },
    {
      id: 'chat',
      navn: 'Chat',
      ikon: CHATIKON,
      vis: chat.finnes,
      handling: etter(() => visGruppesamtale(null)),
      gjeldende: rute.side === 'chat',
      merke: chat.uleste > 0 ? `${chat.uleste} uleste` : undefined,
    },
    {
      id: 'forslag',
      navn: 'Endringsforslag',
      ikon: 'foresla',
      adresse: forslagsadresse(),
      gjeldende: rute.side === 'forslag',
      merke: tilMeg > 0 ? `${tilMeg} til deg` : undefined,
    },
  ]

  const apputvikling: Menypunkt = {
    id: 'apputvikling',
    navn: 'Apputvikling',
    ikon: 'ideoppgaver',
    undermeny: {
      navn: 'Apputvikling',
      avsnitt: [
        {
          id: 'apputvikling',
          punkter: [
            { id: 'ideer', navn: 'Idéer for appen', ikon: 'idea', handling: etter(() => apneIdelag('ideer')), nytt: nyeIdekommentarer(ideer) },
            {
              id: 'oppgaver',
              navn: 'Planlagte oppgaver',
              ikon: 'oppgaver',
              vis: systemarkitekt,
              handling: etter(() => apneIdelag('oppgaver')),
              hint: 'Systemarkitekt',
            },
          ],
        },
      ],
    },
  }

  const administrasjon: Menypunkt = {
    id: 'administrasjon',
    navn: 'Administrasjon',
    ikon: 'shield',
    undermeny: {
      navn: 'Administrasjon',
      avsnitt: [
        {
          id: 'administrasjon',
          punkter: adminvalg(rettigheter).map((v) => ({
            id: v.panel,
            navn: v.tekst,
            ikon: v.ikon,
            handling: etter(() => apneAdminpanel(v.panel)),
            nytt: admin[v.panel],
          })),
        },
      ],
    },
  }

  const rot: Menyniva = rensNiva({
    navn: HOVEDMENYEN,
    avsnitt: [
      { id: 'hoved', punkter: hoved },
      { id: 'appen', punkter: [apputvikling, administrasjon] },
    ],
  })

  const varsel = nyttINiva(rot).join(', ') || undefined
  return { rot, varsel }
}

export type Hovedmenyen = ReturnType<typeof useHovedmenyen>
