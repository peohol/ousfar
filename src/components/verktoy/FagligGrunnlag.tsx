import { godkjenningstekst, kildeliste, type Plankilde, type Planvisning } from '../../verktoy/planvisning'
import type { Regel } from '../../verktoy/regler/modell'
import { Details } from '../Details'

/**
 * Det et forslag bygger på, samlet ett sted (VDR-3 i
 * `docs/verktøy-omlegging-2026-11.md`, P3 i
 * `docs/verktøy-produktrevisjon-2026-11.md`): godkjenningen, forutsetningene,
 * usikkerheten og kildene, og for en beregnet plan også avvikene fra regelens
 * kurve, det beregningen kontrollerte, hele preparatlisten, preparatene som
 * ikke brukes og versjonene. Teksten er den samme som før; bare plasseringen
 * er ny, så standardplanen holder seg til det klinikeren trenger for å
 * gjennomføre behandlingen.
 */
export interface Grunnlag {
  godkjenning: string | null
  forutsetninger: readonly string[]
  usikkerhet: readonly string[]
  kilder: readonly Plankilde[]
  /** Bare for en beregnet plan. */
  avvik?: readonly string[]
  kontroller?: readonly string[]
  preparater?: readonly string[]
  ikkeBrukt?: readonly string[]
  versjoner?: readonly string[]
}

/** Grunnlaget for en regel før noe er beregnet, eller for en regel som bare gir fagtekst. */
export const regelgrunnlag = (regel: Regel): Grunnlag => ({
  godkjenning: godkjenningstekst(regel),
  forutsetninger: regel.fortolkning.forutsetninger,
  usikkerhet: regel.fortolkning.usikkerhet,
  kilder: kildeliste(regel),
})

/** Grunnlaget for en beregnet plan. */
export const plangrunnlag = (p: Planvisning): Grunnlag => ({
  godkjenning: p.godkjenning,
  forutsetninger: p.antakelser,
  usikkerhet: p.usikkerhet,
  kilder: p.kilder,
  avvik: p.avvik,
  kontroller: p.kontroller,
  preparater: p.preparater,
  ikkeBrukt: p.ikkeBrukt,
  versjoner: p.versjoner,
})

/** Det verktøyet alltid gjør, uansett regel. */
export const SLIK_VIRKER_DET =
  'OUSFAR beregner bare etter regler som er kontrollert og klinisk godkjent, og bare i omfanget de er godkjent for. Utenfor omfanget gir verktøyet ingen plan, og sier hvorfor. Et forslag erstatter ikke klinisk vurdering av den enkelte pasient.'

/** Delene i rekkefølgen de står i, med én setning om hva hver del er. */
const DELER = [
  { felt: 'avvik', tittel: 'Avvik fra regelens kurve', forklaring: 'Der dosen som kan gis med norske preparater, avviker fra den beregnede dosen.' },
  { felt: 'forutsetninger', tittel: 'Forutsetninger', forklaring: 'Det regelen bygger på om pasienten og behandlingen.' },
  { felt: 'usikkerhet', tittel: 'Usikkerhet og begrensninger', forklaring: 'Det kunnskapsgrunnlaget ikke avgjør, og som må vurderes for den enkelte pasient.' },
  { felt: 'kontroller', tittel: 'Kontrollert ved beregningen', forklaring: 'Svarene og kravene planen ble kontrollert mot.' },
  { felt: 'preparater', tittel: 'Preparater fra FEST', forklaring: 'Preparatene planen bygger på, slik FEST viste dem da planen ble beregnet.' },
  { felt: 'ikkeBrukt', tittel: 'Preparater i FEST som ikke brukes', forklaring: 'Preparater av legemidlene som planen ikke bruker, med grunnen.' },
] as const satisfies readonly { felt: keyof Grunnlag; tittel: string; forklaring: string }[]

/** Overskriften på grunnlaget under en beregnet plan, og under en regel uten plan. */
export const GRUNNLAG_PLAN = 'Faglig grunnlag og kilder'
export const GRUNNLAG_REGEL = 'Kilder og grunnlag'

/**
 * Grunnlaget nederst i planen eller fagteksten: lukket til forskriveren åpner
 * det, og bare med i utskriften når det er åpnet (`Doseplanvisning`). Det
 * heter {@link GRUNNLAG_PLAN} når en beregnet plan har versjonene, ellers
 * {@link GRUNNLAG_REGEL}.
 */
export function FagligGrunnlag({ grunnlag }: { grunnlag: Grunnlag }) {
  return (
    <div className="faglig-grunnlag">
      <Details summary={(grunnlag.versjoner ?? []).length > 0 ? GRUNNLAG_PLAN : GRUNNLAG_REGEL} ikon="refs">
        <div className="faglig-grunnlag__innhold">
          <section className="faglig-grunnlag__del">
            <h3>Slik er forslaget laget</h3>
            <p>{SLIK_VIRKER_DET}</p>
            {grunnlag.godkjenning && <p className="faglig-grunnlag__godkjenning">{grunnlag.godkjenning}</p>}
          </section>
          {DELER.map((d) => {
            const linjer = grunnlag[d.felt] ?? []
            return (
              linjer.length > 0 && (
                <section key={d.felt} className="faglig-grunnlag__del">
                  <h3>{d.tittel}</h3>
                  <p className="faglig-grunnlag__forklaring">{d.forklaring}</p>
                  <ul>
                    {linjer.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </section>
              )
            )
          })}
          {grunnlag.kilder.length > 0 && (
            <section className="faglig-grunnlag__del">
              <h3>Kilder</h3>
              <ul>
                {grunnlag.kilder.map((k) => (
                  <li key={k.url + k.tittel}>
                    <a href={k.url} target="_blank" rel="noreferrer">
                      {k.tittel}
                    </a>{' '}
                    <span className="faglig-grunnlag__kilde">
                      {k.utgiver}, {k.versjon}
                      {k.steder.length > 0 && ` – ${k.steder.join('; ')}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(grunnlag.versjoner ?? []).length > 0 && (
            <section className="faglig-grunnlag__del" data-tone="spor">
              <h3>Sporbarhet</h3>
              <p className="faglig-grunnlag__forklaring">Versjonene av regelen og dataene planen ble beregnet med, til kontroll og etterprøving.</p>
              <ul>
                {grunnlag.versjoner!.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Details>
    </div>
  )
}
