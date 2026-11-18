/**
 * «Siste aktivitet» på gruppesiden: lesingen av `gruppeaktivitet()` og
 * radene slik det felles oppsummeringskortet viser dem (`Hendelse`). Rene
 * funksjoner; kallet står i `api.ts`, og hva databasen tar med, i migrasjonen
 * `*_gruppeaktivitet.sql`.
 *
 * Hver rad fører til selve hendelsen: idéen eller oppgaven i gruppens
 * arbeidsflate, kommentaren eller tråden gjennom direktelenken, og chatten.
 */
import { visningsnavn } from '@delt/profil'
import type { Hendelse } from '../components/oppsummering/hendelse'
import { lenkeadresse } from '../direktelenker/mal'
import { gruppeadresse } from '../domain/rute'
import { erObjekt, tall, tekst, tekstEllerNull } from '../ideer/lesing'

type Person = { username: string; first_name: string; last_name: string } | null

interface Felles {
  tid: string
  ulest: boolean
}

export type Gruppehendelse = Felles &
  (
    | { slag: 'ide'; ide: string; tittel: string; aktor: Person }
    | { slag: 'idekommentar'; ide: string; kommentar: string; tittel: string; aktor: Person }
    | { slag: 'oppgave'; oppgave: string; tittel: string; hva: 'opprettet' | 'endret' | 'fullfort'; tildelt_meg: boolean }
    | { slag: 'diskusjon'; diskusjon: string; tittel: string; aktor: Person }
    | { slag: 'diskusjonskommentar'; diskusjon: string; kommentar: string; tittel: string; aktor: Person }
    | { slag: 'chat'; uleste: number }
  )

const lesPerson = (verdi: unknown): Person =>
  erObjekt(verdi) ? { username: tekst(verdi.username), first_name: tekst(verdi.first_name), last_name: tekst(verdi.last_name) } : null

const OPPGAVEHVA = ['opprettet', 'endret', 'fullfort'] as const

/** Én rad fra databasen, eller `null` når den ikke har formen (den hoppes over). */
function lesRad(verdi: unknown): Gruppehendelse | null {
  if (!erObjekt(verdi)) return null
  const tid = tekst(verdi.tid)
  if (!tid) return null
  const felles = { tid, ulest: verdi.ulest === true }
  const tittel = tekst(verdi.tittel)
  const aktor = lesPerson(verdi.aktor)
  const ide = tekstEllerNull(verdi.ide)
  const diskusjon = tekstEllerNull(verdi.diskusjon)
  const kommentar = tekstEllerNull(verdi.kommentar)
  switch (verdi.slag) {
    case 'ide':
      return ide ? { ...felles, slag: 'ide', ide, tittel, aktor } : null
    case 'idekommentar':
      return ide && kommentar ? { ...felles, slag: 'idekommentar', ide, kommentar, tittel, aktor } : null
    case 'oppgave': {
      const oppgave = tekstEllerNull(verdi.oppgave)
      const hva = OPPGAVEHVA.find((h) => h === verdi.hva) ?? 'endret'
      return oppgave ? { ...felles, slag: 'oppgave', oppgave, tittel, hva, tildelt_meg: verdi.tildelt_meg === true } : null
    }
    case 'diskusjon':
      return diskusjon ? { ...felles, slag: 'diskusjon', diskusjon, tittel, aktor } : null
    case 'diskusjonskommentar':
      return diskusjon && kommentar ? { ...felles, slag: 'diskusjonskommentar', diskusjon, kommentar, tittel, aktor } : null
    case 'chat':
      return { ...felles, slag: 'chat', uleste: tall(verdi.uleste) }
    default:
      return null
  }
}

export function lesGruppeaktivitet(verdi: unknown): Gruppehendelse[] {
  return Array.isArray(verdi) ? verdi.map(lesRad).filter((r): r is Gruppehendelse => r !== null) : []
}

const navn = (p: Person) => (p ? visningsnavn(p) : 'En tidligere bruker')

const OPPGAVETEKST: Readonly<Record<'opprettet' | 'endret' | 'fullfort', string>> = {
  opprettet: 'er opprettet',
  endret: 'er oppdatert',
  fullfort: 'er fullført',
}

/** Raden slik oppsummeringskortet viser den, med lenken til selve hendelsen. */
export function tilHendelse(gruppe: string, h: Gruppehendelse): Hendelse {
  const felles = { tid: h.tid, ulest: h.ulest || undefined }
  switch (h.slag) {
    case 'ide':
      return { ...felles, id: `ide:${h.ide}`, ikon: 'idea', tittel: `${navn(h.aktor)} la inn idéen «${h.tittel}»`, hvor: 'Idé', til: gruppeadresse(gruppe, 'ideer', h.ide) }
    case 'idekommentar':
      return {
        ...felles,
        id: `idekommentar:${h.kommentar}`,
        ikon: 'comment',
        tittel: `${navn(h.aktor)} kommenterte idéen «${h.tittel}»`,
        hvor: 'Idé',
        til: lenkeadresse({ slag: 'ide', id: h.ide, kommentar: h.kommentar }),
      }
    case 'oppgave':
      return {
        ...felles,
        id: `oppgave:${h.oppgave}`,
        ikon: 'oppgaver',
        tittel: `Oppgaven «${h.tittel}» ${OPPGAVETEKST[h.hva]}`,
        hvor: h.tildelt_meg ? 'Oppgave · Tildelt deg' : 'Oppgave',
        til: gruppeadresse(gruppe, 'oppgaver', h.oppgave),
      }
    case 'diskusjon':
      return {
        ...felles,
        id: `diskusjon:${h.diskusjon}`,
        ikon: 'diskusjon',
        tittel: `${navn(h.aktor)} startet tråden «${h.tittel}»`,
        hvor: 'Diskusjon',
        til: lenkeadresse({ slag: 'diskusjon', id: h.diskusjon, kommentar: null }),
      }
    case 'diskusjonskommentar':
      return {
        ...felles,
        id: `diskusjonskommentar:${h.kommentar}`,
        ikon: 'comment',
        tittel: `${navn(h.aktor)} kommenterte tråden «${h.tittel}»`,
        hvor: 'Diskusjon',
        til: lenkeadresse({ slag: 'diskusjon', id: h.diskusjon, kommentar: h.kommentar }),
      }
    case 'chat':
      return {
        ...felles,
        id: 'chat',
        ikon: 'samtale',
        tittel:
          h.uleste === 0
            ? 'Siste melding i gruppechatten'
            : `${h.uleste} ${h.uleste === 1 ? 'ny melding' : 'nye meldinger'} i gruppechatten`,
        hvor: 'Gruppechat',
        til: gruppeadresse(gruppe, 'chat'),
      }
  }
}
