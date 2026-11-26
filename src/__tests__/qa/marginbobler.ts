/**
 * Snakkeboblene ved sikkerhetsmarginen i nettleseren (#588), delt av
 * kontrollene av THC-syre og benzoylekgonin i urin: hva de sier, hvilken
 * margin pilen faktisk peker på, at de står over eller under bryteren uten å
 * dekke den, innenfor vinduet, og at de gløder.
 */
import { krev, type Side } from './kontroll'

export interface MaltBoble {
  side: 'over' | 'under'
  /** Merket på valget pilen står over. */
  margin: string
  linjer: string[]
}

/** Boblene i `rot` (hele siden når den mangler), kontrollert mot hvor de står. */
export async function marginbobler(side: Side, rot = 'body'): Promise<MaltBoble[]> {
  const malt: (MaltBoble & { midt: number; fri: boolean; inne: boolean; glod: string })[] = await side.locator(rot).first().evaluate((r: Element) =>
    [...r.querySelectorAll<HTMLElement>('.be-marginboble')].map((boble) => {
      const bryter = boble.closest('.be-margin__bryter')!
      const spor = bryter.querySelector('.trinnbryter__spor')!.getBoundingClientRect()
      const valg = [...bryter.querySelectorAll('.trinnbryter__valg')]
      const b = boble.getBoundingClientRect()
      const pil = getComputedStyle(boble, '::after')
      const pilX = b.left + parseFloat(pil.left)
      const truffet = valg.find((v) => {
        const r = v.getBoundingClientRect()
        return pilX >= r.left && pilX <= r.right
      })
      const over = boble.closest('.be-margin__bobler--over') !== null
      return {
        side: over ? ('over' as const) : ('under' as const),
        margin: truffet?.textContent ?? '?',
        linjer: [...boble.querySelectorAll('.be-marginboble__linje')].map((l) => l.textContent ?? ''),
        // Pilen midt på valget, boblen på riktig side av bryteren og innenfor vinduet.
        midt: truffet ? Math.abs(pilX - (truffet.getBoundingClientRect().left + truffet.getBoundingClientRect().width / 2)) : 99,
        fri: over ? b.bottom <= spor.top : b.top >= spor.bottom,
        inne: b.left >= 0 && b.right <= document.documentElement.clientWidth,
        glod: getComputedStyle(boble).animationName,
      }
    }),
  )
  for (const m of malt) {
    krev(m.midt <= 3, `pilen står ${Math.round(m.midt)} px fra midten av «${m.margin}»`)
    krev(m.fri, `boblen ved ${m.margin} dekker bryteren`)
    krev(m.inne, `boblen ved ${m.margin} går ut av vinduet`)
    krev(m.glod === 'marginboble-glod', `boblen ved ${m.margin} gløder ikke (${m.glod})`)
  }
  return malt.map(({ side: s, margin, linjer }) => ({ side: s, margin, linjer }))
}

/** Boblene som tekst i en rapport: «over 99 %: Ikke nødvendigvis nytt». */
export const somTekst = (bobler: MaltBoble[]): string =>
  bobler.map((b) => `${b.side} ${b.margin}: ${b.linjer.join(' / ')}`).join('; ')
