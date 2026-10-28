import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLukkMedEscape } from '../../hooks/useLukkMedEscape'
import type { Legemiddelleser } from '../../legemiddeldata/lesing'
import { Bevaringsomrade, useBevart, type Bevaringsform } from '../../oppdatering/Bevaring'
import { verktoyadresse } from '../../domain/rute'
import {
  beregnPlan,
  festIderFor,
  formvalgFor,
  gjelderFortsatt,
  justeringsfelt,
  mangler,
  medRegel,
  skjemaFor,
  TOMT_SKJEMA,
  trengerMaldose,
  valgidentitet,
  type Planskjema,
} from '../../verktoy/doseplan'
import type { Kildeformulering } from '../../verktoy/kartlegging'
import type { Doseplanresultat, Formalternativer } from '../../verktoy/motor/plan'
import { kildeliste, planvisning } from '../../verktoy/planvisning'
import { finnVirkestoff, KARTLEGGING, VERKTOY, verktoyFor, virkestoffvalg, type Verktoy } from '../../verktoy/register'
import type { Regel, Regelsett } from '../../verktoy/regler/modell'
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
  onLukk: () => void
  /** Regelsettet; appens eget når det ikke er gitt. */
  regelsett?: Regelsett
  /** Klokken; nå når den ikke er gitt. */
  klokke?: () => Date
}

const naa = () => new Date()

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
export function Verktoyside({ verktoy: id, legemidler, onLukk, regelsett = REGELSETT, klokke = naa }: VerktoysideProps) {
  const overskrift = useId()
  const verktoy = verktoyFor(id)
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
          <Verktoyskjema key={verktoy.id} verktoy={verktoy} overskrift={overskrift} legemidler={legemidler} regelsett={regelsett} klokke={klokke} />
        </Bevaringsomrade>
      ) : (
        <Oversikt overskrift={overskrift} ukjent={id !== undefined} regelsett={regelsett} />
      )}
    </section>
  )
}

/* --- Oversikten -------------------------------------------------------------- */

function Oversikt({ overskrift, ukjent, regelsett }: { overskrift: string; ukjent: boolean; regelsett: Regelsett }) {
  const status = VERKTOY.map((v) => ({ verktoy: v, ...regeloversikt(v, regelsett) }))
  const ingen = status.every((s) => s.tilgjengelige === 0)
  return (
    <>
      <header className="verktoyside__hode">
        <p className="verktoyside__overtittel">OUSFAR Verktøy</p>
        <h1 id={overskrift} className="verktoyside__tittel" tabIndex={-1}>
          Verktøy
        </h1>
        <p className="verktoyside__ingress">
          Doseplaner for nedtrapping og bytte, beregnet med preparatene i FEST etter klinisk godkjente regler.
        </p>
      </header>
      {ukjent && (
        <p className="sidevarsel" role="alert">
          Fant ikke verktøyet adressen peker på. Velg et av verktøyene under.
        </p>
      )}
      {ingen && (
        <p className="verktoystatus" data-status="til_kontroll">
          Ingen beregninger er tilgjengelige ennå: reglene venter på faglig kontroll og klinisk godkjenning.
        </p>
      )}
      <ul className="verktoykort">
        {status.map(({ verktoy, tilgjengelige, tilKontroll }) => (
          <li key={verktoy.id}>
            <a className="verktoykort__lenke" href={verktoyadresse(verktoy.id)}>
              <Ikon navn={verktoy.ikon} className="verktoykort__ikon" />
              <span className="verktoykort__tekst">
                <span className="verktoykort__navn">{verktoy.navn}</span>
                <span className="verktoykort__beskrivelse">{verktoy.beskrivelse}</span>
                <span className="verktoykort__status">
                  {tilgjengelige > 0
                    ? `${tilgjengelige} ${tilgjengelige === 1 ? 'regel kan' : 'regler kan'} beregnes`
                    : 'Ingen beregning tilgjengelig ennå'}
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
  les: (x) => (x && typeof x === 'object' && !Array.isArray(x) ? { ...TOMT_SKJEMA, ...(x as Partial<Planskjema>) } : undefined),
}

type Beregning =
  | { nokkel: string; status: 'henter' }
  | { nokkel: string; status: 'feil'; melding: string }
  | { nokkel: string; status: 'formvalg' }
  | { nokkel: string; status: 'ferdig'; resultat: Doseplanresultat }

const navnPaa = (nokkel: string | undefined) => KARTLEGGING.virkestoffer.find((v) => v.nokkel === nokkel)?.navn ?? nokkel ?? ''

function Verktoyskjema({
  verktoy,
  overskrift,
  legemidler,
  regelsett,
  klokke,
}: {
  verktoy: Verktoy
  overskrift: string
  legemidler: Pick<Legemiddelleser, 'les'> | undefined
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

      {!valg || !status ? (
        <p className="verktoyside__hint">
          {verktoy.type === 'seponering' ? 'Velg virkestoffet' : 'Velg begge virkestoffene'} for å se hva verktøyet kan beregne.
        </p>
      ) : status.status === 'tilgjengelig' ? (
        <Beregningsdel
          key={JSON.stringify(valg)}
          verktoy={verktoy}
          valg={valg}
          regler={status.regler}
          skjema={skjema}
          setSkjema={settSkjema}
          legemidler={legemidler}
          regelsett={regelsett}
          klokke={klokke}
        />
      ) : (
        <Statusvisning status={status} />
      )}
    </>
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
  return (
    <section className="verktoystatus" data-status={status.status} role="status">
      <h2>{status.status === 'til_kontroll' ? 'Beregning er ikke tilgjengelig' : 'Ikke støttet'}</h2>
      {status.grunner.map((g) => (
        <p key={g}>{g}</p>
      ))}
      {status.status === 'til_kontroll' && (
        <>
          <p>OUSFAR viser ingen doseplan før regelen er kontrollert og klinisk godkjent.</p>
          <ul className="verktoystatus__regler">
            {status.regler.map((r) => (
              <li key={r.id}>
                {r.tittel} <span className="verktoystatus__merke">til faglig kontroll</span>
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
  return (
    <article className="verktoyfagtekst">
      <h3>{regel.tittel}</h3>
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
  regelsett,
  klokke,
}: {
  verktoy: Verktoy
  valg: Verktoyvalg
  regler: Regel[]
  skjema: Planskjema
  setSkjema: (endre: (s: Planskjema) => Planskjema) => void
  legemidler: Pick<Legemiddelleser, 'les'> | undefined
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
  const justeringer = useMemo(() => (regel ? justeringsfelt(regel) : []), [regel])

  // En plan som står, kontrolleres mot klokken: den gjelder bare så lenge FEST-kopien er fersk og dagen den samme.
  const harPlan = gjeldende?.status === 'ferdig' && gjeldende.resultat.status === 'doseplan'
  useEffect(() => {
    if (!harPlan) return
    const t = window.setInterval(() => setTikk((x) => x + 1), KONTROLLER_PLANEN_MS)
    return () => window.clearInterval(t)
  }, [harPlan])

  const sett = <K extends keyof Planskjema>(felt: K, verdi: Planskjema[K]) => setSkjema((s) => ({ ...s, [felt]: verdi }))

  async function beregn() {
    if (!regel) return setFeil(['Velg strategien planen skal beregnes etter.'])
    const mangel = mangler(regel, skjema)
    setFeil(mangel)
    if (mangel.length > 0) return
    const denne = ++siste.current
    setBeregning({ nokkel, status: 'henter' })
    try {
      if (!legemidler) throw new Error('Legemiddeldataene kan ikke leses her.')
      const utvalg = await legemidler.les(festIderFor(regel, valg))
      if (denne !== siste.current) return
      const tid = klokke()
      const alt = formvalgFor(regel, valg, skjema, utvalg, tid)
      setAlternativer({ regel: regel.id, valg: alt })
      const uvalgt = Object.entries(alt).some(
        ([f, a]) => (a.klasser.length > 1 && !skjema.formvalg[f]?.klasse) || (a.legemiddelformer.length > 1 && !skjema.formvalg[f]?.legemiddelform),
      )
      if (uvalgt) return setBeregning({ nokkel, status: 'formvalg' })
      setBeregning({ nokkel, status: 'ferdig', resultat: beregnPlan(regel, valg, skjema, utvalg, tid, regelsett) })
    } catch (e) {
      if (denne !== siste.current) return
      setBeregning({ nokkel, status: 'feil', melding: e instanceof Error ? e.message : String(e) })
    }
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
        Beregningen er tilgjengelig: {regler.length === 1 ? 'regelen er' : 'reglene er'} klinisk godkjent.
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
            {regel && trengerMaldose(regel) && (
              <label className="skjemafelt">
                <span>
                  Måldose av {tilNavn.toLowerCase()}
                  {tilAdm} (mg per døgn)
                </span>
                <Tallfelt value={skjema.maldose} onChange={(v) => sett('maldose', v)} />
              </label>
            )}
            <label className="skjemafelt">
              <span>Startdato (valgfri)</span>
              <input className="inndatafelt" type="date" value={skjema.startdato} onChange={(e) => sett('startdato', e.target.value)} />
            </label>
          </div>
          {regel && trengerMaldose(regel) && <p className="feltgruppe__hjelp">Måldosen fylles aldri inn av verktøyet; den må skrives inn.</p>}
          {!skjema.startdato && <p className="feltgruppe__hjelp">Uten startdato står planen med dagnummer.</p>}
        </fieldset>

        {regel && (regel.bekreftelser.length > 0 || regel.unntak.length > 0) && (
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
            {regel.unntak.map((u) => (
              <fieldset key={u.id} className="verktoyskjema__unntak">
                <legend>{u.tekst}</legend>
                <div className="avkryssinger">
                  {[
                    [true, 'Gjelder'],
                    [false, 'Gjelder ikke'],
                  ].map(([verdi, tekst]) => (
                    <label key={String(verdi)} className="avkryssing">
                      <input
                        type="radio"
                        name={`${id}-${u.id}`}
                        checked={skjema.pasientforhold[u.id] === verdi}
                        onChange={() => sett('pasientforhold', { ...skjema.pasientforhold, [u.id]: verdi as boolean })}
                      />
                      {tekst}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </fieldset>
        )}

        {justeringer.length > 0 && (
          <fieldset className="feltgruppe">
            <legend>Tilpasning av planen (valgfri)</legend>
            <p className="feltgruppe__hjelp">Velg mindre trinn eller lengre tid innenfor det regelen tillater. Valget vises i planen.</p>
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

      <Resultat beregning={gjeldende} utdatert={!!beregning && !gjeldende} verktoy={verktoy} regel={regel} startdato={skjema.startdato} klokke={klokke} />
    </>
  )
}

/** Resultatet av siste beregning for inndataene slik de står. */
function Resultat({
  beregning,
  utdatert,
  verktoy,
  regel,
  startdato,
  klokke,
}: {
  beregning: Beregning | null
  utdatert: boolean
  verktoy: Verktoy
  regel: Regel | undefined
  startdato: string
  klokke: () => Date
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
        Fikk ikke hentet preparatene fra FEST. {beregning.melding}
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
  return <Doseplanvisning plan={plan} overskrift={verktoy.navn} />
}
