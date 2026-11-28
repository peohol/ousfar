/**
 * Datert stillingshistorikk (#602, `supabase/migrations/*_stillingshistorikk.sql`,
 * docs/stillinger.md «Stilling per dag»): stillingen per dag, at en endring
 * gjelder fra i dag og aldri skriver om tidligere dager, at historikken ikke
 * kan få hull eller overlapp, at katalogendringer ikke skriver den om, og
 * myndigheten etter B14 (docs/personal.md §8.5) med medlemskap i flere
 * fagmiljøer.
 *
 * Bare syntetiske kontoer og fagmiljøer. «I dag» flyttes ved å bytte ut
 * `intern.stillingsdag()` i testdatabasen. Fagmiljøene R og R2 er syntetiske
 * fagmiljøer som ikke er testmiljø, med en syntetisk godkjenning, slik
 * personalkalenderen prøves (docs/personal.md §8.3).
 */
import { addDays } from '@delt/personal/dates'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { avsluttMedlemskap, opprettFagmiljo, opprettMedlem, type Person } from './hjelp/persongalleri'
import { feilFra, opprettBruker } from './hjelp/testdatabase'
import { byggPersonaldatabase, migrasjon, type Personaldatabase } from './personal/database'

let p: Personaldatabase
let iDag: string

/** Brukerne og fagmiljøene testene lager selv. */
const k: Record<'ola' | 'kari' | 'adminR' | 'adminR2' | 'begge' | 'slett', string> = {
  ola: '',
  kari: '',
  adminR: '',
  adminR2: '',
  begge: '',
  slett: '',
}
let R = ''
let R2 = ''
let A = ''

const GRUNN = 'Test av stillingshistorikken (syntetisk)'

/** Flytter «i dag» for stillingene. */
async function vedDag(dag: string) {
  await p.db.exec(`create or replace function intern.stillingsdag() returns date language sql stable set search_path = '' as $$ select '${dag}'::date $$`)
}

const stillingId = async (navn: string) => (await p.db.query<{ id: string }>('select id from public.stillinger where navn = $1', [navn])).rows[0]!.id
const sett = (aktor: Person | string, bruker: string, stilling: string | null) => p.kall(aktor, 'select public.sett_stilling($1, $2)', [bruker, stilling])
const kode = async (arbeid: () => Promise<unknown>) => (await feilFra(arbeid))?.code ?? 'ok'
const prov = async (aktor: Person | string, bruker: string, stilling: string | null) => {
  const svar = await p.prov(aktor, 'select public.sett_stilling($1, $2)', [bruker, stilling])
  return 'ok' in svar ? 'ok' : svar.feil.code
}

interface Periode {
  fra: string
  til: string
  stilling: string | null
  fjernet: boolean
}

/** Stillingsperiodene til brukeren, slik serveren gir dem. */
async function perioder(bruker: string, fra: string, til: string): Promise<Periode[]> {
  const { rows } = await p.db.query<Periode>(
    `select fra::text, til::text, stilling, fjernet from intern.stillingsperioder(array[$1]::uuid[], $2::date, $3::date)`,
    [bruker, fra, til],
  )
  return rows
}

const paDag = async (bruker: string, dag: string) =>
  (await p.db.query<{ s: string | null }>('select intern.stilling_pa_dag($1, $2::date) as s', [bruker, dag])).rows[0]!.s

/** Radene i historikken, eldste først. */
const rader = async (bruker: string) =>
  (
    await p.db.query<{ fra: string | null; stilling: string | null }>(
      `select h.fra::text, coalesce(s.navn, f.navn) as stilling from intern.stillingshistorikk h
       left join public.stillinger s on s.id = h.stilling_id left join intern.fjernede_stillinger f on f.id = h.stilling_id
       where h.bruker_id = $1 order by h.fra nulls first`,
      [bruker],
    )
  ).rows

/** Som superbruker med tilgangsgrunnen, og med utløserne av, slik en eldre tilstand legges inn. */
const utenUtlosere = (sql: string, parametre: unknown[] = []) =>
  p.somServer(async (tx) => {
    await tx.query('set local session_replication_role = replica')
    await tx.query(sql, parametre)
  })

beforeAll(async () => {
  p = await byggPersonaldatabase()
  iDag = (await p.db.query<{ d: string }>(`select intern.stillingsdag()::text as d`)).rows[0]!.d
  A = p.galleri.fagmiljo.A
  const ny = (brukernavn: string, fornavn: string) => opprettBruker(p.db, { brukernavn, fornavn, etternavn: 'Testesen', rolle: 'user' })
  k.ola = await ny('test.hist.ola', 'Ola')
  k.kari = await ny('test.hist.kari', 'Kari')
  k.adminR = await ny('test.hist.adminr', 'Ada')
  k.adminR2 = await ny('test.hist.adminr2', 'Bo')
  k.begge = await ny('test.hist.begge', 'Cato')
  k.slett = await ny('test.hist.slett', 'Siri')
  R = await opprettFagmiljo(p.db, { nokkel: 'test-hist-r', navn: 'Fagmiljø R', administrator: k.adminR })
  R2 = await opprettFagmiljo(p.db, { nokkel: 'test-hist-r2', navn: 'Fagmiljø R2', administrator: k.adminR2 })
  // Kari er medlem av A (primær), R og R2; Cato administrerer både R og R2.
  for (const f of [R, R2]) await opprettMedlem(p.db, k.kari, f)
  await opprettMedlem(p.db, k.begge, R)
  await opprettMedlem(p.db, k.begge, R2)
  await p.somServer(async (tx) => {
    for (const f of [R, R2]) await tx.query('insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ($1, $2)', [k.begge, f])
  })
}, 120_000)

afterAll(async () => {
  await p.db.close()
})

describe('stillingen per dag', () => {
  it('gjør stillingene som står i dag, til første rad med åpen startdato', async () => {
    // Som før migrasjonen: stillingen står på profilen, uten historikk.
    const lis = await stillingId('LIS')
    await utenUtlosere('update public.profiles set stilling_id = $1 where id = $2', [lis, k.slett])
    expect(await rader(k.slett)).toEqual([])
    const fylling = migrasjon('stillingshistorikk').match(/insert into intern\.stillingshistorikk \(bruker_id, fra, stilling_id\)[\s\S]*?;/)
    expect(fylling).not.toBeNull()
    // Migrasjonen fyller historikken før vakten på tabellen finnes.
    await utenUtlosere(fylling![0])
    expect(await rader(k.slett)).toEqual([{ fra: null, stilling: 'LIS' }])
    expect(await perioder(k.slett, '2000-01-01', iDag)).toEqual([{ fra: '2000-01-01', til: iDag, stilling: 'LIS', fjernet: false }])
  })

  it('er uten stilling for en som aldri har hatt en', async () => {
    expect(await rader(k.ola)).toEqual([])
    expect(await perioder(k.ola, addDays(iDag, -30), addDays(iDag, 30))).toEqual([
      { fra: addDays(iDag, -30), til: addDays(iDag, 30), stilling: null, fjernet: false },
    ])
    expect(await paDag(k.ola, iDag)).toBeNull()
  })

  it('gjelder fra dagen den endres, uten å skrive om tidligere dager', async () => {
    const d1 = addDays(iDag, 1)
    const d2 = addDays(iDag, 5)
    const lis = await stillingId('LIS')
    const overlege = await stillingId('Overlege')
    await vedDag(d1)
    await sett(k.ola, k.ola, lis)
    await vedDag(d2)
    await sett(k.ola, k.ola, overlege)
    expect(await perioder(k.ola, iDag, addDays(d2, 2))).toEqual([
      { fra: iDag, til: addDays(d1, -1), stilling: null, fjernet: false },
      { fra: d1, til: addDays(d2, -1), stilling: 'LIS', fjernet: false },
      { fra: d2, til: addDays(d2, 2), stilling: 'Overlege', fjernet: false },
    ])
    expect(await paDag(k.ola, addDays(d1, -1))).toBeNull()
    expect(await paDag(k.ola, d1)).toBe(lis)
    expect(await paDag(k.ola, addDays(d2, -1))).toBe(lis)
    expect(await paDag(k.ola, d2)).toBe(overlege)
    // Den gjeldende raden er alltid profilens stilling.
    expect((await p.db.query<{ s: string }>('select stilling_id as s from public.profiles where id = $1', [k.ola])).rows[0]!.s).toBe(overlege)
  })

  it('gir dagens siste ved flere endringer samme dag, og ingen rad som er lik den før', async () => {
    const d2 = addDays(iDag, 5)
    await sett(k.ola, k.ola, await stillingId('Kjemiker'))
    await sett(k.ola, k.ola, await stillingId('Bioingeniør'))
    expect((await rader(k.ola)).map((r) => r.stilling)).toEqual(['LIS', 'Bioingeniør'])
    // Tilbake til det som gjaldt i går: dagens rad forsvinner.
    await sett(k.ola, k.ola, await stillingId('LIS'))
    expect(await rader(k.ola)).toEqual([{ fra: addDays(iDag, 1), stilling: 'LIS' }])
    // Uten stilling fra i dag.
    await sett(k.ola, k.ola, null)
    expect(await rader(k.ola)).toEqual([
      { fra: addDays(iDag, 1), stilling: 'LIS' },
      { fra: d2, stilling: null },
    ])
    expect(await paDag(k.ola, d2)).toBeNull()
    expect(await paDag(k.ola, addDays(d2, 100))).toBeNull()
  })

  it('dekker hver dag i perioden nøyaktig én gang, for mange brukere samtidig', async () => {
    const fra = addDays(iDag, -3)
    const til = addDays(iDag, 10)
    const { rows } = await p.db.query<{ bruker_id: string; fra: string; til: string }>(
      `select bruker_id, fra::text, til::text from intern.stillingsperioder($1::uuid[], $2::date, $3::date)`,
      [[k.ola, k.slett, k.kari, k.ola], fra, til],
    )
    for (const bruker of [k.ola, k.slett, k.kari]) {
      const mine = rows.filter((r) => r.bruker_id === bruker)
      expect(mine[0]!.fra).toBe(fra)
      expect(mine.at(-1)!.til).toBe(til)
      for (let i = 1; i < mine.length; i++) expect(mine[i]!.fra).toBe(addDays(mine[i - 1]!.til, 1))
    }
    expect(new Set(rows.map((r) => r.bruker_id)).size).toBe(3)
    expect(await kode(() => p.db.query(`select * from intern.stillingsperioder(array[$1]::uuid[], $2::date, $3::date)`, [k.ola, til, fra]))).toBe('22023')
  })

  it('lar ikke historikken endres bakover i tid, få hull eller overlapp, heller ikke direkte i tabellen', async () => {
    const sql = (q: string, v: unknown[] = []) => kode(() => p.somServer((tx) => tx.query(q, v)))
    const d1 = addDays(iDag, 1)
    expect(await sql('update intern.stillingshistorikk set fra = fra - 1 where bruker_id = $1 and fra = $2', [k.ola, d1])).toBe('42501')
    expect(await sql('update intern.stillingshistorikk set stilling_id = null where bruker_id = $1 and fra = $2', [k.ola, d1])).toBe('42501')
    expect(await sql('delete from intern.stillingshistorikk where bruker_id = $1 and fra = $2', [k.ola, d1])).toBe('42501')
    expect(await sql('delete from intern.stillingshistorikk where bruker_id = $1 and fra is null', [k.slett])).toBe('42501')
    // En ny rad gjelder fra i dag, ikke før og ikke senere.
    for (const dag of [addDays(iDag, 2), addDays(iDag, 50)]) {
      expect(await sql('insert into intern.stillingshistorikk (bruker_id, fra) values ($1, $2)', [k.ola, dag]), dag).toBe('42501')
    }
    // To rader samme dag går ikke, heller ikke to med åpen start.
    expect(await sql('insert into intern.stillingshistorikk (bruker_id, fra) values ($1, null)', [k.slett])).toBe('42501')
    await expect(
      utenUtlosere('insert into intern.stillingshistorikk (bruker_id, fra) values ($1, null)', [k.slett]),
    ).rejects.toMatchObject({ code: '23505' })
    await expect(
      utenUtlosere('insert into intern.stillingshistorikk (bruker_id, fra) values ($1, $2)', [k.ola, d1]),
    ).rejects.toMatchObject({ code: '23505' })
    // En stilling som ikke finnes, kan ikke føres.
    expect(await sql('insert into intern.stillingshistorikk (bruker_id, fra, stilling_id) values ($1, intern.stillingsdag(), gen_random_uuid())', [k.kari])).toBe('P0002')
  })

  it('leses ikke fra nettleseren', async () => {
    for (const sql of [
      'select * from intern.stillingshistorikk',
      'select * from intern.fjernede_stillinger',
      `select * from intern.stillingsperioder(array[auth.uid()], current_date, current_date)`,
      'select intern.stilling_pa_dag(auth.uid(), current_date)',
    ]) {
      expect(await p.feilkode('vanligA', sql), sql).toBe('42501')
      expect(await p.feilkode('systemarkitekt', sql), sql).toBe('42501')
    }
  })

  it('går med kontoen når den slettes', async () => {
    await sett(k.slett, k.slett, await stillingId('Kjemiker'))
    expect((await rader(k.slett)).length).toBe(2)
    await p.somServer((tx) => tx.query('delete from auth.users where id = $1', [k.slett]))
    expect(await rader(k.slett)).toEqual([])
  })
})

describe('katalogendringer', () => {
  it('skriver ikke om historikken når en stilling får nytt navn, eller fjernes med en erstatning', async () => {
    await vedDag(addDays(iDag, 10))
    const kategori = (await p.db.query<{ id: string }>(`select id from public.stillingskategorier where navn = 'Annet'`)).rows[0]!.id
    const gammel = await p.kall<string>('systemarkitekt', `select public.lagre_stilling(null, $1, 'Testkoordinator')`, [kategori])
    const ny = await p.kall<string>('systemarkitekt', `select public.lagre_stilling(null, $1, 'Testleder')`, [kategori])
    await sett(k.ola, k.ola, gammel)
    await vedDag(addDays(iDag, 12))
    // Nytt navn: det er den samme stillingen, også bakover.
    await p.kall('systemarkitekt', `select public.lagre_stilling($1, $2, 'Testkoordinator II')`, [gammel, kategori])
    expect(await paDag(k.ola, addDays(iDag, 10))).toBe(gammel)
    // Fjernet med erstatning: de tidligere dagene står med den gamle stillingen og navnet.
    expect(await p.kall('systemarkitekt', 'select public.fjern_stilling($1, $2)', [gammel, ny])).toBe(1)
    expect(await perioder(k.ola, addDays(iDag, 10), addDays(iDag, 13))).toEqual([
      { fra: addDays(iDag, 10), til: addDays(iDag, 11), stilling: 'Testkoordinator II', fjernet: true },
      { fra: addDays(iDag, 12), til: addDays(iDag, 13), stilling: 'Testleder', fjernet: false },
    ])
    expect(await paDag(k.ola, addDays(iDag, 11))).toBe(gammel)
    // Lista er som før: den fjernede er borte derfra.
    expect((await p.db.query('select 1 from public.stillinger where id = $1', [gammel])).rows).toEqual([])
    // En stilling ingen har hatt, huskes ikke.
    const ubrukt = await p.kall<string>('systemarkitekt', `select public.lagre_stilling(null, $1, 'Ubrukt')`, [kategori])
    await p.kall('systemarkitekt', 'select public.fjern_stilling($1)', [ubrukt])
    expect((await p.db.query('select 1 from intern.fjernede_stillinger where id = $1', [ubrukt])).rows).toEqual([])
    // Og en som bare noen har hatt tidligere, fjernes uten erstatning og huskes.
    await vedDag(addDays(iDag, 14))
    await sett(k.ola, k.ola, await stillingId('LIS'))
    expect(await p.kall('systemarkitekt', 'select public.fjern_stilling($1)', [ny])).toBe(0)
    expect(await paDag(k.ola, addDays(iDag, 13))).toBe(ny)
    expect((await perioder(k.ola, addDays(iDag, 13), addDays(iDag, 13)))[0]).toMatchObject({ stilling: 'Testleder', fjernet: true })
  })
})

describe('myndigheten når stillingen styrer vaktene (B14)', () => {
  it('styrer ikke vaktene før kalenderen er på i et fagmiljø som ikke er testmiljø', async () => {
    expect(await p.db.query<{ f: string[] }>('select array(select personal.stilling_styrer_vakter($1)) as f', [k.kari]).then((r) => r.rows[0]!.f)).toEqual([])
    // Som før: Kari kan endre sin egen, og adminA kan endre den fra A.
    expect(await prov(k.kari, k.kari, await stillingId('LIS'))).toBe('ok')
    expect(await prov('adminA', k.kari, await stillingId('LIS'))).toBe('ok')
  })

  it('krever lokal administrator i hvert fagmiljø med kalenderen på, uansett hvor endringen gjøres fra', async () => {
    await vedDag(addDays(iDag, 19))
    await sett(k.kari, k.kari, await stillingId('LIS'))
    await vedDag(addDays(iDag, 20))
    for (const f of [R, R2]) {
      await p.somServer((tx) =>
        tx.query(`insert into public.funksjonsgodkjenninger (funksjon, fagmiljo_id, grunnlag) values ('personal', $1, 'Syntetisk godkjenning i testen')`, [f]),
      )
      await p.kall('systemarkitekt', `select public.sett_funksjonsbryter('personal', $1, 'på', $2)`, [f, GRUNN])
    }
    const styrer = await p.db.query<{ f: string[] }>('select array(select personal.stilling_styrer_vakter($1) order by 1) as f', [k.kari]).then((r) => r.rows[0]!.f)
    expect(styrer).toEqual([R, R2].sort())

    const overlege = await stillingId('Overlege')
    // Ikke personen selv.
    expect(await prov(k.kari, k.kari, overlege)).toBe('42501')
    // Ikke fra et annet fagmiljø uten myndighet der kalenderen er på.
    expect(await prov('adminA', k.kari, overlege)).toBe('42501')
    // Ikke med myndighet i bare ett av dem.
    expect(await prov(k.adminR, k.kari, overlege)).toBe('42501')
    expect(await prov(k.adminR2, k.kari, overlege)).toBe('42501')
    // Ingen utvidelse av den globale systemarkitekttilgangen.
    expect(await prov('systemarkitekt', k.kari, overlege)).toBe('42501')
    // Med myndighet i begge: går, også for å fjerne stillingen.
    expect(await prov(k.begge, k.kari, null)).toBe('ok')
    await sett(k.begge, k.kari, overlege)
    expect(await perioder(k.kari, addDays(iDag, 19), addDays(iDag, 20))).toEqual([
      { fra: addDays(iDag, 19), til: addDays(iDag, 19), stilling: 'LIS', fjernet: false },
      { fra: addDays(iDag, 20), til: addDays(iDag, 20), stilling: 'Overlege', fjernet: false },
    ])
    // Meldingen sier hvem som kan endre den.
    expect((await p.feil(k.kari, 'select public.sett_stilling($1, null)', [k.kari]))?.message).toBe(
      'Stillingen din brukes i planleggingen i fagmiljøet og kan bare endres av en lokal administrator der.',
    )
  })

  it('viser i medlemslistene hvem som kan endre stillingen', async () => {
    const kanEndre = async (aktor: Person | string, fagmiljo: string) =>
      (
        await p.kall<{ bruker_id: string; endre_stilling: boolean }[]>(aktor, 'select array(select row_to_json(m) from public.medlemsoversikt($1) m)', [fagmiljo])
      ).find((r) => r.bruker_id === k.kari)?.endre_stilling
    expect(await kanEndre('adminA', A)).toBe(false)
    expect(await kanEndre(k.adminR, R)).toBe(false)
    expect(await kanEndre(k.begge, R)).toBe(true)
    expect(await kanEndre(k.begge, R2)).toBe(true)
  })

  it('lar ikke en systemarkitekt gi en erstatning når en stilling fjernes fra lista', async () => {
    const overlege = await stillingId('Overlege')
    const feil = await p.feil('systemarkitekt', 'select public.fjern_stilling($1, $2)', [overlege, await stillingId('LIS')])
    expect(feil?.code).toBe('42501')
    expect(feil?.message).toBe('Én bruker med denne stillingen kan bare få en annen stilling av en lokal administrator i fagmiljøet. Den må endres der først.')
    expect(await stillingId('Overlege')).toBe(overlege)
    expect(await paDag(k.kari, addDays(iDag, 20))).toBe(overlege)
  })

  it('gjelder bare de fagmiljøene der personen fortsatt er medarbeider', async () => {
    await avsluttMedlemskap(p.db, k.kari, R2)
    expect(await prov(k.adminR, k.kari, null)).toBe('ok')
    expect(await prov(k.adminR2, k.kari, null)).toBe('42501')
    expect(await prov(k.kari, k.kari, null)).toBe('42501')
    await avsluttMedlemskap(p.db, k.kari, R)
    // Uten kalender: som før.
    expect(await prov(k.kari, k.kari, null)).toBe('ok')
    expect(await prov('adminA', k.kari, null)).toBe('ok')
  })

  it('krever myndighet over en systemarkitekt som før', async () => {
    // Cato er ikke systemarkitekt og kan ikke endre stillingen til en, heller ikke der kalenderen er på.
    await opprettMedlem(p.db, p.galleri.id.systemarkitekt, R)
    expect(await prov(k.begge, p.galleri.id.systemarkitekt, null)).toBe('42501')
    expect(await prov('systemarkitekt', p.galleri.id.systemarkitekt, null)).toBe('42501')
  })
})
