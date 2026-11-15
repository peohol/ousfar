import { useState } from 'react'
import {
  kanVelgeArbeidsfagmiljo,
  useOppdaterRettigheter,
  useRettigheter,
  velgArbeidsfagmiljo,
  type Fagmiljoreferanse,
} from '../../auth/rettigheter'
import { Menyskuff, Menyvalg } from '../toppmeny/Nedtrekksmeny'

export interface ArbeidsfagmiljovalgProps {
  apen: boolean
  onVeksle: () => void
  /** Velger fagmiljøet; som standard i databasen (`velgArbeidsfagmiljo`). */
  velg?: (fagmiljo: string) => Promise<unknown>
}

/**
 * «Fagmiljø» i kontomenyen, for den som er aktivt medlem av flere: hvilket av
 * dem appen fortolker med (arbeidsfagmiljøet). Valget lagres i databasen og
 * gjelder bare fortolkningen; lesing og deltakelse følger alle medlemskapene.
 * Med ett fagmiljø vises ingenting.
 */
export function Arbeidsfagmiljovalg({ apen, onVeksle, velg = velgArbeidsfagmiljo }: ArbeidsfagmiljovalgProps) {
  const rettigheter = useRettigheter()
  const oppdater = useOppdaterRettigheter()
  const [bytter, setBytter] = useState<string | null>(null)
  const [feil, setFeil] = useState(false)
  if (!kanVelgeArbeidsfagmiljo(rettigheter)) return null
  const gjeldende = rettigheter.arbeidsfagmiljo

  const bytt = async (f: Fagmiljoreferanse) => {
    if (bytter !== null || f.id === gjeldende?.id) return
    setBytter(f.id)
    setFeil(false)
    try {
      await velg(f.id)
      oppdater()
    } catch {
      setFeil(true)
    } finally {
      setBytter(null)
    }
  }

  return (
    <Menyskuff ikon="laboratorium" tekst={`Fagmiljø: ${gjeldende?.navn ?? 'ikke valgt'}`} apen={apen} onVeksle={onVeksle}>
      <ul className="nedtrekk__valg" aria-label="Fagmiljøet du arbeider i">
        {rettigheter.mineFagmiljoer.map((f) => (
          <li key={f.id}>
            <Menyvalg
              ikon={f.id === gjeldende?.id ? 'done' : 'laboratorium'}
              tekst={f.navn}
              aktiv={f.id === gjeldende?.id}
              hint={bytter === f.id ? 'Bytter …' : undefined}
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
