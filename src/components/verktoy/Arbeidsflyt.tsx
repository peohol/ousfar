import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import type { Legemiddelleser, Legemiddelutvalg } from '../../legemiddeldata/lesing'
import {
  begrunnelseshjelp,
  beregnPlan,
  doseenhet,
  festIderFor,
  formvalgFor,
  gjelderFortsatt,
  justeringsfelt,
  kanKreveBegrunnelse,
  lesDose,
  mangler,
  medRegel,
  medTrinnvalg,
  spennFor,
  trengerMaldose,
  ubesvart,
  type Planskjema,
} from '../../verktoy/doseplan'
import { flyttilstand, forhandskontroll, KAN_LAGES_HVIS, medFlytsvar, medIngenAvDisse, type Flyttilstand, type Flytsporsmal, type Stoppforklaring } from '../../verktoy/flyt'
import { UKJENT_FORKLARING } from '../../verktoy/flyt/flyt'
import { foretrukketTekst, mellomtrinntekst, tempotekst, trinndosetekst, type Doseplanresultat, type Formalternativer, type Trinnvalg } from '../../verktoy/motor/plan'
import { planvisning, type Planvisning } from '../../verktoy/planvisning'
import { KARTLEGGING, type Verktoy, type Verktoytype } from '../../verktoy/register'
import { avrund } from '../../verktoy/regler/beregning'
import type { Regel, Regelsett } from '../../verktoy/regler/modell'
import { PLAN_TATT_BORT, UKONTROLLERT, usperrede, type Verktoysperre } from '../../verktoy/sperrer'
import { fraForlop, medlemFor, tilForlop, type Verktoyvalg } from '../../verktoy/tilgjengelighet'
import { Button } from '../Button'
import { Details } from '../Details'
import { Lastesirkel } from '../Lasteindikator'
import { Tallfelt } from '../Tallfelt'
import { Ikon } from '../ikon/Ikon'
import { Doseplanvisning } from './Doseplanvisning'
import { FagligGrunnlag, regelgrunnlag } from './FagligGrunnlag'
import { Regelvarsler, type Varseltilstand } from './Regelvarsler'
import { Sporsmalsliste } from './Sporsmalsliste'
import { Svarvalg } from './Svarvalg'

/** Feiler hentingen fra FEST, prøves den én gang til etter så lenge før feilen vises (K6). */
export const FEST_NYTT_FORSOK_MS = 2_000

/** Så lenge etter siste endring beregnes planen av seg selv, så den ikke beregnes for hvert tastetrykk. */
export const AUTOBEREGNING_MS = 250

/** Så lenge brukes preparatene som er lest etter steg 2, i forhåndskontrollen før de leses på nytt. */
export const FORHANDSDATA_GYLDIG_MS = 10 * 60_000

/** Hvor ofte en plan som står, kontrolleres mot klokken: FEST-kopiens alder og dagen. */
const KONTROLLER_PLANEN_MS = 60_000

const vent = (ms: number) => new Promise<void>((ok) => window.setTimeout(ok, ms))

const tall = (x: number) => String(avrund(x)).replace('.', ',')

const navnPaa = (nokkel: string | undefined) => KARTLEGGING.virkestoffer.find((v) => v.nokkel === nokkel)?.navn ?? nokkel ?? ''

/** Overskriftene på stegene, etter hva slags verktøy det er (§3). */
export const STEGTITLER: Record<Verktoytype, readonly [string, string, string, string]> = {
  seponering: ['Hva skal trappes ned', 'Nåværende behandling', 'Om pasienten', 'Planen'],
  bytte: ['Hva skal byttes', 'Nåværende behandling', 'Om pasienten', 'Planen'],
  tillegg: ['Hva skal kombineres', 'Nåværende behandling', 'Om pasienten', 'Planen'],
}

/* --- Oppsettet ------------------------------------------------------------------ */

/**
 * Ett steg i flyten: tallet, overskriften og innholdet. `ferdig` fyller tallet.
 * `reservevisning` merker steget som viser regelens betingelser med regelens
 * egne tekster og svar, fordi katalogen ikke er kontrollert for regelversjonen (S5).
 */
export function Flytsteg({ nr, tittel, ferdig = false, reservevisning = false, children }: { nr: number; tittel: string; ferdig?: boolean; reservevisning?: boolean; children?: ReactNode }) {
  const id = useId()
  return (
    <section className="flytsteg" aria-labelledby={id} data-ferdig={ferdig || undefined} data-reservevisning={reservevisning || undefined}>
      <span className="flytsteg__tall" aria-hidden="true">
        {nr}
      </span>
      <h2 id={id} className="flytsteg__tittel">
        <span className="kun-skjermleser">{`Steg ${nr}${ferdig ? ', utfylt' : ''}: `}</span>
        {tittel}
      </h2>
      {children && <div className="flytsteg__innhold">{children}</div>}
    </section>
  )
}

/** Stegene til venstre og planen til høyre på store skjermer; planen under stegene på smale. */
export function Flytoppsett({ steg, plan, hopp }: { steg: ReactNode; plan: ReactNode; hopp?: ReactNode }) {
  return (
    <div className="verktoyflyt">
      <div className="verktoyflyt__steg">
        {steg}
        {hopp}
      </div>
      <div className="verktoyflyt__plan">{plan}</div>
    </div>
  )
}

/** Panelet planen står i, med steg 4 som overskrift og det som gjelder nå under. */
export function Planpanel({ tittel, ferdig = false, children, panel }: { tittel: string; ferdig?: boolean; children: ReactNode; panel?: MutableRefObject<HTMLElement | null> }) {
  const id = useId()
  return (
    <section ref={panel} className="planpanel" aria-labelledby={id} tabIndex={-1} data-ferdig={ferdig || undefined}>
      <h2 id={id} className="planpanel__tittel">
        <span className="flytsteg__tall" aria-hidden="true">
          4
        </span>
        <span>
          <span className="kun-skjermleser">Steg 4: </span>
          {tittel}
        </span>
      </h2>
      {children}
    </section>
  )
}

/** En kort tekst i planpanelet om hva som gjenstår, eller hvorfor det ikke kommer noen plan. */
export function Panelmelding({ tittel, children, tone, rolle = 'status' }: { tittel?: string; children?: ReactNode; tone?: 'stopp'; rolle?: 'status' | 'alert' }) {
  return (
    <div className="planpanel__melding" data-tone={tone} role={rolle}>
      {tittel && <p className="planpanel__meldingstittel">{tittel}</p>}
      {children}
    </div>
  )
}

/* --- Forhåndsdataene: preparatene fra FEST etter steg 2 ---------------------------- */

export type Forhandsdata = { nokkel: string; status: 'henter' } | { nokkel: string; status: 'feil'; melding: string } | { nokkel: string; status: 'klar'; utvalg: Legemiddelutvalg; tid: Date }

/** Leser preparatene fra FEST, med ett nytt forsøk før feilen gis (K6); `gjeldende` sier om svaret fortsatt trengs. */
async function lesFest(legemidler: Pick<Legemiddelleser, 'les'> | undefined, ider: string[], gjeldende: () => boolean): Promise<Legemiddelutvalg | null> {
  if (!legemidler) throw new Error('Legemiddeldataene kan ikke leses her.')
  const hent = () => legemidler.les(ider)
  return hent().catch(async () => {
    await vent(FEST_NYTT_FORSOK_MS)
    if (!gjeldende()) return null
    return hent()
  })
}

/**
 * Preparatene for regelen og valgene, lest fra FEST så snart dosen er fylt
 * inn (§5.3): steg 2 kan da spørre om legemiddelformen med alternativene som
 * finnes, før ett eneste pasientspørsmål. Planen leser FEST og sperrene på
 * nytt rett før den vises, som før.
 */
function useForhandsdata(
  regel: Regel | undefined,
  valg: Verktoyvalg | undefined,
  aktiv: boolean,
  legemidler: Pick<Legemiddelleser, 'les'> | undefined,
  klokke: () => Date,
  buffer: MutableRefObject<Forhandsdata | null>,
) {
  const nokkel = regel ? JSON.stringify([regel.id, valg]) : ''
  // Det som er lest, står i `buffer` utenfor denne delen, så det ikke leses på nytt når delen kommer tilbake etter en sperrelesing.
  const [data, settData] = useState<Forhandsdata | null>(() => (buffer.current?.status === 'klar' ? buffer.current : null))
  const setData = useCallback(
    (d: Forhandsdata | null) => {
      buffer.current = d
      settData(d)
    },
    [buffer],
  )
  const siste = useRef('')
  // Preparatene leses på nytt når de er lest for lenge siden, så forhåndskontrollen ikke bygger på en FEST-kopi som er byttet ut.
  // Det som står, vises imens, så spørsmålene ikke forsvinner; feiler lesingen, står det som var.
  const fersk = data?.status !== 'klar' || klokke().getTime() - data.tid.getTime() < FORHANDSDATA_GYLDIG_MS
  useEffect(() => {
    if (!regel || !valg || !aktiv || (data?.nokkel === nokkel && fersk)) return
    const forny = data?.nokkel === nokkel && data.status === 'klar'
    // En fornyelse som alt pågår for de samme valgene, startes ikke på nytt.
    if (forny && siste.current.startsWith(`${nokkel}|`)) return
    const denne = `${nokkel}|${Date.now()}`
    siste.current = denne
    if (!forny) setData({ nokkel, status: 'henter' })
    lesFest(legemidler, festIderFor(regel, valg), () => siste.current === denne)
      .then((utvalg) => {
        if (utvalg && siste.current === denne) setData({ nokkel, status: 'klar', utvalg, tid: klokke() })
      })
      .catch((e: unknown) => {
        if (siste.current === denne && !forny) setData({ nokkel, status: 'feil', melding: e instanceof Error ? e.message : String(e) })
      })
      .finally(() => {
        if (siste.current === denne) siste.current = ''
      })
  }, [aktiv, nokkel, data?.nokkel, fersk, legemidler, klokke]) // eslint-disable-line react-hooks/exhaustive-deps
  const gjeldende = data?.nokkel === nokkel ? data : null
  const prov = useCallback(() => setData(null), [setData])
  return { data: gjeldende, prov }
}

/* --- Flyten for en regel som kan beregnes ------------------------------------------ */

/** En plan som vises: valgene (`JSON.stringify(valg)`) og regelen den er beregnet etter. */
export interface Planmerke {
  valg: string
  regel: string
}

/** En sperre som ikke kunne leses: beregningen vises ikke, og grunnen er ikke FEST. */
export class Sperrefeil extends Error {}

type Beregning =
  | { nokkel: string; status: 'henter' }
  | { nokkel: string; status: 'feil'; melding: string; sperre?: boolean }
  | { nokkel: string; status: 'formvalg' }
  | { nokkel: string; status: 'ferdig'; resultat: Doseplanresultat }

export interface ArbeidsflytProps {
  verktoy: Verktoy
  /** Valgene i steg 1, når de er fylt ut. */
  valg: Verktoyvalg | undefined
  /** De godkjente reglene som kan beregnes for valgene; tom når `melding` står. */
  regler: Regel[]
  /** Steg 1, som står over de andre stegene. */
  steg1: ReactNode
  /**
   * Det planpanelet viser når verktøyet ikke kan beregne for valgene: hva som
   * mangler, fagteksten, eller hvorfor ikke. Da står bare steg 1 og panelet.
   * Oppsettet er det samme, så feltene i steg 1 beholder fokus når dette skifter.
   */
  melding?: ReactNode
  skjema: Planskjema
  setSkjema: (endre: (s: Planskjema) => Planskjema) => void
  /** De aktive nødstoppene; `undefined` når de ikke er lest, og da loves ingenting. */
  sperrer: readonly Verktoysperre[] | undefined
  legemidler: Pick<Legemiddelleser, 'les'> | undefined
  /** Leser sperrene på nytt rett før en beregnet plan vises; kaster når de ikke kan leses. */
  hentSperrer: () => Promise<Verktoysperre[]>
  regelsett: Regelsett
  klokke: () => Date
  varsler: Varseltilstand
  /** En plan som ble tatt bort fordi sperrene ikke kunne leses (S6); meldingen vises når den gjelder disse valgene og regelen. */
  tattBort: Planmerke | null
  /** Melder planen som vises nå, eller `null`. */
  onPlan: (plan: Planmerke | null) => void
  /** Forskriveren beregner: meldingen om en plan som ble tatt bort, gjelder ikke lenger. */
  onBeregn: () => void
  /**
   * Inndataene planen sist ble beregnet av seg selv for. Står utenfor denne
   * delen, så en plan som ble tatt bort fordi sperrene ikke kunne leses, ikke
   * beregnes på nytt av seg selv når delen kommer tilbake (VDR-4): det gjør
   * den bare når noe er endret, eller når forskriveren ber om det.
   */
  autoberegnet: MutableRefObject<string | null>
  /** Preparatene som er lest fra FEST etter steg 2, av samme grunn utenfor denne delen. */
  forhandsbuffer: MutableRefObject<Forhandsdata | null>
}

/**
 * Stegene 2–4 for en klinisk godkjent regel (§3 i
 * `docs/verktøy-brukervennlighet-2026-11.md`): nåværende behandling, så
 * spørsmålene regelen trenger, og planen, som beregnes av seg selv så snart
 * alt er besvart. Planen kommer bare fra `beregnPlan` (`kliniskDoseplan`,
 * S1), med preparatene lest fra FEST og sperrene lest på nytt rett før den
 * vises, og den kontrolleres mot klokken mens den står (S7).
 */
export function Arbeidsflyt(p: ArbeidsflytProps) {
  const { verktoy, valg, regler, melding, skjema, setSkjema, sperrer, legemidler, hentSperrer, regelsett, klokke, varsler, tattBort, onPlan, onBeregn, autoberegnet, forhandsbuffer } = p
  const id = useId()
  const titler = STEGTITLER[verktoy.type]
  const aktiv = melding === undefined
  const regel = regler.length === 1 ? regler[0] : regler.find((r) => r.id === skjema.regel)
  const panel = useRef<HTMLElement | null>(null)
  const [visMangler, setVisMangler] = useState(false)
  const valgnokkel = JSON.stringify(valg ?? null)
  useEffect(() => setVisMangler(false), [valgnokkel])
  // Forhåndskontrollen regnes per minutt, som FEST-kopiens alder og dagen planen gjelder for.
  const minutt = klokke().toISOString().slice(0, 16)

  // Før noe er fylt inn: kan valgene i det hele tatt gi en komplett plan? Kan de ikke, spørres det ikke om mer (§5).
  const forValget = useMemo(
    () => (aktiv && valg ? forhandskontroll({ verktoy, valg, regelsett, sperrer, ...(regel && { regel }), naa: klokke() }) : null),
    [aktiv, verktoy, valgnokkel, regelsett, sperrer, regel, minutt], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const utelukket = forValget?.utfall === 'kan_ikke' ? forValget.grunner : null

  // Steg 2: dosen er fylt inn, så preparatene kan leses og legemiddelformen velges.
  const doseOk = !!regel && !utelukket && lesDose(skjema.startdose) !== undefined
  const forhand = useForhandsdata(regel, valg, doseOk, legemidler, klokke, forhandsbuffer)
  // Flyten: de synlige spørsmålene, forhåndskontrollen og skjemaet med svarene avbildet til motorfeltene og formvalget verktøyet gjør selv (B4).
  const utvalg = forhand.data?.status === 'klar' ? forhand.data.utvalg : undefined
  // Prøveberegningene i forhåndskontrollen kan ta en kvart sekund; de regnes på skjemaet etter at det som er skrevet eller klikket, er vist.
  // Mens de regnes, vises ingen plan (`venter`), så en plan aldri står ved siden av inndata den ikke er beregnet for.
  const utsatt = useDeferredValue(skjema)
  const venter = utsatt !== skjema
  const utfall = useMemo(
    () => (aktiv && regel && valg && !utelukket ? flyttilstand({ verktoy, valg, regelsett, sperrer, regel, skjema: utsatt, utvalg, naa: klokke() }) : null),
    [aktiv, verktoy, valgnokkel, regelsett, sperrer, regel, utelukket, utsatt, utvalg, minutt], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const fullt = utfall?.skjema ?? utsatt
  const tilstand: Flyttilstand | null = utfall?.tilstand ?? null
  const apneSporsmal = utfall?.flyt?.gjenstar ?? []
  // Svaret som er klikket, vises med en gang, også før flyten er regnet på nytt.
  const synligeSporsmal: Flytsporsmal[] = useMemo(
    () => (tilstand?.sporsmal ?? []).map((sp) => ({ ...sp, valgt: skjema.flytsvar?.[sp.id] })).map(({ valgt, ...sp }) => (valgt === undefined ? sp : { ...sp, valgt })),
    [tilstand, skjema.flytsvar],
  )
  const alternativer: Record<string, Formalternativer> = useMemo(
    () => (regel && valg && forhand.data?.status === 'klar' ? formvalgFor(regel, valg, fullt, forhand.data.utvalg, forhand.data.tid) : {}),
    [regel, valg, fullt, forhand.data],
  )
  const uvalgt = (a: Formalternativer, f: string) => (a.klasser.length > 1 && !fullt.formvalg[f]?.klasse) || (a.legemiddelformer.length > 1 && !fullt.formvalg[f]?.legemiddelform)
  const feltfeil = regel ? mangler(regel, fullt) : []
  // Når forhåndskontrollen alt har sagt at ingen plan kan lages (et svar, dosen), trengs ikke formvalget: svarene står, og kan endres.
  const kanIkke = utfall?.tilstand.kontroll.utfall === 'kan_ikke'
  const steg2 = doseOk && feltfeil.length === 0 && forhand.data?.status === 'klar' && (kanIkke || !Object.entries(alternativer).some(([f, a]) => uvalgt(a, f)))
  const apne = regel ? ubesvart(regel, fullt) : { sporsmal: [], unntak: [], bekreftelser: [] }
  // Et svar som stopper planen, gir «kan ikke» i forhåndskontrollen (flytens felles kilde); det står ved spørsmålet og i panelet.
  const stopperSvar = kanIkke
  // Planen beregnes bare når forhåndskontrollen sier at en komplett plan kan lages og ingenting gjenstår; den lover likevel aldri en plan (S9).
  // Nådde prøveberegningen taket uten å avgjøre noe, beregnes planen med de faktiske svarene når alt er besvart.
  const beregnes = !!tilstand && (tilstand.kontroll.utfall === 'kan_lages_hvis' || ikkeAvklart(tilstand))
  const steg3 = beregnes && tilstand.kontroll.gjenstar === 0 && apne.sporsmal.length + apne.unntak.length + apne.bekreftelser.length === 0

  // Beregningen.
  const [beregning, setBeregning] = useState<Beregning | null>(null)
  const [, setTikk] = useState(0)
  const siste = useRef(0)
  // Når flyten viker for en melding (en sperre, eller sperrene kan ikke leses), glemmes beregningen og en beregning som pågår:
  // en plan kommer aldri tilbake av seg selv, bare med en ny beregning med FEST og sperrene lest på nytt (S6, VDR-4).
  useEffect(() => {
    if (aktiv) return
    siste.current++
    setBeregning(null)
  }, [aktiv])
  const nokkel = JSON.stringify({ regel: regel?.id, valg, skjema: fullt })
  const gjeldende = beregning?.nokkel === nokkel ? beregning : null
  const harPlan = gjeldende?.status === 'ferdig' && gjeldende.resultat.status === 'doseplan'
  useEffect(() => {
    if (!harPlan) return
    const t = window.setInterval(() => setTikk((x) => x + 1), KONTROLLER_PLANEN_MS)
    return () => window.clearInterval(t)
  }, [harPlan])
  const plan: Planvisning | null =
    harPlan && regel && gjeldende.resultat.status === 'doseplan' && gjelderFortsatt(gjeldende.resultat, klokke()) ? planvisning(gjeldende.resultat, regel, fullt.startdato || undefined) : null
  const planregel = plan && regel ? regel.id : null
  // Mens en melding står, meldes ingenting: planen som sto, er den siden trenger for å si at den ble tatt bort (S6).
  useEffect(() => {
    if (aktiv) onPlan(planregel ? { valg: valgnokkel, regel: planregel } : null)
  }, [aktiv, planregel, valgnokkel, onPlan])
  const visTattBort = !!regel && tattBort?.valg === valgnokkel && tattBort.regel === regel.id

  async function beregn() {
    if (!regel || !valg) return
    onBeregn()
    autoberegnet.current = nokkel
    const sk = fullt
    const denne = ++siste.current
    setBeregning({ nokkel, status: 'henter' })
    try {
      const utvalg = await lesFest(legemidler, festIderFor(regel, valg), () => denne === siste.current)
      if (denne !== siste.current || !utvalg) return
      // Sperrene leses på nytt etter FEST, rett før resultatet vises: en sperre som kom mens preparatene ble hentet, gir ingen plan.
      const sperrer = await hentSperrer()
      if (denne !== siste.current) return
      if (usperrede(sperrer, verktoy, [regel]).length === 0) return setBeregning(null)
      const tid = klokke()
      const alt = formvalgFor(regel, valg, sk, utvalg, tid)
      if (Object.entries(alt).some(([f, a]) => (a.klasser.length > 1 && !sk.formvalg[f]?.klasse) || (a.legemiddelformer.length > 1 && !sk.formvalg[f]?.legemiddelform)))
        return setBeregning({ nokkel, status: 'formvalg' })
      setBeregning({ nokkel, status: 'ferdig', resultat: beregnPlan(regel, valg, sk, utvalg, tid, regelsett) })
    } catch (e) {
      if (denne !== siste.current) return
      setBeregning({ nokkel, status: 'feil', melding: e instanceof Error ? e.message : String(e), sperre: e instanceof Sperrefeil })
    }
  }

  // Planen beregnes av seg selv når alt er besvart, og på nytt når noe endres; aldri bare fordi delen kom tilbake (se `autoberegnet`).
  const klar = steg2 && steg3
  useEffect(() => {
    if (!klar || autoberegnet.current === nokkel) return
    const t = window.setTimeout(() => void beregn(), AUTOBEREGNING_MS)
    return () => window.clearTimeout(t)
  }, [klar, nokkel]) // eslint-disable-line react-hooks/exhaustive-deps

  const sett = <K extends keyof Planskjema>(felt: K, verdi: Planskjema[K]) => setSkjema((s) => ({ ...s, [felt]: verdi }))
  const svarPa = (sid: string, verdi: string | undefined) => setSkjema((s) => medFlytsvar(s, sid, verdi))
  const velgTrinn = (t: Trinnvalg, mg: number) => setSkjema((s) => medTrinnvalg(s, t, mg))

  const forlopsnavn = (forlop: string) => {
    const f = regel?.plan.forlop.find((x) => x.id === forlop)
    return navnPaa(f?.virkestoff.type === 'virkestoff' ? f.virkestoff.nokkel : regel && valg && medlemFor(regel, valg))
  }
  const fraNavn = navnPaa(valg?.fra.nokkel)
  const tilNavn = navnPaa(valg?.til?.nokkel)
  const fraAdm = regel && fraForlop(regel)?.administrasjon === 'depotinjeksjon' ? ' (depot)' : ''
  const tilAdm = regel && tilForlop(regel)?.administrasjon === 'depotinjeksjon' ? ' (depot)' : ''
  const startenhet = doseenhet(regel, 'startdose')
  const spenn = regel && spennFor(regel, skjema)
  const justeringer = regel ? justeringsfelt(regel, fullt.svar) : []
  const varsel = regel && <Regelvarsler tilstand={varsler} regel={regel} />
  const stoppet = gjeldende?.status === 'ferdig' && gjeldende.resultat.status === 'stoppet' ? gjeldende.resultat : null
  // Begrunnelsen spørres når et svar krever den, når en verdi er justert, når beregningen har stoppet på den, eller når den alt er skrevet.
  const begrunnelse =
    !!regel &&
    kanKreveBegrunnelse(regel) &&
    (skjema.begrunnelse.trim() !== '' ||
      !!tilstand?.begrunnelse ||
      (regel.sporsmal ?? []).some((s) => s.krever_begrunnelse && fullt.svar[s.id] === true) ||
      Object.values(skjema.justert).some((v) => v.trim() !== '') ||
      (stoppet?.stoppgrunner.some((g) => /begrunnelse/i.test(g)) ?? false))
  const manglerSett = new Set(visMangler ? apneSporsmal.map((s) => s.id) : [])
  const status = useRef<HTMLDivElement | null>(null)

  /** Hopper til det første spørsmålet som gjenstår, og merker det; gjenstår bare valg uten spørsmål, til forhåndskontrollen i steg 2. */
  const tilForsteUbesvarte = () => {
    setVisMangler(true)
    const forste = apneSporsmal[0]
    window.requestAnimationFrame(() => {
      const felt = forste ? [...document.querySelectorAll<HTMLElement>('[data-flytsporsmal]')].find((x) => x.dataset.flytsporsmal === forste.id)?.querySelector('input') : status.current
      felt?.focus()
      felt?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }
  const tilPlanen = () => {
    panel.current?.focus({ preventScroll: true })
    panel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  // «Tilpass planen» står på samme sted i panelet fra steg 2 er fylt ut, så et felt beholder fokus mens planen beregnes på nytt
  // eller forhåndskontrollen stopper på verdien, og en feil i startdatoen eller en justert verdi kan rettes der den står.
  const visTilpass = !!regel && doseOk && forhand.data?.status === 'klar' && (feltfeil.length > 0 || steg2)
  const tilpass = regel && (
    <Details summary="Tilpass planen" startApen={!!skjema.startdato || Object.values(skjema.justert).some((v) => v.trim() !== '')}>
      <div className="planpanel__tilpass">
        <label className="skjemafelt">
          <span>Startdato</span>
          <input className="inndatafelt" type="date" value={skjema.startdato} onChange={(e) => sett('startdato', e.target.value)} />
        </label>
        {!skjema.startdato && <p className="flytsteg__hjelp">Uten startdato står planen med dagnummer.</p>}
        {justeringer.map((j) => (
          <div key={j.sti} className="skjemafelt">
            <label className="skjemafelt">
              <span>{j.navn}</span>
              <Tallfelt value={skjema.justert[j.sti] ?? ''} placeholder={j.forslag} aria-describedby={`${id}-${j.sti}`} onChange={(v) => sett('justert', { ...skjema.justert, [j.sti]: v })} />
            </label>
            <p id={`${id}-${j.sti}`} className="flytsteg__hjelp">
              {/dager/i.test(j.navn) ? `${j.hjelp} Dagene er minstetider.` : j.hjelp}
            </p>
          </div>
        ))}
        {skjema.trinnvalg.length > 0 && (
          <div className="planpanel__valgte" role="group" aria-label="Valgte doser per trinn">
            <p className="flytsteg__hjelp">Valgte doser per trinn:</p>
            <ul>
              {skjema.trinnvalg.map((v) => (
                <li key={`${v.forlop}-${v.trinn}`}>
                  Trinn {v.trinn} av {forlopsnavn(v.forlop)}: {tall(v.mg)} mg (fra {tall(v.fra_mg)} mg)
                </li>
              ))}
            </ul>
            <Button variant="kant" onClick={() => sett('trinnvalg', [])}>
              Fjern valgene
            </Button>
          </div>
        )}
      </div>
    </Details>
  )

  // Med flere godkjente fremgangsmåter velges én; et annet valg begynner med et tomt skjema og ingen svar (`medRegel`).
  const fremgangsmate = (
    <fieldset className="sporsmalsgruppe">
      <legend className="flytsteg__etikett">Fremgangsmåte</legend>
      <div className="avkryssinger avkryssinger--loddrett">
        {regler.map((r) => (
          <label key={r.id} className="avkryssing">
            <input type="radio" name={`${id}-regel`} checked={skjema.regel === r.id} onChange={() => setSkjema((s) => medRegel(s, r.id))} />
            {r.tittel}
          </label>
        ))}
      </div>
    </fieldset>
  )

  const beregnPaNytt = (
    <div className="verktoyskjema__handlinger">
      <Button variant="kant" onClick={() => void beregn()}>
        Beregn på nytt
      </Button>
    </div>
  )

  /** Hva planpanelet viser nå: aldri en delplan, og ingenting før alt er besvart. */
  const innhold = (() => {
    if (utelukket)
      return (
        <Panelmelding tone="stopp" tittel="Ingen plan for dette valget">
          <Grunnliste grunner={utelukket} />
        </Panelmelding>
      )
    if (!regel)
      return (
        <Panelmelding tittel="Velg fremgangsmåte">
          <p>Velg hvordan planen skal lages i steg 2.</p>
        </Panelmelding>
      )
    if (visTattBort && !gjeldende)
      return (
        <Panelmelding>
          <p data-tatt-bort>{PLAN_TATT_BORT}</p>
          {beregnPaNytt}
        </Panelmelding>
      )
    if (!doseOk) return <Panelmelding tittel="Fyll inn dosen">{<p>Planen kommer her når dosen pasienten bruker og spørsmålene om pasienten er fylt ut.</p>}</Panelmelding>
    if (forhand.data?.status === 'henter' || !forhand.data)
      return (
        <Panelmelding>
          <p className="planpanel__henter">
            <Lastesirkel /> Henter preparatene fra FEST …
          </p>
        </Panelmelding>
      )
    if (forhand.data.status === 'feil')
      return (
        <Panelmelding tone="stopp" rolle="alert" tittel="Fikk ikke hentet preparatene fra FEST">
          <p>{forhand.data.melding}</p>
          <div className="verktoyskjema__handlinger">
            <Button variant="kant" onClick={forhand.prov}>
              Prøv igjen
            </Button>
          </div>
        </Panelmelding>
      )
    if (feltfeil.length > 0)
      return (
        <Panelmelding tone="stopp">
          <ul>
            {feltfeil.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Panelmelding>
      )
    if (!steg2) return <Panelmelding tittel="Velg legemiddelform">{<p>Velg i steg 2 hva pasienten bruker, så går flyten videre.</p>}</Panelmelding>
    if (stopperSvar && tilstand)
      return (
        <Panelmelding tone="stopp" tittel={tilstand.kontroll.grunner.some((g) => g.sporsmal) ? 'Ingen plan med disse svarene' : 'Ingen plan for dette tilfellet'}>
          <Grunnliste grunner={tilstand.kontroll.grunner} />
        </Panelmelding>
      )
    if (!steg3 && tilstand) {
      const n = Math.max(tilstand.kontroll.gjenstar, 1)
      const valg = tilstand.kontroll.grunner.filter((g) => !g.sporsmal && g.handling)
      const ukjente = apneSporsmal.filter((s) => s.valgt === 'ukjent').length
      return (
        <Panelmelding tittel={gjenstartekst(n)}>
          {valg.length > 0 && <Grunnliste grunner={valg} />}
          {ukjente > 0 && <p>{`${ukjente === 1 ? 'Ett svar er' : `${ukjente} svar er`} «Ukjent». ${UKJENT_FORKLARING}`}</p>}
          <p>Planen beregnes så snart alt er besvart.</p>
        </Panelmelding>
      )
    }
    if (!gjeldende || venter)
      return beregning || venter ? (
        <Panelmelding>
          <p className="planpanel__henter">
            <Lastesirkel /> Beregner planen …
          </p>
        </Panelmelding>
      ) : autoberegnet.current === nokkel ? (
        <Panelmelding>
          <p>Planen vises ikke lenger. Beregn på nytt for å se den.</p>
          {beregnPaNytt}
        </Panelmelding>
      ) : (
        <Panelmelding>
          <p className="planpanel__henter">
            <Lastesirkel /> Beregner planen …
          </p>
        </Panelmelding>
      )
    if (gjeldende.status === 'henter')
      return (
        <Panelmelding>
          <p className="planpanel__henter">
            <Lastesirkel /> Henter preparatene fra FEST og beregner …
          </p>
        </Panelmelding>
      )
    if (gjeldende.status === 'feil')
      return (
        <Panelmelding tone="stopp" rolle="alert">
          <p>{gjeldende.sperre ? UKONTROLLERT : `Fikk ikke hentet preparatene fra FEST. ${gjeldende.melding}`}</p>
          {beregnPaNytt}
        </Panelmelding>
      )
    if (gjeldende.status === 'formvalg') return <Panelmelding tittel="Velg legemiddelform">{<p>FEST har flere former. Velg i steg 2 hva pasienten bruker.</p>}</Panelmelding>
    const r = gjeldende.resultat
    if (r.status === 'stoppet')
      return (r.trinnvalg ?? []).length > 0 ? (
        <>
          <Panelmelding tittel="Planen er ikke komplett ennå">
            {r.stoppgrunner.map((g) => (
              <p key={g}>{g}</p>
            ))}
          </Panelmelding>
          <Trinnvalgdel resultat={r} navn={forlopsnavn} onVelg={velgTrinn} />
        </>
      ) : (
        <Panelmelding tone="stopp" tittel="Ingen plan">
          {r.stoppgrunner.map((g) => (
            <p key={g}>{g}</p>
          ))}
          {r.fagtekst.map((t) => (
            <article key={t.fagside + t.tittel} className="verktoyfagtekst">
              <h3>{t.tittel}</h3>
              <p>{t.tekst}</p>
            </article>
          ))}
        </Panelmelding>
      )
    if (!plan)
      return (
        <Panelmelding tone="stopp">
          <p>Planen gjelder ikke lenger: FEST-dataene, godkjenningen eller dagen er endret. Beregn på nytt.</p>
          {beregnPaNytt}
        </Panelmelding>
      )
    return <Doseplanvisning plan={plan} overskrift={verktoy.navn} varsel={varsel} forutsatt={tilstand?.forutsatt} />
  })()

  const hopp =
    plan || (steg2 && tilstand && !stopperSvar && tilstand.kontroll.gjenstar > 0) ? (
      <div className="planhopp">{plan ? <Button onClick={tilPlanen}>Se planen</Button> : <Button onClick={tilForsteUbesvarte}>{gjenstartekst(tilstand!.kontroll.gjenstar)}</Button>}</div>
    ) : null

  return (
    <Flytoppsett
      steg={
        <>
          {p.steg1}
          {melding === undefined && utelukket && regler.length > 1 && (
            <Flytsteg nr={2} tittel={titler[1]}>
              {fremgangsmate}
            </Flytsteg>
          )}
          {melding === undefined && utelukket && varsel}
          {melding === undefined && !utelukket && (
            <>
              <Flytsteg nr={2} tittel={titler[1]} ferdig={steg2}>
                {regler.length > 1 && fremgangsmate}
                <div className="feltrad">
                  <label className="skjemafelt">
                    <span>
                      {startenhet ? 'Aktuell dose' : 'Aktuell døgndose'} av {fraNavn.toLowerCase()}
                      {fraAdm} ({startenhet ?? 'mg'})
                    </span>
                    <Tallfelt value={skjema.startdose} onChange={(v) => sett('startdose', v)} />
                  </label>
                  {regel && trengerMaldose(regel, skjema) && (
                    <label className="skjemafelt">
                      <span>
                        Måldose av {tilNavn.toLowerCase()}
                        {tilAdm} ({doseenhet(regel, 'maldose') ?? 'mg per døgn'})
                      </span>
                      <Tallfelt value={skjema.maldose} onChange={(v) => sett('maldose', v)} />
                    </label>
                  )}
                </div>
                {regel && spenn && (
                  <p className="flytsteg__hjelp">
                    Ved {tall(spenn.fra_mg)} mg gir omregningstabellen et spenn på {tall(spenn.til_mg[0])}–{tall(spenn.til_mg[1])} mg. Dosen i spennet er et klinisk valg og skrives inn som måldose.
                  </p>
                )}
                {regel && trengerMaldose(regel, skjema) && <p className="flytsteg__hjelp">Måldosen fylles aldri inn av verktøyet; den må skrives inn.</p>}
                {Object.entries(alternativer).flatMap(([f, a]) => [
                  a.klasser.length > 1 && (
                    <Formvalg
                      key={`${f}-klasse`}
                      tekst={`Formulering av ${forlopsnavn(f).toLowerCase()}`}
                      alternativer={a.klasser.map((k) => ({ verdi: k.kode, tekst: k.navn }))}
                      valgt={skjema.formvalg[f]?.klasse}
                      onVelg={(v) => sett('formvalg', { ...skjema.formvalg, [f]: { klasse: v } })}
                    />
                  ),
                  a.legemiddelformer.length > 1 && (
                    <Formvalg
                      key={`${f}-form`}
                      tekst={`Legemiddelform av ${forlopsnavn(f).toLowerCase()}`}
                      alternativer={a.legemiddelformer.map((k) => ({ verdi: k.kode, tekst: k.navn }))}
                      valgt={fullt.formvalg[f]?.legemiddelform}
                      valgtAvVerktoyet={!skjema.formvalg[f]?.legemiddelform && !!utfall?.kontroll.formvalg?.[f]}
                      onVelg={(v) => sett('formvalg', { ...skjema.formvalg, [f]: { ...skjema.formvalg[f], legemiddelform: v } })}
                    />
                  ),
                ])}
                <label className="avkryssing avkryssing--felt">
                  <input type="checkbox" checked={skjema.godkjenningsfritak} onChange={(e) => sett('godkjenningsfritak', e.target.checked)} />
                  Bruk også preparater som krever godkjenningsfritak
                </label>
                {steg2 && tilstand && <Kontrollstatus tilstand={tilstand} boks={status} />}
              </Flytsteg>
              <Flytsteg nr={3} tittel={titler[2]} ferdig={steg2 && steg3} reservevisning={!!utfall?.flyt && !utfall.flyt.oppsett.katalog}>
                {!steg2 ? (
                  <p className="flytsteg__hjelp">Spørsmålene kommer når steg 2 er fylt ut.</p>
                ) : tilstand && tilstand.sporsmal.length === 0 ? (
                  <p className="flytsteg__hjelp">Regelen trenger ingen opplysninger om pasienten utover det over.</p>
                ) : (
                  tilstand && (
                    <div className="sporsmalsflate" data-flytsporsmal-liste>
                      <Sporsmalsliste
                        sporsmal={synligeSporsmal}
                        grunner={tilstand.kontroll.grunner}
                        mangler={manglerSett}
                        ingenAvDisse={tilstand.ingenAvDisse}
                        onSvar={svarPa}
                        onIngenAvDisse={(ider) => setSkjema((s) => ({ ...s, flytsvar: medIngenAvDisse(s.flytsvar ?? {}, ider) }))}
                      />
                    </div>
                  )
                )}
                {steg2 && begrunnelse && regel && (
                  <div className="skjemafelt">
                    <label className="skjemafelt">
                      <span>Begrunnelse for valgene</span>
                      <textarea
                        className="inndatafelt verktoyskjema__begrunnelse"
                        rows={3}
                        value={skjema.begrunnelse}
                        aria-describedby={`${id}-begrunnelse`}
                        onChange={(e) => sett('begrunnelse', e.target.value)}
                      />
                    </label>
                    <p id={`${id}-begrunnelse`} className="flytsteg__hjelp">
                      Kreves ved {begrunnelseshjelp(regel)}. Begrunnelsen står i planen; skriv ikke navn eller andre personopplysninger.
                    </p>
                  </div>
                )}
              </Flytsteg>
              {!plan && varsel}
            </>
          )}
        </>
      }
      hopp={melding === undefined ? hopp : null}
      plan={
        <Planpanel tittel={titler[3]} ferdig={!!plan} panel={panel}>
          {melding ?? (
            <>
              {innhold}
              {visTilpass && <div className="planpanel__tillegg">{tilpass}</div>}
              {!plan && regel && <FagligGrunnlag grunnlag={regelgrunnlag(regel)} />}
            </>
          )}
        </Planpanel>
      }
    />
  )
}

/** «Ett spørsmål igjen» eller «N spørsmål igjen»: det som gjenstår før planen beregnes. */
const gjenstartekst = (n: number) => (n === 1 ? 'Ett spørsmål igjen' : `${n} spørsmål igjen`)

/** Forklaringene fra forhåndskontrollen som en liste, hver med det klinikeren kan gjøre. */
function Grunnliste({ grunner }: { grunner: readonly Stoppforklaring[] }) {
  // Motorens egen tekst står bak «Vis detaljer», aldri først (§5).
  const detaljer = [...new Set(grunner.flatMap((g) => (g.detalj && g.detalj !== g.tekst ? [g.detalj] : [])))]
  return (
    <>
      <ul>
        {grunner.map((g) => (
          <li key={g.kode + (g.sporsmal ?? '') + g.tekst}>{g.handling ? `${g.tekst} ${g.handling}` : g.tekst}</li>
        ))}
      </ul>
      {detaljer.length > 0 && (
        <Details summary="Vis detaljer">
          {detaljer.map((d) => (
            <p key={d}>{d}</p>
          ))}
        </Details>
      )}
    </>
  )
}

/**
 * Utfallet av forhåndskontrollen etter steg 2: den eneste fremhevede
 * meldingen i skjemaet. Den lover aldri en plan (S9), og sier hva verktøyet
 * har valgt selv (en legemiddelform, B4) og hva som må velges.
 */
/** Prøveberegningen nådde taket uten å avgjøre om en komplett plan kan lages; planen beregnes da med de faktiske svarene. */
const ikkeAvklart = (t: Flyttilstand) => t.kontroll.utfall === 'ukjent' && t.kontroll.grunner.some((g) => g.kode === 'ikke_avklart')

function Kontrollstatus({ tilstand, boks }: { tilstand: Flyttilstand; boks: MutableRefObject<HTMLDivElement | null> }) {
  const { utfall, grunner, gjenstar } = tilstand.kontroll
  const egne = grunner.filter((g) => !g.sporsmal)
  if (utfall === 'kan_ikke' && egne.length > 0)
    return (
      <div ref={boks} tabIndex={-1} className="flytstatus" data-utfall="kan_ikke" role="status">
        <Ikon navn="sev" className="flytstatus__ikon" />
        <div className="flytstatus__tekst">
          <p className="flytstatus__tittel">Verktøyet kan ikke lage en plan for dette.</p>
          <Grunnliste grunner={egne} />
        </div>
      </div>
    )
  if (ikkeAvklart(tilstand))
    return (
      <div ref={boks} tabIndex={-1} className="flytstatus" data-utfall="ukjent" role="status">
        <Ikon navn="info2" className="flytstatus__ikon" />
        <div className="flytstatus__tekst">
          <p className="flytstatus__tittel">{egne[0]!.tekst}</p>
          {gjenstar > 0 && <p>{`${gjenstartekst(gjenstar)}.`}</p>}
        </div>
      </div>
    )
  if (utfall !== 'kan_lages_hvis') return null
  return (
    <div ref={boks} tabIndex={-1} className="flytstatus" data-utfall="kan_lages_hvis" role="status">
      <Ikon navn="done" className="flytstatus__ikon" />
      <div className="flytstatus__tekst">
        <p className="flytstatus__tittel">{KAN_LAGES_HVIS}</p>
        {egne.length > 0 && <Grunnliste grunner={egne} />}
        {gjenstar > 0 && <p>{`${gjenstartekst(gjenstar)}.`}</p>}
      </div>
    </div>
  )
}

/** Et valg av formulering eller legemiddelform som FEST har flere av; verktøyet velger ikke selv. */
function Formvalg({
  tekst,
  alternativer,
  valgt,
  valgtAvVerktoyet = false,
  onVelg,
}: {
  tekst: string
  alternativer: { verdi: string; tekst: string }[]
  valgt: string | undefined
  /** Verktøyet har valgt formen selv fordi bare den gir en komplett plan (B4); det står ved valget, og kan endres. */
  valgtAvVerktoyet?: boolean
  onVelg: (v: string) => void
}) {
  const id = useId()
  return (
    <div className="sporsmal sporsmal--form" data-valgt-av-verktoyet={valgtAvVerktoyet || undefined}>
      <p className="sporsmal__tekst">
        <span id={`${id}-tekst`}>{tekst}</span>
        <span className="sporsmal__hjelp">
          {valgtAvVerktoyet ? 'Valgt av verktøyet, fordi bare denne gir en komplett plan. Endre hvis pasienten bruker noe annet.' : 'FEST har flere. Velg det pasienten bruker.'}
        </span>
      </p>
      <Svarvalg navn={id} etikett={`${id}-tekst`} alternativer={alternativer} valgt={valgt} onVelg={onVelg} />
    </div>
  )
}

/**
 * Dosene forskriveren kan velge for et trinn som ikke kan gis nøyaktig
 * (P7.5): de nærmeste dosene som kan gis, med faktisk reduksjon. Beregningen
 * velger aldri selv; et valg gir en ny beregning fra den valgte dosen med en gang.
 */
function Trinnvalgdel({ resultat, navn, onVelg }: { resultat: Doseplanresultat; navn: (forlop: string) => string; onVelg: (t: Trinnvalg, mg: number) => void }) {
  return (
    <section className="trinnvalg" aria-label="Doser som kan velges">
      {(resultat.trinnvalg ?? []).map((t) => (
        <div key={`${t.forlop}-${t.trinn}`} className="trinnvalg__trinn" role="group" aria-label={`Trinn ${t.trinn} av ${navn(t.forlop)}`}>
          <p className="planpanel__meldingstittel">
            {t.mellomtrinn ? `Trinn ${t.trinn} av ${navn(t.forlop)}: et mindre siste trinn kan velges` : `Velg dosen for trinn ${t.trinn} av ${navn(t.forlop)}`}
          </p>
          <p className="flytsteg__hjelp">
            {t.mellomtrinn ? (
              <>
                {mellomtrinntekst(t)} {t.tempo && tempotekst(t.tempo)}
              </>
            ) : t.omrade && t.minste_trinn ? (
              <>
                Den foretrukne reduksjonen til {foretrukketTekst(t)} kan ikke gis med preparatene, og ingen dose med faktisk reduksjon innenfor det foretrukne området {tall(t.omrade[0])}–
                {tall(t.omrade[1])} % kan det. Ved denne lave dosen kan du velge det minste trinnet som kan gis, med faktisk reduksjon høyst {tall(t.minste_trinn.maks_prosent)} %.
              </>
            ) : t.omrade ? (
              <>
                Den foretrukne reduksjonen til {foretrukketTekst(t)} kan ikke gis med preparatene. Velg en dose som kan gis; den faktiske reduksjonen må være innenfor det foretrukne området{' '}
                {tall(t.omrade[0])}–{tall(t.omrade[1])} %.
              </>
            ) : (
              <>
                Den beregnede reduksjonen til {foretrukketTekst(t)} kan ikke gis med preparatene. Velg en av de nærmeste dosene som kan gis. {t.tempo && tempotekst(t.tempo)}
              </>
            )}{' '}
            Verktøyet velger ikke selv; planen beregnes fra dosen du velger.
          </p>
          <div className="verktoyskjema__handlinger">
            {t.doser.map((d) => (
              <Button key={d.mg} variant="kant" onClick={() => onVelg(t, d.mg)}>
                {trinndosetekst(d)}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
