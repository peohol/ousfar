/**
 * Personsøket (docs/fagmiljoer.md, «Personsøket»): der noen skal velge en
 * annen person, søkes det etter navnet eller brukernavnet i stedet for at
 * brukernavnet må skrives nøyaktig. Databasen sammenligner og rangerer
 * (`intern.personsoktreff`); her er formen på treffene og reglene appen
 * holder seg til før den spør.
 *
 * Verdier som ikke har formen, blir tomme i stedet for å velte visningen.
 */
import type { Profilkort } from '@delt/profil'
import { erObjekt, tekst, tekstEllerNull } from '../ideer/lesing'

/** Søket venter så lenge etter siste tastetrykk, og trenger så mange tegn (som databasen). */
export const SOKEPAUSE_MS = 250
export const SOK_MINST = 2

/**
 * Et treff. Søkene etter gruppe- og medlemskandidater gir også bildet,
 * stillingen og det primære fagmiljøet; søket etter mottakere av
 * direktemeldinger bare navnet og brukernavnet.
 */
export interface Persontreff extends Pick<Profilkort, 'id' | 'username' | 'first_name' | 'last_name'> {
  avatar_path?: string | null
  updated_at?: string
  stilling?: string | null
  fagmiljo?: string | null
}

/** Henter treffene for et søk. */
export type Personkilde = (sok: string) => Promise<Persontreff[]>

/** Sant når søket er langt nok til å spørre databasen. */
export function kanSoke(sok: string): boolean {
  return sok.replace(/\s+/g, '').length >= SOK_MINST
}

export function lesPersontreff(verdi: unknown): Persontreff[] {
  if (!Array.isArray(verdi)) return []
  return verdi.flatMap((t) =>
    erObjekt(t) && typeof t.id === 'string'
      ? [
          {
            id: t.id,
            username: tekst(t.username),
            first_name: tekst(t.first_name),
            last_name: tekst(t.last_name),
            ...('avatar_path' in t && {
              avatar_path: tekstEllerNull(t.avatar_path),
              updated_at: tekst(t.updated_at),
              stilling: tekstEllerNull(t.stilling),
              fagmiljo: tekstEllerNull(t.fagmiljo),
            }),
          },
        ]
      : [],
  )
}

/** Linja under navnet: brukernavnet, stillingen og fagmiljøet når de finnes. */
export function personlinje(t: Persontreff): string {
  return [`@${t.username}`, t.stilling, t.fagmiljo].filter(Boolean).join(' · ')
}
