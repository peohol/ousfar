import type { ReactNode } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { Details } from './Details'
import { Panelhode } from './Panelhode'
import { ThcForklaring } from './ThcForklaring'
import { ThcPlot } from './ThcPlot'
import { Ikon } from './ikon/Ikon'
import type { ThcMildereUtfall, ThcResultat } from '../domain/thcMotor'
import type { ThcRegelsett } from '../domain/thcRegelsett'
import { konklusjonsnavnISetning, marginliste, marginmerke } from '../domain/thcVisning'

/**
 * Utfallet av en THC-fortolkning, slik fortolkningsmodulen og simulatoren på
 * stoffsiden viser det: kommentaren eller det som mangler, og kurvene med
 * forklaringen. Modulen legger til kopieringen; simulatoren har ingenting å
 * kopiere.
 */

/** Det banneret om en mildere konklusjon med høyere sikkerhetsmargin trenger. */
export interface ThcMarginsjekk {
  /** De mildere utfallene høyere marginer gir ({@link mildereVedHoyereMargin}). */
  mildere: ThcMildereUtfall[]
  /** Velger marginen. Uten den står banneret uten knapper. */
  onVelg?: (margin: number) => void
}

export function ThcKommentar({
  resultat,
  regler,
  onIngenTidligere,
  marginsjekk,
  handling,
}: {
  resultat: ThcResultat
  regler: ThcRegelsett
  /** Huker av «Ingen tidligere prøve». Uten den står varselet uten knapp. */
  onIngenTidligere?: () => void
  /** Sier fra når en høyere sikkerhetsmargin gir en mildere konklusjon. */
  marginsjekk?: ThcMarginsjekk
  /** Det som står under kommentaren, som kopiknappen. */
  handling?: ReactNode
}) {
  if (resultat.type === 'mangler') {
    return (
      <>
        <Panelhode ikon="fallback" tone="toksisk">
          Mangler
        </Panelhode>
        <ul className="mangelliste">
          {resultat.mangler.map((melding) => (
            <li key={melding}>{melding}</li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <>
      <Panelhode ikon="interp">Kommentar</Panelhode>
      {marginsjekk && marginsjekk.mildere.length > 0 && (
        <MildereMargin {...marginsjekk} />
      )}
      {resultat.langtMellomProvene && (
        <div className="notis notis--handling" role="note">
          <p>
            Det er mer enn {regler.varsel_dager_mellom} dager mellom prøvene. Vurder å huke av «Ingen
            tidligere prøve tilgjengelig».
          </p>
          {onIngenTidligere && (
            <Button variant="kant" icon={<Ikon navn="done" />} onClick={onIngenTidligere}>
              Huk av nå
            </Button>
          )}
        </div>
      )}
      {/* Den samlede vurderingen endret ikke noe, så kommentaren sier ikke
          noe om den; brukeren skal likevel vite at den ble gjort. */}
      {resultat.samletUtenNyttInntak && (
        <p className="notis thc-samlet-uten-treff" role="note">
          Ingen av de tidligere prøvene ga «nytt inntak». Kommentaren er derfor den vanlige for fortolkningen mot
          forrige prøve.
        </p>
      )}
      <p className="kommentartekst">{resultat.kommentar}</p>
      {handling}
    </>
  )
}

/**
 * Banneret over kommentaren når en høyere sikkerhetsmargin enn den valgte gir
 * en mildere konklusjon: hvert mildere utfall med marginene som gir det, og en
 * knapp for den laveste av dem, skilt med en linje. Konklusjonen med den valgte
 * marginen står i kommentaren rett under, så banneret gjentar den ikke. At en
 * lavere margin gir en strengere konklusjon, sies aldri.
 */
function MildereMargin({ mildere, onVelg }: ThcMarginsjekk) {
  return (
    <div className="notis thc-mildere" role="note" aria-label="Vurder høyere sikkerhetsmargin">
      <p className="thc-mildere__hode">
        <Ikon navn="advarsel" storrelse="1.25em" />
        Vurder høyere sikkerhetsmargin
      </p>
      <ul className="thc-mildere__liste">
        {mildere.map(({ marginer, konklusjon, samlet }) => {
          const laveste = marginer[0]!
          return (
            <li key={marginer.join('|')} className="thc-mildere__utfall">
              <p>
                Med {marginliste(marginer)} sikkerhetsmargin endres konklusjonen til «
                {konklusjonsnavnISetning(konklusjon, samlet)}».
              </p>
              {onVelg && (
                <Button
                  variant="kant"
                  aria-label={`Bruk ${marginmerke(laveste)} sikkerhetsmargin`}
                  onClick={() => onVelg(laveste)}
                >
                  Bruk {marginmerke(laveste)}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Grunnlaget kurvene og forklaringen tegnes fra: fortolkningen mot en forrige prøve minst ett døgn før. */
function grafgrunnlag(resultat: ThcResultat) {
  return resultat.type === 'kommentar' && resultat.grunnlag && resultat.grunnlag.dager >= 1
    ? { grunnlag: resultat.grunnlag, konklusjon: resultat.konklusjon, samlet: resultat.samlet }
    : null
}

/** Kurvene med forklaringen under, når det er noe å tegne. */
export function ThcKurvebilde({ resultat, regler }: { resultat: ThcResultat; regler: ThcRegelsett }) {
  const graf = grafgrunnlag(resultat)
  if (!graf) return null
  return (
    <>
      <ThcPlot grunnlag={graf.grunnlag} regler={regler} />
      <Details summary="Forklaring" ikon="fallback">
        <ThcForklaring grunnlag={graf.grunnlag} konklusjon={graf.konklusjon} samlet={graf.samlet} regler={regler} />
      </Details>
    </>
  )
}

/** Kurvene og forklaringen som eget panel i fortolkningsmodulen. */
export function ThcVisualisering({ resultat, regler }: { resultat: ThcResultat; regler: ThcRegelsett }) {
  if (!grafgrunnlag(resultat)) return null
  return (
    <Card align="start" className="thc-plot">
      <Panelhode ikon="hl">Visualisering</Panelhode>
      <ThcKurvebilde resultat={resultat} regler={regler} />
    </Card>
  )
}
