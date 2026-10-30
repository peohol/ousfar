/**
 * Dekningen i verktøyene: hva OUSFAR har for hvert virkestoff som kan velges,
 * og hvorfor. Først for «Trappe ned antidepressiv» (P7.1 i
 * `docs/verktøy-utviklingsplan.md`): hvert antidepressivum i kildetabellen
 * har én oppføring med Stop-oppføringen fra P3 og status, slik at verktøyet
 * aldri ser ut til å dekke mer enn det gjør.
 *
 * Statusen skiller kildens Stop-anbefaling fra OUSFARs egen regel: en
 * Stop-oppføring alene gir aldri en regel. Testene holder oppføringene i takt
 * med regelsettet, P3-kildeoppføringene og FEST-uttrekket.
 */
import { KARTLEGGING, type Verktoy } from './register'

export type Dekningsstatus = 'regel_til_kontroll' | 'bare_fagtekst' | 'mangler_anbefaling' | 'begrenset'

/** Forhold ved kilden eller de norske preparatene som begrenser eller forklarer statusen. */
export type Dekningsforhold = 'ingen_preparater' | 'bare_godkjenningsfritak' | 'mangler_preparatomtale' | 'stop_utilgjengelig' | 'stop_alternativ_adresse'

export interface Dekning {
  nokkel: string
  /** Raden i kildetabellen; Stop-oppføringen fra P3 er `<tabell>:<kode>>Stop`. */
  kode: string
  status: Dekningsstatus
  forhold: readonly Dekningsforhold[]
  /** Det som ellers må sies om stoffet. */
  merknad?: string
}

export const DEKNINGSSTATUS: Record<Dekningsstatus, string> = {
  regel_til_kontroll: 'beregnbar regel under faglig kontroll',
  bare_fagtekst: 'bare fagtekst',
  mangler_anbefaling: 'mangler anbefaling',
  begrenset: 'annen begrunnet begrensning',
}

const FORHOLD: Record<Dekningsforhold, (navn: string) => string> = {
  ingen_preparater: (n) => `${n} har ingen preparater i FEST`,
  bare_godkjenningsfritak: (n) => `${n} finnes i Norge bare med godkjenningsfritak og har ingen norsk preparatomtale`,
  mangler_preparatomtale: (n) => `FEST lenker ikke til noen preparatomtale for ${n.toLowerCase()}`,
  stop_utilgjengelig: () => 'kildens Stop-oppføring er ikke tilgjengelig',
  stop_alternativ_adresse: () => 'kildens Stop-oppføring er hentet fra kildens egen side fordi lenken i tabellen ikke svarer',
}

const regel = (nokkel: string, kode: string, ...forhold: Dekningsforhold[]): Dekning => ({ nokkel, kode, status: 'regel_til_kontroll', forhold })
const begrenset = (nokkel: string, kode: string, ...forhold: Dekningsforhold[]): Dekning => ({ nokkel, kode, status: 'begrenset', forhold })

/** Alle antidepressiva i «Trappe ned antidepressiv», alfabetisk etter nøkkel. Johannesurt er utelatt (P0). */
export const NEDTRAPPINGSDEKNING: readonly Dekning[] = [
  {
    nokkel: 'agomelatin',
    kode: 'Ag',
    status: 'bare_fagtekst',
    forhold: ['bare_godkjenningsfritak'],
    merknad: 'Den sentrale preparatomtalen (EMA) sier at agomelatin kan seponeres uten nedtrapping, så OUSFAR beregner ingen plan.',
  },
  regel('amitriptylin', 'At'),
  {
    nokkel: 'bupropion',
    kode: 'Bu',
    status: 'bare_fagtekst',
    forhold: [],
    merknad: 'Med norske depottabletter, som ikke kan deles, kan ingen døgndose under 150 mg gis, så den prosentvise regelen er ikke beregnbar (fagkontrollen 30.10.2026). Avslutningen vurderes individuelt fra en dose som kan gis.',
  },
  regel('citalopram', 'Ci'),
  begrenset('doksepin', 'Dx', 'mangler_preparatomtale', 'stop_alternativ_adresse'),
  begrenset('dosulepin', 'Ds', 'ingen_preparater'),
  {
    nokkel: 'duloksetin',
    kode: 'Du',
    status: 'bare_fagtekst',
    forhold: [],
    merknad: 'Med norske enterokapsler på 30 og 60 mg, som ikke kan deles eller åpnes, kan de fleste trinnene ikke gis nøyaktig, så en beregnet plan er ikke godkjent (substanskontrollen 30.10.2026). Nedtrappingen planlegges individuelt til en dokumentert metode for mindre doser foreligger.',
  },
  regel('escitalopram', 'Es'),
  {
    nokkel: 'fenelzin',
    kode: 'Fe',
    status: 'mangler_anbefaling',
    forhold: ['bare_godkjenningsfritak', 'stop_utilgjengelig'],
  },
  regel('fluoksetin', 'Fo'),
  regel('fluvoksamin', 'Fv'),
  begrenset('imipramin', 'Im', 'bare_godkjenningsfritak'),
  regel('klomipramin', 'Cl'),
  begrenset('maprotilin', 'Ma', 'ingen_preparater'),
  regel('mirtazapin', 'Mz'),
  regel('moklobemid', 'Mo'),
  regel('nortriptylin', 'No'),
  regel('paroksetin', 'Pa'),
  regel('sertralin', 'Se'),
  begrenset('tranylcypromin', 'Tc', 'bare_godkjenningsfritak'),
  begrenset('trazodon', 'Td', 'bare_godkjenningsfritak'),
  {
    nokkel: 'venlafaksin',
    kode: 'Ve',
    status: 'bare_fagtekst',
    forhold: [],
    merknad: 'Med norske depotkapsler og depottabletter på 37,5, 75 og 150 mg, som ikke kan deles, kan de fleste trinnene ikke gis nøyaktig, så en beregnet plan er ikke godkjent (substanskontrollen 30.10.2026). Nedtrappingen planlegges individuelt til en dokumentert metode for mindre doser foreligger.',
  },
  regel('vortioksetin', 'Vo', 'stop_alternativ_adresse'),
]

/** Dekningen for verktøyene som har en. */
const DEKNING: Readonly<Record<string, readonly Dekning[]>> = { 'trappe-ned-antidepressiv': NEDTRAPPINGSDEKNING }

export const dekningFor = (verktoy: Pick<Verktoy, 'id'>, nokkel: string): Dekning | undefined => DEKNING[verktoy.id]?.find((d) => d.nokkel === nokkel)

const navnFor = (nokkel: string) => KARTLEGGING.virkestoffer.find((v) => v.nokkel === nokkel)?.navn ?? nokkel

/** Forholdene og merknaden i klartekst, f.eks. til verktøyet når det ikke finnes noen regel. */
export function dekningstekst(d: Dekning): string {
  const navn = navnFor(d.nokkel)
  const deler = d.forhold.map((f) => FORHOLD[f](navn))
  const forhold = deler.length > 0 ? `${deler.join(', og ')}.` : ''
  const setning = forhold && forhold[0]!.toUpperCase() + forhold.slice(1)
  const slutt = d.status === 'mangler_anbefaling' || d.status === 'begrenset' ? `OUSFAR har derfor ingen regel for ${navn.toLowerCase()}.` : ''
  return [setning, d.merknad ?? '', slutt].filter(Boolean).join(' ')
}
