import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { tidspunkt } from '../../faginnhold/historikk'
import { useJevnligSjekk } from '../../hooks/useJevnligSjekk'
import { useLukkMedEscape } from '../../hooks/useLukkMedEscape'
import type { Legemiddelleser } from '../../legemiddeldata/lesing'
import { Bevaringsomrade, useBevart, type Bevaringsform } from '../../oppdatering/Bevaring'
import { verktoyadresse } from '../../domain/rute'
import {
  begrunnelseshjelp,
  beregnPlan,
  festIderFor,
  formvalgFor,
  gjelderFortsatt,
  justeringsfelt,
  kanKreveBegrunnelse,
  mangler,
  medRegel,
  medTrinnvalg,
  skjemaFor,
  TOMT_SKJEMA,
  spennFor,
  trengerMaldose,
  ubesvart,
  valgidentitet,
  type Planskjema,
} from '../../verktoy/doseplan'
import type { Kildeformulering } from '../../verktoy/kartlegging'
import { foretrukketTekst, trinndosetekst, type Doseplanresultat, type Formalternativer, type Trinnvalg } from '../../verktoy/motor/plan'
import { planvisning, type Planvisning } from '../../verktoy/planvisning'
import { finnVirkestoff, KARTLEGGING, VALGTEKSTER, VERKTOY, verktoyFor, virkestoffvalg, type Verktoy } from '../../verktoy/register'
import { avrund } from '../../verktoy/regler/beregning'
import { KONTROLLUTFALL, kontrollutfall } from '../../verktoy/regler/godkjenning'
import type { Regel, Regelsett } from '../../verktoy/regler/modell'
import {
  FOR_SEN,
  gjelder,
  LES_SPERRENE_HVER_MS,
  LESEFRIST_MS,
  medFrist,
  NYE_FORSOK_MS,
  OMFANGSTEKST,
  PLAN_TATT_BORT,
  SPERRENE_GJELDER_MS,
  SPERRET,
  UKONTROLLERT,
  UTEN_NETT,
  usperrede,
  utenForbindelse,
  verktoysperrer,
  type Verktoysperre,
  type Verktoysperreleser,
} from '../../verktoy/sperrer'
import {
  fraForlop,
  medlemFor,
  REGELSETT,
  tilForlop,
  tilgjengelighet,
  type Tilgjengelighet,
  type Verktoyvalg,
} from '../../verktoy/tilgjengelighet'
import { snarvalg, utenSperrede, type Snarvalg } from '../../verktoy/snarvalg'
import { Button } from '../Button'
import { Details } from '../Details'
import { Lastesirkel } from '../Lasteindikator'
import { Lukkeknapp } from '../Lukkeknapp'
import { Tallfelt } from '../Tallfelt'
import { Ikon } from '../ikon/Ikon'
import { ToppmenyInnhold } from '../toppmeny/Toppmenykilde'
import { Doseplanvisning } from './Doseplanvisning'
import { FagligGrunnlag, regelgrunnlag } from './FagligGrunnlag'
import type { Regelvarsellager } from '../../verktoy/overvaking/regelvarsler'
import { Regelvarsler, useRegelvarsler, type Varseltilstand } from './Regelvarsler'
import { lesVirkestoffvalg, Virkestoffelt } from './Virkestoffelt'
import '../../styles/verktoy.css'

/** Hvor ofte en plan som står, kontrolleres mot klokken: FEST-kopiens alder og dagen. */
const KONTROLLER_PLANEN_MS = 60_000

/** Feiler hentingen fra FEST når forskriveren beregner, prøves den én gang til etter så lenge før feilen vises (K6). */
export const FEST_NYTT_FORSOK_MS = 2_000

const vent = (ms: number) => new Promise<void>((ok) => window.setTimeout(ok, ms))

export interface VerktoysideProps {
  /** Verktøyets ID fra adressen; uten den vises oversikten. */
  verktoy?: string
  /** Lesingen av legemiddeldataene, den samme som fagsidene bruker. Uten den kan ingenting beregnes. */
  legemidler: Pick<Legemiddelleser, 'les'> | undefined
  /** Lesingen av nødstoppen (`src/verktoy/sperrer.ts`). Uten den, eller når den feiler, vises ingenting klinisk. */
  sperrer: Verktoysperreleser | undefined
  onLukk: () => void
  /** Regelsettet; appens eget når det ikke er gitt. */
  regelsett?: Regelsett
  /** Klokken; nå når den ikke er gitt. */
  klokke?: () => Date
  /**
   * De faglige varslene fra kildeoppfølgingen (`les_regelvarsler`). Hvert vises
   * bare ved regelversjonen det gjelder, og sperrer ingenting. Uten lageret,
   * eller når lesingen feiler, står det kort ved anbefalingen at merknadene
   * ikke kunne hentes; beregningen fortsetter.
   */
  regelvarsler: Regelvarsellager | undefined
}

const naa = () => new Date()

/**
 * `lest` er når sperrene sist ble lest (`Date.now()`); lesingen gjelder i
 * `SPERRENE_GJELDER_MS`. `utenNett` er at lesingen feilet fordi det ikke er
 * forbindelse.
 */
type Sperretilstand = { status: 'henter' } | { status: 'feil'; melding: string; utenNett: boolean } | { status: 'klar'; sperrer: Verktoysperre[]; lest: number }

const utlopt = (t: Sperretilstand) => t.status === 'klar' && Date.now() - t.lest >= SPERRENE_GJELDER_MS

/** En sperre som ikke kunne leses: beregningen vises ikke, og grunnen er ikke FEST. */
class Sperrefeil extends Error {}

/**
 * De aktive sperrene, lest med en gang, når fanen får fokus og jevnlig mens
 * siden står åpen. `hent` leser dem på nytt, gir dem og oppdaterer siden; den
 * kaster når de ikke kan leses eller ikke svarer innen `LESEFRIST_MS`, og da
 * vises ingenting klinisk. En lesing gjelder i `SPERRENE_GJELDER_MS`: er den
 * eldre, vises ingenting klinisk før sperrene er lest på nytt.
 *
 * Kortvarig svikt (N1 i `docs/verktøy-vdr4-tilgjengelighet.md`): feiler en
 * lesing, leses sperrene på nytt etter `NYE_FORSOK_MS`, og med en gang når
 * nettleseren får forbindelse igjen. Ingenting klinisk vises før en lesing
 * har lyktes, og en sperre gjelder alltid så snart en lesing finner den.
 */
function useSperrer(leser: Verktoysperreleser | undefined) {
  const [tilstand, setTilstand] = useState<Sperretilstand>({ status: 'henter' })
  // Lesingene nummereres; svaret fra en lesing brukes når ingen lesing som ble startet senere, har svart før den.
  const startet = useRef(0)
  const brukt = useRef(0)
  // De nye forsøkene etter en feil: hvor mange som er brukt, og tidtakeren til det neste.
  const forsok = useRef(0)
  const nyttForsok = useRef<number | undefined>(undefined)
  const les = useCallback(
    async (etterFeil: boolean): Promise<Verktoysperre[]> => {
      const denne = ++startet.current
      const bruk = (ny: Sperretilstand) => {
        if (denne <= brukt.current) return false
        brukt.current = denne
        setTilstand(ny)
        return true
      }
      // En lesing som er for gammel, gjelder ikke mens den nye pågår.
      setTilstand((t) => (utlopt(t) ? { status: 'henter' } : t))
      try {
        if (!leser) throw new Error('Sperrene kan ikke leses her.')
        const sperrer = await medFrist(leser.les(), LESEFRIST_MS, FOR_SEN)
        if (bruk({ status: 'klar', sperrer, lest: Date.now() })) {
          forsok.current = 0
          window.clearTimeout(nyttForsok.current)
          nyttForsok.current = undefined
        }
        return sperrer
      } catch (e) {
        const melding = e instanceof Error ? e.message : String(e)
        // Et nytt forsøk planlegges bare for et svar som brukes, og bare ett om gangen; en ny feil utenom forsøkene begynner rekken på nytt.
        if (bruk({ status: 'feil', melding, utenNett: utenForbindelse(melding) }) && nyttForsok.current === undefined) {
          if (!etterFeil) forsok.current = 0
          const ventetid = NYE_FORSOK_MS[forsok.current]
          if (ventetid !== undefined) {
            forsok.current += 1
            nyttForsok.current = window.setTimeout(() => {
              nyttForsok.current = undefined
              void les(true).catch(() => undefined)
            }, ventetid)
          }
        }
        throw new Sperrefeil(melding)
      }
    },
    [leser],
  )
  const hent = useCallback(() => les(false), [les])
  useEffect(() => () => window.clearTimeout(nyttForsok.current), [])
  useJevnligSjekk(useCallback(() => void hent().catch(() => undefined), [hent]), LES_SPERRENE_HVER_MS)
  // Når forbindelsen kommer tilbake, leses sperrene med en gang.
  useEffect(() => {
    const igjen = () => void hent().catch(() => undefined)
    window.addEventListener('online', igjen)
    return () => window.removeEventListener('online', igjen)
  }, [hent])
  // Kommer det ingen ny lesing før den siste går ut (for eksempel når fanen ikke er synlig), tas det kliniske bort og sperrene leses på nytt.
  useEffect(() => {
    if (tilstand.status !== 'klar') return
    const t = window.setTimeout(() => void hent().catch(() => undefined), Math.max(0, tilstand.lest + SPERRENE_GJELDER_MS - Date.now()))
    return () => window.clearTimeout(t)
  }, [tilstand, hent])
  return { tilstand, hent }
}

/**
 * Verktøyene (`#/verktoy` og `#/verktoy/<ID>`, P6 i
 * `docs/verktøy-utviklingsplan.md`): oversikten, og for hvert verktøy de
 * felles feltene, hva som kan beregnes for valgene, og doseplanen.
 *
 * Hva siden viser, følger regelstatusen (`tilgjengelighet`): en beregning
 * bare med en gjeldende klinisk godkjent regel, ellers at faglig kontroll
 * gjenstår, bare fagtekst eller at kombinasjonen ikke er støttet. Planen
 * kommer bare fra `beregnPlan`, som bruker `kliniskDoseplan`, med preparatene
 * lest fra FEST i det den beregnes. Det som er fylt inn, tas vare på når
 * appen oppdateres; planen gjør aldri det, og må beregnes på nytt, med ny
 * kontroll av datagrunnlaget og godkjenningen.
 */
export function Verktoyside({ verktoy: id, legemidler, sperrer: sperreleser, onLukk, regelsett = REGELSETT, klokke = naa, regelvarsler }: VerktoysideProps) {
  const overskrift = useId()
  const verktoy = verktoyFor(id)
  const sperrer = useSperrer(sperreleser)
  const varsler = useRegelvarsler(regelvarsler)
  useLukkMedEscape(onLukk)

  useEffect(() => {
    const forrige = document.title
    document.title = `${verktoy?.navn ?? 'Verktøy'} – OUSFAR`
    return () => {
      document.title = forrige
    }
  }, [verktoy])

  // En ny side begynner øverst, med fokus på overskriften.
  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.getElementById(overskrift)?.focus({ preventScroll: true })
  }, [id, overskrift])

  return (
    <section className="verktoyside" aria-labelledby={overskrift}>
      <ToppmenyInnhold spor="lukk">
        <Lukkeknapp onLukk={onLukk} />
      </ToppmenyInnhold>
      {verktoy ? (
        <Bevaringsomrade navn={`verktoy:${verktoy.id}`}>
          <Verktoyskjema
            key={verktoy.id}
            verktoy={verktoy}
            overskrift={overskrift}
            legemidler={legemidler}
            sperrer={sperrer}
            regelsett={regelsett}
            klokke={klokke}
            varsler={varsler}
          />
        </Bevaringsomrade>
      ) : (
        <Oversikt overskrift={overskrift} ukjent={id !== undefined} regelsett={regelsett} sperrer={sperrer.tilstand} />
      )}
    </section>
  )
}

/* --- Oversikten -------------------------------------------------------------- */

function Oversikt({ overskrift, ukjent, regelsett, sperrer }: { overskrift: string; ukjent: boolean; regelsett: Regelsett; sperrer: Sperretilstand }) {
  const aktive = sperrer.status === 'klar' ? sperrer.sperrer : []
  // Hva som kan beregnes, sies bare når sperrene er lest; ellers at det kontrolleres, eller at det ikke kunne kontrolleres.
  const ukontrollert = sperrer.status === 'klar' ? null : sperrer.status
  const status = VERKTOY.map((v) => ({ verktoy: v, sperret: verktoysperrer(aktive, v).length > 0, valg: utenSperrede(snarvalg(v, regelsett), aktive, v) }))
  // At reglene venter på godkjenning, sies bare når det er grunnen, ikke når en nødstopp er det.
  const ingen = VERKTOY.every((v) => snarvalg(v, regelsett).every((x) => x.status !== 'tilgjengelig'))
  const alle = aktive.filter((s) => s.omfang === 'alle')
  return (
    <>
      <header className="verktoyside__hode">
        <p className="verktoyside__overtittel">OUSFAR Verktøy</p>
        <h1 id={overskrift} className="verktoyside__tittel" tabIndex={-1}>
          Verktøy
        </h1>
        <p className="verktoyside__ingress">
          Beregnede forslag til nedtrapping og bytte, med preparatene i FEST, bare etter regler som er klinisk godkjent og bare i omfanget de er godkjent for. Et forslag
          erstatter ikke klinisk vurdering og er ikke en fullstendig behandlingsplan.
        </p>
      </header>
      {ukjent && (
        <p className="sidevarsel" role="alert">
          Fant ikke verktøyet adressen peker på. Velg et av verktøyene under.
        </p>
      )}
      {alle.length > 0 && <Sperremelding sperrer={alle} regelsett={regelsett} />}
      {ingen && (
        <p className="verktoystatus" data-status="til_kontroll">
          Ingen beregninger er tilgjengelige ennå: reglene venter på faglig kontroll og klinisk godkjenning.
        </p>
      )}
      <ul className="verktoykort">
        {status.map(({ verktoy, sperret, valg }) => (
          <li key={verktoy.id}>
            <a className="verktoykort__lenke" href={verktoyadresse(verktoy.id)}>
              <Ikon navn={verktoy.ikon} className="verktoykort__ikon" />
              <span className="verktoykort__tekst">
                <span className="verktoykort__navn">{verktoy.navn}</span>
                <span className="verktoykort__beskrivelse">{verktoy.beskrivelse}</span>
                <Dekning valg={valg} sperret={sperret} ukontrollert={ukontrollert} />
              </span>
              <Ikon navn="chev" className="verktoykort__pil" />
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Før sperrene er lest, og når de ikke kunne leses, loves ingenting om hva som kan beregnes: ikke i oversikten og ikke som snarvalg. */
export const TILGJENGELIGHET_UKONTROLLERT = {
  henter: 'Kontrollerer tilgjengeligheten …',
  feil: 'Kan ikke kontrollere tilgjengeligheten nå.',
} as const

/** Det samme i oversiktens kort, der en ny lesing skjer når verktøyet åpnes. */
export const DEKNING_UKONTROLLERT = {
  henter: TILGJENGELIGHET_UKONTROLLERT.henter,
  feil: `${TILGJENGELIGHET_UKONTROLLERT.feil} Åpne verktøyet for å prøve igjen.`,
} as const

/** Det verktøyet kan gi nå, i oversiktens kort: hva som kan beregnes, og hva som bare har fagtekst. */
function Dekning({ valg, sperret, ukontrollert }: { valg: readonly Snarvalg[]; sperret: boolean; ukontrollert: keyof typeof DEKNING_UKONTROLLERT | null }) {
  if (ukontrollert)
    return (
      <span className="verktoykort__status" data-ukontrollert={ukontrollert}>
        <span className="verktoykort__linje">{DEKNING_UKONTROLLERT[ukontrollert]}</span>
      </span>
    )
  const liste = (status: Snarvalg['status']) =>
    valg
      .filter((x) => x.status === status)
      .map((x) => x.tekst)
      .join(', ')
  const beregnes = liste('tilgjengelig')
  const fagtekst = liste('fagtekst')
  return (
    <span className="verktoykort__status">
      {sperret ? (
        <span className="verktoykort__linje">Midlertidig deaktivert</span>
      ) : (
        <>
          <span className="verktoykort__linje">{beregnes ? `Kan beregnes: ${beregnes}` : 'Ingen beregning tilgjengelig ennå'}</span>
          {fagtekst && <span className="verktoykort__linje">Fagtekst: {fagtekst}</span>}
        </>
      )}
    </span>
  )
}

/**
 * Valgene som kan beregnes eller har fagtekst, som knapper som fyller ut
 * feltene. Valget kontrolleres som om det var skrevet inn.
 */
function Snarvalgliste({ valg, valgt, onVelg }: { valg: readonly Snarvalg[]; valgt: Verktoyvalg | undefined; onVelg: (s: Snarvalg) => void }) {
  const merke = useId()
  if (valg.length === 0) return null
  const gjeldende = valgt && valgidentitet(valgt)
  const grupper = [
    { status: 'tilgjengelig', tittel: 'Kan beregnes nå' },
    { status: 'fagtekst', tittel: 'Bare fagtekst' },
  ] as const
  return (
    <div className="snarvalg">
      {grupper.map((g) => {
        const egne = valg.filter((x) => x.status === g.status)
        return (
          egne.length > 0 && (
            <div key={g.status} className="snarvalg__gruppe" role="group" aria-labelledby={`${merke}-${g.status}`}>
              <span id={`${merke}-${g.status}`} className="snarvalg__tittel">
                {g.tittel}:
              </span>
              {egne.map((x) => (
                <Button key={x.tekst} variant="kant" aria-pressed={gjeldende === valgidentitet(x.valg)} onClick={() => onVelg(x)}>
                  {x.tekst}
                </Button>
              ))}
            </div>
          )
        )
      })}
    </div>
  )
}

/* --- Ett verktøy ---------------------------------------------------------------- */

/** Skjemaet slik det tas vare på: et tidligere skjema fylles ut med feltene en ny versjon har lagt til. */
const SKJEMAFORM: Bevaringsform<Planskjema> = {
  lagre: (s) => s,
  les: (x) => {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return undefined
    const s = { ...TOMT_SKJEMA, ...(x as Partial<Planskjema>) }
    return Array.isArray(s.trinnvalg) ? s : { ...s, trinnvalg: [] }
  },
}

/** En plan som vises: valgene (`JSON.stringify(valg)`) og regelen den er beregnet etter. */
interface Planmerke {
  valg: string
  regel: string
}

type Beregning =
  | { nokkel: string; status: 'henter' }
  | { nokkel: string; status: 'feil'; melding: string; sperre?: boolean }
  | { nokkel: string; status: 'formvalg' }
  | { nokkel: string; status: 'ferdig'; resultat: Doseplanresultat }

const navnPaa = (nokkel: string | undefined) => KARTLEGGING.virkestoffer.find((v) => v.nokkel === nokkel)?.navn ?? nokkel ?? ''

function Verktoyskjema({
  verktoy,
  overskrift,
  legemidler,
  sperrer,
  regelsett,
  klokke,
  varsler,
}: {
  verktoy: Verktoy
  overskrift: string
  legemidler: Pick<Legemiddelleser, 'les'> | undefined
  sperrer: ReturnType<typeof useSperrer>
  regelsett: Regelsett
  klokke: () => Date
  varsler: Varseltilstand
}) {
  const valgene = useMemo(() => virkestoffvalg(verktoy), [verktoy])
  const alleSnarvalg = useMemo(() => snarvalg(verktoy, regelsett), [verktoy, regelsett])
  const [fraTekst, setFraTekst] = useBevart('fra', '')
  const [fraForm, setFraForm] = useBevart<Kildeformulering | ''>('fra/formulering', '')
  const [tilTekst, setTilTekst] = useBevart('til', '')
  const [tilForm, setTilForm] = useBevart<Kildeformulering | ''>('til/formulering', '')
  const [lagretSkjema, setSkjema] = useBevart<Planskjema>('skjema', TOMT_SKJEMA, SKJEMAFORM)

  const fra = lesVirkestoffvalg(valgene, fraTekst, fraForm)
  const tekster = VALGTEKSTER[verktoy.type]
  const til = tekster.til ? lesVirkestoffvalg(valgene, tilTekst, tilForm) : undefined
  const valg: Verktoyvalg | undefined = fra && (!tekster.til || til) ? { fra, ...(til && { til }) } : undefined
  // Skjemaet gjelder bare valgene det ble fylt ut for; andre valg begynner med et tomt skjema.
  const identitet = valg ? valgidentitet(valg) : ''
  const skjema = skjemaFor(lagretSkjema, identitet)
  // En plan som ble tatt bort fordi sperrene ikke kunne leses eller lesingen var for gammel (S6). Det står bare til forskriveren beregner eller endrer noe, og tas ikke vare på.
  const [tattBort, setTattBort] = useState<Planmerke | null>(null)
  const settSkjema = (endre: (s: Planskjema) => Planskjema) => {
    setTattBort(null)
    setSkjema((s) => endre(skjemaFor(s, identitet)))
  }
  // Det gamle skjemaet glemmes med en gang valgene skifter, også når de skifter tilbake senere.
  useEffect(() => setSkjema((s) => skjemaFor(s, identitet)), [identitet, setSkjema])

  /** Et annet virkestoff i feltet: formuleringen som var valgt for det forrige, gjelder ikke det nye. */
  const nyttVirkestoff = (forrige: string, settTekst: (t: string) => void, settForm: (f: Kildeformulering | '') => void) => (tekst: string) => {
    if (finnVirkestoff(valgene, tekst)?.nokkel !== finnVirkestoff(valgene, forrige)?.nokkel) settForm('')
    settTekst(tekst)
  }
  /** Et snarvalg fyller ut feltene som om det var skrevet inn. */
  const velg = ({ valg: v }: Snarvalg) => {
    setFraTekst(navnPaa(v.fra.nokkel))
    setFraForm(v.fra.formulering)
    if (v.til) {
      setTilTekst(navnPaa(v.til.nokkel))
      setTilForm(v.til.formulering)
    }
  }
  const status = useMemo(() => (valg ? tilgjengelighet(verktoy, valg, regelsett) : undefined), [verktoy, regelsett, valg?.fra.nokkel, valg?.fra.formulering, valg?.til?.nokkel, valg?.til?.formulering]) // eslint-disable-line react-hooks/exhaustive-deps
  // Klinisk innhold (en beregning eller fagtekst) vises bare når sperrene er lest, og bare for regler som ikke er sperret.
  const klinisk = status?.status === 'tilgjengelig' || status?.status === 'fagtekst'
  const aktive = sperrer.tilstand.status === 'klar' ? sperrer.tilstand.sperrer : []
  const regler = klinisk && status ? usperrede(aktive, verktoy, status.regler) : []
  const hele = verktoysperrer(aktive, verktoy)
  // Det som er stanset av en nødstopp, tilbys ikke som tilgjengelig, og ingenting tilbys før sperrene er lest.
  const snarvalgene = utenSperrede(alleSnarvalg, aktive, verktoy)

  // Planen som vises nå, slik beregningsdelen sist meldte den; den står igjen når delen tas bort fordi sperrene ikke er lest.
  const vistPlan = useRef<Planmerke | null>(null)
  const meldPlan = useCallback((m: Planmerke | null) => {
    vistPlan.current = m
  }, [])
  const glemTattBort = useCallback(() => setTattBort(null), [])
  const valgnokkel = valg ? JSON.stringify(valg) : ''
  const usperret = regler.map((r) => r.id).join()
  useEffect(() => {
    if (sperrer.tilstand.status !== 'klar') {
      // Det eneste stedet meldingen oppstår: sperrene kunne ikke leses eller er for gamle, og en plan som sto, er tatt bort av det.
      if (vistPlan.current) setTattBort(vistPlan.current)
      vistPlan.current = null
      return
    }
    // En vellykket lesing gir aldri en ny melding. Den beholder en melding som alt står, og planen som vises, bare for de samme valgene og en regel som ikke er sperret.
    const gjelderNa = (m: Planmerke | null) => (m && m.valg === valgnokkel && usperret.split(',').includes(m.regel) ? m : null)
    vistPlan.current = gjelderNa(vistPlan.current)
    setTattBort((staende) => gjelderNa(staende))
  }, [sperrer.tilstand, valgnokkel, usperret])

  return (
    <>
      <header className="verktoyside__hode">
        <p className="verktoyside__overtittel">
          <a href={verktoyadresse()}>Verktøy</a>
        </p>
        <h1 id={overskrift} className="verktoyside__tittel" tabIndex={-1}>
          {verktoy.navn}
        </h1>
        <p className="verktoyside__ingress">{verktoy.beskrivelse}</p>
      </header>

      <form className="verktoyskjema" onSubmit={(e) => e.preventDefault()} aria-label="Valg">
        <fieldset className="feltgruppe">
          <legend>{tekster.gruppe}</legend>
          <div className="feltrad verktoyskjema__virkestoffer">
            <Virkestoffelt
              etikett={tekster.fra}
              valg={valgene}
              tekst={fraTekst}
              formulering={fraForm}
              onTekst={nyttVirkestoff(fraTekst, setFraTekst, setFraForm)}
              onFormulering={setFraForm}
            />
            {tekster.til && (
              <Virkestoffelt etikett={tekster.til} valg={valgene} tekst={tilTekst} formulering={tilForm} onTekst={nyttVirkestoff(tilTekst, setTilTekst, setTilForm)} onFormulering={setTilForm} />
            )}
          </div>
        </fieldset>
        {sperrer.tilstand.status === 'klar' ? (
          <Snarvalgliste valg={snarvalgene} valgt={valg} onVelg={velg} />
        ) : (
          <p className="verktoyside__hint" data-ukontrollert={sperrer.tilstand.status}>
            {sperrer.tilstand.status === 'henter' && <Lastesirkel />}
            {TILGJENGELIGHET_UKONTROLLERT[sperrer.tilstand.status]}
          </p>
        )}
      </form>

      {hele.length > 0 && <Sperremelding sperrer={hele} regelsett={regelsett} />}
      {!valg || !status ? (
        <p className="verktoyside__hint">
          {tekster.velg} for å se hva verktøyet kan beregne.
        </p>
      ) : !klinisk ? (
        <Statusvisning status={status} varsler={varsler} />
      ) : sperrer.tilstand.status === 'henter' ? (
        <p className="verktoyside__hint" role="status">
          <Lastesirkel /> Kontrollerer om verktøyet er tilgjengelig …
        </p>
      ) : sperrer.tilstand.status === 'feil' ? (
        <section className="verktoystatus" data-status="sperret" role="alert">
          <h2>Ingen doseplan eller fagtekst</h2>
          <p>{sperrer.tilstand.utenNett ? UTEN_NETT : UKONTROLLERT}</p>
          <div className="verktoyskjema__handlinger">
            <Button variant="kant" onClick={() => void sperrer.hent().catch(() => undefined)}>
              Prøv igjen
            </Button>
          </div>
        </section>
      ) : regler.length === 0 ? (
        hele.length > 0 ? null : <Sperremelding sperrer={aktive.filter((x) => status.regler.some((r) => gjelder(x, verktoy, r)))} regelsett={regelsett} />
      ) : status.status === 'tilgjengelig' ? (
        <Beregningsdel
          key={JSON.stringify(valg)}
          verktoy={verktoy}
          valg={valg}
          regler={regler}
          skjema={skjema}
          setSkjema={settSkjema}
          legemidler={legemidler}
          hentSperrer={sperrer.hent}
          regelsett={regelsett}
          klokke={klokke}
          varsler={varsler}
          tattBort={tattBort}
          onPlan={meldPlan}
          onBeregn={glemTattBort}
        />
      ) : (
        <Statusvisning status={{ ...status, regler }} varsler={varsler} />
      )}
    </>
  )
}

/** At det som ellers ville stått her, er midlertidig deaktivert: av hvem, når og hvorfor. */
function Sperremelding({ sperrer, regelsett }: { sperrer: readonly Verktoysperre[]; regelsett: Regelsett }) {
  // En sperre for én regel nevner regelen ved navn, ikke ved den interne ID-en.
  const regelnavn = (id: string) => regelsett.regler.find((r) => r.id === id)?.tittel ?? id
  return (
    <section className="verktoystatus" data-status="sperret" role="alert" aria-label="Midlertidig deaktivert">
      <h2>Midlertidig deaktivert</h2>
      <p>{SPERRET}</p>
      <ul className="verktoystatus__regler">
        {sperrer.map((s) => (
          <li key={s.id}>
            {OMFANGSTEKST[s.omfang]}
            {s.omfang === 'regel' && s.mal ? ` «${regelnavn(s.mal)}»` : ''}: {s.grunn}
            {s.satt_av && <span className="verktoystatus__merke">{`${s.satt_av}, ${tidspunkt(s.satt_kl)}`}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Det som står når verktøyet ikke kan beregne for valgene. */
function Statusvisning({ status, varsler }: { status: Tilgjengelighet; varsler: Varseltilstand }) {
  if (status.status === 'fagtekst') {
    return (
      <section className="verktoystatus" data-status="fagtekst" aria-label="Fagtekst">
        <h2>Bare fagtekst – ingen beregning</h2>
        {status.regler.map((r) => (
          <Fagtekst key={r.id} regel={r} varsler={varsler} />
        ))}
      </section>
    )
  }
  const utenGodkjenning = status.status === 'ikke_godkjent' || status.status === 'til_kontroll'
  return (
    <section className="verktoystatus" data-status={status.status} role="status">
      <h2>{utenGodkjenning ? 'Beregning er ikke tilgjengelig' : 'Ikke støttet'}</h2>
      {status.grunner.map((g) => (
        <p key={g}>{g}</p>
      ))}
      {utenGodkjenning && (
        <>
          <p>OUSFAR viser bare doseplaner etter regler som er kontrollert og klinisk godkjent.</p>
          <ul className="verktoystatus__regler">
            {status.regler.map((r) => (
              <li key={r.id}>
                {r.tittel} <span className="verktoystatus__merke">{KONTROLLUTFALL[kontrollutfall(r)]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** OUSFARs egen tekst i en godkjent regel uten beregning; godkjenningen, forutsetningene og kildene står i «Faglig grunnlag». */
function Fagtekst({ regel, varsler }: { regel: Regel; varsler: Varseltilstand }) {
  const utsagn = [...regel.fortolkning.kildetro, ...regel.fortolkning.tilpasninger].map((u) => u.tekst)
  return (
    <article className="verktoyfagtekst">
      <h3>{regel.tittel}</h3>
      <Regelvarsler tilstand={varsler} regel={regel} />
      {utsagn.map((t) => (
        <p key={t}>{t}</p>
      ))}
      <FagligGrunnlag grunnlag={regelgrunnlag(regel)} />
    </article>
  )
}

/** Feltene for beregningen, knappen og resultatet, når en godkjent regel kan beregnes. */
function Beregningsdel({
  verktoy,
  valg,
  regler,
  skjema,
  setSkjema,
  legemidler,
  hentSperrer,
  regelsett,
  klokke,
  varsler,
  tattBort,
  onPlan,
  onBeregn,
}: {
  verktoy: Verktoy
  valg: Verktoyvalg
  regler: Regel[]
  skjema: Planskjema
  setSkjema: (endre: (s: Planskjema) => Planskjema) => void
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
}) {
  const id = useId()
  const regel = regler.length === 1 ? regler[0] : regler.find((r) => r.id === skjema.regel)
  const [beregning, setBeregning] = useState<Beregning | null>(null)
  const [alternativer, setAlternativer] = useState<{ regel: string; valg: Record<string, Formalternativer> } | null>(null)
  const [feil, setFeil] = useState<string[]>([])
  // Først når det er forsøkt beregnet, merkes det som mangler svar ved feltene.
  const [forsokt, setForsokt] = useState(false)
  const [, setTikk] = useState(0)
  // Bare den siste beregningen som er startet, får vise resultatet sitt; en eldre som blir ferdig senere, forkastes.
  const siste = useRef(0)
  const nokkel = JSON.stringify({ regel: regel?.id, valg, skjema })
  const gjeldende = beregning?.nokkel === nokkel ? beregning : null
  const formvalg = alternativer && alternativer.regel === regel?.id ? alternativer.valg : {}
  const justeringer = useMemo(() => (regel ? justeringsfelt(regel, skjema.svar) : []), [regel, skjema.svar])
  const spenn = regel && spennFor(regel, skjema)
  const apne = forsokt && regel ? ubesvart(regel, skjema) : INGEN_APNE

  // En plan som står, kontrolleres mot klokken: den gjelder bare så lenge FEST-kopien er fersk og dagen den samme.
  const harPlan = gjeldende?.status === 'ferdig' && gjeldende.resultat.status === 'doseplan'
  useEffect(() => {
    if (!harPlan) return
    const t = window.setInterval(() => setTikk((x) => x + 1), KONTROLLER_PLANEN_MS)
    return () => window.clearInterval(t)
  }, [harPlan])
  const plan =
    harPlan && regel && gjeldende.resultat.status === 'doseplan' && gjelderFortsatt(gjeldende.resultat, klokke())
      ? planvisning(gjeldende.resultat, regel, skjema.startdato || undefined)
      : null
  const valgnokkel = JSON.stringify(valg)
  const planregel = plan && regel ? regel.id : null
  useEffect(() => onPlan(planregel ? { valg: valgnokkel, regel: planregel } : null), [planregel, valgnokkel, onPlan])
  const visTattBort = !!regel && tattBort?.valg === valgnokkel && tattBort.regel === regel.id

  const sett = <K extends keyof Planskjema>(felt: K, verdi: Planskjema[K]) => setSkjema((s) => ({ ...s, [felt]: verdi }))

  // `sk` er skjemaet slik det blir når beregningen startes av et valg i resultatet, før det er vist.
  async function beregn(sk: Planskjema = skjema) {
    if (!regel) return setFeil(['Velg strategien planen skal beregnes etter.'])
    onBeregn()
    setForsokt(true)
    const mangel = [...mangler(regel, sk), ...ubesvarttekst(ubesvart(regel, sk))]
    setFeil(mangel)
    if (mangel.length > 0) return
    const n = JSON.stringify({ regel: regel.id, valg, skjema: sk })
    const denne = ++siste.current
    setBeregning({ nokkel: n, status: 'henter' })
    try {
      if (!legemidler) throw new Error('Legemiddeldataene kan ikke leses her.')
      const hentFest = () => legemidler.les(festIderFor(regel, valg))
      // Ett nytt forsøk mot FEST før feilen vises (K6); planen kontrolleres etterpå som alle andre.
      const utvalg = await hentFest().catch(async () => {
        await vent(FEST_NYTT_FORSOK_MS)
        if (denne !== siste.current) return null
        return hentFest()
      })
      if (denne !== siste.current || !utvalg) return
      // Sperrene leses på nytt etter FEST, rett før resultatet vises: en sperre som kom mens preparatene ble hentet, gir ingen plan.
      const sperrer = await hentSperrer()
      if (denne !== siste.current) return
      if (usperrede(sperrer, verktoy, [regel]).length === 0) return setBeregning(null)
      const tid = klokke()
      const alt = formvalgFor(regel, valg, sk, utvalg, tid)
      setAlternativer({ regel: regel.id, valg: alt })
      const uvalgt = Object.entries(alt).some(
        ([f, a]) => (a.klasser.length > 1 && !sk.formvalg[f]?.klasse) || (a.legemiddelformer.length > 1 && !sk.formvalg[f]?.legemiddelform),
      )
      if (uvalgt) return setBeregning({ nokkel: n, status: 'formvalg' })
      setBeregning({ nokkel: n, status: 'ferdig', resultat: beregnPlan(regel, valg, sk, utvalg, tid, regelsett) })
    } catch (e) {
      if (denne !== siste.current) return
      setBeregning({ nokkel: n, status: 'feil', melding: e instanceof Error ? e.message : String(e), sperre: e instanceof Sperrefeil })
    }
  }

  // Et valg av dose for et trinn står i skjemaet og gir en ny beregning med en gang.
  const velgTrinn = (t: Trinnvalg, mg: number) => {
    const nytt = medTrinnvalg(skjema, t, mg)
    setSkjema(() => nytt)
    void beregn(nytt)
  }

  const forlopsnavn = (forlop: string) => {
    const f = regel?.plan.forlop.find((x) => x.id === forlop)
    return navnPaa(f?.virkestoff.type === 'virkestoff' ? f.virkestoff.nokkel : regel && medlemFor(regel, valg))
  }
  const fraNavn = navnPaa(valg.fra.nokkel)
  const tilNavn = navnPaa(valg.til?.nokkel)
  const fraAdm = regel && fraForlop(regel)?.administrasjon === 'depotinjeksjon' ? ' (depot)' : ''
  const tilAdm = regel && tilForlop(regel)?.administrasjon === 'depotinjeksjon' ? ' (depot)' : ''
  const sporsmal = regel?.sporsmal ?? []
  const varsel = regel && <Regelvarsler tilstand={varsler} regel={regel} />

  return (
    <>
      {!plan && varsel}
      <form
        className="verktoyskjema"
        aria-label="Inndata til doseplanen"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void beregn()
        }}
      >
        {regler.length > 1 && (
          <fieldset className="feltgruppe">
            <legend>Strategi</legend>
            <div className="avkryssinger avkryssinger--loddrett">
              {regler.map((r) => (
                <label key={r.id} className="avkryssing">
                  <input type="radio" name={`${id}-regel`} checked={skjema.regel === r.id} onChange={() => setSkjema((s) => medRegel(s, r.id))} />
                  {r.tittel}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="feltgruppe">
          <legend>Doser og start</legend>
          <div className="feltrad">
            <label className="skjemafelt">
              <span>
                Aktuell døgndose av {fraNavn.toLowerCase()}
                {fraAdm} (mg)
              </span>
              <Tallfelt value={skjema.startdose} onChange={(v) => sett('startdose', v)} />
            </label>
            {regel && trengerMaldose(regel, skjema) && (
              <label className="skjemafelt">
                <span>
                  Måldose av {tilNavn.toLowerCase()}
                  {tilAdm} ({tilAdm ? 'mg per injeksjon' : 'mg per døgn'})
                </span>
                <Tallfelt value={skjema.maldose} onChange={(v) => sett('maldose', v)} />
              </label>
            )}
            <label className="skjemafelt">
              <span>Startdato (valgfri)</span>
              <input className="inndatafelt" type="date" value={skjema.startdato} onChange={(e) => sett('startdato', e.target.value)} />
            </label>
          </div>
          {regel && spenn && (
            <p className="feltgruppe__hjelp">
              Ved {tall(spenn.fra_mg)} mg gir omregningstabellen et spenn på {tall(spenn.til_mg[0])}–{tall(spenn.til_mg[1])} mg. Dosen i spennet er et klinisk valg og skrives inn som måldose.
            </p>
          )}
          {regel && trengerMaldose(regel, skjema) && <p className="feltgruppe__hjelp">Måldosen fylles aldri inn av verktøyet; den må skrives inn.</p>}
          {!skjema.startdato && <p className="feltgruppe__hjelp">Uten startdato står planen med dagnummer.</p>}
        </fieldset>

        {regel && (sporsmal.length > 0 || regel.unntak.length > 0) && (
          <fieldset className="feltgruppe">
            <legend>Om pasienten</legend>
            {sporsmal.map((x) => (
              <JaNei
                key={x.id}
                navn={`${id}-${x.id}`}
                tekst={x.tekst}
                svar={['Ja', 'Nei']}
                verdi={skjema.svar[x.id]}
                mangler={apne.sporsmal.includes(x.id)}
                onVelg={(v) => sett('svar', { ...skjema.svar, [x.id]: v })}
              />
            ))}
            {regel.unntak.map((u) => (
              <JaNei
                key={u.id}
                navn={`${id}-${u.id}`}
                tekst={u.tekst}
                svar={['Gjelder', 'Gjelder ikke']}
                verdi={skjema.pasientforhold[u.id]}
                mangler={apne.unntak.includes(u.id)}
                merknad={skjema.pasientforhold[u.id] === true ? UNNTAK_GJELDER : undefined}
                onVelg={(v) => sett('pasientforhold', { ...skjema.pasientforhold, [u.id]: v })}
              />
            ))}
          </fieldset>
        )}

        {justeringer.length > 0 && (
          <Details summary="Tilpass planen (valgfritt)" startApen={Object.values(skjema.justert).some((v) => v.trim() !== '')}>
            <div className="verktoyskjema__tilpasning">
              <p className="feltgruppe__hjelp">Velg mindre trinn eller lengre tid innenfor det regelen tillater. Tomt felt bruker regelens forslag. Dagene er minstetider. Valget vises i planen.</p>
              <div className="feltrad">
                {justeringer.map((j) => (
                  <label key={j.sti} className="skjemafelt">
                    <span>{j.navn}</span>
                    <Tallfelt
                      value={skjema.justert[j.sti] ?? ''}
                      placeholder={j.forslag}
                      aria-describedby={`${id}-${j.sti}`}
                      onChange={(v) => sett('justert', { ...skjema.justert, [j.sti]: v })}
                    />
                  </label>
                ))}
              </div>
              {justeringer.map((j) => (
                <p key={j.sti} id={`${id}-${j.sti}`} className="feltgruppe__hjelp">
                  {j.navn}: {j.hjelp}
                </p>
              ))}
            </div>
          </Details>
        )}

        {regel && kanKreveBegrunnelse(regel) && (
          <fieldset className="feltgruppe">
            <legend>Begrunnelse</legend>
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
            <p id={`${id}-begrunnelse`} className="feltgruppe__hjelp">
              Begrunnelse kreves ved {begrunnelseshjelp(regel)}, f.eks. om behandlingstid og tidligere toleranse. Den står i planen; skriv ikke navn eller andre personopplysninger.
            </p>
          </fieldset>
        )}

        {skjema.trinnvalg.length > 0 && (
          <fieldset className="feltgruppe">
            <legend>Valgte doser per trinn</legend>
            <ul className="verktoyskjema__valgte">
              {skjema.trinnvalg.map((v) => (
                <li key={`${v.forlop}-${v.trinn}`}>
                  Trinn {v.trinn} av {forlopsnavn(v.forlop)}: {tall(v.mg)} mg (fra {tall(v.fra_mg)} mg)
                </li>
              ))}
            </ul>
            <Button variant="kant" onClick={() => sett('trinnvalg', [])}>
              Fjern valgene
            </Button>
          </fieldset>
        )}

        {Object.keys(formvalg).length > 0 && (
          <fieldset className="feltgruppe">
            <legend>Formulering og legemiddelform</legend>
            <p className="feltgruppe__hjelp">FEST har flere formuleringer eller former. Verktøyet velger ikke selv.</p>
            <div className="feltrad">
              {Object.entries(formvalg).flatMap(([f, a]) => [
                a.klasser.length > 1 && (
                  <label key={`${f}-klasse`} className="skjemafelt">
                    <span>Formulering av {forlopsnavn(f).toLowerCase()}</span>
                    <select
                      className="inndatafelt"
                      value={skjema.formvalg[f]?.klasse ?? ''}
                      onChange={(e) => sett('formvalg', { ...skjema.formvalg, [f]: { klasse: e.target.value || undefined } })}
                    >
                      <option value="">Velg …</option>
                      {a.klasser.map((k) => (
                        <option key={k.kode} value={k.kode}>
                          {k.navn}
                        </option>
                      ))}
                    </select>
                  </label>
                ),
                a.legemiddelformer.length > 1 && (
                  <label key={`${f}-form`} className="skjemafelt">
                    <span>Legemiddelform av {forlopsnavn(f).toLowerCase()}</span>
                    <select
                      className="inndatafelt"
                      value={skjema.formvalg[f]?.legemiddelform ?? ''}
                      onChange={(e) => sett('formvalg', { ...skjema.formvalg, [f]: { ...skjema.formvalg[f], legemiddelform: e.target.value || undefined } })}
                    >
                      <option value="">Velg …</option>
                      {a.legemiddelformer.map((k) => (
                        <option key={k.kode} value={k.kode}>
                          {k.navn}
                        </option>
                      ))}
                    </select>
                  </label>
                ),
              ])}
            </div>
          </fieldset>
        )}

        {regel && regel.bekreftelser.length > 0 && (
          <fieldset className="feltgruppe">
            <legend>Bekreft før beregning</legend>
            {regel.bekreftelser.map((b) => {
              const mangler = apne.bekreftelser.includes(b.id)
              return (
                <label key={b.id} className="avkryssing avkryssing--felt" data-mangler={mangler || undefined}>
                  <input
                    type="checkbox"
                    checked={skjema.bekreftet.includes(b.id)}
                    aria-invalid={mangler || undefined}
                    onChange={(e) => sett('bekreftet', e.target.checked ? [...skjema.bekreftet, b.id] : skjema.bekreftet.filter((x) => x !== b.id))}
                  />
                  <span>
                    {b.tekst}
                    {mangler && <span className="verktoyskjema__mangler"> Ikke bekreftet.</span>}
                  </span>
                </label>
              )
            })}
          </fieldset>
        )}

        <label className="avkryssing avkryssing--felt">
          <input type="checkbox" checked={skjema.godkjenningsfritak} onChange={(e) => sett('godkjenningsfritak', e.target.checked)} />
          Bruk også preparater som krever godkjenningsfritak
        </label>

        {feil.length > 0 && (
          <ul className="verktoyskjema__feil" role="alert">
            {feil.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}

        {visTattBort && (
          <p className="verktoyside__hint" role="status" data-tatt-bort>
            {PLAN_TATT_BORT}
          </p>
        )}
        <div className="verktoyskjema__handlinger">
          <Button type="submit" disabled={gjeldende?.status === 'henter'}>
            Beregn doseplan
          </Button>
        </div>
      </form>

      <Resultat
        beregning={gjeldende}
        plan={plan}
        utdatert={!!beregning && !gjeldende}
        verktoy={verktoy}
        varsel={varsel}
        valg={<Trinnvalgdel resultat={gjeldende?.status === 'ferdig' ? gjeldende.resultat : null} navn={forlopsnavn} onVelg={velgTrinn} />}
      />
      {!plan && regel && <FagligGrunnlag grunnlag={regelgrunnlag(regel)} />}
    </>
  )
}

const INGEN_APNE: ReturnType<typeof ubesvart> = { sporsmal: [], unntak: [], bekreftelser: [] }

/** Det samme som står ved et pasientforhold som gjelder: beregningen gir da ingen plan (`beregning.ts`). */
const UNNTAK_GJELDER = 'Når dette gjelder, gir verktøyet ingen plan. Det må vurderes individuelt.'

/** Hva som mangler før beregning, kort; feltene det gjelder er merket. */
function ubesvarttekst(u: ReturnType<typeof ubesvart>): string[] {
  const svar = u.sporsmal.length + u.unntak.length
  const deler = [
    svar > 0 && `svar på ${svar === 1 ? 'ett spørsmål' : `${svar} spørsmål`} om pasienten`,
    u.bekreftelser.length > 0 && `bekreft ${u.bekreftelser.length === 1 ? 'én forutsetning' : `${u.bekreftelser.length} forutsetninger`}`,
  ].filter(Boolean)
  if (deler.length === 0) return []
  const tekst = deler.join(' og ')
  return [`Før beregning: ${tekst}. Det som mangler, er merket over.`]
}

/** Et ja/nei-valg med to svar, f.eks. et unntak («Gjelder» / «Gjelder ikke») eller et spørsmål («Ja» / «Nei»). */
function JaNei({
  navn,
  tekst,
  svar,
  verdi,
  mangler = false,
  merknad,
  onVelg,
}: {
  navn: string
  tekst: string
  svar: [string, string]
  verdi: boolean | undefined
  /** Ubesvart etter et forsøk på å beregne. */
  mangler?: boolean
  /** Hva svaret betyr, når det betyr noe for beregningen. */
  merknad?: string
  onVelg: (verdi: boolean) => void
}) {
  return (
    <fieldset className="verktoyskjema__unntak" data-mangler={mangler || undefined} aria-invalid={mangler || undefined}>
      <legend>
        {tekst}
        {mangler && <span className="verktoyskjema__mangler"> Mangler svar.</span>}
      </legend>
      <div className="avkryssinger">
        {([true, false] as const).map((v, i) => (
          <label key={String(v)} className="avkryssing">
            <input type="radio" name={navn} checked={verdi === v} onChange={() => onVelg(v)} />
            {svar[i]}
          </label>
        ))}
      </div>
      {merknad && <p className="verktoyskjema__merknad">{merknad}</p>}
    </fieldset>
  )
}

const tall = (x: number) => String(avrund(x)).replace('.', ',')

/**
 * Dosene forskriveren kan velge for et trinn som ikke kan gis nøyaktig
 * (P7.5): de nærmeste dosene som kan gis, med faktisk reduksjon. Beregningen
 * velger aldri selv; et valg gir en ny beregning fra den valgte dosen.
 */
function Trinnvalgdel({ resultat, navn, onVelg }: { resultat: Doseplanresultat | null; navn: (forlop: string) => string; onVelg: (t: Trinnvalg, mg: number) => void }) {
  const valg = resultat?.trinnvalg ?? []
  if (valg.length === 0) return null
  return (
    <section className="trinnvalg" aria-label="Doser som kan velges">
      {valg.map((t) => (
        <fieldset key={`${t.forlop}-${t.trinn}`} className="feltgruppe">
          <legend>
            Trinn {t.trinn} av {navn(t.forlop)} kan ikke gis nøyaktig
          </legend>
          <p className="feltgruppe__hjelp">
            Den foretrukne reduksjonen til {foretrukketTekst(t)} kan ikke gis med preparatene. Velg en dose som kan gis; den faktiske reduksjonen må være innenfor det foretrukne
            området {tall(t.omrade[0])}–{tall(t.omrade[1])} %. Verktøyet velger ikke selv, og planen beregnes på nytt fra dosen du velger.
          </p>
          <div className="verktoyskjema__handlinger">
            {t.doser.map((d) => (
              <Button key={d.mg} variant="kant" onClick={() => onVelg(t, d.mg)}>
                {trinndosetekst(d)}
              </Button>
            ))}
          </div>
        </fieldset>
      ))}
    </section>
  )
}

/** Resultatet av siste beregning for inndataene slik de står, med dosene som kan velges (`valg`). */
function Resultat({
  beregning,
  plan,
  utdatert,
  verktoy,
  varsel,
  valg,
}: {
  beregning: Beregning | null
  /** Planen slik den vises, når beregningen ga en klinisk plan som fortsatt gjelder; ellers `null`. */
  plan: Planvisning | null
  utdatert: boolean
  verktoy: Verktoy
  /** Et eventuelt faglig varsel for regelen, som står i planen. */
  varsel: ReactNode
  valg: ReactNode
}) {
  if (!beregning) {
    return utdatert ? (
      <p className="verktoyside__hint" role="status">
        Inndataene er endret. Beregn på nytt for å se en plan.
      </p>
    ) : null
  }
  if (beregning.status === 'henter') {
    return (
      <p className="verktoyside__hint" role="status">
        <Lastesirkel /> Henter preparatene fra FEST og beregner …
      </p>
    )
  }
  if (beregning.status === 'feil') {
    return (
      <p className="sidevarsel" role="alert">
        {beregning.sperre ? UKONTROLLERT : `Fikk ikke hentet preparatene fra FEST. ${beregning.melding}`}
      </p>
    )
  }
  if (beregning.status === 'formvalg') {
    return (
      <p className="verktoystatus" data-status="ikke_stottet" role="status">
        Velg formulering og legemiddelform over, og beregn på nytt.
      </p>
    )
  }
  const r = beregning.resultat
  if (r.status === 'stoppet') {
    return (
      <>
        <section className="verktoystatus" data-status="stoppet" role="status">
          <h2>Ingen doseplan</h2>
          {r.stoppgrunner.map((g) => (
            <p key={g}>{g}</p>
          ))}
          {r.fagtekst.map((t) => (
            <article key={t.fagside + t.tittel} className="verktoyfagtekst">
              <h3>{t.tittel}</h3>
              <p>{t.tekst}</p>
            </article>
          ))}
        </section>
        {valg}
      </>
    )
  }
  if (!plan) {
    return (
      <p className="verktoystatus" data-status="stoppet" role="status">
        Planen gjelder ikke lenger: FEST-dataene, godkjenningen eller dagen er endret. Beregn på nytt.
      </p>
    )
  }
  return (
    <>
      {valg}
      <Doseplanvisning plan={plan} overskrift={verktoy.navn} varsel={varsel} />
    </>
  )
}
