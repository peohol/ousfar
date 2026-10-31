/**
 * Ende-til-ende-testmatrisen for de klinisk godkjente reglene i P11.1–P11.4
 * (`docs/verktøy-utviklingsplan.md`, `docs/verktøy-p11-publisering.md`).
 *
 * Hvert kasus går den samme veien som verktøysiden: tilgjengeligheten for
 * valgene, nødstoppen (`sperrer.ts`), regelen siden ville brukt, det som
 * mangler i skjemaet, valgene av legemiddelform, beregningen med preparatene
 * i et lagret FEST-uttrekk (`beregnPlan`) og visningen (`planvisning`,
 * `planTekst`). Forventningen er skrevet ut for hvert kasus: radene i planen
 * slik de står på skjermen og i kopien, eller hvorfor ingen plan vises.
 *
 * Kasusene er syntetiske: ingen pasientopplysninger, bare doser, svar og
 * datoer som er valgt for å prøve reglene, også ved grensene. Kasus som
 * endrer FEST-uttrekket eller regelen, gjør det på en kopi. Ingen regel
 * endres eller godkjennes her. Rapporten skrives med
 * `npm run verktoy:regler -- pilotmatrise`, og testene sier fra når den ikke
 * er oppdatert.
 */
import type { Legemiddelutvalg } from '../../legemiddeldata/lesing'
import { beregnPlan, formvalgFor, mangler, omregningsrader, osloDato, TOMT_SKJEMA, type Planskjema } from '../doseplan'
import { byggesteiner } from '../motor/byggesteiner'
import { UTENFOR_OMFANG, type Doseplanresultat } from '../motor/plan'
import { EN_FORSTE_REDUKSJON, planTekst, planvisning, STARTFORLOP } from '../planvisning'
import { festkoblinger, KARTLEGGING, VERKTOY } from '../register'
import { usperrede, verktoysperrer, type Verktoysperre } from '../sperrer'
import { REGELSETT, tilgjengelighet, type Regelstatus, type Verktoyvalg } from '../tilgjengelighet'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from './aksepttest'
import type { Regel } from './modell'
import { STI } from './nedtrapping'

export const PILOTMATRISEFIL = 'docs/verktøy-p11-testmatrise.md'

/** Hva kasuset prøver, etter punktene i P11.1 og P11.2. */
export const KATEGORIER = {
  vanlig_dose: 'Vanlig dose innenfor det godkjente omfanget',
  uvanlig_dose: 'Uvanlige doser og grenseverdier',
  pasientforhold: 'Pasientforhold, også ubesvarte',
  interaksjon: 'Interaksjonssperrer',
  preparat: 'Utilgjengelige eller endrede preparater',
  foreldet_fest: 'Foreldet FEST',
  datakilde: 'Feil fra datakildene',
  injeksjonsdato: 'Injeksjons- og startdatoer',
  fagtekst: 'Godkjent fagtekst uten beregning',
  ikke_godkjent: 'Regler som ikke er godkjent',
  regelendring: 'Endret regel eller regelversjon',
  nodstopp: 'Nødstoppen',
} as const

export type Kasuskategori = keyof typeof KATEGORIER

/** Utfallet slik brukeren ser det. */
export type Pilotutfall =
  /** En klinisk plan: radene slik de står i tabellen og i kopien. */
  | { utfall: 'plan'; linjer: string[]; undertittel: string | null }
  /** Beregningen stoppet: ingen plan, bare grunnene. */
  | { utfall: 'stopp'; grunner: string[] }
  /** Skjemaet mangler noe, så ingenting beregnes. */
  | { utfall: 'mangler'; grunner: string[] }
  /** Siden ber om valg av legemiddelform eller formulering før beregningen. */
  | { utfall: 'formvalg'; forlop: string[] }
  /** Godkjent fagtekst uten beregning. */
  | { utfall: 'fagtekst'; regler: string[] }
  /** Verktøyet tilbyr verken plan eller fagtekst for valgene. */
  | { utfall: 'ingen'; status: Exclude<Regelstatus, 'tilgjengelig' | 'fagtekst'>; grunner: string[] }
  /** Det kliniske innholdet er deaktivert med nødstoppen. */
  | { utfall: 'sperret' }

/** Forventningen: for en plan alle radene; ellers tekst som må stå i grunnene (eller listen over forløp, regler eller status). */
export type Forventning =
  | { utfall: 'plan'; linjer: string[]; undertittel?: string | null }
  | { utfall: 'stopp' | 'mangler'; grunner: string[] }
  | { utfall: 'formvalg'; forlop: string[] }
  | { utfall: 'fagtekst'; regler: string[] }
  | { utfall: 'ingen'; status: Exclude<Regelstatus, 'tilgjengelig' | 'fagtekst'> }
  | { utfall: 'sperret' }

/** En endring av FEST-uttrekket, gjort på en kopi. `idag` er dagen preparatstatusen gjelder. */
export interface Festendring {
  hva: string
  endre: (u: Legemiddelutvalg, idag: string) => void
}

export interface Pilotkasus {
  id: string
  kategori: Kasuskategori
  hva: string
  verktoy: string
  valg: Verktoyvalg
  /** Uttrekket preparatene leses fra. */
  uttrekk: Uttrekksnavn
  /** Aktuell døgndose slik den skrives i feltet. */
  dose: string
  /** Skjemaet er ellers fylt ut med alle bekreftelser og nei på alle unntak og spørsmål; dette kommer i tillegg. */
  skjema?: Partial<Planskjema>
  /** Unntak og spørsmål som står ubesvart. */
  ubesvart?: string[]
  fest?: Festendring
  /** Timer etter at FEST-kopien ble kontrollert, når planen beregnes. Standard: {@link STANDARD_TIMER}. */
  timer?: number
  sperrer?: Verktoysperre[]
  /**
   * Regelen brukes direkte i stedet for den verktøysiden tilbyr, eventuelt
   * endret på en kopi: det som ville skjedd om en feil i appen, en gammel
   * lagret tilstand eller en ny regelversjon brakte en annen regel fram til beregningen.
   */
  regel?: { id: string; endre?: { hva: string; endre: (r: Regel) => void } }
  forventet: Forventning
}

export type Uttrekksnavn = 'pilot' | 'aksept'
export type Uttrekkene = Record<Uttrekksnavn, Festuttrekk>

/** Kasusene beregnes noen timer etter at FEST-kopien ble kontrollert, godt innenfor grensen på 48 timer. */
export const STANDARD_TIMER = 6

const regelMedId = (id: string) => {
  const r = REGELSETT.regler.find((x) => x.id === id)
  if (!r) throw new Error(`Regelen ${id} finnes ikke.`)
  return r
}

/** Skjemaet med regelens bekreftelser, nei på hvert unntak og spørsmål, og endringene i `x`. */
export function besvartSkjema(r: Regel, dose: string, x: Partial<Planskjema> = {}): Planskjema {
  return {
    ...TOMT_SKJEMA,
    startdose: dose,
    bekreftet: r.bekreftelser.map((b) => b.id),
    ...x,
    pasientforhold: { ...Object.fromEntries(r.unntak.map((u) => [u.id, false])), ...x.pasientforhold },
    svar: { ...Object.fromEntries((r.sporsmal ?? []).map((s) => [s.id, false])), ...x.svar },
  }
}

const utenSvar = (s: Planskjema, ider: readonly string[]): Planskjema => ({
  ...s,
  pasientforhold: Object.fromEntries(Object.entries(s.pasientforhold).filter(([id]) => !ider.includes(id))),
  svar: Object.fromEntries(Object.entries(s.svar).filter(([id]) => !ider.includes(id))),
})

const kontrolltid = (u: Festuttrekk) => Date.parse(u.utvalg.kontrollert_kl ?? u.hentet)

/** Tidspunktet kasuset beregnes ved. */
export const tidFor = (k: Pick<Pilotkasus, 'uttrekk' | 'timer'>, uttrekkene: Uttrekkene) => new Date(kontrolltid(uttrekkene[k.uttrekk]) + (k.timer ?? STANDARD_TIMER) * 3_600_000)

/** Radene i planen, uten overskrift, tittel og listene under. */
const planlinjer = (tekst: string, undertittel: string | null) => {
  const linjer = tekst.split('\n').slice(undertittel ? 4 : 3)
  const slutt = linjer.indexOf('')
  return slutt < 0 ? linjer : linjer.slice(0, slutt)
}

/** Kasuset gjennom den samme veien som verktøysiden, med utfallet brukeren ville sett. */
export function kjorKasus(k: Pilotkasus, uttrekkene: Uttrekkene): Pilotutfall & { resultat?: Doseplanresultat; tekst?: string } {
  const verktoy = VERKTOY.find((v) => v.id === k.verktoy)
  if (!verktoy) throw new Error(`Verktøyet ${k.verktoy} finnes ikke.`)
  const sperrer = k.sperrer ?? []
  let regel: Regel | undefined
  if (k.regel) {
    regel = structuredClone(regelMedId(k.regel.id))
    k.regel.endre?.endre(regel)
  } else {
    const t = tilgjengelighet(verktoy, k.valg)
    if (t.status !== 'tilgjengelig' && t.status !== 'fagtekst') return { utfall: 'ingen', status: t.status, grunner: t.grunner }
    const regler = usperrede(sperrer, verktoy, t.regler)
    if (verktoysperrer(sperrer, verktoy).length > 0 || regler.length === 0) return { utfall: 'sperret' }
    if (t.status === 'fagtekst') return { utfall: 'fagtekst', regler: regler.map((r) => `${r.id} v${r.versjon}`) }
    regel = regler.length === 1 ? regler[0] : regler.find((r) => r.id === k.skjema?.regel)
    if (!regel) return { utfall: 'mangler', grunner: ['Velg strategien planen skal beregnes etter.'] }
  }
  const skjema = utenSvar(besvartSkjema(regel, k.dose, k.skjema), k.ubesvart ?? [])
  const mangel = mangler(regel, skjema)
  if (mangel.length > 0) return { utfall: 'mangler', grunner: mangel }

  const uttrekk = uttrekkene[k.uttrekk]
  const naa = tidFor(k, uttrekkene)
  const utvalg = structuredClone(uttrekk.utvalg)
  k.fest?.endre(utvalg, osloDato(naa))
  // Sperren leses igjen i det planen beregnes.
  if (usperrede(sperrer, verktoy, [regel]).length === 0) return { utfall: 'sperret' }
  const alternativer = formvalgFor(regel, k.valg, skjema, utvalg, naa)
  const uvalgt = Object.entries(alternativer).filter(
    ([f, a]) => (a.klasser.length > 1 && !skjema.formvalg[f]?.klasse) || (a.legemiddelformer.length > 1 && !skjema.formvalg[f]?.legemiddelform),
  )
  if (uvalgt.length > 0) return { utfall: 'formvalg', forlop: uvalgt.map(([f]) => f) }

  const resultat = beregnPlan(regel, k.valg, skjema, utvalg, naa)
  const visning = planvisning(resultat, regel, skjema.startdato || undefined)
  if (!visning) return { utfall: 'stopp', grunner: resultat.status === 'stoppet' ? resultat.stoppgrunner : ['Planen er ikke klinisk og vises ikke.'], resultat }
  const tekst = planTekst(visning, verktoy.navn)
  return { utfall: 'plan', linjer: planlinjer(tekst, visning.undertittel), undertittel: visning.undertittel, resultat, tekst }
}

/** Hvorfor utfallet ikke er det kasuset forventer; tom når det er det. */
export function avvikFra(k: Pilotkasus, u: Pilotutfall): string[] {
  const f = k.forventet
  if (u.utfall !== f.utfall) return [`ventet ${f.utfall}, fikk ${u.utfall}: ${JSON.stringify('grunner' in u ? u.grunner : 'linjer' in u ? u.linjer : u)}`]
  const feil: string[] = []
  if (f.utfall === 'plan' && u.utfall === 'plan') {
    if (JSON.stringify(u.linjer) !== JSON.stringify(f.linjer)) feil.push(`radene er ${JSON.stringify(u.linjer)}`)
    if (f.undertittel !== undefined && u.undertittel !== f.undertittel) feil.push(`undertittelen er ${JSON.stringify(u.undertittel)}`)
  }
  if ((f.utfall === 'stopp' || f.utfall === 'mangler') && 'grunner' in u) {
    for (const g of f.grunner) if (!u.grunner.some((x) => x.includes(g))) feil.push(`grunnene nevner ikke «${g}»: ${JSON.stringify(u.grunner)}`)
  }
  if (f.utfall === 'formvalg' && u.utfall === 'formvalg' && JSON.stringify(u.forlop) !== JSON.stringify(f.forlop)) feil.push(`formvalg for ${JSON.stringify(u.forlop)}`)
  if (f.utfall === 'fagtekst' && u.utfall === 'fagtekst' && JSON.stringify(u.regler) !== JSON.stringify(f.regler)) feil.push(`fagtekst fra ${JSON.stringify(u.regler)}`)
  if (f.utfall === 'ingen' && u.utfall === 'ingen' && u.status !== f.status) feil.push(`status ${u.status}`)
  return feil
}

/* --- Endringer av FEST-uttrekket ------------------------------------------------ */

const grunnlag = (u: Legemiddelutvalg, nokkel: string) => ({ utvalg: u, koblinger: festkoblinger([nokkel]), overstyringer: KARTLEGGING.festoverstyringer })

/** Merkevarene for virkestoffet med styrken (og varenavnet), slik motoren ser dem. */
const merkevarerMed = (u: Legemiddelutvalg, nokkel: string, idag: string, mg: number, varenavn?: string) =>
  new Set(byggesteiner(grunnlag(u, nokkel), nokkel, idag).filter((b) => b.mg === mg && (!varenavn || b.varenavn === varenavn)).map((b) => b.id))

const pakningerMed = (u: Legemiddelutvalg, ider: Set<string>) => u.pakninger.filter((p) => p.merkevarer.some((m) => ider.has(m)))

/** Alle pakninger med styrken er avregistrert fra `dager` dager etter i dag (0: fra i dag). */
export const avregistrert = (nokkel: string, mg: number, varenavn?: string, dager = 0): Festendring => ({
  hva: `${varenavn ?? nokkel} ${mg} mg ${dager === 0 ? 'avregistrert' : `meldt avregistrert om ${dager} dager`}`,
  endre: (u, idag) => {
    const dato = new Date(Date.parse(idag) + dager * 86_400_000).toISOString().slice(0, 10)
    for (const p of pakningerMed(u, merkevarerMed(u, nokkel, idag, mg, varenavn))) p.avregistrert_dato = dato
  },
})

/** Alle pakninger med styrken er midlertidig utgått. */
export const midlertidigUtgatt = (nokkel: string, mg: number, varenavn?: string): Festendring => ({
  hva: `${varenavn ?? nokkel} ${mg} mg midlertidig utgått`,
  endre: (u, idag) => {
    for (const p of pakningerMed(u, merkevarerMed(u, nokkel, idag, mg, varenavn))) p.midlertidig_utgatt_dato = idag
  },
})

/** Alle preparatene for virkestoffet krever godkjenningsfritak. */
export const bareFritak = (nokkel: string): Festendring => ({
  hva: `alle preparatene med ${nokkel} krever godkjenningsfritak`,
  endre: (u, idag) => {
    const ider = new Set(byggesteiner(grunnlag(u, nokkel), nokkel, idag).map((b) => b.id))
    for (const m of u.merkevarer) if (ider.has(m.id)) m.preparattype = { kode: '11', tekst: 'Krever godkj. Fritak' }
  },
})

/**
 * Et senere uttrekk med en ny styrke `ny` mg: som et nytt preparat ved siden
 * av et med `fra` mg, eller ved at styrken `fra` mg er endret i alle preparatene.
 */
export const nyStyrke = (nokkel: string, fra: number, ny: number, hvordan: 'nytt' | 'endret'): Festendring => ({
  hva: hvordan === 'nytt' ? `nytt preparat med ${nokkel} ${ny} mg` : `styrken ${fra} mg av ${nokkel} er endret til ${ny} mg`,
  endre: (u, idag) => {
    const ider = merkevarerMed(u, nokkel, idag, fra)
    const styrke = new Map(u.styrker.map((s) => [s.id, s]))
    const medNy = (id: string, eier: string) => {
      const s = styrke.get(id)!
      if (s.styrke?.verdi !== fra) return id
      u.styrker.push({ ...s, id: `${id}-${ny}-${eier}`, styrke: { ...s.styrke, verdi: ny } })
      return `${id}-${ny}-${eier}`
    }
    const preparater = u.merkevarer.filter((m) => ider.has(m.id))
    for (const m of hvordan === 'endret' ? preparater : preparater.slice(0, 1)) {
      if (hvordan === 'endret') {
        m.virkestoff_med_styrke = m.virkestoff_med_styrke.map((id) => medNy(id, m.id))
        continue
      }
      const id = `${m.id}-${ny}`
      u.merkevarer.push({ ...m, id, navn_form_styrke: m.navn_form_styrke.replace(`${fra} mg`, `${ny} mg`), virkestoff_med_styrke: m.virkestoff_med_styrke.map((x) => medNy(x, id)) })
      for (const p of u.pakninger.filter((x) => x.merkevarer.includes(m.id))) {
        u.pakninger.push({ ...structuredClone(p), id: `${p.id}-${ny}`, varenr: `${p.varenr}-${ny}`, ean: [], byttegrupper: [], byttegrupper_fra: {}, merkevarer: [id], innhold: p.innhold.map((i) => ({ ...i, merkevare_id: i.merkevare_id === m.id ? id : i.merkevare_id })) })
      }
    }
  },
})

/** FEST-lesingen ga ingen preparater. */
export const TOMT_UTTREKK: Festendring = {
  hva: 'ingen preparater i svaret fra FEST-lesingen',
  endre: (u) => {
    u.merkevarer = []
    u.pakninger = []
    u.styrker = []
  },
}

/** Svaret oppgir en annen kilde enn FEST. */
export const annenKilde = (kilde: string): Festendring => ({ hva: `kilden er «${kilde}»`, endre: (u) => void (u.kilde = kilde) })

/** Kontrolltidspunktet eller kildedatoen er endret, mangler eller er ugyldig. */
export const tidsstempel = (hva: string, felt: Partial<Pick<Legemiddelutvalg, 'kontrollert_kl' | 'kildedato'>>): Festendring => ({ hva, endre: (u) => void Object.assign(u, felt) })

/* --- Valgene ---------------------------------------------------------------------- */

const peroral = (nokkel: string) => ({ nokkel, formulering: 'standard' as const })
const SEPONERING = 'trappe-ned-antidepressiv'
const BYTTE_AD = 'bytte-antidepressiv'
const BYTTE_AP = 'bytte-antipsykotikum'
const VORTIOKSETIN: Verktoyvalg = { fra: peroral('vortioksetin') }
const SERTRALIN_MIRTAZAPIN: Verktoyvalg = { fra: peroral('sertralin'), til: peroral('mirtazapin') }
const MAINTENA: Verktoyvalg = { fra: peroral('aripiprazol'), til: { nokkel: 'aripiprazol', formulering: 'LA' } }
const XEPLION: Verktoyvalg = { fra: peroral('paliperidon'), til: { nokkel: 'paliperidon', formulering: 'ER' } }

/** Tablett (FEST-form 53) for et forløp. */
const tablett = (...forlop: string[]) => ({ formvalg: Object.fromEntries(forlop.map((f) => [f, { legemiddelform: '53' }])) })

const sperre = (omfang: Verktoysperre['omfang'], mal: string | null): Verktoysperre => ({
  id: `syntetisk-${omfang}-${mal ?? 'alle'}`,
  omfang,
  mal,
  grunn: 'Syntetisk kritisk feil i pilot.',
  satt_kl: '2026-10-30T08:00:00Z',
  satt_av: 'Syntetisk administrator',
})

const ingenPlan = (...grunner: string[]): Forventning => ({ utfall: 'stopp', grunner: ['Ingen klinisk doseplan kan vises.', ...grunner] })

/* --- Kasusene ---------------------------------------------------------------------- */

const vort = (id: string, kategori: Kasuskategori, hva: string, dose: string, forventet: Forventning, x: Partial<Pilotkasus> = {}): Pilotkasus => ({
  id,
  kategori,
  hva,
  verktoy: SEPONERING,
  valg: VORTIOKSETIN,
  uttrekk: 'aksept',
  dose,
  forventet,
  ...x,
})
const sert = (id: string, kategori: Kasuskategori, hva: string, dose: string, forventet: Forventning, x: Partial<Pilotkasus> = {}): Pilotkasus => ({
  id,
  kategori,
  hva,
  verktoy: BYTTE_AD,
  valg: SERTRALIN_MIRTAZAPIN,
  uttrekk: 'pilot',
  dose,
  forventet,
  ...x,
  skjema: { ...tablett('fra', 'til'), ...x.skjema },
})
const ari = (id: string, kategori: Kasuskategori, hva: string, dose: string, forventet: Forventning, x: Partial<Pilotkasus> = {}): Pilotkasus => ({
  id,
  kategori,
  hva,
  verktoy: BYTTE_AP,
  valg: MAINTENA,
  uttrekk: 'pilot',
  dose,
  forventet,
  ...x,
  skjema: { ...tablett('fra'), ...x.skjema },
})
const pali = (id: string, kategori: Kasuskategori, hva: string, dose: string, forventet: Forventning, x: Partial<Pilotkasus> = {}): Pilotkasus => ({
  id,
  kategori,
  hva,
  verktoy: BYTTE_AP,
  valg: XEPLION,
  uttrekk: 'pilot',
  dose,
  forventet,
  ...x,
})

/** En plan med nøyaktig disse radene og denne undertittelen. */
const plan = (undertittel: string | null, ...linjer: string[]): Forventning => ({ utfall: 'plan', linjer, undertittel })
/** Beregningen stopper og nevner hver av grunnene. */
const stopp = (...grunner: string[]): Forventning => ({ utfall: 'stopp', grunner })

const endretRegel = (id: string, hva: string, endre: (r: Regel) => void) => ({ id, endre: { hva, endre } })
const nyVersjon = (id: string) => endretRegel(id, 'samme regel med neste versjonsnummer, uten ny godkjenning', (r) => void (r.versjon += 1))

export const PILOTKASUS: readonly Pilotkasus[] = [
  // --- Vortioksetin v11: bare 20 → 15 mg én gang, kort behandlingstid, under 65 år, tabletter.
  vort('V01', 'vanlig_dose', '20 mg, kort behandlingstid, voksen under 65 år', '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Vortioksetin peroralt: 15 mg = 1 tablett à 15 mg')),
  vort('V02', 'injeksjonsdato', '20 mg med startdato', '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1 (fra 02.11.2026): Vortioksetin peroralt: 15 mg = 1 tablett à 15 mg'), { skjema: { startdato: '2026-11-02' } }),
  vort('V03', 'vanlig_dose', '20 mg med tablett valgt', '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Vortioksetin peroralt: 15 mg = 1 tablett à 15 mg'), { skjema: tablett('fra') }),
  vort('V04', 'uvanlig_dose', '15 mg, neste reduksjon', '15', stopp('vortioksetin dag 1–28: den ideelle dosen 11,25 mg kan ikke gis med preparatene i FEST nøyaktig.', UTENFOR_OMFANG)),
  vort('V05', 'uvanlig_dose', '10 mg', '10', stopp('vortioksetin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig.', UTENFOR_OMFANG)),
  vort('V06', 'uvanlig_dose', '12,5 mg, skrevet med komma', '12,5', stopp('vortioksetin dag 1–28: den ideelle dosen 9,38 mg kan ikke gis med preparatene i FEST nøyaktig.', UTENFOR_OMFANG)),
  vort('V07', 'uvanlig_dose', '25 mg, over høyeste dose', '25', stopp('Startdosen 25 mg er utenfor det regelen gjelder for (høyst 20 mg).', UTENFOR_OMFANG)),
  vort('V08', 'uvanlig_dose', '0 mg', '0', { utfall: 'mangler', grunner: ['Aktuell døgndose må fylles inn som et tall større enn 0.'] }),
  vort('V09', 'uvanlig_dose', 'dosen skrevet med bokstaver', 'tjue', { utfall: 'mangler', grunner: ['Aktuell døgndose må fylles inn som et tall større enn 0.'] }),
  vort('V10', 'pasientforhold', '65 år eller eldre', '20', stopp('Startdosen 20 mg er over forsiktighetsgrensen (høyst 10 mg ved 65 år eller eldre) og krever en skriftlig begrunnelse fra forskriveren, en særskilt vurdering.', UTENFOR_OMFANG), { skjema: { svar: { eldre: true } } }),
  vort('V11', 'pasientforhold', 'lang behandlingstid', '20', stopp('vortioksetin dag 1–28: den ideelle dosen 18 mg kan ikke gis med preparatene i FEST nøyaktig.', UTENFOR_OMFANG), { skjema: { svar: { lang_behandlingstid: true } } }),
  vort('V12', 'pasientforhold', 'tidligere seponeringssymptomer', '20', stopp('Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den'), { skjema: { pasientforhold: { tidligere_seponeringssymptomer: true } } }),
  vort('V13', 'pasientforhold', 'under 18 år', '20', stopp('Regelen gjelder ikke: Pasienten er under 18 år.'), { skjema: { pasientforhold: { under_18: true } } }),
  vort('V14', 'pasientforhold', 'akutt situasjon står ubesvart', '20', stopp('Må avklares før beregning (ukjent): Pasienten har en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller trenger av andre grunner'), { ubesvart: ['akutt_situasjon'] }),
  vort('V15', 'pasientforhold', 'dose utenfor rammen, begrunnet', '20', ingenPlan('Startdosen 20 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 20 mg, FEST-legemiddelform 53, med', UTENFOR_OMFANG), { skjema: { svar: { utenfor_doseramme: true }, begrunnelse: 'Syntetisk begrunnelse.' } }),
  vort('V16', 'interaksjon', 'organfunksjon og interaksjoner ikke vurdert', '20', stopp('Må bekreftes før beregning: Lever- og nyrefunksjon og interaksjoner er vurdert.'), { skjema: { bekreftet: ['startforslag'] } }),
  vort('V17', 'uvanlig_dose', 'mindre trinn enn regelens forslag', '20', stopp('vortioksetin dag 1–28: den ideelle dosen 16 mg kan ikke gis med preparatene i FEST nøyaktig.', UTENFOR_OMFANG), { skjema: { justert: { [STI.prosent]: '20' } } }),
  vort('V18', 'preparat', 'dråper i stedet for tabletter', '20', stopp('Ingen av de perorale preparatene av vortioksetin i FEST kan brukes med valgene som er gjort: ingen passer valgene.', UTENFOR_OMFANG), { skjema: { formvalg: { fra: { legemiddelform: '748' } } } }),
  vort('V19', 'preparat', '15 mg avregistrert', '20', stopp('vortioksetin (fra): styrken 15 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den', UTENFOR_OMFANG), { fest: avregistrert('vortioksetin', 15) }),
  vort('V20', 'preparat', '15 mg midlertidig utgått', '20', stopp('vortioksetin (fra): styrken 15 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den', UTENFOR_OMFANG), { fest: midlertidigUtgatt('vortioksetin', 15) }),
  vort('V21', 'preparat', 'ny styrke 12,5 mg i FEST', '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Vortioksetin peroralt: 15 mg = 1 tablett à 15 mg'), { fest: nyStyrke('vortioksetin', 15, 12.5, 'nytt') }),
  vort('V22', 'preparat', 'styrken 15 mg endret til 12,5 mg', '20', stopp('vortioksetin (fra): styrken 15 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den', UTENFOR_OMFANG), { fest: nyStyrke('vortioksetin', 15, 12.5, 'endret') }),
  vort('V23', 'preparat', 'alle preparatene krever godkjenningsfritak', '20', stopp('Ingen av de perorale preparatene av vortioksetin i FEST kan brukes: Brintellix tab 5 mg: krever godkjenningsfritak, som ikke er valgt · Brintellix tab 10 mg:'), { fest: bareFritak('vortioksetin') }),
  vort('V24', 'preparat', 'alle preparatene krever godkjenningsfritak, og fritaket er krysset av', '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Vortioksetin peroralt: 15 mg = 1 tablett à 15 mg'), { fest: bareFritak('vortioksetin'), skjema: { godkjenningsfritak: true } }),
  vort('V25', 'foreldet_fest', 'FEST kontrollert for 47 timer siden', '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Vortioksetin peroralt: 15 mg = 1 tablett à 15 mg'), { timer: 47 }),
  vort('V26', 'foreldet_fest', 'FEST kontrollert for 49 timer siden', '20', ingenPlan('Den nattlige oppdateringen har ikke gått siden'), { timer: 49 }),
  vort('V27', 'datakilde', 'FEST-kontrollen oppgir et tidspunkt fram i tid', '20', ingenPlan('FEST-kopien oppgir å være kontrollert 2026-10-30T04:15:57.810377+00:00, fram i tid; tidsstemplet kan ikke stoles på.'), { timer: -1 }),
  vort('V28', 'datakilde', 'ingen vellykket henting av FEST', '20', stopp('Det finnes ingen vellykket henting av FEST å regne med; preparatene kan ikke bekreftes.'), { fest: tidsstempel('ingen vellykket henting', { kontrollert_kl: null }) }),
  vort('V29', 'datakilde', 'ugyldig kontrolltidspunkt', '20', stopp('Tidspunktet FEST sist ble kontrollert («2026-02-30T04:00:00Z») er ikke et gyldig tidspunkt.'), { fest: tidsstempel('ugyldig kontrolltidspunkt', { kontrollert_kl: '2026-02-30T04:00:00Z' }) }),
  vort('V30', 'datakilde', 'kildedatoen ligger etter kontrollen', '20', stopp('Kildedatoen til FEST-kopien (05.11.2026) ligger etter tidspunktet den ble kontrollert.'), { fest: tidsstempel('kildedato etter kontrollen', { kildedato: '2026-11-05T00:00:00' }) }),
  vort('V31', 'datakilde', 'preparatene er ikke fra FEST', '20', stopp('Preparatdataene er fra «Testdata», ikke fra FEST.'), { fest: annenKilde('Testdata') }),
  vort('V32', 'datakilde', 'FEST-lesingen ga ingen preparater', '20', stopp('FEST har ingen perorale preparater av vortioksetin.'), { fest: TOMT_UTTREKK }),
  vort('V33', 'regelendring', 'trinnlengden endret uten ny godkjenning', '20', ingenPlan('Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt.'), {
    regel: endretRegel('seponering-vortioksetin', 'trinnlengden 28 → 21 dager', (r) => {
      const f = r.plan.forlop[0]!.faser[0]!
      if (f.type === 'nedtrapping') f.trinnlengde.verdi = 21
    }),
  }),
  vort('V34', 'regelendring', 'ny regelversjon uten ny godkjenning', '20', ingenPlan('Godkjenningen gjelder regelversjon 11, ikke versjon 12.'), { regel: nyVersjon('seponering-vortioksetin') }),
  vort('V35', 'ikke_godkjent', 'den langsomme varianten, som ikke er godkjent', '20', stopp('vortioksetin dag 1–28: den ideelle dosen 19 mg kan ikke gis med preparatene i FEST nøyaktig.', UTENFOR_OMFANG), { regel: { id: 'seponering-vortioksetin-langsom' } }),
  vort('V36', 'nodstopp', 'regelen er deaktivert', '20', { utfall: 'sperret' }, { sperrer: [sperre('regel', 'seponering-vortioksetin')] }),
  vort('V37', 'nodstopp', 'en annen regel er deaktivert', '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Vortioksetin peroralt: 15 mg = 1 tablett à 15 mg'), { sperrer: [sperre('regel', 'depot-paliperidon-xeplion')] }),

  // --- Sertralin → mirtazapin v9: startforløp fra 50 eller 100 mg, kort behandlingstid, tabletter.
  sert('S00', 'preparat', 'sertralin 100 mg uten valgt legemiddelform: siden ber om valget', '100', { utfall: 'formvalg', forlop: ['til'] }, { skjema: { formvalg: { fra: { legemiddelform: '53' } } } }),
  sert('S01', 'vanlig_dose', 'sertralin 100 mg', '100', plan(STARTFORLOP, 'Dag 1–14: Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg', 'Fra dag 15: Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg')),
  sert('S02', 'vanlig_dose', 'sertralin 50 mg', '50', plan(STARTFORLOP, 'Fra dag 1: Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg')),
  sert('S03', 'injeksjonsdato', 'sertralin 100 mg med startdato', '100', plan(STARTFORLOP, 'Dag 1–14 (28.12.2026–10.01.2027): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg', 'Fra dag 15 (fra 11.01.2027): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg'), { skjema: { startdato: '2026-12-28' } }),
  sert('S04', 'uvanlig_dose', 'sertralin 75 mg', '75', stopp('Startdosen 75 mg er utenfor det regelen gjelder for (50, 100 mg).', UTENFOR_OMFANG)),
  sert('S05', 'uvanlig_dose', 'sertralin 150 mg', '150', stopp('Startdosen 150 mg er utenfor det regelen gjelder for (50, 100 mg).', UTENFOR_OMFANG)),
  sert('S06', 'uvanlig_dose', 'sertralin 200 mg', '200', stopp('Startdosen 200 mg er utenfor det regelen gjelder for (50, 100 mg).', UTENFOR_OMFANG)),
  sert('S07', 'uvanlig_dose', 'sertralin 25 mg', '25', stopp('Startdosen 25 mg er utenfor det regelen gjelder for (50, 100 mg).', UTENFOR_OMFANG)),
  sert('S08', 'pasientforhold', 'lang behandlingstid', '100', stopp('Svaret ja (lang behandlingstid) krever en skriftlig begrunnelse fra forskriveren, en særskilt vurdering.', UTENFOR_OMFANG), { skjema: { svar: { lang_behandlingstid: true } } }),
  sert('S09', 'pasientforhold', 'tidligere seponeringssymptomer', '100', stopp('Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes.'), { skjema: { pasientforhold: { tidligere_seponeringssymptomer: true } } }),
  sert('S10', 'pasientforhold', 'tidligere seponeringssymptomer står ubesvart', '100', stopp('Må avklares før beregning (ukjent): Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes.'), { ubesvart: ['tidligere_seponeringssymptomer'] }),
  sert('S11', 'interaksjon', 'annen serotonerg legemiddelbruk ikke vurdert', '100', stopp('Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre'), { skjema: { bekreftet: ['toleranse_overlapp'] } }),
  sert('S12', 'interaksjon', 'toleranse ved overlapp ikke vurdert', '100', stopp('Må bekreftes før beregning: Toleransen vurderes før hver reduksjon av sertralin: dagene er minstetider, og neste reduksjon gjøres først når eventuelle'), { skjema: { bekreftet: ['serotonerg_sammedisinering'] } }),
  sert('S13', 'preparat', 'mirtazapin som smeltetablett', '100', ingenPlan('Startdosen 100 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 50 og 100 mg, FEST-legemiddelform', UTENFOR_OMFANG), { skjema: { formvalg: { fra: { legemiddelform: '53' }, til: { legemiddelform: '48' } } } }),
  sert('S14', 'preparat', 'mirtazapin 15 mg avregistrert', '100', stopp('mirtazapin (til): styrken 15 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den', UTENFOR_OMFANG), { fest: avregistrert('mirtazapin', 15) }),
  sert('S15', 'preparat', 'sertralin 25 mg avregistrert', '50', stopp('sertralin (fra): styrken 25 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den', UTENFOR_OMFANG), { fest: avregistrert('sertralin', 25) }),
  sert('S16', 'preparat', 'sertralin 50 mg meldt avregistrert om 7 dager', '100', plan(STARTFORLOP, 'Dag 1–14: Sertralin peroralt: 50 mg = 2 tabletter à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg', 'Fra dag 15: Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg'), { fest: avregistrert('sertralin', 50, undefined, 7) }),
  sert('S17', 'foreldet_fest', 'FEST kontrollert for 49 timer siden', '100', ingenPlan('Den nattlige oppdateringen har ikke gått siden'), { timer: 49 }),
  sert('S18', 'regelendring', 'ny regelversjon uten ny godkjenning', '100', ingenPlan('Godkjenningen gjelder regelversjon 9, ikke versjon 10.'), { regel: nyVersjon('kryssnedtrapping-sertralin-mirtazapin') }),
  sert('S19', 'nodstopp', 'verktøyet er deaktivert', '100', { utfall: 'sperret' }, { sperrer: [sperre('verktoy', BYTTE_AD)] }),

  // --- Abilify Maintena v3: peroral aripiprazol 10–20 mg til den månedlige depotinjeksjonen.
  ari('M01', 'vanlig_dose', 'aripiprazol 15 mg', '15', plan(null, 'Dag 1–14: Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg', 'Dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg', 'Fra dag 15: Aripiprazol peroralt: Seponert', 'Hver måned fra 1 måned etter dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg (tidligst 26 dager etter forrige)')),
  ari('M02', 'uvanlig_dose', 'aripiprazol 10 mg, nedre grense', '10', plan(null, 'Dag 1–14: Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg', 'Dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg', 'Fra dag 15: Aripiprazol peroralt: Seponert', 'Hver måned fra 1 måned etter dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg (tidligst 26 dager etter forrige)')),
  ari('M03', 'uvanlig_dose', 'aripiprazol 20 mg, øvre grense', '20', plan(null, 'Dag 1–14: Aripiprazol peroralt: 20 mg = 2 tabletter à 10 mg', 'Dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg', 'Fra dag 15: Aripiprazol peroralt: Seponert', 'Hver måned fra 1 måned etter dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg (tidligst 26 dager etter forrige)')),
  ari('M04', 'uvanlig_dose', 'aripiprazol 25 mg', '25', stopp('Startdosen 25 mg er utenfor det regelen gjelder for (10–20 mg).')),
  ari('M05', 'uvanlig_dose', 'aripiprazol 5 mg', '5', stopp('Startdosen 5 mg er utenfor det regelen gjelder for (10–20 mg).')),
  ari('M06', 'uvanlig_dose', 'aripiprazol 12,5 mg', '12,5', stopp('aripiprazol dag 1–14: den ideelle dosen 12,5 mg kan ikke gis med preparatene i FEST nøyaktig.')),
  ari('M07', 'injeksjonsdato', 'aripiprazol 15 mg med startdato i slutten av måneden', '15', plan(null, 'Dag 1–14 (31.01.2027–13.02.2027): Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg', 'Dag 1 (31.01.2027): Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg', 'Fra dag 15 (fra 14.02.2027): Aripiprazol peroralt: Seponert', 'Hver måned fra 1 måned etter dag 1 (første 28.02.2027): Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg (tidligst 26 dager etter forrige)'), { skjema: { startdato: '2027-01-31' } }),
  ari('M08', 'pasientforhold', 'kjent langsom CYP2D6-omsetter', '15', stopp('Regelen gjelder ikke: Pasienten er kjent langsom CYP2D6-omsetter; preparatomtalen har egne doser.'), { skjema: { pasientforhold: { cyp2d6_langsom: true } } }),
  ari('M09', 'interaksjon', 'sterk CYP2D6- eller CYP3A4-hemmer', '15', stopp('Regelen gjelder ikke: Pasienten bruker en sterk CYP2D6- eller CYP3A4-hemmer; dosen skal reduseres.'), { skjema: { pasientforhold: { sterk_cyp_hemmer: true } } }),
  ari('M10', 'interaksjon', 'CYP3A4-induktor', '15', stopp('Regelen gjelder ikke: Pasienten bruker en CYP3A4-induktor, som bør unngås sammen med depotet.'), { skjema: { pasientforhold: { cyp3a4_induktor: true } } }),
  ari('M11', 'interaksjon', 'hemmer står ubesvart', '15', stopp('Må avklares før beregning (ukjent): Pasienten bruker en sterk CYP2D6- eller CYP3A4-hemmer; dosen skal reduseres.'), { ubesvart: ['sterk_cyp_hemmer'] }),
  ari('M12', 'pasientforhold', 'indikasjonen ikke bekreftet', '15', stopp('Må bekreftes før beregning: Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral aripiprazol.'), { skjema: { bekreftet: [] } }),
  ari('M13', 'preparat', 'presentasjonen til injeksjon annenhver måned', '15', stopp('Ingen av depotpreparatene (Abilify Maintena) av aripiprazol i FEST kan brukes med valgene som er gjort: ingen passer valgene.'), { skjema: { formvalg: { fra: { legemiddelform: '53' }, til: { legemiddelform: '913' } } } }),
  ari('M14', 'preparat', 'Abilify Maintena 400 mg avregistrert', '15', stopp('Ingen av depotpreparatene (Abilify Maintena) av aripiprazol i FEST kan brukes: Abilify Maintena pulv til depotinj væske, susp 400 mg/sprøyte: er avregistrert i'), { fest: avregistrert('aripiprazol', 400, 'Abilify Maintena') }),
  ari('M15', 'preparat', 'Abilify Maintena 400 mg midlertidig utgått', '15', stopp('Ingen av depotpreparatene (Abilify Maintena) av aripiprazol i FEST kan brukes: Abilify Maintena pulv til depotinj væske, susp 400 mg/sprøyte: er midlertidig'), { fest: midlertidigUtgatt('aripiprazol', 400, 'Abilify Maintena') }),
  ari('M16', 'preparat', 'aripiprazol 15 mg tabletter avregistrert', '15', plan(null, 'Dag 1–14: Aripiprazol peroralt: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg', 'Dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg', 'Fra dag 15: Aripiprazol peroralt: Seponert', 'Hver måned fra 1 måned etter dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg (tidligst 26 dager etter forrige)'), { fest: avregistrert('aripiprazol', 15) }),
  ari('M17', 'foreldet_fest', 'FEST kontrollert for 49 timer siden', '15', ingenPlan('Den nattlige oppdateringen har ikke gått siden'), { timer: 49 }),
  ari('M18', 'nodstopp', 'Maintena-regelen er deaktivert', '15', { utfall: 'sperret' }, { sperrer: [sperre('regel', 'depot-aripiprazol-maintena')] }),

  // --- Xeplion v3: peroral paliperidon 3, 6, 9 eller 12 mg til depotinjeksjon.
  pali('X01', 'vanlig_dose', 'paliperidon 6 mg', '6', plan(null, 'Fra dag 1: Paliperidon peroralt: Seponert', 'Dag 1: Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)', 'Dag 8: Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)', 'Hver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)')),
  pali('X02', 'injeksjonsdato', 'paliperidon 6 mg med startdato', '6', plan(null, 'Fra dag 1 (fra 02.11.2026): Paliperidon peroralt: Seponert', 'Dag 1 (02.11.2026): Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)', 'Dag 8 (09.11.2026): Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)', 'Hver måned fra 1 måned etter dag 8 (første 09.12.2026): Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)'), { skjema: { startdato: '2026-11-02' } }),
  pali('X03', 'injeksjonsdato', 'startdato slik at dag 8 er siste dag i januar', '6', plan(null, 'Fra dag 1 (fra 24.01.2027): Paliperidon peroralt: Seponert', 'Dag 1 (24.01.2027): Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)', 'Dag 8 (31.01.2027): Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)', 'Hver måned fra 1 måned etter dag 8 (første 28.02.2027): Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)'), { skjema: { startdato: '2027-01-24' } }),
  pali('X04', 'injeksjonsdato', 'startdato slik at dag 8 er skuddårsdagen', '6', plan(null, 'Fra dag 1 (fra 22.02.2028): Paliperidon peroralt: Seponert', 'Dag 1 (22.02.2028): Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)', 'Dag 8 (29.02.2028): Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)', 'Hver måned fra 1 måned etter dag 8 (første 29.03.2028): Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)'), { skjema: { startdato: '2028-02-22' } }),
  pali('X05', 'injeksjonsdato', 'startdato som ikke finnes', '6', stopp('Startdatoen «2026-02-30» er ikke en gyldig dato (ÅÅÅÅ-MM-DD).'), { skjema: { startdato: '2026-02-30' } }),
  pali('X06', 'vanlig_dose', 'paliperidon 9 mg', '9', plan(null, 'Fra dag 1: Paliperidon peroralt: Seponert', 'Dag 1: Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)', 'Dag 8: Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)', 'Hver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±7 dager, deltoideus eller setemuskel; etter bytte fra 9–12 mg kan setemuskelen gi lavere eksponering de første seks månedene, så deltoideus bør vurderes)')),
  pali('X07', 'vanlig_dose', 'paliperidon 12 mg', '12', plan(null, 'Fra dag 1: Paliperidon peroralt: Seponert', 'Dag 1: Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)', 'Dag 8: Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)', 'Hver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (±7 dager, deltoideus eller setemuskel; etter bytte fra 9–12 mg kan setemuskelen gi lavere eksponering de første seks månedene, så deltoideus bør vurderes)')),
  pali('X08', 'uvanlig_dose', 'paliperidon 3 mg uten måldose', '3', { utfall: 'mangler', grunner: ['Måldosen må fylles inn som et tall større enn 0.'] }),
  pali('X09', 'uvanlig_dose', 'paliperidon 3 mg med måldose 50 mg', '3', plan(null, 'Fra dag 1: Paliperidon peroralt: Seponert', 'Dag 1: Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)', 'Dag 8: Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)', 'Hver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon 50 mg = 1 injeksjon à 50 mg (±7 dager, deltoideus eller setemuskel)'), { skjema: { maldose: '50' } }),
  pali('X10', 'uvanlig_dose', 'paliperidon 3 mg med måldose 75 mg', '3', stopp('Måldosen 75 mg er utenfor spennet 25–50 mg i omregningstabellen.'), { skjema: { maldose: '75' } }),
  pali('X11', 'uvanlig_dose', 'paliperidon 7 mg', '7', stopp('Startdosen 7 mg er utenfor det regelen gjelder for (3, 6, 9, 12 mg).')),
  pali('X12', 'uvanlig_dose', 'paliperidon 15 mg', '15', stopp('Startdosen 15 mg er utenfor det regelen gjelder for (3, 6, 9, 12 mg).')),
  pali('X13', 'pasientforhold', 'kreatininclearance under 80 ml/min', '6', stopp('Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og'), { skjema: { pasientforhold: { nedsatt_nyrefunksjon: true } } }),
  pali('X14', 'pasientforhold', 'nyrefunksjonen står ubesvart', '6', stopp('Må avklares før beregning (ukjent): Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80'), { ubesvart: ['nedsatt_nyrefunksjon'] }),
  pali('X15', 'preparat', 'Xeplion 75 mg avregistrert', '6', stopp('paliperidon (til): vedlikeholdet er 75 mg, men FEST har ingen brukbar injeksjon med den styrken (brukbare styrker: 50, 100, 150 mg).'), { fest: avregistrert('paliperidon', 75, 'Xeplion') }),
  pali('X16', 'preparat', 'Xeplion 150 mg meldt avregistrert om 3 dager', '6', stopp('paliperidon (til): injeksjonen dag 1 er 150 mg, men FEST har ingen brukbar injeksjon med den styrken (brukbare styrker: 50, 75, 100, 150 mg).'), { fest: avregistrert('paliperidon', 150, 'Xeplion', 3) }),
  pali('X17', 'preparat', 'alle paliperidonpreparatene krever godkjenningsfritak', '6', stopp('Ingen av depotpreparatene (Xeplion) av paliperidon i FEST kan brukes: Xeplion depotinj væske, susp 75 mg/sprøyte: krever godkjenningsfritak, som ikke er valgt'), { fest: bareFritak('paliperidon') }),
  pali('X18', 'foreldet_fest', 'FEST kontrollert for 49 timer siden', '6', ingenPlan('Den nattlige oppdateringen har ikke gått siden'), { timer: 49 }),
  pali('X19', 'regelendring', 'vedlikeholdsdosen ved 6 mg endret uten ny godkjenning', '6', ingenPlan('Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt.'), {
    regel: endretRegel('depot-paliperidon-xeplion', 'vedlikeholdet ved 6 mg endret fra 75 til 100 mg', (r) => {
      for (const rad of omregningsrader(r)) if (rad.fra_mg === 6) rad.til_mg = 100
    }),
  }),
  pali('X21', 'uvanlig_dose', 'paliperidon 3 mg med måldose 25 mg, nedre grense i spennet', '3', stopp('paliperidon (til): vedlikeholdet er 25 mg, men FEST har ingen brukbar injeksjon med den styrken (brukbare styrker: 50, 75, 100, 150 mg).'), { skjema: { maldose: '25' } }),
  pali('X22', 'uvanlig_dose', 'paliperidon 3 mg med måldose 24,99 mg', '3', stopp('Måldosen 24,99 mg er utenfor spennet 25–50 mg i omregningstabellen.'), { skjema: { maldose: '24,99' } }),
  pali('X23', 'uvanlig_dose', 'paliperidon 3 mg med måldose 50,01 mg', '3', stopp('Måldosen 50,01 mg er utenfor spennet 25–50 mg i omregningstabellen.'), { skjema: { maldose: '50,01' } }),
  pali('X24', 'uvanlig_dose', 'paliperidon 6 mg med en måldose som står igjen fra 3 mg', '6', plan(null, 'Fra dag 1: Paliperidon peroralt: Seponert', 'Dag 1: Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)', 'Dag 8: Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)', 'Hver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)'), { skjema: { maldose: '50' } }),
  pali('X25', 'injeksjonsdato', 'paliperidon 3 mg med måldose 50 mg og startdato, som regelens eksempel', '3', plan(null, 'Fra dag 1 (fra 24.01.2027): Paliperidon peroralt: Seponert', 'Dag 1 (24.01.2027): Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)', 'Dag 8 (31.01.2027): Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)', 'Hver måned fra 1 måned etter dag 8 (første 28.02.2027): Paliperidon depotinjeksjon 50 mg = 1 injeksjon à 50 mg (±7 dager, deltoideus eller setemuskel)'), { skjema: { maldose: '50', startdato: '2027-01-24' } }),
  pali('X20', 'nodstopp', 'Maintena-regelen er deaktivert, ikke Xeplion', '6', plan(null, 'Fra dag 1: Paliperidon peroralt: Seponert', 'Dag 1: Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)', 'Dag 8: Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)', 'Hver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)'), { sperrer: [sperre('regel', 'depot-aripiprazol-maintena')] }),

  // --- Fagtekst uten beregning, godkjent: bupropion v5 og agomelatin v1.
  { id: 'F01', kategori: 'fagtekst', hva: 'bupropion', verktoy: SEPONERING, valg: { fra: peroral('bupropion') }, uttrekk: 'aksept', dose: '300', forventet: { utfall: 'fagtekst', regler: ['seponering-bupropion v5'] } },
  { id: 'F02', kategori: 'fagtekst', hva: 'agomelatin', verktoy: SEPONERING, valg: { fra: peroral('agomelatin') }, uttrekk: 'aksept', dose: '25', forventet: { utfall: 'fagtekst', regler: ['seponering-agomelatin v1'] } },
  { id: 'F03', kategori: 'nodstopp', hva: 'bupropion med regelen deaktivert', verktoy: SEPONERING, valg: { fra: peroral('bupropion') }, uttrekk: 'aksept', dose: '300', sperrer: [sperre('regel', 'seponering-bupropion')], forventet: { utfall: 'sperret' } },
  { id: 'F04', kategori: 'nodstopp', hva: 'agomelatin med alle verktøyene deaktivert', verktoy: SEPONERING, valg: { fra: peroral('agomelatin') }, uttrekk: 'aksept', dose: '25', sperrer: [sperre('alle', null)], forventet: { utfall: 'sperret' } },
  { id: 'F05', kategori: 'ikke_godkjent', hva: 'fagtekstregelen brakt direkte til beregningen', verktoy: SEPONERING, valg: { fra: peroral('bupropion') }, uttrekk: 'aksept', dose: '300', regel: { id: 'seponering-bupropion' }, forventet: stopp('Regelen er bare tekstlig veiledning og har ingen beregnbar plan.') },

  // --- Regler som ikke er godkjent, og kombinasjoner uten regel.
  { id: 'I01', kategori: 'ikke_godkjent', hva: 'escitalopram', verktoy: SEPONERING, valg: { fra: peroral('escitalopram') }, uttrekk: 'aksept', dose: '10', forventet: { utfall: 'ingen', status: 'ikke_godkjent' } },
  { id: 'I02', kategori: 'ikke_godkjent', hva: 'duloksetin', verktoy: SEPONERING, valg: { fra: peroral('duloksetin') }, uttrekk: 'aksept', dose: '60', forventet: { utfall: 'ingen', status: 'ikke_godkjent' } },
  { id: 'I03', kategori: 'ikke_godkjent', hva: 'fenelzin (MAO-hemmer)', verktoy: SEPONERING, valg: { fra: peroral('fenelzin') }, uttrekk: 'aksept', dose: '45', forventet: { utfall: 'ingen', status: 'ikke_stottet' } },
  { id: 'I04', kategori: 'ikke_godkjent', hva: 'olanzapin → kvetiapin', verktoy: BYTTE_AP, valg: { fra: peroral('olanzapin'), til: peroral('kvetiapin') }, uttrekk: 'pilot', dose: '10', forventet: { utfall: 'ingen', status: 'ikke_godkjent' } },
  { id: 'I05', kategori: 'ikke_godkjent', hva: 'escitalopramregelen brakt direkte til beregningen', verktoy: SEPONERING, valg: { fra: peroral('escitalopram') }, uttrekk: 'aksept', dose: '20', skjema: tablett('fra'), regel: { id: 'seponering-escitalopram' }, forventet: ingenPlan('Regelversjonen er ikke godkjent, ikke klinisk godkjent.') },
  { id: 'I06', kategori: 'ikke_godkjent', hva: 'olanzapin → kvetiapin brakt direkte til beregningen', verktoy: BYTTE_AP, valg: { fra: peroral('olanzapin'), til: peroral('kvetiapin') }, uttrekk: 'pilot', dose: '10', skjema: { maldose: '300', ...tablett('fra', 'til') }, regel: { id: 'antipsykotikabytte-olanzapin-kvetiapin' }, forventet: ingenPlan('Regelversjonen er ikke godkjent, ikke klinisk godkjent.') },
  {
    id: 'I07',
    kategori: 'regelendring',
    hva: 'godkjenningen fjernet fra en godkjent regel',
    verktoy: BYTTE_AP,
    valg: MAINTENA,
    uttrekk: 'pilot',
    dose: '15',
    skjema: tablett('fra'),
    regel: endretRegel('depot-aripiprazol-maintena', 'siste godkjenning fjernet fra historikken', (r) => void r.godkjenning.historikk.pop()),
    forventet: ingenPlan('Siste steg er ikke en klinisk godkjenning fra en uavhengig kontrollør.'),
  },
]

/* --- Rapporten ------------------------------------------------------------------------ */

const REGLER_I_MATRISEN: { tittel: string; prefiks: string }[] = [
  { tittel: 'Seponering av vortioksetin (versjon 11)', prefiks: 'V' },
  { tittel: 'Sertralin → mirtazapin (versjon 9)', prefiks: 'S' },
  { tittel: 'Peroral aripiprazol → Abilify Maintena (versjon 3)', prefiks: 'M' },
  { tittel: 'Peroral paliperidon → Xeplion (versjon 3)', prefiks: 'X' },
  { tittel: 'Fagtekst: bupropion (versjon 5) og agomelatin (versjon 1)', prefiks: 'F' },
  { tittel: 'Regler som ikke er godkjent', prefiks: 'I' },
]

const celle = (x: string) => x.replace(/\|/g, '\\|').replace(/\n/g, ' ')

/** Utfallet i én celle: radene i planen, eller hvorfor ingen plan vises. */
function utfallstekst(u: Pilotutfall): string {
  switch (u.utfall) {
    case 'plan':
      return `**Plan**${u.undertittel ? ` – *${u.undertittel}*` : ''}<br>${u.linjer.map(celle).join('<br>')}`
    case 'stopp':
      return `**Ingen plan.** ${celle(u.grunner.filter((g) => g !== 'Ingen klinisk doseplan kan vises.').join(' '))}`
    case 'mangler':
      return `**Skjemaet mangler:** ${celle(u.grunner.join(' '))}`
    case 'formvalg':
      return `**Siden ber om legemiddelform** for ${u.forlop.join(', ')}`
    case 'fagtekst':
      return `**Fagtekst, ingen beregning** (${u.regler.join(', ')})`
    case 'ingen':
      return `**Ingen plan eller fagtekst** (status ${u.status}). ${celle(u.grunner.join(' '))}`
    case 'sperret':
      return '**Midlertidig deaktivert** – ingen plan eller fagtekst'
  }
}

const endringstekst = (k: Pilotkasus) =>
  [
    k.skjema?.startdato && `startdato ${k.skjema.startdato}`,
    k.skjema?.maldose && `måldose ${k.skjema.maldose} mg`,
    k.ubesvart?.length && `ubesvart: ${k.ubesvart.join(', ')}`,
    k.fest?.hva,
    k.timer !== undefined && `${k.timer} timer etter FEST-kontrollen`,
    k.regel && `regelen ${k.regel.id} direkte${k.regel.endre ? `, ${k.regel.endre.hva}` : ''}`,
    k.sperrer?.length && `sperre: ${k.sperrer.map((s) => `${s.omfang}${s.mal ? ` ${s.mal}` : ''}`).join(', ')}`,
  ]
    .filter(Boolean)
    .join('; ')

/** Rapporten i `docs/verktøy-p11-testmatrise.md`. */
export function lagPilotmatriserapport(uttrekkene: Uttrekkene): string {
  const resultater = PILOTKASUS.map((k) => ({ k, u: kjorKasus(k, uttrekkene) }))
  const avvik = resultater.filter(({ k, u }) => avvikFra(k, u).length > 0)
  const telling = (f: (u: Pilotutfall) => boolean) => resultater.filter(({ u }) => f(u)).length
  const linjer = [
    '# OUSFAR Verktøy – ende-til-ende-testmatrisen for de godkjente reglene (P11.1–P11.4)',
    '',
    '> Generert av `npm run verktoy:regler -- pilotmatrise` fra `src/verktoy/regler/pilotmatrise.ts`. Ikke rediger for hånd; testene sier fra når rapporten ikke er oppdatert.',
    '',
    'Hvert kasus går den samme veien som verktøysiden: tilgjengeligheten for valgene, nødstoppen, det som mangler i skjemaet, valget av legemiddelform, beregningen med preparatene i det lagrede FEST-uttrekket og visningen. Radene under «Plan» er radene i tabellen og i teksten som kopieres. Kasusene er syntetiske, uten pasientopplysninger; endringer av FEST og regler gjøres på en kopi. Prosedyrene og vurderingene står i `docs/verktøy-p11-publisering.md`.',
    '',
    `FEST-uttrekkene: \`${FEST_PILOT}\` (hentet ${uttrekkene.pilot.hentet}) og \`${FEST_AKSEPTTEST}\` (hentet ${uttrekkene.aksept.hentet}), begge kontrollert ${uttrekkene.pilot.utvalg.kontrollert_kl}. Kasusene beregnes ${STANDARD_TIMER} timer etter kontrollen, om ikke annet står.`,
    '',
    `**${PILOTKASUS.length} kasus:** ${telling((u) => u.utfall === 'plan')} gir en plan, ${telling((u) => u.utfall === 'stopp')} stopper, ${telling((u) => u.utfall === 'mangler')} mangler noe i skjemaet, ${telling((u) => u.utfall === 'formvalg')} ber om legemiddelform, ${telling((u) => u.utfall === 'fagtekst')} gir fagtekst, ${telling((u) => u.utfall === 'ingen')} gir verken plan eller fagtekst og ${telling((u) => u.utfall === 'sperret')} er deaktivert. ${avvik.length === 0 ? 'Alle utfallene er som forventet.' : `**${avvik.length} utfall avviker fra forventningen.**`}`,
    '',
    '## Kategoriene',
    '',
    '| Kategori | Kasus |',
    '|---|---|',
    ...Object.entries(KATEGORIER).map(([k, tekst]) => `| ${tekst} | ${PILOTKASUS.filter((x) => x.kategori === k).map((x) => x.id).join(', ')} |`),
  ]
  for (const { tittel, prefiks } of REGLER_I_MATRISEN) {
    linjer.push('', `## ${tittel}`, '', '| Kasus | Kategori | Hva | Dose | Endring | Utfall |', '|---|---|---|---|---|---|')
    for (const { k, u } of resultater.filter(({ k }) => k.id.startsWith(prefiks))) {
      const feil = avvikFra(k, u)
      linjer.push(`| ${k.id}${feil.length > 0 ? ' ✗' : ''} | ${KATEGORIER[k.kategori]} | ${celle(k.hva)} | «${celle(k.dose)}» | ${celle(endringstekst(k)) || '–'} | ${utfallstekst(u)} |`)
    }
  }
  return `${linjer.join('\n')}\n`
}
