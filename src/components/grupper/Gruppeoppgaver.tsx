import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type MutableRefObject } from 'react'
import { Felt } from '../konto/Felt'
import { visningsnavn, type Profilkort } from '@delt/profil'
import { hentProfilkort } from '../../auth/api'
import { useProfil } from '../../auth/okt'
import { gruppeadresse } from '../../domain/rute'
import { useNavigasjonsvakt } from '../../hooks/navigasjonsvakt'
import { erstattAdressen } from '../../hooks/useRute'
import { tomtDokument, type Riktekstdokument } from '../../faginnhold/riktekst'
import {
  endreGruppeoppgave,
  fjernGruppeoppgave,
  hentGruppeoppgave,
  hentGruppeoppgaver,
  merkGruppeoppgaveSett,
  opprettGruppeoppgave,
  settGruppeoppgavestatus,
  tildelGruppeoppgave,
  type Gruppeoppgaveinnhold,
} from '../../grupper/api'
import type { Gruppeoversikt } from '../../grupper/modell'
import {
  GRUPPEOPPGAVESTATUSER,
  GRUPPEOPPGAVESTATUSNAVN,
  GRUPPEOPPGAVETITTEL_MEST,
  INGEN_GRUPPEOPPGAVER,
  PRIORITETER,
  PRIORITETSNAVN,
  mineGruppeoppgaver,
  type Gruppeoppgave,
  type Gruppeoppgaveliste,
  type Prioritet,
} from '../../grupper/oppgaver'
import { useBevart } from '../../oppdatering/Bevaring'
import { tekstTilLagring } from '../../traad/modell'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Merke, type Merketone } from '../Merke'
import { Skuff, veksleSkuff } from '../Skuff'
import { Bekreftelseskort } from '../konto/Bekreftelseskort'
import { Gruppeoppgavestatusmerke } from '../ideer/Merker'
import { Ideside } from '../ideer/Ideside'
import { useForlatvakt, useMeldVakt, type Forlat, type Skjemastatus } from '../ideer/useForlatvakt'
import { Forlatvarsel } from '../stoffside/Skjemaer'
import { Riktekst } from '../stoffside/Riktekst'
import { Rikteksteditor } from '../stoffside/Rikteksteditor'
import { Forfatterbilde, Forfatterkilde, useForfatternavn } from '../traad/Forfatterkontekst'
import { Tidspunkt, Valgrad } from '../traad/Smadeler'
import '../../styles/ideer.css'

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const melding = (aarsak: unknown) => (aarsak instanceof Error ? aarsak.message : UVENTET)

const PRIORITETSTONE: Readonly<Record<Prioritet, Merketone>> = { hoy: 'alvorlig', normal: 'noytral', lav: 'flate' }

/** Valget for ingen i lista over hvem som har oppgaven. */
const INGEN = ''

const SKUFF_FULLFORT = 'fullfort'

/** Skjemaet på fanen: en ny oppgave, eller oppgaven som endres. */
type Skjema = { oppgave?: Gruppeoppgave } | null

/**
 * Oppgavene i gruppen, i arbeidsflaten (`#/grupper/<ID>/oppgaver`): lista
 * til venstre og oppgaven som står åpen (`…/oppgaver/<oppgave-ID>`), eller
 * skjemaet, til høyre; på en smal skjerm det ene om gangen. Oppgavene den
 * innloggede har, står øverst; så de som pågår og de som ikke er påbegynt,
 * etter prioriteten, og de fullførte i en skuff. Å velge en oppgave bytter
 * adressen uten en ny oppføring i historikken.
 *
 * De ansvarlige oppretter, endrer, tildeler og fjerner oppgavene; den som har
 * en oppgave, setter statusen på den. Oppgavene her har ingenting med
 * Planlagte oppgaver å gjøre (docs/fagmiljoer.md, «Idéer og oppgaver i
 * gruppene»).
 */
export function Gruppeoppgaver({
  gruppe,
  oppgave,
  onEndret,
  skjemavakt,
}: {
  gruppe: Gruppeoversikt
  oppgave?: string
  onEndret: () => void
  /** Flatens vakt: lukkingen og det som kommer utenfra spør før et skjema med endringer forlates. */
  skjemavakt?: MutableRefObject<Forlat | null>
}) {
  const meg = useProfil()
  const [liste, setListe] = useState<Gruppeoppgaveliste>(INGEN_GRUPPEOPPGAVER)
  const [lastet, setLastet] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const [profiler, setProfiler] = useState<Profilkort[]>([])
  const [skjema, setSkjema] = useBevart<Skjema>('oppgaver/skjema', null)
  const [apneSkuffer, setApneSkuffer] = useState<ReadonlySet<string>>(new Set())
  /** Ny for hver endring, så lista hentes på nytt. */
  const [utgave, setUtgave] = useState(0)
  const vakt = useForlatvakt()
  useMeldVakt(skjema !== null, vakt.forlat, skjemavakt)
  useNavigasjonsvakt(vakt.status, vakt.forlat)
  /** Om flaten står, så en lagring som blir ferdig etter at man har gått, ikke drar en tilbake. */
  const montert = useRef(true)
  useEffect(() => {
    montert.current = true
    return () => {
      montert.current = false
    }
  }, [])
  const rot = useRef<HTMLDivElement>(null)
  /** Kortet man gikk inn på, så tilbake til lista lander der. */
  const fra = useRef<string | null>(null)

  const hent = useCallback(async () => {
    try {
      setListe(await hentGruppeoppgaver(gruppe.id))
      setFeil(null)
    } catch {
      setFeil('Fikk ikke hentet oppgavene i gruppen.')
    } finally {
      setLastet(true)
    }
  }, [gruppe.id])

  useEffect(() => {
    void hentProfilkort().then(setProfiler, () => undefined)
  }, [])

  const paaLista = !oppgave && !skjema
  useEffect(() => {
    if (!skjema) void hent()
  }, [oppgave, skjema, utgave, hent])
  const endret = () => {
    onEndret()
    setUtgave((n) => n + 1)
  }

  // Tilbake på lista står fokus på kortet man kom fra.
  useLayoutEffect(() => {
    if (!paaLista || !lastet || !fra.current) return
    const kort = [...(rot.current?.querySelectorAll<HTMLElement>('[data-oppgave]') ?? [])].find((el) => el.dataset.oppgave === fra.current)
    kort?.focus()
    fra.current = null
  }, [paaLista, lastet, liste])

  /** Lukker skjemaet, og spør først når det har endringer. */
  const lukkSkjema = (deretter: () => void = () => undefined) =>
    vakt.forlat(() => {
      vakt.nullstill()
      setSkjema(null)
      deretter()
    })
  /** Til en annen oppgave eller lista, i samme oppføring i historikken. */
  const tilAdressen = (id?: string) => erstattAdressen(gruppeadresse(gruppe.id, 'oppgaver', id))
  const tilListe = () => lukkSkjema(() => tilAdressen())
  const apne = (id: string) =>
    lukkSkjema(() => {
      fra.current = id
      tilAdressen(id)
    })
  const nyOppgave = () =>
    lukkSkjema(() => {
      if (oppgave) tilAdressen()
      setSkjema({})
    })

  let detalj
  if (skjema) {
    detalj = (
      <Oppgaveskjema
        gruppe={gruppe}
        oppgave={skjema.oppgave}
        onStatus={vakt.setStatus}
        forlater={vakt.forlater}
        onForkast={vakt.forkast}
        onFortsett={vakt.fortsett}
        onAvbryt={() => (skjema.oppgave ? lukkSkjema() : tilListe())}
        onLagret={(id) => {
          vakt.nullstill()
          setSkjema(null)
          endret()
          if (montert.current) tilAdressen(id)
        }}
      />
    )
  } else if (oppgave) {
    detalj = (
      <Oppgavevisning
        key={oppgave}
        id={oppgave}
        gruppe={gruppe}
        onEndre={(o) => setSkjema({ oppgave: o })}
        onEndret={endret}
        onFjernet={() => {
          endret()
          tilListe()
        }}
      />
    )
  } else {
    detalj = liste.oppgaver.length > 0 && <p className="arbeidsflate__tomt">Velg en oppgave i lista.</p>
  }

  const mine = mineGruppeoppgaver(liste.oppgaver, meg.id)
  const andre = liste.oppgaver.filter((o) => !mine.includes(o) && o.status !== 'fullfort')
  const fullforte = liste.oppgaver.filter((o) => o.status === 'fullfort')
  const listedel = (
    <>
      {liste.kan_opprette && (
        <div className="gruppeideer__verktoy">
          <span />
          <Button className="knapp--kompakt" icon={<Ikon navn="plus" />} onClick={nyOppgave}>
            Ny oppgave
          </Button>
        </div>
      )}
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      {mine.length > 0 && <Oppgaveseksjon tittel="Mine oppgaver" oppgaver={mine} valgt={oppgave} onApne={apne} />}
      <Oppgaveseksjon
        tittel={mine.length > 0 ? 'De andre oppgavene' : 'Oppgavene'}
        oppgaver={andre}
        valgt={oppgave}
        tom={!lastet ? 'Henter oppgavene …' : 'Ingen oppgaver som ikke er fullført.'}
        onApne={apne}
      />
      {fullforte.length > 0 && (
        <Skuff
          tittel="Fullført"
          ikon="done"
          antall={fullforte.length}
          forklaring="Oppgavene som er fullført, de sist fullførte først."
          apen={apneSkuffer.has(SKUFF_FULLFORT)}
          onVeksle={() => setApneSkuffer((s) => veksleSkuff(s, SKUFF_FULLFORT))}
        >
          <Oppgavekortliste oppgaver={fullforte} valgt={oppgave} onApne={apne} />
        </Skuff>
      )}
    </>
  )

  return (
    <Forfatterkilde profiler={profiler}>
      <div ref={rot} className="arbeidsflate gruppeideer idevindu" data-detalj={paaLista ? undefined : 'ja'}>
        <div className="arbeidsflate__liste">{listedel}</div>
        <div className="arbeidsflate__detalj">
          {!paaLista && (
            <p className="arbeidsflate__tilbake">
              <Button variant="subtle" className="knapp--kompakt" icon={<Ikon navn="back" />} onClick={tilListe}>
                Tilbake til oppgavene
              </Button>
            </p>
          )}
          {detalj}
        </div>
      </div>
    </Forfatterkilde>
  )
}

function Oppgaveseksjon({
  tittel,
  oppgaver,
  tom,
  valgt,
  onApne,
}: {
  tittel: string
  oppgaver: Gruppeoppgave[]
  tom?: string
  valgt?: string
  onApne: (id: string) => void
}) {
  const id = useId()
  return (
    <section className="idegruppe" aria-labelledby={id}>
      <h2 id={id} className="idegruppe__navn">
        <span>{tittel}</span>
        <span className="idegruppe__antall">{oppgaver.length}</span>
      </h2>
      {oppgaver.length > 0 ? <Oppgavekortliste oppgaver={oppgaver} valgt={valgt} onApne={onApne} /> : tom && <p className="brukerliste__tomt">{tom}</p>}
    </section>
  )
}

function Oppgavekortliste({ oppgaver, valgt, onApne }: { oppgaver: Gruppeoppgave[]; valgt?: string; onApne: (id: string) => void }) {
  return (
    <ul className="idekortliste">
      {oppgaver.map((o) => (
        <li key={o.id}>
          <Oppgavekort oppgave={o} valgt={o.id === valgt} onApne={() => onApne(o.id)} />
        </li>
      ))}
    </ul>
  )
}

/** Hvem som har oppgaven, med navnet, eller at ingen har den. */
function Ansvarlig({ oppgave }: { oppgave: Gruppeoppgave }) {
  const navn = useForfatternavn(oppgave.ansvarlig_id)
  if (!oppgave.ansvarlig_id) return <span className="idekort__navn">Ingen har oppgaven</span>
  return (
    <>
      <Forfatterbilde id={oppgave.ansvarlig_id} storrelse="mini" />
      <span className="idekort__navn">
        {navn}
        {!oppgave.ansvarlig_har_tilgang && ' (ikke lenger med)'}
      </span>
    </>
  )
}

/** Et kort i lista. Hele kortet er knappen som åpner oppgaven. */
function Oppgavekort({ oppgave, valgt, onApne }: { oppgave: Gruppeoppgave; valgt: boolean; onApne: () => void }) {
  return (
    <button type="button" className="idekort" data-oppgave={oppgave.id} data-ih="" aria-current={valgt || undefined} onClick={onApne}>
      <span className="idekort__tittel">{oppgave.tittel}</span>
      <span className="idekort__meta">
        <Ansvarlig oppgave={oppgave} />
        <span aria-hidden="true">·</span>
        <Gruppeoppgavestatusmerke status={oppgave.status} />
        {oppgave.prioritet !== 'normal' && <Merke tone={PRIORITETSTONE[oppgave.prioritet]}>{PRIORITETSNAVN[oppgave.prioritet]} prioritet</Merke>}
        {oppgave.ide && <span className="idekort__fra">Fra en idé</span>}
      </span>
      <span className="idekort__pil" aria-hidden="true">
        <Ikon navn="chev" />
      </span>
    </button>
  )
}

/**
 * Én oppgave: overskriften, hvem som har den, statusen og prioriteten,
 * opphavet og beskrivelsen, og idéen den kom fra med tråden under. Å åpne
 * oppgaven merker varslene om den lest.
 */
function Oppgavevisning({
  id,
  gruppe,
  onEndre,
  onEndret,
  onFjernet,
}: {
  id: string
  gruppe: Gruppeoversikt
  onEndre: (oppgave: Gruppeoppgave) => void
  onEndret: () => void
  onFjernet: () => void
}) {
  const [oppgave, setOppgave] = useState<Gruppeoppgave | null>(null)
  const [lesefeil, setLesefeil] = useState<string | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)
  const [fjerner, setFjerner] = useState(false)
  const tildelId = useId()
  const overskrift = useRef<HTMLHeadingElement>(null)
  const opphav = useForfatternavn(oppgave?.opprettet_av ?? null)
  const forslag = useForfatternavn(oppgave?.foreslatt_av ?? null)

  const hent = useCallback(async () => {
    try {
      const funnet = await hentGruppeoppgave(id)
      // Bare gruppens egne oppgaver, så adressen ikke viser en annen oppgave under gruppens navn.
      const hentet = funnet?.gruppe_id === gruppe.id ? funnet : null
      setOppgave(hentet)
      setLesefeil(hentet ? null : 'Oppgaven finnes ikke lenger, eller du har ikke tilgang til den.')
      return hentet
    } catch {
      setLesefeil('Fikk ikke hentet oppgaven.')
      return null
    }
  }, [id, gruppe.id])

  // Varslene om oppgaven fram til den ble lest, merkes lest.
  useEffect(() => {
    void hent().then((hentet) => {
      if (hentet?.lest_kl) void merkGruppeoppgaveSett(hentet.id, hentet.lest_kl).catch(() => undefined)
    })
  }, [hent])

  // Fokus på overskriften når oppgaven er hentet, så skjermlesere leser hvor man er.
  const lastet = oppgave !== null
  useEffect(() => {
    if (lastet) overskrift.current?.focus({ preventScroll: true })
  }, [lastet])

  const utfor = async (handling: () => Promise<void>) => {
    if (arbeider) return
    setArbeider(true)
    setFeil(null)
    try {
      await handling()
      onEndret()
    } catch (aarsak) {
      setFeil(melding(aarsak))
    } finally {
      await hent()
      setArbeider(false)
    }
  }

  if (!oppgave) {
    return (
      <p className={lesefeil ? 'skjemafeil' : 'gruppeside__hint'} role={lesefeil ? 'alert' : undefined}>
        {lesefeil ?? 'Henter oppgaven …'}
      </p>
    )
  }

  const tildelbare = gruppe.medlemmer.filter((m) => m.status === 'aktiv' && m.har_tilgang)
  const tittelId = `gruppeoppgave-${oppgave.id}`

  return (
    <article className="ideside gruppeoppgave" aria-labelledby={tittelId}>
      <header className="ideside__hode">
        <p className="ideside__merker">
          <Gruppeoppgavestatusmerke status={oppgave.status} />
          <Merke tone={PRIORITETSTONE[oppgave.prioritet]}>{PRIORITETSNAVN[oppgave.prioritet]} prioritet</Merke>
        </p>
        <h2 id={tittelId} ref={overskrift} tabIndex={-1} className="ideside__tittel">
          {oppgave.tittel}
        </h2>
        <p className="forfatterlinje">
          <Ansvarlig oppgave={oppgave} />
        </p>
        <p className="gruppeoppgave__opphav">
          {oppgave.ide ? (
            <>
              Fra idéen <a href={gruppeadresse(gruppe.id, 'ideer', oppgave.ide.id)}>«{oppgave.ide.tittel}»</a>
              {oppgave.foreslatt_av && <> av {forslag}</>}, gjort om av {oppgave.opprettet_av ? opphav : 'en slettet bruker'}{' '}
            </>
          ) : (
            <>Opprettet av {oppgave.opprettet_av ? opphav : 'en slettet bruker'} </>
          )}
          <Tidspunkt iso={oppgave.opprettet_kl} endret={oppgave.endret_kl} />
          {oppgave.fullfort_kl && (
            <>
              {' '}
              · Fullført <Tidspunkt iso={oppgave.fullfort_kl} />
            </>
          )}
        </p>
      </header>

      {oppgave.beskrivelse && <Riktekst dokument={oppgave.beskrivelse} />}

      {oppgave.ansvarlig_id && !oppgave.ansvarlig_har_tilgang && (
        <div className="idemerknad" role="note">
          <Ikon navn="user" storrelse="ui" />
          <p>Den som har oppgaven, er ikke lenger med i gruppen.{oppgave.kan_endre && ' Gi den til en annen, eller til ingen.'}</p>
        </div>
      )}

      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}

      {oppgave.kan_sette_status && (
        <Valgrad
          navn="Status"
          valg={GRUPPEOPPGAVESTATUSER}
          valgt={oppgave.status}
          etiketter={GRUPPEOPPGAVESTATUSNAVN}
          onVelg={(status) => status !== oppgave.status && void utfor(() => settGruppeoppgavestatus(oppgave.id, status))}
        />
      )}

      {oppgave.kan_endre && (
        <div className="gruppeoppgave__styring">
          <div className="felt">
            <label className="felt__merkelapp" htmlFor={tildelId}>
              Hvem har oppgaven
            </label>
            <select
              id={tildelId}
              className="felt__inndata"
              value={oppgave.ansvarlig_id ?? INGEN}
              disabled={arbeider}
              onChange={(e) => void utfor(() => tildelGruppeoppgave(oppgave.id, e.target.value || null))}
            >
              <option value={INGEN}>Ingen</option>
              {oppgave.ansvarlig_id && !tildelbare.some((m) => m.id === oppgave.ansvarlig_id) && (
                <option value={oppgave.ansvarlig_id} disabled>
                  Ikke lenger med i gruppen
                </option>
              )}
              {tildelbare.map((m) => (
                <option key={m.id} value={m.id}>
                  {visningsnavn(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="idehandlinger">
            <Button variant="kant" icon={<Ikon navn="edit" />} disabled={arbeider} onClick={() => onEndre(oppgave)}>
              Endre
            </Button>
            <Button variant="kant" icon={<Ikon navn="trash" />} disabled={arbeider} onClick={() => setFjerner(true)}>
              Fjern oppgaven
            </Button>
          </div>
        </div>
      )}

      {fjerner && (
        <Bekreftelseskort
          tittel={`Fjerne «${oppgave.tittel}»?`}
          bekreft="Fjern oppgaven"
          opptatt={arbeider}
          onBekreft={() =>
            void (async () => {
              setArbeider(true)
              try {
                await fjernGruppeoppgave(oppgave.id)
                onFjernet()
              } catch (aarsak) {
                setFeil(melding(aarsak))
                setArbeider(false)
                setFjerner(false)
              }
            })()
          }
          onAvbryt={() => setFjerner(false)}
        >
          {oppgave.ide
            ? 'Idéen oppgaven kom fra, står åpen i idéene igjen, med kommentarene.'
            : 'Oppgaven slettes. Det kan ikke angres.'}
        </Bekreftelseskort>
      )}

      {oppgave.ide && (
        <section className="oppgaveside__ide" aria-labelledby={`${tittelId}-ide`}>
          <h3 id={`${tittelId}-ide`} className="idetraad__tittel">
            Idéen oppgaven kom fra
          </h3>
          <Ideside id={oppgave.ide.id} innebygd />
        </section>
      )}
    </article>
  )
}

/** Skjemaet for en ny oppgave, eller for å endre en: overskrift, beskrivelse, prioritet og, for en ny, hvem som har den. */
function Oppgaveskjema({
  gruppe,
  oppgave,
  onStatus,
  forlater,
  onForkast,
  onFortsett,
  onAvbryt,
  onLagret,
}: {
  gruppe: Gruppeoversikt
  oppgave?: Gruppeoppgave
  /** Om skjemaet har endringer som ikke er lagret, eller lagrer, for vakten. */
  onStatus: (status: Skjemastatus) => void
  /** Brukeren er på vei ut med endringer, og skal velge. */
  forlater: boolean
  onForkast: () => void
  onFortsett: () => void
  onAvbryt: () => void
  onLagret: (id: string) => void
}) {
  const skjema = `oppgaveskjema:${oppgave?.id ?? 'ny'}`
  const [tittel, setTittel] = useBevart(`${skjema}/tittel`, oppgave?.tittel ?? '')
  const [tekst, setTekst] = useBevart<Riktekstdokument>(`${skjema}/tekst`, () => oppgave?.beskrivelse ?? tomtDokument())
  const [prioritet, setPrioritet] = useBevart<Prioritet>(`${skjema}/prioritet`, oppgave?.prioritet ?? 'normal')
  const [ansvarlig, setAnsvarlig] = useBevart(`${skjema}/ansvarlig`, INGEN)
  const [feil, setFeil] = useState<string | null>(null)
  const [lagrer, setLagrer] = useState(false)
  const ansvarligId = useId()
  const tildelbare = gruppe.medlemmer.filter((m) => m.status === 'aktiv' && m.har_tilgang)

  // Det skjemaet ville lagret, slik det var da det åpnet, og nå. Utgangspunktet
  // tas vare på sammen med det som er skrevet, som i idéskjemaet.
  const signatur = JSON.stringify([tittel.trim(), tekstTilLagring(tekst), prioritet, ansvarlig])
  const [start] = useBevart(`${skjema}/utgangspunkt`, signatur)
  const status: Skjemastatus = lagrer ? 'lagrer' : signatur !== start ? 'ulagret' : 'uendret'
  useEffect(() => onStatus(status), [status, onStatus])

  const lagre = async (event: FormEvent) => {
    event.preventDefault()
    const ren = tittel.trim()
    if (!ren) return setFeil('Skriv en overskrift.')
    setFeil(null)
    setLagrer(true)
    const innhold: Gruppeoppgaveinnhold = { tittel: ren, beskrivelse: tekstTilLagring(tekst), prioritet }
    try {
      if (oppgave) {
        await endreGruppeoppgave(oppgave.id, innhold)
        onLagret(oppgave.id)
      } else {
        onLagret(await opprettGruppeoppgave(gruppe.id, innhold, ansvarlig || null))
      }
    } catch (aarsak) {
      setFeil(melding(aarsak))
      setLagrer(false)
    }
  }

  return (
    <form className="ideskjema skriveflate" onSubmit={(e) => void lagre(e)} noValidate aria-label={oppgave ? 'Endre oppgaven' : 'Ny oppgave'}>
      <Felt merkelapp="Overskrift" value={tittel} maxLength={GRUPPEOPPGAVETITTEL_MEST} autoFocus onChange={(e) => setTittel(e.target.value)} />
      <div className="felt">
        <span className="felt__merkelapp">Beskrivelse</span>
        <Rikteksteditor dokument={tekst} onEndre={setTekst} etikett="Beskrivelse" referanser={false} direktelenker />
      </div>
      <Valgrad navn="Prioritet" valg={PRIORITETER} valgt={prioritet} etiketter={PRIORITETSNAVN} onVelg={setPrioritet} />
      {!oppgave && (
        <div className="felt">
          <label className="felt__merkelapp" htmlFor={ansvarligId}>
            Hvem har oppgaven
          </label>
          <select id={ansvarligId} className="felt__inndata" value={ansvarlig} onChange={(e) => setAnsvarlig(e.target.value)}>
            <option value={INGEN}>Ingen ennå</option>
            {tildelbare.map((m) => (
              <option key={m.id} value={m.id}>
                {visningsnavn(m)}
              </option>
            ))}
          </select>
        </div>
      )}
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      {forlater ? (
        <Forlatvarsel onForkast={onForkast} onFortsett={onFortsett} />
      ) : (
        <div className="skjema__knapper ideskjema__knapper">
          <Button variant="subtle" onClick={onAvbryt} disabled={lagrer}>
            Avbryt
          </Button>
          <Button type="submit" className="knapp--kompakt" disabled={lagrer}>
            {lagrer ? 'Lagrer …' : oppgave ? 'Lagre' : 'Opprett oppgaven'}
          </Button>
        </div>
      )}
    </form>
  )
}
