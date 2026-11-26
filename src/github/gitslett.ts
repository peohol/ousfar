/**
 * Sletting av en gren i fjernrepoet bare når den fortsatt står på commiten
 * som ble vurdert: `git push --force-with-lease=<ref>:<sha>` med en tom
 * kilde. Git avviser slettingen atomisk om noen har pushet til grenen siden,
 * så en commit ingen opprydding har sett, slettes aldri. Brukes av
 * kurateringskøen og oppryddingene av grener.
 *
 * Feiler pushen, leses grenen i fjernrepoet for å skille en avvist lease
 * (grenen har flyttet seg eller er borte) fra en driftsfeil (grenen står
 * uendret, eller den kan ikke leses). En driftsfeil kastes, så kalleren
 * stopper og feilen blir synlig. Meldingen tar ikke med git-utskriften, der
 * adressen og legitimasjonen kan stå.
 *
 * Mappen er en klone med `origin` og legitimasjon til å skrive (i Actions:
 * `actions/checkout` med legitimasjonen, i en egen mappe der ingenting kjøres).
 */
import { execFileSync } from 'node:child_process'

/** `endret`: grenen står på en annen commit; `borte`: noen andre har slettet den. */
export type Slettutfall = 'slettet' | 'endret' | 'borte'

/** Kaster ved en driftsfeil; da er ingenting slettet av denne kallet. */
export type Grensletter = (gren: string, sha: string) => Slettutfall

const SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/

export function lagGrensletter(mappe: string, miljo: NodeJS.ProcessEnv = process.env): Grensletter {
  const git = (args: string[]) =>
    execFileSync('git', ['-C', mappe, ...args], { env: { ...miljo, GIT_TERMINAL_PROMPT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8')
  return (gren, sha) => {
    if (!SHA.test(sha)) throw new Error(`Ugyldig commit for ${gren}: ${sha}`)
    try {
      git(['push', '-q', `--force-with-lease=refs/heads/${gren}:${sha}`, 'origin', `:refs/heads/${gren}`])
      return 'slettet'
    } catch {
      // Hvor står grenen nå? Kan det ikke leses, er det en driftsfeil.
    }
    let na: string
    try {
      na = git(['ls-remote', '--heads', 'origin', `refs/heads/${gren}`]).split('\t')[0]!.trim()
    } catch {
      throw new Error(`Git kunne ikke slette ${gren}, og grenen kunne ikke leses etterpå. Ingen flere grener slettes.`)
    }
    if (na === '') return 'borte'
    if (na !== sha) return 'endret'
    throw new Error(`Git kunne ikke slette ${gren}, selv om grenen står uendret (manglende tilgang eller en regel i GitHub?). Ingen flere grener slettes.`)
  }
}
