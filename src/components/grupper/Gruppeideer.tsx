import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Profilkort } from '@delt/profil'
import { hentProfilkort } from '../../auth/api'
import { gruppeadresse } from '../../domain/rute'
import type { Gruppeoversikt } from '../../grupper/modell'
import { hentGruppeideer } from '../../ideer/api'
import { idetilstand, INGEN_GRUPPEIDEER, type Gruppeideer as Gruppeideliste, type Ide, type Idetraad } from '../../ideer/modell'
import { useBevart } from '../../oppdatering/Bevaring'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Idekort, Nyknapp } from '../ideer/Ideliste'
import { Ideside } from '../ideer/Ideside'
import { Ideskjema } from '../ideer/Ideskjema'
import { useForlatvakt } from '../ideer/useForlatvakt'
import { Skuff, veksleSkuff } from '../Skuff'
import { Forfatterkilde } from '../traad/Forfatterkontekst'
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
 * Fanen med idéene i gruppen (`#/grupper/<ID>/ideer`), eller én idé
 * (`…/ideer/<idé-ID>`). De åpne idéene står øverst, de nye først; de som er
 * gjort om til oppgaver og de som ikke er aktuelle, står i hver sin skuff.
 * Alle som er med, kan skrive idéer og kommentere; de ansvarlige behandler
 * dem. Knappene følger det databasen svarer, og databasen kontrollerer hver
 * handling på nytt (docs/fagmiljoer.md, «Idéer og oppgaver i gruppene»).
 */
export function Gruppeideer({
  gruppe,
  ide,
  onEndret,
  onGruppeoppgave,
}: {
  gruppe: Gruppeoversikt
  /** Idéen som står åpen. */
  ide?: string
  /** Noe er endret som tallene på fanene teller. */
  onEndret: () => void
  /** Til oppgaven en idé er gjort om til. */
  onGruppeoppgave?: (oppgave: string) => void
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
  const vakt = useForlatvakt()
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

  // Lista hentes på nytt hver gang den vises, så det nye og behandlingene stemmer.
  const paaLista = !ide && !skjema
  useEffect(() => {
    if (paaLista) void hent()
  }, [paaLista, hent])

  // Tilbake på lista står fokus på kortet man kom fra.
  useLayoutEffect(() => {
    if (!paaLista || !lastet || !fra.current) return
    const kort = [...(rot.current?.querySelectorAll<HTMLElement>('[data-ide]') ?? [])].find((el) => el.dataset.ide === fra.current)
    kort?.focus()
    fra.current = null
  }, [paaLista, lastet, liste])

  const tilListe = () => vakt.forlat(() => {
    vakt.nullstill()
    setSkjema(null)
    window.location.hash = gruppeadresse(gruppe.id, 'ideer')
  })

  const apne = (id: string) => {
    fra.current = id
    window.location.hash = gruppeadresse(gruppe.id, 'ideer', id)
  }

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

  const tilbake = (
    <p className="gruppeideer__tilbake">
      <Button variant="subtle" className="knapp--kompakt" icon={<Ikon navn="back" />} onClick={tilListe}>
        Tilbake til idéene
      </Button>
    </p>
  )

  let innhold
  if (skjema) {
    innhold = (
      <>
        {tilbake}
        <Ideskjema
          ide={skjema.ide}
          gruppe={skjema.ide ? undefined : gruppe.id}
          onStatus={vakt.setStatus}
          forlater={vakt.forlater}
          onForkast={vakt.forkast}
          onFortsett={vakt.fortsett}
          onAvbryt={tilListe}
          onLagret={(id) => {
            vakt.nullstill()
            setSkjema(null)
            onEndret()
            setUtgave((n) => n + 1)
            window.location.hash = gruppeadresse(gruppe.id, 'ideer', id)
          }}
        />
      </>
    )
  } else if (ide) {
    innhold = (
      <>
        {tilbake}
        <Ideside
          key={`${ide}:${utgave}`}
          id={ide}
          overskriftsniva={2}
          onEndre={(traad) => setSkjema({ ide: traad })}
          onSlettet={() => {
            onEndret()
            window.location.hash = gruppeadresse(gruppe.id, 'ideer')
          }}
          onArkivert={endret}
          onGjortOm={endret}
          onGruppeoppgave={onGruppeoppgave}
        />
      </>
    )
  } else {
    innhold = (
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
            <Button className="knapp--kompakt" icon={<Ikon navn="plus" />} onClick={() => setSkjema({})}>
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
        {liste.kan_skrive && apneIdeer.length === 0 && lastet && !sok.trim() && <Nyknapp onNy={() => setSkjema({})} />}
        {gjortOm.length > 0 && (
          <Skuff
            tittel="Gjort om til oppgaver"
            ikon="oppgaver"
            antall={gjortOm.length}
            forklaring="Idéene de ansvarlige har gjort om til oppgaver i gruppen. Tråden under dem er fortsatt åpen."
            apen={apneSkuffer.has(SKUFF_GJORT_OM)}
            onVeksle={() => setApneSkuffer((s) => veksleSkuff(s, SKUFF_GJORT_OM))}
          >
            <Kortliste ideer={gjortOm} onApne={apne} />
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
            <Kortliste ideer={ikkeAktuelle} onApne={apne} />
          </Skuff>
        )}
      </>
    )
  }

  return (
    <Forfatterkilde profiler={profiler}>
      <div ref={rot} className="gruppeideer idevindu">
        {innhold}
      </div>
    </Forfatterkilde>
  )
}

function Ideseksjon({ tittel, ideer, tom, onApne }: { tittel: string; ideer: Ide[]; tom: string; onApne: (id: string) => void }) {
  const id = useId()
  return (
    <section className="idegruppe" aria-labelledby={id}>
      <h2 id={id} className="idegruppe__navn">
        <span>{tittel}</span>
        <span className="idegruppe__antall">{ideer.length}</span>
      </h2>
      {ideer.length > 0 ? <Kortliste ideer={ideer} onApne={onApne} /> : <p className="brukerliste__tomt">{tom}</p>}
    </section>
  )
}

function Kortliste({ ideer, onApne }: { ideer: Ide[]; onApne: (id: string) => void }) {
  return (
    <ul className="idekortliste">
      {ideer.map((ide) => (
        <li key={ide.id}>
          <Idekort ide={ide} visKategori={false} visForfatter onApne={() => onApne(ide.id)} />
        </li>
      ))}
    </ul>
  )
}
