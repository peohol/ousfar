import { Suspense, useState, type ReactNode } from 'react'

/**
 * Grensen rundt en side eller et vindu som hentes når det vises
 * (`src/oppdatering/senere.ts`). Mens koden hentes, står plassen tom og sier
 * at den laster; resten av appen står som før. Uten en slik grense ville hele
 * appen ventet.
 */
export function Senere({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="senere" aria-busy="true" />}>{children}</Suspense>
}

/**
 * Et vindu som hentes første gang det åpnes, og deretter blir stående som
 * før, så lukkingen og det som husker hvor man var, virker som ellers. Til da
 * vises ingenting.
 */
export function NarApnet({ apen, children }: { apen: boolean; children: ReactNode }) {
  const [apnet, setApnet] = useState(apen)
  if (apen && !apnet) setApnet(true)
  return apnet ? <Suspense fallback={null}>{children}</Suspense> : null
}
