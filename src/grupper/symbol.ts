/**
 * Symbolet til en gruppe (docs/fagmiljoer.md, «Gruppesymbolet»): en emoji
 * eller et eget bilde, eller ingen (da står gruppeikonet). Gruppechattene
 * arver det. Rene funksjoner og konstanter; kallene står i `api.ts`.
 */
import { erObjekt, tekst } from '../ideer/lesing'

export type Gruppesymbol = { emoji: string } | { bilde: string; endret: string }

/** Den private bøtta bildene ligger i (migrasjonen `*_gruppesymboler.sql`). */
export const GRUPPESYMBOL_BOTTE = 'gruppesymboler'

/** Den faste stien til bildet: ett per gruppe, så et nytt erstatter det gamle. */
export const gruppesymbolsti = (gruppe: string) => `${gruppe}/symbol.webp`

/**
 * Tegnene en emoji kan bestå av: bare emojiblokkene, så symbolet aldri bærer
 * tall eller bokstaver (docs/pasientopplysninger.md). Det samme mønsteret
 * står i databasen (`grupper_symbol_emoji`, `sett_gruppesymbol`); en test
 * kontrollerer at de stemmer overens.
 */
export const EMOJITEGN =
  '\\u00A9\\u00AE\\u200D\\u203C\\u2049\\u20E3\\u2100-\\u2BFF\\u3030\\u303D\\u3297\\u3299\\uFE0E\\uFE0F\\U0001F000-\\U0001FAFF\\U000E0020-\\U000E007F'

/** `EMOJITEGN` som JavaScript-uttrykk (`\U0001F000` blir `\u{1F000}`). */
const EMOJI = new RegExp(`^[${EMOJITEGN.replace(/\\U000([0-9A-F]{5})/g, '\\u{$1}')}]{1,16}$`, 'u')

const TEGN = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('nb', { granularity: 'grapheme' }) : null

/** Én emoji: bare emojitegn, og ett tegn slik det ser ut (en familie eller et flagg er ett). */
export function erEmoji(verdi: string): boolean {
  const ren = verdi.trim()
  if (!EMOJI.test(ren)) return false
  return TEGN ? [...TEGN.segment(ren)].length === 1 : true
}

/** Forslagene i velgeren: fag, arbeid og stemning, uten personer og flagg. */
export const FORESLATTE_EMOJIER: readonly string[] = [
  '💊', '🧪', '🔬', '🧬', '🩺', '🩸', '🧠', '❤️', '🫀', '🫁',
  '📚', '📋', '📊', '📈', '🗂️', '📝', '💡', '🎯', '🧭', '🛠️',
  '⚖️', '🏥', '🌱', '🌍', '⭐', '🔥', '☕', '🎓', '🤝', '🚀',
]

/** Symbolet slik databasen gir det (`intern.gruppesymbol`), eller null. */
export function lesGruppesymbol(verdi: unknown): Gruppesymbol | null {
  if (!erObjekt(verdi)) return null
  if (tekst(verdi.bilde)) return { bilde: tekst(verdi.bilde), endret: tekst(verdi.endret) }
  if (tekst(verdi.emoji)) return { emoji: tekst(verdi.emoji) }
  return null
}

/** Bildet, når symbolet er et bilde: stien og når det sist ble endret, til de signerte lenkene. */
export function symbolbilde(symbol: Gruppesymbol | null | undefined): { sti: string; endret: string } | null {
  return symbol && 'bilde' in symbol ? { sti: symbol.bilde, endret: symbol.endret } : null
}
