/**
 * Kartleggingen av datainngangene for P2.0 (docs/p2-0-forberedelse.md): alle
 * tabeller, visninger og funksjoner nettleseren når, lest ut av
 * Postgres-katalogen, og hvilke av dem som kontrollerer at den innloggede har
 * et aktivt medlemskap.
 *
 * P2.0 skal la en bruker med gyldig token, men uten aktivt medlemskap, verken
 * lese eller skrive noe (P0 §6.1 og §6.4). Kontrollen finnes ikke ennå, så
 * navnet på den er en parameter: `medlemskapsdekning` tar et mønster for den,
 * og testene prøver mønsteret mot en prototype i en transaksjon som rulles
 * tilbake.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { FUNKSJONSKONTROLLER } from '../data/funksjonskontroller'
import { kallbareFunksjoner } from './tilgangskatalog'

type Db = PGlite | Transaction

/** Rollene nettleseren kan opptre som. */
const NETTLESERROLLER = ['anon', 'authenticated'] as const

/**
 * Tabellene i Supabase sine egne skjemaer som nettleseren når og som
 * prosjektet har radsikkerhetsregler på (i dag bare profilbildene).
 */
const PLATTFORMTABELLER = ['storage.objects'] as const

/** Skjemaene prosjektet eier, der funksjoner kan være kontrollpunkter. */
const PROSJEKTSKJEMA = /* sql */ `
  select n.oid from pg_namespace n
  where n.nspname not like 'pg\\_%'
    and n.nspname not in ('information_schema', 'auth', 'storage', 'extensions', 'graphql', 'realtime')
`

export interface Regel {
  navn: string
  kommando: string
  /** `false` for en begrensende (restrictive) regel. */
  tillatende: boolean
  roller: string[]
  bruk: string | null
  sjekk: string | null
}

export interface Tabellinngang {
  /** `skjema.tabell`. */
  navn: string
  visning: boolean
  /** Rettighetene nettleserrollene har, som `authenticated:SELECT`. */
  rettigheter: string[]
  regler: Regel[]
}

/**
 * Tabellene og visningene i `public` og `storage.objects` som en av
 * nettleserrollene har en rettighet på, med radsikkerhetsreglene.
 */
export async function tabellinnganger(db: Db): Promise<Tabellinngang[]> {
  const rettigheter = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
  const { rows } = await db.query<{ navn: string; visning: boolean; rettigheter: string[] }>(
    `select n.nspname || '.' || c.relname as navn, c.relkind in ('v', 'm') as visning,
            array(
              select r || ':' || p from unnest($1::text[]) r, unnest($2::text[]) p
              where has_table_privilege(r, c.oid, p) or (p = 'UPDATE' and has_any_column_privilege(r, c.oid, p))
                 or (p = 'INSERT' and has_any_column_privilege(r, c.oid, p))
              order by 1
            ) as rettigheter
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where c.relkind in ('r', 'p', 'v', 'm')
       and (n.nspname = 'public' or n.nspname || '.' || c.relname = any ($3::text[]))
     order by 1`,
    [NETTLESERROLLER, rettigheter, PLATTFORMTABELLER],
  )
  const regler = await db.query<Regel & { tabell: string }>(
    `select schemaname || '.' || tablename as tabell, policyname as navn, cmd as kommando,
            permissive = 'PERMISSIVE' as tillatende, roles::text[] as roller, qual as bruk, with_check as sjekk
     from pg_policies order by policyname`,
  )
  return rows
    .filter((r) => r.rettigheter.length > 0)
    .map((r) => ({
      ...r,
      regler: regler.rows.filter((p) => p.tabell === r.navn).map(({ tabell: _, ...p }) => p),
    }))
}

/** Hva en tillatende leseregel gir, grovt sortert. */
export type Lesetilgang = 'alle-innloggede' | 'publisert-eller-admin' | 'admin' | 'egne' | 'annet' | 'ingen-regel'

export function lesetilgang(t: Tabellinngang): Lesetilgang {
  const les = t.regler.filter((r) => r.tillatende && (r.kommando === 'SELECT' || r.kommando === 'ALL'))
  if (les.length === 0) return 'ingen-regel'
  const bruk = les.map((r) => (r.bruk ?? '').replace(/\s+/g, ' '))
  if (bruk.some((b) => b === 'true')) return 'alle-innloggede'
  if (bruk.every((b) => /tilstand = 'publisert'/.test(b) && /er_admin\(\)/.test(b))) return 'publisert-eller-admin'
  if (bruk.every((b) => /^\( SELECT er_admin\(\) AS er_admin\)$/.test(b))) return 'admin'
  if (bruk.every((b) => /auth\.uid\(\)/.test(b))) return 'egne'
  return 'annet'
}

export interface Funksjonsinngang {
  signatur: string
  navn: string
  definer: boolean
  kontroll: string | undefined
  kilde: string
}

/** Funksjonene nettleseren kan kalle, med kontrollen de er erklært med (`funksjonskontroller.ts`). */
export async function funksjonsinnganger(db: Db): Promise<Funksjonsinngang[]> {
  return (await kallbareFunksjoner(db as PGlite)).map((f) => ({
    signatur: f.signatur,
    navn: f.signatur.slice(0, f.signatur.indexOf('(')),
    definer: f.definer,
    kontroll: FUNKSJONSKONTROLLER[f.signatur],
    kilde: f.kilde,
  }))
}

/** Kontrollene som ikke gir data, og som P2.0 derfor ikke gjelder. */
const UTEN_DATA = new Set(['offentlig', 'utloser'])

export interface Medlemskapsdekning {
  /** Tabeller nettleseren når uten en begrensende regel med kontrollen. */
  tabeller: string[]
  /** `security definer`-funksjoner nettleseren kan kalle uten kontrollen. */
  funksjoner: string[]
}

/**
 * Inngangene som ikke kontrollerer aktivt medlemskap.
 *
 * - En tabell (ikke visning: visningene kjører som den innloggede og arver
 *   tabellenes regler) er dekket når den har en begrensende regel for alle
 *   kommandoer der `kontroll` inngår.
 * - En `security definer`-funksjon går forbi radsikkerheten og er dekket når
 *   den selv bruker `kontroll`, eller kaller en portfunksjon (`PORTER`) som
 *   er dekket. Funksjoner som kjøres som den innloggede, dekkes av tabellene.
 *   En funksjon erklært `admin` (krever administrator for alt) er også dekket
 *   når adminkontrollen den kaller (som `er_admin()`), er dekket.
 *   Kontrollfunksjonene selv (de `kontroll` treffer på navnet) telles ikke.
 *
 * `unntak` er innganger P2.0 bevisst lar stå, med begrunnelse i dokumentet.
 */
export async function medlemskapsdekning(
  db: Db,
  kontroll: RegExp,
  unntak: readonly string[] = [],
): Promise<Medlemskapsdekning> {
  const tabeller = (await tabellinnganger(db))
    .filter((t) => !t.visning && !unntak.includes(t.navn))
    .filter(
      (t) =>
        !t.regler.some(
          (r) =>
            !r.tillatende &&
            r.kommando === 'ALL' &&
            r.roller.some((rolle) => rolle === 'public' || rolle === 'authenticated') &&
            kontroll.test(r.bruk ?? '') &&
            (r.sjekk === null || kontroll.test(r.sjekk)),
        ),
    )
    .map((t) => t.navn)

  const dekket = await dekkedeFunksjoner(db, kontroll)
  const funksjoner = (await funksjonsinnganger(db))
    .filter((f) => f.definer && !UTEN_DATA.has(f.kontroll ?? '') && !unntak.includes(f.signatur))
    .filter((f) => !kontroll.test(`${f.navn}(`))
    .filter((f) => !dekket.has(`public.${f.navn}`) && !(f.kontroll === 'admin' && kallerDekketAdminkontroll(f.kilde, dekket)))
    .map((f) => f.signatur)

  return { tabeller, funksjoner }
}

/**
 * Portfunksjonene: de som stopper kallet med en feil når kontrollen ikke
 * holder, og som andre funksjoner kaller for å kontrollere tilgangen
 * (`krev_*`, og de to adminportene katalogvakten også kjenner,
 * `tilgangskatalog.ts`). En funksjon som bare svarer ja eller nei, som
 * `er_admin()`, er ingen port: kalleren kan gå videre uansett svar.
 */
const PORTER = /^(krev_\w+|admin_aktor|opprett_objekt)$/

/** Adminkontrollene en funksjon erklært `admin` kaller (som i `tilgangskatalog.ts`). */
const ADMINKONTROLLER = ['er_admin', 'krev_admin', 'krev_idevalg_admin', 'admin_aktor', 'opprett_objekt'] as const

function kallerDekketAdminkontroll(kilde: string, dekket: ReadonlySet<string>): boolean {
  return ADMINKONTROLLER.some(
    (k) => new RegExp(`\\b${k}\\s*\\(`).test(kilde) && [...dekket].some((d) => d.endsWith(`.${k}`)),
  )
}

/**
 * Funksjonene (`skjema.navn`) i prosjektets skjemaer som bruker `kontroll`
 * selv eller kaller en dekket port; en port er også dekket når den kaller en
 * dekket funksjon. Portene kan kalle hverandre, så settet bygges til det
 * står stille.
 */
async function dekkedeFunksjoner(db: Db, kontroll: RegExp): Promise<Set<string>> {
  const { rows } = await db.query<{ navn: string; kort: string; kilde: string }>(
    `select n.nspname || '.' || p.proname as navn, p.proname as kort, p.prosrc as kilde
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where p.pronamespace in (${PROSJEKTSKJEMA})`,
  )
  const kaller = (kilde: string, navn: string) => new RegExp(`\\b${navn}\\s*\\(`).test(kilde)
  const dekket = new Set(rows.filter((r) => kontroll.test(r.kilde)).map((r) => r.navn))
  for (let endret = true; endret; ) {
    endret = false
    const dekkede = rows.filter((r) => dekket.has(r.navn))
    const porter = dekkede.filter((r) => PORTER.test(r.kort)).map((r) => r.kort)
    const alle = dekkede.map((r) => r.kort)
    for (const r of rows) {
      // En port stopper kallet selv, så den er dekket når den kaller en hvilken
      // som helst dekket funksjon (også `er_admin()`); andre må kalle en dekket port.
      const kandidater = PORTER.test(r.kort) ? alle : porter
      if (!dekket.has(r.navn) && kandidater.some((p) => kaller(r.kilde, p))) {
        dekket.add(r.navn)
        endret = true
      }
    }
  }
  return dekket
}
