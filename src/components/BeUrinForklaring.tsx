import type { BeUrinSammenligning } from '../domain/beUrinMotor'
import type { BeUrinFellesmodell, BeUrinModell } from '../domain/beUrinModell'
import type { BeUrinProfilresultat } from '../domain/beUrinProfiler'
import { beUrinForklaring } from '../domain/beUrinProfilforklaring'
import { prosentFor } from '../domain/beUrinPlot'
import { antallDogn, erEkstrapolert, formaterDogn, formaterRatio, konklusjonISetning, tallMedEnhet } from '../domain/beUrinVisning'
import { formaterProsent } from '../domain/thcPlot'
import { formaterDatoNorsk, formaterIrcak } from '../domain/thcTall'
import { marginvalg } from '../domain/thcVisning'

/**
 * Forklaringene i fortolkningen av benzoylekgonin i urin: beregningen bak
 * resultatet med form 1 (tallene
 * motoren brukte), og forklaringen i vanlig språk med form 2 (#576).
 */

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

/** « (−31 %)», eller ingenting når ratioen er utenfor flyttallene. */
function prosentTekst(ratio: number): string {
  const prosent = prosentFor(ratio)
  return Number.isFinite(prosent) ? ` (${formaterProsent(prosent)})` : ''
}

/** Prøvene og ratioen, delt mellom formene. */
function Provebolker({
  s,
  enhet,
  forrigeDato,
  denneDato,
}: {
  s: {
    fra: number
    til: number
    dager: number
    margin: number
    maltRatio: number
    korrigertRatio: number
  }
  enhet: string
  forrigeDato: string
  denneDato: string
}) {
  const ratio = (verdi: number) => `${formaterRatio(verdi)}${prosentTekst(verdi)}`
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
              Målt ratio R<sub>målt</sub> = Q<sub>2</sub>/Q<sub>1</sub> = {ratio(s.maltRatio)}.
            </li>
            <li>
              Korrigert med {marginvalg(s.margin)} sikkerhetsmargin: R<sub>korr</sub> = {ratio(s.korrigertRatio)}.
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}

/**
 * Forklaringen bak vurderingene med fem profiler (#576), i fire korte bolker
 * etter mønster fra THC-syremodulen: hvor stor endringen er, måleusikkerheten,
 * hva som kunne ventes uten et nytt inntak, og hvorfor vurderingene ble som de
 * ble. Teksten lages av resultatet (`beUrinProfilforklaring.ts`).
 */
export function BeUrinProfilforklaring({
  resultat,
  modell,
  tidligereProver,
}: {
  resultat: Extract<BeUrinProfilresultat, { type: 'vurdering' }>
  modell: BeUrinFellesmodell
  tidligereProver: number
}) {
  const f = beUrinForklaring(resultat, modell.enheter.kvotient, tidligereProver)
  const bolker: [string, string[]][] = [
    ['Hvor stor er endringen mellom prøvene?', f.endring],
    ['Hvordan er det tatt hensyn til måleusikkerhet?', f.maleusikkerhet],
    ['Hva kan forventes dersom det ikke har skjedd et nytt inntak?', f.forventet],
    ['Hvorfor blir konklusjonen slik?', f.hvorfor],
  ]
  return (
    <div className="thc-forklaring">
      {bolker.map(([tittel, avsnitt]) => (
        <section key={tittel} className="thc-forklaring__bolk">
          <h3 className="thc-forklaring__tittel">{tittel}</h3>
          <div className="thc-forklaring__kropp">
            {avsnitt.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
