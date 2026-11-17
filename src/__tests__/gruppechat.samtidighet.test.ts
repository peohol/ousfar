/**
 * P7 tråd A: samtidige skrivinger i gruppechatten, på ekte Postgres med hele
 * databasestrukturen (docs/gruppechat.md, «Modellen»; akseptkriterium 8). Se
 * `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * - Mange sendinger samtidig fra flere brukere gir sammenhengende løpenumre
 *   og endringsnumre, uten hull og uten duplikater.
 * - Den samme sendingen (samme klient-ID) samtidig fra to faner gir én melding.
 * - En sending samtidig med at avsenderen fjernes fra gruppen, eller med at
 *   gruppen arkiveres, lykkes bare når den kommer først: ingen melding blir
 *   skrevet etter at tilgangen er borte.
 * - En endring samtidig med en sletting gir aldri tekst på en slettet melding.
 *
 * Chatten slås på i testdatabasen; i migrasjonene er den avslått.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER, slettDatabaser } from './hjelp/ektepostgres'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  en: '00000000-0000-4000-8000-0000000000d1',
  to: '00000000-0000-4000-8000-0000000000d2',
  tre: '00000000-0000-4000-8000-0000000000d3',
  fire: '00000000-0000-4000-8000-0000000000d4',
  fem: '00000000-0000-4000-8000-0000000000d5',
} as const
type Hvem = keyof typeof KONTO

const GRUPPE = '00000000-0000-4000-8000-0000000000d9'
const A = `(select id from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi')`

/** Fem kontoer i A og en gruppe der: `en` er ansvarlig, de andre medlemmer. */
const OPPSETT = /* sql */ `
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetiske kontoer for samtidighetstesten', true);
  ${Object.entries(KONTO)
    .map(
      ([navn, id]) => `
        insert into public.kontoreservasjoner (username) values ('test.chat${navn}');
        insert into auth.users (id, email) values ('${id}', 'test.chat${navn}@${INTERN_AUTH_DOMENE}');`,
    )
    .join('\n')}
  update public.profiles set must_change_password = false, onboarding_completed = true;
  insert into public.grupper (id, navn, art, fagmiljo_id, opprettet_av) values ('${GRUPPE}', 'Samtidig chat', 'fagmiljo', ${A}, '${KONTO.en}');
  insert into public.gruppemedlemskap (gruppe_id, bruker_id, rolle, status, aktiv_fra)
  select '${GRUPPE}', id, case when id = '${KONTO.en}' then 'ansvarlig' else 'medlem' end, 'aktiv', now()
  from unnest(array[${Object.values(KONTO)
    .map((id) => `'${id}'::uuid`)
    .join(', ')}]) id;
  create or replace function intern.gruppechat_aktivert() returns boolean language sql stable set search_path = '' as 'select true';
  commit;
`

/** Setter den innloggede slik data-API-et gjør det. */
const som = (bruker: string) =>
  `select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${bruker}","role":"authenticated"}', true);`

const klient = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`

/** Én sending i sin egen transaksjon, slik et kall fra nettleseren er. */
const SEND = (hvem: Hvem, n: number) =>
  `begin; ${som(KONTO[hvem])} select public.send_gruppemelding('${GRUPPE}', '${klient(n)}', 'Melding ${n}'); commit;`
/** Den samme sendingen, uten begin og commit, til `samtidig`. */
const SENDING = (hvem: Hvem, n: number) => `${som(KONTO[hvem])} select public.send_gruppemelding('${GRUPPE}', '${klient(n)}', 'Melding ${n}');`
const FJERN = (hvem: Hvem) => `${som(KONTO.en)} select public.avslutt_gruppemedlemskap('${GRUPPE}', '${KONTO[hvem]}');`
const ARKIVER = `${som(KONTO.en)} select public.arkiver_gruppe('${GRUPPE}', true);`

describe.skipIf(!SERVER)('samtidige skrivinger i gruppechatten (ekte Postgres)', () => {
  const mal = `ousfar_gruppechat_${process.pid}_${Date.now()}`
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

  function nyDatabase(oppsett = ''): string {
    const db = `${mal}_${databaser.length}`
    psql('postgres', `create database ${db} template ${mal};`)
    databaser.push(db)
    if (oppsett) psql(db, oppsett)
    return db
  }

  /** Kjører de to stegene samtidig i hver sin transaksjon og gir SQLSTATE for hver, etter commit. */
  async function samtidig(db: string, forste: string, andre: string): Promise<[string, string]> {
    const en = new Okt(db)
    const to = new Okt(db)
    try {
      expect(await en.kjor('begin;')).toBe('00000')
      expect(await to.kjor('begin;')).toBe('00000')
      const forsteSteg = await en.kjor(forste)
      const andreSteg = to.send(andre)()
      const forsteCommit = forsteSteg === '00000' ? en.send('commit;')() : (await en.kjor('rollback;'), Promise.resolve(forsteSteg))
      const etter = await andreSteg
      const andreCommit = etter === '00000' ? await to.kjor('commit;') : (await to.kjor('rollback;'), etter)
      return [await forsteCommit, andreCommit]
    } finally {
      en.avslutt()
      to.avslutt()
    }
  }

  it('gir sammenhengende løpenumre og endringer når mange sender samtidig', async () => {
    const db = nyDatabase()
    const hvem = Object.keys(KONTO) as Hvem[]
    const per = 12
    const okter = hvem.map(() => new Okt(db))
    try {
      // Hver økt sender sine meldinger etter hverandre; øktene går samtidig.
      const svar = okter.flatMap((okt, i) => Array.from({ length: per }, (_, j) => okt.send(SEND(hvem[i]!, i * per + j + 1))))
      const koder = await Promise.all(svar.map((s) => s()))
      expect(new Set(koder)).toEqual(new Set(['00000']))
    } finally {
      okter.forEach((o) => o.avslutt())
    }
    const n = hvem.length * per
    expect(psql(db, `select count(*), count(distinct nr), min(nr), max(nr), count(distinct endring), min(endring), max(endring) from public.gruppemeldinger`)).toBe(
      `${n}|${n}|1|${n}|${n}|1|${n}`,
    )
    expect(psql(db, `select siste_nr || '|' || siste_endring from public.gruppechatter`)).toBe(`${n}|${n}`)
    // Hver avsender sine meldinger står i den rekkefølgen de ble sendt.
    expect(
      psql(
        db,
        `select count(*) from (
           select nr < lead(nr) over (partition by forfatter_id order by klient_id) as stigende from public.gruppemeldinger
         ) x where stigende = false`,
      ),
    ).toBe('0')
  }, 120_000)

  it('gir én melding når den samme sendingen kommer samtidig fra to faner', async () => {
    const db = nyDatabase()
    expect(await samtidig(db, SENDING('to', 1), SENDING('to', 1))).toEqual(['00000', '00000'])
    expect(psql(db, `select count(*) || '|' || max(nr) from public.gruppemeldinger`)).toBe('1|1')
    expect(psql(db, `select siste_nr from public.gruppechatter`)).toBe('1')
  }, 60_000)

  it.each([
    ['fjernes fra gruppen', FJERN('to')],
    ['ser gruppen arkiveres', ARKIVER],
  ] as const)('skriver ingen melding etter at avsenderen %s', async (_hva, stengning) => {
    // Stengningen først: sendingen venter på den og får avslaget.
    const forst = nyDatabase()
    const [a, b] = await samtidig(forst, stengning, SENDING('to', 1))
    expect(a).toBe('00000')
    expect(['42501', '55000']).toContain(b)
    expect(psql(forst, `select count(*) from public.gruppemeldinger`)).toBe('0')
    // Sendingen først: den går, og stengningen venter til den er ferdig.
    const sist = nyDatabase()
    expect(await samtidig(sist, SENDING('to', 1), stengning)).toEqual(['00000', '00000'])
    expect(psql(sist, `select count(*) from public.gruppemeldinger`)).toBe('1')
  }, 60_000)

  it('gir aldri tekst på en slettet melding når endring og sletting kommer samtidig', async () => {
    const forste = `${som(KONTO.to)} select public.send_gruppemelding('${GRUPPE}', '${klient(1)}', 'Før');`
    for (const endringForst of [true, false]) {
      const db = nyDatabase(`begin; ${forste} commit;`)
      const id = psql(db, `select id from public.gruppemeldinger`)
      const endre = `${som(KONTO.to)} select public.endre_gruppemelding('${id}', 'Etter');`
      const slett = `${som(KONTO.en)} select public.slett_gruppemelding('${id}');`
      const [a, b] = await samtidig(db, endringForst ? endre : slett, endringForst ? slett : endre)
      expect(a).toBe('00000')
      // Kommer endringen etter slettingen, avvises den.
      expect(b).toBe(endringForst ? '00000' : '55000')
      expect(psql(db, `select coalesce(tekst, '<slettet>') || '|' || slettet_som || '|' || endring from public.gruppemeldinger`)).toBe(
        endringForst ? '<slettet>|moderator|3' : '<slettet>|moderator|2',
      )
    }
  }, 60_000)
})
