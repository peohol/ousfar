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
  regel_til_kontroll: 'beregnbar regel (status per regel)',
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
/** Et stoff der ingen dose i valgområdet for første trinn kan gis med de norske formene, så regelen er fagtekst (beslutning P7-A, 30.10.2026). */
const formtekst = (nokkel: string, kode: string, former: string): Dekning => ({
  nokkel,
  kode,
  status: 'bare_fagtekst',
  forhold: [],
  merknad: `Med de norske ${former} kan ingen dose innenfor valgområdet for første trinn gis, heller ikke blant de nærmeste dosene forskriveren kan velge, så en beregnet plan er ikke godkjent (kontrollørens beslutning 30.10.2026). Nedtrappingen planlegges individuelt til en dokumentert alternativ formulering foreligger.`,
})
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
  {
    nokkel: 'citalopram',
    kode: 'Ci',
    status: 'bare_fagtekst',
    forhold: [],
    merknad:
      'Med de norske tablettene er den eneste dosen som kan gis ved første trinn fra vanlig dose (20 mg), en halvering til 10 mg, verken ved kort eller lang behandlingstid; det er ikke et faglig akseptert standardtrinn, så en beregnet plan aktiveres foreløpig ikke (kontrollørens beslutning 31.10.2026). Nedtrappingen planlegges individuelt.',
  },
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
  formtekst('mirtazapin', 'Mz', 'tablettene og smeltetablettene'),
  formtekst('moklobemid', 'Mo', 'tablettene på 150 og 300 mg'),
  regel('nortriptylin', 'No'),
  formtekst('paroksetin', 'Pa', 'tablettene'),
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
