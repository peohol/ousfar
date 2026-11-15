import { describe, expect, it, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import { grunnlagsdatabase, migrasjonsfiler, nyDatabase } from './hjelp/testdatabase'
import {
  FINGERAVTRYKK_SQL,
  avvik,
  forskjell,
  manglendeDekning,
  objekterFraMigrasjoner,
  somObjekter,
  tilpasningsskript,
  type Fingeravtrykk,
} from '../drift/sikkerhetskopi/tilpasninger'

const MIGRASJONER = resolve(__dirname, '../../supabase/migrations')
const migrasjonstekster = () => migrasjonsfiler().map((f) => readFileSync(resolve(MIGRASJONER, f), 'utf8'))

async function avtrykk(db: PGlite): Promise<Fingeravtrykk> {
  const { rows } = await db.query<Record<string, unknown>>(FINGERAVTRYKK_SQL)
  return { versjoner: {}, objekter: somObjekter(rows) }
}

/**
 * Tilpasningene i `auth` og `storage` skal skilles ut mot en ren referanse og
 * kunne legges tilbake uten å røre plattformobjektene (`docs/s4-pilotplan.md` §3.2).
 * Her er referansen testdatabasens gjenskapte Supabase-grunnlag, og kilden er
 * den samme med alle migrasjonene kjørt.
 */
describe('tilpasningene i auth og storage', () => {
  let kilde: PGlite
  let referanse: Fingeravtrykk
  let migrert: Fingeravtrykk

  beforeAll(async () => {
    referanse = await avtrykk(await grunnlagsdatabase())
    kilde = await nyDatabase()
    migrert = await avtrykk(kilde)
  }, 120_000)

  it('finner OUSFARs tilpasninger og ingen avvik fra referansen', () => {
    const f = forskjell(migrert, referanse)
    expect(avvik(f)).toEqual([])
    const nokler = f.tilpasninger.map((o) => `${o.art}:${o.nokkel}`)
    expect(nokler).toContain('utloser:auth.users.paa_ny_auth_bruker')
    expect(nokler).toContain('regel:storage.objects.Brukeren kan legge inn sitt eget profilbilde')
    // Den begrensende regelen P2.0 laget med dynamisk SQL, som bare katalogen ser.
    expect(nokler).toContain('regel:storage.objects.aktivt_medlemskap')
    // Tidsgrensen migrasjonene har satt på service_role.
    expect(nokler).toContain('rolleinnstilling:service_role|statement_timeout')
    // Plattformens egne objekter fra referansen er ikke tilpasninger.
    expect(nokler).not.toContain('radsikkerhet:storage.objects')
  })

  it('dekker alle utløsere og regler migrasjonene har laget på auth og storage', () => {
    const fraMigrasjoner = objekterFraMigrasjoner(migrasjonstekster())
    expect(fraMigrasjoner).toEqual(
      expect.arrayContaining([
        'utloser:auth.users.paa_ny_auth_bruker',
        'regel:storage.objects.Brukeren kan bytte sitt eget profilbilde',
        'regel:storage.objects.Brukeren kan fjerne sitt eget profilbilde',
        'regel:storage.objects.Brukeren kan legge inn sitt eget profilbilde',
        'regel:storage.objects.Innloggede ser profilbildene til profilene de ser',
      ]),
    )
    // Regelen som ble fjernet og erstattet i P2c, er ikke med.
    expect(fraMigrasjoner).not.toContain('regel:storage.objects.Innloggede kan se profilbilder')
    expect(manglendeDekning(forskjell(migrert, referanse).tilpasninger, fraMigrasjoner)).toEqual([])
  })

  it('legger tilpasningene tilbake slik at databasen blir lik kilden, og nekter duplikater', async () => {
    const { tilpasninger } = forskjell(migrert, referanse)
    // Fjern tilpasningene: da skal avtrykket være nøyaktig referansens.
    const db = await nyDatabase()
    for (const o of tilpasninger) {
      const [skjema, tabell, navn] = o.nokkel.split('.')
      if (o.art === 'utloser') await db.exec(`drop trigger "${navn}" on ${skjema}.${tabell}`)
      if (o.art === 'regel') await db.exec(`drop policy "${o.nokkel.split('.').slice(2).join('.')}" on ${skjema}.${tabell}`)
      if (o.art === 'radsikkerhet') await db.exec(`alter table ${skjema}.${tabell} disable row level security`)
      if (o.art === 'tilgang') await db.exec(o.ddl.replace(/^grant (.+) to (.+?)( with grant option)?;$/, 'revoke $1 from $2;'))
      if (o.art === 'rolleinnstilling') await db.exec(`alter role "${o.nokkel.split('|')[0]}" reset ${o.nokkel.split('|')[1]}`)
      if (o.art === 'rollemedlemskap') await db.exec(o.ddl.replace(/^grant (.+) to (.+?)( with admin option)?;$/, 'revoke $1 from $2;'))
      if (o.art === 'rolle') await db.exec(`drop role "${o.nokkel}"`)
    }
    const uten = await avtrykk(db)
    expect(forskjell(uten, referanse)).toMatchObject({ tilpasninger: [], endret: [], fjernet: [] })

    const skript = tilpasningsskript(tilpasninger)
    expect(skript).not.toMatch(/\bor\s+replace\b|\bdrop\b/i)
    await db.exec(skript)
    expect(forskjell(await avtrykk(db), migrert)).toMatchObject({ tilpasninger: [], endret: [], fjernet: [] })

    // En gang til gir feil i stedet for et duplikat, og ingenting endres.
    await expect(db.exec(skript)).rejects.toThrow(/already exists/)
    await db.exec('rollback')
    expect(forskjell(await avtrykk(db), migrert)).toMatchObject({ tilpasninger: [], endret: [], fjernet: [] })
  }, 120_000)

  it('stopper ved et endret eller manglende plattformobjekt og ved ulike versjoner', () => {
    const endretRegel = { ...referanse, objekter: referanse.objekter.map((o) => (o.art === 'tilgang' ? { ...o, definisjon: 'med videretildeling' } : o)) }
    const f = forskjell(migrert, { ...endretRegel, versjoner: { auth: '1' } })
    expect(f.endret.length).toBeGreaterThan(0)
    expect(f.versjonsavvik).toHaveLength(1)
    const mangler = forskjell({ ...migrert, objekter: migrert.objekter.filter((o) => o.nokkel !== 'storage.objects') }, referanse)
    expect(mangler.fjernet.map((o) => o.nokkel)).toContain('storage.objects')
    expect(avvik(mangler).length).toBeGreaterThan(0)
  })
})
