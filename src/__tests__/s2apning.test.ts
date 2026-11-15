/**
 * Åpningen av OUS Rettstoksikologi for medlemmer, startporten S2
 * (`supabase/migrations/*_s2_apne_rettstoksikologi.sql`,
 * docs/s2-kontrollrapport.md §10).
 *
 * Migrasjonen skal bare rulles ut etter Peders uttrykkelige godkjenning.
 * Kontrollen i CI og utrullingen stopper den til godkjenningsmerket står i
 * fila; testen holder det fast, og prøver at migrasjonen åpner nøyaktig det
 * ene fagmiljøet, loggført, og at en vanlig bruker først da kan bli medlem.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DESTRUKTIV_GODKJENT, destruktivfeil, lesMigrasjonsfil } from '../faginnhold/migrasjonshistorikk'
import { feilFra, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

const MIGRASJONER = new URL('../../supabase/migrations/', import.meta.url)
const APNING = readdirSync(MIGRASJONER).find((f) => f.endsWith('_s2_apne_rettstoksikologi.sql'))!
const SQL = readFileSync(new URL(APNING, MIGRASJONER), 'utf8')
const RT = 'ous-rettstoksikologi'

interface Fagmiljorad {
  nokkel: string
  standard: boolean
  apent_for_medlemmer: boolean
  status: string
}

const fagmiljoene = async (db: PGlite) =>
  (await db.query<Fagmiljorad>('select nokkel, standard, apent_for_medlemmer, status from public.fagmiljoer order by nokkel')).rows

const loggen = async (db: PGlite) =>
  (
    await db.query<{ aktor: string | null; grunn: string | null; etter: { apent_for_medlemmer?: boolean } }>(
      `select l.aktor, l.grunn, l.etter from public.tilgangslogg l join public.fagmiljoer f on f.id = l.fagmiljo_id
       where l.handling = 'fagmiljoer.update' and f.nokkel = $1 order by l.id`,
      [RT],
    )
  ).rows

let db: PGlite

beforeAll(async () => {
  db = await nyDatabase({ til: APNING })
}, 120_000)

afterAll(async () => {
  await db.close()
})

describe('åpningen av OUS Rettstoksikologi (startporten S2)', () => {
  it('finnes én gang, og stoppes i kontrollen og utrullingen så lenge Peders godkjenningsmerke mangler', () => {
    expect(readdirSync(MIGRASJONER).filter((f) => f.endsWith('_s2_apne_rettstoksikologi.sql'))).toEqual([APNING])
    const fil = lesMigrasjonsfil(APNING, SQL)
    const feil = destruktivfeil([fil])
    if (DESTRUKTIV_GODKJENT.test(SQL)) expect(feil).toEqual([])
    else expect(feil).toEqual([expect.stringContaining('åpning av et fagmiljø for medlemmer')])
  })

  it('lar ingen vanlig bruker bli medlem før den har kjørt, og gjør det mulig etterpå', async () => {
    const arkitekt = await opprettBruker(db, { brukernavn: 's2.arkitekt', fornavn: 'S2', etternavn: 'Arkitekt', rolle: 'user', systemarkitekt: true })
    const vanlig = await opprettBruker(db, { brukernavn: 's2.vanlig', fornavn: 'S2', etternavn: 'Vanlig', rolle: 'user' })
    const rt = (await db.query<{ id: string }>('select id from public.fagmiljoer where nokkel = $1', [RT])).rows[0]!.id
    const gi = () => som(db, arkitekt, (tx) => tx.query('select public.gi_medlemskap($1, $2)', [vanlig, rt]))

    const for_ = await fagmiljoene(db)
    expect(for_.find((f) => f.nokkel === RT)).toMatchObject({ apent_for_medlemmer: false, standard: false, status: 'aktiv' })
    expect(await feilFra(gi)).toMatchObject({ code: '42501', message: expect.stringMatching(/startport S2/) })

    await db.exec(SQL)

    // Bare OUS Rettstoksikologi er endret, og bare åpningen.
    const etter = await fagmiljoene(db)
    expect(etter).toEqual(for_.map((f) => (f.nokkel === RT ? { ...f, apent_for_medlemmer: true } : f)))
    expect(await loggen(db)).toEqual([
      { aktor: null, grunn: expect.stringMatching(/^Startport S2: OUS Rettstoksikologi åpnes/), etter: expect.objectContaining({ apent_for_medlemmer: true }) },
    ])
    expect(await feilFra(gi)).toBeNull()
  })

  it('gjør ingenting når den kjøres på nytt', async () => {
    const for_ = await fagmiljoene(db)
    const logg = await loggen(db)
    await db.exec(SQL)
    expect(await fagmiljoene(db)).toEqual(for_)
    expect(await loggen(db)).toEqual(logg)
  })
})
