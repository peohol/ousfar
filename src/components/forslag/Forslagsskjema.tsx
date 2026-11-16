import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { forslagsadresse } from '../../domain/rute'
import { sendForslag } from '../../forslag/api'
import { GRENSER, TOM_KILDE, finnKildefeil, kilderTilLagring, type Kildeutkast } from '../../forslag/modell'
import { useBevart } from '../../oppdatering/Bevaring'
import { IKKE_PASIENTOPPLYSNINGER } from '../../traad/modell'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Modallag } from '../Modallag'
import { Forlatvarsel } from '../stoffside/Skjemaer'
import type { Forslagsapning } from './Forslagskilde'
import { Tekstomrade } from './Tekstomrade'
import '../../styles/forslag.css'

/** Der fokus lander når skjemaet åpnes: det første feltet brukeren skriver i. */
const FORSTE_FELT = '.forslagsskjema textarea'
/** Der fokus lander i kvitteringen: veien videre, så tastaturet og skjermleseren ikke mister plassen. */
const KVITTERINGSFOKUS = '.forslagsskjema__kvittering [data-autofokus]'

/** Feltet feilen i skjemaet gjelder: et av tekstfeltene, eller en kilde etter plassen i lista. */
type Feilfelt = 'forslag' | 'begrunnelse' | number | null

/**
 * Skjemaet «Foreslå endring»: hva forslaget gjelder (forhåndsvalgt, med teksten
 * slik den står), forslaget, begrunnelsen og kildene. Et vindu over siden på
 * bred skjerm, og et ark i nesten hele høyden på smal (`Modallag` med `ark`),
 * som redigeringsskjemaene. Det som er skrevet, overlever en oppdatering av
 * appen, og vinduet spør før det lukkes med noe skrevet.
 *
 * Etter innsendingen står kvitteringen i vinduet, med lenke til forslaget.
 * Forslaget gir ingen rett til å endre innholdet; databasen kontrollerer alt
 * på nytt (docs/redaktorer-og-forslag.md).
 */
export function Forslagsskjema({ apning, onLukk }: { apning: Forslagsapning; onLukk: () => void }) {
  const [valgt, setValgt] = useBevart('valgt', apning.valgt ?? 0)
  const [forslag, setForslag] = useBevart('forslag', '')
  const [begrunnelse, setBegrunnelse] = useBevart('begrunnelse', '')
  const [kilder, setKilder] = useBevart<Kildeutkast[]>('kilder', [])
  const [sendt, setSendt] = useBevart<string | null>('sendt', null)
  const [feil, setFeil] = useState<{ melding: string; felt: Feilfelt } | null>(null)
  const [sender, setSender] = useState(false)
  const [forlater, setForlater] = useState(false)
  const skjemaId = useId()
  const valgId = useId()
  const feilId = `${skjemaId}-feil`
  const forslagRef = useRef<HTMLTextAreaElement>(null)
  const begrunnelseRef = useRef<HTMLTextAreaElement>(null)

  const mal = apning.valg[Math.min(valgt, apning.valg.length - 1)] ?? apning.valg[0]!
  const skrevet = forslag.trim() !== '' || begrunnelse.trim() !== '' || kilderTilLagring(kilder).length > 0

  const vedLukking = () => {
    if (sender) return false
    if (sendt || !skrevet) return true
    setForlater(true)
    return false
  }

  /** Viser feilen og flytter fokus til feltet den gjelder, så skjermleseren hører den der. */
  const visFeil = (melding: string, felt: Feilfelt) => {
    setFeil({ melding, felt })
    if (felt === 'forslag') forslagRef.current?.focus()
    else if (felt === 'begrunnelse') begrunnelseRef.current?.focus()
    else if (typeof felt === 'number') document.querySelector<HTMLElement>(`[data-kilde="${felt}"] input[type="url"]`)?.focus()
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!forslag.trim()) return visFeil('Skriv hva du foreslår.', 'forslag')
    if (!begrunnelse.trim()) return visFeil('Skriv hvorfor du foreslår endringen.', 'begrunnelse')
    const kildene = finnKildefeil(kilder)
    if (kildene) return visFeil(kildene.melding, kildene.indeks)
    setSender(true)
    setFeil(null)
    try {
      setSendt(await sendForslag({ mal, forslag: forslag.trim(), begrunnelse: begrunnelse.trim(), kilder }))
    } catch (e) {
      setFeil({ melding: (e as Error).message, felt: null })
    } finally {
      setSender(false)
    }
  }

  if (sendt) {
    return (
      // Et eget lag (egen nøkkel), så det åpnes på nytt og gir fokus til veien videre.
      <Modallag key="kvittering" apen tittel="Forslaget er sendt" ikon="done" ark autofokus={KVITTERINGSFOKUS} onLukk={onLukk}>
        <Kvittering id={sendt} onLukk={onLukk} />
      </Modallag>
    )
  }

  return (
    <Modallag
      apen
      tittel="Foreslå endring"
      meta={apning.tittel}
      ikon="foresla"
      ark
      lukketekst="Lukk forslaget"
      autofokus={FORSTE_FELT}
      onLukk={onLukk}
      vedLukking={vedLukking}
      fot={
        <>
          {feil && (
            <p className="skjemafeil" id={feilId} role="alert">
              {feil.melding}
            </p>
          )}
          {forlater ? (
            <Forlatvarsel onForkast={onLukk} onFortsett={() => setForlater(false)} />
          ) : (
            <div className="skjema__knapper redigering__knapper">
              <Button variant="subtle" onClick={() => (vedLukking() ? onLukk() : undefined)}>
                Avbryt
              </Button>
              <Button type="submit" form={skjemaId} className="knapp--kompakt" disabled={sender}>
                {sender ? 'Sender …' : 'Send forslaget'}
              </Button>
            </div>
          )}
        </>
      }
    >
      <form id={skjemaId} className="forslagsskjema redigering" aria-label="Foreslå endring" onSubmit={(e) => void send(e)} noValidate>
        <p className="felt__hjelp forslagsskjema__ingress">
          Forslaget går til dem som har ansvaret for innholdet. Det endrer ikke noe før de har behandlet det, og du kan følge
          det under «Mine forslag».
        </p>
        <div className="felt">
          {apning.valg.length > 1 ? (
            <>
              <label className="felt__merkelapp" htmlFor={valgId}>
                Hva gjelder forslaget?
              </label>
              <select id={valgId} className="felt__inndata" value={valgt} onChange={(e) => setValgt(Number(e.target.value))}>
                {apning.valg.map((v, i) => (
                  <option key={`${v.ressurs}:${v.element ?? ''}`} value={i}>
                    {v.etikett}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <span className="felt__merkelapp">Forslaget gjelder</span>
              <span className="felt__last">{mal.sted}</span>
            </>
          )}
        </div>
        {mal.utdrag && (
          <figure className="forslagsskjema__sitat">
            <figcaption className="felt__merkelapp">Slik står det nå</figcaption>
            <blockquote>{mal.utdrag}</blockquote>
          </figure>
        )}
        <Tekstomrade
          merkelapp="Hva foreslår du?"
          verdi={forslag}
          onEndre={setForslag}
          maks={GRENSER.forslag}
          rader={4}
          pakrevd
          ugyldig={feil?.felt === 'forslag'}
          feilId={feilId}
          feltRef={forslagRef}
          hjelp={`Skriv endringen så konkret du kan, gjerne med den nye teksten. ${IKKE_PASIENTOPPLYSNINGER}`}
        />
        <Tekstomrade
          merkelapp="Hvorfor?"
          verdi={begrunnelse}
          onEndre={setBegrunnelse}
          maks={GRENSER.begrunnelse}
          pakrevd
          ugyldig={feil?.felt === 'begrunnelse'}
          feilId={feilId}
          feltRef={begrunnelseRef}
          hjelp="Hva er feil eller mangler, og hva bygger forslaget på?"
        />
        <Kildeliste
          kilder={kilder}
          onEndre={setKilder}
          referanser={apning.referanser ?? []}
          ugyldig={typeof feil?.felt === 'number' ? feil.felt : null}
          feilId={feilId}
        />
      </form>
    </Modallag>
  )
}

/** Kildene: en tekst, en lenke eller en av referansene stedet har, høyst ti. */
function Kildeliste({
  kilder,
  onEndre,
  referanser,
  ugyldig,
  feilId,
}: {
  kilder: Kildeutkast[]
  onEndre: (kilder: Kildeutkast[]) => void
  referanser: readonly { id: string; tittel: string }[]
  /** Kilden feilen i skjemaet gjelder. */
  ugyldig: number | null
  feilId: string
}) {
  const endre = (i: number, endring: Partial<Kildeutkast>) => onEndre(kilder.map((k, j) => (j === i ? { ...k, ...endring } : k)))
  const nyRef = useRef<number | null>(null)
  // Fokus til den nye kilden, så tastaturet kan skrive rett inn.
  useEffect(() => {
    if (nyRef.current === null) return
    document.querySelector<HTMLElement>(`[data-kilde="${nyRef.current}"] :is(input, select)`)?.focus()
    nyRef.current = null
  }, [kilder.length])
  return (
    <fieldset className="forslagsskjema__kilder">
      <legend className="felt__merkelapp">Kilder (valgfritt)</legend>
      {kilder.length === 0 && <p className="felt__hjelp">Legg til en studie, en retningslinje eller en lenke forslaget bygger på.</p>}
      <ol className="forslagsskjema__kildeliste">
        {kilder.map((k, i) => (
          <li key={i} className="forslagsskjema__kilde" data-kilde={i}>
            <Kildefelt
              merkelapp={`Kilde ${i + 1}`}
              verdi={k.tekst}
              onEndre={(tekst) => endre(i, { tekst })}
              maks={GRENSER.kildetekst}
              plass="Forfatter, tittel, år"
              feilId={ugyldig === i ? feilId : undefined}
            />
            <Kildefelt
              merkelapp="Lenke"
              hvilken={i + 1}
              verdi={k.lenke}
              onEndre={(lenke) => endre(i, { lenke })}
              maks={2000}
              plass="https://"
              type="url"
              feilId={ugyldig === i ? feilId : undefined}
            />
            {referanser.length > 0 && (
              <Referansevalg verdi={k.referanse} onEndre={(referanse) => endre(i, { referanse })} referanser={referanser} hvilken={i + 1} />
            )}
            <Button
              variant="subtle"
              className="knapp--kompakt"
              icon={<Ikon navn="trash" />}
              aria-label={`Fjern kilde ${i + 1}`}
              onClick={() => onEndre(kilder.filter((_, j) => j !== i))}
            >
              Fjern
            </Button>
          </li>
        ))}
      </ol>
      {kilder.length < GRENSER.kilder && (
        <Button
          variant="kant"
          className="knapp--kompakt"
          icon={<Ikon navn="plus" />}
          onClick={() => {
            nyRef.current = kilder.length
            onEndre([...kilder, { ...TOM_KILDE }])
          }}
        >
          Legg til kilde
        </Button>
      )}
    </fieldset>
  )
}

/** For skjermleseren: hvilken kilde et felt hører til, når merkelappen ikke sier det selv. */
function Kildenummer({ hvilken }: { hvilken?: number }) {
  return hvilken ? <span className="kun-skjermleser"> for kilde {hvilken}</span> : null
}

function Kildefelt({
  merkelapp,
  hvilken,
  verdi,
  onEndre,
  maks,
  plass,
  type = 'text',
  feilId,
}: {
  merkelapp: string
  hvilken?: number
  verdi: string
  onEndre: (verdi: string) => void
  maks: number
  plass: string
  type?: 'text' | 'url'
  /** Meldingen når kilden har feilen skjemaet viser. */
  feilId?: string
}) {
  const id = useId()
  return (
    <div className="felt">
      <label className="felt__merkelapp" htmlFor={id}>
        {merkelapp}
        <Kildenummer hvilken={hvilken} />
      </label>
      <input
        id={id}
        className="felt__inndata"
        type={type}
        inputMode={type === 'url' ? 'url' : undefined}
        value={verdi}
        maxLength={maks}
        placeholder={plass}
        aria-invalid={feilId ? true : undefined}
        aria-describedby={feilId}
        onChange={(e) => onEndre(e.target.value)}
      />
    </div>
  )
}

function Referansevalg({
  verdi,
  onEndre,
  referanser,
  hvilken,
}: {
  verdi: string
  onEndre: (verdi: string) => void
  referanser: readonly { id: string; tittel: string }[]
  hvilken: number
}) {
  const id = useId()
  return (
    <div className="felt">
      <label className="felt__merkelapp" htmlFor={id}>
        Eller en referanse fra siden
        <Kildenummer hvilken={hvilken} />
      </label>
      <select id={id} className="felt__inndata" value={verdi} onChange={(e) => onEndre(e.target.value)}>
        <option value="">Ingen</option>
        {referanser.map((r) => (
          <option key={r.id} value={r.id}>
            {r.tittel}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Kvitteringen etter innsendingen, med veien videre. */
function Kvittering({ id, onLukk }: { id: string; onLukk: () => void }) {
  return (
    <div className="forslagsskjema__kvittering" role="status">
      <p>
        Takk! Forslaget er sendt til dem som har ansvaret for innholdet. Du får et varsel når det skjer noe med det, og du kan
        følge det og trekke det tilbake under «Mine forslag».
      </p>
      <div className="skjema__knapper">
        <Button variant="subtle" onClick={onLukk}>
          Lukk
        </Button>
        <Button
          className="knapp--kompakt"
          data-autofokus
          onClick={() => {
            onLukk()
            window.location.hash = forslagsadresse(id)
          }}
        >
          Se forslaget
        </Button>
      </div>
    </div>
  )
}
