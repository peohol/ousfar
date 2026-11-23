/**
 * Stansbryteren for ClinPGx (#437, #539): når ClinPGx står i
 * `STANSEDE_KILDER`, har appen ingen lesere for kilden, og endepunktene svarer
 * 410 uten å kalle den. Stansen selv står i fase C, etter Fags aksept (#533);
 * her stanses kilden bare i testene.
 */
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { lagFarmakogenetikkleserOmIBruk, lagFarmakogenetikksokOmIBruk } from '../clinpgx/lesing'
import { omIBruk, stansFor } from '../datakilder/stans'

const STANS = { fra: '2026-12-01', grunn: 'Syntetisk grunn.' }

// Endepunktene leser den ekte stanslisten; her står ClinPGx i den.
vi.mock('../datakilder/stans', async (original) => {
  const ekte = await original<typeof import('../datakilder/stans')>()
  return { ...ekte, stansetSvar: (kilde: Parameters<typeof ekte.stansetSvar>[0], navn: string) => ekte.stansetSvar(kilde, navn, { clinpgx: STANS }) }
})
const behandlet = vi.hoisted(() => vi.fn(async () => new Response('{}')))
vi.mock('../clinpgx/endepunkt', () => ({ behandleClinpgxSynk: behandlet, behandleClinpgxSok: behandlet }))

describe('stansbryteren for ClinPGx', () => {
  const klient = {} as SupabaseClient

  it('lager leseren bare når kilden ikke er stanset', () => {
    const lag = vi.fn(() => 'leser')
    expect(omIBruk('clinpgx', lag, {})).toBe('leser')
    expect(omIBruk('clinpgx', lag, { clinpgx: STANS })).toBeUndefined()
    expect(lag).toHaveBeenCalledTimes(1)
  })

  it('gir appen ingen lesere for fagsidene og søket når ClinPGx er stanset', () => {
    expect(lagFarmakogenetikkleserOmIBruk(klient, { clinpgx: STANS })).toBeUndefined()
    expect(lagFarmakogenetikksokOmIBruk(klient, { clinpgx: STANS })).toBeUndefined()
    expect(lagFarmakogenetikkleserOmIBruk(klient, {})).toMatchObject({ les: expect.any(Function), sok: expect.any(Function), hent: expect.any(Function) })
    expect(lagFarmakogenetikksokOmIBruk(klient, {})).toMatchObject({ les: expect.any(Function) })
    // ClinPGx er ikke stanset ennå: det skjer først etter Fags aksept (#533).
    expect(stansFor('clinpgx')).toBeNull()
  })

  it('svarer 410 fra synkroniseringen og oppslaget uten å kalle ClinPGx', async () => {
    const synk = await import('../../api/clinpgx-synk')
    const sok = await import('../../api/clinpgx-sok')
    for (const svar of [
      await synk.GET(new Request('https://ousfar.test/api/clinpgx-synk')),
      await synk.POST(new Request('https://ousfar.test/api/clinpgx-synk', { method: 'POST', body: '{}' })),
      await sok.GET(new Request('https://ousfar.test/api/clinpgx-sok?q=amitriptyline')),
    ]) {
      expect(svar.status).toBe(410)
      expect(await svar.json()).toEqual({ status: 'stanset', feil: 'Stanset 01.12.2026. Syntetisk grunn. Ingenting hentes eller vises fra ClinPGx.' })
    }
    expect(behandlet).not.toHaveBeenCalled()
  })
})
