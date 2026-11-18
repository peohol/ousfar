import { useId, type ComponentType } from 'react'
import { SYSTEM, type Bevegelse, type Tema, type Valg, type Valgstyring } from '../../domain/systemvalg'
import { VISNINGSENHETER, type Visningsenhet } from '../../enheter/konsentrasjon'
import { useMaleenhet } from '../../enheter/Maleenhet'
import { useShortcutVisibility } from '../../hooks/useShortcutVisibility'
import { useBevart } from '../../oppdatering/Bevaring'
import { Bryter } from '../Bryter'
import { Fanevalg, fanepanelId, faneId, type Fanedefinisjon } from '../Fanevalg'
import { Ikon } from '../ikon/Ikon'
import type { Ikonnavn } from '../ikon/register'
import { Modallag } from '../Modallag'
import { Trinnbryter, type Trinnvalg } from '../Trinnbryter'
import '../../styles/innstillinger.css'

/** Det appen holder av temaet og bevegelsen, som innstillingene viser og endrer. */
export interface Visningsvalg {
  tema: Valgstyring<Tema>
  bevegelse: Valgstyring<Bevegelse>
}

/**
 * En fane i Innstillinger. Innholdet får de samme valgene som vinduet.
 * Chatvalgene fra direktemeldingene (D5: «Tillat direktemeldinger» og «Vis
 * når jeg er aktiv», samme kontoinnstilling som nederst i chatmenyen) legges
 * til her som fanen `chat` når de finnes.
 */
export interface Innstillingsfane extends Fanedefinisjon {
  Innhold: ComponentType<Visningsvalg>
}

/**
 * Det tredje valget på begge bryterne: å la nettleseren og maskinen avgjøre.
 * «Følg system» får ikke plass ved siden av de to andre, og står som «System».
 */
const FOLG_SYSTEM = { verdi: SYSTEM, merke: 'System', navn: 'Følg system' } as const

const TEMAVALG: readonly Trinnvalg<Valg<Tema>>[] = [
  { verdi: 'lyst', merke: 'Lyst', ikon: 'sun' },
  { verdi: 'moerkt', merke: 'Mørkt', ikon: 'moon' },
  { ...FOLG_SYSTEM, ikon: 'skjerm' },
]

const BEVEGELSESVALG: readonly Trinnvalg<Valg<Bevegelse>>[] = [
  { verdi: 'redusert', merke: 'Ja' },
  { verdi: 'full', merke: 'Nei' },
  FOLG_SYSTEM,
]

const ENHETSVALG: readonly Trinnvalg<Visningsenhet>[] = VISNINGSENHETER.map((e) => ({ verdi: e, merke: e }))

/** Visning: hurtigtastene, temaet, bevegelsen og måleenheten konsentrasjonene vises i. Samme valg som de gamle preferansene. */
function Visning({ tema, bevegelse }: Visningsvalg) {
  const hurtigtaster = useShortcutVisibility()
  const maleenhet = useMaleenhet()
  return (
    <div className="innstillinger__liste">
      <Bryter className="innstillinger__bryter" pa={hurtigtaster.visible} onEndre={hurtigtaster.toggle}>
        <Ikon navn="keys" storrelse="ui" />
        Vis hurtigtaster
      </Bryter>
      <Trevalg ikon="tema" tekst="Tema" valg={TEMAVALG} verdi={tema.valg} onVelg={tema.velg} />
      <Trevalg ikon="bevegelse" tekst="Reduser bevegelse" valg={BEVEGELSESVALG} verdi={bevegelse.valg} onVelg={bevegelse.velg} />
      <Trevalg ikon="serum" tekst="Måleenhet" valg={ENHETSVALG} verdi={maleenhet.enhet} onVelg={maleenhet.velg} />
    </div>
  )
}

/** Fanene, i rekkefølgen de står. */
export const INNSTILLINGSFANER: readonly Innstillingsfane[] = [{ id: 'visning', navn: 'Visning', Innhold: Visning }]

/** Det som står under «Innstillinger» i kontomenyen: fanene, som «Visning og chat». */
export function innstillingsforklaring(faner: readonly Fanedefinisjon[] = INNSTILLINGSFANER): string {
  const navn = faner.map((f, i) => (i === 0 ? f.navn : f.navn.toLocaleLowerCase('nb')))
  return navn.length <= 1 ? (navn[0] ?? '') : `${navn.slice(0, -1).join(', ')} og ${navn.at(-1)}`
}

/**
 * «Innstillinger» fra kontomenyen (D6; skisse 21): et vindu med en fane per
 * slags innstilling. Med én fane står den uten fanerad. Valgt fane huskes,
 * også etter en oppdatering av appen.
 */
export function Innstillinger({
  apen,
  onLukk,
  faner = INNSTILLINGSFANER,
  ...valg
}: Visningsvalg & { apen: boolean; onLukk: () => void; faner?: readonly Innstillingsfane[] }) {
  const felles = useId()
  const [valgt, setValgt] = useBevart('innstillinger/fane', faner[0]?.id ?? '')
  const fane = faner.find((f) => f.id === valgt) ?? faner[0]
  if (!fane) return null
  const flere = faner.length > 1
  return (
    <Modallag apen={apen} onLukk={onLukk} tittel="Innstillinger" meta="Konto" ikon="gears" ark>
      {flere && (
        <Fanevalg
          faner={faner}
          fane={fane.id}
          felles={felles}
          etikett="Innstillinger"
          className="innstillinger__faner"
          faneklasse="innstillinger__fane"
          onVelg={setValgt}
        />
      )}
      {faner.map((f) => (
        <div
          key={f.id}
          {...(flere && { id: fanepanelId(felles, f.id), role: 'tabpanel', 'aria-labelledby': faneId(felles, f.id) })}
          hidden={f.id !== fane.id}
        >
          {f.id === fane.id && <f.Innhold {...valg} />}
        </div>
      ))}
    </Modallag>
  )
}

/** Et valg med flere enn to muligheter: navnet til venstre, trinnbryteren til høyre (under på smale flater). */
function Trevalg<T>({
  ikon,
  tekst,
  valg,
  verdi,
  onVelg,
}: {
  ikon: Ikonnavn
  tekst: string
  valg: readonly Trinnvalg<T>[]
  verdi: T
  onVelg: (verdi: T) => void
}) {
  return (
    <div className="innstillinger__trinn" data-ih="">
      <span className="innstillinger__navn" aria-hidden="true">
        <Ikon navn={ikon} storrelse="ui" />
        {tekst}
      </span>
      <Trinnbryter etikett={tekst} valg={valg} verdi={verdi} onVelg={onVelg} />
    </div>
  )
}
