import { useState } from 'react'
import {
  kanVelgeArbeidsfagmiljo,
  useOppdaterRettigheter,
  useRettigheter,
  velgArbeidsfagmiljo,
  type Fagmiljoreferanse,
  type Rettigheter,
} from '../../auth/rettigheter'
import { Menyskuff, Menyvalg } from '../toppmeny/Nedtrekksmeny'

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
  const rettigheter = useRettigheter()
  const oppdater = useOppdaterRettigheter()
  const [bytter, setBytter] = useState<string | null>(null)
  const [feil, setFeil] = useState(false)
  if (!kanVelgeArbeidsfagmiljo(rettigheter)) return null
  const gjeldende = rettigheter.arbeidsfagmiljo
  const erMedlem = (f: Fagmiljoreferanse) => rettigheter.mineFagmiljoer.some((m) => m.id === f.id)

  const bytt = async (f: Fagmiljoreferanse) => {
    if (bytter !== null || f.id === gjeldende?.id) return
    setBytter(f.id)
    setFeil(false)
    try {
      // Rettighetene byttet ga, tas i bruk med en gang, så appen aldri
      // fortolker med det forrige fagmiljøet etter at serveren har byttet.
      oppdater(await velg(f.id))
    } catch {
      setFeil(true)
    } finally {
      setBytter(null)
    }
  }

  return (
    <Menyskuff ikon="laboratorium" tekst={`Fagmiljø: ${gjeldende?.navn ?? 'ikke valgt'}`} apen={apen} onVeksle={onVeksle}>
      <ul className="nedtrekk__valg" aria-label="Fagmiljøet du arbeider i">
        {rettigheter.velgbareFagmiljoer.map((f) => (
          <li key={f.id}>
            <Menyvalg
              ikon={f.id === gjeldende?.id ? 'done' : 'laboratorium'}
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
