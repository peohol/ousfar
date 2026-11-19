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
 * Én emoji, slik databasen godtar den (`intern.er_gruppesymbolemoji`): et
 * emojitegn med variantvelger og hudfarge, høyst fire slike satt sammen med
 * ZWJ, eventuelt med merkelapper (regionflagg), eller et flagg av to
 * regionsindikatorer. Bare emojiblokkene, uten tall, bokstaver, punktskrift
 * og bokstavlignende tegn, så symbolet aldri bærer tekst
 * (docs/pasientopplysninger.md). En test kontrollerer at mønsteret står likt
 * i migrasjonen.
 */
export const EMOJIMONSTER =
  '^(?:[\\u00A9\\u00AE\\u203C\\u2049\\u2122\\u2139\\u2190-\\u21FF\\u2300-\\u23FF\\u24C2\\u25A0-\\u2775\\u2794-\\u27BF\\u2934\\u2935\\u2B00-\\u2BFF\\u3030\\u303D\\u3297\\u3299\\U0001F000-\\U0001F0FF\\U0001F200-\\U0001FAFF][\\uFE0E\\uFE0F\\U0001F3FB-\\U0001F3FF]{0,2}(?:\\u200D[\\u00A9\\u00AE\\u203C\\u2049\\u2122\\u2139\\u2190-\\u21FF\\u2300-\\u23FF\\u24C2\\u25A0-\\u2775\\u2794-\\u27BF\\u2934\\u2935\\u2B00-\\u2BFF\\u3030\\u303D\\u3297\\u3299\\U0001F000-\\U0001F0FF\\U0001F200-\\U0001FAFF][\\uFE0E\\uFE0F\\U0001F3FB-\\U0001F3FF]{0,2}){0,3}(?:[\\U000E0020-\\U000E007E]{1,8}\\U000E007F)?|[\\U0001F1E6-\\U0001F1FF]{2})$'

/** `EMOJIMONSTER` som JavaScript-uttrykk (`\U0001F000` blir `\u{1F000}`). */
const EMOJI = new RegExp(EMOJIMONSTER.replace(/\\U000([0-9A-F]{5})/g, '\\u{$1}'), 'u')

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
