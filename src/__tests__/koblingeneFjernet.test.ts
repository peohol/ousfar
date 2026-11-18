/**
 * Slutten på overgangen fra da analyttkodene var koblet til fagsidene
 * (`20261118120000_koblingene_fjernet.sql`, `docs/domener.md`, #405), i en
 * ekte database før og etter migrasjonen:
 *
 * 1. Et datakort med en analyttkode i `gjelder` får forbindelsen koden måler
 *    i OUS Klinisk farmakologi, også når et annet fagmiljø har samme kode for
 *    en annen forbindelse, med tallene uendret og ført som en endring av
 *    Claude Code. Den publiserte versjonen og et upublisert utkast skrives om
 *    hver for seg, og utkastet forblir upublisert. Andre kort endres ikke.
 * 2. Etter migrasjonen kan et datakort bare ha en forbindelsesnøkkel i `gjelder`.
 * 3. Katalogen gir bare kodene, navnene og referanseområdene, og tabellene,
 *    kolonnene og funksjonen bare appen fra før brukte, finnes ikke lenger.
 *
 * Stoffene og kodene er de i katalogen til OUS Klinisk farmakologi, men
 * tallene er syntetiske.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { lagFaginnholdslager, type Faginnholdslager } from '../faginnhold/lagring'
import type { Innholdselementinnhold } from '../faginnhold/modell'
import { opprettFagmiljo } from './hjelp/persongalleri'
import { faginnholdskall, feilFra, kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, som, type Faginnholdskall } from './hjelp/testdatabase'

const MIGRASJON = migrasjonsfiler().find((f) => f.endsWith('_koblingene_fjernet.sql'))!

let db: PGlite
let kall: Faginnholdskall
let lager: Faginnholdslager
let bruker: string
const ider = { tramadol: '', otram: '', nordiazepam: '', avvikende: '', upublisert: '' }
const for_ = { otram: 0, nordiazepam: [] as unknown[], avvikende: 0 }

const omrade = (nedre: number | null, ovre: number | null) => ({ nedre, ovre, enhet: 'nmol/L', forbehold: '' })

interface Kortet {
  tilstand: string
  data: Record<string, unknown>
}

const kortet = (id: string) =>
  kall.fasit<Kortet>('select tilstand::text, data from public.innholdselementer where objekt_id = $1 order by 1', [id])
const revisjoner = async (id: string) =>
  (await kall.fasit<{ n: number }>('select count(*)::int as n from public.objektrevisjoner where objekt_id = $1', [id]))[0]!.n
const tilstandene = async (id: string) =>
  Object.fromEntries(
    (await kall.fasit<{ tilstand: string; revisjon: number }>('select tilstand::text, revisjon from public.objekttilstander where objekt_id = $1', [id])).map(
      (t) => [t.tilstand, t.revisjon],
    ),
  )

/**
 * Et annet fagmiljø med de samme kodene for en annen forbindelse, som sorterer
 * først: kodene er bare unike innenfor et fagmiljø.
 */
async function annetFagmiljoMedSammeKoder(administrator: string, koder: string[]) {
  await opprettFagmiljo(db, { nokkel: 'annet-laboratorium', navn: 'Et annet laboratorium', administrator })
  await db.exec(`
    create temp table kopi_metoder as select * from public.analyttkatalog_metoder where fagmiljo_id = intern.opprinnelig_fagmiljo();
    create temp table kopi_oppforinger as select * from public.analyttkatalog_oppforinger where fagmiljo_id = intern.opprinnelig_fagmiljo();
    create temp table kopi_koder as select * from public.analyttkatalog_koder where fagmiljo_id = intern.opprinnelig_fagmiljo();
  `)
  await db.exec(`
    update kopi_metoder set fagmiljo_id = (select id from public.fagmiljoer where nokkel = 'annet-laboratorium');
    update kopi_oppforinger set fagmiljo_id = (select id from public.fagmiljoer where nokkel = 'annet-laboratorium');
    update kopi_koder set fagmiljo_id = (select id from public.fagmiljoer where nokkel = 'annet-laboratorium'), forbindelse = 'a-annen-forbindelse', datakort = 'forbindelse';
    insert into public.analyttkatalog_metoder select * from kopi_metoder;
    insert into public.analyttkatalog_oppforinger select * from kopi_oppforinger;
  `)
  await db.query('insert into public.analyttkatalog_koder select * from kopi_koder where kode = any($1)', [koder])
}

beforeAll(async () => {
  db = await nyDatabase({ til: MIGRASJON })
  const admin = await opprettBruker(db, { brukernavn: 'peohol', fornavn: 'Peder', etternavn: 'Test', rolle: 'admin', systemarkitekt: true })
  bruker = await opprettBruker(db, { brukernavn: 'leser', fornavn: 'Lars', etternavn: 'Leser', rolle: 'user' })
  kall = faginnholdskall(db, admin)
  lager = lagFaginnholdslager(kall.klientFor(admin))

  await annetFagmiljoMedSammeKoder(admin, ['OTRAM', 'DMI'])

  const tramadol = await lager.opprettUtkast('infoside', { navn: 'Tramadol' })
  const diazepam = await lager.opprettUtkast('infoside', { navn: 'Diazepam' })
  const klordiazepoksid = await lager.opprettUtkast('infoside', { navn: 'Klordiazepoksid' })
  const klorazepat = await lager.opprettUtkast('infoside', { navn: 'Klorazepat' })
  ider.tramadol = tramadol.id
  const innhold = (infoside: string, data: Record<string, unknown>): Innholdselementinnhold => ({
    infoside,
    panel: 'viktige_data',
    posisjon: 0,
    elementtype: 'referanseomrade',
    data,
    referanser: [],
  })
  const kort = (infoside: string, data: Record<string, unknown>) => lager.opprettUtkast('innholdselement', innhold(infoside, data))
  // Som i produksjonen: kortet for metabolitten med OUS sin kode i `gjelder`.
  const otram = await kort(tramadol.id, { ...omrade(null, 5), gjelder: 'OTRAM' })
  const nordiazepam = await kort(diazepam.id, { ...omrade(300, 400), gjelder: 'nordiazepam' })
  const avvikende = await kort(klordiazepoksid.id, { ...omrade(100, 200), gjelder: 'DMI' })
  const upublisert = await kort(klorazepat.id, { ...omrade(500, 600), gjelder: 'DMI' })
  ider.otram = otram.id
  ider.nordiazepam = nordiazepam.id
  ider.avvikende = avvikende.id
  ider.upublisert = upublisert.id
  for (const { id, revisjon } of [tramadol, diazepam, klordiazepoksid, klorazepat, otram, nordiazepam, avvikende]) await lager.publiserUtkast(id, revisjon!)
  // Et utkast med andre tall som ikke er publisert.
  await lager.lagreUtkast(avvikende.id, avvikende.revisjon!, innhold(klordiazepoksid.id, { ...omrade(150, 250), gjelder: 'DMI' }))

  for_.otram = await revisjoner(otram.id)
  for_.nordiazepam = await kortet(nordiazepam.id)
  for_.avvikende = (await tilstandene(avvikende.id)).utkast!
  await kjorMigrasjoner(db, { fra: MIGRASJON })
}, 120_000)

describe('datakortene', () => {
  it('gir kortet med en analyttkode forbindelsen koden måler, med tallene uendret, publisert og som utkast', async () => {
    expect(await kortet(ider.otram)).toEqual([
      { tilstand: 'publisert', data: { ...omrade(null, 5), gjelder: 'o-desmetyltramadol' } },
      { tilstand: 'utkast', data: { ...omrade(null, 5), gjelder: 'o-desmetyltramadol' } },
    ])
    expect(await revisjoner(ider.otram)).toBe(for_.otram + 1)
  })

  it('skriver om den publiserte versjonen og et upublisert utkast hver for seg, uten å publisere utkastet', async () => {
    expect(await kortet(ider.avvikende)).toEqual([
      { tilstand: 'publisert', data: { ...omrade(100, 200), gjelder: 'nordiazepam' } },
      { tilstand: 'utkast', data: { ...omrade(150, 250), gjelder: 'nordiazepam' } },
    ])
    const { publisert, utkast } = await tilstandene(ider.avvikende)
    expect(utkast).toBe(for_.avvikende + 2)
    expect(publisert).toBe(for_.avvikende + 1)
  })

  it('skriver om et kort som aldri er publisert, uten å publisere det', async () => {
    expect(await kortet(ider.upublisert)).toEqual([{ tilstand: 'utkast', data: { ...omrade(500, 600), gjelder: 'nordiazepam' } }])
  })

  it('fører endringen som Claude Codes, med migrasjonen', async () => {
    const [endring] = await kall.fasit<{ agent: string; migrasjon: string; publisert: number }>(
      `select e.agent, e.migrasjon,
         (select count(*)::int from public.objektpubliseringer p where p.endring_id = e.id and p.objekt_id = $1) as publisert
       from public.objektrevisjoner r join public.innholdsendringer e on e.id = r.endring_id
       where r.objekt_id = $1 order by r.revisjon desc limit 1`,
      [ider.otram],
    )
    expect(endring).toEqual({ agent: 'claude-code', migrasjon: MIGRASJON, publisert: 1 })
  })

  it('endrer ikke et kort som alt har forbindelsen', async () => {
    expect(await kortet(ider.nordiazepam)).toEqual(for_.nordiazepam)
  })

  it('godtar etterpå bare en forbindelsesnøkkel i gjelder', async () => {
    const lagre = (gjelder: string) =>
      feilFra(() =>
        kall.fasit(`update public.innholdselementer set data = jsonb_set(data, '{gjelder}', to_jsonb($2::text)) where objekt_id = $1`, [
          ider.nordiazepam,
          gjelder,
        ]),
      )
    for (const kode of ['OTRAM', 'DMI', 'Nordiazepam', 'nor diazepam']) {
      expect((await lagre(kode))?.message, kode).toMatch(/innholdselementer_gjelder_forbindelse/)
    }
    expect(await lagre('n-desmetyldiazepam')).toBeNull()
  })
})

describe('katalogen og det som er slettet', () => {
  it('gir bare kodene, navnene og referanseområdene, uten koblingene', async () => {
    const svar = await som(db, bruker, async (tx) => (await tx.query<{ k: Record<string, unknown> }>('select public.les_analyttkatalog() as k')).rows[0]!.k)
    expect(Object.keys(svar).sort()).toEqual(['fagmiljo', 'metoder', 'oppforinger'])
    const koder = (svar.oppforinger as { koder: Record<string, unknown>[] }[]).flatMap((o) => o.koder)
    expect(koder.length).toBeGreaterThan(50)
    for (const kode of koder) expect(Object.keys(kode).sort()).toEqual(['kode', 'navn', 'referanseomrade'])
  })

  it('har ikke lenger tabellene, kolonnene og funksjonen appen fra før brukte', async () => {
    const [rad] = await kall.fasit<Record<string, unknown>>(
      `select to_regclass('public.analyttkatalog_koblinger') as koblinger,
         to_regclass('public.analyttkoblede_stoffer') as stoffer,
         to_regprocedure('public.les_stoffreferanseomrader(public.objekttilstand)') as funksjon,
         (select array_agg(column_name::text order by column_name) from information_schema.columns
          where table_schema = 'public' and table_name = 'analyttkatalog_koder' and column_name in ('forbindelse', 'datakort')) as kolonner`,
    )
    expect(rad).toEqual({ koblinger: null, stoffer: null, funksjon: null, kolonner: null })
  })
})
