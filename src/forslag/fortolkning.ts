import type { Laboratorieanalytt } from '../domain/analyttkatalog'
import type { Kommentarinnhold } from '../domain/kommentarobjekt'
import { scenariomoduler } from '../domain/rus'
import { erThcAnalytt } from '../domain/thc'
import type { Regeldata, Regelgrunnlag, Utgave } from '../faginnhold/lesing'
import type { Forslagsvalg } from './modell'

const SKILLE = ' · '

/** Hva reglene for analyttene i en fortolkning leses etter. */
export function regelgrunnlag(analytter: readonly Laboratorieanalytt[]): Regelgrunnlag {
  return {
    koder: analytter.map((a) => a.kode),
    moduler: scenariomoduler(analytter.map((a) => a.fortolkning)).map((m) => m.id),
    medThc: analytter.some((a) => erThcAnalytt(a.fortolkning)),
  }
}

/** Et regelsett med kommentarene, slik det leses (`Regelsettutgave` og søsknene). */
interface Regelsettet {
  regelsett: Utgave<unknown>
  kommentarer: readonly Utgave<Kommentarinnhold>[]
}

/**
 * Det et forslag kan gjelde i en fortolkning: hvert publisert regelsett som
 * helhet, så hver publisert kommentar det bruker, med teksten slik den står.
 * `sidenavn` er fortolkningens navn, f.eks. «Fortolkning av Bupropion».
 */
export function forslagsvalgForFortolkning(sidenavn: string, regler: Regeldata): Forslagsvalg[] {
  const sett: [string, Regelsettet][] = [
    ...Object.entries(regler.regelsett).map(([kode, r]): [string, Regelsettet] => [`Reglene for ${kode}`, r]),
    ...(regler.thcregelsett ? [['THC-syrereglene', regler.thcregelsett] as [string, Regelsettet]] : []),
    ...Object.entries(regler.scenarioregelsett).map(([modul, r]): [string, Regelsettet] => [`Scenarioreglene for ${modul}`, r]),
  ]
  return sett.flatMap(([navn, { regelsett, kommentarer }]) => {
    if (regelsett.publisert_revisjon === null) return []
    const helhet: Forslagsvalg = {
      ressurs: regelsett.id,
      element: null,
      grunnrevisjon: regelsett.publisert_revisjon,
      sted: [sidenavn, navn].join(SKILLE),
      etikett: navn,
    }
    const enkelt = kommentarer.flatMap((k): Forslagsvalg[] =>
      k.publisert_revisjon === null
        ? []
        : [
            {
              ressurs: regelsett.id,
              element: k.id,
              grunnrevisjon: k.publisert_revisjon,
              sted: [sidenavn, navn, k.innhold.navn].join(SKILLE),
              utdrag: k.innhold.tekst,
              etikett: `${navn}${SKILLE}${k.innhold.navn}`,
            },
          ],
    )
    return [helhet, ...enkelt]
  })
}
