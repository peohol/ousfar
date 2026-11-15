import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { brukernavnFeil, normaliserBrukernavn } from '@delt/brukernavn'
import { visningsnavn } from '@delt/profil'
import {
  avsluttMedlemskap,
  giMedlemskap,
  hentMedlemsoversikt,
  leggTilMedlem,
  nyttMidlertidigPassord,
  opprettBruker,
  opprettFagmiljo,
  settFagmiljoadministrator,
  settRolle,
  type Medlem,
  type Midlertidig,
} from '../../auth/api'
import { useAvatarlenker } from '../../auth/avatarer'
import { useProfil } from '../../auth/okt'
import { useRettigheter, type Fagmiljoreferanse } from '../../auth/rettigheter'
import { useClipboard } from '../../hooks/useClipboard'
import { useBevart } from '../../oppdatering/Bevaring'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import type { Ikonnavn } from '../ikon/register'
import { Merke } from '../Merke'
import { Modallag } from '../Modallag'
import { Avatar } from './Avatar'
import { Bekreftelseskort } from './Bekreftelseskort'
import { Felt } from './Felt'

/** Skjemaet som står åpent øverst i lista. */
type Skjema = 'opprett' | 'legg_til' | 'nytt_fagmiljo' | null

/** En handling som fjerner tilgang, og som derfor må bekreftes. */
interface Bekreftelse {
  medlem: Medlem
  /** Fagmiljøet raden ble hentet fra; handlingen gjelder alltid det. */
  fagmiljo: Fagmiljoreferanse
  handling: 'avslutt' | 'fjern_admin'
}

/** Medlemmene slik de ble hentet, sammen med fagmiljøet de hører til. */
interface Medlemsliste {
  fagmiljo: string | null
  medlemmer: Medlem[]
}

const TOM_LISTE: Medlemsliste = { fagmiljo: null, medlemmer: [] }

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const melding = (aarsak: unknown) => (aarsak instanceof Error ? aarsak.message : UVENTET)

/**
 * Brukerne, fagmiljø for fagmiljø (docs/fagmiljoer.md, «Medlemskap og
 * kontosperring»).
 *
 * Den innloggede velger et av fagmiljøene hen administrerer
 * (`useRettigheter().administrerer`; en systemarkitekt har alle) og ser
 * medlemmene der, og de tidligere medlemmene for seg. På hver rad står bare
 * handlingene databasen tillater (`hentMedlemsoversikt`): avslutte
 * medlemskapet, gi et tidligere medlem tilgang igjen, nytt midlertidig
 * passord, og for systemarkitektene å utpeke eller fjerne lokale
 * administratorer og den gamle adminrollen. Det som fjerner tilgang, må
 * bekreftes, og bekreftelsen sier hva som skjer, også at kontoen sperres når
 * det er det siste medlemskapet.
 *
 * Eksisterende kontoer legges til med brukernavnet. Nye brukere opprettes
 * direkte i fagmiljøet som vises, der den innloggede har lov
 * (`useRettigheter().opprettBrukerI`); brukernavnet er det eneste som må
 * oppgis. Systemarkitektene
 * kan opprette nye fagmiljøer, som er lukket for andre enn dem til
 * startporten er godkjent. Knappene er et grensesnitt, ikke en
 * tilgangskontroll: databasen og Edge-funksjonene kontrollerer hver handling
 * på nytt.
 */
export function Brukerliste({ apen, onLukk }: { apen: boolean; onLukk: () => void }) {
  const meg = useProfil()
  const rettigheter = useRettigheter()
  // Et fagmiljø som nettopp er opprettet, står med til rettighetene er hentet på nytt.
  const [nye, setNye] = useState<Fagmiljoreferanse[]>([])
  const fagmiljoer = useMemo(
    () => [...rettigheter.administrerer, ...nye.filter((n) => !rettigheter.administrerer.some((f) => f.id === n.id))],
    [rettigheter.administrerer, nye],
  )
  const [valgtId, setValgtId] = useBevart<string | null>('brukerliste.fagmiljo', null)
  // Uten et valg vises fagmiljøet den innloggede arbeider i, når hen administrerer det.
  const valgt =
    fagmiljoer.find((f) => f.id === valgtId) ??
    fagmiljoer.find((f) => f.id === rettigheter.arbeidsfagmiljo?.id) ??
    fagmiljoer.find((f) => f.standard) ??
    fagmiljoer[0] ??
    null

  const [liste, setListe] = useState<Medlemsliste>(TOM_LISTE)
  // Bare rader hentet fra fagmiljøet som er valgt nå, vises og kan handles på.
  // Et svar som kommer etter at et annet fagmiljø er valgt, vises aldri.
  const listensFagmiljo = valgt !== null && liste.fagmiljo === valgt.id ? valgt : null
  const medlemmer = listensFagmiljo ? liste.medlemmer : TOM_LISTE.medlemmer
  /** Økes for hver henting; bare svaret på den siste brukes. */
  const sisteHenting = useRef(0)
  /** Fagmiljøet som vises nå, eller `null` når vinduet er lukket. */
  const vistFagmiljo = useRef<string | null>(null)
  vistFagmiljo.current = apen ? (valgt?.id ?? null) : null
  const [feil, setFeil] = useState<string | null>(null)
  const [kvittering, setKvittering] = useState<string | null>(null)
  const [laster, setLaster] = useState(false)
  const [skjema, setSkjema] = useState<Skjema>(null)
  const [tekst, setTekst] = useBevart('brukerliste.skjema', '')
  const [arbeider, setArbeider] = useState<string | null>(null)
  const [midlertidig, setMidlertidig] = useState<Midlertidig | null>(null)
  const [bekreft, setBekreft] = useState<Bekreftelse | null>(null)
  const lenker = useAvatarlenker(medlemmer)
  const velgerId = useId()

  /**
   * Henter medlemmene i fagmiljøet. Svaret brukes bare om det er svaret på
   * den siste hentingen og fagmiljøet fortsatt vises; ellers forkastes det.
   */
  const hent = useCallback(async (fagmiljo: string | undefined) => {
    const denne = ++sisteHenting.current
    const gjelder = () => denne === sisteHenting.current && vistFagmiljo.current === fagmiljo
    if (!fagmiljo) {
      setListe(TOM_LISTE)
      return
    }
    setLaster(true)
    try {
      const hentet = await hentMedlemsoversikt(fagmiljo)
      if (!gjelder()) return
      setListe({ fagmiljo, medlemmer: hentet })
      setFeil(null)
    } catch (aarsak) {
      if (!gjelder()) return
      setListe(TOM_LISTE)
      setFeil(aarsak instanceof Error && aarsak.message !== UVENTET ? aarsak.message : 'Fikk ikke hentet medlemmene.')
    } finally {
      if (denne === sisteHenting.current) setLaster(false)
    }
  }, [])

  useEffect(() => {
    if (!apen) {
      // En henting som er på vei når vinduet lukkes, brukes ikke.
      sisteHenting.current++
      return
    }
    setMidlertidig(null)
    setBekreft(null)
    setKvittering(null)
    void hent(valgt?.id)
  }, [apen, valgt?.id, hent])

  /**
   * Gjør arbeidet, viser kvitteringen eller feilen, og henter lista for
   * fagmiljøet handlingen gjaldt, på nytt. Fagmiljøet kan ikke byttes mens
   * arbeidet pågår.
   */
  const utfor = async (hva: string, fagmiljo: string | null, arbeid: () => Promise<string | null>) => {
    if (arbeider) return
    setArbeider(hva)
    setFeil(null)
    setKvittering(null)
    try {
      setKvittering(await arbeid())
      if (fagmiljo) await hent(fagmiljo)
    } catch (aarsak) {
      setFeil(melding(aarsak))
    } finally {
      setArbeider(null)
    }
  }

  const apneSkjema = (nytt: Skjema) => {
    setSkjema(nytt)
    setTekst('')
    setFeil(null)
  }

  const sendSkjema = (hendelse: FormEvent) => {
    hendelse.preventDefault()
    if (skjema === 'nytt_fagmiljo') {
      void utfor('skjema', null, async () => {
        const ny = await opprettFagmiljo(tekst)
        setNye((forrige) => [...forrige, { ...ny, standard: false, apent: false }])
        setValgtId(ny.id)
        apneSkjema(null)
        return `${ny.navn} er opprettet. Det er lukket for andre enn systemarkitektene til det er godkjent åpnet.`
      })
      return
    }
    const brukernavn = normaliserBrukernavn(tekst)
    const lokalFeil = brukernavnFeil(brukernavn)
    if (lokalFeil) {
      setFeil(lokalFeil)
      return
    }
    // Fagmiljøet skjemaet ble sendt for; det står fast til svaret er kommet.
    const her = valgt
    if (!her) return
    void utfor('skjema', her.id, async () => {
      if (skjema === 'opprett') {
        setMidlertidig(await opprettBruker(brukernavn, her.id))
        apneSkjema(null)
        return null
      }
      await leggTilMedlem(brukernavn, her.id)
      apneSkjema(null)
      return `${brukernavn} er medlem av ${her.navn}.`
    })
  }

  const bekreftet = ({ medlem, fagmiljo: f, handling }: Bekreftelse) => {
    const navn = visningsnavn(medlem)
    void utfor(medlem.id, f.id, async () => {
      setBekreft(null)
      if (handling === 'fjern_admin') {
        await settFagmiljoadministrator(medlem.id, f.id, false)
        return `${navn} er ikke lenger administrator i ${f.navn}.`
      }
      const svar = await avsluttMedlemskap(medlem.id, f.id)
      return svar.sperret
        ? `${navn} er ikke lenger medlem av ${f.navn}. Kontoen er sperret og logget ut.`
        : `${navn} er ikke lenger medlem av ${f.navn}.`
    })
  }

  const gjeldende = medlemmer.filter((m) => m.status !== 'avsluttet')
  const tidligere = medlemmer.filter((m) => m.status === 'avsluttet')
  const kanOpprette = valgt !== null && rettigheter.opprettBrukerI.includes(valgt.id)

  /** Raden til et medlem av `f`, fagmiljøet lista ble hentet fra. Hver handling gjelder `f`. */
  const rad = (f: Fagmiljoreferanse) => (medlem: Medlem) => {
    const navn = visningsnavn(medlem)
    const egen = medlem.id === meg.id
    const opptatt = arbeider !== null
    const knapper: ReactNode[] = []
    const knapp = (nokkel: string, ikon: Ikonnavn, etikett: string, synlig: string, gjor: () => void) =>
      knapper.push(
        <Button key={nokkel} variant="kant" icon={<Ikon navn={ikon} />} aria-label={etikett} disabled={opptatt} onClick={gjor}>
          {synlig}
        </Button>,
      )
    if (!egen && medlem.status !== 'avsluttet') {
      if (medlem.nytt_passord) {
        knapp('passord', 'key', `Nytt passord for ${navn}`, 'Nytt passord', () =>
          void utfor(medlem.id, f.id, async () => {
            setMidlertidig(await nyttMidlertidigPassord(medlem.id))
            return null
          }),
        )
      }
      if (medlem.kan_gjore_til_administrator) {
        knapp('admin', 'shield', `Gjør ${navn} til administrator i ${f.navn}`, 'Gjør til administrator', () =>
          void utfor(medlem.id, f.id, async () => {
            await settFagmiljoadministrator(medlem.id, f.id, true)
            return `${navn} er administrator i ${f.navn}.`
          }),
        )
      }
      if (medlem.kan_fjerne_som_administrator) {
        knapp('fjern_admin', 'shield', `Fjern ${navn} som administrator i ${f.navn}`, 'Fjern som administrator', () =>
          setBekreft({ medlem, fagmiljo: f, handling: 'fjern_admin' }),
        )
      }
      if (medlem.endre_rolle) {
        const har = medlem.rolle === 'admin'
        knapp('rolle', 'shield', `${har ? 'Fjern adminrollen' : 'Gi adminrollen'}: ${navn}`, har ? 'Fjern adminrollen' : 'Gi adminrollen', () =>
          void utfor(medlem.id, f.id, async () => {
            await settRolle(medlem.id, har ? 'user' : 'admin')
            return null
          }),
        )
      }
      if (medlem.kan_avslutte) {
        knapp('avslutt', 'close', `Avslutt medlemskapet til ${navn}`, 'Avslutt medlemskap', () =>
          setBekreft({ medlem, fagmiljo: f, handling: 'avslutt' }),
        )
      }
    }
    if (!egen && medlem.status === 'avsluttet' && medlem.kan_gi_tilgang) {
      knapp('gi', 'reset', `Gi ${navn} tilgang igjen`, 'Gi tilgang igjen', () =>
        void utfor(medlem.id, f.id, async () => {
          await giMedlemskap(medlem.id, f.id)
          return `${navn} er medlem av ${f.navn} igjen.`
        }),
      )
    }

    return (
      <li key={medlem.id} className="brukerrad">
        <Avatar profil={medlem} lenke={medlem.avatar_path ? (lenker.get(medlem.avatar_path) ?? null) : null} />
        <span className="brukerrad__navn">
          <span className="brukerrad__fullt">
            {navn}
            {egen && <span className="brukerrad__deg"> (deg)</span>}
          </span>
          <span className="brukerrad__brukernavn">{medlem.username}</span>
        </span>

        <span className="brukerrad__merker">
          {medlem.systemarkitekt && (
            <Merke tone="aksent" ikon={<Ikon navn="shield" />}>
              Systemarkitekt
            </Merke>
          )}
          {medlem.administrator && (
            <Merke tone="aksent" ikon={<Ikon navn="shield" />}>
              Administrator
            </Merke>
          )}
          {!medlem.systemarkitekt && !medlem.administrator && <Merke>Bruker</Merke>}
          {medlem.rolle === 'admin' && <Merke>Adminrolle</Merke>}
          {medlem.status === 'invitert' && <Merke>Invitert</Merke>}
          {medlem.sperret && <Merke tone="toksisk">Sperret</Merke>}
          {medlem.status !== 'avsluttet' && medlem.maa_bytte_passord && <Merke tone="toksisk">Må bytte passord</Merke>}
        </span>

        {knapper.length > 0 && <span className="brukerrad__knapper">{knapper}</span>}
      </li>
    )
  }

  return (
    <Modallag
      apen={apen}
      tittel="Brukere"
      ikon="shield"
      bred
      onLukk={onLukk}
      undertittel={valgt && fagmiljoer.length === 1 ? valgt.navn : undefined}
      handling={
        kanOpprette && skjema !== 'opprett' ? (
          <Button className="knapp--kompakt" icon={<Ikon navn="plus" />} onClick={() => apneSkjema('opprett')}>
            Opprett bruker
          </Button>
        ) : null
      }
    >
      {fagmiljoer.length > 1 && (
        <div className="felt">
          <label className="felt__merkelapp" htmlFor={velgerId}>
            Fagmiljø
          </label>
          <select
            id={velgerId}
            className="felt__inndata"
            value={valgt?.id ?? ''}
            // Ikke mens en handling pågår: den hører til fagmiljøet som vises.
            disabled={arbeider !== null}
            onChange={(hendelse) => {
              setValgtId(hendelse.target.value)
              apneSkjema(null)
            }}
          >
            {fagmiljoer.map((f) => (
              <option key={f.id} value={f.id}>
                {f.navn}
              </option>
            ))}
          </select>
        </div>
      )}

      {valgt && !valgt.apent && (
        <p className="brukerliste__merknad">
          {valgt.navn} er ikke åpnet for medlemmer ennå. Bare systemarkitekter kan legges til.
        </p>
      )}

      {((valgt?.apent ?? false) || rettigheter.systemarkitekt) && skjema === null && (
        <div className="skjema__knapper">
          {/* Et lukket fagmiljø tar bare imot systemarkitekter (startporten S2). */}
          {valgt && (valgt.apent || rettigheter.systemarkitekt) && (
            <Button variant="kant" icon={<Ikon navn="plus" />} onClick={() => apneSkjema('legg_til')}>
              Legg til medlem
            </Button>
          )}
          {rettigheter.systemarkitekt && (
            <Button variant="kant" icon={<Ikon navn="plus" />} onClick={() => apneSkjema('nytt_fagmiljo')}>
              Nytt fagmiljø
            </Button>
          )}
        </div>
      )}

      {skjema && (
        <form className="skjema" onSubmit={sendSkjema}>
          <Felt
            merkelapp={skjema === 'nytt_fagmiljo' ? 'Navn på fagmiljøet' : 'Brukernavn'}
            autoComplete="off"
            autoCapitalize={skjema === 'nytt_fagmiljo' ? undefined : 'none'}
            autoCorrect="off"
            spellCheck={false}
            // Feltet er det eneste i skjemaet, og skjemaet åpnet nettopp.
            autoFocus
            value={tekst}
            hjelp={
              skjema === 'opprett'
                ? `Brukeren blir medlem av ${valgt?.navn} og får et midlertidig passord som vises én gang.`
                : skjema === 'legg_til'
                  ? `Brukeren må ha en konto fra før, og blir medlem av ${valgt?.navn}.`
                  : 'Fagmiljøet opprettes lukket, med deg som administrator. Andre enn systemarkitektene kan bli medlemmer først når det er godkjent åpnet.'
            }
            onChange={(hendelse) => setTekst(hendelse.target.value)}
          />
          <div className="skjema__knapper">
            <Button type="submit" disabled={arbeider !== null}>
              {arbeider === 'skjema'
                ? 'Lagrer …'
                : skjema === 'opprett'
                  ? 'Opprett'
                  : skjema === 'legg_til'
                    ? 'Legg til'
                    : 'Opprett fagmiljø'}
            </Button>
            <Button variant="subtle" onClick={() => apneSkjema(null)}>
              Avbryt
            </Button>
          </div>
        </form>
      )}

      {bekreft && bekreft.fagmiljo.id === valgt?.id && (
        <Tilgangsbekreftelse
          bekreftelse={bekreft}
          opptatt={arbeider !== null}
          onBekreft={() => bekreftet(bekreft)}
          onAvbryt={() => setBekreft(null)}
        />
      )}

      {midlertidig && <Passordkvittering midlertidig={midlertidig} onLukk={() => setMidlertidig(null)} />}

      {kvittering && (
        <p className="brukerliste__kvittering" role="status">
          {kvittering}
        </p>
      )}

      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}

      {!valgt ? (
        <p className="brukerliste__tomt">Du administrerer ingen fagmiljøer.</p>
      ) : !listensFagmiljo ? (
        laster && <p className="brukerliste__tomt">Henter medlemmene …</p>
      ) : (
        <>
          <ul className="brukerliste" aria-label={`Medlemmer i ${listensFagmiljo.navn}`}>
            {gjeldende.map(rad(listensFagmiljo))}
          </ul>
          {tidligere.length > 0 && (
            <>
              <h3 className="brukerliste__overskrift">Tidligere medlemmer</h3>
              <ul className="brukerliste" aria-label={`Tidligere medlemmer i ${listensFagmiljo.navn}`}>
                {tidligere.map(rad(listensFagmiljo))}
              </ul>
            </>
          )}
        </>
      )}
    </Modallag>
  )
}

/**
 * Bekreftelsen før en handling som fjerner tilgang. Den sier hva som skjer,
 * også at kontoen sperres og logges ut når det er det siste medlemskapet.
 */
function Tilgangsbekreftelse({
  bekreftelse: {
    medlem,
    handling,
    fagmiljo: { navn: fagmiljo },
  },
  opptatt,
  onBekreft,
  onAvbryt,
}: {
  bekreftelse: Bekreftelse
  opptatt: boolean
  onBekreft: () => void
  onAvbryt: () => void
}) {
  const navn = visningsnavn(medlem)
  const avslutt = handling === 'avslutt'
  const tittel = avslutt
    ? `Avslutte medlemskapet til ${navn} i ${fagmiljo}?`
    : `Fjerne ${navn} som administrator i ${fagmiljo}?`
  return (
    <Bekreftelseskort
      tittel={tittel}
      bekreft={avslutt ? 'Avslutt medlemskapet' : 'Fjern som administrator'}
      opptatt={opptatt}
      onBekreft={onBekreft}
      onAvbryt={onAvbryt}
    >
      {avslutt ? (
        <>
          {navn} mister tilgangen til {fagmiljo}.
          {medlem.administrator && ` ${navn} er også administrator her, og det avsluttes samtidig.`}{' '}
          {medlem.eneste_medlemskap
            ? `Dette er det eneste medlemskapet til ${navn}, så kontoen sperres og logges ut på alle enheter. Du kan gi tilgang igjen senere under «Tidligere medlemmer».`
            : 'Medlemskapene i andre fagmiljøer står.'}
        </>
      ) : (
        `${navn} er fortsatt medlem, men kan ikke lenger administrere medlemmene her.`
      )}
    </Bekreftelseskort>
  )
}

/**
 * Det midlertidige passordet, vist én gang.
 *
 * Det lagres ingen steder og kan ikke hentes fram igjen. Mistes det, lages et
 * nytt — derfor står advarselen like tydelig som passordet selv.
 */
function Passordkvittering({ midlertidig, onLukk }: { midlertidig: Midlertidig; onLukk: () => void }) {
  const kopier = useClipboard()
  const [kopiert, setKopiert] = useState(false)

  useEffect(() => {
    setKopiert(false)
  }, [midlertidig])

  return (
    <div className="passordkvittering" role="alert">
      <p className="passordkvittering__tittel">
        <Ikon navn="key" storrelse="underpunkt" />
        <span>
          Midlertidig passord for <strong>{midlertidig.brukernavn}</strong>
        </span>
      </p>
      {midlertidig.fagmiljo && (
        <p className="passordkvittering__fagmiljo">Kontoen er opprettet som medlem av {midlertidig.fagmiljo.navn}.</p>
      )}
      <p className="passordkvittering__passord">
        <code>{midlertidig.midlertidigPassord}</code>
        <Button
          className="knapp--kompakt"
          icon={kopiert ? <Ikon navn="bInnenfor" /> : <Ikon navn="copy" />}
          onClick={() => void kopier(midlertidig.midlertidigPassord).then(setKopiert)}
        >
          {kopiert ? 'Kopiert' : 'Kopier'}
        </Button>
      </p>
      <p className="passordkvittering__advarsel">
        Passordet vises bare nå. Gi det til brukeren, som må bytte det ved første innlogging. Blir det borte, må du
        lage et nytt.
      </p>
      <Button variant="kant" onClick={onLukk}>
        Jeg har notert passordet
      </Button>
    </div>
  )
}
