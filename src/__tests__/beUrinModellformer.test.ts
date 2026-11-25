/**
 * Modellformene for benzoylekgonin i urin i databasen (#570,
 * `20261125094800_be_urin_modellformer.sql`): formkontrollen tar imot både
 * form 1 og form 2, og `public.les_be_urin_modell()` gir bare en app en form
 * den oppgir at den kjenner.
 *
 * Utrullingen prøves i alle rekkefølger:
 *
 * 1. Ny app mot form-1-modellen fra #562: fortolker som før.
 * 2. Ny app mot form 2: får de fem profilene.
 * 3. Gammel app (uten overskriften) mot form 2: får en melding om å
 *    oppdatere, aldri fem profiler lest som to.
 * 4. Ny app mot en database uten denne endringen: overskriften ses bort fra.
 *
 * Etter aktiveringen (20261125121500_be_urin_fem_profiler.sql) har OUS
 * Klinisk farmakologi modellen av form 2: en ny app får den, en gammel app
 * meldingen om å oppdatere.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  MODELLFORMOVERSKRIFT,
  tilBeUrinModell,
  validerBeUrinModell,
  type BeUrinModell,
  type BeUrinProfilmodell,
} from '../domain/beUrinModell'
import { BESTILTE_KURVER, FORM1_AKTIVERT, PROFILMODELL, medProfil } from '../domain/__tests__/hjelp/beUrinTestmodell'
import { tilFeil } from '../faginnhold/lagring'
import { lesBeUrinModell } from '../katalog/beUrinModell'
import { medOverskrifter } from '../endringslogg/operasjon'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { faginnholdskall, feilFra, nyDatabase, type Faginnholdskall } from './hjelp/testdatabase'

const MIGRASJONER = new URL('../../supabase/migrations/', import.meta.url)

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  kall = faginnholdskall(db, g.id.systemarkitekt)
}, 120_000)

/** Slik den nye appen henter modellen. */
const nyApp = (p: Person) => lesBeUrinModell(kall.klientFor(g.id[p]))

/** Slik en app fra før form 2 hentet modellen: uten overskriften. */
async function gammelApp(p: Person, overskrifter: Record<string, string> = {}) {
  const { data, error } = await medOverskrifter(kall.klientFor(g.id[p]).rpc('les_be_urin_modell'), overskrifter)
  if (error) throw tilFeil(error)
  return data as { fagmiljo: unknown; modell: unknown }
}

/** Bytter modellen i et fagmiljø inne i en transaksjon som rulles tilbake, og kjører `arbeid` mens den står der. */
async function medModell(fagmiljo: string, modell: unknown, arbeid: () => Promise<void>) {
  const for_ = await db.query<{ versjon: string; modell: unknown }>(
    'select versjon, modell from public.be_urin_modeller where fagmiljo_id = $1',
    [fagmiljo],
  )
  await db.query('delete from public.be_urin_modeller where fagmiljo_id = $1', [fagmiljo])
  try {
    await leggInn(fagmiljo, modell)
    await arbeid()
  } finally {
    await db.query('delete from public.be_urin_modeller where fagmiljo_id = $1', [fagmiljo])
    for (const rad of for_.rows) await leggInn(fagmiljo, rad.modell, rad.versjon)
  }
}

const leggInn = (fagmiljo: string, modell: unknown, versjon = (modell as { versjon: string }).versjon) =>
  db.query('insert into public.be_urin_modeller (fagmiljo_id, versjon, modell) values ($1, $2, $3)', [
    fagmiljo,
    versjon,
    JSON.stringify(modell),
  ])

const OPPDATER = /krever en nyere utgave av appen/

describe('med form-1-modellen fra #562', () => {
  it('leser både ny og gammel app den', async () => {
    await medModell(g.fagmiljo.A, FORM1_AKTIVERT, async () => {
      const ny = await nyApp('vanligA')
      const gammel = await gammelApp('vanligA')
      expect(gammel).toEqual(ny)
      const r = tilBeUrinModell(ny.modell)
      expect(r?.ok).toBe(true)
      if (!r?.ok) return
      expect(r.modell.versjon).toBe('ous-kf-2026-11-24')
      expect((r.modell as BeUrinModell).kurver).toEqual(BESTILTE_KURVER)
      expect('form' in r.modell).toBe(false)
    })
  })
})

describe('etter aktiveringen', () => {
  it('får den nye appen modellen av form 2, og den gamle meldingen om å oppdatere', async () => {
    const r = tilBeUrinModell((await nyApp('vanligA')).modell)
    expect(r?.ok).toBe(true)
    if (!r?.ok) return
    expect(r.modell.versjon).toBe('ous-kf-2026-11-25')
    expect((r.modell as BeUrinProfilmodell).form).toBe(2)
    expect((await feilFra(() => gammelApp('vanligA')))?.message).toMatch(OPPDATER)
  })
})

describe('formkontrollen', () => {
  const avvist = async (modell: unknown) => (await feilFra(() => leggInn(g.fagmiljo.B, modell)))?.code

  it('tar imot form 2 med de fem profilene, i hvilken som helst rekkefølge', async () => {
    for (const profiler of [PROFILMODELL.profiler, [...PROFILMODELL.profiler].reverse()]) {
      await leggInn(g.fagmiljo.B, { ...PROFILMODELL, profiler })
      await db.query('delete from public.be_urin_modeller where fagmiljo_id = $1', [g.fagmiljo.B])
    }
  })

  it.each<[string, Partial<BeUrinProfilmodell> | Record<string, unknown>]>([
    ['fire profiler', { profiler: PROFILMODELL.profiler.slice(0, 4) }],
    ['seks profiler', { profiler: [...PROFILMODELL.profiler, PROFILMODELL.profiler[0]!] }],
    ['en ID to ganger', { profiler: medProfil({ id: 'moderat', type: 'mono', a: 1, k: 1 }).map((p, i) => (i === 0 ? { ...p, id: 'moderat' } : p)) as never }],
    ['feil type for ID-en', { profiler: medProfil({ id: 'moderat', type: 'bi', a1: 1, k1: 1, a2: 1, k2: 1 } as never) }],
    ['en ukjent ID', { profiler: medProfil({ id: 'enkeltinntak', type: 'mono', a: 1, k: 1 }).map((p, i) => (i === 0 ? { ...p, id: 'annen' } : p)) as never }],
    ['k lik 0', { profiler: medProfil({ id: 'enkeltinntak', type: 'mono', a: 1, k: 0 }) }],
    ['a negativ', { profiler: medProfil({ id: 'bi_a', type: 'bi', a1: -1, k1: 1, a2: 1, k2: 1 }) }],
    ['k som tekst', { profiler: medProfil({ id: 'gjentatte_doser', type: 'mono', a: 1, k: '0.4' as never }) }],
    ['en ukjent form', { form: 3 }],
    ['form 2 med to kurver', { profiler: undefined, kurver: BESTILTE_KURVER } as never],
  ])('avviser form 2 med %s', async (_, overstyr) => {
    expect(await avvist({ ...PROFILMODELL, ...overstyr })).toBe('23514')
  })

  it('avviser form 1 med fem kurver og en versjon som ikke stemmer', async () => {
    const { form: _form, profiler: _profiler, ...felles } = PROFILMODELL
    expect(await avvist({ ...felles, kurver: [...BESTILTE_KURVER, ...BESTILTE_KURVER, BESTILTE_KURVER[0]] })).toBe('23514')
    expect((await feilFra(() => leggInn(g.fagmiljo.B, PROFILMODELL, 'annen versjon')))?.code).toBe('23514')
  })
})

describe('med form 2 i OUS Klinisk farmakologi', () => {
  it('får den nye appen de fem profilene, og de består kontrollen', async () => {
    await medModell(g.fagmiljo.A, PROFILMODELL, async () => {
      for (const p of ['vanligA', 'adminA', 'systemarkitekt', 'dobbeltAB'] as const) {
        const svar = await nyApp(p)
        expect(svar.modell, p).toEqual(PROFILMODELL)
        expect(tilBeUrinModell(svar.modell)?.ok, p).toBe(true)
      }
    })
  })

  it('får en gammel app en melding om å oppdatere, aldri profilene', async () => {
    await medModell(g.fagmiljo.A, PROFILMODELL, async () => {
      const feil = await feilFra(() => gammelApp('vanligA'))
      expect(feil?.message).toMatch(OPPDATER)
      // En app som oppgir bare form 1, eller ingenting den kjenner, får det samme.
      for (const verdi of ['1', ' 1 ,', 'x', '']) {
        expect((await feilFra(() => gammelApp('vanligA', { [MODELLFORMOVERSKRIFT]: verdi })))?.message, verdi).toMatch(OPPDATER)
      }
      expect((await gammelApp('vanligA', { [MODELLFORMOVERSKRIFT]: ' 2 , x' })).modell).toEqual(PROFILMODELL)
    })
  })

  it('ville en gammel app uansett ikke ha brukt fem profiler som to', () => {
    // Kontrollen i appen fra #562 krevde nøyaktig to kurver.
    expect(validerBeUrinModell(PROFILMODELL as unknown as BeUrinModell).length).toBeGreaterThan(0)
  })

  it('får de i et annet fagmiljø ingen modell, heller ikke med overskriften', async () => {
    await medModell(g.fagmiljo.A, PROFILMODELL, async () => {
      for (const p of ['vanligB', 'adminB', 'arkitektB'] as const) {
        expect(await nyApp(p), p).toEqual({ fagmiljo: { id: g.fagmiljo.B, navn: expect.any(String) }, modell: null })
        expect(await gammelApp(p), p).toEqual({ fagmiljo: { id: g.fagmiljo.B, navn: expect.any(String) }, modell: null })
      }
    })
  })

  it('stopper fortsatt den som ikke har et aktivt medlemskap', async () => {
    await medModell(g.fagmiljo.A, PROFILMODELL, async () => {
      expect((await feilFra(() => nyApp('utenMedlemskap')))?.message).toMatch(/ikke lenger et aktivt medlemskap/)
    })
  })
})

describe('mot en database uten modellformene', () => {
  it('leser den nye appen modellen fra #562 som før', async () => {
    const for_ = readFileSync(new URL('20261124095000_be_urin_modell.sql', MIGRASJONER), 'utf8')
    const gammelFunksjon = for_.match(/create function public\.les_be_urin_modell\(\)[\s\S]*?\n\$\$;/)?.[0]
    expect(gammelFunksjon).toBeTruthy()
    const ny = readFileSync(new URL('20261125094800_be_urin_modellformer.sql', MIGRASJONER), 'utf8')
    const nyFunksjon = ny.match(/create or replace function public\.les_be_urin_modell\(\)[\s\S]*?\n\$\$;/)?.[0]
    expect(nyFunksjon).toBeTruthy()
    try {
      await db.exec(gammelFunksjon!.replace('create function', 'create or replace function'))
      const svar = await nyApp('vanligA')
      expect(tilBeUrinModell(svar.modell)?.ok).toBe(true)
      expect((svar.modell as BeUrinProfilmodell).versjon).toBe('ous-kf-2026-11-25')
    } finally {
      await db.exec(nyFunksjon!)
    }
    // Funksjonen er tilbake: en gammel app får igjen meldingen ved form 2.
    await medModell(g.fagmiljo.A, PROFILMODELL, async () => {
      expect((await feilFra(() => gammelApp('vanligA')))?.message).toMatch(OPPDATER)
    })
  })
})
