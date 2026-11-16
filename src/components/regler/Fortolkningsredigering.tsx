import { useEffect, useId, useMemo } from 'react'
import { kanRedigereRegelsettet } from '../../faginnhold/redigeringsrett'
import { analytterForFortolkning } from '../../domain/koblinger'
import type { Analyttkatalog, Laboratorieanalytt } from '../../domain/analyttkatalog'
import { rusModulFor } from '../../domain/rus'
import { fortolkningssidenavn } from '../../diskusjoner/modell'
import { useLukkMedEscape } from '../../hooks/useLukkMedEscape'
import type { Analyte } from '../../types'
import { Button } from '../Button'
import { SeksjonsstyringKilde, useAdressested } from '../seksjoner/Seksjonsstyring'
import { Redigeringskilde, type Redigeringsverdi } from '../stoffside/Redigeringskontekst'
import { PUBLISERES_AV_ADMINISTRATOR, Redigeringshandlinger } from '../stoffside/Redigeringslinje'
import { Fortolkningsregler, FORTOLKNING } from './Fortolkningsregler'
import { Redaktorlinje } from './Redaktorlinje'
import { Scenarioregler, useScenarioreglerFor } from './Scenarioregler'
import { Thcregler } from './Thcregler'
import { harRegler, useFortolkningsredigering, type Fortolkningsredigering as Redigering } from './useFortolkningsredigering'

export interface FortolkningsredigeringProps {
  /** Fortolkningsmodulen som redigeres: oppføringen søket i fortolkningen gir. */
  fortolkning: Analyte
  /** Delen av reglene, og eventuelt detaljkortet i den, adressen peker på. */
  sted?: readonly string[]
  /** Laboratorieanalyttene, så reglene for hver kode i modulen kan leses. */
  katalog: Analyttkatalog
  /** Om den innloggede publiserer selv; en redaktør endrer bare utkastet (P5). */
  kanPublisere?: boolean
  /**
   * Regelsettene (id-ene) den innloggede får redigere, for en redaktør for
   * enkelte regelsett; `null` (standard) er alle. De andre delene vises ikke.
   */
  regelsett?: ReadonlySet<string> | null
  /** Etter en publisering, så fortolkningen henter de nye reglene. */
  onPublisert: () => void
  /** Tilbake til fortolkningen. */
  onAvslutt: () => void
}

const KAN_IKKE_LEGGE_INN_REFERANSER = () => Promise.reject(new Error('Fortolkningsreglene har ingen referanser.'))

/** Én del av reglene: scenarioreglene, THC-syrereglene eller intervallreglene for én kode. */
type Regeldel = { slag: 'scenario' } | { slag: 'thc' } | { slag: 'intervall'; analytt: Laboratorieanalytt }

/**
 * Redigeringen av reglene og kommentarene en fortolkning gir, for
 * administratorer: en egen side over fortolkningen (`#/fortolkning/<nøkkel>/rediger`),
 * åpnet med «Rediger» der.
 *
 * Siden viser utkastet til hver del av reglene modulen har — scenarioreglene,
 * THC-syrereglene og konsentrasjonsreglene for hver kode — som en seksjon med
 * reglene og kommentarene slik de står, og en knapp for å redigere akkurat
 * den delen. Alt lagres som utkast; toppmenyen sier hva som ikke er publisert,
 * publiserer det og går tilbake til fortolkningen, som på fagsidene.
 *
 * Delene er seksjoner på samme side, så bare én av dem står åpen om gangen, og
 * en adresse som `#/fortolkning/diaz-dmi-oxa/rediger/fortolkning-dmi` åpner
 * den ene.
 *
 * `Escape` går tilbake til fortolkningen, men ikke fra et felt eller et åpent
 * redigeringsskjema.
 */
export function Fortolkningsredigering(props: FortolkningsredigeringProps) {
  return (
    <SeksjonsstyringKilde>
      <Innhold {...props} />
    </SeksjonsstyringKilde>
  )
}

function Innhold({ fortolkning, sted, katalog, kanPublisere = true, regelsett = null, onPublisert, onAvslutt }: FortolkningsredigeringProps) {
  useLukkMedEscape(onAvslutt)
  const pekerPaaSted = useAdressested(sted)
  const overskrift = useId()
  const analytter = useMemo(() => analytterForFortolkning(fortolkning, katalog), [fortolkning, katalog])
  const redigering = useFortolkningsredigering(analytter)
  const { tilstand, publisert, konflikt, plan, kanEndres } = redigering
  const { regler } = tilstand
  const modul = rusModulFor(fortolkning)
  const navn = fortolkningssidenavn(fortolkning)

  useEffect(() => {
    const forrige = document.title
    document.title = `Rediger: ${navn} – OUSFAR`
    return () => {
      document.title = forrige
    }
  }, [navn])

  // Siden begynner øverst, med fokus på overskriften — eller på stedet adressen peker på.
  useEffect(() => {
    if (!pekerPaaSted) window.scrollTo({ top: 0 })
    document.getElementById(overskrift)?.focus({ preventScroll: true })
  }, [overskrift, pekerPaaSted])

  const redigeringsverdi = useMemo<Redigeringsverdi>(
    () => ({
      redigerer: true,
      referansebase: [],
      opprettReferanse: KAN_IKKE_LEGGE_INN_REFERANSER,
      gjenopprett: redigering.gjenopprett,
    }),
    [redigering.gjenopprett],
  )

  // Delene med regelsettet hver hører til; en redaktør for enkelte regelsett får bare sine.
  const alleDeler = useMemo<{ del: Regeldel; regelsett: string }[]>(() => {
    const scenario = modul ? regler.scenarioregelsett[modul.id] : undefined
    return [
      ...(scenario ? [{ del: { slag: 'scenario' as const }, regelsett: scenario.regelsett.id }] : []),
      ...(regler.thcregelsett ? [{ del: { slag: 'thc' as const }, regelsett: regler.thcregelsett.regelsett.id }] : []),
      ...analytter.flatMap((analytt) => {
        const utgave = regler.regelsett[analytt.kode]
        return utgave ? [{ del: { slag: 'intervall' as const, analytt }, regelsett: utgave.regelsett.id }] : []
      }),
    ]
  }, [modul, regler, analytter])
  const deler = useMemo(
    () => alleDeler.filter((d) => kanRedigereRegelsettet(regelsett, d.regelsett)).map((d) => d.del),
    [alleDeler, regelsett],
  )
  const andreDeler = alleDeler.length - deler.length
  // Én del står åpen med en gang; flere har hver sin tittel og adresse på siden.
  const ene = deler.length === 1
  // Regelsettene på siden, for å vise hvem som er redaktør for dem.
  const ressurser = useMemo(
    () => [
      ...Object.values(regler.regelsett).map((r) => r.regelsett.id),
      ...Object.values(regler.scenarioregelsett).map((r) => r.regelsett.id),
      ...(regler.thcregelsett ? [regler.thcregelsett.regelsett.id] : []),
    ],
    [regler],
  )

  return (
    <section className="stoffside fortolkningsredigering" aria-labelledby={overskrift}>
      <Redigeringshandlinger
        regler={regler}
        publisert={publisert}
        plan={plan}
        laster={!kanEndres}
        kanPublisere={kanPublisere}
        onPubliser={async (oppsummering) => {
          await redigering.publiser(oppsummering)
          onPublisert()
        }}
        onAvslutt={onAvslutt}
      />

      <header className="identitet">
        <p className="metalinje">Rediger fortolkningen</p>
        <h1 id={overskrift} className="identitet__navn" tabIndex={-1}>
          {navn}
        </h1>
        <p className="regler__ingress">
          Velg reglene eller kommentarene du vil endre. Endringene lagres som utkast og gjelder i fortolkningen først
          når de er publisert.{!kanPublisere && ` ${PUBLISERES_AV_ADMINISTRATOR}`}
        </p>
        {andreDeler > 0 && (
          <p className="regler__ingress">
            Her redigerer du bare regelsettene du er redaktør for.{' '}
            {andreDeler === 1 ? 'Ett annet regelsett' : `${andreDeler} andre regelsett`} i fortolkningen vises ikke her.
          </p>
        )}
        <Redaktorlinje ressurser={ressurser} />
      </header>

      {konflikt && (
        <div className="sidevarsel" role="alert">
          <p>Noen andre har endret reglene mens du redigerte. Ingenting er skrevet over.</p>
          <Button variant="subtle" onClick={redigering.lastInn}>
            Hent nyeste utgave
          </Button>
        </div>
      )}
      {tilstand.status === 'feil' && (
        <div className="sidevarsel" role="alert">
          <p>Fikk ikke hentet reglene. {tilstand.feil}</p>
          <Button variant="subtle" onClick={redigering.lastInn}>
            Prøv igjen
          </Button>
        </div>
      )}

      <Redigeringskilde verdi={redigeringsverdi}>
        <div className="stoffside__paneler" aria-busy={tilstand.status === 'laster'}>
          {kanEndres &&
            deler.map((del) => (
              <Regeldelvisning
                key={del.slag === 'intervall' ? del.analytt.kode : del.slag}
                del={del}
                fortolkning={fortolkning}
                redigering={redigering}
                ene={ene}
              />
            ))}
          {tilstand.status === 'klar' && !harRegler(regler) && (
            <p className="stoffside__tom">Denne fortolkningen har ingen regler eller kommentarer som kan redigeres her.</p>
          )}
        </div>
      </Redigeringskilde>
    </section>
  )
}

/** Én del av reglene som en seksjon med redigeringen sin. */
function Regeldelvisning({
  del,
  fortolkning,
  redigering,
  ene,
}: {
  del: Regeldel
  fortolkning: Analyte
  redigering: Redigering
  /** Delen er den eneste på siden. */
  ene: boolean
}) {
  const { tilstand, publisert } = redigering
  const { regler } = tilstand
  switch (del.slag) {
    case 'scenario':
      return <Scenariodel fortolkning={fortolkning} redigering={redigering} ene={ene} />
    case 'thc':
      return regler.thcregelsett ? (
        <Thcregler
          utgave={regler.thcregelsett}
          publisert={publisert.thcregelsett}
          redigerer
          onLagre={redigering.lagreThcRegelsett}
          hentNyeste={redigering.hentThcRegelsettutkast}
          apenFraStart={ene}
          {...(!ene && { seksjonsid: `${FORTOLKNING}-thc`, tittel: 'Fortolkningsregler – THC-syre i urin' })}
        />
      ) : null
    case 'intervall': {
      const { kode } = del.analytt
      return (
        <Fortolkningsregler
          utgave={regler.regelsett[kode] ?? null}
          publisert={publisert.regelsett[kode] ?? null}
          redigerer
          onLagre={(innhold, grunnlag, oppsummering) => redigering.lagreRegelsett(kode, innhold, grunnlag, oppsummering)}
          hentNyeste={() => redigering.hentRegelsettutkast(kode)}
          apenFraStart={ene}
          {...(!ene && { seksjonsid: `${FORTOLKNING}-${kode.toLowerCase()}`, tittel: `Fortolkningsregler – ${kode}` })}
        />
      )
    }
  }
}

/** Scenarioreglene modulen fortolkes med, i utkastet. */
function Scenariodel({ fortolkning, redigering, ene }: { fortolkning: Analyte; redigering: Redigering; ene: boolean }) {
  const modul = rusModulFor(fortolkning)
  const { tilstand, publisert, lagreScenarioregelsett, hentScenarioregelsettutkast } = redigering
  const utkast = modul ? tilstand.regler.scenarioregelsett[modul.id] : undefined
  const kilde = useMemo(
    () =>
      utkast && modul
        ? {
            utgave: utkast,
            publisert: publisert.scenarioregelsett[modul.id] ?? null,
            onLagre: (
              u: Parameters<typeof lagreScenarioregelsett>[1],
              g?: Parameters<typeof lagreScenarioregelsett>[2],
              oppsummering?: string,
            ) => lagreScenarioregelsett(modul.id, u, g, oppsummering),
            hentNyeste: () => hentScenarioregelsettutkast(modul.id),
          }
        : null,
    [utkast, modul, publisert.scenarioregelsett, lagreScenarioregelsett, hentScenarioregelsettutkast],
  )
  const scenarioregler = useScenarioreglerFor(fortolkning, kilde)
  if (!scenarioregler) return null
  return (
    <Scenarioregler
      {...scenarioregler}
      apenFraStart={ene}
      {...(!ene && { seksjonsid: `${FORTOLKNING}-scenarier`, tittel: `Fortolkningsregler – ${scenarioregler.modul.navn}` })}
    />
  )
}
