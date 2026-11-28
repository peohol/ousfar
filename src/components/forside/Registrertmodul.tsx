import { Component, Suspense, type ReactNode } from 'react'
import { useRettigheter } from '../../auth/rettigheter'
import { FORSIDEMODULER, plassFor, type Forsidemodul } from '../../forside/moduler'
import { Oppsummeringskort, Panelstatus, type Panelinnhold } from '../oppsummering/Oppsummeringskort'

type Status = Exclude<Panelinnhold, { status: 'klar' }>

/**
 * Et panel et eierprosjekt har registrert på forsiden (`src/forside/registrerte.ts`,
 * docs/forside.md). Forsiden viser det bare for dem som har det
 * (`tilgangFor`); her får det det samme som forsidens egne paneler:
 *
 * - Koden hentes først når panelet vises, og mens den hentes, står panelet
 *   som et panel som henter.
 * - Feiler koden eller innholdet, feiler bare panelet, med «Prøv igjen»; resten
 *   av forsiden virker.
 * - Innholdet settes opp på nytt for hvert fagmiljø, så det aldri viser det
 *   forrige fagmiljøets, og det holder sin egen tilstand (som en valgt dato)
 *   ellers, også når forsiden tegnes på nytt.
 *
 * I feltet øverst står panelet i et område med panelets navn, og innholdet
 * tegner resten selv; blant panelene tegner innholdet hele kortet, gjerne med
 * `Oppsummeringskort`.
 */
export function Registrertmodul({ modul }: { modul: Forsidemodul }) {
  const fagmiljo = useRettigheter().arbeidsfagmiljo
  const { tittel, ikon, innhold: Innhold } = FORSIDEMODULER[modul]
  if (!Innhold || !fagmiljo) return null
  const topp = plassFor(modul) === 'topp'
  const vis = (status: Status) => (topp ? <Panelstatus innhold={status} /> : <Oppsummeringskort tittel={tittel} ikon={ikon} innhold={status} />)
  const innhold = (
    <Panelfeil key={fagmiljo.id} vis={(provIgjen) => vis({ status: 'feil', provIgjen })}>
      <Suspense fallback={vis({ status: 'laster' })}>
        <Innhold fagmiljo={fagmiljo} tittel={tittel} ikon={ikon} />
      </Suspense>
    </Panelfeil>
  )
  return topp ? (
    <section className="forside__topp" aria-label={tittel}>
      {innhold}
    </section>
  ) : (
    <div className="forside__modul">{innhold}</div>
  )
}

/**
 * Fanger en feil i ett panel, også at koden ikke lot seg hente, og viser
 * panelets feil med «Prøv igjen», som setter det opp på nytt (koden hentes da
 * igjen, `senere`).
 */
class Panelfeil extends Component<{ vis: (provIgjen: () => void) => ReactNode; children: ReactNode }, { feilet: boolean }> {
  override state = { feilet: false }

  static getDerivedStateFromError() {
    return { feilet: true }
  }

  private readonly provIgjen = () => this.setState({ feilet: false })

  override render() {
    return this.state.feilet ? this.props.vis(this.provIgjen) : this.props.children
  }
}
