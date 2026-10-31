/**
 * Nødstoppen for de kliniske verktøyene i databasen (P11.6): bare en
 * administrator kan sette og oppheve en sperre, alle innloggede kan lese de
 * aktive, ingen kan lese eller skrive tabellen direkte, og ingen sperre
 * forsvinner — mot en ekte database bygd av migrasjonene. Til slutt hele
 * tilbakerullingsscenariet slik appen ser det, gjennom den samme lesingen.
 */
import type { PGlite } from '@electric-sql/pglite'
import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import { lagVerktoysperrelager, usperrede, type Sperrehistorikk, type Verktoysperre } from '../verktoy/sperrer'
import { feilFra, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

describe('nødstoppen for de kliniske verktøyene', () => {
  let db: PGlite
  let admin: string
  let bruker: string

  const sql = <T = Record<string, unknown>>(hvem: string | null, tekst: string, parametre: unknown[] = []) =>
    som(db, hvem, async (tx) => (await tx.query<T>(tekst, parametre)).rows)
  const en = async <T>(hvem: string | null, tekst: string, parametre: unknown[] = []) => Object.values((await sql<Record<string, T>>(hvem, tekst, parametre))[0]!)[0] as T
  const aktive = (hvem: string) => en<Verktoysperre[]>(hvem, 'select public.les_verktoysperrer()')
  const sett = (hvem: string, omfang: string, mal: string | null, grunn: string) => en<string>(hvem, 'select public.sett_verktoysperre($1, $2, $3)', [omfang, mal, grunn])
  const opphev = (hvem: string, id: string, grunn: string) => sql(hvem, 'select public.opphev_verktoysperre($1, $2)', [id, grunn])

  /** Den samme lesingen appen bruker, med kallene gjort som `hvem` mot testdatabasen. */
  const klientFor = (hvem: string) =>
    ({
      rpc: async (funksjon: string, argumenter: Record<string, unknown> = {}) => {
        const navn = Object.keys(argumenter)
        try {
          const data = await en(hvem, `select public.${funksjon}(${navn.map((n, i) => `${n} => $${i + 1}`).join(', ')})`, navn.map((n) => argumenter[n]))
          return { data, error: null }
        } catch (e) {
          return { data: null, error: { message: (e as Error).message } }
        }
      },
    }) as unknown as SupabaseClient

  beforeAll(async () => {
    db = await nyDatabase()
    admin = await opprettBruker(db, { brukernavn: 'admin', fornavn: 'Ada', etternavn: 'Admin', rolle: 'admin' })
    bruker = await opprettBruker(db, { brukernavn: 'bo.lege', fornavn: 'Bo', etternavn: 'Lege', rolle: 'user' })
  }, 60_000)

  it('lar bare en administrator sette og oppheve en sperre, og alle innloggede lese de aktive', async () => {
    expect(await feilFra(() => sett(bruker, 'alle', null, 'Ikke min sak.'))).toMatchObject({ code: '42501' })
    const id = await sett(admin, 'verktoy', 'trappe-ned-antidepressiv', '  Feil i pilot.  ')
    expect(await aktive(bruker)).toEqual([{ id, omfang: 'verktoy', mal: 'trappe-ned-antidepressiv', grunn: 'Feil i pilot.', satt_kl: expect.any(String), satt_av: 'Ada Admin' }])
    // Uten innlogging kan sperrene ikke leses, og tabellen kan ikke leses eller skrives direkte av noen.
    expect(await feilFra(() => sql(null, 'select public.les_verktoysperrer()'))).toMatchObject({ code: '42501' })
    for (const hvem of [bruker, admin]) {
      expect(await feilFra(() => sql(hvem, 'select * from public.verktoysperrer'))).toMatchObject({ code: '42501' })
      expect(await feilFra(() => sql(hvem, `update public.verktoysperrer set opphevet_kl = now()`))).toMatchObject({ code: '42501' })
      expect(await feilFra(() => sql(hvem, `delete from public.verktoysperrer`))).toMatchObject({ code: '42501' })
    }
    expect(await feilFra(() => opphev(bruker, id, 'Prøver å oppheve.'))).toMatchObject({ code: '42501' })
    expect(await feilFra(() => en(bruker, 'select public.verktoysperrehistorikk()'))).toMatchObject({ code: '42501' })
    await opphev(admin, id, 'Rettet og kontrollert.')
    expect(await aktive(bruker)).toEqual([])
    expect(await feilFra(() => opphev(admin, id, 'En gang til.'))).toMatchObject({ code: '55000' })
  })

  it('godtar bare en kjent form, én aktiv sperre per mål og en grunn, og sletter aldri en sperre', async () => {
    for (const [omfang, mal, grunn] of [
      ['noe', null, 'Ukjent omfang.'],
      ['alle', 'trappe-ned-antidepressiv', 'Alle har ikke mål.'],
      ['verktoy', null, 'Verktøy uten mål.'],
      ['regel', 'Ikke Gyldig', 'Store bokstaver og mellomrom.'],
      ['alle', null, 'kort'],
    ] as const) {
      expect(await feilFra(() => sett(admin, omfang, mal, grunn)), `${omfang} ${mal} ${grunn}`).toMatchObject({ code: '23514' })
    }
    const forste = await sett(admin, 'alle', null, 'Første stopp.')
    expect(await feilFra(() => sett(admin, 'alle', null, 'Andre stopp.'))).toMatchObject({ code: '23505' })
    expect(await feilFra(() => opphev(admin, forste, 'kort'))).toMatchObject({ code: '23514' })
    await opphev(admin, forste, 'Kontrollert og opphevet.')
    const andre = await sett(admin, 'alle', null, 'Andre stopp.')
    const historikk = await en<Sperrehistorikk[]>(admin, 'select public.verktoysperrehistorikk()')
    const alle = historikk.filter((h) => h.omfang === 'alle')
    expect(alle.map((h) => [h.id, h.grunn, h.opphevet_grunn, h.opphevet_av])).toEqual([
      [andre, 'Andre stopp.', null, null],
      [forste, 'Første stopp.', 'Kontrollert og opphevet.', 'Ada Admin'],
    ])
    await opphev(admin, andre, 'Kontrollert og opphevet.')
  })

  it('stopper og gjenoppretter en regel i et kontrollert tilbakerullingsscenario, slik appen leser det', async () => {
    const lege = lagVerktoysperrelager(klientFor(bruker))
    const leder = lagVerktoysperrelager(klientFor(admin))
    const verktoy = { id: 'bytte-antipsykotikum' }
    const regler = [{ id: 'depot-paliperidon-xeplion' }, { id: 'depot-aripiprazol-maintena' }]
    expect(usperrede(await lege.les(), verktoy, regler)).toEqual(regler)
    // Kritisk feil i Xeplion-regelen: bare den stoppes, med en gang.
    const id = await leder.sett('regel', 'depot-paliperidon-xeplion', 'Syntetisk kritisk feil: feil injeksjonsdag i pilot.')
    expect(usperrede(await lege.les(), verktoy, regler)).toEqual([regler[1]])
    // En vanlig bruker kan ikke oppheve den; lesingen kaster ikke for det, men kallet avvises.
    await expect(lagVerktoysperrelager(klientFor(bruker)).opphev(id, 'Prøver.')).rejects.toThrow(/Bare administratorer/)
    await leder.opphev(id, 'Rettet i ny regelversjon etter uavhengig kontroll.')
    expect(usperrede(await lege.les(), verktoy, regler)).toEqual(regler)
    expect((await leder.historikk()).find((h) => h.id === id)).toMatchObject({ omfang: 'regel', mal: 'depot-paliperidon-xeplion', opphevet_av: 'Ada Admin', opphevet_grunn: 'Rettet i ny regelversjon etter uavhengig kontroll.' })
  })
})
