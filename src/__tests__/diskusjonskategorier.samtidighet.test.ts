/**
 * Diskusjonskategoriene per fagmiljø ved samtidige transaksjoner, på ekte
 * Postgres 17 med hele databasestrukturen (#395 punkt 1, docs/diskusjoner.md,
 * «Rommene»). Se `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * - To i hvert sitt fagmiljø lager samme kategori på samme fortolkningsside
 *   samtidig: begge lykkes, uten å vente på hverandre, og begge får plass 0.
 * - To i samme fagmiljø gjør det samme: den andre venter på den første og
 *   stoppes av den unike indeksen, uansett rekkefølge, eller lykkes om den
 *   første ruller tilbake.
 * - To i samme fagmiljø gir hver sin kategori samme nye navn: én lykkes.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER, slettDatabaser } from './hjelp/ektepostgres'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  a1: '00000000-0000-4000-8000-0000000000c1',
  a2: '00000000-0000-4000-8000-0000000000c2',
  b1: '00000000-0000-4000-8000-0000000000c3',
} as const
type Konto = keyof typeof KONTO

const B = `(select id from public.fagmiljoer where nokkel = 'ous-rettstoksikologi')`
const SIDE = 'fortolkning:syntetisk-samtidig'

/** Setter den innloggede slik data-API-et gjør det. */
const som = (bruker: Konto) =>
  `select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${KONTO[bruker]}","role":"authenticated"}', true);`

/** Kontoene; a1 og a2 arbeider i A (standard), b1 bare i B. */
const OPPSETT = /* sql */ `
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetiske kontoer for samtidighetstesten', true);
  ${Object.entries(KONTO)
    .map(
      ([navn, id]) => `
        insert into public.kontoreservasjoner (username) values ('test.kategori${navn}');
        insert into auth.users (id, email) values ('${id}', 'test.kategori${navn}@${INTERN_AUTH_DOMENE}');`,
    )
    .join('\n')}
  update public.profiles set must_change_password = false, onboarding_completed = true;
  insert into public.medlemskap (bruker_id, fagmiljo_id) values ('${KONTO.b1}', ${B});
  commit;
  begin; ${som('b1')} select public.velg_arbeidsfagmiljo(${B}); commit;
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetisk konto bare i B', true);
  update public.medlemskap set status = 'deaktivert', til = now()
  where bruker_id = '${KONTO.b1}' and status = 'aktiv' and not primaer;
  commit;
`

const opprett = (hvem: Konto, navn: string, emoji: string) =>
  `${som(hvem)} select public.opprett_diskusjonskategori('${SIDE}', '${navn}', '${emoji}');`

const KATEGORIER = `
  select coalesce(json_agg(json_build_array(f.nokkel, k.navn, k.emoji, k.posisjon) order by f.nokkel, k.posisjon), '[]')
  from public.diskusjonskategorier k join public.fagmiljoer f on f.id = k.fagmiljo_id
  where k.side = '${SIDE}'`

describe.skipIf(!SERVER)('samtidige endringer av diskusjonskategoriene (ekte Postgres)', () => {
  const mal = `ousfar_kategorier_${process.pid}_${Date.now()}`
  const databaser: string[] = []

  beforeAll(() => {
    psql('postgres', `create database ${mal};`)
    databaser.push(mal)
    psql(mal, strukturskript())
    psql(mal, OPPSETT)
  }, 120_000)

  afterAll(() => {
    slettDatabaser(databaser)
  })

  /** En ny database fra malen, med én økt per konto. */
  function ny(): { db: string; okter: Record<Konto, Okt>; slutt: () => void } {
    const db = `${mal}_${databaser.length}`
    psql('postgres', `create database ${db} template ${mal};`)
    databaser.push(db)
    const okter = { a1: new Okt(db), a2: new Okt(db), b1: new Okt(db) }
    return { db, okter, slutt: () => Object.values(okter).forEach((o) => o.avslutt()) }
  }

  it('kjører på Postgres 17 eller nyere, med b1 i arbeidskonteksten B', () => {
    expect(Number(psql(mal, 'show server_version_num;'))).toBeGreaterThanOrEqual(170000)
    expect(
      psql(mal, `select f.nokkel from public.medlemskap m join public.fagmiljoer f on f.id = m.fagmiljo_id where m.bruker_id = '${KONTO.b1}' and m.status = 'aktiv'`),
    ).toBe('ous-rettstoksikologi')
  })

  it.each([
    ['a1', 'b1'],
    ['b1', 'a1'],
  ] as const)('lar %s og %s i hvert sitt fagmiljø lage samme kategori samtidig', async (forst, sist) => {
    const { db, okter, slutt } = ny()
    try {
      for (const k of [forst, sist]) expect(await okter[k].kjor('begin;')).toBe('00000')
      expect(await okter[forst].kjor(opprett(forst, 'Generelt', '💬'))).toBe('00000')
      // Den andre venter ikke på den første: ulike rom gir ulike nøkler.
      const andre = okter[sist].send(opprett(sist, 'Generelt', '💬'))()
      expect(await okter[sist].venterFortsatt(andre, 1_000)).toBe(false)
      expect(await andre).toBe('00000')
      expect(await okter[sist].kjor('commit;')).toBe('00000')
      expect(await okter[forst].kjor('commit;')).toBe('00000')
    } finally {
      slutt()
    }
    expect(JSON.parse(psql(db, KATEGORIER))).toEqual([
      ['ous-klinisk-farmakologi', 'Generelt', '💬', 0],
      ['ous-rettstoksikologi', 'Generelt', '💬', 0],
    ])
  }, 60_000)

  describe.each([
    ['samme navn', 'Generelt', 'generelt', '💬', '🆕'],
    ['samme emoji', 'Generelt', 'Annet', '💬', '💬'],
  ])('to i samme fagmiljø lager en kategori med %s samtidig', (_, navn1, navn2, emoji1, emoji2) => {
    it.each(['commit', 'rollback'] as const)('stopper den andre når den første gjør %s, eller lar den lykkes', async (slutten) => {
      const { db, okter, slutt } = ny()
      let andreSvar: string
      try {
        for (const k of ['a1', 'a2'] as const) expect(await okter[k].kjor('begin;')).toBe('00000')
        expect(await okter.a1.kjor(opprett('a1', navn1, emoji1))).toBe('00000')
        const andre = okter.a2.send(opprett('a2', navn2, emoji2))()
        // Den andre venter på den første (samme nøkkel i indeksen).
        expect(await okter.a2.venterFortsatt(andre, 500)).toBe(true)
        expect(await okter.a1.kjor(`${slutten};`)).toBe('00000')
        andreSvar = await andre
        await okter.a2.kjor(andreSvar === '00000' ? 'commit;' : 'rollback;')
      } finally {
        slutt()
      }
      expect(andreSvar).toBe(slutten === 'commit' ? '23505' : '00000')
      expect(JSON.parse(psql(db, KATEGORIER))).toHaveLength(1)
    }, 60_000)
  })

  it('lar bare én av to gi hver sin kategori samme nye navn samtidig', async () => {
    const { db, okter, slutt } = ny()
    const [en, to] = [
      psql(db, `begin; ${som('a1')} select public.opprett_diskusjonskategori('${SIDE}', 'En', '🍎'); commit;`).split('\n').pop()!,
      psql(db, `begin; ${som('a2')} select public.opprett_diskusjonskategori('${SIDE}', 'To', '🍐'); commit;`).split('\n').pop()!,
    ]
    const endre = (hvem: Konto, id: string) => `${som(hvem)} select public.endre_diskusjonskategori('${id}', 'Felles navn', '${hvem === 'a1' ? '🅰️' : '🅱️'}');`
    try {
      for (const k of ['a1', 'a2'] as const) expect(await okter[k].kjor('begin;')).toBe('00000')
      expect(await okter.a1.kjor(endre('a1', en))).toBe('00000')
      const andre = okter.a2.send(endre('a2', to))()
      const forsteCommit = okter.a1.send('commit;')()
      const svar = await andre
      await okter.a2.kjor(svar === '00000' ? 'commit;' : 'rollback;')
      expect([await forsteCommit, svar]).toEqual(['00000', '23505'])
    } finally {
      slutt()
    }
    expect(JSON.parse(psql(db, KATEGORIER)).map((k: unknown[]) => k[1]).sort()).toEqual(['Felles navn', 'To'])
  }, 60_000)
})
