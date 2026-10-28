/**
 * Dosebyggesteinene i FEST (P5.2–P5.4 i `docs/verktøy-utviklingsplan.md`):
 * hvert faktiske preparat (merkevare i én form og styrke) for et virkestoff,
 * med mg moderstoff per doseenhet, hvordan det kan deles, formuleringen,
 * administrasjonsveien, preparattypen og markedsstatusen. Bare et preparat
 * uten begrensninger kan brukes i en doseplan, og hvorfor de andre ikke kan,
 * står ved hvert av dem.
 *
 * Alt er lest av legemiddeldataene fra den eksisterende FEST-synkroniseringen
 * (`Legemiddelutvalg`, slik `les_legemidler` gir dem; `docs/legemiddeldata.md`).
 * Ingenting antas: uklar deling er ikke deling, en kapsel deles eller åpnes
 * aldri, en styrke oppgitt for et salt regnes ikke om, og flytende former
 * brukes bare når FEST oppgir dosen per dråpe. FEST sier hva som er
 * registrert og markedsført, ikke hva apotekene har på lager.
 */
import type { Kode, Pakningsdata } from '../../legemiddeldata/fest'
import { GODKJENNINGSFRITAK, handteringFor, LEGEMIDDEL, virkestoffI } from '../../legemiddeldata/preparater'
import type { Legemiddelutvalg } from '../../legemiddeldata/lesing'
import { formuleringsklasse, markedsstatus, type Festoverstyring, type Formuleringsklasse, type Markedsstatus } from '../festformuleringer'

/** Det preparatene leses fra: FEST-kopien, koblingen fra P1-nøkkel til FEST-ID-er og P1-overstyringene av formuleringen. */
export interface Preparatgrunnlag {
  utvalg: Legemiddelutvalg
  /** P1-nøkkel → moderstoffenes ID-er i FEST (`virkestoffkartlegging.json`). */
  koblinger: Readonly<Record<string, readonly string[]>>
  /** Preparater der FESTs form ikke skiller depot fra vanlig injeksjon (P1). */
  overstyringer: readonly Festoverstyring[]
}

/** Hvordan én dose måles: en tablett (kan deles når FEST sier det), en kapsel, en dråpe eller én injeksjon. */
export type Doseenhet = 'tablett' | 'kapsel' | 'drape' | 'injeksjon'

export const DOSEENHETER: Record<Doseenhet, { en: string; flere: string }> = {
  tablett: { en: 'tablett', flere: 'tabletter' },
  kapsel: { en: 'kapsel', flere: 'kapsler' },
  drape: { en: 'dråpe', flere: 'dråper' },
  injeksjon: { en: 'injeksjon', flere: 'injeksjoner' },
}

export type Registrering = 'registrert' | 'godkjenningsfritak' | 'annen'

/** Ett preparat i én form og styrke, som byggestein for doser. */
export interface Byggestein {
  /** Merkevarens ID i FEST. */
  id: string
  varenavn: string
  navn_form_styrke: string
  legemiddelform: Kode | null
  klasse: Formuleringsklasse
  /** Grunnen når formuleringen er overstyrt i P1. */
  overstyrt: string | null
  administrasjonsveier: string[]
  /** Mg moderstoff i én doseenhet; `null` når styrken ikke kan brukes. */
  mg: number | null
  doseenhet: Doseenhet | null
  /** I hvor mange like deler én enhet kan deles: 1, 2 eller 4. */
  deling: 1 | 2 | 4
  /** Hva delingen bygger på. */
  deling_grunnlag: string
  registrering: Registrering
  preparattype: string | null
  /** Markedsstatusen på `statusdato`. */
  marked: Markedsstatus
  /** Første kjente dag etter `statusdato` da preparatet ikke lenger er markedsført, etter FESTs datoer. */
  marked_til: string | null
  varenr: string[]
  /** Hvorfor preparatet ikke kan brukes i en doseplan; tom når det kan. Godkjenningsfritak er ikke en begrensning her, men et valg. */
  begrensninger: string[]
}

export const norskDato = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`

export const MARKEDSSTATUS: Record<Markedsstatus, string> = {
  markedsfort: 'markedsført',
  midlertidig_utgatt: 'midlertidig utgått',
  avregistrert: 'avregistrert',
  ikke_markedsfort: 'ikke markedsført ennå',
  uten_pakning: 'uten pakning',
}

const dag = (d: string | null | undefined) => d?.slice(0, 10) || null

/**
 * Markedsstatusen på `statusdato`, og første kjente dag etter den da ingen
 * pakning lenger er markedsført (en meldt avregistrering eller midlertidig
 * utgang). Datoene i FEST er inklusive.
 */
function markedFor(pakninger: readonly Pakningsdata[], statusdato: string): { marked: Markedsstatus; marked_til: string | null } {
  const marked = markedsstatus(pakninger, statusdato)
  if (marked !== 'markedsfort') return { marked, marked_til: null }
  const datoer = [...new Set(pakninger.flatMap((p) => [p.avregistrert_dato, p.midlertidig_utgatt_dato].map(dag)))]
    .filter((d): d is string => !!d && d > statusdato)
    .sort()
  return { marked, marked_til: datoer.find((d) => markedsstatus(pakninger, d) !== 'markedsfort') ?? null }
}

const registrering = (kode: string | undefined): Registrering =>
  kode === LEGEMIDDEL ? 'registrert' : kode === GODKJENNINGSFRITAK ? 'godkjenningsfritak' : 'annen'

/**
 * Byggesteinene for virkestoffet med P1-nøkkelen `nokkel`: alle preparater
 * som bare inneholder det (moderstoffet eller et salt av det), sortert etter
 * ID. Markedsstatusen gjelder `statusdato` (`ÅÅÅÅ-MM-DD`).
 */
export function byggesteiner(g: Preparatgrunnlag, nokkel: string, statusdato: string): Byggestein[] {
  const koblet = new Set(g.koblinger[nokkel] ?? [])
  if (koblet.size === 0) return []
  const virkestoff = new Map(g.utvalg.virkestoff.map((v) => [v.id, v]))
  const moder = new Map<string, string>()
  for (const id of koblet) for (const salt of virkestoff.get(id)?.salter ?? []) moder.set(salt, id)
  const egne = (id: string) => koblet.has(id) || moder.has(id)
  const styrker = new Map(g.utvalg.styrker.map((s) => [s.id, s]))
  const pakninger = new Map<string, Pakningsdata[]>()
  for (const p of g.utvalg.pakninger) for (const m of new Set(p.merkevarer)) pakninger.set(m, [...(pakninger.get(m) ?? []), p])

  const ut: Byggestein[] = []
  for (const m of g.utvalg.merkevarer) {
    const alle = virkestoffI(m, styrker)
    if (!alle.some(egne)) continue
    const begrensninger: string[] = []
    const kombinasjon = alle.some((v) => !egne(v)) || alle.length > 1
    if (kombinasjon) begrensninger.push('er et kombinasjonspreparat')

    const veier = m.administrasjonsveier.map((k) => k.tekst)
    const o = g.overstyringer.find((x) => x.virkestoff === nokkel && x.varenavn === m.varenavn)
    const klasse = o?.klasse ?? formuleringsklasse(m.legemiddelform?.tekst ?? null, veier)
    const form = (m.legemiddelform?.tekst ?? '').toLowerCase()

    // Styrken: én entydig verdi i mg moderstoff per doseenhet.
    const s = m.virkestoff_med_styrke.length === 1 ? styrker.get(m.virkestoff_med_styrke[0]!) : undefined
    let mg: number | null = null
    let doseenhet: Doseenhet | null = null
    if (kombinasjon) {
      // Styrken til et kombinasjonspreparat brukes ikke.
    } else if (!s?.styrke) begrensninger.push('mangler én styrke i FEST')
    else if ((s.operator && s.operator.kode !== 'L') || (s.ovre && s.ovre.verdi !== s.styrke.verdi)) begrensninger.push('har ikke én entydig styrke i FEST')
    else if (s.styrke.enhet !== 'mg') begrensninger.push(`har styrken i ${s.styrke.enhet || 'ukjent enhet'}, ikke mg`)
    else if (moder.has(s.virkestoff_id)) {
      begrensninger.push(`har styrken oppgitt for saltet ${virkestoff.get(s.virkestoff_id)?.navn ?? s.virkestoff_id}; omregning til moderstoffet er ikke dokumentert i FEST`)
    } else if (!s.nevner) {
      mg = s.styrke.verdi
      if (klasse === 'depotinjeksjon' || klasse === 'injeksjon' || klasse === 'middels_langtidsvirkende') doseenhet = 'injeksjon'
      else if (form.includes('kapsel')) doseenhet = 'kapsel'
      else if (form.includes('tablett')) doseenhet = 'tablett'
      else begrensninger.push(`har ingen doseenhet OUSFAR kan regne med for formen ${m.legemiddelform?.tekst ?? '(uten form)'}`)
    } else if (s.nevner.enhet === 'sprøyte' && s.nevner.verdi === 1) {
      mg = s.styrke.verdi
      doseenhet = 'injeksjon'
    } else if (s.alternativ_nevner?.enhet === 'dråpe' && s.alternativ_styrke?.enhet === 'mg' && s.alternativ_nevner.verdi > 0) {
      mg = s.alternativ_styrke.verdi / s.alternativ_nevner.verdi
      doseenhet = 'drape'
    } else {
      begrensninger.push(`er flytende (${s.styrke.verdi} ${s.styrke.enhet}/${s.nevner.verdi === 1 ? '' : `${s.nevner.verdi} `}${s.nevner.enhet}) uten dokumentert doseringsoppløsning`)
    }
    if (mg !== null && !(mg > 0 && Number.isFinite(mg))) {
      begrensninger.push('har en styrke som ikke er et positivt tall')
      mg = null
    }

    // Deling: bare tabletter, og bare når FEST sier det for akkurat dette preparatet.
    let deling: 1 | 2 | 4 = 1
    let deling_grunnlag: string
    if (doseenhet === 'tablett') {
      const d = handteringFor(m).deling
      const kode = m.deling?.kode
      if (d.status === 'ja' && (kode === '2' || kode === '4')) {
        deling = kode === '4' ? 4 : 2
        deling_grunnlag = `FEST: «${d.tekst}»${klasse === 'peroral_modifisert' ? ' (modifisert frisetting; delingen er oppgitt for dette preparatet)' : ''}`
      } else deling_grunnlag = d.status === 'nei' ? 'FEST: «Ikke delbar»' : 'FEST oppgir ikke deling; regnes som ikke delbar'
    } else if (doseenhet === 'kapsel') deling_grunnlag = 'Kapsel: deles eller åpnes aldri i beregningen'
    else if (doseenhet === 'drape') deling_grunnlag = 'Hele dråper'
    else if (doseenhet === 'injeksjon') deling_grunnlag = 'Én hel injeksjon; deler av en sprøyte brukes ikke'
    else deling_grunnlag = 'Ingen doseenhet'

    const reg = registrering(m.preparattype?.kode)
    if (reg === 'annen') begrensninger.push(`har preparattypen «${m.preparattype?.tekst ?? 'ukjent'}», som ikke brukes i automatiske doseplaner`)
    const egnePakninger = pakninger.get(m.id) ?? []
    const { marked, marked_til } = markedFor(egnePakninger, statusdato)
    if (marked !== 'markedsfort') {
      const fra = marked === 'midlertidig_utgatt' ? egnePakninger.map((p) => dag(p.midlertidig_utgatt_dato)).filter(Boolean).sort().at(-1) : null
      begrensninger.push(marked === 'uten_pakning' ? 'har ingen pakninger i FEST' : `er ${MARKEDSSTATUS[marked]} i FEST${fra ? ` fra ${norskDato(fra)}` : ''}`)
    }

    ut.push({
      id: m.id,
      varenavn: m.varenavn,
      navn_form_styrke: m.navn_form_styrke,
      legemiddelform: m.legemiddelform,
      klasse,
      overstyrt: o?.grunn ?? null,
      administrasjonsveier: veier,
      mg,
      doseenhet,
      deling,
      deling_grunnlag,
      registrering: reg,
      preparattype: m.preparattype?.tekst ?? null,
      marked,
      marked_til,
      varenr: egnePakninger.map((p) => p.varenr).sort(),
      begrensninger,
    })
  }
  return ut.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
