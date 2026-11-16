/**
 * Et ønske om å åpne en fagside rett i redigeringen, fra et sted utenfor
 * siden, som «Åpne utkastet» på et endringsforslag. Fagsidene har ingen egen
 * adresse for redigeringen (den er en modus på siden, `Stoffside`), så ønsket
 * gjelder neste gang siden for stoffet åpnes av en som kan redigere, og bare
 * den gangen. Kan den som åpner siden ikke redigere, står siden i lesemodus
 * som ellers.
 */
let onsket: string | null = null

/** Siden for stoffet skal åpnes i redigeringen. */
export function onskRedigering(stoff: string): void {
  onsket = stoff
}

/** Sant én gang når siden for stoffet er ønsket åpnet i redigeringen. */
export function taRedigeringsonske(stoff: string): boolean {
  if (onsket !== stoff) return false
  onsket = null
  return true
}
