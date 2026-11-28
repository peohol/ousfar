/**
 * Den trygge loggen for kopijobben (`src/drift/sikkerhetskopi/logg.ts`): med
 * den på slipper bare linjene jobben selv setter sammen, gjennom, til loggen
 * og oppsummeringen. En syntetisk filsti, rå SQL- og HTTP-feil, utskrift fra
 * en underprosess og en hemmelighet når aldri loggen, verken når jobben
 * feiler på en fanget måte, ved en feil ingen fanget, eller ved et avvist
 * løfte. Det står likevel at jobben feilet, og i hvilket trinn.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { feiltekst } from '../drift/sikkerhetskopi/logg'
import { Endret, OffentligStopp, Stopp } from '../drift/sikkerhetskopi/feil'
import { S3Feil } from '../drift/sikkerhetskopi/s3'

const mappe = mkdtempSync(join(tmpdir(), 'ousfar-logg-'))
afterAll(() => rmSync(mappe, { recursive: true, force: true }))

function kjor(maate: string) {
  const oppsummering = join(mappe, `${maate}.md`)
  const r = spawnSync('npx', ['vite-node', 'src/__tests__/hjelp/tryggLogg.ts', '--', maate], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: oppsummering },
  })
  let sammendrag = ''
  try {
    sammendrag = readFileSync(oppsummering, 'utf8')
  } catch {
    /* ingen */
  }
  return { status: r.status, logg: `${r.stdout}${r.stderr}`, sammendrag }
}

describe('den trygge loggen', () => {
  it.each(['stopp', 's3', 'prosess', 'ufanget', 'avvist'])('slipper ingen markør gjennom når jobben feiler (%s)', (maate) => {
    const r = kjor(maate)
    expect(r.status).toBe(1)
    for (const t of [r.logg, r.sammendrag]) {
      expect(t).not.toMatch(/MARKØR|bruker-4711|HEMMELIG-INNHOLD/)
      expect(t).toContain('TRYGG-OPPSUMMERING')
      expect(t).toContain('Sikkerhetskopien stoppet i trinnet «prøvetrinnet»')
    }
    expect(r.logg).toContain('TRYGG-LINJE')
    // Hemmeligheten står bare i linjen som ber GitHub maskere den.
    expect(r.logg.split('\n').filter((l) => l.includes('HEMMELIG-NOKKEL-123'))).toEqual(['::add-mask::HEMMELIG-NOKKEL-123'])
    expect(r.sammendrag).not.toContain('HEMMELIG-NOKKEL-123')
  }, 60_000)

  it('skriver meldingen i en offentlig stopp, og bare den', () => {
    const r = kjor('offentlig')
    expect(r.status).toBe(1)
    expect(r.logg).toContain('«prøvetrinnet»: Mangler B2_KEY_ID (ID-en til nøkkelen).')
    expect(r.logg).not.toMatch(/MARKØR/)
  }, 60_000)

  it('sier hva slags feil det var, uten meldingen', () => {
    expect(feiltekst(new Stopp('storage/avatars/x.png'))).toBe('Stopp')
    expect(feiltekst(new Endret('tabellen public.x'))).toBe('Endret')
    expect(feiltekst(new S3Feil(503, 'SlowDown', 'GET deler/x: 503 SlowDown hemmelig'))).toBe('kopilageret svarte 503 SlowDown')
    expect(feiltekst(new S3Feil(400, '<x>', 'y'))).toBe('kopilageret svarte 400')
    expect(feiltekst(Object.assign(new Error('connect ECONNREFUSED 10.0.0.1:5432 bruker'), { code: 'ECONNREFUSED' }))).toBe('Error ECONNREFUSED')
    expect(feiltekst(Object.assign(new Error('x'), { code: 'ikke en kode med data' }))).toBe('Error')
    expect(feiltekst('en streng med data')).toBe('string')
    expect(feiltekst(new OffentligStopp('Lageret har ingen hel kopi.'))).toBe('Lageret har ingen hel kopi.')
  })
})
