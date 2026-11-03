import { useLayoutEffect, useState, type ReactNode } from 'react'
import { TOPPMENYSPOR, useMeldSpor, type Toppmenygruppe, type Toppmenyspor } from './Toppmenykilde'

export interface ToppmenyProps {
  /** Sidemenyen — knappen som åpner den, først i menyen. */
  meny: ReactNode
  /** Globalt fagsøk. Tar resten av bredden, og har forrang på smale flater. */
  sok?: ReactNode
  /** Knappene foran kontoen: idéene, adminmenyen og varslene. */
  verktoy?: ReactNode
  /** Kontoen, sist i menyen. */
  konto: ReactNode
}

/**
 * Den ene faste toppmenyen: en svevende pille øverst i vinduet, over alt
 * innhold, i rekkefølgen sidemeny · fagsøk · sidens egne handlinger · skille
 * · idéer, adminmeny, varsler og konto. Ingen logo.
 *
 * Sidene fyller sine plasser i menyen med `ToppmenyInnhold` (se
 * `TOPPMENYSPOR`). Får de ikke plass i menyen ved siden av et brukbart
 * fagsøk, og alltid på smale flater, flyttes de til en dokk nederst i
 * vinduet (se `useDokk`). Får ikke alt plass på én rad der, står hovedgruppen (søket i siden og
 * hovedhandlingen) på første rad og resten på andre.
 *
 * Menyen tar `--toppmeny-offset` av vinduet øverst; innhold og ankere legger
 * seg under den (se `tokens.css`).
 */
export function Toppmeny({ meny, sok, verktoy, konto }: ToppmenyProps) {
  const dokk = useDokk()

  return (
    <header className="toppmeny" data-toppmeny="">
      <nav className="toppmeny__pille" aria-label="Toppmeny">
        {meny}
        <div className="toppmeny__sok">{sok}</div>
        <div ref={dokk} className="toppmeny__kontekst" role="group" aria-label="Sidehandlinger">
          {(Object.keys(TOPPMENYSPOR) as Toppmenygruppe[]).map((gruppe) => (
            <div key={gruppe} className="toppmeny__gruppe" data-gruppe={gruppe}>
              {TOPPMENYSPOR[gruppe].map((navn) => (
                <Spor key={navn} navn={navn} />
              ))}
            </div>
          ))}
        </div>
        <span className="toppmeny__skille" aria-hidden="true" />
        {verktoy && <div className="toppmeny__verktoy">{verktoy}</div>}
        {konto}
      </nav>
    </header>
  )
}

function Spor({ navn }: { navn: Toppmenyspor }) {
  return <div ref={useMeldSpor(navn)} className="toppmeny__spor" data-spor={navn} />
}

/**
 * Smal flate, som i CSS-en: her står sidens plasser alltid i dokken, med
 * knapper i trykkstørrelse.
 */
const SMAL_FLATE = '(max-width: 47.5em)'

/**
 * Trinnene menyen går gjennom når plassen ikke strekker til, fra romsligst
 * til trangest:
 *
 * - `hel`: alt i toppmenyen, med tekst på knappene og søket i siden som felt
 * - `kompakt`: de sekundære handlingene og søket i siden krymper til runde
 *   ikonknapper (`data-kompakt` på toppmenyen)
 * - `dokk`: sidens plasser flytter til dokken nederst i vinduet, kompakte
 *   (også `data-dokk` på dokumentet, for det som skal gi plass til dokken)
 */
export const TRINN = ['hel', 'kompakt', 'dokk'] as const
export type Trinn = (typeof TRINN)[number]

const KOMPAKT = 'data-kompakt'
const DOKK = 'data-dokk'
/** Merket på toppmenyen mens trinnene prøves (se `toppmeny.css`). */
const MALER = 'data-maler'

/** Dokkens målte høyde, på dokumentet (se `tokens.css`). */
const DOKKHOYDE = '--dokkhoyde'

/** Hvor smalt fagsøket kan bli før sidens plasser flytter til dokken (`tokens.css`). */
const FAGSOK_MINST = '--bredde-fagsok-minst'

/** Hvor bredt søket på siden er i toppmenyen mens det brukes (`tokens.css`). */
const SIDESOK_I_BRUK = '--bredde-sidesok-i-bruk'

/** Merket dokken bærer når gruppene står på hver sin rad (se `toppmeny.css`). */
const TO_RADER = 'data-to-rader'

/**
 * Hvor mye plass et romsligere trinn må ha til overs før menyen går tilbake
 * til det (se `velgTrinn`).
 */
const SLINGRING = 8

/** Hvor bredt det blir å sette bitene etter hverandre, med mellomrom imellom. */
export function samletBredde(bredder: readonly number[], mellomrom: number) {
  return bredder.reduce((sum, bredde) => sum + bredde, 0) + mellomrom * Math.max(0, bredder.length - 1)
}

/** Om bitene får plass etter hverandre på én rad (en halv piksel slingring for avrunding). */
export function faarPlass(bredder: readonly number[], mellomrom: number, plass: number) {
  return samletBredde(bredder, mellomrom) <= plass + 0.5
}

/**
 * Om gruppene i dokken trenger hver sin rad: når de ikke får plass ved siden
 * av hverandre, med mellomrommet mellom dem.
 */
export function trengerToRader(bredder: readonly number[], mellomrom: number, plass: number) {
  return !faarPlass(bredder, mellomrom, plass)
}

const px = (verdi: string) => parseFloat(verdi) || 0

/** En lengde fra et token (`rem` eller `px`) i piksler. */
function lengde(verdi: string) {
  const tall = parseFloat(verdi) || 0
  return verdi.trim().endsWith('rem') ? tall * px(getComputedStyle(document.documentElement).fontSize) : tall
}

/** Elementene som står i raden, og ikke er skjult eller festet et annet sted. */
function iRaden(elementer: Iterable<Element>) {
  return Array.from(elementer).filter((element): element is HTMLElement => {
    if (!(element instanceof HTMLElement) || element.getClientRects().length === 0) return false
    const plassering = getComputedStyle(element).position
    return plassering !== 'fixed' && plassering !== 'absolute'
  })
}

/** Bredden et element tar i en rad: selve boksen og margen rundt. */
function ytreBredde(element: HTMLElement) {
  const stil = getComputedStyle(element)
  return element.getBoundingClientRect().width + px(stil.marginLeft) + px(stil.marginRight)
}

/**
 * Hvor bred raden av sidens plasser er når ingenting i den presses sammen:
 * knappene i hver gruppe, og gruppene etter hverandre. Målt på knappene og
 * ikke på gruppene, for i toppmenyen kan gruppene krympe.
 */
function plassenesBredde(dokk: HTMLElement, grupper: readonly HTMLElement[], sidesok?: number) {
  const mellomrom = px(getComputedStyle(dokk).columnGap)
  const bredde = (element: HTMLElement) =>
    sidesok !== undefined && element.matches('.sidesok') ? sidesok : ytreBredde(element)
  const bredder = iRaden(grupper).map((gruppe) =>
    samletBredde(iRaden(gruppe.querySelectorAll(':scope > .toppmeny__spor > *')).map(bredde), px(getComputedStyle(gruppe).columnGap)),
  )
  return samletBredde(bredder, mellomrom)
}

/**
 * Det romsligste trinnet som får plass. På smale flater står plassene alltid
 * i dokken. Et romsligere trinn enn det menyen står i nå, må få plass med
 * slingring, så menyen ikke vipper fram og tilbake ved grensen.
 */
export function velgTrinn(smal: boolean, naa: Trinn, faarPlassMed: (trinn: Trinn, slingring: boolean) => boolean): Trinn {
  if (smal) return 'dokk'
  const grense = TRINN.indexOf(naa)
  return TRINN.find((trinn, i) => trinn === 'dokk' || faarPlassMed(trinn, i < grense)) ?? 'dokk'
}

/**
 * Om sidens plasser får plass i toppmenyen, ved siden av alt annet i menyen,
 * både når søket på siden står i ro og når det brukes:
 *
 * - i ro med fagsøket i minst `--bredde-fagsok-minst`;
 * - i bruk, i hele `--bredde-sidesok-i-bruk`, med fagsøket som bare lupen
 *   (det gir fra seg plassen mens søket på siden brukes).
 *
 * Mens søket på siden brukes (`soker`), kan bredden i ro ikke måles; da
 * gjelder bare det siste.
 */
function faarPlassITopp(pille: HTMLElement, dokk: HTMLElement, grupper: readonly HTMLElement[], slingring: number, soker: boolean) {
  const plassene = plassenesBredde(dokk, grupper)
  if (plassene === 0) return true
  const stil = getComputedStyle(pille)
  const sok = pille.querySelector<HTMLElement>(':scope > .toppmeny__sok')
  const resten = iRaden(pille.children)
    .filter((element) => element !== dokk && element !== sok)
    .map(ytreBredde)
  const plass = pille.clientWidth - px(stil.paddingLeft) - px(stil.paddingRight) - slingring
  const raden = (sidens: number, fagsok: number) =>
    faarPlass([...resten, sidens, ...(sok ? [fagsok] : [])], px(stil.columnGap), plass)
  const iBruk = raden(
    plassenesBredde(dokk, grupper, lengde(stil.getPropertyValue(SIDESOK_I_BRUK))),
    sok ? px(getComputedStyle(sok).minWidth) : 0,
  )
  return iBruk && (soker || raden(plassene, lengde(stil.getPropertyValue(FAGSOK_MINST))))
}

/**
 * Holder sidens plasser i orden:
 *
 * - De står i toppmenyen så lenge de får plass der ved siden av alt det andre
 *   og et fagsøk som fortsatt er et søkefelt (`--bredde-fagsok-minst`): først
 *   med tekst, så kompakte. Ellers flytter de til dokken nederst i vinduet, og
 *   på smale flater står de alltid der (se `TRINN`). Plassen måles, for hvor
 *   mye som står i menyen, kommer an på siden og på hvem som er logget inn.
 * - Får ikke gruppene plass på én rad i dokken, står de på hver sin
 *   (`data-to-rader`), og dokken blir ikke bredere enn den bredeste raden.
 *   Det kan ikke CSS avgjøre selv: en rad som brytes, gjør boksen rundt like
 *   bred som det er plass til.
 * - Søket på siden får alltid plass i toppmenyen også mens det brukes, da i
 *   hele `--bredde-sidesok-i-bruk`, så det som skrives, synes. Mens det
 *   søkes, går menyen bare til et trangere trinn (når vinduet blir smalere),
 *   aldri tilbake, så feltet ikke flytter seg under markøren uten grunn.
 * - Høyden meldes til resten av appen som `--dokkhoyde`, så siden og det som
 *   står over dokken, gir plass også når den går over to rader. Står plassene
 *   i toppmenyen eller er de tomme, gjelder høyden på én rad fra `tokens.css`.
 *
 * Målingen gjøres før nettleseren tegner, så menyen aldri vises halvveis.
 */
function useDokk() {
  const [dokk, setDokk] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const pille = dokk?.parentElement
    const meny = pille?.parentElement
    if (!dokk || !pille || !meny) return
    const rot = document.documentElement
    const smal = typeof window.matchMedia === 'function' ? window.matchMedia(SMAL_FLATE) : null
    const grupper = Array.from(dokk.querySelectorAll<HTMLElement>(':scope > .toppmeny__gruppe'))
    const maal = () => {
      const soker = dokk.querySelector('.sidesok')?.contains(document.activeElement) ?? false
      const naa: Trinn = rot.hasAttribute(DOKK) ? 'dokk' : meny.hasAttribute(KOMPAKT) ? 'kompakt' : 'hel'
      // Knappene er like brede i toppmenyen og i dokken, så hvert trinn kan
      // prøves med bare `data-kompakt`, som bare rører menyen. Mens det
      // måles, står overgangene stille, så bredden som måles, er den
      // knappene får, og ikke en underveis.
      meny.setAttribute(MALER, '')
      const valgt = velgTrinn(!!smal?.matches, naa, (prov, slingring) => {
        meny.toggleAttribute(KOMPAKT, prov !== 'hel')
        return faarPlassITopp(pille, dokk, grupper, slingring ? SLINGRING : 0, soker)
      })
      // Mens det søkes på siden, går menyen bare til et trangere trinn når
      // feltet ikke lenger får plass (som på en smal flate), aldri tilbake:
      // feltet skal ikke flytte seg under markøren uten grunn.
      const trinn = soker && TRINN.indexOf(valgt) < TRINN.indexOf(naa) ? naa : valgt
      meny.toggleAttribute(KOMPAKT, trinn !== 'hel')
      rot.toggleAttribute(DOKK, trinn === 'dokk')
      // Det valgte trinnet slår igjennom før overgangene slås på igjen, så
      // ingenting glir fra et av forsøkene.
      void meny.offsetWidth
      meny.removeAttribute(MALER)
      const stil = getComputedStyle(dokk)
      const fast = stil.position === 'fixed'
      if (!fast) dokk.removeAttribute(TO_RADER)
      else if (!soker) {
        const plass =
          rot.clientWidth -
          px(stil.left) -
          px(stil.right) -
          px(stil.paddingLeft) -
          px(stil.paddingRight) -
          px(stil.borderLeftWidth) -
          px(stil.borderRightWidth)
        const bredder = iRaden(grupper).map((g) => g.getBoundingClientRect().width)
        dokk.toggleAttribute(TO_RADER, trengerToRader(bredder, px(stil.columnGap), plass))
      }
      const hoyde = dokk.getBoundingClientRect().height
      if (hoyde > 0 && fast) rot.style.setProperty(DOKKHOYDE, `${hoyde}px`)
      else rot.style.removeProperty(DOKKHOYDE)
    }
    // Knappene som kommer og går (sidens og verktøyenes), og vinduets bredde.
    const vakt = typeof ResizeObserver === 'function' ? new ResizeObserver(maal) : null
    for (const element of [dokk, ...grupper, ...pille.children]) {
      if (!element.classList.contains('toppmeny__sok')) vakt?.observe(element)
    }
    window.addEventListener('resize', maal)
    maal()
    return () => {
      vakt?.disconnect()
      window.removeEventListener('resize', maal)
      dokk.removeAttribute(TO_RADER)
      meny.removeAttribute(KOMPAKT)
      rot.removeAttribute(DOKK)
      rot.style.removeProperty(DOKKHOYDE)
    }
  }, [dokk])

  return setDokk
}
