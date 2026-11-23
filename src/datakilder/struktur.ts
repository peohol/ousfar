/**
 * Strukturkontrollen av svar fra en ekstern kilde: et sikkerhetsnett mot at
 * kilden endrer formen på et objekt, så en tolerant lesing stille gir tomme
 * felt. Kravene står hos hver kilde (`src/cypinfo/struktur.ts`); her er bare
 * kontrollen.
 *
 * Et felt som finnes, men er tomt (en tom liste eller tekst), godtas alltid.
 * Et felt som er borte, eller har en helt annen type, er et avvik, med mindre
 * kravet sier at feltet er valgfritt; da kontrolleres bare typen når det har
 * en verdi.
 *
 * Alt her er rene funksjoner.
 */

export function erObjekt(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export type Form = 'tekst' | 'liste' | 'objekt' | 'sannhet' | 'tall'

export interface Krav {
  /** Feltet, med punktum for et felt i et objekt: `location.genes`. Et objekt som mangler, gjør feltene i det valgfrie. */
  sti: string
  form: Form | readonly Form[]
  /** Feltet kan mangle eller være `null`. Har det en verdi, må den ha formen. */
  valgfri?: boolean
  /** For en liste: feltene hvert element må ha (som tekst), eller `'tekst'` når elementene er tekster. */
  hver?: readonly string[] | 'tekst'
  /** For et objekt: minst ett av disse feltene må være tekst. */
  ettAv?: readonly string[]
}

const FORMNAVN: Record<Form, string> = {
  tekst: 'tekst',
  liste: 'liste',
  objekt: 'objekt',
  sannhet: 'sann/usann',
  tall: 'tall',
}

function formen(verdi: unknown): Form | null {
  if (typeof verdi === 'string') return 'tekst'
  if (Array.isArray(verdi)) return 'liste'
  if (erObjekt(verdi)) return 'objekt'
  if (typeof verdi === 'boolean') return 'sannhet'
  if (typeof verdi === 'number') return 'tall'
  return null
}

function beskriv(verdi: unknown): string {
  if (verdi === undefined) return 'mangler'
  if (verdi === null) return 'er tomt (null)'
  const form = formen(verdi)
  return form ? `er ${FORMNAVN[form]}` : `er ${typeof verdi}`
}

/** Om et element i en liste har feltene som tekst (tomme godtas). */
function elementOk(element: unknown, hver: Krav['hver']): boolean {
  if (hver === undefined) return true
  if (hver === 'tekst') return typeof element === 'string'
  return erObjekt(element) && hver.every((f) => typeof element[f] === 'string')
}

/**
 * Avvikene i formen på ett objekt fra kravene, som korte tekster:
 * «relatedGenes er tekst, ventet liste». Tom liste når formen er som ventet.
 */
export function formavvik(kravene: readonly Krav[], objekt: unknown): string[] {
  if (!erObjekt(objekt)) return [`${beskriv(objekt)}, ventet objekt`]
  const avvik: string[] = []
  for (const krav of kravene) {
    const deler = krav.sti.split('.')
    const forelder = deler.slice(0, -1).reduce<unknown>((o, d) => (erObjekt(o) ? o[d] : undefined), objekt)
    // Et objekt som mangler eller har feil form, er et avvik for seg; feltene i det kontrolleres ikke.
    if (!erObjekt(forelder)) continue
    const verdi = forelder[deler.at(-1)!]
    const former: readonly Form[] = typeof krav.form === 'string' ? [krav.form] : krav.form
    const ventet = former.map((f) => FORMNAVN[f]).join(' eller ')
    if (krav.valgfri && (verdi === undefined || verdi === null)) continue
    const form = formen(verdi)
    if (!form || !former.includes(form)) {
      avvik.push(`${krav.sti} ${beskriv(verdi)}, ventet ${ventet}`)
      continue
    }
    if (form === 'liste' && krav.hver && !(verdi as unknown[]).every((e) => elementOk(e, krav.hver))) {
      const felt = krav.hver === 'tekst' ? 'tekster' : `objekter med ${krav.hver.join(' og ')}`
      avvik.push(`${krav.sti} har elementer som ikke er ${felt}`)
    }
    if (form === 'objekt' && krav.ettAv && !krav.ettAv.some((f) => typeof (verdi as Record<string, unknown>)[f] === 'string')) {
      avvik.push(`${krav.sti} mangler ${krav.ettAv.join(' eller ')}`)
    }
  }
  return avvik
}
