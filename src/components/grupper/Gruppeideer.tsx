import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { Profilkort } from '@delt/profil'
import { hentProfilkort } from '../../auth/api'
import { gruppeadresse } from '../../domain/rute'
import { useNavigasjonsvakt } from '../../hooks/navigasjonsvakt'
import { erstattAdressen } from '../../hooks/useRute'
import type { Gruppeoversikt } from '../../grupper/modell'
import { hentGruppeideer } from '../../ideer/api'
import { idetilstand, INGEN_GRUPPEIDEER, type Gruppeideer as Gruppeideliste, type Ide, type Idetraad } from '../../ideer/modell'
import { useBevart } from '../../oppdatering/Bevaring'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Idekort, Nyknapp } from '../ideer/Ideliste'
import { Ideside } from '../ideer/Ideside'
import { Ideskjema } from '../ideer/Ideskjema'
import { useForlatvakt, useMeldVakt, type Forlat } from '../ideer/useForlatvakt'
import { Skuff, veksleSkuff } from '../Skuff'
import { Forfatterkilde } from '../traad/Forfatterkontekst'
import type { Fremheving } from '../traad/Kommentartraad'
import { lyttEtterGruppeide, taGruppekommentar } from './gruppevisning'
import '../../styles/ideer.css'

/** Skuffene under de åpne idéene, etter navnet siden husker dem under. */
const SKUFF_GJORT_OM = 'gjort-om'
const SKUFF_IKKE_AKTUELT = 'ikke-aktuelt'

/** Skjemaet på fanen: en ny idé, eller idéen som endres. */
type Skjema = { ide?: Idetraad } | null

/** Idéene som passer med søket: overskriften, etter hvert ord. */
export function sokIGruppeideer(ideer: readonly Ide[], sok: string): Ide[] {
  const ord = sok.toLocaleLowerCase('nb').split(/\s+/).filter(Boolean)
  if (ord.length === 0) return [...ideer]
  return ideer.filter((ide) => {
    const tittel = ide.tittel.toLocaleLowerCase('nb')
    return ord.every((o) => tittel.includes(o))
  })
}

/** De åpne idéene: de nye først, så de nyeste. */
function etterNytt(a: Ide, b: Ide): number {
  return Number(a.sett) - Number(b.sett) || Date.parse(b.opprettet_kl) - Date.parse(a.opprettet_kl)
}

/**
 * Idéene i gruppen, i arbeidsflaten (`#/grupper/<ID>/ideer`): lista til
 * venstre og idéen som står åpen (`…/ideer/<idé-ID>`), eller skjemaet, til
 * høyre; på en smal skjerm det ene om gangen. De åpne idéene står øverst, de
 * nye først; de som er gjort om til oppgaver og de som ikke er aktuelle,
 * står i hver sin skuff. Å velge en idé bytter adressen uten en ny oppføring
 * i historikken, så flaten lukkes i ett steg.
 *
 * Alle som er med, kan skrive idéer og kommentere; de ansvarlige behandler
 * dem. Knappene følger det databasen svarer, og databasen kontrollerer hver
 * handling på nytt (docs/fagmiljoer.md, «Idéer og oppgaver i gruppene»).
 */
export function Gruppeideer({
  gruppe,
  ide,
  onEndret,
  onGruppeoppgave,
  skjemavakt,
}: {
  gruppe: Gruppeoversikt
  /** Idéen som står åpen. */
  ide?: string
  /** Noe er endret som tallene på fanene teller. */
  onEndret: () => void
  /** Til oppgaven en idé er gjort om til. */
  onGruppeoppgave?: (oppgave: string) => void
  /** Flatens vakt: lukkingen og det som kommer utenfra spør før et skjema med endringer forlates. */
  skjemavakt?: MutableRefObject<Forlat | null>
}) {
  const [liste, setListe] = useState<Gruppeideliste>(INGEN_GRUPPEIDEER)
  const [lastet, setLastet] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const [profiler, setProfiler] = useState<Profilkort[]>([])
  const [skjema, setSkjema] = useBevart<Skjema>('ideer/skjema', null)
  const [sok, setSok] = useBevart('ideer/sok', '')
  const [apneSkuffer, setApneSkuffer] = useState<ReadonlySet<string>>(new Set())
  /** Ny for hver behandling, så idéen hentes på nytt. */
  const [utgave, setUtgave] = useState(0)
  /** Kommentaren en direktelenke førte til. */
  const [fremhev, setFremhev] = useState<Fremheving | null>(null)
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
  const sokId = useId()

  const hent = useCallback(async () => {
    try {
      setListe(await hentGruppeideer(gruppe.id))
      setFeil(null)
    } catch {
      setFeil('Fikk ikke hentet idéene i gruppen.')
    } finally {
      setLastet(true)
    }
  }, [gruppe.id])

  useEffect(() => {
    void hentProfilkort().then(setProfiler, () => undefined)
  }, [])

  // En lenke til en kommentar under idéen: den vises når idéen står, også når
  // idéen alt stod åpen.
  useEffect(() => {
    if (!ide) return
    const vis = () => {
      const kommentar = taGruppekommentar(ide)
      if (kommentar) setFremhev({ kommentar, nr: Date.now() })
    }
    vis()
    return lyttEtterGruppeide(vis)
  }, [ide])

  // Lista hentes på nytt når en annen idé åpnes, eller den står alene igjen,
  // så det nye og behandlingene stemmer.
  const paaLista = !ide && !skjema
  useEffect(() => {
    if (!skjema) void hent()
  }, [ide, skjema, utgave, hent])

  // Tilbake på lista står fokus på kortet man kom fra.
  useLayoutEffect(() => {
    if (!paaLista || !lastet || !fra.current) return
    const kort = [...(rot.current?.querySelectorAll<HTMLElement>('[data-ide]') ?? [])].find((el) => el.dataset.ide === fra.current)
    kort?.focus()
    fra.current = null
  }, [paaLista, lastet, liste])

  /** Til en annen idé eller lista, i samme oppføring i historikken. */
  const tilAdressen = (id?: string) => erstattAdressen(gruppeadresse(gruppe.id, 'ideer', id))
  const lukkSkjemaet = (deretter: () => void) =>
    vakt.forlat(() => {
      vakt.nullstill()
      setSkjema(null)
      deretter()
    })
  const tilListe = () => lukkSkjemaet(() => tilAdressen())

  const apne = (id: string) =>
    lukkSkjemaet(() => {
      fra.current = id
      tilAdressen(id)
    })

  const endret = () => {
    onEndret()
    setUtgave((n) => n + 1)
  }

  const { apne: apneIdeer, gjortOm, ikkeAktuelle } = useMemo(() => {
    const treff = sokIGruppeideer(liste.ideer, sok)
    const etter = (tilstand: ReturnType<typeof idetilstand>) => treff.filter((i) => idetilstand(i) === tilstand)
    return {
      apne: etter('apen').sort(etterNytt),
      gjortOm: etter('gruppeoppgave'),
      ikkeAktuelle: etter('arkivert').sort((a, b) => Date.parse(b.arkivert_kl!) - Date.parse(a.arkivert_kl!)),
    }
  }, [liste.ideer, sok])

  let detalj
  if (skjema) {
    detalj = (
      <Ideskjema
        ide={skjema.ide}
        gruppe={skjema.ide ? undefined : gruppe.id}
        onStatus={vakt.setStatus}
        forlater={vakt.forlater}
        onForkast={vakt.forkast}
        onFortsett={vakt.fortsett}
        onAvbryt={() => (skjema.ide ? lukkSkjemaet(() => undefined) : tilListe())}
        onLagret={(id) => {
          vakt.nullstill()
          setSkjema(null)
          onEndret()
          setUtgave((n) => n + 1)
          if (montert.current) tilAdressen(id)
        }}
      />
    )
  } else if (ide) {
    detalj = (
      <Ideside
        key={`${ide}:${utgave}`}
        id={ide}
        gruppe={gruppe.id}
        overskriftsniva={2}
        fremhev={fremhev}
        onEndre={(traad) => setSkjema({ ide: traad })}
        onSlettet={() => {
          onEndret()
          tilAdressen()
        }}
        onArkivert={endret}
        onGjenapnet={endret}
        onGjortOm={endret}
        onSett={onEndret}
        onGruppeoppgave={onGruppeoppgave}
      />
    )
  } else {
    detalj = liste.ideer.length > 0 && <p className="arbeidsflate__tomt">Velg en idé i lista.</p>
  }

  const nyIde = () => lukkSkjemaet(() => {
    if (ide) tilAdressen()
    setSkjema({})
  })

  const listedel = (
    <>
      <div className="gruppeideer__verktoy">
        <div className="felt gruppeideer__sok">
          <label className="felt__merkelapp" htmlFor={sokId}>
            Søk i idéene
          </label>
          <input
            id={sokId}
            className="felt__inndata"
            type="search"
            value={sok}
            autoComplete="off"
            onChange={(e) => setSok(e.target.value)}
          />
        </div>
        {liste.kan_skrive && (
          <Button className="knapp--kompakt" icon={<Ikon navn="plus" />} onClick={nyIde}>
            Ny idé
          </Button>
        )}
      </div>
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      <Ideseksjon
        tittel={liste.kan_behandle ? 'Venter på behandling' : 'Åpne idéer'}
        ideer={apneIdeer}
        valgt={ide}
        tom={
          !lastet
            ? 'Henter idéene …'
            : sok.trim()
              ? 'Ingen åpne idéer passer med søket.'
              : liste.kan_skrive
                ? 'Ingen åpne idéer ennå. Skriv den første!'
                : 'Ingen åpne idéer.'
        }
        onApne={apne}
      />
      {liste.kan_skrive && apneIdeer.length === 0 && lastet && !sok.trim() && !skjema && <Nyknapp onNy={nyIde} />}
      {gjortOm.length > 0 && (
        <Skuff
          tittel="Gjort om til oppgaver"
          ikon="oppgaver"
          antall={gjortOm.length}
          forklaring="Idéene de ansvarlige har gjort om til oppgaver i gruppen. Tråden under dem er fortsatt åpen."
          apen={apneSkuffer.has(SKUFF_GJORT_OM)}
          onVeksle={() => setApneSkuffer((s) => veksleSkuff(s, SKUFF_GJORT_OM))}
        >
          <Kortliste ideer={gjortOm} valgt={ide} onApne={apne} />
        </Skuff>
      )}
      {ikkeAktuelle.length > 0 && (
        <Skuff
          tittel="Ikke aktuelt"
          ikon="arkiv"
          antall={ikkeAktuelle.length}
          forklaring="Idéene de ansvarlige har merket «Ikke aktuelt». De står her til de åpnes igjen eller slettes."
          apen={apneSkuffer.has(SKUFF_IKKE_AKTUELT)}
          onVeksle={() => setApneSkuffer((s) => veksleSkuff(s, SKUFF_IKKE_AKTUELT))}
        >
          <Kortliste ideer={ikkeAktuelle} valgt={ide} onApne={apne} />
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
                Tilbake til idéene
              </Button>
            </p>
          )}
          {detalj}
        </div>
      </div>
    </Forfatterkilde>
  )
}

function Ideseksjon({
  tittel,
  ideer,
  tom,
  valgt,
  onApne,
}: {
  tittel: string
  ideer: Ide[]
  tom: string
  valgt?: string
  onApne: (id: string) => void
}) {
  const id = useId()
  return (
    <section className="idegruppe" aria-labelledby={id}>
      <h2 id={id} className="idegruppe__navn">
        <span>{tittel}</span>
        <span className="idegruppe__antall">{ideer.length}</span>
      </h2>
      {ideer.length > 0 ? <Kortliste ideer={ideer} valgt={valgt} onApne={onApne} /> : <p className="brukerliste__tomt">{tom}</p>}
    </section>
  )
}

function Kortliste({ ideer, valgt, onApne }: { ideer: Ide[]; valgt?: string; onApne: (id: string) => void }) {
  return (
    <ul className="idekortliste">
      {ideer.map((ide) => (
        <li key={ide.id}>
          <Idekort ide={ide} visKategori={false} visForfatter valgt={ide.id === valgt} onApne={() => onApne(ide.id)} />
        </li>
      ))}
    </ul>
  )
}
