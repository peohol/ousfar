import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Shortcut } from './Shortcut'

/**
 * - `primary`: aksentflate, sidens hovedhandling
 * - `sekundar`: som hovedknappen, med ikonet i en sirkel, men på en lys
 *   aksentflate: handlinger som fører videre uten å være sidens hovedhandling,
 *   som «Gå til gruppeoversikten» og «Til gruppen»
 * - `subtle`: rolig, hevet flate, for det som står ved siden av
 * - `kant`: liten pille med hårlinje, for handlinger på en rad (Atlas)
 *
 * En handling skal se ut som en knapp, ikke som en lenke i teksten
 * (docs/designsystem.md, «Knapper»). Menyvalg er ikke knapper.
 */
export type Knappevariant = 'primary' | 'sekundar' | 'subtle' | 'kant'

/** Det knappen og knappelenken har felles. */
interface Knappedeler {
  variant?: Knappevariant
  icon?: ReactNode
  /** Tasten som gjør det samme som et klikk, f.eks. «Esc» eller «Enter». */
  shortcut?: string
  children: ReactNode
}

export type ButtonProps = Knappedeler & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export type KnappelenkeProps = Knappedeler & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> & { href: string }

/** Klassene til en knapp av `variant`, for det som må tegnes som en knapp uten å være {@link Button}. */
export function knappeklasse(variant: Knappevariant, className?: string): string {
  return ['knapp', `knapp--${variant}`, className].filter(Boolean).join(' ')
}

/** Ikonet, teksten og hurtigtasten, likt i knappen og knappelenken. */
export function Knappeinnhold({ icon, shortcut, children }: Omit<Knappedeler, 'variant'>) {
  return (
    <>
      {icon && <span className="knapp__ikon">{icon}</span>}
      <span className="knapp__tekst">{children}</span>
      {shortcut && <Shortcut>{shortcut}</Shortcut>}
    </>
  )
}

/**
 * Appens knappekomponent. Hurtigtasten vises som en merkelapp og meldes til
 * hjelpemiddelteknologi med `aria-keyshortcuts`, slik at knapp og tastatur
 * alltid forteller det samme. Referansen peker på selve knappen, for den som
 * skal feste noe til der den står — som kopikvitteringen.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', icon, shortcut, children, className, ...rest },
  ref,
) {
  return (
    <button ref={ref} type="button" className={knappeklasse(variant, className)} aria-keyshortcuts={ariaKey(shortcut)} {...rest}>
      <Knappeinnhold icon={icon} shortcut={shortcut}>
        {children}
      </Knappeinnhold>
    </button>
  )
})

/**
 * En lenke som ser ut som {@link Button}: for en handling som fører til en
 * annen side i appen, så den også kan åpnes i en ny fane.
 */
export const Knappelenke = forwardRef<HTMLAnchorElement, KnappelenkeProps>(function Knappelenke(
  { variant = 'sekundar', icon, shortcut, children, className, ...rest },
  ref,
) {
  return (
    <a ref={ref} className={knappeklasse(variant, className)} aria-keyshortcuts={ariaKey(shortcut)} {...rest}>
      <Knappeinnhold icon={icon} shortcut={shortcut}>
        {children}
      </Knappeinnhold>
    </a>
  )
})

/** «Esc» → «Escape», slik `aria-keyshortcuts` vil ha det. */
function ariaKey(shortcut: string | undefined): string | undefined {
  if (!shortcut) return undefined
  const map: Record<string, string> = { Esc: 'Escape', '↵': 'Enter' }
  return map[shortcut] ?? shortcut
}
