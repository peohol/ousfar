/**
 * Når kontoen i fanen skifter — utlogging, eller en annen som logger inn —
 * glemmes det som er husket om den forrige: svarene om rollen og
 * forhåndsvisningene av lenker. Hver modul som husker noe for den innloggede,
 * melder seg her (`vedOktskifte`), og økten melder skiftet (`meldOktskifte`).
 */
const lyttere = new Set<() => void>()

/** Kaller `glem` ved hvert skifte. Gir en funksjon som melder den av igjen. */
export function vedOktskifte(glem: () => void): () => void {
  lyttere.add(glem)
  return () => lyttere.delete(glem)
}

export function meldOktskifte(): void {
  for (const glem of lyttere) glem()
}
