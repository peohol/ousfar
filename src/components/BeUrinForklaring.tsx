import { logSd, type BeUrinSammenligning } from '../domain/beUrinMotor'
import type { BeUrinFellesmodell, BeUrinModell } from '../domain/beUrinModell'
import { BE_URIN_GRADGRENSER, type BeUrinProfilsammenligning, type BeUrinProfilvurdering } from '../domain/beUrinProfiler'
import { BE_URIN_GRADTEKST, BE_URIN_LIKE_BI, BE_URIN_ROLLENAVN, formaterLogRatio } from '../domain/beUrinProfilvisning'
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
export function BeUrinMarginforklaring({ modell }: { modell: BeUrinFellesmodell }) {
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
  const ekstrapolert = erEkstrapolert(s)
  return (
    <div className="thc-forklaring">
      <Provebolker s={s} enhet={modell.enheter.kvotient} forrigeDato={forrigeDato} denneDato={denneDato} />
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

/** Prøvene og ratioen, delt mellom formene. */
function Provebolker({
  s,
  enhet,
  forrigeDato,
  denneDato,
}: {
  s: { fra: number; til: number; dager: number; margin: number; maltRatio: number; korrigertRatio: number; logKorrigert?: number }
  enhet: string
  forrigeDato: string
  denneDato: string
}) {
  const korrigert = s.logKorrigert === undefined ? formaterRatio(s.korrigertRatio) : formaterLogRatio(s.logKorrigert)
  return (
    <>
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
              Målt ratio R<sub>målt</sub> = Q<sub>2</sub>/Q<sub>1</sub> = {formaterRatio(s.maltRatio)} (
              {formaterProsent(prosentFor(s.maltRatio))}).
            </li>
            <li>
              Korrigert med {marginvalg(s.margin)} sikkerhetsmargin: R<sub>korr</sub> = {korrigert} (
              {formaterProsent(prosentFor(s.korrigertRatio))}).
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}

/** Hvordan terskelen for en profil er regnet, med enhetene. */
function terskelgrunnlag(v: BeUrinProfilvurdering): string {
  const p = v.profil
  if (p.type === 'mono') return `monoeksponentiell, R = e^(−k·d) med k = ${formaterRatio(p.k)} per døgn`
  const navn = p.id === 'bi_a' ? 'A' : 'B'
  return `bieksponentiell (profil ${navn}). Q₁ ligger ved t = ${formaterDogn(v.tidspunkt!)} døgn på profilen, og R = C(t + d)/Q₁`
}

/**
 * Beregningen bak resultatet med fem profiler (modellform 2): Q i begge
 * prøvene, døgnene, R_målt og R_korr, og for hver profil terskelen R, F og
 * graden. Tallene er motorens.
 */
export function BeUrinProfilberegning({
  sammenligning: s,
  modell,
  forrigeDato,
  denneDato,
}: {
  sammenligning: BeUrinProfilsammenligning
  modell: BeUrinFellesmodell
  forrigeDato: string
  denneDato: string
}) {
  const ekstrapolert = erEkstrapolert(s)
  return (
    <div className="thc-forklaring">
      <Provebolker s={s} enhet={modell.enheter.kvotient} forrigeDato={forrigeDato} denneDato={denneDato} />
      <section className="thc-forklaring__bolk">
        <h3 className="thc-forklaring__tittel">Profilene</h3>
        <div className="thc-forklaring__kropp">
          <ul>
            {s.profiler.map((v) => (
              <li key={v.rolle}>
                <strong>{BE_URIN_ROLLENAVN[v.rolle]}</strong>: {terskelgrunnlag(v)}. Etter {antallDogn(s.dager)} er
                terskelen R = {formaterLogRatio(v.logTerskel)} ({formaterProsent(prosentFor(v.terskel))}). F = R
                <sub>korr</sub>/R = {formaterLogRatio(v.logF)}: {BE_URIN_GRADTEKST[v.grad]}.
              </li>
            ))}
          </ul>
          <p>
            Hver profil vurderes for seg: under (F &lt; 1), på nivå med (F = 1), over (1 &lt; F ≤{' '}
            {BE_URIN_GRADGRENSER.over}), langt over ({BE_URIN_GRADGRENSER.over} &lt; F ≤ {BE_URIN_GRADGRENSER.langtOver}) og
            svært langt over (F &gt; {BE_URIN_GRADGRENSER.langtOver}). Hvilken av de to bieksponentielle profilene som er treg
            og hvilken som er ekstrem, avgjøres for disse prøvene: den med høyest terskel er ekstrem.
            {s.likeBi && s.dager > 0 && ` ${BE_URIN_LIKE_BI}`}
          </p>
          <p>
            t er punktet på profilen der Q<sub>1</sub> står, ikke tiden siden inntak.
            {ekstrapolert &&
              ' Q₁ ligger over startverdien til minst én bieksponentiell profil (t under 0). Terskelen er da regnet ved matematisk ekstrapolasjon av kurven, et område modellen ikke er dokumentert for.'}
          </p>
        </div>
      </section>
    </div>
  )
}
