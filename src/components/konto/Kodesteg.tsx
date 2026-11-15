import { useState, type FormEvent } from 'react'
import { useOkt } from '../../auth/okt'
import { KODELENGDE } from '../../auth/tofaktor'
import { Button } from '../Button'
import { Felt } from './Felt'

/**
 * Det andre steget i innloggingen, for en konto med en autentiseringsapp:
 * passordet er godtatt, og koden appen viser nå, mangler. Ingenting av appen
 * vises før den er gitt. Den som ikke har telefonen for hånden, kan logge ut.
 */
export function Kodesteg() {
  const { loggInnMedKode, loggUt } = useOkt()
  const [kode, setKode] = useState('')
  const [feil, setFeil] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)

  const send = async (hendelse: FormEvent) => {
    hendelse.preventDefault()
    if (arbeider) return
    setArbeider(true)
    setFeil(null)
    try {
      const svar = await loggInnMedKode(kode)
      setFeil(svar)
      if (svar) setKode('')
    } catch {
      setFeil('Fikk ikke kontakt med brukerdatabasen. Prøv igjen.')
    } finally {
      setArbeider(false)
    }
  }

  return (
    <form className="skjema" onSubmit={(hendelse) => void send(hendelse)}>
      <p>Kontoen din har tofaktor. Skriv inn koden autentiseringsappen på telefonen viser nå.</p>
      <Felt
        merkelapp="Kode"
        name="otp"
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={KODELENGDE + 2}
        // Markøren skal stå i feltet med én gang, som på innloggingssiden.
        autoFocus
        value={kode}
        hjelp={`${KODELENGDE} sifre. Koden skifter hvert 30. sekund.`}
        onChange={(hendelse) => setKode(hendelse.target.value)}
      />

      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}

      <div className="skjema__knapper">
        <Button type="submit" disabled={arbeider}>
          {arbeider ? 'Kontrollerer …' : 'Logg inn'}
        </Button>
        <Button variant="subtle" onClick={() => void loggUt()}>
          Logg ut
        </Button>
      </div>
    </form>
  )
}
