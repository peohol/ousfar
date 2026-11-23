/**
 * Referansen til CYPinfo i referansefeltet til «Farmakogenetikk», med når
 * kopien sist ble kontrollert mot CYPinfo. Automatisk, som referansene fra
 * FEST, ClinPGx og PubChem (`src/faginnhold/referanser.ts`): den lages av det
 * siden har hentet, hver gang siden vises, og bare når siden viser
 * anbefalinger fra CYPinfo. Den som ikke ser CYPinfo ennå (`CYPINFO_VISES_FOR`),
 * får ingen referanse, fordi siden ikke henter noe for dem.
 *
 * CYPinfo oppgir ingen lisens, så referansen sier ingenting om lisens.
 *
 * Alt her er rene funksjoner.
 */
import type { Automatiskekilder, Referanse } from '../faginnhold/referanser'
import { FARMAKOGENETIKKPANEL } from '../faginnhold/paneler'
import { dato } from '../legemiddeldata/referanser'
import type { Cypinfokilde } from './lesing'
import { CYPINFO_ADRESSE, type Cypinfovisning } from './stoffside'

export const CYPINFO = 'CYPinfo'

/** ID-en til referansen for CYPinfo selv. */
export const CYPINFO_KILDE = 'cypinfo:kilde'

/** Hvem som står bak CYPinfo, slik `docs/cypinfo-integrasjon.md` oppgir det. */
export const CYPINFO_UTGIVER =
  'Avdeling for farmakologi, Oslo universitetssykehus, med St. Olavs hospital og Vestre Viken HF'

/** Sporbarheten: at anbefalingene er CYPinfos, uendret, og når kopien sist ble kontrollert. */
export function cypinfoopphav(kilde: Pick<Cypinfokilde, 'kontrollert_kl' | 'endret_kl'>): string {
  const kontrollert = dato(kilde.kontrollert_kl ?? kilde.endret_kl)
  return ['Anbefalinger fra CYPinfo, gjengitt uendret', kontrollert && `sist kontrollert ${kontrollert}`].filter(Boolean).join(', ')
}

export function cypinfokilde(kilde: Pick<Cypinfokilde, 'kontrollert_kl' | 'endret_kl'>): Referanse {
  return {
    id: CYPINFO_KILDE,
    tittel: CYPINFO,
    forfattere: CYPINFO_UTGIVER,
    aar: '',
    lenke: CYPINFO_ADRESSE,
    automatisk: { kilde: CYPINFO, opphav: cypinfoopphav(kilde) },
  }
}

/** CYPinfo i referansefeltet til «Farmakogenetikk», når siden viser minst ett legemiddel derfra. */
export function cypinforeferanser(visning: Cypinfovisning | null): Automatiskekilder {
  if (!visning?.legemidler.length) return { referanser: [] }
  return { referanser: [cypinfokilde(visning.kilde)], panelreferanser: { [FARMAKOGENETIKKPANEL]: [CYPINFO_KILDE] } }
}
