/**
 * Oppryddingen av kuratorjobbgrenene (`docs/kuratorjobber.md`, «Automatisk
 * opprydding av jobbgrener»): hvilke `kuratorjobb/`-grener som kan slettes,
 * og hvorfor de andre beholdes. Her står bare reglene; arbeidsflyten
 * `.github/workflows/rydd-kuratorjobbgrener.yml` henter dataene og sletter
 * (`scripts/rydd-kuratorjobbgrener.ts`).
 *
 * Fasiten for om kurateringen av et stoff pågår eller er ferdig, er
 * kurateringsgrenene i OUSFAR (`kuratering_kostatus`), ikke stoffets status i
 * kurateringskøen. Køens status er hva køen vil gjøre *neste* gang (et stoff
 * står som `klar` igjen for en ny runde), og køen ser ikke kurateringer som er
 * gjort uten en reservasjon i den.
 */
import type { Greninfo } from '../kurateringsko/modell'
import { JOBBGREN, JOBBGRENPREFIKS, OPPGAVER, type Jobbstatus } from './modell'

const TIME = 3_600_000
const DOGN = 24 * TIME

/**
 * Fristene, i timer. En gren slettes tidligst når fristen er gått, regnet fra
 * tidspunktet regelen sier. Oppryddingen kjører hver time.
 */
export const RYDDEFRISTER = {
  /** En jobb som står som `kjorer` lenger enn dette, er avbrutt (jobben selv stoppes etter en time). */
  kjorer: 24,
  /** Etter at den siste kurateringen jobben ble brukt til, er publisert. */
  etterPublisering: 24,
  /**
   * En bestått funksjonstest alene. Ingen trenger resultatet etterpå: en
   * pågående kuratering som viser til grenen, beholder den uansett.
   */
  funksjonstestOk: 3,
  /** En funksjonstest alene med advarsel eller feil, så den som ba om den, rekker å se den. */
  funksjonstestAvvik: 3 * 24,
  /** En forespørsel jobben avviste, så jobben ikke ga noe å bruke. */
  avvist: 3 * 24,
  /** En avbrutt jobb, eller en gren uten resultat. */
  avbrutt: 7 * 24,
  /**
   * En jobb med preparatomtaler ingen kuratering har brukt: ingen pågår, og
   * ingen er publisert etter jobben. Preparatomtalene kan hentes på nytt fra
   * DMP med en ny jobb.
   */
  ubrukt: 30 * 24,
} as const

/**
 * Jobben committer resultatet sitt sekunder etter at den er ferdig; en commit
 * senere enn dette er noe nytt. Brukes bare når resultatet ikke sier hvilken
 * forespørsel det gjelder (`foresporsel_sha256`).
 */
const NY_COMMIT_SLARK = 10 * 60_000

/** Beholdt lenger enn dette, er grenen trolig hengt opp i noe og vises som en advarsel. */
export const MISTENKELIG_ALDER = 30

/** Hvorfor en gren slettes eller beholdes, i de fire gruppene oppryddingen skiller mellom. */
export type Ryddekategori =
  /** Jobben pågår, eller noe aktivt bruker grenen. */
  | 'i_bruk'
  /** Jobben er ferdig, men resultatet kan fortsatt trengs i en kuratering. */
  | 'venter'
  /** Jobben er ferdig, og resultatet er ferdig brukt. */
  | 'ferdig'
  /** Jobben feilet, ble avvist, avbrutt eller aldri brukt. */
  | 'ubrukelig'

export interface Ryddevurdering {
  gren: string
  slett: boolean
  kategori: Ryddekategori
  /** Hvorfor, på norsk, for oversikten i kjøringen. */
  grunn: string
  /** Når en beholdt gren tidligst kan slettes etter reglene, hvis ingenting endrer seg. */
  tidligst_kl: string | null
  /** Når jobben sist var i arbeid (ferdig, startet eller siste commit), for advarselen om gamle grener. */
  sist_kl: string | null
}

/** Det oppryddingen vet om én jobbgren. */
export interface Jobbgren {
  navn: string
  /** GitHubs beskyttelse av grenen. */
  beskyttet: boolean
  /** Tidspunktet for den siste commiten på grenen. */
  commit_kl: string | null
  /** SHA-256 av `kuratorjobb/foresporsel.json` slik den står på grenen nå, eller `null` når den mangler. */
  foresporsel_sha256: string | null
  /** `kuratorjobb/resultat/status.json`, eller `null` når den mangler eller ikke kan leses. */
  status: unknown
}

/** Det som er felles for alle grenene i én kjøring. */
export interface Ryddegrunnlag {
  na: string
  /** Grenene åpne PR-er kommer fra eller skal inn i. */
  apnePr: ReadonlySet<string>
  /** Jobbgrenene kurateringskøen har koblet til en oppgave, et gjenopptak, en kurateringsgren eller en PR. */
  iKoen: ReadonlySet<string>
  /** Kurateringsgrenene i OUSFAR, uten fagtekst. */
  grener: readonly Greninfo[]
}

const erAktiv = (g: Greninfo) => g.status !== 'publisert' && g.status !== 'arkivert'

const tid = (v: unknown): number => {
  const t = typeof v === 'string' ? Date.parse(v) : NaN
  return Number.isFinite(t) ? t : NaN
}

const iso = (t: number) => new Date(t).toISOString()
const dato = (t: number) => iso(t).slice(0, 10)
/** Dato og klokkeslett i UTC, for fristene, som går ut i løpet av døgnet. */
const tidspunkt = (t: number) => `${dato(t)} kl. ${iso(t).slice(11, 16)} UTC`

/** En frist i timer, som tekst: «3 timer», «30 døgn». */
export const varighet = (timer: number) => (timer % 24 === 0 ? `${timer / 24} døgn` : `${timer} ${timer === 1 ? 'time' : 'timer'}`)

/** Navnet på en jobbgren først i en tekst, som i evidensjournalens `kuratorjobber` («kuratorjobb/x (preparatomtaler …)»). */
export function jobbgrenI(tekst: unknown): string | null {
  if (typeof tekst !== 'string') return null
  const navn = tekst.trim().split(/[\s,;()]/)[0] ?? ''
  return JOBBGREN.test(navn) ? navn : null
}

/** Det oppryddingen trenger fra `status.json`, kontrollert; `null` når fila ikke har formen. */
export function lesJobbstatus(v: unknown, gren: string) {
  if (typeof v !== 'object' || v === null) return null
  const s = v as Partial<Jobbstatus>
  if (!['ok', 'advarsel', 'feil', 'ikke_aktuelt', 'kjorer'].includes(s.status as string)) return null
  if (typeof s.jobb !== 'object' || s.jobb === null || s.jobb.gren !== gren) return null
  const oppgaver = Array.isArray(s.foresporsel?.oppgaver) ? s.foresporsel.oppgaver.filter((o) => OPPGAVER.includes(o)) : []
  const forespurt = s.foresporsel?.stoffer
  return {
    status: s.status as Jobbstatus['status'],
    startet: tid(s.jobb.startet_kl),
    ferdig: tid(s.jobb.ferdig_kl),
    foresporsel: typeof s.jobb.foresporsel_sha256 === 'string' && s.jobb.foresporsel_sha256 ? s.jobb.foresporsel_sha256 : null,
    oppgaver,
    alle: forespurt === 'alle',
    // Nøklene jobben fant i stoffregisteret; et navn den ikke kjente, gir ingen.
    stoffer: typeof s.stoffer === 'object' && s.stoffer !== null ? Object.keys(s.stoffer) : [],
  }
}

/** En vurdering der fristen er gått, eller en som beholder grenen til fristen. */
function etterFrist(gren: string, kategori: Ryddekategori, fra: number, timer: number, na: number, grunn: string, venter: string): Ryddevurdering {
  const frist = fra + timer * TIME
  const sist = Number.isFinite(fra) ? iso(fra) : null
  if (Number.isFinite(frist) && frist <= na) return { gren, slett: true, kategori, grunn, tidligst_kl: null, sist_kl: sist }
  return {
    gren,
    slett: false,
    kategori: kategori === 'ferdig' || kategori === 'ubrukelig' ? 'venter' : kategori,
    grunn: `${venter}; slettes tidligst ${Number.isFinite(frist) ? tidspunkt(frist) : 'når tidspunktet er kjent'}`,
    tidligst_kl: Number.isFinite(frist) ? iso(frist) : null,
    sist_kl: sist,
  }
}

const liste = (navn: readonly string[]) => (navn.length <= 3 ? navn.join(', ') : `${navn.slice(0, 3).join(', ')} og ${navn.length - 3} til`)

/**
 * Om én jobbgren kan slettes. Reglene, i rekkefølge:
 *
 * 1. Beholdes alltid: en gren med feil navn eller GitHub-beskyttelse, en åpen
 *    PR fra grenen, en kobling i kurateringskøen, en pågående kuratering som
 *    viser til grenen i evidensjournalen, en pågående kuratering av et av
 *    stoffene, og en jobb som fortsatt kjører.
 * 2. Ubrukelig: en avbrutt jobb, en gren uten resultat eller med en ny
 *    forespørsel resultatet ikke gjelder, og en forespørsel jobben avviste,
 *    slettes etter fristen.
 * 3. Bare funksjonstest: slettes tre timer etter en bestått test, tre døgn
 *    etter en med avvik.
 * 4. Preparatomtaler: slettes når hvert av stoffene har en kuratering
 *    publisert etter jobben, og den siste er minst ett døgn gammel. Utfallet
 *    av jobben spiller ingen rolle da: også en jobb med feil i
 *    funksjonstesten kan ha gitt preparatomtalene kuratoren brukte.
 * 5. Ellers er preparatomtalene ikke brukt, og grenen slettes 30 døgn etter
 *    jobben hvis ingen kuratering har startet.
 */
export function vurderJobbgren(j: Jobbgren, g: Ryddegrunnlag): Ryddevurdering {
  const na = tid(g.na)
  const commit = tid(j.commit_kl)
  const behold = (kategori: Ryddekategori, grunn: string, sist = commit): Ryddevurdering => ({
    gren: j.navn,
    slett: false,
    kategori,
    grunn,
    tidligst_kl: null,
    sist_kl: Number.isFinite(sist) ? iso(sist) : null,
  })

  if (!j.navn.startsWith(JOBBGRENPREFIKS) || !JOBBGREN.test(j.navn)) return behold('i_bruk', 'ikke et gyldig navn på en jobbgren')
  if (j.beskyttet) return behold('i_bruk', 'grenen er beskyttet i GitHub')
  if (g.apnePr.has(j.navn)) return behold('i_bruk', 'en åpen PR kommer fra eller skal inn i grenen')
  if (g.iKoen.has(j.navn)) return behold('i_bruk', 'kurateringskøen har koblet grenen til en oppgave')

  const aktive = g.grener.filter(erAktiv)
  const viserTil = aktive.filter((k) => (k.kuratorjobber ?? []).includes(j.navn))
  if (viserTil.length > 0) {
    return behold('i_bruk', `brukes i den pågående kurateringen av ${liste([...new Set(viserTil.map((k) => k.stoff))])}`)
  }

  const s = lesJobbstatus(j.status, j.navn)
  if (!s) {
    return etterFrist(j.navn, 'ubrukelig', commit, RYDDEFRISTER.avbrutt, na, 'jobben ga aldri et gyldig resultat', 'har ikke noe gyldig resultat')
  }
  const sist = Number.isFinite(s.ferdig) ? s.ferdig : Number.isFinite(s.startet) ? s.startet : commit

  const pagar = [...new Set(aktive.filter((k) => s.stoffer.includes(k.stoff)).map((k) => k.stoff))]
  if (pagar.length > 0) return behold('i_bruk', `kurateringen av ${liste(pagar)} pågår`, sist)

  // Resultatet gjelder en annen forespørsel enn den som står på grenen nå: en ny er committet og ennå ikke kjørt.
  const nyForesporsel = s.foresporsel
    ? s.foresporsel !== j.foresporsel_sha256
    : s.status !== 'kjorer' && Number.isFinite(commit) && Number.isFinite(sist) && commit - sist > NY_COMMIT_SLARK
  if (nyForesporsel) {
    return etterFrist(j.navn, 'ubrukelig', commit, RYDDEFRISTER.avbrutt, na, 'grenen har en ny forespørsel som aldri fikk et resultat', 'grenen har en ny forespørsel uten resultat')
  }

  if (s.status === 'kjorer') {
    const startet = Number.isFinite(s.startet) ? s.startet : commit
    if (!(Number.isFinite(startet) && na - startet > RYDDEFRISTER.kjorer * TIME)) return behold('i_bruk', 'jobben kjører', sist)
    return etterFrist(j.navn, 'ubrukelig', startet, RYDDEFRISTER.avbrutt, na, 'jobben ble avbrutt og aldri fullført', 'jobben ble avbrutt')
  }
  if (s.stoffer.length === 0 && !s.alle) {
    return etterFrist(j.navn, 'ubrukelig', sist, RYDDEFRISTER.avvist, na, 'jobben avviste forespørselen, så den ga ingen resultater', 'jobben avviste forespørselen')
  }

  if (!s.oppgaver.includes('spc')) {
    const ok = s.status === 'ok' || s.status === 'ikke_aktuelt'
    return etterFrist(
      j.navn,
      'ferdig',
      sist,
      ok ? RYDDEFRISTER.funksjonstestOk : RYDDEFRISTER.funksjonstestAvvik,
      na,
      ok ? 'bestått funksjonstest' : `funksjonstest med ${s.status === 'feil' ? 'feil' : 'advarsel'}, som er sett`,
      ok ? 'bestått funksjonstest' : 'funksjonstest med avvik',
    )
  }

  // Preparatomtalene: brukt når hvert stoff har en kuratering publisert etter jobben.
  const publisert = s.stoffer.map((stoff) => {
    const etter = g.grener
      .filter((k) => k.stoff === stoff && k.status === 'publisert')
      .map((k) => tid(k.publisert_kl))
      .filter((t) => Number.isFinite(t) && t >= sist)
    return { stoff, kl: etter.length > 0 ? Math.max(...etter) : NaN }
  })
  const ubrukt = publisert.filter((p) => !Number.isFinite(p.kl)).map((p) => p.stoff)
  if (ubrukt.length === 0) {
    const siste = Math.max(...publisert.map((p) => p.kl))
    const brukt = g.grener.some((k) => (k.kuratorjobber ?? []).includes(j.navn))
    return etterFrist(
      j.navn,
      'ferdig',
      siste,
      RYDDEFRISTER.etterPublisering,
      na,
      `ferdig brukt: ${liste(s.stoffer)} publisert etter jobben (sist ${dato(siste)})${brukt ? ', og grenen står i evidensjournalen' : ''}`,
      `${liste(s.stoffer)} publisert ${dato(siste)}`,
    )
  }
  return etterFrist(
    j.navn,
    'ubrukelig',
    sist,
    RYDDEFRISTER.ubrukt,
    na,
    `preparatomtalene ble ikke brukt i noen kuratering på ${varighet(RYDDEFRISTER.ubrukt)} (${liste(ubrukt)}), og ingen pågår`,
    `venter på at kurateringen av ${liste(ubrukt)} starter`,
  )
}

/** Oversikten over en kjøring. */
export interface Ryddeoversikt {
  vurderinger: Ryddevurdering[]
  slettes: Ryddevurdering[]
  beholdes: Ryddevurdering[]
  /** Det som kan tyde på at oppryddingen ikke virker som den skal. */
  advarsler: string[]
}

export function vurderAlle(jobber: readonly Jobbgren[], g: Ryddegrunnlag): Ryddeoversikt {
  const vurderinger = jobber.map((j) => vurderJobbgren(j, g)).sort((a, b) => a.gren.localeCompare(b.gren))
  const slettes = vurderinger.filter((v) => v.slett)
  const beholdes = vurderinger.filter((v) => !v.slett)
  const na = tid(g.na)
  const gamle = beholdes.filter((v) => Number.isFinite(tid(v.sist_kl)) && na - tid(v.sist_kl) > MISTENKELIG_ALDER * DOGN)
  const advarsler: string[] = []
  if (gamle.length > 0) {
    advarsler.push(
      `${gamle.length} ${gamle.length === 1 ? 'gren' : 'grener'} er beholdt mer enn ${MISTENKELIG_ALDER} døgn etter jobben: ${liste(gamle.map((v) => v.gren))}. Se om det som holder dem, fortsatt gjelder.`,
    )
  }
  return { vurderinger, slettes, beholdes, advarsler }
}

const KATEGORINAVN: Readonly<Record<Ryddekategori, string>> = {
  i_bruk: 'i bruk',
  venter: 'venter',
  ferdig: 'ferdig',
  ubrukelig: 'ubrukelig',
}

/** Oversikten som Markdown, for kjøringens oppsummering i GitHub Actions. */
export function ryddeMarkdown(
  o: Ryddeoversikt,
  { kunVis, slettet, underveis = new Map(), alleGrener }: { kunVis: boolean; slettet: ReadonlySet<string>; underveis?: ReadonlyMap<string, string>; alleGrener: number },
): string {
  const rad = (v: Ryddevurdering, handling: string) => `| \`${v.gren}\` | ${handling} | ${KATEGORINAVN[v.kategori]} | ${v.grunn.replace(/\|/g, '\\|')} |`
  const slettetNa = o.slettes.filter((v) => slettet.has(v.gren))
  const ikkeSlettet = o.slettes.filter((v) => !slettet.has(v.gren))
  const linjer = [
    '## Opprydding av kuratorjobbgrener',
    '',
    kunVis ? '**Forhåndsvisning: ingenting er slettet.**' : '',
    `Fant ${alleGrener} grener, ${o.vurderinger.length} jobbgrener. ` +
      (kunVis ? `Ville slettet ${o.slettes.length}` : `Slettet ${slettetNa.length}`) +
      `, beholdt ${o.beholdes.length + (kunVis ? 0 : ikkeSlettet.length)}.`,
    '',
    ...o.advarsler.map((a) => `> **Advarsel:** ${a}`),
    o.advarsler.length > 0 ? '' : '',
    '| Gren | Handling | Gruppe | Hvorfor |',
    '| --- | --- | --- | --- |',
    ...o.slettes.map((v) => rad(v, kunVis ? 'ville slettet' : slettet.has(v.gren) ? 'slettet' : `beholdt: ${underveis.get(v.gren) ?? 'endret underveis'}`)),
    ...o.beholdes.map((v) => rad(v, 'beholdt')),
    '',
  ]
  return linjer.filter((l, i) => l !== '' || linjer[i - 1] !== '').join('\n')
}
