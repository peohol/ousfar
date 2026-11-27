/**
 * Referansen kopijobben skiller ut OUSFARs tilpasninger mot: en ren Supabase
 * med nøyaktig de samme versjonene av Postgres, Auth og Storage som
 * produksjonen, startet i Docker på GitHubs maskin uten OUSFARs migrasjoner
 * (`docs/drift-gjenoppretting.md`, «Tilpasningene» og «Kopiene i drift»).
 *
 * Supabase oppdaterer tjenestene i produksjonen selv, så en referanse lagret
 * i repoet ville gått ut på dato og stoppet kopien. Den lages derfor på nytt
 * hver natt: versjonene leses fra produksjonen, og Supabase-CLI-en starter de
 * samme bildene (`supabase/.temp/<tjeneste>-version`, som `supabase link`
 * skriver). Finnes ikke bildet til en versjon, stopper jobben, og den
 * stopper også hvis referansen ikke har versjonene produksjonen har.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SUPABASE_CLI } from '../supabaseCli'
import { Stopp } from './feil'
import { lagReferanse } from './kopi'
import type { Fingeravtrykk } from './tilpasninger'

/** Det referansen ikke trenger: bare databasen, Auth og Storage (med det de selv avhenger av) startes. */
const UTEN = 'studio,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit,realtime'

/** En versjon slik produksjonen oppgir den (`v2.199.0`, `1.100.0`, `17.6.1.166`); alt annet stopper før noe startes. */
const gyldig = (v: string) => /^v?\d+(\.\d+){1,3}$/.test(v)

export function lagReferanseMedVersjoner(versjoner: { auth: string; storage: string; postgres: string }): Fingeravtrykk {
  for (const [tjeneste, v] of Object.entries(versjoner)) if (!gyldig(v)) throw new Stopp(`Ukjent versjon for ${tjeneste}: «${v}».`)
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-referanse-'))
  const cli = (...a: string[]) =>
    execFileSync('npx', [...SUPABASE_CLI, ...a, '--workdir', mappe], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  try {
    cli('init', '--force')
    mkdirSync(join(mappe, 'supabase/.temp'), { recursive: true })
    writeFileSync(join(mappe, 'supabase/.temp/gotrue-version'), versjoner.auth)
    writeFileSync(join(mappe, 'supabase/.temp/storage-version'), versjoner.storage)
    writeFileSync(join(mappe, 'supabase/.temp/postgres-version'), versjoner.postgres.replace(/^v/, ''))
    try {
      cli('start', '-x', UTEN)
    } catch (e) {
      throw new Stopp(`En ren Supabase med versjonene ${JSON.stringify(versjoner)} kunne ikke startes: ${String((e as { stderr?: string }).stderr ?? e).slice(-600)}`)
    }
    const status = JSON.parse(cli('status', '-o', 'json')) as { DB_URL: string }
    return lagReferanse(status.DB_URL)
  } finally {
    try {
      cli('stop', '--no-backup')
    } catch {
      /* sto ikke */
    }
    rmSync(mappe, { recursive: true, force: true })
  }
}
