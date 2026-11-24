import { logSd, type BeUrinSammenligning } from '../domain/beUrinMotor'
import type { BeUrinModell } from '../domain/beUrinModell'
import { prosentFor } from '../domain/beUrinPlot'
import { antallDogn, erEkstrapolert, formaterDogn, formaterRatio, konklusjonISetning, tallMedEnhet } from '../domain/beUrinVisning'
import { formaterProsent } from '../domain/thcPlot'
import { formaterDatoNorsk, formaterIrcak } from '../domain/thcTall'
import { hvorOfteForStor, marginvalg, somProsent } from '../domain/thcVisning'

/**
 * Forklaringene i fortolkningen av benzoylekgonin i urin: hva
 * sikkerhetsmarginen gjør med modellens egne CV-er, og beregningen bak
 * resultatet med tallene motoren brukte. Oppsettet er THC-syremodulens.
 */

/** «Hva er sikkerhetsmarginen?» under bryteren, med modellens måleusikkerhet. */
export function BeUrinMarginforklaring({ modell }: { modell: BeUrinModell }) {
  const { cv_benzoylekgonin, cv_kreatinin } = modell.maleusikkerhet
  return (
    <div className="thc-forklaring">
      <section className="thc-forklaring__bolk">
        <h3 className="thc-forklaring__tittel">Målinger ≠ sann verdi</h3>
        <div className="thc-forklaring__kropp">
          <p>
            Både benzoylekgonin og kreatinin måles med en viss usikkerhet, og dermed også endringen i Q mellom
            to prøver. Det er 50/50 om endringen måles høyere eller lavere enn den sanne.
          </p>
          <p>
            Modellen legger til grunn CV {somProsent(cv_benzoylekgonin)}&nbsp;% for benzoylekgonin og CV{' '}
            {somProsent(cv_kreatinin)}&nbsp;% for kreatinin. Det gir et log-standardavvik for ratioen mellom to
            prøver på {formaterRatio(logSd(modell))} (√(2·(CV²<sub>BE</sub> + CV²<sub>kreatinin</sub>))).
          </p>
        </div>
      </section>
      <section className="thc-forklaring__bolk">
        <h3 className="thc-forklaring__tittel">Hva marginen gjør</h3>
        <div className="thc-forklaring__kropp">
          <p>Den målte ratioen justeres ned, så vi er sikrere på at den ikke er for stor.</p>
          <dl className="thc-marginvalg">
            {modell.sikkerhetsmarginer.map(({ margin }) => (
              <div key={margin}>
                <dt>
                  {marginvalg(margin)}
                  {margin === modell.standard_sikkerhetsmargin && ' (standard)'}
                </dt>
                <dd>Ratioen som fortolkes, er for stor {hvorOfteForStor(margin)}.</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}

/**
 * Beregningen bak resultatet: Q i begge prøvene, døgnene, den målte og den
 * korrigerte ratioen, og hver profils terskel. Tallene er motorens.
 */
export function BeUrinBeregning({
  sammenligning: s,
  modell,
  forrigeDato,
  denneDato,
}: {
  sammenligning: BeUrinSammenligning
  modell: BeUrinModell
  forrigeDato: string
  denneDato: string
}) {
  const enhet = modell.enheter.kvotient
  const ekstrapolert = erEkstrapolert(s)
  return (
    <div className="thc-forklaring">
      <section className="thc-forklaring__bolk">
        <h3 className="thc-forklaring__tittel">Prøvene</h3>
        <div className="thc-forklaring__kropp">
          <ul>
            <li>
              Referanseprøven er forrige prøve ({formaterDatoNorsk(forrigeDato)}): Q<sub>1</sub> ={' '}
              {tallMedEnhet(formaterIrcak(s.fra), enhet)}.
            </li>
            <li>
              Denne prøven ({formaterDatoNorsk(denneDato)}): Q<sub>2</sub> = {tallMedEnhet(formaterIrcak(s.til), enhet)}.
            </li>
            <li>Tid mellom prøvene: d = {antallDogn(s.dager)} (kalenderdøgn).</li>
          </ul>
        </div>
      </section>
      <section className="thc-forklaring__bolk">
        <h3 className="thc-forklaring__tittel">Ratioen</h3>
        <div className="thc-forklaring__kropp">
          <ul>
            <li>
              Målt ratio Q<sub>2</sub>/Q<sub>1</sub> = {formaterRatio(s.maltRatio)} ({formaterProsent(prosentFor(s.maltRatio))}).
            </li>
            <li>
              Korrigert med {marginvalg(s.margin)} sikkerhetsmargin: {formaterRatio(s.korrigertRatio)} (
              {formaterProsent(prosentFor(s.korrigertRatio))}).
            </li>
          </ul>
        </div>
      </section>
      <section className="thc-forklaring__bolk">
        <h3 className="thc-forklaring__tittel">Profilene</h3>
        <div className="thc-forklaring__kropp">
          <ul>
            {s.profiler.map((p) => (
              <li key={p.navn}>
                {p.navn}: Q<sub>1</sub> ligger ved t = {formaterDogn(p.tidspunkt)} døgn på profilen. Etter{' '}
                {antallDogn(s.dager)} er terskelen {formaterRatio(p.terskel)} ({formaterProsent(prosentFor(p.terskel))}).
                Den korrigerte ratioen ligger {s.korrigertRatio > p.terskel ? 'over' : 'ikke over'} terskelen.
              </li>
            ))}
          </ul>
          <p>
            t er punktet på profilen der Q<sub>1</sub> står, ikke tiden siden inntak.
            {ekstrapolert &&
              ' Q₁ ligger over startverdien til minst én profil (t under 0). Terskelen er da regnet ved matematisk ekstrapolasjon av kurven, et område modellen ikke er dokumentert for.'}
          </p>
          <p>Resultatet er «{konklusjonISetning(s.konklusjon, null)}».</p>
        </div>
      </section>
    </div>
  )
}
