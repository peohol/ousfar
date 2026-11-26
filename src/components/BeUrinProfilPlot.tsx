import { useMemo } from 'react'
import { BeUrinFigur, Figurmerknad } from './BeUrinPlot'
import { Kurvestrek } from './Figurdeler'
import { visningsmarginer } from '../domain/beUrinMotor'
import type { BeUrinFellesmodell } from '../domain/beUrinModell'
import { byggProfilgraf, prosentFor } from '../domain/beUrinPlot'
import {
  BE_URIN_KRONISKE_ROLLER,
  BE_URIN_SPORADISKE_ROLLER,
  profilFor,
  profilMarginpunkter,
  type BeUrinProfilsammenligning,
  type BeUrinRolle,
} from '../domain/beUrinProfiler'
import { BE_URIN_GRADTEKST, BE_URIN_ROLLENAVN } from '../domain/beUrinProfilvisning'
import { antallDogn } from '../domain/beUrinVisning'
import { formaterProsent } from '../domain/thcPlot'
import { marginvalg } from '../domain/thcVisning'

/**
 * Figuren med de fem utskillelsesprofilene (modellform 2) og tabellen som er
 * både tegnforklaringen og oversikten over gradene (#576): profilens strek,
 * navnet, den forventede endringen og hvor endringen ligger mot den.
 *
 * Hver profil har sin egen farge og strek (`be-kurve--<navn>`), den samme i
 * tabellen og i figuren. Navnene «treg» og «ekstrem» er sammenligningens, så
 * fargen følger navnet og endres bare med en ny referanseprøve eller et nytt
 * tidsrom. Ingen rangering av de fem forutsettes.
 */

/** Streken i tabellen: et lite utsnitt av kurven, med samme farge og stiplingsmønster. */
export function Profilstrek({ rolle }: { rolle: BeUrinRolle }) {
  return <Kurvestrek klasse={`thc-plot__kurve be-kurve--${rolle}`} />
}

/** Gruppene i tabellen: profilene den sporadiske og den kroniske vurderingen bygger på. */
const GRUPPER = [
  { navn: 'Sporadisk bruk', roller: BE_URIN_SPORADISKE_ROLLER },
  { navn: 'Kronisk bruk', roller: BE_URIN_KRONISKE_ROLLER },
] as const

/** Profilene med den forventede endringen etter d døgn og graden, i to grupper. */
export function BeUrinProfiltabell({ sammenligning: s }: { sammenligning: BeUrinProfilsammenligning }) {
  return (
    <table className="be-profiltabell">
      <thead>
        <tr>
          <th scope="col">Utskillelsesprofil</th>
          <th scope="col">Forventet endring etter {antallDogn(s.dager)}</th>
          <th scope="col">Endringen ligger</th>
        </tr>
      </thead>
      {GRUPPER.map((gruppe) => (
        <tbody key={gruppe.navn}>
          <tr className="be-profiltabell__gruppe">
            <th scope="rowgroup" colSpan={3}>
              {gruppe.navn}
            </th>
          </tr>
          {gruppe.roller.map((rolle) => {
            const v = profilFor(s, rolle)
            return (
              <tr key={rolle}>
                <th scope="row">
                  <span className="be-profiltabell__navn">
                    <Profilstrek rolle={rolle} />
                    {BE_URIN_ROLLENAVN[rolle]}
                  </span>
                </th>
                <td>{formaterProsent(prosentFor(v.terskel))}</td>
                <td>{BE_URIN_GRADTEKST[v.grad]}</td>
              </tr>
            )
          })}
        </tbody>
      ))}
    </table>
  )
}

export function BeUrinProfilPlot({
  sammenligning: s,
  modell,
  alleMarginer = false,
}: {
  sammenligning: BeUrinProfilsammenligning
  modell: BeUrinFellesmodell
  alleMarginer?: boolean
}) {
  const denne = useMemo(
    () => profilMarginpunkter(modell, s, visningsmarginer(modell, s.margin, alleMarginer)),
    [modell, s, alleMarginer],
  )
  // En endring utenfor flyttallene kan vurderes med logaritmene, men ikke
  // tegnes: da gis merknaden i stedet for figuren.
  const graf = useMemo(
    () =>
      byggProfilgraf(
        s,
        BE_URIN_ROLLENAVN,
        denne.map((p) => prosentFor(p.korrigertRatio)),
      ),
    [s, denne],
  )
  if (!graf) return <Figurmerknad />

  return (
    <BeUrinFigur
      graf={graf}
      kurveklasse={(kurve) => `be-kurve--${kurve.rolle}`}
      punkter={denne.map((punkt) => ({
        margin: punkt.margin,
        prosent: prosentFor(punkt.korrigertRatio),
        tekst: `${marginvalg(punkt.margin)} sikkerhetsmargin: ${formaterProsent(prosentFor(punkt.korrigertRatio))}`,
      }))}
      alleMarginer={alleMarginer}
      // Med én margin står endringen alt i forklaringen; listen trengs bare for alle.
      punktliste={alleMarginer}
      beskrivelse="Prosentvis endring i kvotienten etter de fem utskillelsesprofilene, sammenlignet med denne prøven"
    />
  )
}
