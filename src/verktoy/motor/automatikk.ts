/**
 * Det verktøyet kan avgjøre selv i stedet for å spørre (B3 og B4 i
 * `docs/verktøy-brukervennlighet-2026-11.md`), forberedt men ikke i bruk før
 * beslutningene er akseptert:
 *
 * - **B4, legemiddelform:** når bare én form kan gi en komplett plan innenfor
 *   det som er godkjent, velger verktøyet den og sier hvorfor
 *   ({@link formForslag}). Av til {@link BESLUTNINGER}.B4 er satt.
 * - **B3, dose per trinn:** når regelen uttrykkelig tillater det
 *   (`automatisk_trinnvalg` i nedtrappingsfasen, bundet til fingeravtrykket og
 *   godkjenningen), velger verktøyet den foretrukne dosen for et trinn som
 *   ellers krever forskriverens valg ({@link medAutomatiskeTrinnvalg}).
 *   Ingen regel har feltet.
 *
 * Begge bruker bare {@link kliniskDoseplan}: en plan vises fortsatt bare når
 * motoren har beregnet den komplett med de faktiske svarene (S1, S9), og
 * valgene står i planen så forskriveren kan endre dem.
 */
import type { Fase, Regel, Regelsett, Trinnvalgsvar } from '../regler/modell'
import { avrund } from '../regler/beregning'
import type { Preparatgrunnlag } from './byggesteiner'
import { formvalgSomTrengs, kliniskDoseplan, type Doseplaninndata, type Doseplanresultat, type Omgivelse, type Trinnvalg } from './plan'

/** Beslutningene fra ChatGPT (og Peder) som styrer automatikken; `true` først når beslutningen er akseptert og dokumentert. */
export const BESLUTNINGER = { B4: false } as const

/** Høyst så mange beregninger i ett søk etter en komplett plan; går det ikke innen det, regnes svaret som ukjent. */
export const MAKS_BEREGNINGER = 200

type Args = [Regel, Doseplaninndata, Preparatgrunnlag, Omgivelse, Regelsett?]

const valgFra = (t: Trinnvalg, mg: number): Trinnvalgsvar => ({ forlop: t.forlop, trinn: t.trinn, fra_mg: t.fra_mg, mg })
const neste = (r: Doseplanresultat) => r.trinnvalg?.find((t) => !t.mellomtrinn)

/**
 * Om forskriverens valg av dose per trinn kan gi en komplett, klinisk plan med
 * disse inndataene: `ja` med valgene som gir den, `nei` når ingen vei gjør det,
 * og `ukjent` når søket ble for stort ({@link MAKS_BEREGNINGER}). Planen selv
 * vises ikke herfra (S9); den gir bare svaret og veien.
 */
export function kanBliKomplett(...[regel, inndata, grunnlag, omgivelse, regelsett]: Args): { svar: 'ja'; trinnvalg: Trinnvalgsvar[] } | { svar: 'nei' | 'ukjent' } {
  let igjen = MAKS_BEREGNINGER
  const sok = (valg: Trinnvalgsvar[]): Trinnvalgsvar[] | null | 'ukjent' => {
    if (igjen-- <= 0) return 'ukjent'
    const r = kliniskDoseplan(regel, { ...inndata, trinnvalg: [...(inndata.trinnvalg ?? []), ...valg] }, grunnlag, omgivelse, regelsett)
    if (r.status === 'doseplan') return valg
    const t = neste(r)
    if (!t) return null
    let ukjent = false
    // Den foretrukne dosen først ({@link foretrukket}), så de andre.
    for (const d of [...t.doser].sort((a, b) => foretrukketKost(t, a.mg) - foretrukketKost(t, b.mg))) {
      const x = sok([...valg, valgFra(t, d.mg)])
      if (x === 'ukjent') ukjent = true
      else if (x) return x
    }
    return ukjent ? 'ukjent' : null
  }
  const x = sok([])
  return x === 'ukjent' ? { svar: 'ukjent' } : x ? { svar: 'ja', trinnvalg: x } : { svar: 'nei' }
}

/** Hvor langt en dose er fra den foretrukne for trinnet: nærmest den beregnede dosen, og ved likt den høyeste (minst reduksjon). */
const foretrukketKost = (t: Pick<Trinnvalg, 'beregnet_mg'>, mg: number) => Math.abs(mg - t.beregnet_mg) * 1e6 - mg

/** Den foretrukne dosen for et trinn: nærmest den beregnede dosen, og ved likt den høyeste, så reduksjonen aldri blir større enn nødvendig. */
export function foretrukket(t: Trinnvalg): number {
  return [...t.doser].sort((a, b) => foretrukketKost(t, a.mg) - foretrukketKost(t, b.mg))[0]!.mg
}

export interface Formforslag {
  forlop: string
  legemiddelform: string
  navn: string
  /** Hvorfor verktøyet valgte formen, til planen. */
  grunn: string
}

/**
 * B4: legemiddelformen verktøyet kan velge selv, når ett forløp mangler et
 * formvalg og bare én av formene kan gi en komplett plan med svarene som er
 * gitt. `null` når beslutningen ikke er akseptert, når ingen eller flere
 * former kan gi en komplett plan, eller når svaret er ukjent.
 */
export function formForslag(...args: [...Args] | [...Args, { aktiv?: boolean }]): Formforslag | null {
  const [regel, inndata, grunnlag, omgivelse, regelsett, valg] = args as [...Args, { aktiv?: boolean }?]
  if (!(valg?.aktiv ?? BESLUTNINGER.B4)) return null
  const trengs = Object.entries(formvalgSomTrengs(regel, inndata, grunnlag, omgivelse.idag)).filter(
    ([id, a]) => a.klasser.length <= 1 && a.legemiddelformer.length > 1 && !inndata.formvalg?.[id]?.legemiddelformer,
  )
  if (trengs.length !== 1) return null
  const [forlop, alternativer] = trengs[0]!
  const mulige = alternativer.legemiddelformer.filter((f) => {
    const med = { ...inndata, formvalg: { ...inndata.formvalg, [forlop]: { ...inndata.formvalg?.[forlop], legemiddelformer: [f.kode] } } }
    return kanBliKomplett(regel, med, grunnlag, omgivelse, regelsett).svar === 'ja'
  })
  if (mulige.length !== 1) return null
  const f = mulige[0]!
  return { forlop, legemiddelform: f.kode, navn: f.navn, grunn: `Bare ${f.navn.toLowerCase()} gir en komplett plan innenfor det som er godkjent, så verktøyet har valgt den.` }
}

const automatisk = (regel: Regel, forlop: string) =>
  regel.plan.forlop.find((f) => f.id === forlop)?.faser.some((x): x is Extract<Fase, { type: 'nedtrapping' }> => x.type === 'nedtrapping' && !!x.automatisk_trinnvalg) ?? false

/** Et valg verktøyet har gjort selv (B3), med dosene forskriveren kan endre til. */
export interface Automatiskvalg extends Trinnvalgsvar {
  beregnet_mg: number
  alternativer: number[]
}

/**
 * B3: planen med verktøyets egne valg av dose for trinnene som ellers krever
 * forskriverens valg, bare i forløp der regelen har `automatisk_trinnvalg`.
 * Valget er den foretrukne dosen ({@link foretrukket}); et mindre siste trinn
 * (mellomtrinn) velges aldri automatisk. Uten feltet er resultatet nøyaktig
 * {@link kliniskDoseplan}.
 */
export function medAutomatiskeTrinnvalg(...[regel, inndata, grunnlag, omgivelse, regelsett]: Args): { resultat: Doseplanresultat; automatiske: Automatiskvalg[] } {
  const automatiske: Automatiskvalg[] = []
  const beregn = () =>
    kliniskDoseplan(regel, { ...inndata, trinnvalg: [...(inndata.trinnvalg ?? []), ...automatiske.map(({ beregnet_mg: _b, alternativer: _a, ...v }) => v)] }, grunnlag, omgivelse, regelsett)
  let r = beregn()
  for (let n = 0; n < MAKS_BEREGNINGER; n++) {
    const t = neste(r)
    if (r.status !== 'stoppet' || !t || !automatisk(regel, t.forlop)) break
    const mg = foretrukket(t)
    automatiske.push({ ...valgFra(t, mg), beregnet_mg: avrund(t.beregnet_mg), alternativer: t.doser.map((d) => d.mg).filter((x) => x !== mg) })
    r = beregn()
  }
  return { resultat: r, automatiske }
}
