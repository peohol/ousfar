/**
 * K1 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`: nedtrapping av
 * antidepressiv helt til seponering, der det kan forsvares og gjennomføres med
 * norske preparater, og ellers et eksplisitt svar om at det ikke går.
 *
 * Nedtrappingsreglene i P7 (`nedtrapping.ts`) går aldri til null: planen
 * stopper ved siste dose som kan gis, og avslutningen vurderes individuelt
 * (fagkontrollene 29. og 30.10.2026). Det gir delplaner med doser. Kontrollen
 * av K1 03.11.2026 (PR #323) avviste både en seponeringsgrense ved laveste
 * døgndose i preparatomtalen og delplaner som klinisk produkt: der en klinisk
 * forsvarlig komplett plan mangler, skal verktøyet si «Komplett plan ikke
 * tilgjengelig», ikke vise doser. Peder trakk samtidig tilbake valget av
 * grensen.
 *
 * Reglene her får derfor en ny versjon som krever en komplett plan
 * (`Forlop.krever_komplett`), uten noen avslutning med seponering: ingen kilde
 * eller beslutning gir i dag en sluttdose, og med preparatene i FEST kan ingen
 * av dem trappes ned i små trinn helt ned til en lav dose
 * (`docs/verktøy-k1-nedtrapping-kontrollgrunnlag.md`). Verktøyet viser dermed
 * hvorfor en komplett plan ikke er tilgjengelig. Ellers er reglene uendret, og
 * ingen er klinisk godkjent.
 */
import { NICE, RCPSYCH, steg, utsagn } from './bygg'
import type { Regel } from './modell'

export const K1_DATO = '2026-11-03'

/** En regel som får en ny versjon med krav om komplett plan. */
export interface Kompletthetskrav {
  regel: string
  /** Versjonen den nye bygger på; er regelen endret siden, stopper byggingen i stedet for å bygge på noe som ikke er vurdert. */
  fra_versjon: number
  /** Hva preparatene i FEST gir av lave doser, og hva som mangler; kildene står i kontrollgrunnlaget. */
  lave_doser: string
}

/** Reglene i K1, i den rekkefølgen kontrollgrunnlaget viser dem. */
export const K1_REGLER: readonly Kompletthetskrav[] = [
  {
    regel: 'seponering-escitalopram',
    fra_versjon: 12,
    lave_doser: 'Dråpene (20 mg/ml) gir hele milligram, én dråpe per milligram; tablettene finnes som 5, 10 og 20 mg, der 10 og 20 mg kan deles i to. Mindre enn én dråpe kan ikke gis uten fortynning, som ikke er dokumentert.',
  },
  {
    regel: 'seponering-nortriptylin',
    fra_versjon: 12,
    lave_doser: 'Bare tabletter på 10, 25 og 50 mg, og FEST oppgir ikke at de kan deles. Flytende form finnes ikke i FEST.',
  },
  {
    regel: 'seponering-amitriptylin',
    fra_versjon: 12,
    lave_doser: 'Tabletter på 10, 25 og 50 mg, og FEST oppgir ikke at de kan deles. Mikstur finnes bare med godkjenningsfritak, og målet som følger med miksturen på 10 mg/5 ml, gir bare 2,5 og 5 ml (5 og 10 mg).',
  },
  {
    regel: 'seponering-sertralin',
    fra_versjon: 12,
    lave_doser: 'Tabletter på 25, 50 og 100 mg, der noen preparater på 50 og 100 mg kan deles i to. Konsentratet til mikstur (20 mg/ml) har en gradert pipette, men preparatomtalen oppgir ikke graderingen, så oppmåling av små doser er ikke dokumentert.',
  },
]

/** Hva regelen nå gjør med en plan som ikke når seponering. */
const KREVER_KOMPLETT = utsagn(
  'Verktøyet viser bare en komplett plan helt til seponering. Når planen ikke kan nå seponering med trinn som kan gis, står det «Komplett plan ikke tilgjengelig» og hvorfor, ikke en delplan med doser. Trinnene skal bli mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter.',
  NICE.andel,
  RCPSYCH.lavDose,
)

/** Ny versjon av regelen med krav om komplett plan; regelen må være nøyaktig versjonen kravet bygger på. */
export function medKravOmKomplett(r: Regel, k: Kompletthetskrav): Regel {
  if (r.id !== k.regel) throw new Error(`Kravet gjelder ${k.regel}, ikke ${r.id}.`)
  if (r.versjon !== k.fra_versjon) throw new Error(`${r.id} er versjon ${r.versjon}, men kravet bygger på versjon ${k.fra_versjon}; vurder endringen og oppdater kravet.`)
  const [forste, ...resten] = r.plan.forlop
  if (!forste || forste.faser.at(-1)?.type !== 'nedtrapping') throw new Error(`${r.id}: kravet om komplett plan gjelder en nedtrapping som siste fase.`)
  const versjon = r.versjon + 1
  const merknad = `Ny versjon i K1 (${K1_DATO}): krever komplett plan til seponering og viser ellers «Komplett plan ikke tilgjengelig» uten doser. Ingen avslutning med seponering; ellers uendret fra versjon ${r.versjon}.`
  return {
    ...r,
    versjon,
    plan: { ...r.plan, forlop: [{ ...forste, krever_komplett: true }, ...resten] },
    fortolkning: {
      ...r.fortolkning,
      tilpasninger: [...r.fortolkning.tilpasninger, KREVER_KOMPLETT],
      usikkerhet: [...r.fortolkning.usikkerhet, `Lave doser med norske preparater: ${k.lave_doser} Ingen kilde eller faglig beslutning gir i dag en sluttdose, så regelen gir ingen komplett plan.`],
    },
    godkjenning: {
      status: 'til_faglig_kontroll',
      historikk: [...r.godkjenning.historikk, steg('utkast', versjon, merknad, K1_DATO), steg('til_faglig_kontroll', versjon, 'Sendt til uavhengig faglig kontroll (K1, ny runde etter kontrollen av PR #323). Ikke klinisk godkjent.', K1_DATO)],
    },
  }
}

/** Reglene med krav om komplett plan der K1 gjelder; alle andre uendret. */
export function medKravOmKomplettPlan(regler: Regel[], krav: readonly Kompletthetskrav[] = K1_REGLER): Regel[] {
  const ukjent = krav.filter((k) => !regler.some((r) => r.id === k.regel))
  if (ukjent.length > 0) throw new Error(`Krav om komplett plan for ukjente regler: ${ukjent.map((k) => k.regel).join(', ')}`)
  return regler.map((r) => {
    const k = krav.find((x) => x.regel === r.id)
    return k ? medKravOmKomplett(r, k) : r
  })
}
