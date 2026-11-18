import type { Analyttkatalog } from './analyttkatalog'
import { STOFFREGISTER, stoffslug, type Stoffregister } from './stoffregister'

/**
 * Adressene i appen.
 *
 * Appen åpner på forsiden, `#/`. Fortolkningen har sin egen adresse,
 * `#/fortolkning`, med søket. Når en analytt er
 * valgt, er fortolkningen av den en side med sin egen adresse, etter
 * analyttens nøkkel ({@link fortolkningsnokkel}), så den kan ha sine egne
 * diskusjoner og et varsel kan lede dit:
 *
 *   #/fortolkning/hbup
 *
 * Administratorene redigerer reglene og kommentarene fortolkningen gir, på en
 * egen adresse under den:
 *
 *   #/fortolkning/hbup/rediger
 *
 * Har modulen flere deler av reglene, kan adressen peke på én av dem, og
 * eventuelt et detaljkort i den, som på en fagside:
 *
 *   #/fortolkning/diaz-dmi-oxa/rediger/fortolkning-dmi/simulator
 *
 * Resten av tilstanden i fortolkningen — søket, valget i steg 2 — lever i
 * appen, ikke i adressefeltet. Fagsidene har hver sin adresse, slik at de kan
 * bokmerkes, deles og åpnes direkte.
 *
 * En fagside er alltid en stoffside, og adressen er stoffets stabile nøkkel i
 * stoffregisteret (`src/domain/stoffregister.ts`) — aldri en analyttkode:
 *
 *   #/stoff/bupropion
 *
 * Adressen står etter `#`. Da er det nettleseren alene som leser den: siden
 * som lastes, er den samme uansett adresse, innloggingsveggen på kanten ser
 * den aldri, og ingenting på serveren må vite at sidene finnes. En side åpnet
 * fra et bokmerke før innlogging, står der fortsatt etterpå.
 *
 * Etter nøkkelen kan adressen peke på et sted på siden: en seksjon, og
 * eventuelt et detaljkort i den. Siden åpner da stedet og ruller dit:
 *
 *   #/stoff/bupropion/farmakokinetikk
 *   #/stoff/bupropion/farmakokinetikk/<kort-ID>
 *
 * Seksjonene og kortene har faste nøkler (se `src/components/seksjoner/`).
 *
 * Eldre adresser leses fortsatt, men bare for å sende videre til den
 * kanoniske ({@link kanoniskAdresse}):
 *
 * - `#/stoff/Valproat`, etter navnet eller et alias, går til stoffets nøkkel.
 * - `#/analytt/HBUP`, også med et sted etter koden, går til fortolkningen av
 *   koden: `#/fortolkning/hbup`. Fortolkningen og fagsidene er adskilte
 *   domener (`docs/domener.md`), så en analyttkode fører aldri til en fagside.
 *   En kode katalogen ikke kjenner, åpner fortolkningen.
 *
 * Søket i fagstoffet har sin egen side, med søket i adressen, så et søk kan
 * bokmerkes og deles:
 *
 *   #/sok?q=kvetiapin
 *
 * Stoffregisteret har en helside, der det også redigeres:
 *
 *   #/stoffregister
 *
 * Verktøyene har en oversikt og hver sin side, etter den stabile ID-en i
 * verktøyregisteret (`src/verktoy/register.ts`). Det som er fylt inn i et
 * verktøy, står ikke i adressen:
 *
 *   #/verktoy
 *   #/verktoy/trappe-ned-antidepressiv
 *
 * En tidligere versjon av en fagside har sin egen adresse, etter nummeret i
 * sideversjonene, og en kurateringsgren etter ID-en, så de kan deles og
 * åpnes fra en lenke:
 *
 *   #/versjon/bupropion/3
 *   #/kuratering/<gren-ID>
 *
 * Gruppene har en oversikt, og hver gruppe sin side etter ID-en, med
 * medlemmene og diskusjonene i gruppen, fanene med idéene og oppgavene i
 * gruppen, hver med én idé eller oppgave etter ID-en, og chatten:
 *
 *   #/grupper
 *   #/grupper/<gruppe-ID>
 *   #/grupper/<gruppe-ID>/ideer
 *   #/grupper/<gruppe-ID>/ideer/<idé-ID>
 *   #/grupper/<gruppe-ID>/oppgaver
 *   #/grupper/<gruppe-ID>/oppgaver/<oppgave-ID>
 *   #/grupper/<gruppe-ID>/chat
 *
 * Endringsforslagene (P5, docs/redaktorer-og-forslag.md) har «Mine forslag»,
 * fanen med forslagene til behandling, og hvert forslag sin side etter ID-en:
 *
 *   #/forslag
 *   #/forslag/til-behandling
 *   #/forslag/<forslags-ID>
 *
 * En adresse appen ikke kjenner, er siden «Siden finnes ikke», med adressen
 * slik den sto. Den tolkes aldri som fortolkningen eller forsiden, så en feil
 * i en lenke ikke sender brukeren et sted hen ikke ba om.
 */

export type Rute =
  | { side: 'forside' }
  | {
      /** En adresse appen ikke kjenner. */
      side: 'ukjent'
      /** Adressen slik den sto, så adressefeltet ikke skrives om. */
      adresse: string
    }
  | {
      side: 'fortolkning'
      /** Nøkkelen til analytten som fortolkes ({@link fortolkningsnokkel}). Utelatt uten analytt. */
      analytt?: string
      /** Reglene og kommentarene for analytten redigeres. Bare med en analytt. */
      rediger?: true
      /** Seksjonen og eventuelt detaljkortet på redigeringssiden adressen peker på. Bare med `rediger`. */
      sted?: readonly string[]
    }
  | {
      side: 'stoff'
      /** Stoffets nøkkel i stoffregisteret, f.eks. «bupropion». */
      stoff: string
      /** Seksjonen og eventuelt detaljkortet adressen peker på. Utelatt når den peker på siden. */
      sted?: readonly string[]
    }
  | {
      side: 'sok'
      /** Søket, slik det ble skrevet. Tomt gir en side som ber om et søk. */
      q: string
    }
  | { side: 'stoffregister' }
  | {
      side: 'verktoy'
      /** Verktøyets ID i verktøyregisteret. Utelatt på oversikten. */
      verktoy?: string
    }
  | {
      side: 'versjon'
      /** Stoffets nøkkel. */
      stoff: string
      /** Nummeret på versjonen av fagsiden. */
      nr: number
    }
  | {
      side: 'kuratering'
      /** ID-en til kurateringsgrenen. */
      gren: string
    }
  | {
      side: 'grupper'
      /** ID-en til gruppen. Utelatt på oversikten. */
      gruppe?: string
      /** Fanen i gruppen: idéene eller oppgavene. Utelatt for oversikten over gruppen. */
      fane?: Gruppefane
      /** ID-en til én idé eller oppgave i fanen. */
      element?: string
    }
  | {
      side: 'forslag'
      /** ID-en til ett forslag. Utelatt på oversikten. */
      forslag?: string
      /** Fanen på oversikten: «Til behandling». Utelatt for «Mine forslag». */
      fane?: Forslagsfane
    }

/** Fanene på forslagsoversikten utenom «Mine forslag». */
export type Forslagsfane = 'behandling'

/** Forsiden, der appen åpner. */
export const FORSIDE: Rute = { side: 'forside' }

/** Fortolkningssøket, uten noen analytt valgt. */
export const FORTOLKNING: Rute = { side: 'fortolkning' }

/** Adressen til forsiden. */
export const FORSIDEADRESSE = '#/'

/** Adressen til fortolkningssøket. */
export const FORTOLKNINGSADRESSE = '#/fortolkning'

/** Forsiden: ingen adresse, eller en som ikke er en side i appen (et anker, `#innhold`). */
const FORSIDEN = /^(?:#(?!\/.)(?:\/)?.*)?$/

const FORTOLKNINGSSOK = /^#\/fortolkning\/?$/i

const FORTOLKNINGSSIDE = /^#\/fortolkning\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(rediger)((?:\/[^/?#]+)*))?\/?$/i

/** Leddet etter nøkkelen i adressen til redigeringen av en fortolkning. */
const REDIGER = 'rediger'

/**
 * Nøkkelen til fortolkningssiden for en analyttkode, slik den står i adressen
 * og i diskusjonene: små bokstaver, og ledd som «DIAZ · DMI · OXA» bundet med
 * bindestrek («diaz-dmi-oxa»).
 */
export function fortolkningsnokkel(kode: string): string {
  return kode
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-')
}

/** Ruten til fortolkningen, med analytten som fortolkes når det er en. */
export function fortolkningsrute(kode?: string | null): Rute {
  const analytt = kode ? fortolkningsnokkel(kode) : ''
  return analytt ? { side: 'fortolkning', analytt } : FORTOLKNING
}

/** Ruten til redigeringen av reglene og kommentarene for analytten med koden. */
export function redigeringsrute(kode: string): Rute {
  return { side: 'fortolkning', analytt: fortolkningsnokkel(kode), rediger: true }
}

/** Sant når ruten er redigeringen av en fortolkning. */
export function erRedigering(rute: Rute): boolean {
  return rute.side === 'fortolkning' && rute.rediger === true
}

const STOFF = /^#\/stoff\/([^/?#]+)((?:\/[^/?#]+)*)\/?$/i

/** Adressene fra før fagsidene fikk stoffets nøkkel. Leses bare for å sende videre til fortolkningen. */
const GAMMEL_ANALYTT = /^#\/analytt\/([^/?#]+)((?:\/[^/?#]+)*)\/?$/i

const SOK = /^#\/sok\/?(?:\?(.*))?$/i

const STOFFREGISTERSIDE = /^#\/stoffregister\/?$/i

const VERKTOYSIDE = /^#\/verktoy(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?\/?$/i

const VERSJON = /^#\/versjon\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([1-9][0-9]{0,8})\/?$/i

/** En ID slik databasen lager dem. */
const ID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

/** Sant når verdien er en ID slik databasen lager dem. */
export const erId = (verdi: string): boolean => new RegExp(`^${ID}$`, 'i').test(verdi)

const KURATERING = new RegExp(`^#\\/kuratering\\/(${ID})\\/?$`, 'i')

/** Fanene i en gruppe, slik de står i adressen. */
export const GRUPPEFANER = ['ideer', 'oppgaver', 'chat'] as const
export type Gruppefane = (typeof GRUPPEFANER)[number]

const GRUPPER = new RegExp(`^#\\/grupper(?:\\/(${ID})(?:\\/(${GRUPPEFANER.join('|')})(?:\\/(${ID}))?)?)?\\/?$`, 'i')

/** Leddet i adressen til fanen «Til behandling». */
const TIL_BEHANDLING = 'til-behandling'

const FORSLAG = new RegExp(`^#\\/forslag(?:\\/(${ID}|${TIL_BEHANDLING}))?\\/?$`, 'i')

/** Adressen til helsiden for stoffregisteret. */
export const STOFFREGISTERADRESSE = '#/stoffregister'

/** Adressen til verktøyoversikten, eller til ett verktøy etter ID-en. */
export function verktoyadresse(id?: string): string {
  return id ? `#/verktoy/${encodeURIComponent(id)}` : '#/verktoy'
}

/** Flest ledd i stedet: seksjonen og detaljkortet. */
const MAKS_STEDSLEDD = 2

/**
 * Ruten adressen peker på. Et navn eller et alias gir ruten til stoffet det
 * fører til, og en gammel analyttadresse ruten til fortolkningen av koden;
 * {@link kanoniskAdresse} sier om adressefeltet bør skrives om. En adresse
 * appen ikke kjenner, gir siden «Siden finnes ikke» ({@link ukjent}).
 */
export function lesRute(hash: string, register: Stoffregister = STOFFREGISTER, katalog?: Analyttkatalog): Rute {
  if (FORSIDEN.test(hash)) return FORSIDE
  if (FORTOLKNINGSSOK.test(hash)) return FORTOLKNING
  const sok = SOK.exec(hash)
  if (sok) return { side: 'sok', q: new URLSearchParams(sok[1] ?? '').get('q') ?? '' }
  if (STOFFREGISTERSIDE.test(hash)) return { side: 'stoffregister' }
  const verktoy = VERKTOYSIDE.exec(hash)
  if (verktoy) return verktoy[1] ? { side: 'verktoy', verktoy: verktoy[1].toLowerCase() } : { side: 'verktoy' }
  const versjon = VERSJON.exec(hash)
  if (versjon?.[1] && versjon[2]) return { side: 'versjon', stoff: versjon[1].toLowerCase(), nr: Number(versjon[2]) }
  const gren = KURATERING.exec(hash)
  if (gren?.[1]) return { side: 'kuratering', gren: gren[1].toLowerCase() }
  const gruppe = GRUPPER.exec(hash)
  if (gruppe) {
    const [, id, fane, element] = gruppe
    if (!id) return { side: 'grupper' }
    return {
      side: 'grupper',
      gruppe: id.toLowerCase(),
      ...(fane ? { fane: fane.toLowerCase() as Gruppefane } : {}),
      ...(fane && element ? { element: element.toLowerCase() } : {}),
    }
  }
  const forslag = FORSLAG.exec(hash)
  if (forslag) {
    const ledd = forslag[1]?.toLowerCase()
    if (!ledd) return { side: 'forslag' }
    return ledd === TIL_BEHANDLING ? { side: 'forslag', fane: 'behandling' } : { side: 'forslag', forslag: ledd }
  }
  const fortolkning = FORTOLKNINGSSIDE.exec(hash)
  if (fortolkning?.[1]) {
    const analytt = fortolkning[1].toLowerCase()
    if (!fortolkning[2]) return { side: 'fortolkning', analytt }
    const sted = lesSted(fortolkning[3] ?? '')
    return sted ? { side: 'fortolkning', analytt, rediger: true, sted } : { side: 'fortolkning', analytt, rediger: true }
  }
  const stoff = lesSide(STOFF, hash)
  if (stoff) {
    // Et kjent navn eller alias fører til stoffets nøkkel; en nøkkel
    // registeret ikke har (en ny side i databasen), står som den er.
    const slug = register.kanonisk(stoff.nokkel)?.slug ?? stoffslug(stoff.nokkel)
    return slug ? stoffrute(slug, stoff.sted) : ukjent(hash)
  }
  const analytt = lesSide(GAMMEL_ANALYTT, hash)
  if (analytt) return fortolkningsrute(katalog?.finn(analytt.nokkel)?.fortolkning.kode)
  return ukjent(hash)
}

/** Siden for en adresse appen ikke kjenner. */
export function ukjent(hash: string): Rute {
  return { side: 'ukjent', adresse: hash }
}

function stoffrute(stoff: string, sted?: readonly string[]): Rute {
  return sted && sted.length > 0 ? { side: 'stoff', stoff, sted } : { side: 'stoff', stoff }
}

/**
 * Den kanoniske adressen når `hash` er en adresse til en fagside skrevet på en
 * annen måte — et navn eller et alias — eller en gammel analyttadresse, ellers
 * `null`. Appen skriver adressefeltet om til den uten å legge noe nytt i
 * historikken, så den gamle adressen ikke blir stående. En gammel
 * analyttadresse går til fortolkningen av koden, eller til fortolkningen når
 * koden er ukjent.
 */
export function kanoniskAdresse(hash: string, register: Stoffregister = STOFFREGISTER, katalog?: Analyttkatalog): string | null {
  if (GAMMEL_ANALYTT.test(hash)) return adresse(lesRute(hash, register, katalog))
  if (!STOFF.test(hash)) return null
  const rute = lesRute(hash, register, katalog)
  if (rute.side !== 'stoff') return null
  const kanonisk = adresse(rute)
  return kanonisk === hash || kanonisk === hash.replace(/\/$/, '') ? null : kanonisk
}

/** Nøkkelen og stedet i en adresse til en fagside. */
function lesSide(monster: RegExp, hash: string): { nokkel: string; sted?: string[] } | undefined {
  const treff = monster.exec(hash)
  if (!treff?.[1]) return undefined
  let nokkel: string
  try {
    nokkel = decodeURIComponent(treff[1]).trim()
  } catch {
    return undefined
  }
  if (!nokkel) return undefined
  const sted = lesSted(treff[2] ?? '')
  return sted ? { nokkel, sted } : { nokkel }
}

/**
 * Stedsleddene etter nøkkelen. Et sted med flere ledd enn siden har nivåer,
 * eller som ikke lar seg lese, gir siden uten sted — ikke en annen side.
 */
function lesSted(hale: string): string[] | undefined {
  const ledd = hale.split('/').filter(Boolean)
  if (ledd.length === 0 || ledd.length > MAKS_STEDSLEDD) return undefined
  try {
    return ledd.map((l) => decodeURIComponent(l))
  } catch {
    return undefined
  }
}

/** Adressen til en rute, slik den står i adressefeltet. */
export function adresse(rute: Rute): string {
  switch (rute.side) {
    case 'forside':
      return FORSIDEADRESSE
    case 'ukjent':
      return rute.adresse
    case 'stoff':
      return stoffadresse(rute.stoff, rute.sted)
    case 'sok':
      return sokeside(rute.q)
    case 'stoffregister':
      return STOFFREGISTERADRESSE
    case 'verktoy':
      return verktoyadresse(rute.verktoy)
    case 'versjon':
      return versjonsadresse(rute.stoff, rute.nr)
    case 'kuratering':
      return kurateringsadresse(rute.gren)
    case 'grupper':
      return gruppeadresse(rute.gruppe, rute.fane, rute.element)
    case 'forslag':
      return forslagsadresse(rute.forslag, rute.fane)
    default:
      if (!rute.analytt) return FORTOLKNINGSADRESSE
      if (!rute.rediger) return `#/fortolkning/${rute.analytt}`
      return ['#/fortolkning', rute.analytt, REDIGER, ...(rute.sted ?? []).map(encodeURIComponent)].join('/')
  }
}

/** Adressen til en versjon av fagsiden for et stoff. */
export function versjonsadresse(slug: string, nr: number): string {
  return `#/versjon/${encodeURIComponent(slug)}/${nr}`
}

/** Adressen til en kurateringsgren. */
export function kurateringsadresse(gren: string): string {
  return `#/kuratering/${gren}`
}

/**
 * Adressen til ett forslag etter ID-en, ellers til oversikten: «Mine forslag»,
 * eller fanen «Til behandling». Med en ID vinner den over fanen.
 */
export function forslagsadresse(forslag?: string, fane?: Forslagsfane): string {
  if (forslag) return `#/forslag/${forslag}`
  return fane === 'behandling' ? `#/forslag/${TIL_BEHANDLING}` : '#/forslag'
}

/**
 * Adressen til gruppeoversikten, til én gruppe etter ID-en, til en fane i
 * gruppen, eller til én idé eller oppgave i fanen.
 */
export function gruppeadresse(gruppe?: string, fane?: Gruppefane, element?: string): string {
  if (!gruppe) return '#/grupper'
  return ['#/grupper', gruppe, fane, fane && element].filter(Boolean).join('/')
}

/** Adressen til søkesiden for et søk. */
export function sokeside(q: string): string {
  return q ? `#/sok?${new URLSearchParams({ q })}` : '#/sok'
}

/** Adressen til fagsiden for et stoff, etter nøkkelen, eventuelt til et sted på den. */
export function stoffadresse(slug: string, sted: readonly string[] = []): string {
  return ['#/stoff', ...[slug, ...sted].map(encodeURIComponent)].join('/')
}

/**
 * Siden ruten står på, uten stedet på den og uten søket: `forside`, `ukjent`, `fortolkning`,
 * `fortolkning/hbup`, `fortolkning/hbup/rediger`, `stoff/bupropion`, `sok`,
 * `stoffregister`, `verktoy`, `verktoy/<ID>`, `versjon/bupropion/3`, `kuratering/<gren-ID>`,
 * `grupper`, `grupper/<gruppe-ID>`, `forslag`, `forslag/til-behandling` og `forslag/<forslags-ID>`. Det er formen områdene i endringsloggen skrives på
 * (`src/oppdatering/sider.ts`), og det som skifter når brukeren går til en
 * annen side — ikke når en seksjon åpnes eller søket skrives om.
 */
export function sidesti(rute: Rute): string {
  switch (rute.side) {
    case 'stoff':
      return `stoff/${rute.stoff}`
    case 'versjon':
      return `versjon/${rute.stoff}/${rute.nr}`
    case 'kuratering':
      return `kuratering/${rute.gren}`
    case 'verktoy':
      return rute.verktoy ? `verktoy/${rute.verktoy}` : 'verktoy'
    case 'grupper':
      return rute.gruppe ? `grupper/${rute.gruppe}` : 'grupper'
    case 'forslag':
      return adresse(rute).slice(2)
    case 'fortolkning':
      return ['fortolkning', rute.analytt, rute.rediger ? REDIGER : undefined].filter(Boolean).join('/')
    default:
      return rute.side
  }
}

export function sammeRute(a: Rute, b: Rute): boolean {
  return adresse(a) === adresse(b)
}
