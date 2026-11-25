/**
 * Aksene i kurvefigurene i fortolkningen (THC-syre, benzoylekgonin i urin):
 * «pene» trinn på begge aksene. Ren visning uten klinisk innhold.
 */

/** Et «pent» trinn — 1, 2 eller 5 ganger en tierpotens — nær `grovt`. */
export function pentSteg(grovt: number): number {
  if (!(grovt > 0)) return 1
  const tierpotens = 10 ** Math.floor(Math.log10(grovt))
  const faktor = grovt / tierpotens
  const pen = faktor < 1.5 ? 1 : faktor < 3 ? 2 : faktor < 7 ? 5 : 10
  return pen * tierpotens
}

/**
 * Dagintervallet på x-aksen: et pent tall som gir omtrent 10 merker. Bruker
 * samme «pene steg» som y-aksen, så intervallet skalerer uansett hvor mange
 * dager det er mellom prøvene — appen setter ingen øvre grense på det lenger,
 * og et fast tak her ville gitt et rutenett med tusenvis av streker for en
 * gammel eller feiltastet dato.
 */
export function velgXSteg(dager: number): number {
  return pentSteg(dager / 10)
}

/**
 * Som `velgXSteg`, men aldri under ett døgn: tidsrommet er hele kalenderdøgn,
 * og et brøkdelstrinn gir samme døgn flere ganger under aksen (0 0 0 1 1 1 …)
 * når prøvene ligger få døgn fra hverandre. Brukes av benzoylekgonin i urin;
 * THC-syremodulen bruker `velgXSteg` uendret, fordi figurene dens er låst av
 * fasiten.
 */
export function velgDognsteg(dager: number): number {
  return Math.max(1, velgXSteg(dager))
}

/** Høyst så mange merker på én akse. Flere betyr at aksen ikke kan tegnes. */
export const MAKS_AKSEMERKER = 200

/**
 * Merkene fra `fra` til og med `til` med `steg`, regnet fra indeksen og ikke
 * ved å legge sammen, så løkken alltid er begrenset. `null` når aksen ikke kan
 * representeres: grenser eller steg som ikke er endelige, et steg som ikke er
 * positivt, eller flere enn {@link MAKS_AKSEMERKER} merker.
 */
export function aksemerker(fra: number, til: number, steg: number): number[] | null {
  if (![fra, til, steg].every(Number.isFinite) || !(steg > 0)) return null
  const siste = Math.floor((til - fra) / steg + 1e-6)
  if (!(siste >= 0 && siste < MAKS_AKSEMERKER)) return null
  return Array.from({ length: siste + 1 }, (_, i) => fra + i * steg)
}

/**
 * Y-aksen der alle merkene — også topp og bunn — er runde tall: toppen rundes
 * opp og bunnen ned til nærmeste hele trinn. Bunnen går aldri under −100 %,
 * for mer enn alt kan ikke skilles ut.
 */
export function penYAkse(minst: number, storst: number): { yTopp: number; yBunn: number; ySteg: number } {
  const steg = pentSteg((storst - minst) / 10)
  let yTopp = Math.ceil(storst / steg - 1e-9) * steg
  const yBunn = Math.max(Math.floor(minst / steg + 1e-9) * steg, -100)
  if (yTopp - yBunn < steg) yTopp = yBunn + steg
  return { yTopp, yBunn, ySteg: steg }
}
