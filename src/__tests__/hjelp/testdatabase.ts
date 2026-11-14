/**
 * En ekte Postgres i minnet, bygd av migrasjonene i `supabase/migrations/`
 * (`migrasjonskjoring.ts`), med hjelperne testene bruker mot den.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import type { SupabaseClient } from '@supabase/supabase-js'
import { expect } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import type { Rolle } from '@delt/profil'
import type { Innhold, Objektstatus, Objekttype } from '../../faginnhold/modell'

export * from './migrasjonskjoring'

export interface Testbruker {
  brukernavn: string
  fornavn: string
  etternavn: string
  rolle: Rolle
  /**
   * Gjør kontoen til systemarkitekt (`public.systemroller`), som det som
   * gjelder hele OUSFAR krever siden P2d; den gamle adminrollen gir det ikke.
   */
  systemarkitekt?: boolean
}

/**
 * Oppretter en konto slik adminveien gjør det — reservasjon først, så
 * Auth-brukeren — og gir profilen navn og rolle. Returnerer bruker-ID-en.
 */
export async function opprettBruker(db: PGlite, bruker: Testbruker): Promise<string> {
  return db.transaction(async (tx) => {
    await tx.query('insert into public.kontoreservasjoner (username) values ($1)', [bruker.brukernavn])
    const { rows } = await tx.query<{ id: string }>(
      'insert into auth.users (email) values ($1) returning id',
      [`${bruker.brukernavn}@${INTERN_AUTH_DOMENE}`],
    )
    const id = rows[0]!.id
    await tx.query(
      `update public.profiles
       set first_name = $2, last_name = $3, role = $4,
           must_change_password = false, onboarding_completed = true
       where id = $1`,
      [id, bruker.fornavn, bruker.etternavn, bruker.rolle],
    )
    if (bruker.systemarkitekt) {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Systemarkitekt i testene (syntetisk)', true)`)
      await tx.query(`insert into public.systemroller (bruker_id, rolle) values ($1, 'systemarkitekt')`, [id])
    }
    return id
  })
}

/**
 * Kjører arbeidet slik data-API-et gjør det for en innlogget bruker: som
 * rollen `authenticated`, med bruker-ID-en i JWT-kravene og overskriftene i
 * forespørselen (`request.headers`, med små bokstaver i navnene). Uten
 * bruker-ID kjøres det som `anon`. Alt skjer i én transaksjon, som ved et kall
 * mot API-et, og en feil ruller den tilbake.
 */
export async function som<T>(
  db: PGlite,
  brukerId: string | null,
  arbeid: (tx: Transaction) => Promise<T>,
  overskrifter: Record<string, string> = {},
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('role', $1, true)`, [brukerId ? 'authenticated' : 'anon'])
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(brukerId ? { sub: brukerId, role: 'authenticated' } : { role: 'anon' }),
    ])
    await tx.query(`select set_config('request.method', 'POST', true)`)
    await tx.query(`select set_config('request.headers', $1, true)`, [
      JSON.stringify(Object.fromEntries(Object.entries(overskrifter).map(([n, v]) => [n.toLowerCase(), v]))),
    ])
    return arbeid(tx)
  })
}

/** Feilen et kall ga, med SQLSTATE-koden — eller `null` når det gikk bra. */
export async function feilFra(
  kall: () => Promise<unknown>,
): Promise<{ code: string; message: string; detail?: string } | null> {
  try {
    await kall()
    return null
  } catch (feil) {
    return feil as { code: string; message: string; detail?: string }
  }
}

/* --- Faginnholdet --------------------------------------------------------- */

/** Én revisjon slik den ligger i `objektrevisjoner`. */
export interface Revisjon {
  revisjon: number
  handling: string
  innhold: Record<string, unknown>
  gjenopprettet_fra: number | null
  utfort_av: string
  utfort_av_fornavn: string
  utfort_av_etternavn: string
}

/**
 * Kallene testene av faginnholdet gjør mot databasen, slik data-API-et gjør
 * dem. `admin` er brukeren som endrer når ingen annen er oppgitt.
 */
export function faginnholdskall(db: PGlite, admin: string) {
  const typerEtterFunksjon = new Map<string, Promise<Map<string, string>>>()

  /** Typene til argumentene en funksjon i `public` tar, etter navn. */
  function argumenttyper(funksjon: string): Promise<Map<string, string>> {
    let typer = typerEtterFunksjon.get(funksjon)
    if (!typer) {
      typer = db
        .query<{ navn: string; type: string }>(
          `select a.navn, format_type(a.typ, null) as type
           from pg_proc p, unnest(p.proargnames, p.proargtypes::oid[]) a(navn, typ)
           where p.proname = $1 and p.pronamespace = 'public'::regnamespace`,
          [funksjon],
        )
        .then(({ rows }) => new Map(rows.map((r) => [r.navn, r.type])))
      typerEtterFunksjon.set(funksjon, typer)
    }
    return typer
  }

  /**
   * Kaller en funksjon slik data-API-et gjør det: med navngitte argumenter,
   * som den oppgitte brukeren, i én transaksjon.
   */
  async function rpc<T = Objektstatus>(
    brukerId: string | null,
    funksjon: string,
    argumenter: Record<string, unknown>,
    overskrifter: Record<string, string> = {},
  ): Promise<T> {
    const navn = Object.keys(argumenter)
    // Et jsonb-argument sendes som JSON, også når det er en liste; andre
    // lister er tabellargumenter (som `text[]`) og sendes som lister, slik
    // data-API-et gjør det om for funksjonen.
    const typer = await argumenttyper(funksjon)
    const verdier = Object.entries(argumenter).map(([n, v]) =>
      v !== null && typeof v === 'object' && (typer.get(n) === 'jsonb' || !Array.isArray(v)) ? JSON.stringify(v) : v,
    )
    return som(db, brukerId, async (tx) => {
      const { rows } = await tx.query<T>(
        `select * from public.${funksjon}(${navn.map((n, i) => `${n} => $${i + 1}`).join(', ')})`,
        verdier,
      )
      return rows[0]!
    }, overskrifter)
  }

  /** Leser som den oppgitte brukeren. */
  async function les<T>(brukerId: string | null, sql: string, parametre: unknown[] = []) {
    return som(db, brukerId, async (tx) => (await tx.query<T>(sql, parametre)).rows)
  }

  /** Leser uten radsikkerhet — det som faktisk ligger i databasen. */
  async function fasit<T>(sql: string, parametre: unknown[] = []) {
    return (await db.query<T>(sql, parametre)).rows
  }

  function opprett<T extends Objekttype>(type: T, innhold: Innhold[T], av = admin) {
    return rpc(av, 'opprett_utkast', { objekttype: type, innhold })
  }

  function lagre<T extends Objekttype>(id: string, forventet: number, innhold: Innhold[T], av = admin) {
    return rpc(av, 'lagre_utkast', { objekt: id, forventet_revisjon: forventet, innhold })
  }

  function gjenopprett(id: string, forventet: number, fra: number, av = admin) {
    return rpc(av, 'gjenopprett_revisjon', { objekt: id, forventet_revisjon: forventet, fra_revisjon: fra })
  }

  function publiser(id: string, forventet: number, av = admin) {
    return rpc(av, 'publiser_utkast', { objekt: id, forventet_revisjon: forventet })
  }

  function revisjoner(id: string, som_: string | null = null) {
    const sql = 'select * from public.objektrevisjoner where objekt_id = $1 order by revisjon'
    return som_ === null ? fasit<Revisjon>(sql, [id]) : les<Revisjon>(som_, sql, [id])
  }

  /**
   * Radene i hver tilstand skal være nøyaktig øyeblikksbildet i revisjonen
   * tilstanden peker på. Kontrolleres etter hver operasjon som endrer noe.
   */
  async function forventSamsvar(id: string) {
    const rader = await fasit<{ tilstand: string; lik: boolean }>(
      `select t.tilstand, intern.les(o.type, o.id, t.tilstand) = r.innhold as lik
       from public.objekttilstander t
       join public.redigerbare_objekter o on o.id = t.objekt_id
       join public.objektrevisjoner r on r.objekt_id = t.objekt_id and r.revisjon = t.revisjon
       where t.objekt_id = $1`,
      [id],
    )
    expect(rader.length).toBeGreaterThan(0)
    for (const rad of rader) expect(rad.lik, rad.tilstand).toBe(true)
  }

  /**
   * En klient som svarer som data-API-et, med databasen bak seg. Som der gis
   * en funksjon som returnerer én verdi, tilbake som verdien selv, og ikke som
   * en rad, og overskriftene satt med `setHeader` følger med kallet.
   */
  function klientFor(brukerId: string): SupabaseClient {
    return {
      rpc: (funksjon: string, argumenter: Record<string, unknown>) => {
        const overskrifter: Record<string, string> = {}
        const utfor = async () => {
          try {
            const rad = await rpc<Record<string, unknown>>(brukerId, funksjon, argumenter, overskrifter)
            const kolonner = rad ? Object.keys(rad) : []
            const data = kolonner.length === 1 && kolonner[0] === funksjon ? rad[funksjon] : rad
            return { data, error: null }
          } catch (feil) {
            const { code, message, detail } = feil as { code: string; message: string; detail?: string }
            return { data: null, error: { code, message, details: detail ?? null, hint: null } }
          }
        }
        const kall = {
          setHeader(navn: string, verdi: string) {
            overskrifter[navn] = verdi
            return kall
          },
          then<A, B>(ok: (svar: Awaited<ReturnType<typeof utfor>>) => A, feil?: (grunn: unknown) => B) {
            return utfor().then(ok, feil)
          },
        }
        return kall
      },
    } as unknown as SupabaseClient
  }

  return {
    rpc,
    les,
    fasit,
    opprett,
    lagre,
    gjenopprett,
    publiser,
    revisjoner,
    forventSamsvar,
    klientFor,
  }
}

export type Faginnholdskall = ReturnType<typeof faginnholdskall>
