import { forwardRef, type ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  /** Venstrejustert innhold i stedet for midtstilt. */
  align?: 'center' | 'start'
  className?: string
}

/**
 * Hevet flate som samler én ting av gangen og gir tydelig visuell avgrensning.
 *
 * Et klikk på kortet lar siden ligge i ro: brukeren styrer rullingen selv.
 * Piltastene hopper fortsatt mellom kortene (`useKortHopp`).
 */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { children, align = 'center', className },
  ref,
) {
  return (
    <section ref={ref} className={['kort', `kort--${align}`, className].filter(Boolean).join(' ')}>
      {children}
    </section>
  )
})
