import { useState, type ReactNode } from 'react'
import { BeUrinMangler } from './BeUrinDeler'
import { Details } from './Details'
import { ThcForklaring } from './ThcForklaring'
import { ThcPlot, ThcProfiltabell } from './ThcPlot'
import type { ThcMildereUtfall, ThcResultat } from '../domain/thcMotor'
import type { ThcVisning } from '../domain/thcPlot'
import type { ThcRegelsett } from '../domain/thcRegelsett'
import { THC_SAMLET_UTEN_TREFF, THC_VENTER, mildereMargintekst } from '../domain/thcVisning'

/**
 * Utfallet av en THC-fortolkning, slik fortolkningsmodulen og simulatoren på
 * redigeringssiden viser det (#586): kommentaren rett etter skjemaet, med det
 * som står under den (kopieringen i modulen), korte merknader, og
 * «Utskillelsesprofiler og figur» og «Forklaring» lukket under hver sin
 * overskrift. Mens skjemaet ikke er ferdig, står bare en stille linje, eller
 * det som er galt utover det enkelte feltet.
 */

export function ThcKommentar({
  resultat,
  mildere = [],
  medTidligere = false,
  handling,
}: {
  resultat: ThcResultat
  /** De mildere utfallene høyere marginer gir ({@link mildereVedHoyereMargin}). */
  mildere?: ThcMildereUtfall[]
  /** Det står tidligere prøver i skjemaet, så den samlede vurderingen gjøres ved «kan ikke fastslås». */
  medTidligere?: boolean
  /** Det som står rett under kommentaren, som kopiknappen. */
  handling?: ReactNode
}) {
  if (resultat.type === 'mangler') return <BeUrinMangler feil={resultat.feil} venter={THC_VENTER} />

  return (
    <>
      <p className="kommentartekst">{resultat.kommentar}</p>
      {handling}
      {(resultat.samletUtenNyttInntak || mildere.length > 0) && (
        <div className="thc-merknader">
          {/* Den samlede vurderingen endret ikke noe, så kommentaren sier ikke
              noe om den; brukeren skal likevel vite at den ble gjort. */}
          {resultat.samletUtenNyttInntak && <p>{THC_SAMLET_UTEN_TREFF}</p>}
          {/* Det en høyere margin ville gitt. Brukeren velger selv; det er
              ingen knapp, og det sies aldri at en lavere margin gir noe
              strengere. */}
          {mildere.map((u) => (
            <p key={`${u.konklusjon}|${u.samlet?.dato ?? ''}`}>
              {mildereMargintekst(u, { samlet: resultat.samlet, medTidligere })}
            </p>
          ))}
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
 * «Utskillelsesprofiler og figur» og «Forklaring», lukket som standard, når
 * det er noe å tegne. Tabellen over figuren er tegnforklaringen; under den
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
      <Details summary="Utskillelsesprofiler og figur">
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
      </Details>
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
