/**
 * P6: regelen om minst én ansvarlig i en aktiv gruppe ved samtidige
 * transaksjoner, på ekte Postgres 17 med hele databasestrukturen
 * (docs/fagmiljoer.md, «Gruppene»). Se `fagmiljoer.samtidighet.test.ts` for
 * oppsettet.
 *
 * En gruppe har to ansvarlige. Begge prøver å gå samtidig, eller å gjøre seg
 * selv til vanlige medlemmer. Den ene skal få det til og den andre stoppes,
 * uansett rekkefølge: gjennom operasjonene, der den andre venter på låsen på
 * gruppen og så får beskjed om at hen er den siste ansvarlige, og rett i
 * tabellen (som en systemarkitekt i Supabase), der regelen på tabellen
 * stopper den andre, også i `repeatable read`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER, slettDatabaser } from './hjelp/ektepostgres'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  en: '00000000-0000-4000-8000-0000000000b1',
  to: '00000000-0000-4000-8000-0000000000b2',
} as const
const GRUPPE = '00000000-0000-4000-8000-0000000000b9'
const A = `(select id from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi')`

/** To kontoer i A (standardfagmiljøet), begge ansvarlige i en gruppe der. */
const OPPSETT = /* sql */ `
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetiske kontoer for samtidighetstesten', true);
  ${Object.entries(KONTO)
    .map(
      ([navn, id]) => `
        insert into public.kontoreservasjoner (username) values ('test.gruppe${navn}');
        insert into auth.users (id, email) values ('${id}', 'test.gruppe${navn}@${INTERN_AUTH_DOMENE}');`,
    )
    .join('\n')}
  update public.profiles set must_change_password = false, onboarding_completed = true;
  insert into public.grupper (id, navn, art, fagmiljo_id, opprettet_av) values ('${GRUPPE}', 'Samtidig', 'fagmiljo', ${A}, '${KONTO.en}');
  insert into public.gruppemedlemskap (gruppe_id, bruker_id, rolle, status, aktiv_fra)
    values ('${GRUPPE}', '${KONTO.en}', 'ansvarlig', 'aktiv', now()), ('${GRUPPE}', '${KONTO.to}', 'ansvarlig', 'aktiv', now());
  commit;
`

/** Setter den innloggede slik data-API-et gjør det. */
const som = (bruker: string) =>
  `select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${bruker}","role":"authenticated"}', true);`

const ANSVARLIGE = `select count(*) from public.gruppemedlemskap where gruppe_id = '${GRUPPE}' and status = 'aktiv' and rolle = 'ansvarlig'`

type Hvem = keyof typeof KONTO

const MAATER = [
  {
    hva: 'når begge går, med operasjonen',
    isolasjon: 'read committed',
    gjor: (hvem: Hvem) => `${som(KONTO[hvem])} select public.avslutt_gruppemedlemskap('${GRUPPE}', '${KONTO[hvem]}');`,
  },
  {
    hva: 'når begge blir vanlige medlemmer, med operasjonen',
    isolasjon: 'read committed',
    gjor: (hvem: Hvem) => `${som(KONTO[hvem])} select public.sett_grupperolle('${GRUPPE}', '${KONTO[hvem]}', 'medlem');`,
  },
  ...(['read committed', 'repeatable read'] as const).map((isolasjon) => ({
    hva: `rett i tabellen, i ${isolasjon}`,
    isolasjon,
    gjor: (hvem: Hvem) =>
      `do $$ begin
         perform set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true);
         update public.gruppemedlemskap set rolle = 'medlem'
         where gruppe_id = '${GRUPPE}' and bruker_id = '${KONTO[hvem]}' and status = 'aktiv';
       end $$;`,
  })),
] as const

describe.skipIf(!SERVER)('samtidige endringer av de ansvarlige i en gruppe (ekte Postgres)', () => {
  const mal = `ousfar_grupper_${process.pid}_${Date.now()}`
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

  it('kjører på Postgres 17 eller nyere, med to ansvarlige', () => {
    expect(Number(psql(mal, 'show server_version_num;'))).toBeGreaterThanOrEqual(170000)
    expect(psql(mal, ANSVARLIGE)).toBe('2')
  })

  describe.each(MAATER)('$hva', (maate) => {
    it.each([
      ['en', 'to'],
      ['to', 'en'],
    ] as const)('lar %s gjøre det og stopper %s', async (forst, sist) => {
      const db = `${mal}_${databaser.length}`
      psql('postgres', `create database ${db} template ${mal};`)
      databaser.push(db)

      const en = new Okt(db)
      const to = new Okt(db)
      const okter = { en, to }
      try {
        const forste = okter[forst]
        const andre = okter[sist]
        expect(await forste.kjor(`begin isolation level ${maate.isolasjon};`)).toBe('00000')
        expect(await andre.kjor(`begin isolation level ${maate.isolasjon};`)).toBe('00000')
        expect(await forste.kjor(maate.gjor(forst))).toBe('00000')
        const andreSteg = andre.send(maate.gjor(sist))()

        // Commit-ene sendes uten å vente: regelen på tabellen kontrolleres
        // først der, og den ene kan måtte vente på den andre.
        const forsteCommit = forste.send('commit;')()
        const etterSteg = await andreSteg
        const andreCommit = etterSteg === '00000' ? await andre.kjor('commit;') : (await andre.kjor('rollback;'), etterSteg)
        const svar = [await forsteCommit, andreCommit]

        // Nøyaktig én lyktes; den andre ble stoppet av operasjonen, regelen
        // på tabellen, et gammelt bilde eller en vranglås, aldri stille.
        expect(svar.filter((s) => s === '00000'), JSON.stringify(svar)).toHaveLength(1)
        expect(['42501', '23514', '40001', '40P01']).toContain(svar.find((s) => s !== '00000'))
      } finally {
        en.avslutt()
        to.avslutt()
      }
      expect(psql(db, ANSVARLIGE)).toBe('1')
    }, 60_000)
  })
})
