/**
 * Katalogvaktene fra P1.1 (docs/ousfar-nasjonal-p0-kartlegging.md §6.4):
 * det databasen faktisk gir nettleseren tilgang til, lest ut av
 * Postgres-katalogen. `tilgangskatalog.test.ts` bruker dem mot databasen
 * bygd av migrasjonene, og mot en database der et hull er laget med vilje.
 */
import type { PGlite } from '@electric-sql/pglite'
import { FUNKSJONSKONTROLLER, type Kontroll } from '../data/funksjonskontroller'

/** Rollene nettleseren kan opptre som. */
const NETTLESERROLLER = ['anon', 'authenticated'] as const

/**
 * Skjemaene Postgres og Supabase eier selv. De følger ikke migrasjonene her,
 * og vaktene gjelder dem ikke.
 */
const PLATTFORMSKJEMA = ['pg_catalog', 'information_schema', 'auth', 'storage', 'extensions', 'graphql', 'realtime']

/** Prosjektets skjemaer som en av nettleserrollene har `usage` på (i dag bare `public`). */
const NETTLESERSKJEMA = /* sql */ `
  select n.oid from pg_namespace n
  where n.nspname not like 'pg\\_%'
    and n.nspname not in (${PLATTFORMSKJEMA.map((s) => `'${s}'`).join(', ')})
    and (${NETTLESERROLLER.map((r) => `has_schema_privilege('${r}', n.oid, 'usage')`).join(' or ')})
`

/** Tabeller (også partisjonerte) uten radsikkerhet i skjemaene nettleseren når. */
export async function tabellerUtenRadsikkerhet(db: PGlite): Promise<string[]> {
  const { rows } = await db.query<{ tabell: string }>(
    `select c.oid::regclass::text as tabell from pg_class c
     where c.relnamespace in (${NETTLESERSKJEMA}) and c.relkind in ('r', 'p') and not c.relrowsecurity
     order by 1`,
  )
  return rows.map((r) => r.tabell)
}

/** Visninger som kjører som eieren, og dermed forbi radsikkerheten til den innloggede. */
export async function visningerUtenInvoker(db: PGlite): Promise<string[]> {
  const { rows } = await db.query<{ visning: string }>(
    `select c.oid::regclass::text as visning from pg_class c
     where c.relnamespace in (${NETTLESERSKJEMA}) and c.relkind in ('v', 'm')
       and not coalesce('security_invoker=true' = any (c.reloptions), false)
     order by 1`,
  )
  return rows.map((r) => r.visning)
}

/** En funksjon en innlogget eller anonym kan kalle. */
export interface KallbarFunksjon {
  signatur: string
  definer: boolean
  anon: boolean
  utloser: boolean
  kilde: string
}

export async function kallbareFunksjoner(db: PGlite): Promise<KallbarFunksjon[]> {
  const { rows } = await db.query<KallbarFunksjon>(
    `select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signatur,
            p.prosecdef as definer,
            has_function_privilege('anon', p.oid, 'execute') as anon,
            p.prorettype = 'trigger'::regtype as utloser,
            p.prosrc as kilde
     from pg_proc p
     where p.pronamespace in (${NETTLESERSKJEMA}) and p.prokind in ('f', 'p')
       and (${NETTLESERROLLER.map((r) => `has_function_privilege('${r}', p.oid, 'execute')`).join(' or ')})
     order by 1`,
  )
  return rows
}

const KALLER_ADMINKONTROLL = /\b(er_admin|krev_admin|krev_idevalg_admin|admin_aktor|opprett_objekt)\s*\(/
const BRUKER_INNLOGGET = /\bauth\s*\.\s*uid\s*\(/

/**
 * De felles hjelperne for rekkevidde per fagmiljø (docs/fagmiljoer.md,
 * «Hjelperne for tilgang per fagmiljø»). En funksjon erklært `rekkevidde` må
 * kalle minst én av dem selv. Nye hjelpere som bygger på dem, føres opp her.
 */
export const REKKEVIDDEHJELPERE = ['kan_lese_omfang', 'er_medlem_i', 'er_lokal_admin_i', 'synlige_profiler'] as const
const KALLER_REKKEVIDDEKONTROLL = new RegExp(
  `\\bintern\\s*\\.\\s*(${REKKEVIDDEHJELPERE.join('|')})\\s*\\(|\\bmine_lesbare_fagmiljoer\\s*\\(`,
)

/** Det som må stemme med funksjonen for at kontrollen den er erklært med, kan være riktig. */
function kontrollFeil(f: KallbarFunksjon, kontroll: Kontroll): string | null {
  if (f.anon && kontroll !== 'offentlig' && kontroll !== 'utloser') return 'kan kalles uten innlogging'
  switch (kontroll) {
    case 'utloser':
      return f.utloser ? null : 'er ingen utløserfunksjon'
    case 'offentlig':
    case 'radsikkerhet':
      return f.definer ? 'er security definer og går forbi radsikkerheten' : null
    case 'admin':
    case 'admin-utvidet':
      if (!f.definer) return 'er ikke security definer'
      return KALLER_ADMINKONTROLL.test(f.kilde) ? null : 'kaller ingen adminkontroll'
    case 'eier':
      if (!f.definer) return 'er ikke security definer'
      return BRUKER_INNLOGGET.test(f.kilde) ? null : 'ser ikke på den innloggede'
    case 'kontomyndighet':
      if (!f.definer) return 'er ikke security definer'
      if (!BRUKER_INNLOGGET.test(f.kilde)) return 'ser ikke på den innloggede'
      return /\bintern\s*\.\s*kontoavslag\s*\(/.test(f.kilde) ? null : 'bruker ikke intern.kontoavslag'
    case 'rekkevidde':
      if (!f.definer) return 'er ikke security definer'
      return KALLER_REKKEVIDDEKONTROLL.test(f.kilde) ? null : 'kaller ingen av hjelperne for rekkevidde'
    case 'innlogget':
    case 'felles-lesing':
      return f.definer ? null : 'er ikke security definer'
  }
}

/**
 * Avvikene mellom funksjonene nettleseren kan kalle og erklæringene: nye
 * funksjoner uten erklæring, erklæringer for funksjoner som ikke finnes, og
 * erklæringer som ikke kan stemme. Tom når alt stemmer.
 */
export function avvikFraErklaeringene(
  funksjoner: readonly KallbarFunksjon[],
  erklaert: Readonly<Record<string, Kontroll>> = FUNKSJONSKONTROLLER,
): string[] {
  const avvik: string[] = []
  const finnes = new Set(funksjoner.map((f) => f.signatur))
  for (const f of funksjoner) {
    const kontroll = erklaert[f.signatur]
    if (!kontroll) {
      avvik.push(`${f.signatur}: kan kalles fra nettleseren, men har ingen erklært kontroll`)
      continue
    }
    const feil = kontrollFeil(f, kontroll)
    if (feil) avvik.push(`${f.signatur}: erklært «${kontroll}», men ${feil}`)
  }
  for (const signatur of Object.keys(erklaert)) {
    if (!finnes.has(signatur)) avvik.push(`${signatur}: erklært, men kan ikke kalles fra nettleseren`)
  }
  return avvik
}
