/**
 * P7 tråd D: krysstestene for gruppechatten (docs/p7-testplan.md, avsnitt 3–5
 * der det står D). Tråd A prøver hver funksjon for seg i
 * `gruppechat.test.ts`; her prøves det som går på tvers:
 *
 * - den negative matrisen for alle inngangene samlet, med gruppene i begge
 *   fagmiljøene og den tverrfaglige gruppen, og samme svar som for en gruppe
 *   eller melding som ikke finnes;
 * - tabellene og `intern` direkte, slik nettleseren kan kalle dem;
 * - at meldingsteksten bare står ett sted i hele databasen, og ingen steder
 *   etter endring eller sletting, heller ikke i varsler, logger eller feil;
 * - at tilgangen følger medlemskapet med den samme innloggingen, begge veier.
 *
 * Gruppene: «GA» i fagmiljø A (`adminA` ansvarlig, `dobbeltAB` moderator,
 * `vanligA` medlem, `redaktorRessursA` invitert), «GB» i B (`adminB`
 * ansvarlig, `vanligB` medlem, ingen fra A) og den tverrfaglige «GT»
 * (systemarkitekten ansvarlig, `vanligA` og `vanligB`). Bare syntetiske
 * tekster og numre.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PASIENTREGEL } from '@delt/pasientopplysninger'
import { lesChatside, lesGruppemelding } from '../gruppechat/modell'
import { avsluttMedlemskap, byggPersongalleri, opprettMedlem, type Person, type Persongalleri } from './hjelp/persongalleri'
import { syntetiskPersonnummer } from './hjelp/syntetiskPersonnummer'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

let basis: PGlite
let db: PGlite
let galleri: Persongalleri
const grupper = { GA: '', GB: '', GT: '' }
type Gruppe = keyof typeof grupper

const id = (p: Person) => galleri.id[p]
const INGEN = '00000000-0000-4000-8000-00000000dead'
const SLA_PA = `create or replace function intern.gruppechat_aktivert() returns boolean language sql stable set search_path = '' as 'select true'`

const somPerson = <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db) =>
  som(i, id(person), async (tx) => (await tx.query<T>(sql, parametre)).rows)
const verdi = async <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db): Promise<T> =>
  Object.values((await somPerson<Record<string, T>>(person, sql, parametre, i))[0]!)[0] as T
const feil = async (arbeid: () => Promise<unknown>) => {
  const f = await feilFra(arbeid)
  return f ? { kode: f.code, melding: f.message } : null
}

let teller = 0
const nyKlientId = () => `00000000-0000-4000-9000-${String(++teller).padStart(12, '0')}`
const send = async (person: Person, gruppe: string, tekst = 'Testmelding', klientId = nyKlientId()) =>
  lesGruppemelding(await verdi(person, 'select public.send_gruppemelding($1, $2, $3)', [gruppe, klientId, tekst]))!
const les = async (person: Person, gruppe: string) => lesChatside(await verdi(person, 'select public.les_gruppechat($1, null)', [gruppe]))!
const endre = (person: Person, melding: string, tekst: string) => verdi(person, 'select public.endre_gruppemelding($1, $2)', [melding, tekst])
const slett = (person: Person, melding: string) => verdi(person, 'select public.slett_gruppemelding($1)', [melding])

async function medlem(aktor: Person, gruppe: string, mal: Person, i: PGlite = db) {
  await verdi(aktor, 'select public.inviter_til_gruppe($1, $2)', [gruppe, `test.${mal.toLowerCase()}`], i)
  await verdi(mal, 'select public.svar_paa_gruppeinvitasjon($1, true)', [gruppe], i)
}

/**
 * Hver inngang til chatten, med feilen den gir (null: gikk): de seks
 * funksjonene i kontrakten, `gruppeoversikt` (der `chat_uleste` står) og
 * chatraden sanntiden lytter på.
 */
async function innganger(person: Person, gruppe: string, melding: string) {
  return {
    les: await feil(() => les(person, gruppe)),
    endringer: await feil(() => verdi(person, 'select public.gruppechat_endringer($1, 0, 50)', [gruppe])),
    send: await feil(() => send(person, gruppe)),
    merk: await feil(() => verdi(person, 'select public.merk_gruppechat_lest($1, 1)', [gruppe])),
    endre: await feil(() => endre(person, melding, 'Endret testmelding')),
    slett: await feil(() => slett(person, melding)),
    oversikt: await feil(() => verdi(person, 'select public.gruppeoversikt($1)', [gruppe])),
    chatrad: (await somPerson<{ gruppe_id: string }>(person, 'select gruppe_id from public.gruppechatter where gruppe_id = $1', [gruppe])).length,
  }
}

/** Feilkodene fra de seks chatfunksjonene og gruppeoversikten, i den rekkefølgen. */
const koder = (svar: Awaited<ReturnType<typeof innganger>>) =>
  [svar.les, svar.endringer, svar.send, svar.merk, svar.endre, svar.slett, svar.oversikt].map((f) => f?.kode)

/**
 * Hvor i databasen en tekst står: hver kolonne med tekst eller JSON i hver
 * tabell utenom systemkatalogene, forbi radsikkerheten. Svaret er
 * `skjema.tabell.kolonne` for hver kolonne der teksten finnes.
 */
async function hvorStaar(tekst: string): Promise<string[]> {
  const kolonner = (
    await db.query<{ skjema: string; tabell: string; kolonne: string }>(
      `select n.nspname as skjema, c.relname as tabell, a.attname as kolonne
       from pg_attribute a
       join pg_class c on c.oid = a.attrelid
       join pg_namespace n on n.oid = c.relnamespace
       where c.relkind in ('r', 'p', 'm')
         and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
         and a.attnum > 0 and not a.attisdropped
         and (a.atttypid in ('text'::regtype, 'varchar'::regtype, 'bpchar'::regtype, 'json'::regtype, 'jsonb'::regtype, 'text[]'::regtype)
              or (select t.typtype from pg_type t where t.oid = a.atttypid) = 'd')`,
    )
  ).rows
  const tabeller = new Map<string, string[]>()
  for (const k of kolonner) tabeller.set(`"${k.skjema}"."${k.tabell}"`, [...(tabeller.get(`"${k.skjema}"."${k.tabell}"`) ?? []), k.kolonne])
  const funn: string[] = []
  for (const [tabell, navn] of tabeller) {
    const treff = (
      await db.query<Record<string, boolean>>(
        `select ${navn.map((k, i) => `coalesce(bool_or(position($1 in "${k}"::text) > 0), false) as k${i}`).join(', ')} from ${tabell}`,
        [tekst],
      )
    ).rows[0]!
    navn.forEach((k, i) => treff[`k${i}`] && funn.push(`${tabell.replaceAll('"', '')}.${k}`))
  }
  return funn.sort()
}

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
  await basis.exec(SLA_PA)
  grupper.GA = await verdi<string>('adminA', 'select public.opprett_gruppe($1, $2, $3)', ['GA', 'Syntetisk', galleri.fagmiljo.A], basis)
  for (const p of ['vanligA', 'dobbeltAB'] as const) await medlem('adminA', grupper.GA, p, basis)
  await verdi('adminA', `select public.sett_grupperolle($1, $2, 'moderator')`, [grupper.GA, id('dobbeltAB')], basis)
  await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [grupper.GA, 'test.redaktorressursa'], basis)
  grupper.GB = await verdi<string>('adminB', 'select public.opprett_gruppe($1, $2, $3)', ['GB', 'Syntetisk', galleri.fagmiljo.B], basis)
  await medlem('adminB', grupper.GB, 'vanligB', basis)
  grupper.GT = await verdi<string>('systemarkitekt', 'select public.opprett_gruppe($1, $2, null)', ['GT', 'Syntetisk'], basis)
  for (const p of ['vanligA', 'vanligB'] as const) await medlem('systemarkitekt', grupper.GT, p, basis)
}, 180_000)

afterAll(async () => {
  await basis.close()
})

beforeEach(async () => {
  db = (await basis.clone()) as PGlite
})

afterEach(async () => {
  await db.close()
})

describe('den negative matrisen (testplanen, avsnitt 3)', () => {
  /** Svaret for en gruppe og en melding som ikke finnes, fra en som er med i GA. */
  const finnesIkke = () => innganger('vanligA', INGEN, INGEN)

  const UTENFOR: readonly [Person, Gruppe, string][] = [
    ['vanligA', 'GB', 'medlem i A, gruppe i B'],
    ['adminA', 'GB', 'lokal administrator i A, gruppe i B'],
    ['redaktorRessursA', 'GA', 'invitert, ikke svart'],
    ['adminB', 'GT', 'lokal administrator i B, ikke med i den tverrfaglige gruppen'],
    ['adminA', 'GT', 'lokal administrator i A, ikke med i den tverrfaglige gruppen'],
    ['avsluttetA', 'GA', 'medlemskapet i A avsluttet, aktiv i B'],
    ['dobbeltAB', 'GB', 'aktiv i B, men ikke med i gruppen'],
  ]

  it('gir alle utenfor det samme svaret som for en gruppe og en melding som ikke finnes, i alle inngangene', async () => {
    const meldinger = {
      GA: (await send('vanligA', grupper.GA)).id,
      GB: (await send('vanligB', grupper.GB)).id,
      GT: (await send('vanligB', grupper.GT)).id,
    }
    const fasit = await finnesIkke()
    // Chatfunksjonene svarer 42501; gruppeoversikten svarer P0002 med samme tekst
    // for alle grupper man ikke leser (P6), så heller ikke den skiller.
    expect(koder(fasit).slice(0, 6)).toEqual(Array(6).fill('42501'))
    expect(fasit.oversikt).toEqual({ kode: 'P0002', melding: fasit.les?.melding })
    expect(fasit.chatrad).toBe(0)
    for (const [person, gruppe, hvem] of UTENFOR) {
      expect(await innganger(person, grupper[gruppe], meldinger[gruppe]), `${person} i ${gruppe}: ${hvem}`).toEqual(fasit)
    }
  })

  it('gir det samme svaret for en melding fra en annen gruppe, også når man er med i gruppen kallet ellers gjelder', async () => {
    const fraB = await send('vanligB', grupper.GB, 'Testmelding i B')
    const fasit = await finnesIkke()
    expect(await feil(() => endre('vanligA', fraB.id, 'Endret'))).toEqual(fasit.endre)
    expect(await feil(() => slett('vanligA', fraB.id))).toEqual(fasit.slett)
    // Heller ikke moderatoren i A kan nå meldingen i B.
    expect(await feil(() => slett('dobbeltAB', fraB.id))).toEqual(fasit.slett)
    expect((await les('vanligB', grupper.GB)).meldinger.map((m) => m.tekst)).toEqual(['Testmelding i B'])
  })

  it('stopper den uten aktivt medlemskap i alle gruppene, før gruppen slås opp', async () => {
    const melding = (await send('vanligA', grupper.GA)).id
    for (const gruppe of Object.keys(grupper) as Gruppe[]) {
      const svar = await innganger('utenMedlemskap', grupper[gruppe], melding)
      expect(koder(svar), gruppe).toEqual(Array(7).fill('42501'))
      expect(svar.les?.melding, gruppe).toBe('Du har ikke lenger et aktivt medlemskap i OUSFAR.')
      expect(svar.chatrad, gruppe).toBe(0)
    }
  })

  it('lar systemarkitekten lese og skrive i gruppene i begge fagmiljøene og den tverrfaglige', async () => {
    for (const gruppe of Object.keys(grupper) as Gruppe[]) {
      const egen = await send('systemarkitekt', grupper[gruppe], `Fra systemarkitekten i ${gruppe}`)
      expect(egen, gruppe).toMatchObject({ egen: true, kan_endre: true, kan_slette: true })
      expect((await les('systemarkitekt', grupper[gruppe])).meldinger.map((m) => m.tekst), gruppe).toContain(`Fra systemarkitekten i ${gruppe}`)
    }
  })

  it('lar et medlem verken endre eller slette en annens melding, og en moderator bare slette', async () => {
    const fraA = await send('vanligA', grupper.GA)
    const fraAdmin = await send('adminA', grupper.GA)
    const fasit = await finnesIkke()
    expect((await feil(() => endre('vanligA', fraAdmin.id, 'Endret')))?.kode).toBe('42501')
    expect((await feil(() => slett('vanligA', fraAdmin.id)))?.kode).toBe('42501')
    expect((await feil(() => endre('dobbeltAB', fraA.id, 'Endret')))?.kode).toBe('42501')
    expect(await feil(() => slett('dobbeltAB', fraA.id))).toBeNull()
    expect(fasit.endre?.kode).toBe('42501')
  })
})

describe('tabellene og intern direkte', () => {
  const NETTLESERE: readonly Person[] = ['vanligA', 'adminA', 'dobbeltAB', 'systemarkitekt', 'vanligB']

  /** Tilstanden i chattabellene, forbi radsikkerheten. */
  const tilstand = async () =>
    JSON.stringify([
      (await db.query('select * from public.gruppemeldinger order by gruppe_id, nr')).rows,
      (await db.query('select * from public.gruppechat_lest order by gruppe_id, bruker_id')).rows,
      (await db.query('select * from public.gruppechatter order by gruppe_id')).rows,
    ])

  it('lar ingen lese meldingene eller lest-merkene rett fra tabellene, eller endre noen av chattabellene', async () => {
    const melding = await send('vanligA', grupper.GA)
    await send('vanligB', grupper.GT)
    await verdi('adminA', 'select public.merk_gruppechat_lest($1, 1)', [grupper.GA])
    const for_ = await tilstand()
    const forsok = (gruppe: string) => [
      'select * from public.gruppemeldinger',
      'select * from public.gruppechat_lest',
      `insert into public.gruppemeldinger (gruppe_id, nr, klient_id, tekst, endring) values ('${gruppe}', 99, '${INGEN}', 'Innsmuglet', 99)`,
      `update public.gruppemeldinger set tekst = 'Overskrevet' where id = '${melding.id}'`,
      `delete from public.gruppemeldinger where id = '${melding.id}'`,
      `insert into public.gruppechat_lest (gruppe_id, bruker_id, lest_til_nr) values ('${gruppe}', '${INGEN}', 1)`,
      'update public.gruppechat_lest set lest_til_nr = 0',
      'delete from public.gruppechat_lest',
      `insert into public.gruppechatter (gruppe_id) values ('${INGEN}')`,
      `update public.gruppechatter set siste_nr = 0, siste_endring = 0 where gruppe_id = '${gruppe}'`,
      `delete from public.gruppechatter where gruppe_id = '${gruppe}'`,
    ]
    for (const p of NETTLESERE) {
      for (const sql of forsok(grupper.GA)) {
        expect((await feil(() => somPerson(p, sql)))?.kode, `${p}: ${sql}`).toBe('42501')
      }
    }
    expect(await tilstand()).toBe(for_)
  })

  it('gir nettleseren ingen funksjon i intern', async () => {
    const kjorbare = await somPerson<{ navn: string }>(
      'vanligA',
      `select p.proname as navn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'intern'
         and has_schema_privilege('intern', 'USAGE')
         and has_function_privilege(p.oid, 'EXECUTE')`,
    )
    expect(kjorbare).toEqual([])
    for (const sql of ['select intern.gruppechat_aktivert()', 'select intern.rydd_gruppechat()']) {
      expect((await feil(() => somPerson('vanligA', sql)))?.kode, sql).toBe('42501')
    }
  })

  it('gir ingen tilgang uten innlogging', async () => {
    await send('vanligA', grupper.GA)
    const anon = (sql: string, parametre: unknown[] = []) => som(db, null, (tx) => tx.query(sql, parametre))
    for (const [sql, parametre] of [
      ['select public.les_gruppechat($1, null)', [grupper.GA]],
      ['select public.send_gruppemelding($1, $2, $3)', [grupper.GA, nyKlientId(), 'Fra anon']],
      ['select * from public.gruppechatter', []],
      ['select * from public.gruppemeldinger', []],
    ] as const) {
      const svar = await feilFra(() => anon(sql, [...parametre]))
      // Avvist, eller (for chatradene) ingen rader.
      if (svar) expect(svar.code, sql).toBe('42501')
      else expect((await anon(sql, [...parametre])).rows, sql).toEqual([])
    }
  })
})

describe('teksten bare ett sted (testplanen, avsnitt 4)', () => {
  it('står bare i meldingen etter sending', async () => {
    await send('vanligA', grupper.GA, 'Syntetisk merketekst alfa')
    expect(await hvorStaar('merketekst alfa')).toEqual(['public.gruppemeldinger.tekst'])
    // Fra D4b lager chatten ingen varsler (docs/gruppechat.md, «Uleste»); de andre har bare tallet på uleste.
    expect((await db.query(`select 1 from public.varsler where mottaker_id = $1 and kategori = 'gruppechat'`, [id('adminA')])).rows).toEqual([])
  })

  it('finnes ikke lenger noe sted etter endring, og den nye teksten bare i meldingen', async () => {
    const m = await send('vanligA', grupper.GT, 'Syntetisk merketekst beta')
    await endre('vanligA', m.id, 'Syntetisk merketekst gamma')
    expect(await hvorStaar('merketekst beta')).toEqual([])
    expect(await hvorStaar('merketekst gamma')).toEqual(['public.gruppemeldinger.tekst'])
  })

  it('finnes ingen steder etter sletting, enten forfatteren eller moderatoren sletter', async () => {
    const egen = await send('vanligA', grupper.GA, 'Syntetisk merketekst delta')
    const annen = await send('adminA', grupper.GA, 'Syntetisk merketekst epsilon')
    await endre('vanligA', egen.id, 'Syntetisk merketekst zeta')
    await slett('vanligA', egen.id)
    await slett('dobbeltAB', annen.id)
    for (const tekst of ['merketekst delta', 'merketekst epsilon', 'merketekst zeta']) expect(await hvorStaar(tekst), tekst).toEqual([])
  })

  it('lagres ikke og gjentas ikke i feilen når den avvises', async () => {
    const nummer = syntetiskPersonnummer(14, 3, 87)
    const avvist = await feil(() => send('vanligA', grupper.GA, `Syntetisk merketekst eta ${nummer}`))
    expect(avvist).toEqual({ kode: '22023', melding: PASIENTREGEL.avvist })
    const forLang = await feil(() => send('vanligA', grupper.GA, `Syntetisk merketekst theta ${'x'.repeat(20_000)}`))
    expect(forLang?.kode).toBe('22023')
    expect(forLang?.melding).not.toContain('merketekst')
    // Heller ikke i en endring.
    const m = await send('vanligA', grupper.GA, 'Syntetisk merketekst iota')
    expect(await feil(() => endre('vanligA', m.id, `Syntetisk merketekst kappa ${nummer}`))).toEqual({ kode: '22023', melding: PASIENTREGEL.avvist })
    for (const tekst of [nummer, 'merketekst eta', 'merketekst theta', 'merketekst kappa']) expect(await hvorStaar(tekst), tekst).toEqual([])
    expect(await hvorStaar('merketekst iota')).toEqual(['public.gruppemeldinger.tekst'])
  })

  it('lekker ikke inn i det en utenforstående får se: avslagene er like med og uten meldinger', async () => {
    const tom = await innganger('vanligB', grupper.GA, INGEN)
    await send('vanligA', grupper.GA, 'Syntetisk merketekst lambda')
    const medMelding = await innganger('vanligB', grupper.GA, INGEN)
    expect(medMelding).toEqual(tom)
    expect(JSON.stringify(await somPerson('vanligB', 'select * from public.varsler'))).not.toContain('merketekst')
  })
})

describe('tilgangen følger medlemskapet, med den samme innloggingen', () => {
  it('forsvinner når medlemskapet i fagmiljøet avsluttes, og kommer tilbake når det blir aktivt igjen', async () => {
    await send('adminA', grupper.GA, 'Før')
    await avsluttMedlemskap(db, id('vanligA'), galleri.fagmiljo.A)
    expect((await feil(() => les('vanligA', grupper.GA)))?.kode).toBe('42501')
    expect((await feil(() => send('vanligA', grupper.GT)))?.kode).toBe('42501')
    await opprettMedlem(db, id('vanligA'), galleri.fagmiljo.A, { primaer: true })
    expect((await les('vanligA', grupper.GA)).meldinger.map((m) => m.tekst)).toEqual(['Før'])
    expect(await send('vanligA', grupper.GT)).toMatchObject({ egen: true })
  })

  it('lar ikke en med avsluttet medlemskap i fagmiljøet inviteres til en gruppe der', async () => {
    expect((await feil(() => verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [grupper.GA, 'test.avslutteta'])))?.kode).toMatch(/^(42501|22023|P0002)$/)
    expect((await feil(() => les('avsluttetA', grupper.GA)))?.kode).toBe('42501')
  })

  it('gir et medlem fra B i den tverrfaglige gruppen ingenting fra gruppene i A', async () => {
    await send('vanligA', grupper.GA, 'Bare i A')
    await send('vanligA', grupper.GT, 'I den tverrfaglige')
    const mine = await verdi<{ grupper: { id: string }[] }>('vanligB', 'select public.mine_grupper()')
    expect(mine.grupper.map((g) => g.id).sort()).toEqual([grupper.GB, grupper.GT].sort())
    const oversikt = await verdi<{ samhandling: { chat_uleste: number | null } }>('vanligB', 'select public.gruppeoversikt($1)', [grupper.GT])
    expect(oversikt.samhandling.chat_uleste).toBe(1)
    expect(await feil(() => verdi('vanligB', 'select public.gruppeoversikt($1)', [grupper.GA]))).toEqual(
      await feil(() => verdi('vanligB', 'select public.gruppeoversikt($1)', [INGEN])),
    )
    const varsler = JSON.stringify(await somPerson('vanligB', 'select * from public.varsler'))
    expect(varsler).not.toContain(grupper.GA)
    expect(varsler).not.toContain('Bare i A')
  })
})
