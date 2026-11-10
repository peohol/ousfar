/**
 * Agentinstruksene (`AGENTS.md`): én felles inngang for alle kodeagenter.
 * Claude Code laster ikke `AGENTS.md` når repoet er en tilleggsmappe (som i
 * prosjekttrådene), bare `CLAUDE.md`. Rotens `CLAUDE.md` er derfor en symbolsk
 * lenke til `AGENTS.md`; en `CLAUDE.md` med egne regler ville gitt to
 * instrukser å vedlikeholde, og der den finnes, leser Claude Code ikke `AGENTS.md`.
 */
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from 'node:fs'
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
  it('har bare én CLAUDE.md, rotens, og den er en symbolsk lenke til AGENTS.md', () => {
    expect(AGENTFILER).toContain('AGENTS.md')
    expect(finn(['CLAUDE.md', 'CLAUDE.local.md'])).toEqual(['CLAUDE.md'])
    expect(lstatSync(join(ROT, 'CLAUDE.md')).isSymbolicLink()).toBe(true)
    expect(readlinkSync(join(ROT, 'CLAUDE.md'))).toBe('AGENTS.md')
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
    const blokker = [...les('docs/prosjektinstrukser.md').matchAll(/^## .*\n[\s\S]*?```text\n([\s\S]*?)```/gm)]
    expect(blokker).toHaveLength(6)
    for (const [, tekst] of blokker) {
      expect(tekst).toMatch(/^LES\nAGENTS\.md/m)
      expect(tekst).not.toContain('CLAUDE.md')
    }
  })
})
