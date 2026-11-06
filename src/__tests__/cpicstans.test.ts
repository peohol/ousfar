/**
 * CPIC er stanset fra 6.11.2026 (`src/datakilder/stans.ts`, `docs/datakilder.md`):
 * ingen henting, ingenting leses eller vises, og migrasjonen
 * `*_slett_cpic_og_gamle_forhandsvisninger.sql` sletter dataene og
 * forhåndsvisningene i eldre kurateringsrevisjoner. Innholdet er syntetisk.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import { GET, POST } from '../../api/cpic-synk'
import vercel from '../../vercel.json'
import { lagCpicleserOmIBruk } from '../cpic/lesing'
import { STANSEDE_KILDER, stansetSvar, stansFor, stansmelding } from '../datakilder/stans'
import { kilderSomBorSesOver, kildeintervaller, vurderKilder, type Datakildestatus } from '../datakilder/status'
import { uteblittForhandsvisning } from '../kuratering/modell'
import { feilFra, kjorMigrasjoner, nyDatabase } from './hjelp/testdatabase'

const MIGRASJON = '20261106190000_slett_cpic_og_gamle_forhandsvisninger.sql'
const SQL = readFileSync(new URL(`../../supabase/migrations/${MIGRASJON}`, import.meta.url), 'utf8')

describe('CPIC er stanset', () => {
  it('stansen gjelder CPIC, med dato og grunn', () => {
    expect(stansFor('cpic')).toEqual({ fra: '2026-11-06', grunn: expect.stringContaining('norske farmakogenetiske data') })
    expect(stansFor('clinpgx')).toBeNull()
    expect(stansmelding(STANSEDE_KILDER.cpic!, 'CPIC')).toBe(
      'Stanset 06.11.2026. CPIC-dataene er slettet for å spare plass i databasen, og skal erstattes av norske ' +
        'farmakogenetiske data. Ingenting hentes eller vises fra CPIC.',
    )
  })

  it('endepunktet svarer 410 for både den planlagte jobben og administratorer, uten å hente', async () => {
    for (const behandle of [GET, POST]) {
      const svar = await behandle(new Request('https://ousfar.example/api/cpic-synk', { method: 'POST' }))
      expect(svar.status).toBe(410)
      expect(await svar.json()).toEqual({ status: 'stanset', feil: expect.stringMatching(/^Stanset 06\.11\.2026\./) })
    }
    expect(stansetSvar('pubchem', 'PubChem')).toBeNull()
    expect(stansetSvar('cpic', 'CPIC', {})).toBeNull()
  })

  it('den ukentlige jobben er tatt ut av vercel.json, så CPIC har ikke noe intervall', () => {
    expect(vercel.crons.map((c) => c.path)).not.toContain('/api/cpic-synk')
    expect(kildeintervaller()).not.toHaveProperty('cpic')
  })

  it('appen får ingen CPIC-leser, så fagsidene, oppslaget, diplotypene og søket ikke leser noe', () => {
    const klient = {} as SupabaseClient
    expect(lagCpicleserOmIBruk(klient)).toBeUndefined()
    expect(lagCpicleserOmIBruk(klient, {})).toMatchObject({ les: expect.any(Function), diplotyper: expect.any(Function) })
  })

  it('datakildene viser CPIC som stanset, uten å be noen se over den', () => {
    const status: Datakildestatus = {
      kjoringer: [{ kilde: 'cpic', id: 1, status: 'feilet', utlost_av: 'cron', startet_kl: '2026-11-01T02:45:00Z', avsluttet_kl: null, release: null, versjon: null, feil: 'x', endringer: { klinisk: 0, metadata: 0, grunnlag: 0 } }],
      endringer: [],
    }
    const cpic = vurderKilder(status).find((v) => v.kilde === 'cpic')!
    expect(cpic).toMatchObject({ tilstand: 'stanset', melding: expect.stringMatching(/^Stanset 06\.11\.2026\./) })
    expect(kilderSomBorSesOver(status)).not.toContain('CPIC')
    // Uten stansen vurderes den som før.
    expect(vurderKilder(status, Date.now(), {}, {}).find((v) => v.kilde === 'cpic')!.tilstand).toBe('feil')
  })

  it('en eldre revisjon uten forhåndsvisning sier hvorfor', () => {
    const teknisk = { ok: true, rapport_ok: true, kontrollert_kl: '2026-10-20T10:00:00Z' }
    expect(uteblittForhandsvisning({ ...teknisk, forhandsvisning_fjernet: '2026-11-06' })).toMatch(/slettet for å spare plass/)
    expect(uteblittForhandsvisning({ ...teknisk, ok: false, feil: 'Syntetisk feil' })).toBe(
      'Revisjonen har ingen forhåndsvisning fordi prøvepubliseringen feilet: Syntetisk feil',
    )
  })
})

describe('migrasjonen som sletter CPIC og de gamle forhåndsvisningene', () => {
  let db: PGlite
  const GREN = '00000000-0000-4000-8000-000000000001'
  const SIDE = '00000000-0000-4000-8000-000000000002'

  beforeAll(async () => {
    db = await nyDatabase({ til: MIGRASJON })
    // Syntetiske rader rett i tabellene, uten de andre radene de viser til.
    await db.exec(`
      set session_replication_role = replica;
      insert into kuratering.grener (id, infoside, stoff, art, formaal, grunnversjon, revisjon, status)
      values ('${GREN}', '${SIDE}', 'syntetisk', 'gjenoppretting', 'Syntetisk gren', 1, 3, 'arbeid');
      insert into kuratering.grenrevisjoner (gren, infoside, revisjon, innhold, grunnversjon, fingeravtrykk, teknisk, forhandsvisning)
      values
        ('${GREN}', '${SIDE}', 1, '{"a": 1}', 1, 'f1', '{"ok": true}', '{"stoff": {"navn": "En"}}'),
        ('${GREN}', '${SIDE}', 2, '{"a": 2}', 1, 'f2', '{"ok": false, "feil": "x"}', null),
        ('${GREN}', '${SIDE}', 3, '{"a": 3}', 1, 'f3', '{"ok": true}', '{"stoff": {"navn": "Tre"}}');
      insert into cpic.synkroniseringer (status, release) values ('fullfort', 'v1.60.1');
      insert into cpic.gen (cpic_id, data, hash, sist_sett_synk) values ('CYP2D6', '{}', 'h', 1);
      insert into cpic.innlasting (synk_id, entitet, cpic_id, data) values (1, 'gen', 'CYP2D6', '{}');
      update cpic.entiteter set sha256 = 'sum', parserversjon = 1;
      insert into datakilder.endringer (kilde, type, objekt_id, art, niva, etikett)
      values ('cpic', 'gen', 'CYP2D6', 'ny', 'klinisk', 'CYP2D6'), ('clinpgx', 'retningslinje', 'PA1', 'ny', 'klinisk', 'PA1');
      set session_replication_role = origin;
    `)
    await kjorMigrasjoner(db, { bare: [MIGRASJON] })
  }, 120_000)

  it('tømmer alle CPIC-tabellene unntatt oppsettet, og nullstiller kontrollsummene', async () => {
    const { rows } = await db.query<{ tabell: string }>(
      `select c.relname tabell from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'cpic' and c.relkind in ('r', 'p') order by 1`,
    )
    const oppsett = ['entiteter', 'henvisninger']
    const tommes = rows.map((r) => r.tabell).filter((t) => !oppsett.includes(t))
    // Migrasjonen nevner hver datatabell; en ny tabell i skjemaet måtte vært tatt med.
    for (const t of tommes) {
      expect(SQL, t).toMatch(new RegExp(`\\bcpic\\.${t}\\b`))
      const { rows: n } = await db.query<{ n: number }>(`select count(*)::int n from cpic.${t}`)
      expect(n[0]!.n, t).toBe(0)
    }
    expect(tommes).toContain('diplotype')
    const { rows: entiteter } = await db.query<{ n: number; satt: number }>(
      `select count(*)::int n, count(sha256)::int + count(parserversjon)::int satt from cpic.entiteter`,
    )
    expect(entiteter[0]).toEqual({ n: 13, satt: 0 })
    const { rows: henvisninger } = await db.query<{ n: number }>(`select count(*)::int n from cpic.henvisninger`)
    expect(henvisninger[0]!.n).toBeGreaterThan(0)
  })

  it('sletter bare endringsloggen for CPIC', async () => {
    const { rows } = await db.query<{ kilde: string }>(`select kilde from datakilder.endringer order by 1`)
    expect(rows.map((r) => r.kilde)).toEqual(['clinpgx'])
  })

  it('fjerner forhåndsvisningen bare fra de eldre revisjonene, og rører ikke resten', async () => {
    const { rows } = await db.query<{ revisjon: number; innhold: unknown; fingeravtrykk: string; teknisk: Record<string, unknown>; forhandsvisning: unknown }>(
      `select revisjon, innhold, fingeravtrykk, teknisk, forhandsvisning from kuratering.grenrevisjoner where gren = $1 order by revisjon`,
      [GREN],
    )
    expect(rows).toEqual([
      { revisjon: 1, innhold: { a: 1 }, fingeravtrykk: 'f1', teknisk: { ok: true, forhandsvisning_fjernet: '2026-11-06' }, forhandsvisning: null },
      // Uten forhåndsvisning fra før: feilen fra prøvepubliseringen står som den var.
      { revisjon: 2, innhold: { a: 2 }, fingeravtrykk: 'f2', teknisk: { ok: false, feil: 'x' }, forhandsvisning: null },
      { revisjon: 3, innhold: { a: 3 }, fingeravtrykk: 'f3', teknisk: { ok: true }, forhandsvisning: { stoff: { navn: 'Tre' } } },
    ])
  })

  it('revisjonene er uforanderlige igjen etterpå', async () => {
    const feil = await feilFra(() => db.query(`update kuratering.grenrevisjoner set melding = 'endret' where gren = $1`, [GREN]))
    expect(feil?.message).toMatch(/kan ikke endres eller slettes/)
  })
})
