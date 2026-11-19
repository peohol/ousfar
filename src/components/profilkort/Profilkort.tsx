import { useId, useState, type ReactNode } from 'react'
import { visningsnavn, type Profilkort } from '@delt/profil'
import { useProfil } from '../../auth/okt'
import { direkteapi } from '../../direktemeldinger/api'
import { direktemeldingene } from '../../direktemeldinger/direktemeldingene'
import { useFestbarBoble } from '../../hooks/useFestbarBoble'
import { useProfilkortdetaljer, type Profilkorttilstand } from '../../profilkort/api'
import { CHATIKON } from '../chat/chatvisning'
import { visDirektesamtale } from '../chat/chatstyring'
import { Button } from '../Button'
import { Ikonknapp } from '../Ikonknapp'
import { Avatar } from '../konto/Avatar'
import { useBobleplassering } from '../Tips'
import '../../styles/profilkort.css'

/** Det kortet trenger om personen; resten henter det selv. */
export type Profilperson = Pick<Profilkort, 'id' | 'username' | 'first_name' | 'last_name' | 'avatar_path'>

/** Hvor lenge pekeren må hvile på et bilde eller navn før kortet kommer, så det ikke blinker forbi i en chat. */
export const PROFILKORT_VISES_ETTER = 400

export interface ProfilutlosProps {
  /** Personen. `null` (en slettet konto) og den innloggede selv gir ikke noe kort. */
  person: Profilperson | null | undefined
  /** Signert lenke til bildet, som stedet kortet står på alt har. */
  lenke?: string | null
  /** Bildet og/eller navnet kortet hører til. */
  children: ReactNode
  className?: string
  /**
   * `fokus`: en knapp i tabulatorrekkefølgen, som åpner kortet ved klikk,
   * trykk, Enter og mellomrom (navnet). `peker`: den samme knappen, men
   * utenfor tabulatorrekkefølgen og skjult for skjermlesere (bildet ved
   * siden av navnet, så hver person står én gang for tastaturet).
   */
  variant?: 'fokus' | 'peker'
}

/**
 * Profilbildet eller navnet til en annen bruker, med profilkortet bak:
 * bildet litt større, hele navnet, stillingen, fagmiljøene og en chatknapp
 * når det kan sendes direktemeldinger til personen
 * (docs/designsystem.md, «Profilkortet»).
 *
 * Kortet kommer når pekeren har hvilt en liten stund, og ved klikk, trykk,
 * Enter eller mellomrom, som festes, så chatknappen kan nås
 * (`useFestbarBoble`). Det står i det øverste laget (`useBobleplassering`)
 * og klippes aldri av chatten eller tråden det står i.
 *
 * For den innloggede selv, og for en konto som er borte, står barna som de er.
 */
export function Profilutlos({ person, ...rest }: ProfilutlosProps) {
  const meg = useProfil()
  if (!person || person.id === meg.id) return rest.className ? <span className={rest.className}>{rest.children}</span> : <>{rest.children}</>
  return <Utlos person={person} {...rest} />
}

function Utlos({ person, lenke = null, children, className, variant = 'fokus' }: ProfilutlosProps & { person: Profilperson }) {
  const { apen, lukk, feste, knapp } = useFestbarBoble({ visesEtter: PROFILKORT_VISES_ETTER })
  const kortId = useId()
  const navn = visningsnavn(person)
  const klasser = ['profilutlos', className].filter(Boolean).join(' ')

  const bareBilde = variant === 'peker'
  return (
    <span {...feste} className={klasser}>
      <button
        {...knapp}
        type="button"
        className="profilutlos__knapp"
        aria-controls={apen ? kortId : undefined}
        aria-haspopup="dialog"
        {...(bareBilde ? { tabIndex: -1, 'aria-hidden': true } : { 'aria-label': `${navn}, vis profilkortet` })}
      >
        {children}
      </button>
      {apen && knapp.ref.current && <Profilboble id={kortId} anker={knapp.ref.current} person={person} lenke={lenke} onLukk={lukk} />}
    </span>
  )
}

function Profilboble({
  id,
  anker,
  person,
  lenke,
  onLukk,
}: {
  id: string
  anker: HTMLElement
  person: Profilperson
  lenke: string | null
  onLukk: () => void
}) {
  const tilstand = useProfilkortdetaljer(person.id, true)
  const { boble, innhold, klasser, stil } = useBobleplassering<HTMLSpanElement>(anker, tilstand, 'under')
  return (
    <span
      ref={boble}
      id={id}
      role="dialog"
      aria-label={`Profilkortet til ${visningsnavn(person)}`}
      className={`${klasser} tipsboble--interaktiv profilboble`}
      style={stil}
    >
      <span ref={innhold} className="tipsboble__innhold">
        <Profilkortinnhold person={person} lenke={lenke} tilstand={tilstand} onApnet={onLukk} />
      </span>
    </span>
  )
}

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const feiltekst = (aarsak: unknown) => (aarsak instanceof Error && aarsak.message ? aarsak.message : UVENTET)

/**
 * Selve kortet. Bare spenn, så det kan stå inne i et avsnitt. Navnet og
 * bildet står med en gang; stillingen, fagmiljøene og chatknappen når de er
 * hentet. Ser den innloggede ikke personen gjennom fagmiljøene, gruppene
 * eller direktesamtalene, står bare navnet og bildet.
 */
export function Profilkortinnhold({
  person,
  lenke,
  tilstand,
  onApnet,
}: {
  person: Profilperson
  lenke: string | null
  tilstand: Profilkorttilstand
  /** Chatten er åpnet på samtalen med personen. */
  onApnet: () => void
}) {
  const navn = visningsnavn(person)
  const detaljer = tilstand.status === 'klar' ? tilstand.detaljer : null
  return (
    <span className="profilkort">
      <Avatar profil={person} lenke={lenke} storrelse="kort" />
      <span className="profilkort__tekst">
        <span className="profilkort__navn">{navn}</span>
        {detaljer?.stilling && <span className="profilkort__stilling">{detaljer.stilling}</span>}
        {detaljer && detaljer.fagmiljoer.length > 0 && (
          <span className="profilkort__fagmiljo">
            <span className="kun-skjermleser">{detaljer.fagmiljoer.length === 1 ? 'Fagmiljø: ' : 'Fagmiljøer: '}</span>
            {detaljer.fagmiljoer.join(' · ')}
          </span>
        )}
        {tilstand.status === 'laster' && <span className="profilkort__venter">Henter …</span>}
      </span>
      {detaljer?.kan_chatte && <Chatvalg person={person} onApnet={onApnet} />}
    </span>
  )
}

/**
 * Chatknappen: samtalen som finnes, eller en ny. Har den innloggede selv slått
 * av direktemeldingene og ingen samtale med personen fra før, tilbyr kortet å
 * slå dem på, slik «Ny chat» gjør; bryteren endres aldri uten at det trykkes.
 */
function Chatvalg({ person, onApnet }: { person: Profilperson; onApnet: () => void }) {
  const direkte = direktemeldingene.bruk()
  const [opptatt, setOpptatt] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const finnes = direkte?.samtaler.find((s) => s.motpart?.id === person.id) ?? null
  const egenAv = direkte !== null && !direkte.valg.tillat_direktemeldinger && !finnes
  const [spurt, setSpurt] = useState(false)

  const apne = async (slaPa: boolean) => {
    setOpptatt(true)
    setFeil(null)
    try {
      if (slaPa && direkte) await direkte.settValg({ tillat_direktemeldinger: true })
      const samtale = finnes?.id ?? (await direkteapi.aapneDirektesamtale(person.id))
      visDirektesamtale(samtale)
      onApnet()
    } catch (aarsak) {
      setFeil(feiltekst(aarsak))
    } finally {
      setOpptatt(false)
    }
  }

  return (
    <span className="profilkort__chat">
      <Ikonknapp
        ikon={CHATIKON}
        etikett={`Chat med ${person.first_name || visningsnavn(person)}`}
        variant="kant"
        storrelse="liten"
        disabled={opptatt}
        onClick={() => (egenAv ? setSpurt(true) : void apne(false))}
      />
      {spurt && egenAv && (
        <span className="profilkort__sporsmal" role="status">
          <span>Slå på «Tillat direktemeldinger» for å starte en samtale.</span>
          <Button variant="kant" disabled={opptatt} onClick={() => void apne(true)}>
            Slå på og start
          </Button>
        </span>
      )}
      {feil && (
        <span className="skjemafeil" role="alert">
          {feil}
        </span>
      )}
    </span>
  )
}
