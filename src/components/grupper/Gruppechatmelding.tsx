import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { avsendernavn, type Chatgrenser, type Gruppemelding, type Ventende } from '../../gruppechat/modell'
import { useBevart } from '../../oppdatering/Bevaring'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Avatar } from '../konto/Avatar'
import { Bekreftelseskort } from '../konto/Bekreftelseskort'
import { Pasientvarsel } from '../Pasientregel'
import { Menyvalg, Nedtrekksmeny } from '../toppmeny/Nedtrekksmeny'
import { erBeroring, heleTidspunktet, kanSendes, klokkeslett, tegnteller } from './gruppechatvisning'

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const feiltekst = (aarsak: unknown) => (aarsak instanceof Error && aarsak.message ? aarsak.message : UVENTET)

/** Tidspunktet ved en melding: klokkeslettet, og hele tidspunktet ved peker og for skjermlesere. */
function Klokke({ iso }: { iso: string }) {
  return (
    <time className="chatmelding__tid" dateTime={iso} title={heleTidspunktet(iso)}>
      {klokkeslett(iso)}
    </time>
  )
}

/**
 * Én melding i chatten: avsenderen og klokkeslettet (ikke på nytt når samme
 * avsender skriver igjen like etter), teksten, «redigert», og for en slettet
 * melding hvem som fjernet den. Det databasen sier den innloggede kan gjøre
 * (`kan_endre`, `kan_slette`), står i en liten meny; slettingen bekreftes
 * først, og endringen skjer i et felt på stedet.
 */
export function Gruppechatmelding({
  melding,
  sammen,
  laast,
  bildelenke,
  grenser,
  onEndre,
  onSlett,
}: {
  melding: Gruppemelding
  /** Står rett under den forrige fra samme avsender. */
  sammen: boolean
  /**
   * Gruppen er arkivert: meldingen kan ikke endres. Slettingen følger
   * `kan_slette`, så en systemarkitekt kan fjerne noe som ikke hører hjemme
   * der, uten å åpne gruppen igjen.
   */
  laast: boolean
  bildelenke: string | null
  grenser: Chatgrenser
  onEndre: (melding: string, tekst: string) => Promise<void>
  onSlett: (melding: string) => Promise<void>
}) {
  const navn = avsendernavn(melding)
  const [endrer, setEndrer] = useBevart(`chat/${melding.id}/endrer`, false)
  const [sletter, setSletter] = useState(false)
  const [opptatt, setOpptatt] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const rad = useRef<HTMLLIElement>(null)
  const menyRot = useRef<HTMLSpanElement>(null)
  const slettet = melding.slettet !== null
  const kanEndre = melding.kan_endre && !slettet && !laast
  const kanSlette = melding.kan_slette && !slettet
  const moderering = kanSlette && !melding.egen
  const tidspunkt = heleTidspunktet(melding.skrevet_kl)

  /** Fokus tilbake på menyknappen, eller på meldingen når menyen er borte. */
  const tilbake = () =>
    requestAnimationFrame(() => (menyRot.current?.querySelector<HTMLElement>('button') ?? rad.current)?.focus({ preventScroll: true }))

  const slett = async () => {
    setOpptatt(true)
    setFeil(null)
    try {
      await onSlett(melding.id)
      setSletter(false)
      rad.current?.focus({ preventScroll: true })
    } catch (aarsak) {
      setFeil(feiltekst(aarsak))
    } finally {
      setOpptatt(false)
    }
  }

  return (
    <li
      ref={rad}
      className="chatmelding"
      data-melding={melding.id}
      data-nr={melding.nr}
      data-sammen={sammen || undefined}
      data-egen={melding.egen || undefined}
      data-slettet={slettet || undefined}
      tabIndex={-1}
    >
      {!sammen && (
        <span className="chatmelding__bilde">
          {melding.forfatter ? (
            <Avatar profil={melding.forfatter} lenke={bildelenke} storrelse="liten" />
          ) : (
            <span className="avatar avatar--liten" aria-hidden="true" />
          )}
        </span>
      )}
      <div className="chatmelding__innhold">
        {sammen ? (
          // Navnet står over den første i rekken; skjermlesere får det likevel her.
          <span className="kun-skjermleser">
            {navn}, {tidspunkt}
          </span>
        ) : (
          <p className="chatmelding__hode">
            <span className="chatmelding__navn">
              {navn}
              {melding.egen && <span className="chatmelding__deg"> (deg)</span>}
            </span>
            <Klokke iso={melding.skrevet_kl} />
          </p>
        )}

        {endrer && kanEndre ? (
          <Endring
            melding={melding}
            grenser={grenser}
            onLagre={async (tekst) => {
              await onEndre(melding.id, tekst)
              setEndrer(false)
              tilbake()
            }}
            onAvbryt={() => {
              setEndrer(false)
              tilbake()
            }}
          />
        ) : slettet ? (
          <p className="chatmelding__slettet">
            <Ikon navn="trash" storrelse="ui" />
            {melding.slettet?.av === 'moderator' ? 'Fjernet av en moderator' : 'Meldingen er slettet'}
          </p>
        ) : (
          <p className="chatmelding__tekst">
            {melding.tekst}
            {melding.redigert_kl && (
              <span className="chatmelding__redigert" title={`Redigert ${heleTidspunktet(melding.redigert_kl)}`}>
                {' '}
                (redigert)
              </span>
            )}
          </p>
        )}

        {sletter && kanSlette && (
          <Bekreftelseskort
            tittel={moderering ? `Fjerne meldingen fra ${navn}?` : 'Slette meldingen?'}
            bekreft={moderering ? 'Fjern meldingen' : 'Slett meldingen'}
            opptatt={opptatt}
            onBekreft={() => void slett()}
            onAvbryt={() => {
              setSletter(false)
              tilbake()
            }}
          >
            {moderering
              ? 'Teksten fjernes for alle med en gang og kan ikke hentes tilbake. I chatten står det at en moderator fjernet den.'
              : 'Teksten fjernes for alle med en gang og kan ikke hentes tilbake. I chatten står det at meldingen er slettet.'}
          </Bekreftelseskort>
        )}
        {feil && (
          <p className="skjemafeil" role="alert">
            {feil}
          </p>
        )}
      </div>

      {(kanEndre || kanSlette) && !endrer && !sletter && (
        <span ref={menyRot} className="chatmelding__meny">
          <Nedtrekksmeny
            className="brukermeny"
            knapp={{
              ikon: 'more',
              etikett: `Handlinger for meldingen fra ${navn}, ${tidspunkt}`,
              variant: 'stille',
              storrelse: 'liten',
              utenTips: true,
            }}
            etikett={`Handlinger for meldingen fra ${navn}`}
            lag="chatmeny"
            lat
          >
            {(lukk) => (
              <ul className="nedtrekk__valg">
                {kanEndre && (
                  <li>
                    <Menyvalg
                      ikon="edit"
                      tekst="Endre"
                      onClick={() => {
                        lukk()
                        setFeil(null)
                        setEndrer(true)
                      }}
                    />
                  </li>
                )}
                {kanSlette && (
                  <li>
                    <Menyvalg
                      ikon="trash"
                      tekst={moderering ? 'Fjern meldingen' : 'Slett'}
                      forklaring={moderering ? 'Som moderator. Det står i chatten at den er fjernet.' : undefined}
                      onClick={() => {
                        lukk()
                        setFeil(null)
                        setSletter(true)
                      }}
                    />
                  </li>
                )}
              </ul>
            )}
          </Nedtrekksmeny>
        </span>
      )}
    </li>
  )
}

/** Endringen av en egen melding, i et felt der meldingen står. Enter lagrer som i skrivefeltet, Escape avbryter. */
function Endring({
  melding,
  grenser,
  onLagre,
  onAvbryt,
}: {
  melding: Gruppemelding
  grenser: Chatgrenser
  onLagre: (tekst: string) => Promise<void>
  onAvbryt: () => void
}) {
  const [tekst, setTekst] = useBevart(`chat/${melding.id}/tekst`, melding.tekst ?? '')
  const [opptatt, setOpptatt] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const id = useId()
  const teller = tegnteller(tekst, grenser.maks_tegn)
  const klar = kanSendes(tekst, grenser.maks_tegn) && !opptatt

  const lagre = async () => {
    if (!klar) return
    if (tekst.trim() === (melding.tekst ?? '').trim()) return onAvbryt()
    setOpptatt(true)
    setFeil(null)
    try {
      await onLagre(tekst.trim())
    } catch (aarsak) {
      setFeil(feiltekst(aarsak))
      setOpptatt(false)
    }
  }

  const paaTast = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onAvbryt()
    } else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !erBeroring()) {
      e.preventDefault()
      void lagre()
    }
  }

  return (
    <form
      className="chatendring"
      aria-label="Endre meldingen"
      onSubmit={(e) => {
        e.preventDefault()
        void lagre()
      }}
    >
      <textarea
        className="felt__inndata chatfelt"
        aria-label="Meldingen"
        aria-describedby={`${id}-teller ${id}-varsel`}
        aria-invalid={teller?.over || undefined}
        rows={2}
        value={tekst}
        disabled={opptatt}
        autoFocus
        onChange={(e) => setTekst(e.target.value)}
        onKeyDown={paaTast}
      />
      <Pasientvarsel tekst={tekst} id={`${id}-varsel`} />
      <p id={`${id}-teller`} className="chatskriving__teller" data-over={teller?.over || undefined} aria-live="polite">
        {teller?.tekst}
      </p>
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      <div className="skjema__knapper">
        <Button type="submit" variant="kant" icon={<Ikon navn="yes" />} disabled={!klar}>
          Lagre
        </Button>
        <Button variant="subtle" onClick={onAvbryt}>
          Avbryt
        </Button>
      </div>
    </form>
  )
}

/**
 * En egen melding som ikke er bekreftet ennå: «Sender …», eller når den
 * feilet, feilen fra databasen med «Prøv igjen» og «Forkast».
 */
export function Ventendemelding({
  ventende,
  sammen,
  onProvIgjen,
  onForkast,
}: {
  ventende: Ventende
  /** Står rett under en annen egen melding, og trenger ikke «Du» over seg. */
  sammen: boolean
  onProvIgjen: (klientId: string) => void
  onForkast: (klientId: string) => void
}) {
  const feilet = ventende.status === 'feilet'
  return (
    <li className="chatmelding chatmelding--ventende" data-egen="" data-sammen={sammen || undefined} data-status={ventende.status}>
      <div className="chatmelding__innhold">
        {sammen ? (
          <span className="kun-skjermleser">Du</span>
        ) : (
          <p className="chatmelding__hode">
            <span className="chatmelding__navn">Du</span>
          </p>
        )}
        <p className="chatmelding__tekst">{ventende.tekst}</p>
        {feilet ? (
          <div className="chatmelding__feilet">
            <p className="skjemafeil" role="alert">
              Ikke sendt: {ventende.feil ?? UVENTET}
            </p>
            <div className="skjema__knapper">
              <Button variant="kant" icon={<Ikon navn="reset" />} onClick={() => onProvIgjen(ventende.klient_id)}>
                Prøv igjen
              </Button>
              <Button variant="subtle" icon={<Ikon navn="close" />} onClick={() => onForkast(ventende.klient_id)}>
                Forkast
              </Button>
            </div>
          </div>
        ) : (
          <p className="chatmelding__sender">Sender …</p>
        )}
      </div>
    </li>
  )
}
