/**
 * Fagsidene som er en metabolitt (eller en analytisk komponent) av stoffet på
 * en annen fagside. De automatiske farmakogenetiske kildene kobles aldri til
 * moderstoffets oppføring på disse sidene: det moderstoffets oppføring sier,
 * gjelder moderstoffet. Dekningsoversikten for CYPinfo (`cypinfodekning.ts`)
 * bygger på den.
 */
export interface Metabolittside {
  side: string
  /** Fagsiden for moderstoffet. */
  moderstoff: string
  /** Grunnen, når den er mer enn «Metabolitt av <moderstoff>.». */
  merknad?: string
}

export const METABOLITTSIDER: readonly Metabolittside[] = [
  { side: 'Dehydroaripiprazol', moderstoff: 'Aripiprazol' },
  { side: 'Desmetyldoksepin', moderstoff: 'Doksepin' },
  { side: 'Desmetylkariprazin', moderstoff: 'Kariprazin' },
  { side: 'Desmetylklomipramin', moderstoff: 'Klomipramin' },
  { side: 'Desmetylmianserin', moderstoff: 'Mianserin' },
  { side: 'Didesmetylkariprazin', moderstoff: 'Kariprazin' },
  { side: 'Hydroksybupropion', moderstoff: 'Bupropion' },
  {
    side: 'Hydroksyrisperidon',
    moderstoff: 'Risperidon',
    merknad: 'Aktiv metabolitt av risperidon og samme stoff som paliperidon. CYPinfos oppføring for paliperidon står på Paliperidon.',
  },
  { side: 'Norfluoksetin', moderstoff: 'Fluoksetin' },
  { side: 'O-desmetyltramadol', moderstoff: 'Tramadol' },
]

/** Grunnen en metabolittside ikke kobles: merknaden, eller «Metabolitt av <moderstoff>.». */
export function metabolittgrunn(m: Metabolittside): string {
  return m.merknad ?? `Metabolitt av ${m.moderstoff.toLowerCase()}.`
}
