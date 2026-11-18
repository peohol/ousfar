import { STANDARD_FAGMILJOIKON, velgArbeidsfagmiljo, type Rettigheter } from '../../auth/rettigheter'
import { Menyskuff, Menyvalg } from '../toppmeny/Nedtrekksmeny'
import { useFagmiljobytte } from './useFagmiljobytte'

export interface ArbeidsfagmiljovalgProps {
  apen: boolean
  onVeksle: () => void
  /** Velger fagmiljøet og gir rettighetene etter byttet; som standard i databasen (`velgArbeidsfagmiljo`). */
  velg?: (fagmiljo: string) => Promise<Rettigheter>
}

/**
 * «Fagmiljø» i kontomenyen, for den som har flere å velge mellom: hvilket
 * appen fortolker med (arbeidsfagmiljøet). Medlemmer velger blant egne
 * fagmiljøer; en systemarkitekt kan velge alle, og de hen ikke er medlem av,
 * er merket «Ikke medlem», siden valget ikke gjør hen til medlem. Valget lagres
 * i databasen og gjelder bare fortolkningen; lesing og deltakelse følger
 * medlemskapene. Med ett fagmiljø vises ingenting, med mindre det ikke er det
 * hen arbeider i (`kanVelgeArbeidsfagmiljo`).
 */
export function Arbeidsfagmiljovalg({ apen, onVeksle, velg = velgArbeidsfagmiljo }: ArbeidsfagmiljovalgProps) {
  const { gjeldende, velgbare, kanVelge, erMedlem, bytter, feil, bytt } = useFagmiljobytte(velg)
  if (!kanVelge) return null

  return (
    <Menyskuff ikon={gjeldende?.ikon ?? STANDARD_FAGMILJOIKON} tekst={`Fagmiljø: ${gjeldende?.navn ?? 'ikke valgt'}`} apen={apen} onVeksle={onVeksle}>
      <ul className="nedtrekk__valg" aria-label="Fagmiljøet du arbeider i">
        {velgbare.map((f) => (
          <li key={f.id}>
            <Menyvalg
              ikon={f.id === gjeldende?.id ? 'done' : f.ikon}
              tekst={f.navn}
              aktiv={f.id === gjeldende?.id}
              hint={bytter === f.id ? 'Bytter …' : erMedlem(f) ? undefined : 'Ikke medlem'}
              onClick={() => void bytt(f)}
            />
          </li>
        ))}
      </ul>
      {feil && (
        <p className="skjemafeil" role="alert">
          Fagmiljøet ble ikke byttet. Prøv igjen.
        </p>
      )}
    </Menyskuff>
  )
}
