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
  valgidentitet,
  type Planskjema,
} from '../../verktoy/doseplan'
import type { Kildeformulering } from '../../verktoy/kartlegging'
import { foretrukketTekst, trinndosetekst, type Doseplanresultat, type Formalternativer, type Trinnvalg } from '../../verktoy/motor/plan'
import { godkjenningstekst, kildeliste, planvisning } from '../../verktoy/planvisning'
import { finnVirkestoff, KARTLEGGING, VERKTOY, verktoyFor, virkestoffvalg, type Verktoy } from '../../verktoy/register'
import { avrund } from '../../verktoy/regler/beregning'
import { KONTROLLUTFALL, kontrollutfall } from '../../verktoy/regler/godkjenning'
import type { Regel, Regelsett } from '../../verktoy/regler/modell'
import { gjelder, OMFANGSTEKST, SPERRET, UKONTROLLERT, usperrede, verktoysperrer, type Verktoysperre, type Verktoysperreleser } from '../../verktoy/sperrer'
import {
  fraForlop,
  medlemFor,
  REGELSETT,
  regeloversikt,
  tilForlop,
  tilgjengelighet,
  type Tilgjengelighet,
  type Verktoyvalg,
} from '../../verktoy/tilgjengelighet'
import { Button } from '../Button'
import { Lastesirkel } from '../Lasteindikator'
import { Lukkeknapp } from '../Lukkeknapp'
import { Tallfelt } from '../Tallfelt'
import { Ikon } from '../ikon/Ikon'
import { ToppmenyInnhold } from '../toppmeny/Toppmenykilde'
import { Doseplanvisning } from './Doseplanvisning'
import { lesVirkestoffvalg, Virkestoffelt } from './Virkestoffelt'
import '../../styles/verktoy.css'

/** Hvor ofte en plan som står, kontrolleres mot klokken: FEST-kopiens alder og dagen. */
const KONTROLLER_PLANEN_MS = 60_000

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
}

const naa = () => new Date()

type Sperretilstand = { status: 'henter' } | { status: 'feil'; melding: string } | { status: 'klar'; sperrer: Verktoysperre[] }

/** En sperre som ikke kunne leses: beregningen vises ikke, og grunnen er ikke FEST. */
class Sperrefeil extends Error {}

/**
 * De aktive sperrene, lest med en gang, når fanen får fokus og jevnlig mens
 * siden står åpen. `hent` leser dem på nytt, gir dem og oppdaterer siden; den
 * kaster når de ikke kan leses, og da vises ingenting klinisk.
 */
function useSperrer(leser: Verktoysperreleser | undefined) {
  const [tilstand, setTilstand] = useState<Sperretilstand>({ status: 'henter' })
  // Bare den siste lesingen som er startet, får sette tilstanden.
  const siste = useRef(0)
  const hent = useCallback(async () => {
    const denne = ++siste.current
    try {
      if (!leser) throw new Error('Sperrene kan ikke leses her.')
      const sperrer = await leser.les()
      if (denne === siste.current) setTilstand({ status: 'klar', sperrer })
      return sperrer
    } catch (e) {
      const melding = e instanceof Error ? e.message : String(e)
      if (denne === siste.current) setTilstand({ status: 'feil', melding })
      throw new Sperrefeil(melding)
    }
  }, [leser])
  useJevnligSjekk(useCallback(() => void hent().catch(() => undefined), [hent]), KONTROLLER_PLANEN_MS)
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
export function Verktoyside({ verktoy: id, legemidler, sperrer: sperreleser, onLukk, regelsett = REGELSETT, klokke = naa }: VerktoysideProps) {
  const overskrift = useId()
  const verktoy = verktoyFor(id)
  const sperrer = useSperrer(sperreleser)
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
          <Verktoyskjema key={verktoy.id} verktoy={verktoy} overskrift={overskrift} legemidler={legemidler} sperrer={sperrer} regelsett={regelsett} klokke={klokke} />
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
  const status = VERKTOY.map((v) => ({ verktoy: v, sperret: verktoysperrer(aktive, v).length > 0, ...regeloversikt(v, regelsett) }))
  const ingen = status.every((s) => s.tilgjengelige === 0)
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
      {alle.length > 0 && <Sperremelding sperrer={alle} />}
      {ingen && (
        <p className="verktoystatus" data-status="til_kontroll">
          Ingen beregninger er tilgjengelige ennå: reglene venter på faglig kontroll og klinisk godkjenning.
        </p>
      )}
      <ul className="verktoykort">
        {status.map(({ verktoy, sperret, tilgjengelige, ikkeGodkjent, tilKontroll }) => (
          <li key={verktoy.id}>
            <a className="verktoykort__lenke" href={verktoyadresse(verktoy.id)}>
              <Ikon navn={verktoy.ikon} className="verktoykort__ikon" />
              <span className="verktoykort__tekst">
                <span className="verktoykort__navn">{verktoy.navn}</span>
                <span className="verktoykort__beskrivelse">{verktoy.beskrivelse}</span>
                <span className="verktoykort__status">
                  {sperret && 'Midlertidig deaktivert · '}
                  {tilgjengelige > 0
                    ? `${tilgjengelige} ${tilgjengelige === 1 ? 'regel kan' : 'regler kan'} beregnes`
                    : 'Ingen beregning tilgjengelig ennå'}
                  {ikkeGodkjent > 0 && ` · ${ikkeGodkjent} ikke godkjent`}
                  {tilKontroll > 0 && ` · ${tilKontroll} til faglig kontroll`}
                </span>
              </span>
              <Ikon navn="chev" className="verktoykort__pil" />
            </a>
          </li>
        ))}
      </ul>
    </>
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
}: {
  verktoy: Verktoy
  overskrift: string
  legemidler: Pick<Legemiddelleser, 'les'> | undefined
  sperrer: ReturnType<typeof useSperrer>
  regelsett: Regelsett
  klokke: () => Date
}) {
  const valgene = useMemo(() => virkestoffvalg(verktoy), [verktoy])
  const [fraTekst, setFraTekst] = useBevart('fra', '')
  const [fraForm, setFraForm] = useBevart<Kildeformulering | ''>('fra/formulering', '')
  const [tilTekst, setTilTekst] = useBevart('til', '')
  const [tilForm, setTilForm] = useBevart<Kildeformulering | ''>('til/formulering', '')
  const [lagretSkjema, setSkjema] = useBevart<Planskjema>('skjema', TOMT_SKJEMA, SKJEMAFORM)

  const fra = lesVirkestoffvalg(valgene, fraTekst, fraForm)
  const til = verktoy.type === 'bytte' ? lesVirkestoffvalg(valgene, tilTekst, tilForm) : undefined
  const valg: Verktoyvalg | undefined = fra && (verktoy.type === 'seponering' || til) ? { fra, ...(til && { til }) } : undefined
  // Skjemaet gjelder bare valgene det ble fylt ut for; andre valg begynner med et tomt skjema.
  const identitet = valg ? valgidentitet(valg) : ''
  const skjema = skjemaFor(lagretSkjema, identitet)
  const settSkjema = (endre: (s: Planskjema) => Planskjema) => setSkjema((s) => endre(skjemaFor(s, identitet)))
  // Det gamle skjemaet glemmes med en gang valgene skifter, også når de skifter tilbake senere.
  useEffect(() => setSkjema((s) => skjemaFor(s, identitet)), [identitet, setSkjema])

  /** Et annet virkestoff i feltet: formuleringen som var valgt for det forrige, gjelder ikke det nye. */
  const nyttVirkestoff = (forrige: string, settTekst: (t: string) => void, settForm: (f: Kildeformulering | '') => void) => (tekst: string) => {
    if (finnVirkestoff(valgene, tekst)?.nokkel !== finnVirkestoff(valgene, forrige)?.nokkel) settForm('')
    settTekst(tekst)
  }
  const status = useMemo(() => (valg ? tilgjengelighet(verktoy, valg, regelsett) : undefined), [verktoy, regelsett, valg?.fra.nokkel, valg?.fra.formulering, valg?.til?.nokkel, valg?.til?.formulering]) // eslint-disable-line react-hooks/exhaustive-deps
  // Klinisk innhold (en beregning eller fagtekst) vises bare når sperrene er lest, og bare for regler som ikke er sperret.
  const klinisk = status?.status === 'tilgjengelig' || status?.status === 'fagtekst'
  const aktive = sperrer.tilstand.status === 'klar' ? sperrer.tilstand.sperrer : []
  const regler = klinisk && status ? usperrede(aktive, verktoy, status.regler) : []
  const hele = verktoysperrer(aktive, verktoy)

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
          <legend>{verktoy.type === 'seponering' ? 'Legemidlet' : 'Byttet'}</legend>
          <div className="feltrad verktoyskjema__virkestoffer">
            <Virkestoffelt
              etikett={verktoy.type === 'seponering' ? 'Virkestoff pasienten bruker' : 'Bytte fra'}
              valg={valgene}
              tekst={fraTekst}
              formulering={fraForm}
              onTekst={nyttVirkestoff(fraTekst, setFraTekst, setFraForm)}
              onFormulering={setFraForm}
            />
            {verktoy.type === 'bytte' && (
              <Virkestoffelt etikett="Bytte til" valg={valgene} tekst={tilTekst} formulering={tilForm} onTekst={nyttVirkestoff(tilTekst, setTilTekst, setTilForm)} onFormulering={setTilForm} />
            )}
          </div>
        </fieldset>
      </form>

      {hele.length > 0 && <Sperremelding sperrer={hele} />}
      {!valg || !status ? (
        <p className="verktoyside__hint">
          {verktoy.type === 'seponering' ? 'Velg virkestoffet' : 'Velg begge virkestoffene'} for å se hva verktøyet kan beregne.
        </p>
      ) : !klinisk ? (
        <Statusvisning status={status} />
      ) : sperrer.tilstand.status === 'henter' ? (
        <p className="verktoyside__hint" role="status">
          <Lastesirkel /> Kontrollerer om verktøyet er tilgjengelig …
        </p>
      ) : sperrer.tilstand.status === 'feil' ? (
        <section className="verktoystatus" data-status="sperret" role="alert">
          <h2>Ingen doseplan eller fagtekst</h2>
          <p>{UKONTROLLERT}</p>
          <div className="verktoyskjema__handlinger">
            <Button variant="kant" onClick={() => void sperrer.hent().catch(() => undefined)}>
              Prøv igjen
            </Button>
          </div>
        </section>
      ) : regler.length === 0 ? (
        hele.length > 0 ? null : <Sperremelding sperrer={aktive.filter((x) => status.regler.some((r) => gjelder(x, verktoy, r)))} />
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
        />
      ) : (
        <Statusvisning status={{ ...status, regler }} />
      )}
    </>
  )
}

/** At det som ellers ville stått her, er midlertidig deaktivert: av hvem, når og hvorfor. */
function Sperremelding({ sperrer }: { sperrer: readonly Verktoysperre[] }) {
  return (
    <section className="verktoystatus" data-status="sperret" role="alert" aria-label="Midlertidig deaktivert">
      <h2>Midlertidig deaktivert</h2>
      <p>{SPERRET}</p>
      <ul className="verktoystatus__regler">
        {sperrer.map((s) => (
          <li key={s.id}>
            {OMFANGSTEKST[s.omfang]}
            {s.omfang === 'regel' && s.mal ? ` ${s.mal}` : ''}: {s.grunn}
            {s.satt_av && <span className="verktoystatus__merke">{`${s.satt_av}, ${tidspunkt(s.satt_kl)}`}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Det som står når verktøyet ikke kan beregne for valgene. */
function Statusvisning({ status }: { status: Tilgjengelighet }) {
  if (status.status === 'fagtekst') {
    return (
      <section className="verktoystatus" data-status="fagtekst" aria-label="Fagtekst">
        <h2>Bare fagtekst – ingen beregning</h2>
        {status.regler.map((r) => (
          <Fagtekst key={r.id} regel={r} />
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

/** OUSFARs egen tekst i en godkjent regel uten beregning, med kildehenvisningene. */
function Fagtekst({ regel }: { regel: Regel }) {
  const utsagn = [...regel.fortolkning.kildetro, ...regel.fortolkning.tilpasninger].map((u) => u.tekst)
  const kilder = kildeliste(regel)
  const godkjent = godkjenningstekst(regel)
  return (
    <article className="verktoyfagtekst">
      <h3>{regel.tittel}</h3>
      {godkjent && <p className="verktoyfagtekst__godkjenning">{godkjent}</p>}
      {utsagn.map((t) => (
        <p key={t}>{t}</p>
      ))}
      {regel.fortolkning.forutsetninger.length > 0 && (
        <ul>
          {regel.fortolkning.forutsetninger.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      {kilder.length > 0 && (
        <p className="verktoyfagtekst__kilder">
          Kilder:{' '}
          {kilder.map((k, i) => (
            <span key={k.url}>
              {i > 0 && '; '}
              <a href={k.url} target="_blank" rel="noreferrer">
                {k.tittel}
              </a>
            </span>
          ))}
        </p>
      )}
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
}) {
  const id = useId()
  const regel = regler.length === 1 ? regler[0] : regler.find((r) => r.id === skjema.regel)
  const [beregning, setBeregning] = useState<Beregning | null>(null)
  const [alternativer, setAlternativer] = useState<{ regel: string; valg: Record<string, Formalternativer> } | null>(null)
  const [feil, setFeil] = useState<string[]>([])
  const [, setTikk] = useState(0)
  // Bare den siste beregningen som er startet, får vise resultatet sitt; en eldre som blir ferdig senere, forkastes.
  const siste = useRef(0)
  const nokkel = JSON.stringify({ regel: regel?.id, valg, skjema })
  const gjeldende = beregning?.nokkel === nokkel ? beregning : null
  const formvalg = alternativer && alternativer.regel === regel?.id ? alternativer.valg : {}
  const justeringer = useMemo(() => (regel ? justeringsfelt(regel, skjema.svar) : []), [regel, skjema.svar])
  const spenn = regel && spennFor(regel, skjema)

  // En plan som står, kontrolleres mot klokken: den gjelder bare så lenge FEST-kopien er fersk og dagen den samme.
  const harPlan = gjeldende?.status === 'ferdig' && gjeldende.resultat.status === 'doseplan'
  useEffect(() => {
    if (!harPlan) return
    const t = window.setInterval(() => setTikk((x) => x + 1), KONTROLLER_PLANEN_MS)
    return () => window.clearInterval(t)
  }, [harPlan])

  const sett = <K extends keyof Planskjema>(felt: K, verdi: Planskjema[K]) => setSkjema((s) => ({ ...s, [felt]: verdi }))

  // `sk` er skjemaet slik det blir når beregningen startes av et valg i resultatet, før det er vist.
  async function beregn(sk: Planskjema = skjema) {
    if (!regel) return setFeil(['Velg strategien planen skal beregnes etter.'])
    const mangel = mangler(regel, sk)
    setFeil(mangel)
    if (mangel.length > 0) return
    const n = JSON.stringify({ regel: regel.id, valg, skjema: sk })
    const denne = ++siste.current
    setBeregning({ nokkel: n, status: 'henter' })
    try {
      if (!legemidler) throw new Error('Legemiddeldataene kan ikke leses her.')
      const utvalg = await legemidler.les(festIderFor(regel, valg))
      if (denne !== siste.current) return
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

  return (
    <>
      <p className="verktoystatus" data-status="tilgjengelig">
        Beregning er tilgjengelig: {regler.length === 1 ? 'regelen er' : 'reglene er'} klinisk godkjent, men bare for et avgrenset omfang. Utenfor det stopper beregningen og
        sier hvorfor.
      </p>
      <form
        className="verktoyskjema"
        aria-label="Inndata til doseplanen"
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

        {regel && (regel.bekreftelser.length > 0 || regel.unntak.length > 0 || (regel.sporsmal ?? []).length > 0) && (
          <fieldset className="feltgruppe">
            <legend>Forutsetninger for regelen</legend>
            {regel.bekreftelser.map((b) => (
              <label key={b.id} className="avkryssing avkryssing--felt">
                <input
                  type="checkbox"
                  checked={skjema.bekreftet.includes(b.id)}
                  onChange={(e) => sett('bekreftet', e.target.checked ? [...skjema.bekreftet, b.id] : skjema.bekreftet.filter((x) => x !== b.id))}
                />
                {b.tekst}
              </label>
            ))}
            {(regel.sporsmal ?? []).map((x) => (
              <JaNei key={x.id} navn={`${id}-${x.id}`} tekst={x.tekst} svar={['Ja', 'Nei']} verdi={skjema.svar[x.id]} onVelg={(v) => sett('svar', { ...skjema.svar, [x.id]: v })} />
            ))}
            {regel.unntak.map((u) => (
              <JaNei
                key={u.id}
                navn={`${id}-${u.id}`}
                tekst={u.tekst}
                svar={['Gjelder', 'Gjelder ikke']}
                verdi={skjema.pasientforhold[u.id]}
                onVelg={(v) => sett('pasientforhold', { ...skjema.pasientforhold, [u.id]: v })}
              />
            ))}
          </fieldset>
        )}

        {justeringer.length > 0 && (
          <fieldset className="feltgruppe">
            <legend>Tilpasning av planen</legend>
            <p className="feltgruppe__hjelp">Velg mindre trinn eller lengre tid innenfor det regelen tillater. Dagene er minstetider. Valget vises i planen.</p>
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
            {regel && kanKreveBegrunnelse(regel) && (
              <>
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
              </>
            )}
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

        <div className="verktoyskjema__handlinger">
          <Button type="submit" disabled={gjeldende?.status === 'henter'}>
            Beregn doseplan
          </Button>
        </div>
      </form>

      <Resultat
        beregning={gjeldende}
        utdatert={!!beregning && !gjeldende}
        verktoy={verktoy}
        regel={regel}
        startdato={skjema.startdato}
        klokke={klokke}
        valg={<Trinnvalgdel resultat={gjeldende?.status === 'ferdig' ? gjeldende.resultat : null} navn={forlopsnavn} onVelg={velgTrinn} />}
      />
    </>
  )
}

/** Et ja/nei-valg med to svar, f.eks. et unntak («Gjelder» / «Gjelder ikke») eller et spørsmål («Ja» / «Nei»). */
function JaNei({ navn, tekst, svar, verdi, onVelg }: { navn: string; tekst: string; svar: [string, string]; verdi: boolean | undefined; onVelg: (verdi: boolean) => void }) {
  return (
    <fieldset className="verktoyskjema__unntak">
      <legend>{tekst}</legend>
      <div className="avkryssinger">
        {([true, false] as const).map((v, i) => (
          <label key={String(v)} className="avkryssing">
            <input type="radio" name={navn} checked={verdi === v} onChange={() => onVelg(v)} />
            {svar[i]}
          </label>
        ))}
      </div>
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
  utdatert,
  verktoy,
  regel,
  startdato,
  klokke,
  valg,
}: {
  beregning: Beregning | null
  utdatert: boolean
  verktoy: Verktoy
  regel: Regel | undefined
  startdato: string
  klokke: () => Date
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
  const plan = regel && gjelderFortsatt(r, klokke()) ? planvisning(r, regel, startdato || undefined) : null
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
      <Doseplanvisning plan={plan} overskrift={verktoy.navn} />
    </>
  )
}
