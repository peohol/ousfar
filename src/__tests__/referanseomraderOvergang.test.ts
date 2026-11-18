/**
 * Referanseområdene steg 2 viser, også i overgangen: når appen møter en
 * database der områdene ennå ikke står i katalogen (`docs/domener.md`,
 * «Overgangen»). Mot en ekte database før og etter migrasjonen prøves det i
 * `src/__tests__/referanseomrader.test.ts`. Tallene er syntetiske.
 */
import { describe, expect, it, vi } from 'vitest'
import { byggKatalog, type Eldrekatalog } from '../domain/analyttkatalog'
import { lesReferanseomrader, referanseomraderFraFagsidene } from '../katalog/referanseomrader'
import { OUS_KATALOGDATA } from '../domain/ouskatalog'

const omrade = (nedre: number | null, ovre: number | null, enhet = 'nmol/L') => ({ nedre, ovre, enhet })
const kort = (stoff: string, gjelder: string | null, verdi: Record<string, unknown>) => ({ stoff, gjelder, verdi })

const eldre: Eldrekatalog = {
  bruk: [
    { kode: 'TRAM', stoff: 'tramadol', gjelder: null },
    { kode: 'OTRAM', stoff: 'tramadol', gjelder: 'o-desmetyltramadol' },
    { kode: 'DIAZ', stoff: 'diazepam', gjelder: null },
    { kode: 'DMI', stoff: 'diazepam', gjelder: 'nordiazepam' },
    { kode: 'HBUP', stoff: 'bupropion', gjelder: null },
  ],
  forbindelser: new Map([
    ['OTRAM', 'o-desmetyltramadol'],
    ['DMI', 'nordiazepam'],
  ]),
}

describe('referanseområdene fra fagsidene i overgangen', () => {
  it('gir hver kode kortet den brukte på siden til sitt primære stoff, også et kort med koden i gjelder', () => {
    const svar = [
      kort('bupropion', null, { nedre: null, ovre: null, enhet: 'nmol/L' }),
      kort('diazepam', null, { ...omrade(100, 200), forbehold: 'Syntetisk.' }),
      kort('diazepam', 'nordiazepam', omrade(300, 400)),
      kort('tramadol', null, omrade(10, 20)),
      kort('tramadol', 'OTRAM', { nedre: null, ovre: 5, enhet: ' nmol/L ' }),
      kort('testmiddel', null, omrade(7, 8)),
    ]
    expect([...referanseomraderFraFagsidene(svar, eldre)]).toEqual([
      ['TRAM', omrade(10, 20)],
      ['OTRAM', omrade(null, 5)],
      ['DIAZ', omrade(100, 200)],
      ['DMI', omrade(300, 400)],
    ])
  })

  it('tar det første kortet med en grense, og gir ingenting uten kort', () => {
    const svar = [kort('tramadol', null, { enhet: 'nmol/L' }), kort('tramadol', null, omrade(1, 2))]
    expect([...referanseomraderFraFagsidene(svar, eldre)]).toEqual([['TRAM', omrade(1, 2)]])
    expect(referanseomraderFraFagsidene([], eldre).size).toBe(0)
  })

  it('leser fagsidene bare når katalogen er uten områdene', async () => {
    const lesFagsidekort = vi.fn(async () => [kort('tramadol', null, omrade(10, 20))])
    const ny = byggKatalog({
      ...OUS_KATALOGDATA,
      oppforinger: OUS_KATALOGDATA.oppforinger.map((o) => ({
        ...o,
        koder: o.koder.map((k) => ({ ...k, referanseomrade: k.kode === 'TRAM' ? omrade(11, 22) : null })),
      })),
    })
    expect([...(await lesReferanseomrader(ny, lesFagsidekort))]).toEqual([['TRAM', omrade(11, 22)]])
    expect(lesFagsidekort).not.toHaveBeenCalled()

    const fraFor = byggKatalog({ ...OUS_KATALOGDATA, eldre })
    expect([...(await lesReferanseomrader(fraFor, lesFagsidekort))]).toEqual([['TRAM', omrade(10, 20)]])
    expect(lesFagsidekort).toHaveBeenCalledOnce()
  })

  it('feiler når fagsidene ikke kan leses, i stedet for å gi et steg 2 uten grensene', async () => {
    const fraFor = byggKatalog({ ...OUS_KATALOGDATA, eldre })
    await expect(lesReferanseomrader(fraFor, () => Promise.reject(new Error('nede')))).rejects.toThrow('nede')
  })
})
