/**
 * Gruppesymbolet (docs/fagmiljoer.md, «Gruppesymbolet»): lesingen av svaret
 * fra databasen, at én emoji kjennes igjen, og at mønsteret for emojier er
 * det samme i appen og i databasen. Databasens regler prøves i
 * `grupper.test.ts`, «symbolet».
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EMOJIMONSTER, erEmoji, FORESLATTE_EMOJIER, lesGruppesymbol, nyGruppesymbolsti, symbolbilde } from '../grupper/symbol'

const MIGRASJONER = join(__dirname, '../../supabase/migrations')

describe('gruppesymbolet', () => {
  it('leser emojien, bildet eller ingenting', () => {
    expect(lesGruppesymbol({ emoji: '🧪' })).toEqual({ emoji: '🧪' })
    expect(lesGruppesymbol({ bilde: 'a/symbol.webp', endret: '2026-11-19T08:00:00Z' })).toEqual({
      bilde: 'a/symbol.webp',
      endret: '2026-11-19T08:00:00Z',
    })
    for (const tomt of [null, undefined, {}, 'x', { emoji: '' }, []]) expect(lesGruppesymbol(tomt)).toBeNull()
    expect(symbolbilde({ emoji: '🧪' })).toBeNull()
    expect(symbolbilde({ bilde: 'a/symbol.webp', endret: 't' })).toEqual({ sti: 'a/symbol.webp', endret: 't' })
    expect(nyGruppesymbolsti('a')).toMatch(/^a\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/)
    expect(nyGruppesymbolsti('a')).not.toBe(nyGruppesymbolsti('a'))
  })

  it('kjenner igjen én emoji, også med variantvelger, hudfarge eller som familie, men ikke tekst', () => {
    for (const ja of ['🧪', '❤️', '⚖️', '👍🏽', '👨‍👩‍👧', '🇳🇴', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', ' 💊 ', ...FORESLATTE_EMOJIER]) expect(erEmoji(ja), ja).toBe(true)
    for (const nei of ['', 'a', 'Å', '1', '1️⃣', '🧪🧪', '🧪 a', '<b>', '12345678901', '⠁⠃⠉', 'ℍ', '🅰', '🄰', '🇳🇴🇸🇪']) expect(erEmoji(nei), nei).toBe(false)
  })

  it('bruker det samme mønsteret som databasen', () => {
    const fil = readdirSync(MIGRASJONER).find((f) => f.endsWith('_gruppesymboler.sql'))!
    const sql = readFileSync(join(MIGRASJONER, fil), 'utf8')
    // Ett mønster, i én funksjon som både tabellregelen og funksjonen bruker.
    expect(sql.split(`~ '${EMOJIMONSTER}'`).length - 1).toBe(1)
    expect(sql.split('intern.er_gruppesymbolemoji(').length - 1).toBeGreaterThanOrEqual(3)
  })
})
