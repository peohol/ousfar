/** Hvem som ser OUSFAR Verktøy (`src/verktoy/synlighet.ts`). */
import { describe, expect, it } from 'vitest'
import { VERKTOYENE_VISES_FOR, verktoyeneVisesFor } from '../verktoy/synlighet'

describe('synligheten til verktøyene', () => {
  it('er inntil videre bare for administratorene', () => {
    expect(VERKTOYENE_VISES_FOR).toBe('admin')
    expect(verktoyeneVisesFor('admin')).toBe(true)
    expect(verktoyeneVisesFor('user')).toBe(false)
    expect(verktoyeneVisesFor(undefined)).toBe(false)
  })

  it('gjelder alle brukere når bryteren står på «alle»', () => {
    expect(verktoyeneVisesFor('user', 'alle')).toBe(true)
    expect(verktoyeneVisesFor('admin', 'alle')).toBe(true)
  })
})
