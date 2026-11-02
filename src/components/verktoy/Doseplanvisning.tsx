import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useClipboard } from '../../hooks/useClipboard'
import { egneAdvarsler, planTekst, type Dosecelle, type Planvisning } from '../../verktoy/planvisning'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { FagligGrunnlag, plangrunnlag } from './FagligGrunnlag'

/**
 * En klinisk doseplan (P6.7): tabellen med dager og datoer, en kolonne per
 * virkestoff og depotinjeksjonene som egne rader. Rett under står det som
 * gjelder akkurat denne planen (de generelle forbeholdene, advarslene og
 * avvikene), og resten av det planen bygger på i den sammenleggbare delen
 * «Faglig grunnlag» (VDR-3). Den kan kopieres som tekst og skrives ut;
 * kopien har alt, og utskriften har bare planen med det faglige grunnlaget
 * åpnet (`verktoy.css`). Komponenten får bare en plan som er klinisk
 * ({@link Planvisning} fra `planvisning`), aldri en modellberegning.
 * `varsel` er et eventuelt faglig varsel for regelen planen er beregnet etter.
 */
export function Doseplanvisning({ plan, overskrift, varsel }: { plan: Planvisning; overskrift: string; varsel?: ReactNode }) {
  const tittel = useId()
  const del = useRef<HTMLElement>(null)
  const kopier = useClipboard()
  const [kopiert, setKopiert] = useState<'ja' | 'feil' | null>(null)
  const kolonnenavn = plan.kolonner.map((k) => `${k.navn} ${k.administrasjon}`)
  const advarsler = egneAdvarsler(plan)
  useUtskriftApner(del)

  return (
    <section ref={del} className="doseplan" aria-labelledby={tittel}>
      <header className="doseplan__hode">
        <p className="doseplan__overtittel">{overskrift}</p>
        <h2 id={tittel} className="doseplan__tittel">
          {plan.tittel}
        </h2>
        {plan.undertittel && <p className="doseplan__undertittel">{plan.undertittel}</p>}
        {varsel}
        <div className="doseplan__handlinger">
          <Button
            variant="kant"
            icon={<Ikon navn="copy" storrelse="ui" />}
            onClick={async () => setKopiert((await kopier(planTekst(plan, overskrift))) ? 'ja' : 'feil')}
          >
            Kopier planen
          </Button>
          <Button variant="kant" onClick={() => window.print()}>
            Skriv ut
          </Button>
          <p className="doseplan__kvittering" role="status">
            {kopiert === 'ja' ? 'Planen er kopiert.' : kopiert === 'feil' ? 'Fikk ikke kopiert. Merk teksten og kopier den selv.' : ''}
          </p>
        </div>
      </header>

      <div className="doseplan__tabell">
        {/* Rollene står uttrykkelig, så tabellen er en tabell for skjermlesere også når den
            stables på smale skjermer (`verktoy.css`). */}
        <table role="table">
          <caption className="kun-skjermleser">Doseplan dag for dag</caption>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                Når
              </th>
              {plan.kolonner.map((k) => (
                <th key={k.navn + k.administrasjon} scope="col" role="columnheader">
                  {k.navn} <span className="doseplan__administrasjon">{k.administrasjon}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {plan.rader.map((r, i) => (
              <tr key={i} role="row" data-type={r.type}>
                <th scope="row" role="rowheader">
                  <span className="doseplan__dager">{r.dager}</span>
                  {r.datoer && <span className="doseplan__datoer">{r.datoer}</span>}
                </th>
                {r.type === 'periode'
                  ? r.celler.map((c, j) => (
                      <td key={j} role="cell" data-kolonne={kolonnenavn[j]} data-tom={c ? undefined : ''}>
                        {c ? <Celle celle={c} /> : <span aria-label="Ingen dose">–</span>}
                      </td>
                    ))
                  : plan.kolonner.map((_, j) => (
                      <td key={j} role="cell" data-kolonne={kolonnenavn[j]} data-tom={j === r.kolonne ? undefined : ''}>
                        {j === r.kolonne && (
                          <span className="doseplan__injeksjon">
                            <Ikon navn="syringe" storrelse="ui" />
                            <span>
                              <strong>Injeksjon {r.dose}</strong>
                              <span className="doseplan__elementer">{r.element}</span>
                              {r.detalj && <span className="doseplan__avvik">{r.detalj}</span>}
                            </span>
                          </span>
                        )}
                      </td>
                    ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plan.forbehold.length > 0 && (
        <ul className="doseplan__forbehold" aria-label="Generelle forbehold">
          {plan.forbehold.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      <Liste tittel="Viktig for denne planen" linjer={advarsler} tone="advarsel" />
      <Liste tittel="Avvik fra regelens kurve" linjer={plan.avvik} />

      <FagligGrunnlag grunnlag={plangrunnlag(plan)} />
    </section>
  )
}

/**
 * Åpner de sammenleggbare delene i planen mens den skrives ut, så utskriften
 * har det faglige grunnlaget også når det er lukket på skjermen, og lukker
 * dem den åpnet igjen etterpå.
 */
function useUtskriftApner(del: RefObject<HTMLElement>) {
  useEffect(() => {
    let apnet: HTMLDetailsElement[] = []
    const foer = () => {
      apnet = [...(del.current?.querySelectorAll('details:not([open])') ?? [])] as HTMLDetailsElement[]
      for (const d of apnet) d.open = true
    }
    const etter = () => {
      for (const d of apnet) d.open = false
      apnet = []
    }
    window.addEventListener('beforeprint', foer)
    window.addEventListener('afterprint', etter)
    return () => {
      window.removeEventListener('beforeprint', foer)
      window.removeEventListener('afterprint', etter)
    }
  }, [del])
}

function Celle({ celle }: { celle: Dosecelle }) {
  return (
    <span className="doseplan__celle">
      <strong>{celle.dose}</strong>
      {celle.elementer.map((e) => (
        <span key={e} className="doseplan__elementer">
          {e}
        </span>
      ))}
      {celle.avvik && <span className="doseplan__avvik">{celle.avvik}</span>}
    </span>
  )
}

function Liste({ tittel, linjer, tone }: { tittel: string; linjer: readonly string[]; tone?: 'advarsel' }) {
  if (linjer.length === 0) return null
  return (
    <section className="doseplan__del" data-tone={tone}>
      <h3>{tittel}</h3>
      <ul>
        {linjer.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  )
}
