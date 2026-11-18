/**
 * D5: samtidige skrivinger i direktemeldingene, på ekte Postgres med hele
 * databasestrukturen (docs/direktemeldinger-personvern.md, «Låsing og
 * samtidighet», S1–S7). Se `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * - En sending samtidig med at mottakeren slår av, blokkerer eller mister
 *   medlemskapet (eller avsenderen gjør det), går bare når den kommer først:
 *   ingen melding blir skrevet etter at det ikke lenger kan sendes (S1–S3).
 * - To som åpner samme samtale samtidig, får én samtale (S4).
 * - Samme klient-ID samtidig gir én melding (S5).
 * - Mange samtidige sendinger gir løpenumre og endringer uten hull (S6).
 * - Takten holder også når samme bruker sender fra mange faner samtidig (S7).
 *
 * Direktemeldingene slås på i testdatabasen; i migrasjonene er de avslått.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER, slettDatabaser } from './hjelp/ektepostgres'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  admin: '00000000-0000-4000-8000-0000000000e0',
  en: '00000000-0000-4000-8000-0000000000e1',
  to: '00000000-0000-4000-8000-0000000000e2',
  tre: '00000000-0000-4000-8000-0000000000e3',
  fire: '00000000-0000-4000-8000-0000000000e4',
  fem: '00000000-0000-4000-8000-0000000000e5',
} as const
type Hvem = keyof typeof KONTO

/** Samtalen mellom `en` og `to`. */
const SAMTALE = '00000000-0000-4000-8000-0000000000ef'
const A = `(select id from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi')`

/** Kontoene i A, alle med direktemeldinger på; `admin` er lokal administrator. */
const OPPSETT = /* sql */ `
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetiske kontoer for samtidighetstesten', true);
  ${Object.entries(KONTO)
    .map(
      ([navn, id]) => `
        insert into public.kontoreservasjoner (username) values ('test.dm${navn}');
        insert into auth.users (id, email) values ('${id}', 'test.dm${navn}@${INTERN_AUTH_DOMENE}');`,
    )
    .join('\n')}
  update public.profiles set must_change_password = false, onboarding_completed = true;
  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ('${KONTO.admin}', ${A}) on conflict do nothing;
  insert into public.chatvalg (bruker_id, tillat_direktemeldinger) select id, true from public.profiles;
  insert into public.direktesamtaler (id, bruker_lav, bruker_hoy, opprettet_av) values ('${SAMTALE}', '${KONTO.en}', '${KONTO.to}', '${KONTO.en}');
  create or replace function intern.direktemeldinger_aktivert() returns boolean language sql stable set search_path = '' as 'select true';
  commit;
`

/** Setter den innloggede slik data-API-et gjør det. */
const som = (bruker: string) =>
  `select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${bruker}","role":"authenticated"}', true);`

const klient = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`

/** Én sending, uten begin og commit, til `samtidig` og `alleSamtidig`. */
const SENDING = (hvem: Hvem, n: number, samtale = SAMTALE) =>
  `${som(KONTO[hvem])} select public.send_direktemelding('${samtale}', '${klient(n)}', 'Melding ${n}');`
/** Én sending i sin egen transaksjon, slik et kall fra nettleseren er. */
const SEND = (hvem: Hvem, n: number, samtale = SAMTALE) => `begin; ${SENDING(hvem, n, samtale)} commit;`
const SLA_AV = (hvem: Hvem) => `${som(KONTO[hvem])} select public.sett_chatvalg(false, null);`
const BLOKKER = (hvem: Hvem, mal: Hvem) => `${som(KONTO[hvem])} select public.blokker_bruker('${KONTO[mal]}');`
const AVSLUTT = (hvem: Hvem) => `${som(KONTO.admin)} select public.avslutt_medlemskap('${KONTO[hvem]}', ${A});`
const AAPNE = (hvem: Hvem, mal: Hvem) => `${som(KONTO[hvem])} select public.aapne_direktesamtale('${KONTO[mal]}');`

describe.skipIf(!SERVER)('samtidige skrivinger i direktemeldingene (ekte Postgres)', () => {
  const mal = `ousfar_direkte_${process.pid}_${Date.now()}`
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
      // Det andre steget venter på låsen det første holder.
      if (forsteSteg === '00000') expect(await to.venterFortsatt(andreSteg, 300)).toBe(true)
      const forsteCommit = forsteSteg === '00000' ? en.send('commit;')() : (await en.kjor('rollback;'), Promise.resolve(forsteSteg))
      const etter = await andreSteg
      const andreCommit = etter === '00000' ? await to.kjor('commit;') : (await to.kjor('rollback;'), etter)
      return [await forsteCommit, andreCommit]
    } finally {
      en.avslutt()
      to.avslutt()
    }
  }

  /**
   * Kjører alle stegene samtidig, hvert i sin egen økt og transaksjon, og gir
   * SQLSTATE for hvert steg (ikke for commit, som alltid svarer).
   */
  async function alleSamtidig(db: string, steg: readonly string[]): Promise<string[]> {
    const okter = steg.map(() => new Okt(db))
    const ett = async (okt: Okt, sql: string) => {
      expect(await okt.kjor('begin;')).toBe('00000')
      const kode = await okt.kjor(sql)
      await okt.kjor(kode === '00000' ? 'commit;' : 'rollback;')
      return kode
    }
    try {
      return await Promise.all(okter.map((okt, i) => ett(okt, steg[i]!)))
    } finally {
      okter.forEach((o) => o.avslutt())
    }
  }

  const antall = (db: string) => psql(db, 'select count(*) from public.direktemeldinger')

  it.each([
    ['mottakeren slår av (S1)', SLA_AV('to'), '55000'],
    ['mottakeren blokkerer avsenderen (S2)', BLOKKER('to', 'en'), '55000'],
    ['avsenderen blokkerer mottakeren (S2)', BLOKKER('en', 'to'), '55000'],
    ['mottakeren mister medlemskapet (S3)', AVSLUTT('to'), '55000'],
    ['avsenderen mister medlemskapet (S3)', AVSLUTT('en'), '42501'],
  ] as const)('skriver ingen melding etter at %s', async (_hva, stengning, avslag) => {
    // Stengningen først: sendingen venter på den og får avslaget.
    const forst = nyDatabase()
    const [a, b] = await samtidig(forst, stengning, SENDING('en', 1))
    expect(a).toBe('00000')
    expect(b).toBe(avslag)
    expect(antall(forst)).toBe('0')
    // Sendingen først: den går, og stengningen venter til den er ferdig.
    const sist = nyDatabase()
    expect(await samtidig(sist, SENDING('en', 1), stengning)).toEqual(['00000', '00000'])
    expect(antall(sist)).toBe('1')
  }, 60_000)

  it('gir én samtale når begge åpner den samtidig (S4)', async () => {
    const db = nyDatabase()
    const svar = await alleSamtidig(db, [AAPNE('tre', 'fire'), AAPNE('fire', 'tre'), AAPNE('tre', 'fire')])
    expect(svar).toEqual(['00000', '00000', '00000'])
    expect(psql(db, `select count(*) from public.direktesamtaler where '${KONTO.tre}' in (bruker_lav, bruker_hoy)`)).toBe('1')
  }, 60_000)

  it('gir én melding når den samme sendingen kommer samtidig fra to faner (S5)', async () => {
    const db = nyDatabase()
    expect(await samtidig(db, SENDING('en', 1), SENDING('en', 1))).toEqual(['00000', '00000'])
    expect(psql(db, `select count(*) || '|' || max(nr) from public.direktemeldinger`)).toBe('1|1')
    expect(psql(db, `select siste_nr from public.direktesamtaler where id = '${SAMTALE}'`)).toBe('1')
  }, 60_000)

  it('gir sammenhengende løpenumre og endringer når begge sender mye samtidig (S6)', async () => {
    const db = nyDatabase()
    const per = 10
    // To faner hver.
    const okter = (['en', 'en', 'to', 'to'] as const).map((hvem) => ({ hvem, okt: new Okt(db) }))
    try {
      const svar = okter.flatMap(({ hvem, okt }, i) => Array.from({ length: per }, (_, j) => okt.send(SEND(hvem, i * per + j + 1))))
      expect(new Set(await Promise.all(svar.map((s) => s())))).toEqual(new Set(['00000']))
    } finally {
      okter.forEach((o) => o.okt.avslutt())
    }
    const n = okter.length * per
    expect(psql(db, `select count(*), count(distinct nr), min(nr), max(nr), count(distinct endring), min(endring), max(endring) from public.direktemeldinger`)).toBe(
      `${n}|${n}|1|${n}|${n}|1|${n}`,
    )
  }, 120_000)

  it('holder takten når samme bruker sender og åpner fra mange faner samtidig (S7)', async () => {
    // I én samtale: høyst 20 i minuttet.
    const en = nyDatabase()
    const svar = await alleSamtidig(en, Array.from({ length: 25 }, (_, i) => SENDING('en', i + 1)))
    expect(svar.filter((s) => s === '00000')).toHaveLength(20)
    expect(svar.filter((s) => s !== '00000')).toEqual(Array(5).fill('54000'))
    expect(antall(en)).toBe('20')

    // I flere samtaler: høyst 60 til sammen.
    const flere = nyDatabase(
      ['tre', 'fire', 'fem']
        .map((x, i) => `insert into public.direktesamtaler (id, bruker_lav, bruker_hoy) values ('${klient(900 + i)}', '${KONTO.en}', '${KONTO[x as Hvem]}');`)
        .join('\n'),
    )
    const samtaler = [SAMTALE, klient(900), klient(901), klient(902)]
    const mange = await alleSamtidig(
      flere,
      Array.from({ length: 70 }, (_, i) => SENDING('en', i + 1, samtaler[i % samtaler.length])),
    )
    expect(mange.filter((s) => s === '00000')).toHaveLength(60)
    expect(antall(flere)).toBe('60')

    // Nye samtaler: høyst 10 i timen.
    const nye = nyDatabase(
      Array.from({ length: 12 }, (_, i) => {
        const id = `00000000-0000-4000-8000-00000000f${String(i).padStart(3, '0')}`
        return `begin;
          select set_config('ousfar.tilgangsgrunn', 'Syntetisk', true);
          insert into public.kontoreservasjoner (username) values ('test.dmny${i}');
          insert into auth.users (id, email) values ('${id}', 'test.dmny${i}@${INTERN_AUTH_DOMENE}');
          update public.profiles set must_change_password = false, onboarding_completed = true where id = '${id}';
          insert into public.chatvalg (bruker_id, tillat_direktemeldinger) values ('${id}', true);
          commit;`
      }).join('\n'),
    )
    const aapninger = await alleSamtidig(
      nye,
      Array.from(
        { length: 12 },
        (_, i) =>
          `${som(KONTO.en)} select public.aapne_direktesamtale('00000000-0000-4000-8000-00000000f${String(i).padStart(3, '0')}');`,
      ),
    )
    // Samtalen med `to` fra oppsettet teller med.
    expect(aapninger.filter((s) => s === '00000')).toHaveLength(9)
    expect(psql(nye, `select count(*) from public.direktesamtaler where opprettet_av = '${KONTO.en}'`)).toBe('10')
  }, 180_000)
})
