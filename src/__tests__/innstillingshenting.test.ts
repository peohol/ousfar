/**
 * Lesingen av brukerinnstillingene (`hentInnstilling`, #504): nøklene det
 * spørres om i samme øyeblikk, hentes i ett kall, og den samme nøkkelen bare
 * én gang. Ingenting huskes etter svaret, og en feil når alle som spurte.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const kall: string[][] = []
let svar: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('../auth/klient', () => ({
  klient: () => ({
    from: (tabell: string) => {
      expect(tabell).toBe('brukerinnstillinger')
      return {
        select: (kolonner: string) => {
          expect(kolonner).toBe('nokkel, verdi')
          return {
            in: async (kolonne: string, nokler: string[]) => {
              expect(kolonne).toBe('nokkel')
              kall.push(nokler)
              return svar
            },
          }
        },
      }
    },
  }),
}))

const { hentInnstilling } = await import('../auth/innstillinger')

beforeEach(() => {
  kall.length = 0
  svar = { data: [], error: null }
})

describe('hentInnstilling', () => {
  it('henter nøklene det spørres om samtidig i ett kall, og hver nøkkel én gang', async () => {
    svar = { data: [{ nokkel: 'tema', verdi: 'mork' }, { nokkel: 'varsler.endringslogg', verdi: { fra: '1.0.0' } }], error: null }
    const [tema, logg, igjen, ingen] = await Promise.all([
      hentInnstilling('tema'),
      hentInnstilling('varsler.endringslogg'),
      hentInnstilling('varsler.endringslogg'),
      hentInnstilling('chat.apen'),
    ])
    expect(kall).toEqual([['tema', 'varsler.endringslogg', 'chat.apen']])
    expect(tema).toBe('mork')
    expect(logg).toEqual({ fra: '1.0.0' })
    expect(igjen).toEqual({ fra: '1.0.0' })
    // Ikke lagret ennå: null, ikke en feil.
    expect(ingen).toBeNull()
  })

  it('husker ingenting: et nytt spørsmål etter svaret henter på nytt', async () => {
    svar = { data: [{ nokkel: 'tema', verdi: 'lys' }], error: null }
    expect(await hentInnstilling('tema')).toBe('lys')
    svar = { data: [{ nokkel: 'tema', verdi: 'mork' }], error: null }
    expect(await hentInnstilling('tema')).toBe('mork')
    expect(kall).toEqual([['tema'], ['tema']])
  })

  it('kaster til alle som spurte når tjenesten ikke svarer, så «vet ikke» aldri blir «ingenting lagret»', async () => {
    svar = { data: null, error: { message: 'nede' } }
    const utfall = await Promise.allSettled([hentInnstilling('tema'), hentInnstilling('bevegelse')])
    expect(utfall.map((u) => u.status)).toEqual(['rejected', 'rejected'])
    expect(kall).toEqual([['tema', 'bevegelse']])
  })
})
