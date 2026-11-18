import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { visningsnavn, type Profilkort } from '@delt/profil'
import { hentProfilkort } from '../../auth/api'
import { useProfil } from '../../auth/okt'
import { useRettigheter } from '../../auth/rettigheter'
import { ENDRINGSLOGG } from '../../data/endringslogg'
import { gruppeadresse } from '../../domain/rute'
import { useFavoritter } from '../../favoritter/Favorittkilde'
import { hentOppsummering, type Databasemodul } from '../../forside/api'
import { FORSIDEMODULER, type Forsidemodul } from '../../forside/moduler'
import { RADER_PER_PANEL, type Oppsummering } from '../../forside/oppsummering'
import { useAnalyttkatalog } from '../../katalog/Analyttkatalogkilde'
import { useStoffregisterkilde } from '../../stoffregister/Stoffregisterkilde'
import { hentEndringsloggstatus, merkVarslerLest, oppfriskVarsler } from '../../varsler/api'
import { apneVarsler } from '../../varsler/apning'
import { endringsvarsler, startstatus, type Endringsvarsel } from '../../varsler/modell'
import { visEndringslogg } from '../endringsloggvisning'
import type { Hendelse } from '../oppsummering/hendelse'
import { Oppsummeringskort, type OppsummeringskortProps, type Panelinnhold } from '../oppsummering/Oppsummeringskort'
import {
  endringsrad,
  fagsiderad,
  favorittrad,
  grupperad,
  invitasjonsrad,
  oppgaverad,
  varselrad,
  type Radkontekst,
} from './hendelser'

/** Det et panel fra databasen har hentet: oppsummeringen, og for «Viktig nytt» føringene i endringsloggen. */
interface Panelsvar {
  oppsummering: Oppsummering
  endringer: Endringsvarsel[]
}

/** Teksten når panelet er tomt, og tekstlenken til resten. */
const TOMTEKST = 'Ingen nye hendelser.'
const ALLE_VARSLER = { tekst: 'Alle varsler', ved: apneVarsler }

const PANELTEKST: Record<Forsidemodul, { tomtekst: string; visAlle?: OppsummeringskortProps['visAlle'] }> = {
  viktig_nytt: { tomtekst: TOMTEKST, visAlle: ALLE_VARSLER },
  aktuelt: { tomtekst: TOMTEKST, visAlle: ALLE_VARSLER },
  grupper: { tomtekst: 'Du er ikke med i noen grupper ennå.', visAlle: { tekst: 'Alle grupper', til: gruppeadresse() } },
  fagsider: { tomtekst: TOMTEKST },
  ideer: { tomtekst: 'Ingen nye idéer.' },
  oppgaver: { tomtekst: 'Ingen åpne oppgaver.' },
  diskusjoner: { tomtekst: TOMTEKST },
  favoritter: { tomtekst: 'Ingen favoritter ennå. Trykk på stjernen på en fagside.' },
}

/** Uleste først, så det nyeste. */
const etterUlestOgTid = (a: Hendelse, b: Hendelse) => Number(!!b.ulest) - Number(!!a.ulest) || (b.tid ?? '').localeCompare(a.tid ?? '')

/**
 * Hentingen til ett panel. «Viktig nytt» henter også hvor langt brukeren er
 * kommet i endringsloggen, som bjella; uten svar derfra gjelder starten for
 * en ny bruker, så panelet aldri feiler for det.
 */
function hentPanel(modul: Databasemodul): Promise<Panelsvar> {
  if (modul !== 'viktig_nytt') return hentOppsummering(modul).then((oppsummering) => ({ oppsummering, endringer: [] }))
  return Promise.all([hentOppsummering(modul), hentEndringsloggstatus().catch(() => null)]).then(([oppsummering, status]) => ({
    oppsummering,
    endringer: endringsvarsler(ENDRINGSLOGG, status ?? startstatus(ENDRINGSLOGG)).filter((v) => !v.arkivert),
  }))
}

/** Radene i et panel, i rekkefølgen panelet viser dem, høyst tre. */
function rader(modul: Databasemodul, svar: Panelsvar, kontekst: Radkontekst, lest: (varsel: string, lest_kl: string) => void): Hendelse[] {
  const { oppsummering: o } = svar
  const varsler = () => o.varsler.map((v) => varselrad(v, kontekst, () => !v.lest && lest(v.id, o.lest_kl)))
  switch (modul) {
    case 'viktig_nytt':
      return [...svar.endringer.map((v) => endringsrad(v, () => visEndringslogg(v.endring.versjon))), ...varsler()]
        .sort(etterUlestOgTid)
        .slice(0, RADER_PER_PANEL)
    case 'aktuelt':
      return [...o.invitasjoner.map(invitasjonsrad), ...varsler()].slice(0, RADER_PER_PANEL)
    case 'grupper':
      return o.grupper.map(grupperad)
    case 'fagsider':
      return o.fagsider.map(fagsiderad)
    case 'oppgaver':
      return o.oppgaver.map(oppgaverad)
    case 'ideer':
    case 'diskusjoner':
      return varsler()
  }
}

/**
 * Det som er hentet, per bruker, fagmiljø og panel, mens appen står åpen: når
 * brukeren kommer tilbake til forsiden, står det forrige der til det nye er
 * hentet, i stedet for at panelene blinker. Nøkkelen har fagmiljøet, så et
 * bytte aldri viser det forrige fagmiljøets innhold.
 */
const hentet = new Map<string, Panelsvar>()

/** Navnene på brukerne, hentet én gang når forsiden trenger dem, og holdt mens appen står åpen. */
let profiler: Promise<Profilkort[]> | null = null
function useNavn(): (id: string) => string {
  const meg = useProfil()
  const [kort, setKort] = useState<Profilkort[]>([])
  useEffect(() => {
    let gjelder = true
    profiler ??= hentProfilkort().catch((feil: unknown) => {
      profiler = null
      throw feil
    })
    profiler.then((p) => gjelder && setKort(p), () => undefined)
    return () => {
      gjelder = false
    }
  }, [])
  return useMemo(() => {
    const oppslag = new Map([...kort, meg].map((p) => [p.id, visningsnavn(p)]))
    return (id: string) => oppslag.get(id) ?? 'Noen'
  }, [kort, meg])
}

/**
 * Ett panel på forsiden, som laster, feiler og er tomt for seg selv
 * (`Oppsummeringskort`). En feil her lar resten av forsiden virke.
 */
export function Forsidepanel({ modul }: { modul: Forsidemodul }) {
  return modul === 'favoritter' ? <Favorittpanel /> : <Databasepanel modul={modul} />
}

function Databasepanel({ modul }: { modul: Databasemodul }) {
  const meg = useProfil()
  const fagmiljo = useRettigheter().arbeidsfagmiljo?.id ?? null
  const katalog = useAnalyttkatalog()
  const navn = useNavn()
  const nokkel = `${meg.id}:${fagmiljo}:${modul}`
  const [tilstand, setTilstand] = useState<{ nokkel: string; svar: Panelsvar | null; feil: boolean }>(() => ({
    nokkel,
    svar: hentet.get(nokkel) ?? null,
    feil: false,
  }))
  /** Varslene som er merket lest herfra, så prikken går bort med en gang. */
  const [leste, setLeste] = useState<ReadonlySet<string>>(new Set())
  const siste = useRef(0)

  const hent = useCallback(() => {
    const denne = (siste.current += 1)
    setTilstand((t) => (t.nokkel === nokkel ? { ...t, feil: false } : { nokkel, svar: hentet.get(nokkel) ?? null, feil: false }))
    hentPanel(modul).then(
      (svar) => {
        if (denne !== siste.current) return
        hentet.set(nokkel, svar)
        setTilstand({ nokkel, svar, feil: false })
      },
      () => {
        if (denne === siste.current) setTilstand((t) => ({ ...t, feil: true }))
      },
    )
  }, [modul, nokkel])

  // Hentes når panelet kommer fram, og på nytt når fagmiljøet byttes.
  useEffect(hent, [hent])

  const lest = useCallback((varsel: string, lest_kl: string) => {
    setLeste((s) => new Set(s).add(varsel))
    merkVarslerLest([varsel], lest_kl).then(oppfriskVarsler, () => undefined)
  }, [])

  // Det som er hentet for et annet fagmiljø, vises aldri, heller ikke mens det nye hentes.
  const svar = tilstand.nokkel === nokkel ? tilstand.svar : null
  const innhold: Panelinnhold = useMemo(() => {
    if (svar) {
      const hendelser = rader(modul, svar, { meg: meg.id, navn, katalog }, lest).map((h) => (leste.has(h.id) ? { ...h, ulest: false } : h))
      return { status: 'klar', hendelser }
    }
    return tilstand.feil && tilstand.nokkel === nokkel ? { status: 'feil', provIgjen: hent } : { status: 'laster' }
  }, [svar, modul, meg.id, navn, katalog, lest, leste, tilstand, nokkel, hent])

  const { tittel, ikon } = FORSIDEMODULER[modul]
  return <Oppsummeringskort tittel={tittel} ikon={ikon} innhold={innhold} {...PANELTEKST[modul]} />
}

/** Favorittene har appen alt; de nyeste står først. */
function Favorittpanel() {
  const favoritter = useFavoritter()
  const register = useStoffregisterkilde()?.register
  const innhold: Panelinnhold = useMemo(() => {
    if (!favoritter || !register) return { status: 'laster' }
    const hendelser = [...favoritter.stoffer]
      .reverse()
      .filter((slug) => register.status(slug) !== 'papirkurv')
      .slice(0, RADER_PER_PANEL)
      .map((slug) => favorittrad(slug, register.menystoff(slug)?.navn ?? slug))
    return { status: 'klar', hendelser }
  }, [favoritter, register])
  const { tittel, ikon } = FORSIDEMODULER.favoritter
  return <Oppsummeringskort tittel={tittel} ikon={ikon} innhold={innhold} {...PANELTEKST.favoritter} />
}
