import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { tidspunkt } from '../../faginnhold/historikk'
import { useJevnligSjekk } from '../../hooks/useJevnligSjekk'
import { useLukkMedEscape } from '../../hooks/useLukkMedEscape'
import type { Legemiddelleser } from '../../legemiddeldata/lesing'
import { Bevaringsomrade, useBevart, type Bevaringsform } from '../../oppdatering/Bevaring'
import { verktoyadresse } from '../../domain/rute'
import { skjemaFor, TOMT_SKJEMA, valgidentitet, type Planskjema } from '../../verktoy/doseplan'
import type { Kildeformulering } from '../../verktoy/kartlegging'
import { finnVirkestoff, KARTLEGGING, VALGTEKSTER, VERKTOY, verktoyFor, virkestoffvalg, type Verktoy } from '../../verktoy/register'
import type { Regel, Regelsett } from '../../verktoy/regler/modell'
import {
  FOR_SEN,
  gjelder,
  LES_SPERRENE_HVER_MS,
  LESEFRIST_MS,
  medFrist,
  NYE_FORSOK_MS,
  OMFANGSTEKST,
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
import { REGELSETT, tilgjengelighet, type Tilgjengelighet, type Verktoyvalg } from '../../verktoy/tilgjengelighet'
import { snarvalg, utenSperrede, type Snarvalg } from '../../verktoy/snarvalg'
import { Button } from '../Button'
import { Lastesirkel } from '../Lasteindikator'
import { Lukkeknapp } from '../Lukkeknapp'
import { Ikon } from '../ikon/Ikon'
import { ToppmenyInnhold } from '../toppmeny/Toppmenykilde'
import { Arbeidsflyt, Flytsteg, Panelmelding, Sperrefeil, STEGTITLER, type Forhandsdata, type Planmerke } from './Arbeidsflyt'
import { FagligGrunnlag, regelgrunnlag } from './FagligGrunnlag'
import type { Regelvarsellager } from '../../verktoy/overvaking/regelvarsler'
import { Regelvarsler, useRegelvarsler, type Varseltilstand } from './Regelvarsler'
import { lesVirkestoffvalg, Virkestoffelt } from './Virkestoffelt'
import '../../styles/verktoy.css'

export { FEST_NYTT_FORSOK_MS } from './Arbeidsflyt'

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
  useJevnligSjekk(
    useCallback(() => void hent().catch(() => undefined), [hent]),
    LES_SPERRENE_HVER_MS,
  )
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
          <Verktoyskjema key={verktoy.id} verktoy={verktoy} overskrift={overskrift} legemidler={legemidler} sperrer={sperrer} regelsett={regelsett} klokke={klokke} varsler={varsler} />
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
          Beregnede forslag til nedtrapping og bytte, med preparatene i FEST, bare etter regler som er klinisk godkjent og bare i omfanget de er godkjent for. Et forslag erstatter ikke klinisk
          vurdering og er ikke en fullstendig behandlingsplan.
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
    // Svarene i flyten er tekst; noe annet fra en tidligere versjon glemmes.
    const flytsvar = s.flytsvar && typeof s.flytsvar === 'object' && !Array.isArray(s.flytsvar) ? Object.fromEntries(Object.entries(s.flytsvar).filter(([, v]) => typeof v === 'string')) : {}
    return { ...s, flytsvar, trinnvalg: Array.isArray(s.trinnvalg) ? s.trinnvalg : [] }
  },
}

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
  const titler = STEGTITLER[verktoy.type]

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

  // Planen som vises nå, slik flyten sist meldte den; den står igjen når flyten tas bort fordi sperrene ikke er lest.
  const vistPlan = useRef<Planmerke | null>(null)
  const meldPlan = useCallback((m: Planmerke | null) => {
    vistPlan.current = m
  }, [])
  const glemTattBort = useCallback(() => setTattBort(null), [])
  // Inndataene planen sist ble beregnet av seg selv for, også mens flyten er tatt bort (se `Arbeidsflyt`).
  const autoberegnet = useRef<string | null>(null)
  const forhandsbuffer = useRef<Forhandsdata | null>(null)
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

  const steg1 = (
    <Flytsteg nr={1} tittel={titler[0]} ferdig={!!valg}>
      <form className="verktoyskjema" onSubmit={(e) => e.preventDefault()} aria-label={tekster.gruppe}>
        <div className="feltrad verktoyskjema__virkestoffer">
          <Virkestoffelt etikett={tekster.fra} valg={valgene} tekst={fraTekst} formulering={fraForm} onTekst={nyttVirkestoff(fraTekst, setFraTekst, setFraForm)} onFormulering={setFraForm} />
          {tekster.til && (
            <Virkestoffelt etikett={tekster.til} valg={valgene} tekst={tilTekst} formulering={tilForm} onTekst={nyttVirkestoff(tilTekst, setTilTekst, setTilForm)} onFormulering={setTilForm} />
          )}
        </div>
        {sperrer.tilstand.status === 'klar' ? (
          <Snarvalgliste valg={snarvalgene} valgt={valg} onVelg={velg} />
        ) : (
          <p className="verktoyside__hint" data-ukontrollert={sperrer.tilstand.status}>
            {sperrer.tilstand.status === 'henter' && <Lastesirkel />}
            {TILGJENGELIGHET_UKONTROLLERT[sperrer.tilstand.status]}
          </p>
        )}
      </form>
    </Flytsteg>
  )

  /** Det planpanelet viser når verktøyet ikke kan beregne for valgene: hva som mangler, fagteksten, eller hvorfor ikke; ellers ingenting, og flyten står. */
  const melding: ReactNode | undefined =
    !valg || !status ? (
      <Panelmelding tittel={tekster.velg}>
        <p>Verktøyet sier så fort som mulig om det kan lage en komplett plan for valget.</p>
      </Panelmelding>
    ) : !klinisk ? (
      <Statusvisning status={status} varsler={varsler} />
    ) : sperrer.tilstand.status === 'henter' ? (
      <Panelmelding>
        <p className="planpanel__henter">
          <Lastesirkel /> Kontrollerer om verktøyet er tilgjengelig …
        </p>
      </Panelmelding>
    ) : sperrer.tilstand.status === 'feil' ? (
      <section className="verktoystatus" data-status="sperret" role="alert">
        <h3>Ingen doseplan eller fagtekst</h3>
        <p>{sperrer.tilstand.utenNett ? UTEN_NETT : UKONTROLLERT}</p>
        <div className="verktoyskjema__handlinger">
          <Button variant="kant" onClick={() => void sperrer.hent().catch(() => undefined)}>
            Prøv igjen
          </Button>
        </div>
      </section>
    ) : regler.length === 0 ? (
      hele.length > 0 ? (
        <Panelmelding tittel="Midlertidig deaktivert" />
      ) : (
        <Sperremelding sperrer={aktive.filter((x) => status.regler.some((r) => gjelder(x, verktoy, r)))} regelsett={regelsett} iPanel />
      )
    ) : status.status === 'tilgjengelig' ? undefined : (
      <Statusvisning status={{ ...status, regler }} varsler={varsler} />
    )

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

      {hele.length > 0 && <Sperremelding sperrer={hele} regelsett={regelsett} />}
      <Arbeidsflyt
        verktoy={verktoy}
        valg={valg}
        regler={melding === undefined ? regler : []}
        melding={melding}
        steg1={steg1}
        skjema={skjema}
        setSkjema={settSkjema}
        sperrer={sperrer.tilstand.status === 'klar' ? sperrer.tilstand.sperrer : undefined}
        legemidler={legemidler}
        hentSperrer={sperrer.hent}
        regelsett={regelsett}
        klokke={klokke}
        varsler={varsler}
        tattBort={tattBort}
        onPlan={meldPlan}
        onBeregn={glemTattBort}
        autoberegnet={autoberegnet}
        forhandsbuffer={forhandsbuffer}
      />
    </>
  )
}

/** At det som ellers ville stått her, er midlertidig deaktivert: av hvem, når og hvorfor. */
function Sperremelding({ sperrer, regelsett, iPanel = false }: { sperrer: readonly Verktoysperre[]; regelsett: Regelsett; iPanel?: boolean }) {
  const Overskrift = iPanel ? 'h3' : 'h2'
  // En sperre for én regel nevner regelen ved navn, ikke ved den interne ID-en.
  const regelnavn = (id: string) => regelsett.regler.find((r) => r.id === id)?.tittel ?? id
  return (
    <section className="verktoystatus" data-status="sperret" role="alert" aria-label="Midlertidig deaktivert">
      <Overskrift>Midlertidig deaktivert</Overskrift>
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
        <h3>Bare fagtekst – ingen beregning</h3>
        {status.regler.map((r) => (
          <Fagtekst key={r.id} regel={r} varsler={varsler} />
        ))}
      </section>
    )
  }
  const utenGodkjenning = status.status === 'ikke_godkjent' || status.status === 'til_kontroll'
  return (
    <section className="verktoystatus" data-status={status.status} role="status">
      <h3>{utenGodkjenning ? 'Verktøyet kan ikke lage en plan for dette ennå' : 'Ikke støttet'}</h3>
      {status.grunner.map((g) => (
        <p key={g}>{g}</p>
      ))}
      {utenGodkjenning && <p>OUSFAR lager bare planer etter regler som er kontrollert og klinisk godkjent.</p>}
    </section>
  )
}

/** OUSFARs egen tekst i en godkjent regel uten beregning; godkjenningen, forutsetningene og kildene står i «Kilder og grunnlag». */
function Fagtekst({ regel, varsler }: { regel: Regel; varsler: Varseltilstand }) {
  const utsagn = [...regel.fortolkning.kildetro, ...regel.fortolkning.tilpasninger].map((u) => u.tekst)
  return (
    <article className="verktoyfagtekst">
      <h4>{regel.tittel}</h4>
      <Regelvarsler tilstand={varsler} regel={regel} />
      {utsagn.map((t) => (
        <p key={t}>{t}</p>
      ))}
      <FagligGrunnlag grunnlag={regelgrunnlag(regel)} />
    </article>
  )
}
