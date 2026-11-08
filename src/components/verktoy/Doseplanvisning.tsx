import { useId, useState, type ReactNode } from 'react'
import { useClipboard } from '../../hooks/useClipboard'
import { planTekst, STANDARDDELER, type Planvisning } from '../../verktoy/planvisning'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { FagligGrunnlag, plangrunnlag } from './FagligGrunnlag'
import { Tidslinje } from './Tidslinje'

/** Kopiene planen kan gis som: standardplanen, eller standardplanen med hele det faglige grunnlaget. */
export const KOPIER = {
  kort: { knapp: 'Kopier planen', kvittering: 'Planen er kopiert.' },
  utvidet: { knapp: 'Kopier med faglig grunnlag', kvittering: 'Planen er kopiert med faglig grunnlag.' },
} as const

/**
 * En klinisk doseplan (P3 i `docs/verktøy-produktrevisjon-2026-11.md`):
 * standardplanen øverst — hva planen er, utgangspunktet og sluttmålet, det
 * den forutsetter, tidslinjen med doser, hva som gis, formskifter og
 * vurderingspunkter, deretter preparatene og resepten planen trenger,
 * vurderingspunktene i sin helhet, det som gjelder akkurat denne planen og
 * forbeholdene. Det faglige grunnlaget (avvik, antakelser, usikkerhet, hele
 * preparatlisten, kontroller, godkjenning, kilder og versjoner) står i den
 * sammenleggbare delen nederst.
 *
 * «Kopier planen» gir standardplanen som tekst (`planTekst`), «Kopier med
 * faglig grunnlag» det samme med hele grunnlaget. «Skriv ut» skriver ut det
 * som vises: standardplanen, og grunnlaget bare når det er åpnet. Komponenten
 * får bare en plan som er klinisk ({@link Planvisning} fra `planvisning`),
 * aldri en modellberegning. `varsel` er et eventuelt faglig varsel for regelen.
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
  const kopier = useClipboard()
  const [kopiert, setKopiert] = useState<{ hva: keyof typeof KOPIER; ok: boolean } | null>(null)
  const kopierknapp = (hva: keyof typeof KOPIER) => (
    <Button
      variant="kant"
      icon={hva === 'kort' ? <Ikon navn="copy" storrelse="ui" /> : undefined}
      onClick={async () => setKopiert({ hva, ok: await kopier(planTekst(plan, overskrift, forutsatt, hva === 'utvidet')) })}
    >
      {KOPIER[hva].knapp}
    </Button>
  )

  return (
    <section className="doseplan" aria-labelledby={tittel}>
      <header className="doseplan__hode">
        <h2 id={tittel} className="doseplan__tittel">
          {plan.tittel}
        </h2>
        {plan.undertittel && <p className="doseplan__undertittel">{plan.undertittel}</p>}
        <p className="doseplan__utfall" data-komplett={plan.utfall.komplett ? '' : undefined}>
          <Ikon navn={plan.utfall.komplett ? 'done' : 'sev'} storrelse="ui" />
          <span>{plan.utfall.tekst}</span>
        </p>
        {plan.utgangspunkt && (
          <p className="doseplan__utgangspunkt">
            <span>Utgangspunkt:</span> {plan.utgangspunkt}.
          </p>
        )}
        {varsel}
        <div className="doseplan__handlinger">
          {kopierknapp('kort')}
          {kopierknapp('utvidet')}
          <Button variant="kant" onClick={() => window.print()}>
            Skriv ut
          </Button>
          <p className="doseplan__kvittering" role="status">
            {kopiert ? (kopiert.ok ? KOPIER[kopiert.hva].kvittering : 'Fikk ikke kopiert. Merk teksten og kopier den selv.') : ''}
          </p>
        </div>
      </header>

      {forutsatt.length > 0 && (
        <ul className="doseplan__forbehold" aria-label="Forutsetninger for planen">
          {forutsatt.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}

      <Tidslinje plan={plan} />

      {STANDARDDELER.map((d) => (
        <Liste key={d.felt} tittel={d.tittel} linjer={plan[d.felt]} nummerert={'nummerert' in d && d.nummerert} tone={d.felt === 'viktig' ? 'advarsel' : d.felt === 'forbehold' ? 'dempet' : undefined} />
      ))}
      <p className="doseplan__spor">{plan.spor}</p>

      <FagligGrunnlag grunnlag={plangrunnlag(plan)} />
    </section>
  )
}

function Liste({ tittel, linjer, tone, nummerert }: { tittel: string; linjer: readonly string[]; tone?: 'advarsel' | 'dempet'; nummerert?: boolean }) {
  const id = useId()
  if (linjer.length === 0) return null
  const Liste = nummerert ? 'ol' : 'ul'
  return (
    <section className="doseplan__del" data-tone={tone} aria-labelledby={id}>
      <h3 id={id}>{tittel}</h3>
      <Liste>
        {linjer.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </Liste>
    </section>
  )
}
