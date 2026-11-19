import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  arkiverIde,
  endreKommentar,
  gjenopprettIde,
  hentIdetraad,
  merkIdeSett,
  opprettKommentar,
  overforIde,
  settHjerte,
  slettIde,
  slettKommentar,
} from '../../ideer/api'
import { gjorOmTilGruppeoppgave } from '../../grupper/api'
import { idetilstand, slettesKl, type Idetraad } from '../../ideer/modell'
import type { Kommentar } from '../../traad/modell'
import { UnderOverskrift } from '../Overskriftsniva'
import { Riktekst } from '../stoffside/Riktekst'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Forfatterbilde, Forfatternavn, useForfatterkontekst } from '../traad/Forfatterkontekst'
import { Gruppeoppgavestatusmerke, Kategorimerke } from './Merker'
import { Kommentartraad, type Fremheving, type Kommentarkanal } from '../traad/Kommentartraad'
import { Kopilenkeknapp } from '../direktelenker/Kopilenkeknapp'
import { Hjerteknapp, Idehandling, Slettknapp, Tidspunkt } from '../traad/Smadeler'

const DATO = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Én idé: overskriften, hvem som skrev den og når, beskrivelsen, hjertene og
 * kommentartråden. Forfatteren kan endre og slette idéen. Den som behandler
 * idéene (`kan_behandle`: en systemarkitekt for de felles idéene, de
 * ansvarlige i gruppen for en gruppeidé) kan legge den i «Ikke aktuelt» og
 * overføre den til Planlagte oppgaver, eller gjøre en gruppeidé om til en
 * oppgave i gruppen. Den som modererer (`kan_moderere`), kan slette den og
 * andres kommentarer. Hva den innloggede kan, sier databasen i tråden.
 *
 * En arkivert eller overført idé er frosset: den kan leses, men ikke endres,
 * kommenteres eller gis hjerter. En gruppeidé som er gjort om til en oppgave,
 * kan ikke endres, men gruppen kan fortsette å kommentere den. Den som
 * behandler idéene, kan gjenopprette en arkivert idé eller slette den for godt.
 *
 * Å åpne idéen merker den som sett. Kommentarene som var nye da den ble
 * åpnet, står merket som nye til man går ut av den.
 *
 * `innebygd`: idéen står inni en oppgave, som bakgrunn for den. Da tar den
 * ikke fokus og har ingen av handlingene for behandlingen.
 */
export function Ideside({
  id,
  innebygd = false,
  onEndre,
  onSlettet,
  onArkivert,
  onOverfort,
  onOppgave,
  onGjortOm,
  onGruppeoppgave,
  onGjenapnet,
  onSett,
  gruppe,
  overskriftsniva = 3,
  fremhev = null,
}: {
  id: string
  /** Gruppen idéen må høre til (på gruppesiden). En annen idé vises som borte. */
  gruppe?: string
  innebygd?: boolean
  onEndre?: (ide: Idetraad) => void
  onSlettet?: () => void
  /** En systemarkitekt har lagt idéen i arkivet. */
  onArkivert?: (ide: Idetraad) => void
  /** En systemarkitekt har overført idéen; `oppgave` er ID-en til oppgaven. */
  onOverfort?: (ide: Idetraad, oppgave: string) => void
  /** Til oppgaven en overført idé ble til. */
  onOppgave?: (oppgave: string) => void
  /** En ansvarlig har gjort gruppeidéen om til en oppgave i gruppen. */
  onGjortOm?: (ide: Idetraad, oppgave: string) => void
  /** Til oppgaven i gruppen en gruppeidé er gjort om til. */
  onGruppeoppgave?: (oppgave: string) => void
  /** Idéen er åpnet igjen, eller gjenopprettet fra arkivet. */
  onGjenapnet?: (ide: Idetraad) => void
  /** Idéen og kommentarene er merket sett. */
  onSett?: () => void
  /** Nivået på overskriften når idéen ikke er innebygd: 3 i idévinduet, 2 på gruppesiden. */
  overskriftsniva?: 2 | 3
  /** Kommentaren en direktelenke førte til. */
  fremhev?: Fremheving | null
}) {
  const { meg } = useForfatterkontekst()
  const [traad, setTraad] = useState<Idetraad | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)
  /** Når idéen var sett før denne åpningen; `undefined` til den er hentet. */
  const [sistSett, setSistSett] = useState<string | null | undefined>(undefined)
  const tittel = useRef<HTMLHeadingElement>(null)

  const hent = useCallback(async () => {
    try {
      const funnet = await hentIdetraad(id)
      // På gruppesiden står bare gruppens egne idéer, så adressen ikke viser en annen idé under gruppens navn.
      const hentet = funnet && (gruppe === undefined || funnet.gruppe_id === gruppe) ? funnet : null
      if (!hentet) setFeil('Idéen finnes ikke lenger.')
      setTraad(hentet)
      return hentet
    } catch {
      setFeil('Fikk ikke hentet idéen.')
      return null
    }
  }, [id, gruppe])

  useEffect(() => {
    void hent().then((hentet) => {
      if (!hentet) return
      setSistSett((forrige) => (forrige === undefined ? hentet.sist_sett : forrige))
      void merkIdeSett(hentet).then(() => onSett?.(), () => undefined)
    })
    // `onSett` følger ikke med: idéen merkes sett én gang per henting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hent])

  // Fokus på overskriften når idéen er hentet, så skjermlesere leser hvor man er.
  const lastet = traad !== null
  useEffect(() => {
    if (lastet && !innebygd) tittel.current?.focus({ preventScroll: true })
  }, [lastet, innebygd])


  /** Kommentarene under idéen. Den som modererer idéen, kan slette alle (D8, og moderatorene i gruppen). */
  const moderererer = traad?.kan_moderere ?? false
  const kanal = useMemo<Kommentarkanal>(
    () => ({
      slag: 'ide',
      traad: id,
      opprett: (forelder, tekst) => opprettKommentar(id, forelder, tekst),
      endre: (kommentar, tekst) => endreKommentar(kommentar, tekst),
      slett: (kommentar) => slettKommentar(kommentar),
      sletterAndres: moderererer,
    }),
    [id, moderererer],
  )

  /**
   * Hjertet vises med én gang; lagringen går etter. Går den galt, hentes
   * tråden på nytt, så det som vises, er det som er lagret.
   */
  const veksleHjerte = (kommentar: Kommentar | null) => {
    if (!traad) return
    const gitt = !(kommentar ?? traad).mitt_hjerte
    const vend = <T extends { mitt_hjerte: boolean; hjerter: number }>(x: T): T => ({
      ...x,
      mitt_hjerte: gitt,
      hjerter: x.hjerter + (gitt ? 1 : -1),
    })
    setTraad(
      kommentar
        ? { ...traad, kommentarer: traad.kommentarer.map((k) => (k.id === kommentar.id ? vend(k) : k)) }
        : vend(traad),
    )
    settHjerte(traad.id, kommentar?.id ?? null, meg.id, gitt).catch(() => void hent())
  }

  /** En handling som endrer hvor idéen står. Feiler den, står idéen der den stod. */
  const utfor = async (handling: () => Promise<void>) => {
    if (arbeider) return
    setArbeider(true)
    setFeil(null)
    try {
      await handling()
    } catch (e) {
      setFeil((e as Error).message)
      await hent()
    } finally {
      setArbeider(false)
    }
  }

  if (!traad) {
    return feil ? (
      <p className="skjemafeil" role="alert">
        {feil}
      </p>
    ) : null
  }

  const slett = () =>
    void utfor(async () => {
      await slettIde(traad.id)
      onSlettet?.()
    })

  const tilstand = idetilstand(traad)
  const laast = tilstand !== 'apen'
  /** Tråden tar imot kommentarer og hjerter: når idéen er åpen, og under en gruppeoppgave. */
  const traadLaast = !traad.kan_kommentere
  const eier = traad.forfatter_id === meg.id
  const administrerer = traad.kan_behandle && !innebygd
  const gruppeide = traad.gruppe_id !== null
  const niva = innebygd ? 4 : overskriftsniva
  const Overskrift = `h${niva}` as 'h2' | 'h3' | 'h4'

  return (
    <article className="ideside" data-innebygd={innebygd || undefined} aria-labelledby={`ide-${traad.id}`}>
      <header className="ideside__hode">
        <p className="ideside__merker">
          <Kategorimerke kategori={traad.kategori} />
        </p>
        <Overskrift ref={tittel} id={`ide-${traad.id}`} className="ideside__tittel" tabIndex={-1}>
          {traad.tittel}
        </Overskrift>
        <p className="forfatterlinje">
          <Forfatterbilde id={traad.forfatter_id} storrelse="liten" kort />
          <Forfatternavn id={traad.forfatter_id} className="forfatterlinje__navn" />
          <span aria-hidden="true">·</span>
          <Tidspunkt iso={traad.opprettet_kl} endret={traad.endret_kl} />
        </p>
      </header>

      {tilstand === 'arkivert' && traad.arkivert_kl && (
        <div className="idemerknad" role="note">
          <Ikon navn="arkiv" storrelse="ui" />
          <p>
            <strong>Ikke aktuelt.</strong>{' '}
            {gruppeide
              ? 'Idéen står her til en ansvarlig i gruppen åpner den igjen eller sletter den.'
              : `Idéen slettes automatisk ${DATO.format(slettesKl(traad.arkivert_kl))}.`}
          </p>
          {administrerer && (
            <div className="idemerknad__handlinger">
              <Button
                variant="kant"
                icon={<Ikon navn="reset" storrelse="ui" />}
                disabled={arbeider}
                onClick={() =>
                  void utfor(async () => {
                    await gjenopprettIde(traad.id)
                    await hent()
                    onGjenapnet?.(traad)
                  })
                }
              >
                {gruppeide ? 'Åpne igjen' : 'Gjenopprett'}
              </Button>
              <Slettknapp hva="idéen for godt" onSlett={slett} />
            </div>
          )}
        </div>
      )}

      {tilstand === 'overfort' && traad.oppgave && !innebygd && (
        <div className="idemerknad" role="note">
          <Ikon navn="oppgaver" storrelse="ui" />
          <p>
            <strong>Overført til planlagte oppgaver.</strong> Tråden er frosset.
          </p>
          {onOppgave && (
            <div className="idemerknad__handlinger">
              <Button variant="kant" icon={<Ikon navn="chev" storrelse="ui" />} onClick={() => onOppgave(traad.oppgave!.id)}>
                Gå til oppgaven
              </Button>
            </div>
          )}
        </div>
      )}

      {tilstand === 'gruppeoppgave' && traad.gruppeoppgave && !innebygd && (
        <div className="idemerknad" role="note">
          <Ikon navn="oppgaver" storrelse="ui" />
          <p>
            <strong>Gjort om til en oppgave i gruppen.</strong> <Gruppeoppgavestatusmerke status={traad.gruppeoppgave.status} /> Idéen kan
            ikke endres lenger, men tråden er åpen for kommentarer.
          </p>
          {onGruppeoppgave && (
            <div className="idemerknad__handlinger">
              <Button variant="kant" icon={<Ikon navn="chev" storrelse="ui" />} onClick={() => onGruppeoppgave(traad.gruppeoppgave!.id)}>
                Gå til oppgaven
              </Button>
            </div>
          )}
        </div>
      )}

      {traad.tekst && (
        <UnderOverskrift niva={niva}>
          <Riktekst dokument={traad.tekst} />
        </UnderOverskrift>
      )}

      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}

      <div className="idehandlinger">
        <Hjerteknapp antall={traad.hjerter} gitt={traad.mitt_hjerte} onVeksle={() => veksleHjerte(null)} hva="idéen" laast={traadLaast} />
        {eier && !laast && onEndre && (
          <Idehandling ikon="edit" onClick={() => onEndre(traad)}>
            Rediger
          </Idehandling>
        )}
        {!laast && (eier || traad.kan_moderere) && !innebygd && <Slettknapp hva="idéen" onSlett={slett} />}
        <Kopilenkeknapp mal={{ slag: 'ide', id: traad.id, kommentar: null }} hva="idéen" />
      </div>

      {administrerer && !laast && (
        <div className="idevalgknapper" role="group" aria-label="Hva skjer med idéen">
          <Button
            variant="kant"
            icon={<Ikon navn="no" storrelse="ui" />}
            disabled={arbeider}
            onClick={() =>
              void utfor(async () => {
                await arkiverIde(traad.id)
                onArkivert?.(traad)
              })
            }
          >
            Ikke aktuelt
          </Button>
          {gruppeide ? (
            <Button
              variant="kant"
              icon={<Ikon navn="oppgaver" storrelse="ui" />}
              disabled={arbeider}
              onClick={() =>
                void utfor(async () => {
                  const oppgave = await gjorOmTilGruppeoppgave(traad.id)
                  await hent()
                  onGjortOm?.(traad, oppgave)
                })
              }
            >
              Gjør om til oppgave
            </Button>
          ) : (
            <Button
              variant="kant"
              icon={<Ikon navn="yes" storrelse="ui" />}
              disabled={arbeider}
              onClick={() =>
                void utfor(async () => {
                  onOverfort?.(traad, await overforIde(traad.id))
                })
              }
            >
              Overfør til planlagte oppgaver
            </Button>
          )}
        </div>
      )}

      <Kommentartraad
        kanal={kanal}
        kommentarer={traad.kommentarer}
        sistSett={sistSett ?? null}
        onEndret={hent}
        onHjerte={veksleHjerte}
        laast={traadLaast}
        fremhev={fremhev}
      />
    </article>
  )
}
