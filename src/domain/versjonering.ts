/**
 * Versjonsnummeret beregnet fra endringene, i den rekkefølgen de ble slått
 * sammen i `main`.
 *
 * Hver endring har sin egen fil i `src/data/endringer/` med leddet den øker
 * (`semver`), men uten versjonsnummer. Når appen bygges, nummereres de fra den
 * øverste versjonen i det frosne arkivet (`src/data/endringshistorikk.ts`), i
 * den rekkefølgen commitene som tok dem inn, står i `main`
 * (`src/drift/endringshistorikk.ts`). Samme historikk gir derfor alltid samme
 * numre, en ny sammenslåing endrer aldri numrene til dem som kom før, og to
 * PR-er som legger til hver sin fil, rører ikke de samme linjene.
 *
 * Alt her er rene funksjoner; Git og filene leses i `src/drift/`.
 */
import {
  ENDRINGSTYPER,
  lesVersjon,
  OMFANG,
  SEMVERNIVAER,
  VARSELMERKER,
  type Endring,
  type Endringsinnhold,
  type HistoriskEndring,
  type Semverniva,
} from './versjon'

/** En endring slik den står i sin egen fil, `src/data/endringer/<id>.json`. */
export interface Endringsforing extends Endringsinnhold {
  /** Den permanente ID-en, lik filnavnet uten `.json`. */
  id: string
  semver: Semverniva
  /** Når føringen ble skrevet: ISO 8601 i UTC, `åååå-mm-ddTtt:mm:ssZ`. */
  opprettet: string
}

/**
 * En endring som er slått sammen i `main`: føringen slik den står nå, og
 * leddet den hadde da den ble slått sammen, som er det som teller.
 */
export interface Publisering {
  foring: Endringsforing
  /** Leddet i fila i commiten som tok den inn i `main`. */
  semver: Semverniva
  /** Commiten i `main` som tok den inn. */
  commit: string
  /** Tidspunktet for den commiten (ISO 8601), som gir datoen i loggen. */
  tidspunkt: string
  /** Plassen til commiten i `main`, eldst først. Endringer i samme commit deler den. */
  rekkefolge: number
}

/**
 * ID-en til en ny endring: tidspunktet i UTC og seks tilfeldige heksadesimale
 * tegn, som `20261116-093752-a1b2c3`. Den er kjent før PR-en slås sammen, og
 * to PR-er som skrives samtidig, får ikke samme filnavn.
 */
export const ENDRINGS_ID = /^\d{8}-\d{6}-[0-9a-f]{6}$/

const OPPRETTET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

/** En ny ID for en endring skrevet `naa`, med `tilfeldig` som seks heksadesimale tegn. */
export function lagEndringsId(naa: Date, tilfeldig: string): string {
  if (!/^[0-9a-f]{6}$/.test(tilfeldig)) throw new Error(`Ugyldig tilfeldig del i endrings-ID: ${tilfeldig}`)
  const iso = naa.toISOString()
  return `${iso.slice(0, 10).replaceAll('-', '')}-${iso.slice(11, 19).replaceAll(':', '')}-${tilfeldig}`
}

/** Versjonen etter en endring som øker `niva`. Leddene til høyre nullstilles. */
export function nesteVersjon(versjon: string, niva: Semverniva): string {
  const ledd = lesVersjon(versjon)
  if (!ledd) throw new Error(`Ugyldig versjonsnummer: ${versjon}`)
  const [major, minor, patch] = ledd
  if (niva === 'major') return `${major + 1}.0.0`
  if (niva === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

const OSLODATO = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' })

/** Datoen i Norge for et tidspunkt, `åååå-mm-dd`, som datoene i loggen skrives. */
export function oslodato(tidspunkt: string): string {
  const dato = new Date(tidspunkt)
  if (Number.isNaN(dato.getTime())) throw new Error(`Ugyldig tidspunkt: ${tidspunkt}`)
  return OSLODATO.format(dato)
}

function etterOpprettet(a: Endringsforing, b: Endringsforing): number {
  return a.opprettet.localeCompare(b.opprettet) || a.id.localeCompare(b.id)
}

/** Føringen slik loggen viser den, med versjonen og datoen den fikk. */
function somEndring(foring: Endringsforing, versjon: string, dato: string, semver: Semverniva): Endring {
  const { id, opprettet, semver: _naa, ...innhold } = foring
  return { versjon, dato, id, semver, opprettet, ...innhold }
}

/**
 * Endringene med egen fil, nummerert fra `start`, nyest først.
 *
 * De publiserte nummereres i den rekkefølgen de ble slått sammen i `main`;
 * bare endringer som kom inn i samme commit, ordnes etter når de ble skrevet,
 * og så etter ID. Tidspunktet de ble skrevet, avgjør ellers ingenting. De som
 * ikke er slått sammen ennå (et lokalt bygg med en ny fil), kommer etter, med
 * foreløpige numre.
 */
export function nummerer(start: string, publiserte: readonly Publisering[], upubliserte: readonly Endringsforing[] = []): Endring[] {
  if (!lesVersjon(start)) throw new Error(`Ugyldig startversjon: ${start}`)
  const nummerert: Endring[] = []
  let versjon = start
  const iRekkefolge = [...publiserte].sort((a, b) => a.rekkefolge - b.rekkefolge || etterOpprettet(a.foring, b.foring))
  for (const p of iRekkefolge) {
    versjon = nesteVersjon(versjon, p.semver)
    nummerert.push(somEndring(p.foring, versjon, oslodato(p.tidspunkt), p.semver))
  }
  for (const foring of [...upubliserte].sort(etterOpprettet)) {
    versjon = nesteVersjon(versjon, foring.semver)
    nummerert.push({ ...somEndring(foring, versjon, oslodato(foring.opprettet), foring.semver), forelopig: true })
  }
  return nummerert.reverse()
}

/** Den øverste versjonen i arkivet, som de nye endringene nummereres fra. */
export function startversjon(historiske: readonly HistoriskEndring[]): string {
  const forste = historiske[0]
  if (!forste) throw new Error('Arkivet over de historiske endringene er tomt; versjonen kan ikke beregnes')
  return forste.versjon
}

/** Hele loggen, nyest først: de nummererte endringene over arkivet, der versjonen er ID-en. */
export function settSammen(nye: readonly Endring[], historiske: readonly HistoriskEndring[]): Endring[] {
  return [...nye, ...historiske.map((h): Endring => ({ id: h.versjon, ...h }))]
}

/**
 * Føringen en oppgave eller lenke viser til, med ID-en eller versjonen. Eldre
 * oppgaver har versjonen; nye har ID-en, som er kjent før versjonen er det.
 */
export function finnEndring<E extends Pick<Endring, 'id' | 'versjon'>>(logg: readonly E[], referanse: string | null | undefined): E | undefined {
  if (!referanse) return undefined
  return logg.find((e) => e.id === referanse) ?? logg.find((e) => e.versjon === referanse)
}

const FELTER = new Set([
  'id',
  'semver',
  'opprettet',
  'sammendrag',
  'typer',
  'omfang',
  'gjelder',
  'punkter',
  'endrerFortolkning',
  'varsleFunksjonsendring',
  'kritiskFagligVarsel',
  'utenVarsel',
])

function erTekstliste(verdi: unknown): verdi is string[] {
  return Array.isArray(verdi) && verdi.every((v) => typeof v === 'string' && v.trim() !== '')
}

/**
 * Leser innholdet i en endringsfil og sier tydelig fra om noe er galt, i stedet
 * for å gjette. `navn` er filnavnet uten `.json`, som ID-en skal være lik.
 */
export function lesEndringsforing(data: unknown, navn: string): Endringsforing {
  const feil = (hva: string) => new Error(`Endringen ${navn}: ${hva} (docs/endringslogg.md)`)
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw feil('fila er ikke et JSON-objekt')
  const f = data as Record<string, unknown>
  const ukjente = Object.keys(f).filter((k) => !FELTER.has(k))
  if (ukjente.length) throw feil(`ukjente felt: ${ukjente.join(', ')}`)
  if (typeof f.id !== 'string' || !ENDRINGS_ID.test(f.id)) throw feil('`id` må ha formen ååååmmdd-ttmmss-xxxxxx')
  if (f.id !== navn) throw feil(`\`id\` (${f.id}) må være lik filnavnet`)
  if (!SEMVERNIVAER.includes(f.semver as Semverniva)) throw feil('`semver` må være "major", "minor" eller "patch"')
  if (typeof f.opprettet !== 'string' || !OPPRETTET.test(f.opprettet) || Number.isNaN(Date.parse(f.opprettet)))
    throw feil('`opprettet` må være et tidspunkt i UTC, som "2026-11-16T09:37:52Z"')
  if (typeof f.sammendrag !== 'string' || f.sammendrag.trim() === '') throw feil('`sammendrag` mangler')
  if (!Array.isArray(f.typer) || f.typer.length === 0 || !f.typer.every((t) => ENDRINGSTYPER.includes(t as never)))
    throw feil(`\`typer\` må være én eller flere av ${ENDRINGSTYPER.join(', ')}`)
  if (!OMFANG.includes(f.omfang as never)) throw feil(`\`omfang\` må være én av ${OMFANG.join(', ')}`)
  if (!erTekstliste(f.punkter) || f.punkter.length === 0) throw feil('`punkter` må ha minst ett punkt')
  if (f.gjelder !== undefined && (!erTekstliste(f.gjelder) || f.gjelder.length === 0))
    throw feil('`gjelder` må være en liste med minst ett område, eller utelates')
  for (const merke of VARSELMERKER) if (f[merke] !== undefined && f[merke] !== true) throw feil(`\`${merke}\` kan bare være true`)
  return f as unknown as Endringsforing
}
