/**
 * Sletting av en gren i fjernrepoet bare når den fortsatt står på commiten
 * som ble vurdert: `git push --force-with-lease=<ref>:<sha>` med en tom
 * kilde. Git avviser slettingen atomisk om noen har pushet til grenen siden,
 * så en commit ingen opprydding har sett, slettes aldri. Brukes av
 * kurateringskøen og oppryddingene av grener.
 *
 * Mappen er en klone med `origin` og legitimasjon til å skrive (i Actions:
 * `actions/checkout` med legitimasjonen, i en egen mappe der ingenting kjøres).
 */
import { execFileSync } from 'node:child_process'

/** `true` når grenen er slettet; `false` når den har flyttet seg, er borte eller slettingen feilet. */
export type Grensletter = (gren: string, sha: string) => boolean

const SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/

export function lagGrensletter(mappe: string, miljo: NodeJS.ProcessEnv = process.env): Grensletter {
  return (gren, sha) => {
    if (!SHA.test(sha)) throw new Error(`Ugyldig commit for ${gren}: ${sha}`)
    try {
      execFileSync('git', ['-C', mappe, 'push', '-q', `--force-with-lease=refs/heads/${gren}:${sha}`, 'origin', `:refs/heads/${gren}`], {
        env: { ...miljo, GIT_TERMINAL_PROMPT: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return true
    } catch {
      return false
    }
  }
}
