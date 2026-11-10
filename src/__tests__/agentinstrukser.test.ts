/**
 * Agentinstruksene (`AGENTS.md`): én felles inngang for alle kodeagenter.
 * Der det finnes en `CLAUDE.md`, leser Claude Code ikke `AGENTS.md`. I
 * prosjekttrådene, der repoet er en tilleggsmappe, lastes `AGENTS.md` ikke
 * automatisk; Claude-prosjektinstruksene pålegger derfor å lese den først.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const UTENFOR = new Set(['node_modules', '.git', 'dist', 'vendor', 'originaldata'])
const les = (sti: string) => readFileSync(join(ROT, sti), 'utf8')

/** Alle filer med et av navnene i repoet, som stier fra roten. */
function finn(navn: string[], mappe = ROT): string[] {
  return readdirSync(mappe, { withFileTypes: true }).flatMap((f) => {
    if (f.isDirectory()) return UTENFOR.has(f.name) ? [] : finn(navn, join(mappe, f.name))
    return navn.includes(f.name) ? [relative(ROT, join(mappe, f.name))] : []
  })
}

const AGENTFILER = finn(['AGENTS.md'])

describe('agentinstruksene', () => {
  it('har ingen CLAUDE.md som skygger for AGENTS.md', () => {
    expect(AGENTFILER).toContain('AGENTS.md')
    expect(finn(['CLAUDE.md', 'CLAUDE.local.md'])).toEqual([])
  })

  it('lenker bare til filer som finnes', () => {
    for (const fil of AGENTFILER) {
      for (const [, mål] of les(fil).matchAll(/\]\(([^)#\s]+)\)/g)) {
        expect(existsSync(join(ROT, dirname(fil), mål!)), `${fil} → ${mål}`).toBe(true)
      }
    }
  })

  it('nevner alle underordnede AGENTS.md i rotfilen, så agenter uten automatisk innlasting finner dem', () => {
    const rot = les('AGENTS.md')
    for (const fil of AGENTFILER.filter((f) => f !== 'AGENTS.md')) expect(rot).toContain(fil)
  })

  it('holder rotfilen kort, siden den lastes i hver økt', () => {
    expect(les('AGENTS.md').length).toBeLessThan(8000)
  })

  it('lar hver av de seks prosjektinstruksene peke til AGENTS.md', () => {
    const blokker = [...les('docs/prosjektinstrukser.md').matchAll(/^(## .*)\n[\s\S]*?```text\n([\s\S]*?)```/gm)].map((b) => [b[1], b[2]])
    expect(blokker).toHaveLength(6)
    for (const [overskrift, tekst] of blokker) {
      expect(tekst).toMatch(/^LES\n[^\n]*AGENTS\.md/m)
      expect(tekst).not.toContain('CLAUDE.md')
      // Claude laster ikke AGENTS.md selv i prosjekttrådene, så instruksen må kreve at den leses først.
      if (overskrift!.startsWith('## Claude')) expect(tekst).toMatch(/^LES\nFørste handling i hver repooppgave[^\n]*les AGENTS\.md/m)
    }
  })
})
