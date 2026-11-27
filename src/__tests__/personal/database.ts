/**
 * Felles oppsett for testene av personalkalenderens database (P2b, #616,
 * docs/personal-database.md): testdatabasen bygd av alle migrasjonene,
 * persongalleriet og et syntetisk Sandkasse, der migrasjonen
 * `*_personal_utproving.sql` kjøres slik den kjøres i produksjonen.
 *
 * Sandkasse (S) er testmiljø med funksjonen `personal` på `utprøving`:
 *
 * | Person | I S | Rollen i kalenderen |
 * | --- | --- | --- |
 * | arkitektB | systemarkitekt, medlem og lokal administrator | localAdmin (B2) |
 * | systemarkitekt | systemarkitekt og medlem, ikke administrator | reader |
 * | vanligB | vanlig medlem | ingen (utprøving), reader når funksjonen er på |
 * | adminB | vanlig medlem | ingen (utprøving), reader når funksjonen er på |
 * | vanligA, adminA, … | ikke medlem | ingen |
 *
 * Alle medarbeiderne i kalenderen er syntetiske (K-SKJ-9).
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { byggPersongalleri, opprettFagmiljo, opprettMedlem, type Person, type Persongalleri } from '../hjelp/persongalleri'
import { feilFra, nyDatabase, som } from '../hjelp/testdatabase'

const MIGRASJONER = resolve(__dirname, '../../../supabase/migrations')

/** Innholdet i migrasjonen som slutter med `navn`. */
export function migrasjon(navn: string): string {
  const fil = readdirSync(MIGRASJONER).find((f) => f.endsWith(`_${navn}.sql`))
  if (!fil) throw new Error(`Fant ikke migrasjonen ${navn}`)
  return readFileSync(resolve(MIGRASJONER, fil), 'utf8')
}

export interface Personaldatabase {
  db: PGlite
  galleri: Persongalleri
  /** Sandkasse, testmiljøet. */
  S: string
  /** ID-en til en person i galleriet, eller ID-en selv. */
  id: (person: Person | string) => string
  /** Kaller SQL som personen og gir den første verdien i den første raden. */
  kall: <R = unknown>(person: Person | string, sql: string, parametre?: unknown[]) => Promise<R>
  /** SQLSTATE for kallet, eller null når det gikk bra. */
  feilkode: (person: Person | string, sql: string, parametre?: unknown[]) => Promise<string | null>
  /** Feilen kallet ga, eller null. */
  feil: (person: Person | string, sql: string, parametre?: unknown[]) => Promise<{ code: string; message: string } | null>
  /** Som superbruker (serveren eller en migrasjon), med begrunnelsen tilgangsloggen krever. */
  somServer: <R>(arbeid: (tx: Transaction) => Promise<R>) => Promise<R>
  /** Som `kall`, men rullet tilbake etterpå: svaret eller feilen, uten at noe lagres. */
  prov: <R = unknown>(person: Person | string, sql: string, parametre?: unknown[]) => Promise<{ ok: R } | { feil: { code: string; message: string; detail?: string } }>
}

/** Kastes for å rulle tilbake en transaksjon i `prov`. */
class Tilbake extends Error {}

/** Bygger databasen med galleriet og Sandkasse. */
export async function byggPersonaldatabase(): Promise<Personaldatabase> {
  const db = await nyDatabase()
  const galleri = await byggPersongalleri(db)
  const id = (person: Person | string) => (person in galleri.id ? galleri.id[person as Person] : person)
  const somServer = <R>(arbeid: (tx: Transaction) => Promise<R>) =>
    db.transaction(async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Test: personalkalenderen (syntetisk)', true)`)
      return arbeid(tx)
    })
  const kall = <R = unknown>(person: Person | string, sql: string, parametre: unknown[] = []) =>
    som(db, id(person), async (tx) => {
      const rad = (await tx.query<Record<string, R>>(sql, parametre)).rows[0]
      return rad ? Object.values(rad)[0]! : (null as R)
    })
  const feil = (person: Person | string, sql: string, parametre: unknown[] = []) => feilFra(() => kall(person, sql, parametre))
  const feilkode = async (person: Person | string, sql: string, parametre: unknown[] = []) => (await feil(person, sql, parametre))?.code ?? null
  const prov = async <R = unknown>(person: Person | string, sql: string, parametre: unknown[] = []) => {
    let svar: { ok: R } | { feil: { code: string; message: string; detail?: string } } | undefined
    try {
      await som(db, id(person), async (tx) => {
        try {
          const rad = (await tx.query<Record<string, R>>(sql, parametre)).rows[0]
          svar = { ok: rad ? Object.values(rad)[0]! : (null as R) }
        } catch (e) {
          svar = { feil: e as { code: string; message: string; detail?: string } }
        }
        throw new Tilbake()
      })
    } catch (e) {
      if (!(e instanceof Tilbake)) throw e
    }
    return svar!
  }

  const S = await opprettFagmiljo(db, { nokkel: 'sandkasse', navn: 'Sandkasse', administrator: galleri.id.arkitektB })
  for (const p of ['systemarkitekt', 'vanligB', 'adminB'] as const) await opprettMedlem(db, galleri.id[p], S)
  await som(db, galleri.id.systemarkitekt, (tx) => tx.query(`select public.sett_testmiljo($1, true, 'Sandkasse er testmiljø i testen')`, [S]))
  await somServer((tx) => tx.exec(migrasjon('personal_utproving')))
  return { db, galleri, S, id, kall, feilkode, feil, somServer, prov }
}

/** Grunnlaget for kalenderen slik personen får det (`public.personal_grunnlag`). */
export interface Grunnlag {
  rolle: string
  i_dag: string
  enhet: { id: string; name: string; timeZone: string; workYearStartMonth: number; hideWeekendsByDefault: boolean } | null
  regelsett: ({ version: number; effectiveFrom: string } & Record<string, unknown>)[]
  kategorier: { id: string; name: string; short: string }[]
  medarbeidere: {
    id: string
    navn: string
    stilling: string | null
    syntetisk: boolean
    aktiv_fra: string
    aktiv_til: string | null
    kvalifikasjoner?: { status: string; fra: string; til: string | null }[]
  }[]
  vaktplanansvarlige: { bruker: string; navn: string; fra: string }[]
}

export const grunnlag = (p: Personaldatabase, person: Person | string, fagmiljo = p.S) =>
  p.kall<Grunnlag>(person, 'select public.personal_grunnlag($1)', [fagmiljo])

