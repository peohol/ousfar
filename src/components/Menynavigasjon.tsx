import { useEffect, useId, useState } from 'react'
import { useRettigheter } from '../auth/rettigheter'
import { useSystemarkitekt } from '../auth/systemrolle'
import { FORSIDEADRESSE, FORTOLKNINGSADRESSE, forslagsadresse, gruppeadresse, lesRute, type Rute } from '../domain/rute'
import { hentForslagTilMeg } from '../forslag/behandling'
import { useGrupper } from '../grupper/kilde'
import { useBevart } from '../oppdatering/Bevaring'
import { CHATIKON } from './chat/chatvisning'
import { useChatstatus, visGruppesamtale } from './chat/chatstyring'
import { nyeIdekommentarer } from './ideer/Idelag'
import { apneIdelag, idestatus } from './ideer/idevisning'
import { Ikon } from './ikon/Ikon'
import type { Ikonnavn } from './ikon/register'
import { adminstatus, adminvalg, adminvarsel, apneAdminpanel } from './konto/adminvisning'

/**
 * Ett valg i hovedmenyens navigasjonsblokk: en lenke til en side (`adresse`,
 * merket som siden brukeren står på når ruten er `side`), eller en handling
 * som åpner et vindu eller chatmenyen.
 */
interface Menypunkt {
  id: string
  navn: string
  ikon: Ikonnavn
  adresse?: string
  side?: Rute['side']
  handling?: () => void
  /** Kort tekst til høyre, som «2 invitasjoner». */
  merke?: string
  /** Noe nytt venter bak valget: en prikk med denne teksten. */
  nytt?: string
  /** Kort merknad til høyre om hvem valget er for. */
  hint?: string
}

const flertall = (antall: number, en: string, flere: string) => `${antall} ${antall === 1 ? en : flere}`

/**
 * Det hovedmenyen viser over fanene (D6; skisse 19 og 29): navigasjonen
 * (Forsiden, Fortolkning, Grupper, Chat, Endringsforslag) og «For hele
 * appen» (Idéer, Planlagte oppgaver og Administrasjon, etter rollen). Alt
 * står ett sted, med tallene som før stod på knappene i toppmenyen.
 *
 * `varsel` er det som bør få en prikk på menyknappen mens menyen er lukket:
 * det som før hadde prikk i toppmenyen (en invitasjon til en gruppe, nye
 * kommentarer på idéene og det som bør ses over i administrasjonen). Chatten
 * har sin egen boble, og forslagene sitt tall i kontomenyen.
 *
 * `apen` sier om menyen står åpen: da hentes tallet på forslag som venter.
 * `lukk` lukker menyen med fokus tilbake til menyknappen.
 */
export function useHovedmenyen(apen: boolean, lukk: () => void) {
  const rettigheter = useRettigheter()
  const systemarkitekt = useSystemarkitekt()
  const { invitasjoner } = useGrupper()
  const chat = useChatstatus()
  const ideer = idestatus.bruk()
  const admin = adminstatus.bruk()
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

  /** Et vindu eller chatten åpnes etter at menyen er lukket, så fokus kommer tilbake til menyknappen. */
  const etter = (handling: () => void) => () => {
    lukk()
    handling()
  }

  const invitert = invitasjoner.length > 0 ? flertall(invitasjoner.length, 'invitasjon', 'invitasjoner') : undefined
  const nyInvitasjon =
    invitasjoner.length === 0 ? undefined : invitasjoner.length === 1 ? 'én ny invitasjon' : `${invitasjoner.length} nye invitasjoner`
  const nyeIdeer = nyeIdekommentarer(ideer)
  const valg = adminvalg(rettigheter)
  const tilsyn = adminvarsel(admin)

  const navigasjon: Menypunkt[] = [
    { id: 'forside', navn: 'Forsiden', ikon: 'hjem', adresse: FORSIDEADRESSE, side: 'forside' },
    { id: 'fortolkning', navn: 'Fortolkning', ikon: 'interp', adresse: FORTOLKNINGSADRESSE, side: 'fortolkning' },
    { id: 'grupper', navn: 'Grupper', ikon: 'grupper', adresse: gruppeadresse(), side: 'grupper', merke: invitert },
    ...(chat.finnes
      ? [
          {
            id: 'chat',
            navn: 'Chat',
            ikon: CHATIKON,
            side: 'chat' as const,
            handling: etter(() => visGruppesamtale(null)),
            merke: chat.uleste > 0 ? `${chat.uleste} uleste` : undefined,
          },
        ]
      : []),
    {
      id: 'forslag',
      navn: 'Endringsforslag',
      ikon: 'foresla',
      adresse: forslagsadresse(),
      side: 'forslag',
      merke: tilMeg > 0 ? `${tilMeg} til deg` : undefined,
    },
  ]

  const helApp: Menypunkt[] = [
    { id: 'ideer', navn: 'Idéer for appen', ikon: 'idea', handling: etter(() => apneIdelag('ideer')), nytt: nyeIdeer },
    ...(systemarkitekt
      ? [{ id: 'oppgaver', navn: 'Planlagte oppgaver', ikon: 'oppgaver' as const, handling: etter(() => apneIdelag('oppgaver')), hint: 'Systemarkitekt' }]
      : []),
  ]

  const administrasjon = valg.map((v) => ({
    id: v.panel,
    navn: v.tekst,
    ikon: v.ikon,
    handling: etter(() => apneAdminpanel(v.panel)),
    nytt: admin[v.panel],
  }))

  const varsel = [nyInvitasjon, nyeIdeer, tilsyn].filter(Boolean).join(', ') || undefined

  return { navigasjon, helApp, administrasjon, tilsyn, varsel }
}

export type Hovedmenyen = ReturnType<typeof useHovedmenyen>

/**
 * Navigasjonsblokken øverst i hovedmenyen. Lenkene lukker menyen med
 * `onGaa` (siden tar fokus selv); handlingene lukker den med fokus tilbake
 * til menyknappen før vinduet åpnes.
 */
export function Menynavigasjon({ meny, apen, onGaa }: { meny: Hovedmenyen; apen: boolean; onGaa: () => void }) {
  const side = apen ? lesRute(window.location.hash).side : null
  const [adminApen, setAdminApen] = useBevart('sidemeny/administrasjon', false)
  const adminId = useId()
  const overskrift = useId()

  return (
    <div className="menynavigasjon">
      <ul className="menysnarveier">
        {meny.navigasjon.map((p) => (
          <Punkt key={p.id} punkt={p} gjeldende={p.side !== undefined && p.side === side} onGaa={onGaa} />
        ))}
      </ul>

      {(meny.helApp.length > 0 || meny.administrasjon.length > 0) && (
        <>
          <p className="menysnarveier__overskrift" id={overskrift}>
            For hele appen
          </p>
          <ul className="menysnarveier" aria-labelledby={overskrift}>
            {meny.helApp.map((p) => (
              <Punkt key={p.id} punkt={p} gjeldende={false} onGaa={onGaa} />
            ))}
            {meny.administrasjon.length > 0 && (
              <li className="menysnarveier__skuff" data-apen={adminApen || undefined}>
                <button
                  type="button"
                  className="menysnarveier__lenke"
                  aria-expanded={adminApen}
                  aria-controls={adminId}
                  onClick={() => setAdminApen((a) => !a)}
                >
                  <Ikon navn="shield" storrelse="ui" />
                  <span className="menysnarveier__navn">Administrasjon</span>
                  {meny.tilsyn && <span className="nyprikk" role="img" aria-label={meny.tilsyn} />}
                  <Ikon navn="chev" className="menysnarveier__pil" />
                </button>
                <ul id={adminId} className="menysnarveier menysnarveier--under" hidden={!adminApen}>
                  {meny.administrasjon.map((p) => (
                    <Punkt key={p.id} punkt={p} gjeldende={false} onGaa={onGaa} />
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  )
}

function Punkt({ punkt: p, gjeldende, onGaa }: { punkt: Menypunkt; gjeldende: boolean; onGaa: () => void }) {
  const innhold = (
    <>
      <Ikon navn={p.ikon} storrelse="ui" />
      <span className="menysnarveier__navn">{p.navn}</span>
      {p.nytt && <span className="nyprikk" role="img" aria-label={p.nytt} />}
      {p.merke && <span className="menysnarveier__merke">{p.merke}</span>}
      {p.hint && <span className="menysnarveier__merke">{p.hint}</span>}
    </>
  )
  return (
    <li>
      {p.adresse ? (
        <a className="menysnarveier__lenke" href={p.adresse} aria-current={gjeldende ? 'page' : undefined} onClick={onGaa}>
          {innhold}
        </a>
      ) : (
        <button type="button" className="menysnarveier__lenke" aria-current={gjeldende ? 'page' : undefined} onClick={p.handling}>
          {innhold}
        </button>
      )}
    </li>
  )
}
