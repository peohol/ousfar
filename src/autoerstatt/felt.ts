/**
 * Autoerstatt i alle vanlige tekstfelt i appen (`textarea` og tekst-`input`),
 * med de samme reglene og den samme angringen som i rikteksteditoren
 * (`editor.ts`).
 *
 * Feltene trenger ingen egen kode: {@link lyttEtterTekstfelt} lytter på hele
 * dokumentet, før React ser hendelsen, så et felt som legges til senere, får
 * autoerstatt av seg selv. Felt der teksten ikke er vanlig skrift — søk,
 * lenker, e-post, passord, tall, brukernavn, kildeverdier som skal stå «som i
 * kilden» og reglene selv — står utenfor: søk, lenker og lignende har sin egen
 * `type` eller `inputmode`, og de andre er merket med {@link UTEN_AUTOERSTATT}
 * (`autocorrect="off"` eller `spellcheck="false"`).
 */
import { finnRegel, MAKS_LENGDE, type Autoerstattregel, type Erstatning } from './regler'

type Tekstfelt = HTMLTextAreaElement | HTMLInputElement

/** Den siste erstatningen i hvert felt, med verdien rett etter, så den kan angres. */
const siste = new WeakMap<Tekstfelt, Erstatning & { verdi: string }>()

/**
 * Spres på et felt der teksten skal stå nøyaktig slik den skrives — tall,
 * enheter, koder, brukernavn og verdier «som i kilden» — så autoerstatt (og
 * nettleserens egen autokorrektur) lar det være.
 */
export const UTEN_AUTOERSTATT = { autoCorrect: 'off', spellCheck: false } as const

/** Tastaturene (`inputmode`) for felt der teksten ikke er vanlig skrift. */
const IKKE_SKRIFT = new Set(['numeric', 'decimal', 'tel', 'email', 'url', 'search'])

/** Om `mal` er et felt for vanlig skrift, der autoerstatt skal gjelde. */
export function kanAutoerstattes(mal: EventTarget | null): mal is Tekstfelt {
  const felt =
    mal instanceof HTMLTextAreaElement ? mal : mal instanceof HTMLInputElement && mal.type === 'text' ? mal : null
  if (!felt || felt.readOnly || IKKE_SKRIFT.has(felt.inputMode)) return false
  return felt.getAttribute('autocorrect')?.toLowerCase() !== 'off' && felt.getAttribute('spellcheck') !== 'false'
}

/**
 * Bytter ut det som står foran markøren når det nettopp skrevne tegnet
 * fullfører en regel. Gjøres i feltet selv, så markøren blir stående.
 * Gir sant når noe ble byttet.
 */
export function erstattIFelt(felt: Tekstfelt, inndatatype: string | undefined, regler: readonly Autoerstattregel[]): boolean {
  siste.delete(felt)
  if (inndatatype !== 'insertText' || felt.selectionStart === null || felt.selectionStart !== felt.selectionEnd) return false
  const markor = felt.selectionStart
  const regel = finnRegel(felt.value.slice(Math.max(0, markor - MAKS_LENGDE), markor), regler)
  if (!regel) return false
  const fra = markor - regel.finn.length
  felt.setRangeText(regel.erstatt, fra, markor, 'end')
  siste.set(felt, { fra, til: fra + regel.erstatt.length, original: regel.finn, verdi: felt.value })
  return true
}

/** Setter tilbake det som ble skrevet, når tilbaketasten trykkes rett etter en erstatning. */
export function angreIFelt(felt: Tekstfelt): boolean {
  const sist = siste.get(felt)
  siste.delete(felt)
  if (!sist || felt.value !== sist.verdi || felt.selectionStart !== sist.til || felt.selectionEnd !== sist.til) return false
  felt.setRangeText(sist.original, sist.fra, sist.til, 'end')
  return true
}

/**
 * Slår på autoerstatt i alle tekstfelt under `rot` (som standard hele
 * dokumentet) og gir funksjonen som slår den av igjen. `regler` leses ved
 * hvert tegn, så regler som kommer eller endres senere, brukes straks.
 *
 * Lytterne står i fangstfasen på roten, og kjører derfor før feltets egne:
 * React og feltets `onChange` får verdien etter erstatningen.
 */
export function lyttEtterTekstfelt(regler: () => readonly Autoerstattregel[], rot: Document = document): () => void {
  const vedInndata = (e: Event) => {
    if (kanAutoerstattes(e.target)) erstattIFelt(e.target, (e as InputEvent).inputType, regler())
  }
  const vedTast = (e: KeyboardEvent) => {
    if (e.key !== 'Backspace' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented) return
    if (!kanAutoerstattes(e.target) || !angreIFelt(e.target)) return
    e.preventDefault()
    // Endringen er gjort i feltet selv. En inndatahendelse sier fra til React
    // og feltets `onChange`, som ellers ikke ville sett den.
    e.target.dispatchEvent(new Event('input', { bubbles: true }))
  }
  rot.addEventListener('input', vedInndata, true)
  rot.addEventListener('keydown', vedTast, true)
  return () => {
    rot.removeEventListener('input', vedInndata, true)
    rot.removeEventListener('keydown', vedTast, true)
  }
}
