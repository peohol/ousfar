import { useId, useState } from 'react'
import { useClipboard } from '../../hooks/useClipboard'
import { PLANDELER, planTekst, type Dosecelle, type Planvisning } from '../../verktoy/planvisning'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'

/**
 * En klinisk doseplan (P6.7): tabellen med dager og datoer, en kolonne per
 * virkestoff og depotinjeksjonene som egne rader, og under den det planen
 * bygger på. Den kan kopieres som tekst og skrives ut; utskriften har bare
 * planen (`verktoy.css`). Komponenten får bare en plan som er klinisk
 * ({@link Planvisning} fra `planvisning`), aldri en modellberegning.
 */
export function Doseplanvisning({ plan, overskrift }: { plan: Planvisning; overskrift: string }) {
  const tittel = useId()
  const kopier = useClipboard()
  const [kopiert, setKopiert] = useState<'ja' | 'feil' | null>(null)
  const kolonnenavn = plan.kolonner.map((k) => `${k.navn} ${k.administrasjon}`)

  return (
    <section className="doseplan" aria-labelledby={tittel}>
      <header className="doseplan__hode">
        <p className="doseplan__overtittel">{overskrift}</p>
        <h2 id={tittel} className="doseplan__tittel">
          {plan.tittel}
        </h2>
        {plan.undertittel && <p className="doseplan__undertittel">{plan.undertittel}</p>}
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

      {PLANDELER.map((d) => (
        <Liste key={d.felt} tittel={d.tittel} linjer={plan[d.felt]} tone={'tone' in d ? d.tone : undefined} />
      ))}

      {plan.kilder.length > 0 && (
        <section className="doseplan__del">
          <h3>Kilder</h3>
          <ul>
            {plan.kilder.map((k) => (
              <li key={k.url + k.tittel}>
                <a href={k.url} target="_blank" rel="noreferrer">
                  {k.tittel}
                </a>{' '}
                <span className="doseplan__kilde">
                  {k.utgiver}, {k.versjon}
                  {k.steder.length > 0 && ` – ${k.steder.join('; ')}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Liste tittel="Versjoner" linjer={plan.versjoner} tone="spor" />
    </section>
  )
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

function Liste({ tittel, linjer, tone }: { tittel: string; linjer: readonly string[]; tone?: 'advarsel' | 'spor' }) {
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
