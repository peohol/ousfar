import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  FAKTORER_MEST,
  KODELENGDE,
  avbrytInnmelding,
  bekreftInnmelding,
  fjernFaktor,
  hentFaktorer,
  meldInn,
  type Faktor,
  type Innmelding,
} from '../../auth/tofaktor'
import { Button } from '../Button'
import { Bekreftelseskort } from './Bekreftelseskort'
import { Felt } from './Felt'

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const melding = (aarsak: unknown) => (aarsak instanceof Error ? aarsak.message : UVENTET)

const DATO = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })

/** Hemmeligheten i grupper på fire, lettere å skrive av. */
const igrupper = (hemmelighet: string) => hemmelighet.match(/.{1,4}/g)?.join(' ') ?? hemmelighet

/**
 * Tofaktor under Konto: appene personen har meldt inn, innmeldingen av en ny
 * med QR-kode og den første koden, og fjerningen av en egen app. Frivillig for
 * alle inntil kravet slås på (`docs/s4-pilotplan.md` §3.1). En annens app kan
 * ikke fjernes herfra (D5b).
 */
export function Tofaktor() {
  const [faktorer, setFaktorer] = useState<Faktor[] | null>(null)
  const [innmelding, setInnmelding] = useState<Innmelding | null>(null)
  const [skalFjerne, setSkalFjerne] = useState<Faktor | null>(null)
  const [navn, setNavn] = useState('Telefonen min')
  const [kode, setKode] = useState('')
  const [feil, setFeil] = useState<string | null>(null)
  const [kvittering, setKvittering] = useState<string | null>(null)
  const [opptatt, setOpptatt] = useState(false)
  const hemmelighetId = useId()
  /** Innmeldingen som er bekreftet, og derfor ikke skal ryddes bort. */
  const bekreftet = useRef<string | null>(null)

  const oppdater = useCallback(async () => {
    try {
      setFaktorer(await hentFaktorer())
    } catch (aarsak) {
      setFeil(melding(aarsak))
    }
  }, [])

  useEffect(() => {
    void oppdater()
  }, [oppdater])

  // En innmelding som avbrytes, eller står åpen når panelet lukkes, fjernes, så
  // den ikke blir liggende ubekreftet. Den som er bekreftet, blir stående.
  useEffect(() => {
    if (!innmelding) return
    const { id } = innmelding
    return () => {
      if (bekreftet.current !== id) void avbrytInnmelding(id).catch(() => undefined)
    }
  }, [innmelding])

  const utfor = async (handling: () => Promise<string | null>) => {
    if (opptatt) return
    setOpptatt(true)
    setFeil(null)
    setKvittering(null)
    try {
      const svar = await handling()
      if (svar) setKvittering(svar)
    } catch (aarsak) {
      setFeil(melding(aarsak))
    } finally {
      setOpptatt(false)
    }
  }

  const begynn = (hendelse: FormEvent) => {
    hendelse.preventDefault()
    void utfor(async () => {
      setInnmelding(await meldInn(navn))
      setKode('')
      return null
    })
  }

  const bekreft = (hendelse: FormEvent) => {
    hendelse.preventDefault()
    if (!innmelding) return
    void utfor(async () => {
      const svar = await bekreftInnmelding(innmelding.id, kode)
      if (svar) throw new Error(svar)
      bekreftet.current = innmelding.id
      setInnmelding(null)
      await oppdater()
      return 'Appen er lagt til. Fra neste innlogging spør OUSFAR om koden fra den.'
    })
  }

  const avbryt = () => {
    // Opprydningen står i effekten over.
    setInnmelding(null)
    setFeil(null)
  }

  const fjern = (faktor: Faktor) =>
    void utfor(async () => {
      await fjernFaktor(faktor.id)
      setSkalFjerne(null)
      await oppdater()
      return `«${faktor.navn}» er fjernet.`
    })

  const kanLeggeTil = faktorer !== null && faktorer.length < FAKTORER_MEST

  return (
    <section className="skjema" aria-labelledby={`${hemmelighetId}-tittel`}>
      <span className="skjema__bolktittel" id={`${hemmelighetId}-tittel`}>
        Tofaktor
      </span>
      <p className="felt__hjelp">
        Med tofaktor trenger innloggingen både passordet og en kode fra en autentiseringsapp på telefonen. Det er frivillig
        for deg nå. Har du to telefoner, kan du legge til begge.
      </p>

      {faktorer && faktorer.length > 0 && (
        <ul className="tofaktor__liste">
          {faktorer.map((f) => (
            <li key={f.id} className="tofaktor__app">
              <span>
                {f.navn} <span className="felt__hjelp">lagt til {DATO.format(new Date(f.laget))}</span>
              </span>
              <Button variant="subtle" disabled={opptatt} onClick={() => setSkalFjerne(f)}>
                Fjern
              </Button>
            </li>
          ))}
        </ul>
      )}
      {faktorer?.length === 0 && !innmelding && <p>Du har ingen autentiseringsapp lagt til.</p>}

      {skalFjerne && (
        <Bekreftelseskort
          tittel={`Fjerne «${skalFjerne.navn}»?`}
          bekreft="Fjern appen"
          opptatt={opptatt}
          onBekreft={() => fjern(skalFjerne)}
          onAvbryt={() => setSkalFjerne(null)}
        >
          {faktorer?.length === 1
            ? 'Det er den eneste appen din. Etterpå logger du inn med passordet alene.'
            : 'Koden fra den appen virker ikke lenger. Den andre appen virker som før.'}
        </Bekreftelseskort>
      )}

      {innmelding ? (
        <form className="skjema tofaktor__innmelding" onSubmit={bekreft}>
          <p>Skann QR-koden med autentiseringsappen, og skriv inn koden den viser.</p>
          <img className="tofaktor__qr" src={innmelding.qr} alt="QR-kode for autentiseringsappen" width={180} height={180} />
          <div className="felt">
            <span className="felt__merkelapp" id={hemmelighetId}>
              Kan du ikke skanne? Skriv inn denne nøkkelen i appen
            </span>
            <code className="tofaktor__hemmelighet" aria-labelledby={hemmelighetId}>
              {igrupper(innmelding.hemmelighet)}
            </code>
          </div>
          <Felt
            merkelapp="Koden appen viser"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={KODELENGDE + 2}
            autoFocus
            value={kode}
            onChange={(hendelse) => setKode(hendelse.target.value)}
          />
          {feil && (
            <p className="skjemafeil" role="alert">
              {feil}
            </p>
          )}
          <div className="skjema__knapper">
            <Button type="submit" disabled={opptatt}>
              {opptatt ? 'Kontrollerer …' : 'Bekreft'}
            </Button>
            <Button variant="subtle" onClick={avbryt}>
              Avbryt
            </Button>
          </div>
        </form>
      ) : (
        <>
          {kanLeggeTil && (
            <form className="skjema" onSubmit={begynn}>
              <Felt
                merkelapp="Navn på appen"
                maxLength={60}
                value={navn}
                hjelp="Så du kjenner den igjen, for eksempel «Telefonen min»."
                onChange={(hendelse) => setNavn(hendelse.target.value)}
              />
              <Button type="submit" variant="kant" disabled={opptatt}>
                Legg til en autentiseringsapp
              </Button>
            </form>
          )}
          {feil && (
            <p className="skjemafeil" role="alert">
              {feil}
            </p>
          )}
        </>
      )}

      <p className="skjemakvittering" role="status">
        {kvittering}
      </p>
    </section>
  )
}
