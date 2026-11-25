import { useEffect, useMemo, useRef, useState } from 'react'
import { useBevart } from '../oppdatering/Bevaring'
import { BeUrinMangler, BeUrinVisualisering, MildereMargin, type BeUrinResultatProps } from './BeUrinDeler'
import { BeUrinBeregning } from './BeUrinForklaring'
import { BeUrinPlot } from './BeUrinPlot'
import { BeUrinProfilresultat } from './BeUrinProfilresultat'
import { BeUrinSkjema } from './BeUrinSkjema'
import { Button } from './Button'
import { Card } from './Card'
import { Panelhode } from './Panelhode'
import { Regelstatus } from './Regelstatus'
import { StepBar } from './StepBar'
import { Korthode } from './ThcStep'
import { Ikon } from './ikon/Ikon'
import {
  fortolkBeUrin,
  mildereVedHoyereMargin,
  tomBeUrinInndata,
  type BeUrinInndata,
  type BeUrinMildereUtfall,
  type BeUrinResultat,
} from '../domain/beUrinMotor'
import {
  erProfilmodell,
  type BeUrinModellstatus,
  type BeUrinModellsvar,
  type GodkjentBeUrinModell,
  type GodkjentBeUrinModellutgave,
} from '../domain/beUrinModell'
import {
  BE_URIN_KONKLUSJONSFORKLARING,
  BE_URIN_KONKLUSJONSTEKST,
  BE_URIN_TENTATIV,
  ekstrapolasjonsmerknad,
  erEkstrapolert,
  konklusjonISetning,
} from '../domain/beUrinVisning'
import { formaterDatoNorsk } from '../domain/thcTall'
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
 * Fortolkningen av benzoylekgonin i urin (`docs/benzoylekgonin-urin.md`):
 * intern beslutningsstøtte, uten kommentar og uten kopiering. Den fortolker
 * bare med fagmiljøets egen modell, og sier fra i stedet når den ikke finnes
 * eller ikke består kontrollen. Modellform 1 (#562) gir resultatet med to
 * profiler; form 2 (#570) gir fem profiler og de to vurderingene for
 * sporadisk og kronisk bruk.
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

/** Teksten over de tidligere prøvene i skjemaet, etter modellformen. */
const SAMLET_INGRESS = {
  1: 'Gir sammenligningen med forrige prøve «kan ikke fastslås», sammenlignes denne prøven også med prøvene under, fra den nærmeste og bakover.',
  2:
    'Er vurderingen ved kronisk bruk uavklart, men endringen over moderat eller treg utskillelse, ' +
    'sammenlignes denne prøven også med prøvene under, fra den nærmeste og bakover.',
} as const

function BeUrinFortolkning({
  analyte,
  fagmiljo,
  modell,
}: {
  analyte: Analyte
  fagmiljo: string
  modell: GodkjentBeUrinModellutgave
}) {
  // Det som er fylt inn, overlever en oppdatering av appen, og bare det. Navnet
  // binder verdiene til fagmiljøet og modellversjonen: kommer en annen modell
  // med oppdateringen (andre enheter, profiler eller CV-er), begynner skjemaet
  // tomt i stedet for å fortolke de gamle verdiene med den nye modellen.
  const [inndata, setInndata] = useBevart<BeUrinInndata>(beUrinBevaringsnavn(fagmiljo, modell.versjon), () =>
    tomBeUrinInndata(modell),
  )
  // Visningsvalget i figuren eies her, ikke av figurkortet: kortet forsvinner
  // så lenge skjemaet er ufullstendig, og valget skal stå når det kommer
  // tilbake, også etter Nullstill.
  const [alleMarginer, onAlleMarginer] = useBevart('fortolkning/be-urin/visning', false)
  const [fokusTeller, setFokusTeller] = useState(0)
  const forsteFelt = useRef<HTMLInputElement>(null)

  useEffect(() => {
    forsteFelt.current?.focus()
  }, [fokusTeller])

  const sett = <K extends keyof BeUrinInndata>(felt: K, verdi: BeUrinInndata[K]) =>
    setInndata((forrige) => ({ ...forrige, [felt]: verdi }))
  const nullstill = () => {
    setInndata(tomBeUrinInndata(modell))
    setFokusTeller((t) => t + 1)
  }
  const onVelgMargin = (margin: number) => sett('sikkerhetsmargin', margin)
  const visning = { alleMarginer, onAlleMarginer }

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
        <BeUrinSkjema
          inndata={inndata}
          onEndre={sett}
          modell={modell}
          forsteFelt={forsteFelt}
          samletIngress={SAMLET_INGRESS[erProfilmodell(modell) ? 2 : 1]}
        />
      </Card>
      {erProfilmodell(modell) ? (
        <BeUrinProfilresultat inndata={inndata} modell={modell} onVelgMargin={onVelgMargin} visning={visning} />
      ) : (
        <BeUrinTobiresultat inndata={inndata} modell={modell} onVelgMargin={onVelgMargin} visning={visning} />
      )}
    </div>
  )
}

/** Resultatet med modellform 1: de to bieksponentielle profilene (#562). */
function BeUrinTobiresultat({ inndata, modell, onVelgMargin, visning }: BeUrinResultatProps<GodkjentBeUrinModell>) {
  const resultat = useMemo(() => fortolkBeUrin(inndata, modell), [inndata, modell])
  const mildere = useMemo(() => mildereVedHoyereMargin(inndata, modell, resultat), [inndata, modell, resultat])
  return (
    <>
      <Card align="start" className="thc-resultat">
        <BeUrinUtfall resultat={resultat} mildere={mildere} onVelgMargin={onVelgMargin} />
      </Card>
      {resultat.type === 'vurdering' && (
        <BeUrinVisualisering
          margin={resultat.sammenligning.margin}
          sammeDag={resultat.sammeDag}
          visning={visning}
          figur={(alle) => <BeUrinPlot sammenligning={resultat.sammenligning} modell={modell} alleMarginer={alle} />}
          beregning={
            <BeUrinBeregning
              sammenligning={resultat.sammenligning}
              modell={modell}
              forrigeDato={resultat.forrige.dato}
              denneDato={resultat.denne.dato}
            />
          }
        />
      )}
    </>
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
  if (resultat.type === 'mangler') return <BeUrinMangler mangler={resultat.mangler} />

  const { sammenligning, samlet, sammeDag } = resultat
  return (
    <>
      <Panelhode ikon="interp">Resultat</Panelhode>
      <p className="notis" role="note">
        {BE_URIN_TENTATIV}
      </p>
      {mildere.length > 0 && (
        <MildereMargin
          utfall={mildere.map(({ marginer, konklusjon, samletDato }) => ({
            marginer,
            tekst: `endres resultatet til «${konklusjonISetning(konklusjon, samletDato)}».`,
          }))}
          onVelg={onVelgMargin}
        />
      )}
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
      {erEkstrapolert(sammenligning) && (
        <p className="notis" role="note">
          {ekstrapolasjonsmerknad('Forrige prøve')}
        </p>
      )}
      {samlet?.treff && erEkstrapolert(samlet.treff.sammenligning) && (
        <p className="notis" role="note">
          Samlet vurdering: {ekstrapolasjonsmerknad(`Den tidligere prøven fra ${formaterDatoNorsk(samlet.treff.dato)}`)}
        </p>
      )}
    </>
  )
}
