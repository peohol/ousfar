// @vitest-environment jsdom
/**
 * Hva appen viser av redigering i faginnholdet (P2a): fagsidene for
 * systemarkitektene, fortolkningen for dem med endringsrett i fagmiljøet den
 * hører til, etter svarene fra databasen og uten den gamle adminrollen.
 */
import { describe, expect, it } from 'vitest'
import { INGEN_RETTIGHETER, lesRettigheter } from '../auth/rettigheter'
import { kanRedigereKodene, kanRedigereRegelsettet, redigeringsrett } from '../faginnhold/redigeringsrett'

const KF = { id: 'a', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi' }
const RT = { id: 'b', nokkel: 'ous-rettstoksikologi', navn: 'OUS Rettstoksikologi' }

describe('redigeringsretten', () => {
  it('følger rettighetene i databasen', () => {
    // En systemarkitekt og en lokal administrator, med eller uten den gamle adminrollen.
    expect(redigeringsrett(lesRettigheter({ systemarkitekt: true }), true)).toMatchObject({ felles: true, lokalt: true, koder: null, publisere: true, kjent: true })
    expect(redigeringsrett(lesRettigheter({ administrerer: [KF], arbeidsfagmiljo: KF }), true)).toMatchObject({
      felles: false,
      lokalt: true,
      koder: null,
      publisere: true,
      kjent: true,
    })
    expect(redigeringsrett(lesRettigheter({}), false)).toMatchObject({ felles: false, lokalt: false, publisere: false, kjent: true })
  })

  it('gir ingen redigering av fortolkningen for å administrere et annet fagmiljø', () => {
    // Databasen svarer nei: fortolkningen hører til KF, ikke RT.
    expect(redigeringsrett(lesRettigheter({ administrerer: [RT], arbeidsfagmiljo: KF }), false)).toMatchObject({ felles: false, lokalt: false, publisere: false, kjent: true })
  })

  it('viser ingen redigering før svarene er kommet, og sier at de ikke er kjent', () => {
    expect(redigeringsrett(INGEN_RETTIGHETER, null)).toMatchObject({ felles: false, lokalt: false, kjent: false })
    expect(redigeringsrett(lesRettigheter({ systemarkitekt: true }), null)).toMatchObject({ felles: true, lokalt: false, kjent: false })
    // En redaktør før ansvarene er hentet.
    expect(redigeringsrett(lesRettigheter({ redaktor: true }), false, null)).toMatchObject({ lokalt: false, kjent: false })
  })

  it('lar en redaktør for fortolkningen redigere alt i fagmiljøet, men ikke publisere (P5)', () => {
    const rett = redigeringsrett(lesRettigheter({ redaktor: true, arbeidsfagmiljo: KF }), true)
    expect(rett).toMatchObject({ lokalt: true, koder: null, regelsett: null, publisere: false, kjent: true })
    expect(kanRedigereKodene(rett, ['UAMFE'])).toBe(true)
    expect(kanRedigereRegelsettet(rett.regelsett, 'r2')).toBe(true)
  })

  it('lar en redaktør for ett regelsett redigere bare fortolkningen for kodene i det, og der bare regelsettet (P5)', () => {
    const rett = redigeringsrett(lesRettigheter({ redaktor: true, arbeidsfagmiljo: KF }), false, { ider: new Set(['r1']), koder: new Set(['SDIAZ']) })
    expect(rett).toMatchObject({ lokalt: true, publisere: false, kjent: true })
    expect(kanRedigereRegelsettet(rett.regelsett, 'r1')).toBe(true)
    expect(kanRedigereRegelsettet(rett.regelsett, 'r2')).toBe(false)
    expect(kanRedigereKodene(rett, ['SDIAZ', 'SNDIA'])).toBe(true)
    expect(kanRedigereKodene(rett, ['UAMFE'])).toBe(false)
    expect(kanRedigereKodene(redigeringsrett(lesRettigheter({}), false), ['SDIAZ'])).toBe(false)
  })
})
