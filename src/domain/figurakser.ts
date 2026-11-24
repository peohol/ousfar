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
 * gammel eller feiltastet dato. Tidsrommet er hele kalenderdøgn, så trinnet
 * er minst 1: et brøkdelstrinn ga samme døgn flere ganger under aksen
 * (0 0 0 1 1 1 …) når prøvene lå få døgn fra hverandre.
 */
export function velgXSteg(dager: number): number {
  return Math.max(1, pentSteg(dager / 10))
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
