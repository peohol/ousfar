import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useClipboard } from '../../hooks/useClipboard'
import { egneAdvarsler, planTekst, type Planvisning } from '../../verktoy/planvisning'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { FagligGrunnlag, plangrunnlag } from './FagligGrunnlag'
import { Tidslinje } from './Tidslinje'

/** Forbeholdet ved preparatlisten: FEST sier hva som er markedsført, ikke hva apoteket har. */
export const LAGERFORBEHOLD = 'Preparatene er hentet fra FEST da planen ble laget. Lagerstatus på apoteket er ikke kontrollert.'

/**
 * En klinisk doseplan (§7 i `docs/verktøy-brukervennlighet-2026-11.md`):
 * øverst hva planen er og det den forutsetter, så tidslinjen med doser,
 * hva som gis, formskifter, vurderingspunkter og sluttmålet, deretter det
 * som gjelder akkurat denne planen, oppfølgingen og preparatene. Kildene og
 * versjonene står i den sammenleggbare delen nederst, som åpnes ved utskrift.
 * «Kopier planen» gir hele planen som tekst (`planTekst`, S8), med det flyten
 * har forutsatt. Komponenten får bare en plan som er klinisk
 * ({@link Planvisning} fra `planvisning`), aldri en modellberegning.
 * `varsel` er et eventuelt faglig varsel for regelen.
 */
export function Doseplanvisning({
  plan,
  overskrift,
  varsel,
  forutsatt = [],
}: {
  plan: Planvisning
  overskrift: string
  varsel?: ReactNode
  /** Avledede svar og forbehold fra flyten (§4.1), øverst i planen og i kopien. */
  forutsatt?: readonly string[]
}) {
  const tittel = useId()
  const del = useRef<HTMLElement>(null)
  const kopier = useClipboard()
  const [kopiert, setKopiert] = useState<'ja' | 'feil' | null>(null)
  const advarsler = egneAdvarsler(plan)
  useUtskriftApner(del)

  return (
    <section ref={del} className="doseplan" aria-labelledby={tittel}>
      <header className="doseplan__hode">
        <h2 id={tittel} className="doseplan__tittel">
          {plan.tittel}
        </h2>
        {plan.undertittel && <p className="doseplan__undertittel">{plan.undertittel}</p>}
        <p className="doseplan__utfall" data-komplett={plan.utfall.komplett ? '' : undefined}>
          <Ikon navn={plan.utfall.komplett ? 'done' : 'sev'} storrelse="ui" />
          <span>{plan.utfall.tekst}</span>
        </p>
        {varsel}
        <div className="doseplan__handlinger">
          <Button variant="kant" icon={<Ikon navn="copy" storrelse="ui" />} onClick={async () => setKopiert((await kopier(planTekst(plan, overskrift, forutsatt))) ? 'ja' : 'feil')}>
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

      {(forutsatt.length > 0 || plan.forbehold.length > 0) && (
        <ul className="doseplan__forbehold" aria-label="Forutsetninger for planen">
          {[...forutsatt, ...plan.forbehold].map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}

      <Tidslinje plan={plan} />

      <Liste tittel="Viktig for denne planen" linjer={advarsler} tone="advarsel" />
      <Liste tittel="Oppfølging" linjer={plan.vurderinger} />
      <Liste tittel="Avvik fra regelens kurve" linjer={plan.avvik} />
      <Liste tittel="Preparater planen bruker" linjer={plan.preparater} merknad={LAGERFORBEHOLD} />

      {/* Preparatene står i planen over, ikke en gang til her. */}
      <FagligGrunnlag grunnlag={{ ...plangrunnlag(plan), preparater: undefined }} />
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
      apnet = [...(del.current?.querySelectorAll('.faglig-grunnlag details:not([open])') ?? [])] as HTMLDetailsElement[]
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

function Liste({ tittel, linjer, tone, merknad }: { tittel: string; linjer: readonly string[]; tone?: 'advarsel'; merknad?: string }) {
  if (linjer.length === 0) return null
  return (
    <section className="doseplan__del" data-tone={tone}>
      <h3>{tittel}</h3>
      <ul>
        {linjer.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {merknad && <p className="doseplan__merknad">{merknad}</p>}
    </section>
  )
}
