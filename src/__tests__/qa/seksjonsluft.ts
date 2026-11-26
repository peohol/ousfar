/**
 * Luften rundt «Forklaring» under profilene og figuren i nettleseren (#592),
 * delt av kontrollene av THC-syre og benzoylekgonin i urin: skillelinjen over
 * «Forklaring» har like mye luft over seg (fra det nederste i figuren) som
 * under seg (til overskriften), og under «Forklaring» er det ingen luft utover
 * kortets egen, verken lukket eller åpen.
 */
import { krev, type Side } from './kontroll'

export interface Seksjonsluft {
  over: number
  under: number
  bunn: number
}

/** Måler luften i resultatkortet og krever at den stemmer. */
export async function seksjonsluft(side: Side): Promise<Seksjonsluft> {
  const luft: Seksjonsluft = await side.locator('.be-seksjoner').first().evaluate((seksjoner: Element) => {
    const nederst = (el: Element) =>
      Math.max(
        el.getBoundingClientRect().bottom,
        ...[...el.querySelectorAll('*')]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height > 0)
          .map((r) => r.bottom),
      )
    const profiler = seksjoner.querySelector('.be-profiler')!
    const detalj = seksjoner.querySelector('.detalj') as HTMLDetailsElement
    const tittel = detalj.querySelector('.detalj__tittel')!
    const linje = detalj.getBoundingClientRect().top + parseFloat(getComputedStyle(detalj).borderTopWidth)
    const kort = seksjoner.closest('.be-resultat')!
    const k = getComputedStyle(kort)
    const kortBunn = kort.getBoundingClientRect().bottom - parseFloat(k.paddingBottom) - parseFloat(k.borderBottomWidth)
    const innhold = detalj.open ? detalj.querySelector('.detalj__inner')! : tittel
    return {
      over: detalj.getBoundingClientRect().top - nederst(profiler),
      under: tittel.getBoundingClientRect().top + parseFloat(getComputedStyle(tittel).paddingTop) - linje,
      bunn: kortBunn - nederst(innhold),
    }
  })
  krev(Math.abs(luft.over - luft.under) <= 1, `luften over skillelinjen er ${luft.over} px, under ${luft.under} px`)
  krev(Math.abs(luft.bunn) <= 1, `${luft.bunn} px ekstra luft under «Forklaring»`)
  return luft
}

/** Luften som tekst i en rapport. */
export const somLuft = (l: Seksjonsluft): string => `over/under linjen ${Math.round(l.over)}/${Math.round(l.under)} px, bunn ${Math.round(l.bunn)} px`
