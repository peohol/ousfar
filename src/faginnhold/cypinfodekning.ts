/**
 * Dekningsoversikten for CYPinfo: hvilken status hver fagside har mot
 * CYPinfo-katalogen, og hvorfor (`docs/cypinfo-integrasjon.md`).
 *
 * Statusen regnes ut av katalogen, sidenes FEST-koblinger og listen i
 * `cypinfokoblinger.ts`, ikke skrevet inn for hver side:
 *
 * - `koblet_fest`: et legemiddel i CYPinfo har en av sidens FEST-ID-er. Slik
 *   kobles de fleste, automatisk, og en ny FEST-kobling på en side gir CYPinfo
 *   med en gang;
 * - `koblet_liste`: legemiddelet mangler FEST-ID i CYPinfo og er koblet i
 *   listen, etter en vurdering;
 * - `metabolitt`: siden er en metabolitt og kobles aldri til moderstoffets
 *   oppføring (de samme sidene som for ClinPGx, og Hydroksyrisperidon);
 * - `uavklart`: navnet eller et alias på siden er navnet på et legemiddel i
 *   CYPinfo som ikke er koblet noe sted. Det må vurderes, og testen feiler til
 *   det er gjort;
 * - `ikke_i_cypinfo`: resten.
 *
 * Modulen brukes av testene og dokumentasjonen, ikke av appen.
 */
import { UKOBLEDE_STOFFSIDER } from './clinpgxdekning'
import { CYPINFOKOBLINGER, type Cypinfokobling } from './cypinfokoblinger'

export const CYPINFO_DEKNINGSSTATUSER = {
  koblet_fest: 'Koblet til CYPinfo med FEST-ID-en',
  koblet_liste: 'Koblet til CYPinfo med en vurdert kobling, fordi CYPinfo mangler FEST-ID',
  metabolitt: 'Metabolitt eller analytisk komponent, kobles ikke til moderstoffets oppføring',
  uavklart: 'Navnet finnes i CYPinfo uten kobling, krever vurdering',
  ikke_i_cypinfo: 'CYPinfo har ikke legemiddelet',
} as const

export type Cypinfodekningsstatus = keyof typeof CYPINFO_DEKNINGSSTATUSER

/** Det dekningen trenger om et legemiddel i katalogen. */
export interface Katalogoppforing {
  id: string
  navn: string
  fest: readonly string[]
}

/** En fagside: navnet, aliasene i stoffregisteret og FEST-ID-ene i den publiserte FEST-koblingen. */
export interface Dekningsside {
  side: string
  aliaser?: readonly string[]
  fest_ider: readonly string[]
}

export interface Cypinfodekning {
  side: string
  status: Cypinfodekningsstatus
  /** Legemidlene i CYPinfo siden er koblet til, eller (`uavklart`) har samme navn som. */
  legemidler: { id: string; navn: string }[]
  grunn: string
}

/** Metabolittsider ClinPGx-oversikten ikke har, med moderstoffet. */
const EGNE_METABOLITTER: readonly { side: string; moderstoff: string; grunn: string }[] = [
  {
    side: 'Hydroksyrisperidon',
    moderstoff: 'Risperidon',
    grunn: 'Aktiv metabolitt av risperidon og samme stoff som paliperidon. CYPinfos oppføring for paliperidon står på Paliperidon.',
  },
]

/** Metabolittsidene, med grunnen. */
export function metabolittsider(): Map<string, string> {
  const fraClinpgx = UKOBLEDE_STOFFSIDER.flatMap((u) =>
    u.status === 'metabolitt' ? [[u.side, `Metabolitt${u.moderstoff.side ? ` av ${u.moderstoff.side.toLowerCase()}` : ''}.`] as const] : [],
  )
  return new Map([...fraClinpgx, ...EGNE_METABOLITTER.map((m) => [m.side, m.grunn] as const)])
}

/** Navnet slik det sammenlignes: små bokstaver, uten aksenter, parenteser og tegn. */
export function navnenokkel(navn: string): string {
  return navn
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function cypinfodekning(
  katalog: readonly Katalogoppforing[],
  sider: readonly Dekningsside[],
  koblinger: readonly Cypinfokobling[] = CYPINFOKOBLINGER,
  metabolitter: ReadonlyMap<string, string> = metabolittsider(),
): Cypinfodekning[] {
  const perFest = new Map<string, Katalogoppforing[]>()
  for (const l of katalog) for (const f of l.fest) perFest.set(f, [...(perFest.get(f) ?? []), l])
  const kobletFest = new Set(sider.flatMap((s) => s.fest_ider.flatMap((f) => (perFest.get(f) ?? []).map((l) => l.id))))
  const kobletListe = new Set(koblinger.map((k) => k.cypinfo_id))
  const ukoblede = new Map<string, Katalogoppforing[]>()
  for (const l of katalog) {
    if (kobletFest.has(l.id) || kobletListe.has(l.id)) continue
    const n = navnenokkel(l.navn)
    ukoblede.set(n, [...(ukoblede.get(n) ?? []), l])
  }
  const kort = (l: { id?: string; cypinfo_id?: string; navn: string }) => ({ id: (l.id ?? l.cypinfo_id)!, navn: l.navn })

  return [...sider]
    .sort((a, b) => a.side.localeCompare(b.side, 'nb'))
    .map((s): Cypinfodekning => {
      const fest = [...new Map(s.fest_ider.flatMap((f) => perFest.get(f) ?? []).map((l) => [l.id, l])).values()]
      if (fest.length > 0) {
        return { side: s.side, status: 'koblet_fest', legemidler: fest.map(kort), grunn: 'Legemiddelet i CYPinfo har en av sidens FEST-ID-er.' }
      }
      const liste = koblinger.filter((k) => k.side === s.side)
      if (liste.length > 0) {
        return {
          side: s.side,
          status: 'koblet_liste',
          legemidler: liste.map(kort),
          grunn: liste.map((k) => k.merknad ?? `Navnet og ${k.grunnlag.join(' og ')} stemmer.`).join(' '),
        }
      }
      const metabolitt = metabolitter.get(s.side)
      if (metabolitt) return { side: s.side, status: 'metabolitt', legemidler: [], grunn: metabolitt }
      const samme = [s.side, ...(s.aliaser ?? [])].flatMap((n) => ukoblede.get(navnenokkel(n)) ?? [])
      if (samme.length > 0) {
        return {
          side: s.side,
          status: 'uavklart',
          legemidler: samme.map(kort),
          grunn: `CYPinfo har ${samme.map((l) => l.navn).join(', ')} uten FEST-ID som stemmer og uten kobling.`,
        }
      }
      return { side: s.side, status: 'ikke_i_cypinfo', legemidler: [], grunn: 'Ingen av sidens FEST-ID-er eller navn finnes i CYPinfo.' }
    })
}

export function cypinfodekningstelling(dekning: readonly Cypinfodekning[]): Record<Cypinfodekningsstatus, number> {
  const telling = Object.fromEntries(Object.keys(CYPINFO_DEKNINGSSTATUSER).map((s) => [s, 0])) as Record<Cypinfodekningsstatus, number>
  for (const d of dekning) telling[d.status] += 1
  return telling
}
