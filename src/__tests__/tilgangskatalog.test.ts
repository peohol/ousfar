/**
 * Katalogvaktene (P1.1, docs/ousfar-nasjonal-p0-kartlegging.md §6.4): ingen
 * tabell som nettleseren når, uten radsikkerhet, og ingen funksjon som
 * nettleseren kan kalle, uten erklært kontroll. Vaktene skal stoppe nye hull
 * før rettighetene per fagmiljø kommer i P2, og de bevises med et hull som
 * lages med vilje.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FUNKSJONSKONTROLLER } from './data/funksjonskontroller'
import { nyDatabase } from './hjelp/testdatabase'
import {
  avvikFraErklaeringene,
  kallbareFunksjoner,
  tabellerUtenRadsikkerhet,
  visningerUtenInvoker,
} from './hjelp/tilgangskatalog'

let db: PGlite

beforeAll(async () => {
  db = await nyDatabase()
}, 120_000)

afterAll(async () => {
  await db.close()
})

describe('katalogvaktene', () => {
  it('finner ingen tabell uten radsikkerhet og ingen visning som går forbi den', async () => {
    expect(await tabellerUtenRadsikkerhet(db)).toEqual([])
    expect(await visningerUtenInvoker(db)).toEqual([])
  })

  it('har en erklært kontroll for hver funksjon nettleseren kan kalle, og ingen til overs', async () => {
    const funksjoner = await kallbareFunksjoner(db)
    expect(funksjoner.length).toBe(Object.keys(FUNKSJONSKONTROLLER).length)
    expect(avvikFraErklaeringene(funksjoner)).toEqual([])
  })

  it('gir ikke nettleseren noen funksjon med fagmiljøene utenom svaret om eget medlemskap', async () => {
    const signaturer = (await kallbareFunksjoner(db)).map((f) => f.signatur)
    // P2.0 og hjelperne for P2a–d: alle svarer bare om den innloggede selv.
    expect(signaturer.filter((s) => /fagmilj|medlemskap|systemrolle|tilgang/.test(s)).sort()).toEqual([
      'har_aktivt_medlemskap()',
      'min_medlemskapsstatus()',
      'mine_administrerte_fagmiljoer()',
      'mine_lesbare_fagmiljoer()',
    ])
  })

  it('stopper en ny tabell uten radsikkerhet og en ny funksjon uten erklæring', async () => {
    await db.exec('begin')
    try {
      await db.exec(`
        create table public.hull (id int);
        create view public.hullvisning as select 1 as id;
        create function public.hullfunksjon() returns int language sql security definer as 'select 1';
      `)
      expect(await tabellerUtenRadsikkerhet(db)).toEqual(['hull'])
      expect(await visningerUtenInvoker(db)).toEqual(['hullvisning'])
      expect(avvikFraErklaeringene(await kallbareFunksjoner(db))).toEqual([
        'hullfunksjon(): kan kalles fra nettleseren, men har ingen erklært kontroll',
      ])
    } finally {
      await db.exec('rollback')
    }
  })

  it('stopper en erklæring som ikke stemmer med funksjonen', async () => {
    const funksjoner = await kallbareFunksjoner(db)
    expect(
      avvikFraErklaeringene(funksjoner, {
        ...FUNKSJONSKONTROLLER,
        'les_stoffer(sidetilstand objekttilstand)': 'admin',
        'les_kjemi(cider integer[])': 'radsikkerhet',
        'mine_varsler()': 'offentlig',
        'borte()': 'innlogget',
      }),
    ).toEqual([
      'les_kjemi(cider integer[]): erklært «radsikkerhet», men er security definer og går forbi radsikkerheten',
      'les_stoffer(sidetilstand objekttilstand): erklært «admin», men er ikke security definer',
      'mine_varsler(): erklært «offentlig», men er security definer og går forbi radsikkerheten',
      'borte(): erklært, men kan ikke kalles fra nettleseren',
    ])
  })

  it('godtar «rekkevidde» bare for en security definer-funksjon som kaller en av hjelperne for rekkevidde', async () => {
    await db.exec('begin')
    try {
      await db.exec(`
        create function public.med_rekkevidde(f uuid) returns boolean language sql stable security definer
          set search_path = '' as 'select intern.er_medlem_i(f)';
        create function public.med_lesbare() returns int language sql stable security definer
          set search_path = '' as 'select cardinality(public.mine_lesbare_fagmiljoer())';
        create function public.uten_rekkevidde() returns int language sql security definer as 'select 1';
        create function public.som_innlogget(f uuid) returns boolean language sql stable
          as 'select intern.er_medlem_i(f)';
        revoke all on function public.med_rekkevidde(uuid), public.med_lesbare(), public.uten_rekkevidde(),
          public.som_innlogget(uuid) from public, anon;
        grant execute on function public.med_rekkevidde(uuid), public.med_lesbare(), public.uten_rekkevidde(),
          public.som_innlogget(uuid) to authenticated;
      `)
      const erklaert = {
        ...FUNKSJONSKONTROLLER,
        'med_rekkevidde(f uuid)': 'rekkevidde',
        'med_lesbare()': 'rekkevidde',
        'uten_rekkevidde()': 'rekkevidde',
        'som_innlogget(f uuid)': 'rekkevidde',
      } as const
      expect(avvikFraErklaeringene(await kallbareFunksjoner(db), erklaert).sort()).toEqual([
        'som_innlogget(f uuid): erklært «rekkevidde», men er ikke security definer',
        'uten_rekkevidde(): erklært «rekkevidde», men kaller ingen av hjelperne for rekkevidde',
      ])
    } finally {
      await db.exec('rollback')
    }
  })
})
