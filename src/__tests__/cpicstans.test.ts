/**
 * CPIC ble stanset 6.11.2026, og migrasjonen
 * `*_slett_cpic_og_gamle_forhandsvisninger.sql` slettet dataene og
 * forhåndsvisningene i eldre kurateringsrevisjoner. CPIC og ClinPGx er nå tatt
 * helt ut (#437, #554): de står ikke i «Datakilder», og stansen
 * (`src/datakilder/stans.ts`) virker for kildene som er igjen. Innholdet er
 * syntetisk.
 */
import type { PGlite } from '@electric-sql/pglite'
import { existsSync, readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import vercel from '../../vercel.json'
import { STANSEDE_KILDER, stansetSvar, stansFor, stansmelding, type Stans } from '../datakilder/stans'
import { DATAKILDER, KILDEOPPSETT, kildeintervaller, lesDatakildestatus, vurderKilder, type Datakildestatus } from '../datakilder/status'
import { uteblittForhandsvisning } from '../kuratering/modell'
import { feilFra, kjorMigrasjoner, nyDatabase } from './hjelp/testdatabase'

const MIGRASJON = '20261106190000_slett_cpic_og_gamle_forhandsvisninger.sql'
const SQL = readFileSync(new URL(`../../supabase/migrations/${MIGRASJON}`, import.meta.url), 'utf8')

const STANS: Stans = { fra: '2026-11-06', grunn: 'Syntetisk grunn.' }

describe('CPIC og ClinPGx er tatt ut av «Datakilder»', () => {
  it('står ikke blant kildene, i kildeoppsettet eller blant de stansede', () => {
    expect(DATAKILDER).toEqual(['fest', 'pubchem', 'farmakologiportalen', 'cypinfo'])
    expect(Object.keys(KILDEOPPSETT).sort()).toEqual([...DATAKILDER].sort())
    expect(STANSEDE_KILDER).toEqual({})
    expect(Object.keys(kildeintervaller()).every((k) => (DATAKILDER as readonly string[]).includes(k))).toBe(true)
  })

  it('viser verken kjøringer eller endringer fra dem, og endringsloggen fra de andre står', () => {
    const kjoring = (kilde: string, id: number) => ({
      kilde, id, status: 'fullfort', utlost_av: 'cron', startet_kl: '2026-11-20T02:00:00Z', avsluttet_kl: '2026-11-20T02:01:00Z',
      versjon: '1', antall: {}, feil: null, endringer: { klinisk: 1, metadata: 0, grunnlag: 0 },
    })
    const endring = (kilde: string, id: number) => ({
      id, kilde, synk_id: 1, type: 'legemiddel', objekt_id: `X${id}`, art: 'ny', niva: 'klinisk', etikett: 'Syntetisk', registrert_kl: '2026-11-20T02:00:30Z',
    })
    const status = lesDatakildestatus({
      kjoringer: [kjoring('clinpgx', 1), kjoring('cpic', 2), kjoring('cypinfo', 3)],
      endringer: [endring('clinpgx', 1), endring('cpic', 2), endring('cypinfo', 3)],
      kilder: { clinpgx: { versjon: '9' }, cypinfo: { versjon: '1' } },
    })
    expect(status.kjoringer.map((k) => k.kilde)).toEqual(['cypinfo'])
    expect(status.endringer.map((e) => e.kilde)).toEqual(['cypinfo'])
    expect(Object.keys(status.kilder ?? {})).toEqual(['cypinfo'])
    expect(vurderKilder(status).map((v) => v.navn)).toEqual(['FEST', 'PubChem', 'Farmakologiportalen', 'CYPinfo'])
  })

  it('endepunktene, koden og de planlagte jobbene for CPIC og ClinPGx er fjernet (#437)', () => {
    for (const fil of [
      '../../api/cpic-synk.ts',
      '../cpic/lesing.ts',
      '../components/stoffside/Cpicvisning.tsx',
      '../../api/clinpgx-synk.ts',
      '../../api/clinpgx-sok.ts',
      '../clinpgx/lesing.ts',
      '../../.github/workflows/clinpgx-synk.yml',
    ]) {
      expect(existsSync(new URL(fil, import.meta.url)), fil).toBe(false)
    }
    expect(Object.keys(vercel.functions)).not.toContain('api/cpic-synk.ts')
    expect(Object.keys(vercel.functions)).not.toContain('api/clinpgx-synk.ts')
    expect(vercel.crons.map((c) => c.path)).not.toContain('/api/cpic-synk')
  })
})

describe('stansen av en kilde', () => {
  it('har dato og grunn, og sier at ingenting hentes eller vises', () => {
    expect(stansFor('pubchem')).toBeNull()
    expect(stansFor('pubchem', { pubchem: STANS })).toBe(STANS)
    expect(stansmelding(STANS, 'PubChem')).toBe('Stanset 06.11.2026. Syntetisk grunn. Ingenting hentes eller vises fra PubChem.')
  })

  it('endepunktet svarer 410 for en stanset kilde', async () => {
    expect(stansetSvar('pubchem', 'PubChem')).toBeNull()
    const svar = stansetSvar('pubchem', 'PubChem', { pubchem: STANS })!
    expect(svar.status).toBe(410)
    expect(await svar.json()).toEqual({ status: 'stanset', feil: stansmelding(STANS, 'PubChem') })
  })

  it('«Datakilder» viser kilden som stanset, uten å be noen se over den', () => {
    const status: Datakildestatus = {
      kjoringer: [{ kilde: 'pubchem', id: 1, status: 'feilet', utlost_av: 'cron', startet_kl: '2026-11-01T02:45:00Z', avsluttet_kl: null, versjon: null, feil: 'x', endringer: { klinisk: 0, metadata: 0, grunnlag: 0 } }],
      endringer: [],
    }
    const pubchem = vurderKilder(status, Date.now(), {}, { pubchem: STANS }).find((v) => v.kilde === 'pubchem')!
    expect(pubchem).toMatchObject({ tilstand: 'stanset', melding: expect.stringMatching(/^Stanset 06\.11\.2026\./) })
    // Uten stansen vurderes den som før.
    expect(vurderKilder(status, Date.now(), {}, {}).find((v) => v.kilde === 'pubchem')!.tilstand).toBe('feil')
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
