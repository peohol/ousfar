import type { Doseenhet } from '../../verktoy/motor/byggesteiner'
import { skiftetekst, type Planrad, type Planvisning } from '../../verktoy/planvisning'
import { Ikon } from '../ikon/Ikon'
import type { Ikonnavn } from '../ikon/register'

/** Symbolet for hver doseenhet i tidslinjen. */
const SYMBOL: Record<Doseenhet, Ikonnavn> = { tablett: 'tablet', kapsel: 'capsule', drape: 'dropper', injeksjon: 'syringe' }

/** Første dag uten dose for et legemiddel heter slik i planen (`planvisning`). */
const SEPONERT = 'Seponert'

/** Den siste raden er sluttmålet når hvert legemiddel i den er seponert. */
const erSlutt = (r: Planrad, i: number, rader: readonly Planrad[]) => r.type === 'periode' && rader.slice(i + 1).every((x) => x.type !== 'periode') && r.celler.every((c) => !c || c.dose === SEPONERT)

/**
 * Planen som en loddrett tidslinje (§7 og §8 i
 * `docs/verktøy-brukervennlighet-2026-11.md`, P3 i
 * `docs/verktøy-produktrevisjon-2026-11.md`): én rad per periode med dager
 * og datoer, dosen og hva som gis, med formskifter (med påminnelse om
 * resept), vurderingspunkter og injeksjoner som markeringer på linjen og
 * sluttmålet til slutt. Vurderingsradene er korte påminnelser med numrene i
 * «Vurderingspunkter» under tidslinjen. Den er en ordnet liste for
 * skjermlesere, og bygger på de samme radene som teksten som kopieres
 * (`planTekst`), så de sier det samme, celle for celle (S8): hvert legemiddel
 * står med navnet (for skjermlesere og i utskriften når det er ett) og
 * kolonnen sin (`data-kolonne`).
 */
export function Tidslinje({ plan }: { plan: Planvisning }) {
  const flere = plan.kolonner.length > 1
  const navn = (k: number) => (
    <span className={flere ? 'tidslinje__navn' : 'kun-skjermleser tidslinje__navn--utskrift'}>
      {plan.kolonner[k]!.navn} {plan.kolonner[k]!.administrasjon}
    </span>
  )
  return (
    <ol className="tidslinje" aria-label="Planen dag for dag">
      {plan.rader.map((r, i) => {
        const type = erSlutt(r, i, plan.rader) ? 'slutt' : r.type
        return (
          <li key={i} className="tidslinje__punkt" data-type={type}>
            <p className="tidslinje__nar">
              <span className="tidslinje__dager">{r.dager}</span>
              {r.datoer && <span className="tidslinje__datoer">{r.datoer}</span>}
            </p>
            <span className="tidslinje__merke" aria-hidden="true" />
            <div className="tidslinje__innhold">
              {r.type === 'vurdering' ? (
                <p className="tidslinje__vurdering" data-kolonne={r.kolonne}>
                  <strong>Vurdering{flere ? ` (${plan.kolonner[r.kolonne]!.navn})` : ''}:</strong> {r.tekst}
                </p>
              ) : r.type === 'injeksjon' ? (
                <div className="tidslinje__legemiddel" data-kolonne={r.kolonne}>
                  {navn(r.kolonne)}
                  <p className="tidslinje__dose">
                    <small>Injeksjon</small> {r.dose}
                  </p>
                  <ul className="tidslinje__gis">
                    <li>
                      <Ikon navn={SYMBOL[r.enhet]} />
                      {r.element}
                    </li>
                  </ul>
                  {r.detalj && <p className="tidslinje__avvik">{r.detalj}</p>}
                </div>
              ) : (
                r.celler.map(
                  (c, k) =>
                    c && (
                      <div key={k} className="tidslinje__legemiddel" data-kolonne={k}>
                        {navn(k)}
                        {c.skifte && <span className="tidslinje__skifte">{skiftetekst(c.skifte)}</span>}
                        <p className="tidslinje__dose">{c.dose}</p>
                        {c.elementer.length > 0 && (
                          <ul className="tidslinje__gis">
                            {c.elementer.map((e, j) => {
                              const enhet = c.enheter?.[j]
                              return (
                                <li key={e}>
                                  {enhet && <Ikon navn={SYMBOL[enhet]} />}
                                  {e}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    ),
                )
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
