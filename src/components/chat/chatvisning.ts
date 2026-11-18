/**
 * Det chatmenyen regner ut, uten React (docs/gruppechat.md, «Chatmenyen»).
 * Rene funksjoner, så de kan prøves for seg.
 */
import type { Ikonnavn } from '../ikon/register'
import { dagsnokkel, klokkeslett } from '../grupper/gruppechatvisning'

/**
 * Ikonet for chatten. Det egne ikonet `samtale` (en rund snakkeboble, så
 * chatten ikke forveksles med diskusjonene) kommer i en egen leveranse; til
 * det står `comment` her, og bare her.
 */
export const CHATIKON: Ikonnavn = 'comment'

const UKEDAG = new Intl.DateTimeFormat('nb-NO', { weekday: 'short' })
const DATO = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'numeric' })
const DATO_OG_AAR = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'numeric', year: 'numeric' })

const DOGN = 86_400_000

/**
 * Når det sist skjedde noe i samtalen, kort, til lista: klokkeslettet i dag,
 * «I går», ukedagen den siste uka, ellers datoen (med år når det ikke er i år).
 */
export function samtaletid(iso: string | null, naa: Date = new Date()): string {
  if (!iso) return ''
  const tid = new Date(iso)
  if (Number.isNaN(tid.getTime())) return ''
  if (dagsnokkel(iso) === dagsnokkel(naa.toISOString())) return klokkeslett(iso)
  const midnatt = new Date(naa.getFullYear(), naa.getMonth(), naa.getDate()).getTime()
  if (tid.getTime() >= midnatt - DOGN) return 'I går'
  if (tid.getTime() >= midnatt - 6 * DOGN) {
    const dag = UKEDAG.format(tid)
    return dag.charAt(0).toUpperCase() + dag.slice(1)
  }
  return (tid.getFullYear() === naa.getFullYear() ? DATO : DATO_OG_AAR).format(tid)
}

/** Tallet på uleste, som skjermlesere får det. */
export function ulesteTekst(antall: number): string {
  return antall === 1 ? '1 ulest melding' : `${antall} uleste meldinger`
}

/** Navnet på chatknappen og chatboblen, med uleste når det er noen. */
export function chatknappnavn(uleste: number): string {
  return uleste > 0 ? `Chat (${ulesteTekst(uleste)})` : 'Chat'
}
