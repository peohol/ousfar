import { useMemo, useState, type ReactNode } from 'react'
import { BeUrinMangler } from './BeUrinDeler'
import { Details } from './Details'
import { ThcForklaring } from './ThcForklaring'
import { ThcPlot, ThcProfiltabell } from './ThcPlot'
import { fortolkThc, mildereVedHoyereMargin, type ThcInndata, type ThcModell, type ThcResultat } from '../domain/thcMotor'
import type { ThcVisning } from '../domain/thcPlot'
import type { ThcRegelsett } from '../domain/thcRegelsett'
import { THC_SAMLET_UTEN_TREFF, THC_VENTER, thcMildereMarginer, type MildereMarginer } from '../domain/thcVisning'

/**
 * Utfallet av en THC-fortolkning, slik fortolkningsmodulen og simulatoren på
 * redigeringssiden viser det (#586): kommentaren rett etter skjemaet, med det
 * som står under den (kopieringen i modulen), en kort merknad, profilene
 * med figuren, alltid åpne og uten overskrift (#592), og «Forklaring» lukket
 * under. Mens skjemaet ikke er ferdig, står bare en stille linje, eller
 * det som er galt utover det enkelte feltet.
 */

/**
 * Fortolkningen av skjemaet, og det høyere marginer ville gitt (#588), som
 * skjemaet viser i snakkebobler ved sikkerhetsmarginen. Delt av modulen og
 * simulatoren.
 */
export function useThcFortolkning(inndata: ThcInndata, modell: ThcModell): {
  resultat: ThcResultat
  mildere: MildereMarginer
} {
  const resultat = useMemo(() => fortolkThc(inndata, modell), [inndata, modell])
  const mildere = useMemo(
    () =>
      thcMildereMarginer(mildereVedHoyereMargin(inndata, modell, resultat), {
        samlet: resultat.type === 'kommentar' ? resultat.samlet : null,
        medTidligere: (inndata.tidligere ?? []).length > 0,
      }),
    [inndata, modell, resultat],
  )
  return { resultat, mildere }
}

export function ThcKommentar({
  resultat,
  handling,
}: {
  resultat: ThcResultat
  /** Det som står rett under kommentaren, som kopiknappen. */
  handling?: ReactNode
}) {
  if (resultat.type === 'mangler') return <BeUrinMangler feil={resultat.feil} venter={THC_VENTER} />

  return (
    <>
      <p className="kommentartekst">{resultat.kommentar}</p>
      {handling}
      {/* Den samlede vurderingen endret ikke noe, så kommentaren sier ikke
          noe om den; brukeren skal likevel vite at den ble gjort. Det en
          høyere margin ville gitt, står ved sikkerhetsmarginen (#588). */}
      {resultat.samletUtenNyttInntak && (
        <div className="thc-merknader">
          <p>{THC_SAMLET_UTEN_TREFF}</p>
        </div>
      )}
    </>
  )
}

/** Grunnlaget kurvene og forklaringen tegnes fra: fortolkningen mot en forrige prøve minst ett døgn før. */
function grafgrunnlag(resultat: ThcResultat) {
  return resultat.type === 'kommentar' && resultat.grunnlag && resultat.grunnlag.dager >= 1
    ? {
        grunnlag: resultat.grunnlag,
        konklusjon: resultat.konklusjon,
        samlet: resultat.samlet,
        samletUtenNyttInntak: resultat.samletUtenNyttInntak,
      }
    : null
}

/**
 * Valget av visualisering når det holdes utenfor, som i fortolkningsmodulen,
 * der det er lagret på brukeren.
 */
export interface ThcVisualiseringsvalg {
  visning: ThcVisning
  onVelg: (visning: ThcVisning) => void
}

/**
 * Profilene med figuren, alltid åpne og uten overskrift (#592), og
 * «Forklaring», lukket som standard, når det er noe å tegne. Tabellen over figuren er tegnforklaringen; under den
 * velges om denne prøven vises med den valgte sikkerhetsmarginen eller med
 * alle. Uten `valg` holder den valget selv, som i simulatoren.
 */
export function ThcSeksjoner({
  resultat,
  regler,
  valg,
}: {
  resultat: ThcResultat
  regler: ThcRegelsett
  valg?: ThcVisualiseringsvalg | undefined
}) {
  const [egetValg, setEgetValg] = useState<ThcVisning>('valgt')
  const visning = valg ? valg.visning : egetValg
  const velg = valg ? valg.onVelg : setEgetValg
  const graf = grafgrunnlag(resultat)
  if (!graf) return null
  return (
    <div className="be-seksjoner">
      <div className="be-profiler">
        <ThcProfiltabell grunnlag={graf.grunnlag} regler={regler} />
        <label className="avkryssing be-alle-marginer">
          <input
            type="checkbox"
            checked={visning === 'alle'}
            onChange={(e) => velg(e.target.checked ? 'alle' : 'valgt')}
          />
          Vis alle sikkerhetsmarginer
        </label>
        <ThcPlot grunnlag={graf.grunnlag} regler={regler} alleMarginer={visning === 'alle'} />
      </div>
      <Details summary="Forklaring">
        <ThcForklaring
          grunnlag={graf.grunnlag}
          konklusjon={graf.konklusjon}
          samlet={graf.samlet}
          samletUtenNyttInntak={graf.samletUtenNyttInntak}
          regler={regler}
        />
      </Details>
    </div>
  )
}
