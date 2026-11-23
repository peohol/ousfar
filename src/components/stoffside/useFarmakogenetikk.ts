import { useMemo } from 'react'
import { useKilde, type Kildetilstand } from './useKilde'
import type { Farmakogenetikkutvalg } from '../../clinpgx/lesing'
import { byggFarmakogenetikkvisning, type Farmakogenetikkvisning } from '../../clinpgx/stoffside'
import { delIder, slaSammenIder, type Cypinfoutvalg } from '../../cypinfo/lesing'
import { byggCypinfovisning, cypinfoForesporsel, type Cypinfovisning } from '../../cypinfo/stoffside'
import { useFaginnholdskilde } from './Faginnholdskilde'
import type { Bivirkningsdata } from '../../bivirkninger/modell'
import { byggBivirkningsvisning, type Bivirkningsvisning } from '../../bivirkninger/stoffside'
import type { Kjemiutvalg } from '../../kjemi/lesing'
import { FORBINDELSER } from '../../kjemi/forbindelser'
import { byggKjemivisning, kjemicider, molvekter, type Kjemivisning } from '../../kjemi/stoffside'
import type { Labutvalg } from '../../farmakologiportalen/lesing'
import { byggLabvisning, labkomponenter, type Labvisning } from '../../farmakologiportalen/stoffside'

export type { Kildetilstand } from './useKilde'

export type Farmakogenetikktilstand = Kildetilstand<Farmakogenetikkutvalg, Farmakogenetikkvisning>
export type Cypinfotilstand = Kildetilstand<Cypinfoutvalg, Cypinfovisning>
export type Bivirkningstilstand = Kildetilstand<Bivirkningsdata, Bivirkningsvisning>

/** En visning med om kilden bak den ennå hentes (`laster`), som teller med når referansene nummereres. */
export type Medstatus<V> = V & { status: Kildetilstand<unknown, unknown>['status'] }

/** ClinPGx-dataene for kjemikaliene siden er koblet til, ordnet slik seksjonen «Farmakogenetikk» viser dem. */
export function useFarmakogenetikk(koblet: readonly string[]) {
  return useKilde(useFaginnholdskilde().farmakogenetikk, koblet, byggFarmakogenetikkvisning)
}

/**
 * CYPinfo for legemidlene siden er koblet til: dem med en av FEST-ID-ene i
 * sidens FEST-kobling, og dem koblingslisten har for siden. `vis` er usann for
 * den som ikke skal se CYPinfo ennå; da leses ingenting.
 */
export function useCypinfo(festIder: readonly string[], side: string, vis: boolean) {
  const leser = useFaginnholdskilde().cypinfo
  const delt = useMemo(
    () =>
      leser && {
        les: (ider: readonly string[]) => {
          const { fest_ider, cypinfo_ider } = delIder(ider)
          return leser.les(fest_ider, cypinfo_ider)
        },
      },
    [leser],
  )
  const ider = useMemo(() => (vis ? slaSammenIder(cypinfoForesporsel(festIder, side)) : []), [festIder, side, vis])
  return useKilde(delt, ider, byggCypinfovisning)
}

const somDet = <T,>(utvalg: T) => utvalg

/**
 * De kjemiske grunndataene fra PubChem for forbindelsene stoffet har, ordnet
 * slik seksjonen «Kjemiske grunndata» viser dem. Forbindelsene står også når
 * dataene ikke er hentet ennå, eller appen er satt opp uten kilden.
 */
export function useKjemi(stoff: string): Medstatus<Kjemivisning> {
  const cider = useMemo(() => kjemicider(stoff), [stoff])
  const { tilstand } = useKilde(useFaginnholdskilde().kjemi, cider, somDet<Kjemiutvalg>)
  const utvalg = tilstand.status === 'klar' ? tilstand.utvalg : null
  const { status } = tilstand
  return useMemo(() => ({ ...byggKjemivisning(stoff, utvalg), status }), [stoff, utvalg, status])
}

/**
 * Molekylvektene omregningen av konsentrasjonene i teksten trenger, etter
 * forbindelsens nøkkel: forbindelsene stoffet har (`kjemi`, alt hentet), og
 * de andre teksten nevner (`nevnte`), som hentes for seg.
 */
export function useMolvekter(kjemi: Kjemivisning, nevnte: readonly string[]): ReadonlyMap<string, string> {
  const egne = useMemo(() => molvekter(kjemi.rader), [kjemi])
  const andre = useMemo(
    () => [...new Set(nevnte)].flatMap((n) => (egne.has(n) ? [] : (FORBINDELSER.finn(n) ?? []))).filter((f) => f.pubchem),
    [nevnte, egne],
  )
  const cider = useMemo(() => andre.map((f) => String(f.pubchem!.cid)), [andre])
  const { tilstand } = useKilde(useFaginnholdskilde().kjemi, cider, somDet<Kjemiutvalg>)
  return useMemo(() => {
    if (tilstand.status !== 'klar') return egne
    const hentet = new Map(tilstand.utvalg.forbindelser.map((p) => [p.cid, p.data]))
    return new Map([...egne, ...molvekter(andre.map((f) => ({ forbindelse: f, data: hentet.get(f.pubchem!.cid) ?? null })))])
  }, [egne, andre, tilstand])
}

/**
 * Analysene ved norske laboratorier fra Farmakologiportalen for
 * forbindelsene stoffet har, ordnet slik seksjonen «Analyse ved norske
 * laboratorier» viser dem. Molekylvektene omregningen bruker, er PubChems
 * (`kjemi`).
 */
export function useLaboratorieanalyser(stoff: string, kjemi: Kjemivisning): Medstatus<Labvisning> {
  const komponenter = useMemo(() => labkomponenter(stoff), [stoff])
  const { tilstand } = useKilde(useFaginnholdskilde().laboratorier, komponenter, somDet<Labutvalg>)
  const utvalg = tilstand.status === 'klar' ? tilstand.utvalg : null
  const { status } = tilstand
  return useMemo(() => ({ ...byggLabvisning(stoff, utvalg, kjemi), status }), [stoff, utvalg, kjemi, status])
}

/**
 * Bivirkningene på fagsiden med nøkkelen, gruppert for begge visningene i
 * seksjonen «Bivirkninger». `ingen` når appen er satt opp uten dem.
 */
export function useBivirkninger(stoff: string) {
  const leser = useFaginnholdskilde().bivirkninger
  // Kilden tar én nøkkel; `useKilde` tar en liste.
  const enKilde = useMemo(() => leser && { les: (nokler: readonly string[]) => leser.les(nokler[0]!) }, [leser])
  const nokler = useMemo(() => [stoff], [stoff])
  return useKilde(enKilde, nokler, byggBivirkningsvisning)
}
