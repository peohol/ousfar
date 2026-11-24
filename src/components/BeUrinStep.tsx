import { useEffect, useMemo, useRef, useState } from 'react'
import { useBevart } from '../oppdatering/Bevaring'
import { BeUrinBeregning } from './BeUrinForklaring'
import { BeUrinPlot } from './BeUrinPlot'
import { BeUrinSkjema } from './BeUrinSkjema'
import { Button } from './Button'
import { Card } from './Card'
import { Details } from './Details'
import { Panelhode } from './Panelhode'
import { Regelstatus } from './Regelstatus'
import { StepBar } from './StepBar'
import { Korthode } from './ThcStep'
import { Trinnbryter } from './Trinnbryter'
import { Ikon } from './ikon/Ikon'
import {
  fortolkBeUrin,
  mildereVedHoyereMargin,
  tomBeUrinInndata,
  type BeUrinInndata,
  type BeUrinMildereUtfall,
  type BeUrinResultat,
} from '../domain/beUrinMotor'
import type { BeUrinModellstatus, BeUrinModellsvar, GodkjentBeUrinModell } from '../domain/beUrinModell'
import {
  BE_URIN_KONKLUSJONSFORKLARING,
  BE_URIN_KONKLUSJONSTEKST,
  BE_URIN_TENTATIV,
  konklusjonISetning,
} from '../domain/beUrinVisning'
import { formaterDatoNorsk } from '../domain/thcTall'
import { marginliste, marginmerke, somProsent } from '../domain/thcVisning'
import { useHenting } from '../hooks/useHenting'
import { useKortHopp } from '../hooks/useKortHopp'
import { beUrinModellFra } from '../katalog/beUrinModell'
import type { Analyte } from '../types'

/** Navnet skjemaet tas vare på under når appen oppdateres: per fagmiljø og modellversjon. */
export const beUrinBevaringsnavn = (fagmiljo: string, versjon: string) => `fortolkning/be-urin/${fagmiljo}/${versjon}`

export interface BeUrinStepProps {
  analyte: Analyte
  /** Henter modellen for arbeidskonteksten. Kalles når modulen åpnes. */
  hentModell: () => Promise<BeUrinModellsvar>
  /** Arbeidskonteksten. Byttes den, hentes modellen forfra og skjemaet tømmes. */
  kontekst: string | null
  onBack: () => void
}

/**
 * Den tentative fortolkningen av benzoylekgonin i urin
 * (`docs/benzoylekgonin-urin.md`): intern beslutningsstøtte, uten kommentar
 * og uten kopiering. Den fortolker bare med fagmiljøets egen modell, og sier
 * fra i stedet når den ikke finnes eller ikke består kontrollen.
 */
export function BeUrinStep({ analyte, hentModell, kontekst, onBack }: BeUrinStepProps) {
  const seksjon = useRef<HTMLElement>(null)
  useKortHopp(true, seksjon)
  const { tilstand, hentPaNytt } = useHenting(hentModell, kontekst)
  const modell = useMemo(() => beUrinModellFra(tilstand, hentPaNytt), [tilstand, hentPaNytt])

  return (
    <section className="steg steg--thc" aria-label={`Fortolk ${analyte.visningsnavn}`} ref={seksjon}>
      <StepBar onEsc={onBack}>Bytt analytt</StepBar>
      {modell.status === 'klar' ? (
        // Nøkkelen tømmer skjemaet når fagmiljøet byttes.
        <BeUrinFortolkning key={modell.fagmiljo} analyte={analyte} fagmiljo={modell.fagmiljo} modell={modell.modell} />
      ) : (
        <div className="thc">
          <Card align="start" className="analyttkort">
            <Korthode analyte={analyte} />
          </Card>
          <Card align="start" className="thc-resultat">
            <Regelstatus regler={modell as Exclude<BeUrinModellstatus, { status: 'klar' }>} tittel="Modellen mangler" />
          </Card>
        </div>
      )}
    </section>
  )
}

function BeUrinFortolkning({
  analyte,
  fagmiljo,
  modell,
}: {
  analyte: Analyte
  fagmiljo: string
  modell: GodkjentBeUrinModell
}) {
  // Det som er fylt inn, overlever en oppdatering av appen, og bare det. Navnet
  // binder verdiene til fagmiljøet og modellversjonen: kommer en annen modell
  // med oppdateringen (andre enheter, kurver eller CV-er), begynner skjemaet
  // tomt i stedet for å fortolke de gamle verdiene med den nye modellen.
  const [inndata, setInndata] = useBevart<BeUrinInndata>(beUrinBevaringsnavn(fagmiljo, modell.versjon), () =>
    tomBeUrinInndata(modell),
  )
  const [alleMarginer, setAlleMarginer] = useBevart('fortolkning/be-urin/visning', false)
  const [fokusTeller, setFokusTeller] = useState(0)
  const forsteFelt = useRef<HTMLInputElement>(null)

  useEffect(() => {
    forsteFelt.current?.focus()
  }, [fokusTeller])

  const resultat = useMemo(() => fortolkBeUrin(inndata, modell), [inndata, modell])
  const mildere = useMemo(() => mildereVedHoyereMargin(inndata, modell, resultat), [inndata, modell, resultat])

  const sett = <K extends keyof BeUrinInndata>(felt: K, verdi: BeUrinInndata[K]) =>
    setInndata((forrige) => ({ ...forrige, [felt]: verdi }))
  const nullstill = () => {
    setInndata(tomBeUrinInndata(modell))
    setFokusTeller((t) => t + 1)
  }

  return (
    <div className="thc">
      <Card align="start" className="analyttkort">
        <Korthode analyte={analyte}>
          <div className="thc-nullstillhjorne" data-nullstill>
            <Button variant="kant" icon={<Ikon navn="reset" />} onClick={nullstill}>
              Nullstill
            </Button>
          </div>
        </Korthode>
        <BeUrinSkjema inndata={inndata} onEndre={sett} modell={modell} forsteFelt={forsteFelt} />
      </Card>

      <Card align="start" className="thc-resultat">
        <BeUrinUtfall resultat={resultat} mildere={mildere} onVelgMargin={(margin) => sett('sikkerhetsmargin', margin)} />
      </Card>

      {resultat.type === 'vurdering' && resultat.sammenligning.dager >= 1 && (
        <Card align="start" className="thc-plot">
          <Panelhode ikon="hl">Visualisering</Panelhode>
          <div className="thc-visningsvalg">
            <Trinnbryter<boolean>
              etikett="Visualisering"
              valg={[
                {
                  verdi: false,
                  merke: `Visualiser med valgt sikkerhetsmargin (${somProsent(resultat.sammenligning.margin)} %)`,
                },
                { verdi: true, merke: 'Visualiser med alle sikkerhetsmarginer' },
              ]}
              verdi={alleMarginer}
              onVelg={setAlleMarginer}
            />
          </div>
          <BeUrinPlot sammenligning={resultat.sammenligning} modell={modell} alleMarginer={alleMarginer} />
          <Details summary="Beregningen" ikon="fallback">
            <BeUrinBeregning
              sammenligning={resultat.sammenligning}
              modell={modell}
              forrigeDato={resultat.forrige.dato}
              denneDato={resultat.denne.dato}
            />
          </Details>
        </Card>
      )}
      {resultat.type === 'vurdering' && resultat.sammeDag && (
        <Card align="start" className="thc-plot">
          <Panelhode ikon="hl">Beregningen</Panelhode>
          <BeUrinBeregning
            sammenligning={resultat.sammenligning}
            modell={modell}
            forrigeDato={resultat.forrige.dato}
            denneDato={resultat.denne.dato}
          />
        </Card>
      )}
    </div>
  )
}

/** Resultatet: konklusjonen med merkingen og forklaringen, eller det som mangler. */
export function BeUrinUtfall({
  resultat,
  mildere,
  onVelgMargin,
}: {
  resultat: BeUrinResultat
  mildere: BeUrinMildereUtfall[]
  onVelgMargin: (margin: number) => void
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

  const { sammenligning, samlet, sammeDag } = resultat
  return (
    <>
      <Panelhode ikon="interp">Resultat</Panelhode>
      <p className="notis" role="note">
        {BE_URIN_TENTATIV}
      </p>
      {mildere.length > 0 && <MildereMargin mildere={mildere} onVelg={onVelgMargin} />}
      <p className="kommentartekst">
        <strong>{BE_URIN_KONKLUSJONSTEKST[sammenligning.konklusjon]}</strong>
      </p>
      <p>{BE_URIN_KONKLUSJONSFORKLARING[sammenligning.konklusjon]}</p>
      {samlet && (
        <p className="notis thc-samlet-uten-treff" role="note">
          {samlet.treff
            ? `Samlet vurdering: Nytt inntak etter ${formaterDatoNorsk(samlet.treff.dato)} (modellindikasjon). ` +
              'Denne prøven overskrider begge profilene mot den tidligere prøven. Det sier ikke at inntaket var etter forrige prøve.'
            : 'Samlet vurdering: ingen av de tidligere prøvene ga «nytt inntak».'}
        </p>
      )}
      {sammeDag && (
        <p className="notis" role="note">
          Prøvene har samme dato. Modellen regner med 0 døgn mellom dem, og begge tersklene er da 1 (ingen endring).
          Hvor lang tid det har gått innen døgnet, er ukjent.
        </p>
      )}
      {sammenligning.profiler.some((p) => p.ekstrapolert) && (
        <p className="notis" role="note">
          Forrige prøve ligger over startverdien til minst én utskillelsesprofil. Terskelen er regnet ved matematisk
          ekstrapolasjon, et område modellen ikke er dokumentert for.
        </p>
      )}
    </>
  )
}

/**
 * Banneret når en høyere sikkerhetsmargin enn den valgte gir en mildere
 * konklusjon, som i THC-syremodulen. Marginen endres bare når brukeren selv
 * trykker.
 */
function MildereMargin({ mildere, onVelg }: { mildere: BeUrinMildereUtfall[]; onVelg: (margin: number) => void }) {
  return (
    <div className="notis thc-mildere" role="note" aria-label="Vurder høyere sikkerhetsmargin">
      <p className="thc-mildere__hode">
        <Ikon navn="advarsel" storrelse="1.25em" />
        Vurder høyere sikkerhetsmargin
      </p>
      <ul className="thc-mildere__liste">
        {mildere.map(({ marginer, konklusjon, samletDato }) => {
          const laveste = marginer[0]!
          return (
            <li key={marginer.join('|')} className="thc-mildere__utfall">
              <p>
                Med {marginliste(marginer)} sikkerhetsmargin endres resultatet til «{konklusjonISetning(konklusjon, samletDato)}».
              </p>
              <Button variant="kant" aria-label={`Bruk ${marginmerke(laveste)} sikkerhetsmargin`} onClick={() => onVelg(laveste)}>
                Bruk {marginmerke(laveste)}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
