// @vitest-environment jsdom
/**
 * Hva appen viser av redigering i faginnholdet (P2a): fagsidene for
 * systemarkitektene, fortolkningen for dem med endringsrett i fagmiljøet den
 * hører til, etter svarene fra databasen og uten den gamle adminrollen.
 */
import { describe, expect, it } from 'vitest'
import { INGEN_RETTIGHETER, lesRettigheter } from '../auth/rettigheter'
import { redigeringsrett } from '../faginnhold/redigeringsrett'

const KF = { id: 'a', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi' }
const RT = { id: 'b', nokkel: 'ous-rettstoksikologi', navn: 'OUS Rettstoksikologi' }

describe('redigeringsretten', () => {
  it('følger rettighetene i databasen', () => {
    // En systemarkitekt og en lokal administrator, med eller uten den gamle adminrollen.
    expect(redigeringsrett(lesRettigheter({ systemarkitekt: true }), true)).toEqual({ felles: true, lokalt: true, kjent: true })
    expect(redigeringsrett(lesRettigheter({ administrerer: [KF] }), true)).toEqual({ felles: false, lokalt: true, kjent: true })
    expect(redigeringsrett(lesRettigheter({}), false)).toEqual({ felles: false, lokalt: false, kjent: true })
  })

  it('gir ingen redigering av fortolkningen for å administrere et annet fagmiljø', () => {
    // Databasen svarer nei: fortolkningen hører til KF, ikke RT.
    expect(redigeringsrett(lesRettigheter({ administrerer: [RT] }), false)).toEqual({ felles: false, lokalt: false, kjent: true })
  })

  it('viser ingen redigering før svarene er kommet, og sier at de ikke er kjent', () => {
    expect(redigeringsrett(INGEN_RETTIGHETER, null)).toEqual({ felles: false, lokalt: false, kjent: false })
    expect(redigeringsrett(lesRettigheter({ systemarkitekt: true }), null)).toEqual({ felles: true, lokalt: false, kjent: false })
  })
})
