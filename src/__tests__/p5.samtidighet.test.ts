/**
 * P5 tråd D: samtidighet på tvers av redaktøransvaret (tråd A), forslagene
 * (tråd B) og medlemskapet, på ekte Postgres med hele databasestrukturen
 * (docs/p5-testplan.md, avsnitt 4). Se `fagmiljoer.samtidighet.test.ts` for
 * oppsettet.
 *
 * - SAM-8: ansvaret tilbakekalles mens redaktøren lagrer.
 * - SAM-9: medlemskapet avsluttes mens redaktøren lagrer, eller mens
 *   forslagsstilleren sender et forslag.
 * - SAM-3, SAM-4 og SAM-10: et vedtak fra behandleren (tråd C) og et kall fra
 *   forslagsstilleren (tråd B) på samme forslag samtidig.
 *
 * Hvert scenario kjøres i tre rekkefølger (se testene). Et kall som kommer
 * etter at fjerningen er lagret, avvises med en kode appen viser (`42501` eller
 * `PT404`), også i en transaksjon som begynte før. Et kall som kommer mens
 * fjerningen ennå ikke er lagret, teller som gjort før den. Aldri en
 * ubehandlet feil eller vranglås, og når begge er ferdige, er ansvaret eller
 * medlemskapet borte og den neste lagringen eller innsendingen avvises.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER } from './hjelp/ektepostgres'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  arkitekt: '00000000-0000-4000-8000-0000000000d1',
  admin: '00000000-0000-4000-8000-0000000000d2',
  redaktor: '00000000-0000-4000-8000-0000000000d3',
  stiller: '00000000-0000-4000-8000-0000000000d4',
} as const

const A = `(select id from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi')`
const KOMMENTAR = `(select k.objekt_id from public.kommentarer k where k.navn = 'P5 samtidig' and k.tilstand = 'publisert')`
const REGELSETT = `(select r.objekt_id from public.intervallregelsett r where r.analyttkode = 'P5SAM' and r.tilstand = 'publisert')`

/** Setter den innloggede slik data-API-et gjør det. */
const som = (bruker: string) =>
  `select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${bruker}","role":"authenticated"}', true);`

/**
 * Kontoene, alle med primærmedlemskap i A (standard); `admin` er lokal
 * administrator der. Administratoren lager og publiserer en kommentar og et
 * regelsett som bruker den, og gir `redaktor` ansvaret for regelsettet.
 */
const OPPSETT = /* sql */ `
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetiske kontoer for samtidighetstesten', true);
  ${Object.entries(KONTO)
    .map(
      ([navn, id]) => `
        insert into public.kontoreservasjoner (username) values ('test.p5${navn}');
        insert into auth.users (id, email) values ('${id}', 'test.p5${navn}@${INTERN_AUTH_DOMENE}');`,
    )
    .join('\n')}
  update public.profiles set must_change_password = false, onboarding_completed = true;
  insert into public.systemroller (bruker_id, rolle) values ('${KONTO.arkitekt}', 'systemarkitekt');
  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ('${KONTO.admin}', ${A}) on conflict do nothing;
  commit;
  begin;
  ${som(KONTO.admin)}
  select (public.opprett_utkast('kommentar', '{"navn": "P5 samtidig", "tekst": "Syntetisk tekst.", "plassholdere": []}'::jsonb)).id as k \\gset
  select public.publiser_utkast(:'k', 1) is not null;
  select (public.opprett_utkast('intervallregelsett', jsonb_build_object(
    'analyttkode', 'P5SAM', 'enhet', 'nmol/L', 'desimaler', 0, 'skillepunkter', '[]'::jsonb,
    'intervaller', jsonb_build_array(jsonb_build_object('niva', 'innenfor', 'handling', null, 'kommentar', :'k')),
    'ringegrense', null, 'cutoff', null))).id as r \\gset
  select public.publiser_utkast(:'r', 1) is not null;
  select public.tildel_redaktoransvar('${KONTO.redaktor}', 'ressurs', :'r', null) is not null;
  commit;
`

/**
 * Slår opp ID-ene og revisjonen som databasens eier før kallet, så oppslaget
 * ikke selv stoppes av radsikkerheten når retten er borte.
 */
const OPPSLAG = `select ${KOMMENTAR} as k, ${REGELSETT} as r, (select a.id from public.redaktoransvar a where a.bruker_id = '${KONTO.redaktor}' order by a.tildelt_kl desc limit 1) as a, (select t.revisjon from public.objekttilstander t where t.objekt_id = ${KOMMENTAR} and t.tilstand = 'utkast') as rev \\gset\n`
const LAGRE = `${OPPSLAG}${som(KONTO.redaktor)} select public.lagre_utkast(:'k', :rev, '{"navn": "P5 samtidig", "tekst": "Endret av redaktøren.", "plassholdere": []}'::jsonb);`
const FORESLA = `${OPPSLAG}${som(KONTO.stiller)} select public.foresla_endring(:'r', null, 1, null, null, null, 'Syntetisk forslag', 'Syntetisk begrunnelse', '[]'::jsonb);`
const TILBAKEKALL = `${OPPSLAG}${som(KONTO.admin)} select public.tilbakekall_redaktoransvar(:'a');`
const AVSLUTT = (bruker: string) => `${som(KONTO.arkitekt)} select public.avslutt_medlemskap('${bruker}', ${A});`

/** Utfallene appen viser som avvisning. */
const AVVIST = ['42501', 'PT404']

interface Scenario {
  navn: string
  /** Det som tar bort retten. */
  fjern: string
  /** Det som bruker retten. */
  bruk: string
  /** Hvor mange ganger `bruk` har satt spor (revisjoner av kommentaren eller forslag fra stilleren). */
  spor: string
}

const SPOR_LAGRING = `select count(*) - 1 from public.objektrevisjoner where objekt_id = ${KOMMENTAR}`
const SPOR_FORSLAG = `select count(*) from public.endringsforslag where stilt_av = '${KONTO.stiller}'`

const SCENARIOER: Scenario[] = [
  { navn: 'SAM-8 ansvaret tilbakekalles mens redaktøren lagrer', fjern: TILBAKEKALL, bruk: LAGRE, spor: SPOR_LAGRING },
  { navn: 'SAM-9 medlemskapet avsluttes mens redaktøren lagrer', fjern: AVSLUTT(KONTO.redaktor), bruk: LAGRE, spor: SPOR_LAGRING },
  { navn: 'SAM-9 medlemskapet avsluttes mens forslagsstilleren sender', fjern: AVSLUTT(KONTO.stiller), bruk: FORESLA, spor: SPOR_FORSLAG },
]


/* --- Vedtak og forslagsstilleren samtidig (SAM-3, SAM-4, SAM-10) --------- */

/** Det nyeste forslaget fra stilleren, slått opp av databasens eier. */
const FORSLAG = `(select id from public.endringsforslag where stilt_av = '${KONTO.stiller}' order by opprettet_kl desc, id desc limit 1)`
const SOM_FORSLAG = `select ${FORSLAG} as f \\gset\n`
const somAdmin = (kall: string) => `${SOM_FORSLAG}${som(KONTO.admin)} select public.${kall};`
const somArkitekt = (kall: string) => `${SOM_FORSLAG}${som(KONTO.arkitekt)} select public.${kall};`
const somStiller = (kall: string) => `${SOM_FORSLAG}${som(KONTO.stiller)} select public.${kall};`

/** Et nytt forslag fra stilleren til regelsettet, ført fram til en status av administratoren. */
const NYTT_FORSLAG = `begin; ${som(KONTO.stiller)} select public.foresla_endring(${REGELSETT}, null, 1, null, null, null, 'Syntetisk forslag', 'Syntetisk begrunnelse', '[]'::jsonb); commit;`
const FORBERED = {
  ny: NYTT_FORSLAG,
  under_behandling: `${NYTT_FORSLAG} begin; ${somAdmin(`ta_forslag(:'f')`)} commit;`,
  venter_pa_forslagsstiller: `${NYTT_FORSLAG} begin; ${somAdmin(`ta_forslag(:'f')`)} ${som(KONTO.admin)} select public.be_om_presisering(:'f', 'Syntetisk spørsmål.'); commit;`,
  godkjent: `${NYTT_FORSLAG} begin; ${somAdmin(`godkjenn_forslag(:'f', null)`)} commit;`,
} as const

interface Kappløp {
  navn: string
  fra: keyof typeof FORBERED
  /** De to kallene, med navnene de har i testen. */
  x: readonly [string, string]
  y: readonly [string, string]
  /** Ventet SQLSTATE for kallet som kommer sist, når x eller y kommer først. */
  sist: { xForst: readonly string[]; yForst: readonly string[] }
  /** Statusen etterpå, uansett rekkefølge. */
  slutt: { xForst: string; yForst: string }
  /** En kontroll til etterpå: SQL som gir én verdi, og verdien i hver rekkefølge. */
  etterpa?: { sql: string; xForst: string; yForst: string }
  /** SQLSTATE for kallet som kommer først, når det ikke er 00000. */
  forst?: { xForst?: string; yForst?: string }
}

const KAPPLOP: Kappløp[] = [
  {
    navn: 'SAM-1 to behandlere tar det samme nye forslaget',
    fra: 'ny',
    x: ['administratoren', somAdmin(`ta_forslag(:'f')`)],
    y: ['systemarkitekten', somArkitekt(`ta_forslag(:'f')`)],
    // Den andre venter på låsen og tar så forslaget over (en annen behandler kan ta over).
    sist: { xForst: ['00000'], yForst: ['00000'] },
    slutt: { xForst: 'under_behandling', yForst: 'under_behandling' },
    etterpa: {
      // Hendelsene «tatt» og behandleren: den siste som tok det.
      sql: `select (select count(*) from public.endringsforslag_hendelser where forslag_id = ${FORSLAG} and art = 'tatt') || ' ' ||
              (select behandler_id from public.endringsforslag where id = ${FORSLAG})`,
      xForst: `2 ${KONTO.arkitekt}`,
      yForst: `2 ${KONTO.admin}`,
    },
  },
  {
    navn: 'SAM-3 behandleren godkjenner mens forslagsstilleren trekker',
    fra: 'under_behandling',
    x: ['godkjenning', somAdmin(`godkjenn_forslag(:'f', null)`)],
    y: ['trekking', somStiller(`trekk_forslag(:'f', null)`)],
    sist: { xForst: ['PT409'], yForst: ['PT409'] },
    slutt: { xForst: 'godkjent', yForst: 'trukket' },
  },
  {
    navn: 'SAM-4 forslagsstilleren svarer mens behandleren avviser',
    fra: 'venter_pa_forslagsstiller',
    x: ['svaret', somStiller(`svar_pa_forslag(:'f', 'Syntetisk svar.')`)],
    y: ['avvisningen', somAdmin(`avvis_forslag(:'f', 'Syntetisk avvisning.')`)],
    // Etter svaret er forslaget under behandling igjen, og kan fortsatt avvises.
    sist: { xForst: ['00000'], yForst: ['PT409'] },
    slutt: { xForst: 'avvist', yForst: 'avvist' },
  },
  {
    navn: 'SAM-10 behandleren markerer innarbeidet mens forslagsstilleren trekker et godkjent forslag',
    fra: 'godkjent',
    x: ['innarbeidingen', somAdmin(`marker_forslag_innarbeidet(:'f', null, null)`)],
    y: ['trekkingen', somStiller(`trekk_forslag(:'f', null)`)],
    // Et godkjent forslag kan aldri trekkes, så trekkingen avvises også når den kommer først.
    forst: { yForst: 'PT409' },
    sist: { xForst: ['PT409'], yForst: ['00000'] },
    slutt: { xForst: 'innarbeidet', yForst: 'innarbeidet' },
  },
]

describe.skipIf(!SERVER)('P5 på tvers ved samtidige transaksjoner (ekte Postgres)', () => {
  const mal = `ousfar_p5tvers_${process.pid}_${Date.now()}`
  const databaser: string[] = []

  beforeAll(() => {
    psql('postgres', `create database ${mal};`)
    databaser.push(mal)
    psql(mal, strukturskript())
    psql(mal, OPPSETT)
  }, 120_000)

  afterAll(() => {
    for (const db of databaser.reverse()) psql('postgres', `drop database if exists ${db} with (force);`)
  })

  const nyDatabase = () => {
    const db = `${mal}_${databaser.length}`
    psql('postgres', `create database ${db} template ${mal};`)
    databaser.push(db)
    return db
  }

  it('oppsettet gir en redaktør med ansvar for regelsettet', () => {
    expect(psql(mal, `select count(*) from public.redaktoransvar where bruker_id = '${KONTO.redaktor}' and tilbakekalt_kl is null`)).toBe('1')
    expect(psql(mal, `select count(*) from public.objekttilstander where objekt_id in (${KOMMENTAR}, ${REGELSETT}) and tilstand = 'publisert'`)).toBe('2')
  })

  describe.each(SCENARIOER)('$navn', (s) => {
    /**
     * `ferdig`: fjerningen er lagret før kallet, i en transaksjon som begynte
     * før den. Kallet ser den likevel (read committed) og avvises.
     * `samtidig`: fjerningen er gjort, men ikke lagret, når kallet kommer.
     * Kallet venter ikke på den, ser retten slik den var og lykkes; det teller
     * da som gjort før fjerningen, og ingenting gjøres med retten etterpå.
     * `brukes`: retten brukes først, og fjerningen kommer etter.
     */
    it.each([
      ['fjerningen er lagret før kallet', 'ferdig', AVVIST],
      ['fjerningen er ikke lagret ennå', 'samtidig', ['00000', ...AVVIST]],
      ['retten brukes først', 'brukes', ['00000']],
    ] as const)('%s: utfallet er riktig, og retten er borte etterpå', async (_, rekkefolge, tillatt) => {
      const db = nyDatabase()
      const en = new Okt(db)
      const to = new Okt(db)
      let andreSvar = ''
      try {
        expect(await en.kjor('begin;')).toBe('00000')
        expect(await to.kjor('begin;')).toBe('00000')
        const forste = rekkefolge === 'brukes' ? s.bruk : s.fjern
        const etter = rekkefolge === 'brukes' ? s.fjern : s.bruk
        expect(await en.kjor(forste)).toBe('00000')
        if (rekkefolge === 'ferdig') expect(await en.kjor('commit;')).toBe('00000')
        const andre = to.send(etter)()
        // Om den andre venter på den første, avhenger av låsene; begge deler er riktig.
        await to.venterFortsatt(andre, 300)
        if (rekkefolge !== 'ferdig') expect(await en.kjor('commit;')).toBe('00000')
        andreSvar = await andre
        expect(tillatt as readonly string[]).toContain(andreSvar)
        expect(await to.kjor(andreSvar === '00000' ? 'commit;' : 'rollback;')).toBe('00000')
      } finally {
        en.avslutt()
        to.avslutt()
      }
      // Bruken står bare når den lyktes.
      const brukenLyktes = rekkefolge === 'brukes' || andreSvar === '00000'
      expect(psql(db, s.spor)).toBe(brukenLyktes ? '1' : '0')
      // Etterpå avvises den neste bruken.
      const neste = new Okt(db)
      try {
        expect(AVVIST).toContain(await neste.kjor(`begin; ${s.bruk}`))
        await neste.kjor('rollback;')
      } finally {
        neste.avslutt()
      }
    }, 30_000)
  })

  describe.each(KAPPLOP)('$navn', (k) => {
    it.each([
      ['x', true],
      ['y', false],
    ] as const)('%s først: den andre venter eller avvises, og statusen stemmer etterpå', async (_, xForst) => {
      const db = nyDatabase()
      psql(db, FORBERED[k.fra])
      const [forste, andre] = xForst ? [k.x, k.y] : [k.y, k.x]
      const en = new Okt(db)
      const to = new Okt(db)
      try {
        expect(await en.kjor('begin;')).toBe('00000')
        expect(await to.kjor('begin;')).toBe('00000')
        const forsteKode = (xForst ? k.forst?.xForst : k.forst?.yForst) ?? '00000'
        expect(await en.kjor(forste[1]), forste[0]).toBe(forsteKode)
        const svar = to.send(andre[1])()
        // Begge går gjennom den felles overgangen, som låser forslaget; den andre venter på den første.
        if (forsteKode === '00000') expect(await to.venterFortsatt(svar, 500), `${andre[0]} venter`).toBe(true)
        expect(await en.kjor(forsteKode === '00000' ? 'commit;' : 'rollback;')).toBe('00000')
        const kode = await svar
        expect(xForst ? k.sist.xForst : k.sist.yForst, andre[0]).toContain(kode)
        expect(await to.kjor(kode === '00000' ? 'commit;' : 'rollback;')).toBe('00000')
      } finally {
        en.avslutt()
        to.avslutt()
      }
      expect(psql(db, `select status from public.endringsforslag where id = ${FORSLAG}`)).toBe(xForst ? k.slutt.xForst : k.slutt.yForst)
      if (k.etterpa) expect(psql(db, k.etterpa.sql)).toBe(xForst ? k.etterpa.xForst : k.etterpa.yForst)
    }, 30_000)
  })
})
