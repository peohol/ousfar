/**
 * Kartleggingen av datainngangene (docs/p2-0-forberedelse.md) og dekningen
 * etter P2.0 (docs/fagmiljoer.md, «Aktivt medlemskap»).
 *
 * 1. Hver tabell, visning og funksjon nettleseren når, hører til et område i
 *    P2 (a–d), og hver Edge-funksjon står i dokumentet.
 * 2. P2.0 er aktivert: hver tabell har den begrensende regelen, og hver
 *    `security definer`-funksjon kontrollerer aktivt medlemskap selv eller
 *    gjennom en port. En ny inngang uten kontrollen stopper testen.
 * 3. Den begrensende regelen stenger en bruker uten aktivt medlemskap ute fra
 *    alle tabeller, uten å endre hva aktive brukere ser: radene telles med og
 *    uten reglene (som fjernes i en transaksjon som rulles tilbake).
 *
 * Hver inngang prøves som en slik bruker i `aktivtmedlemskap.test.ts`.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { OMRADER, omradeFor } from './data/tilgangsomrader'
import { byggPersongalleri, leggInnTestdata, type Person, type Persongalleri, type Testdata } from './hjelp/persongalleri'
import { feilFra, nyDatabase } from './hjelp/testdatabase'
import {
  funksjonsinnganger,
  lesetilgang,
  medlemskapsdekning,
  tabellinnganger,
  type Tabellinngang,
} from './hjelp/tilgangsinnganger'

/** Mønsteret for kontrollen P2.0 innførte. */
const KONTROLL = /\b(har_aktivt_medlemskap|krev_aktivt_medlemskap)\s*\(/

/** Navnet på den begrensende regelen P2.0 la på hver tabell. */
const REGEL = 'aktivt_medlemskap'

const DOKUMENT = readFileSync(resolve(__dirname, '../../docs/p2-0-forberedelse.md'), 'utf8')

let db: PGlite
let galleri: Persongalleri
let data: Testdata
let tabeller: Tabellinngang[]

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
  data = await leggInnTestdata(db, galleri)
  tabeller = await tabellinnganger(db)
}, 120_000)

afterAll(async () => {
  await db.close()
})

describe('kartleggingen', () => {
  it('plasserer hver tabell, visning og funksjon nettleseren når, i et område i P2', async () => {
    const innganger = [...tabeller.map((t) => t.navn), ...(await funksjonsinnganger(db)).map((f) => f.signatur)]
    expect(innganger.filter((i) => omradeFor(i) === null)).toEqual([])
    // Alle fire områdene er i bruk; et tomt område betyr at en regel har tatt for mye.
    expect(new Set(innganger.map(omradeFor))).toEqual(new Set(Object.keys(OMRADER)))
  })

  it('tar med Supabase sine tabeller for filer, med radsikkerhet på alle tabeller', () => {
    for (const navn of ['storage.objects', 'storage.buckets']) {
      expect(tabeller.find((t) => t.navn === navn)?.rettigheter, navn).toContain('authenticated:SELECT')
    }
    expect(tabeller.filter((t) => !t.visning && !t.radsikkerhet).map((t) => t.navn)).toEqual([])
  })

  it('fanger en ny tabell nettleseren når, også i storage', async () => {
    const funnet = await iTilbakerulling(async (tx) => {
      await tx.exec(`
        create table storage.hull (id int);
        grant select on storage.hull to authenticated;
      `)
      const innganger = await tabellinnganger(tx)
      return {
        inngang: innganger.find((t) => t.navn === 'storage.hull'),
        udekket: (await medlemskapsdekning(tx, KONTROLL)).tabeller,
      }
    })
    expect(funnet.inngang).toMatchObject({ radsikkerhet: false, rettigheter: ['authenticated:SELECT'] })
    expect(lesetilgang(funnet.inngang!)).toBe('uten-radsikkerhet')
    expect(funnet.udekket).toContain('storage.hull')
  })

  it('kjenner lesetilgangen til hver tabell', () => {
    const tabellerUtenVisninger = tabeller.filter((t) => !t.visning)
    expect(tabellerUtenVisninger.filter((t) => lesetilgang(t) === 'uten-radsikkerhet').map((t) => t.navn)).toEqual([])
    // P0 §2.2: 18 tabeller kan leses av alle innloggede. Tallet kan bare gå ned.
    expect(tabellerUtenVisninger.filter((t) => lesetilgang(t) === 'alle-innloggede').length).toBeLessThanOrEqual(18)
  })

  it('har hver Edge-funksjon i repoet med i dokumentet', () => {
    const mapper = readdirSync(resolve(__dirname, '../../supabase/functions'), { withFileTypes: true })
      .filter((m) => m.isDirectory() && !m.name.startsWith('_'))
      .map((m) => m.name)
    expect(mapper.length).toBeGreaterThan(0)
    expect(mapper.filter((m) => !DOKUMENT.includes(`\`${m}\``))).toEqual([])
  })
})

describe('P2.0 er aktivert', () => {
  it('har kontrollen i hver tabell og hver security definer-funksjon nettleseren når', async () => {
    expect(await medlemskapsdekning(db, KONTROLL)).toEqual({ tabeller: [], funksjoner: [] })
  })

  it('har den begrensende regelen på hver tabell i public og på profilbildene, for alle kommandoer', () => {
    const uten = tabeller
      .filter((t) => !t.visning && (t.navn.startsWith('public.') || t.navn === 'storage.objects'))
      .filter((t) => !t.regler.some((r) => r.navn === REGEL && !r.tillatende && r.kommando === 'ALL'))
      .map((t) => t.navn)
    expect(uten).toEqual([])
  })

  it('fanger en ny tabell eller funksjon uten kontrollen', async () => {
    const udekket = await iTilbakerulling(async (tx) => {
      await tx.exec(`
        create table public.hull (id int);
        alter table public.hull enable row level security;
        create policy hull_alle on public.hull for select to authenticated using (true);
        create function public.hullfunksjon() returns int language sql stable security definer set search_path = '' as 'select 1';
      `)
      return medlemskapsdekning(tx, KONTROLL)
    })
    expect(udekket).toEqual({ tabeller: ['public.hull'], funksjoner: ['hullfunksjon()'] })
  })

  it('har kontrollen som første setning i hver funksjon fra restlisten i dokumentet', async () => {
    const restliste = DOKUMENT.slice(DOKUMENT.indexOf('**Restlisten'), DOKUMENT.indexOf('Når P2.0 ble bygd'))
    const navn = [...new Set([...restliste.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]!))]
    expect(navn.length).toBe(40)
    const funksjoner = await funksjonsinnganger(db)
    for (const n of navn) {
      const f = funksjoner.find((x) => x.navn === n)
      expect(f, n).toBeDefined()
      expect(forsteSetning(f!.kilde), n).toMatch(/^(select|perform) intern\.krev_aktivt_medlemskap\(\);$/)
    }
  })
})

/**
 * Den første setningen i funksjonskroppen som gjør noe: i PL/pgSQL den første
 * etter den ytterste `begin` (deklarasjonene foran leser bare argumentene og
 * den innloggedes egen status), ellers den første i SQL-funksjonen.
 */
function forsteSetning(kilde: string): string {
  const begin = /^\s*begin\s*$/im.exec(kilde)
  const etter = begin ? kilde.slice(begin.index + begin[0].length) : kilde
  return etter.trim().split('\n')[0]!.trim()
}

/** Kjører `arbeid` i en transaksjon som alltid rulles tilbake. */
async function iTilbakerulling<T>(arbeid: (tx: Transaction) => Promise<T>): Promise<T> {
  let resultat: T | undefined
  await db.transaction(async (tx) => {
    resultat = await arbeid(tx)
    await tx.rollback()
  })
  return resultat as T
}

/** Kjører som den innloggede inne i en åpen transaksjon, og går tilbake til eieren etterpå. */
async function somInnlogget<T>(tx: Transaction, brukerId: string, arbeid: () => Promise<T>): Promise<T> {
  await tx.exec('savepoint innlogget')
  await tx.query(`select set_config('role', 'authenticated', true)`)
  await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: brukerId, role: 'authenticated' }),
  ])
  try {
    return await arbeid()
  } finally {
    await tx.exec('rollback to savepoint innlogget')
    await tx.exec('reset role')
  }
}

/** Fjerner P2.0-regelen fra hver tabell i transaksjonen, for å se hva radsikkerheten ellers gir. */
async function utenRegelen(tx: Transaction) {
  for (const t of tabeller.filter((t) => t.regler.some((r) => r.navn === REGEL))) {
    await tx.exec(`drop policy ${REGEL} on ${t.navn}`)
  }
}

/** Radene hver person ser i hver tabell nettleseren kan lese. */
async function synligeRader(tx: Transaction, personer: readonly Person[]) {
  const lesbare = tabeller.filter((t) => t.rettigheter.includes('authenticated:SELECT')).map((t) => t.navn)
  const resultat: Record<string, Record<string, number>> = {}
  for (const p of personer) {
    resultat[p] = await somInnlogget(tx, galleri.id[p], async () => {
      const antall: Record<string, number> = {}
      for (const t of lesbare) {
        antall[t] = (await tx.query<{ n: number }>(`select count(*)::int as n from ${t}`)).rows[0]!.n
      }
      return antall
    })
  }
  return resultat
}

describe('den begrensende regelen', () => {
  const AKTIVE: readonly Person[] = ['systemarkitekt', 'vanligA', 'vanligB', 'adminA', 'adminB', 'dobbeltAB', 'avsluttetA']
  const UTESTENGTE: readonly Person[] = ['utenMedlemskap', 'tidligereAdmin']

  it('stenger en bruker uten aktivt medlemskap ute fra alle tabeller, og endrer ingenting for de aktive', async () => {
    const uten = await iTilbakerulling(async (tx) => {
      await utenRegelen(tx)
      return synligeRader(tx, [...AKTIVE, ...UTESTENGTE])
    })
    const med = await iTilbakerulling((tx) => synligeRader(tx, [...AKTIVE, ...UTESTENGTE]))
    for (const p of AKTIVE) expect(med[p], p).toEqual(uten[p])
    for (const p of UTESTENGTE) {
      // Uten regelen ser de det samme som en vanlig bruker i A.
      expect(Object.values(uten[p]!).some((n) => n > 0), p).toBe(true)
      expect(Object.entries(med[p]!).filter(([, n]) => n > 0), p).toEqual([])
    }
  })

  it('stopper skriving og adminrettigheter for en bruker uten aktivt medlemskap gjennom portfunksjonene', async () => {
    const { utenMedlemskap, tidligereAdmin, vanligA, systemarkitekt } = galleri.id
    const prov = (bruker: string, sql: string, parametre: unknown[] = []) =>
      iTilbakerulling((tx) => feilFra(() => somInnlogget(tx, bruker, () => tx.query(sql, parametre))))
    const nyKategori = `select public.opprett_stoffkategori('Prøve', null)`
    const nyTraad = `select public.opprett_diskusjonskategori('stoff:proeve', 'Prøve', '🧪')`
    const nyttUtkast = `select public.opprett_utkast('kommentar', '{"navn": "Prøve", "tekst": "Prøve.", "plassholdere": []}')`
    expect((await prov(utenMedlemskap, nyKategori))?.code).toBe('42501')
    expect((await prov(utenMedlemskap, nyTraad))?.code).toBe('42501')
    expect((await prov(tidligereAdmin, nyttUtkast))?.code).toBe('42501')
    // Stoffregisteret endres bare med rett til det (P2d); kontrollen av medlemskapet kommer først.
    expect(await prov(systemarkitekt, nyKategori)).toBeNull()
    expect(await prov(vanligA, nyTraad)).toBeNull()
    const erAdmin = (bruker: string) =>
      iTilbakerulling((tx) =>
        somInnlogget(tx, bruker, async () => (await tx.query<{ a: boolean }>('select public.er_admin() as a')).rows[0]!.a),
      )
    expect(await erAdmin(tidligereAdmin)).toBe(false)
    expect(await erAdmin(galleri.id.adminA)).toBe(true)
  })

  it('stopper lesing og skriving av profilbilder for en bruker uten aktivt medlemskap, og lar de aktive beholde sine', async () => {
    const eget = (id: string) => `${id}/avatar.webp`
    const lastOpp = `insert into storage.objects (bucket_id, name) values ('avatarer', $1)`
    const prov = (bruker: string, sql: string, parametre: unknown[], medRegelen = true) =>
      iTilbakerulling(async (tx) => {
        if (!medRegelen) await utenRegelen(tx)
        return feilFra(() => somInnlogget(tx, bruker, () => tx.query(sql, parametre)))
      })
    const lese = (bruker: string, medRegelen = true) =>
      iTilbakerulling(async (tx) => {
        if (!medRegelen) await utenRegelen(tx)
        return somInnlogget(tx, bruker, async () =>
          (await tx.query('select id from storage.objects where id = $1', [data.profilbilde])).rows.length,
        )
      })
    const endreEget = `update storage.objects set name = name where id = $1 and name = $2`

    for (const p of UTESTENGTE) {
      const id = galleri.id[p]
      // Uten regelen: leser andres bilde og laster opp sitt eget, som en vanlig innlogget.
      expect(await lese(id, false), p).toBe(1)
      expect(await prov(id, lastOpp, [eget(id)], false), p).toBeNull()
      // Med regelen: ingenting.
      expect(await lese(id), p).toBe(0)
      expect((await prov(id, lastOpp, [eget(id)]))?.code, p).toBe('42501')
    }
    for (const p of ['vanligA', 'vanligB', 'adminB'] as const) {
      expect(await lese(galleri.id[p]), p).toBe(1)
    }
    const { vanligA, adminB } = galleri.id
    expect(await prov(vanligA, endreEget, [data.profilbilde, eget(vanligA)])).toBeNull()
    expect(await prov(adminB, lastOpp, [eget(adminB)])).toBeNull()
    // Radsikkerheten fra før står: ingen laster opp i en annens navn.
    expect((await prov(adminB, lastOpp, [eget(vanligA)]))?.code).toBe('42501')
  })
})
