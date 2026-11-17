import { forwardRef, useEffect, useId, type KeyboardEvent } from 'react'
import { useProfil } from '../../auth/okt'
import { vedOktskifte } from '../../auth/oktskifte'
import type { Chatgrenser } from '../../gruppechat/modell'
import { useBevart } from '../../oppdatering/Bevaring'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Pasientvarsel } from '../Pasientregel'
import { erBeroring, kanSendes, tegnteller } from './gruppechatvisning'

/**
 * Utkastene i chattene mens appen står åpen, så det som er skrevet, står der
 * når man kommer tilbake fra en annen fane i gruppen. Bare i minnet: det
 * lagres ingen steder og er borte når fanen lukkes (`useBevart` tar det med
 * over en oppdatering av appen, skilt etter kontoen).
 *
 * Et utkast hører til den innloggede og gruppen. Alle glemmes når kontoen i
 * fanen skifter (utlogging, eller en annen som logger inn), og en gruppes
 * utkast når tilgangen til den er tapt (`glemUtkastene`), så ingen andre
 * får se det.
 */
const utkastene = new Map<string, string>()
const SKILLE = '\u0000'
const utkastnokkel = (bruker: string, gruppe: string) => `${bruker}${SKILLE}${gruppe}`

vedOktskifte(() => utkastene.clear())

/** Glemmer utkastene i gruppen, for alle kontoer: tilgangen til den er tapt. */
export function glemUtkastene(gruppe: string): void {
  for (const nokkel of [...utkastene.keys()]) if (nokkel.endsWith(`${SKILLE}${gruppe}`)) utkastene.delete(nokkel)
}

/**
 * Skrivefeltet i chatten. Enter sender og Shift + Enter gir ny linje; på en
 * berøringsskjerm gir Enter ny linje, og Send-knappen sender. Telleren står
 * når grensen nærmer seg, og `Pasientvarsel` sier fra mens teksten ligner et
 * fødselsnummer. Regelen om pasientopplysninger (`regelId`) beskriver feltet.
 */
export const Gruppechatskriving = forwardRef<
  HTMLTextAreaElement,
  {
    gruppe: string
    gruppenavn: string
    grenser: Chatgrenser
    /** `id` til regelen om pasientopplysninger, som beskriver feltet. */
    regelId: string
    onSend: (tekst: string) => void
  }
>(function Gruppechatskriving({ gruppe, gruppenavn, grenser, regelId, onSend }, felt) {
  const nokkel = utkastnokkel(useProfil().id, gruppe)
  const [tekst, setTekst] = useBevart(`chat/utkast`, () => utkastene.get(nokkel) ?? '')
  const id = useId()
  const teller = tegnteller(tekst, grenser.maks_tegn)
  const klar = kanSendes(tekst, grenser.maks_tegn)

  useEffect(() => {
    if (tekst) utkastene.set(nokkel, tekst)
    else utkastene.delete(nokkel)
  }, [nokkel, tekst])

  const send = () => {
    if (!klar) return
    onSend(tekst.trim())
    setTekst('')
  }

  const paaTast = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing || erBeroring()) return
    e.preventDefault()
    send()
  }

  return (
    <form
      className="chatskriving"
      aria-label={`Skriv i chatten i ${gruppenavn}`}
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <div className="chatskriving__rad">
        <textarea
          ref={felt}
          className="felt__inndata chatfelt"
          aria-label={`Melding til ${gruppenavn}`}
          aria-describedby={`${regelId} ${id}-hjelp ${id}-teller ${id}-varsel`}
          aria-invalid={teller?.over || undefined}
          placeholder="Skriv en melding"
          rows={1}
          value={tekst}
          enterKeyHint="enter"
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={paaTast}
        />
        <Button type="submit" icon={<Ikon navn="publish" />} disabled={!klar}>
          Send
        </Button>
      </div>
      <p id={`${id}-hjelp`} className="kun-skjermleser">
        {erBeroring() ? 'Send-knappen sender.' : 'Enter sender, Shift + Enter gir ny linje.'}
      </p>
      <Pasientvarsel tekst={tekst} id={`${id}-varsel`} />
      <p id={`${id}-teller`} className="chatskriving__teller" data-over={teller?.over || undefined} aria-live="polite">
        {teller?.tekst}
      </p>
    </form>
  )
})
