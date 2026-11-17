import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import { forslagsadresse, stoffadresse, fortolkningsnokkel, type Forslagsfane } from '../../domain/rute'
import { hentForslag, hentMineForslag, svarPaForslag, trekkForslag } from '../../forslag/api'
import {
  BEHANDLERS_STATUSTEKST,
  GRENSER,
  HENDELSESTEKST,
  RESSURSTYPENAVN,
  STATUSVISNING,
  personnavn,
  type Forslag,
  type Forslagsrad,
  type Forslagsressurs,
  type Forslagsstatus,
} from '../../forslag/modell'
import { useLukkMedEscape } from '../../hooks/useLukkMedEscape'
import { Bevaringsomrade, useBevart } from '../../oppdatering/Bevaring'
import { fullTid, kortTid } from '../../traad/modell'
import { Button } from '../Button'
import { Lukkeknapp } from '../Lukkeknapp'
import { Merke, type Merketone } from '../Merke'
import { ToppmenyInnhold } from '../toppmeny/Toppmenykilde'
import { Behandlerhandlinger } from './behandling/Behandlerhandlinger'
import { Tilbehandling, TilbehandlingFane } from './behandling/Tilbehandling'
import { Tekstomrade } from './Tekstomrade'
import '../../styles/grupper.css'
import '../../styles/forslag.css'

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const melding = (aarsak: unknown) => (aarsak instanceof Error ? aarsak.message : UVENTET)

/** Fargen merket for statusen har. Betydningen står alltid i teksten. */
const MERKETONE: Readonly<Record<(typeof STATUSVISNING)[Forslagsstatus]['tone'], Merketone>> = {
  noytral: 'noytral',
  info: 'referanse',
  advarsel: 'alvorlig',
  ok: 'fritak',
  feil: 'toksisk',
}

/** Statusen som merke; `behandler` gir teksten slik den som behandler forslaget leser den. */
export function Statusmerke({ status, behandler = false }: { status: Forslagsstatus; behandler?: boolean }) {
  const { tekst, tone } = STATUSVISNING[status]
  return <Merke tone={MERKETONE[tone]}>{(behandler && BEHANDLERS_STATUSTEKST[status]) || tekst}</Merke>
}

/**
 * Hva forslaget gjelder, i ord: «Fagside · Bupropion · Halveringstid». Typen
 * gjentas ikke når stedet alt begynner med den («Fortolkning av Bupropion · …»).
 */
export function hvaGjelder(ressurs: Forslagsressurs, sted: string | null): string {
  const type = RESSURSTYPENAVN[ressurs.type] ?? 'Innhold'
  const hva = sted ?? ressurs.navn
  return hva.toLocaleLowerCase('nb').startsWith(type.toLocaleLowerCase('nb')) ? hva : `${type} · ${hva}`
}

/** Adressen til innholdet forslaget gjelder, når det har en. */
export function ressursadresse(ressurs: Forslagsressurs): string | null {
  if (ressurs.type === 'infoside' && ressurs.stoff) return stoffadresse(ressurs.stoff)
  if (ressurs.analyttkode) return `#/fortolkning/${fortolkningsnokkel(ressurs.analyttkode)}`
  return null
}

/**
 * Endringsforslagene (`#/forslag`): «Mine forslag» med statusen på hvert, og
 * fanen «Til behandling» for dem som behandler forslag (tråd C,
 * `behandling/`), eller ett forslag (`#/forslag/<ID>`) med tidslinjen og det
 * forslagsstilleren kan gjøre: svare og trekke det tilbake. Knappene er et
 * grensesnitt, ikke en tilgangskontroll: databasen kontrollerer hver handling
 * på nytt (docs/redaktorer-og-forslag.md).
 */
export function Forslagsside({ forslag, fane, onLukk }: { forslag?: string; fane?: Forslagsfane; onLukk: () => void }) {
  const overskrift = useId()
  useLukkMedEscape(onLukk)

  // En ny side begynner øverst; overskriften får fokus når den vises (`Hode`).
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [forslag, fane])

  return (
    <section className="gruppeside forslagsside" aria-labelledby={overskrift}>
      <ToppmenyInnhold spor="lukk">
        <Lukkeknapp onLukk={onLukk} />
      </ToppmenyInnhold>
      <Bevaringsomrade navn={forslag ? `forslag:${forslag}` : `forslag:${fane ?? 'mine'}`}>
        {forslag ? (
          <Forslagsvisning key={forslag} id={forslag} overskrift={overskrift} />
        ) : (
          <Oversikt fane={fane} overskrift={overskrift} />
        )}
      </Bevaringsomrade>
    </section>
  )
}

/**
 * Sidens hode. Overskriften får fokus når den vises og når tittelen skifter
 * (en annen fane), også når den først vises etter at forslaget er hentet.
 */
function Hode({ overskrift, overtittel, tittel, children }: { overskrift: string; overtittel: ReactNode; tittel: string; children?: ReactNode }) {
  useEffect(() => {
    document.getElementById(overskrift)?.focus({ preventScroll: true })
  }, [overskrift, tittel])
  return (
    <header className="gruppeside__hode">
      <p className="gruppeside__overtittel">{overtittel}</p>
      <h1 id={overskrift} className="gruppeside__tittel" tabIndex={-1}>
        {tittel}
      </h1>
      {children}
    </header>
  )
}

/** Fanene på oversikten. «Til behandling» står bare for dem som behandler forslag (`behandling/`). */
function Faner({ fane }: { fane?: Forslagsfane }) {
  return (
    <nav aria-label="Forslag">
      <ul className="gruppeside__faner">
        <li>
          <a className="gruppeside__fane" href={forslagsadresse()} aria-current={fane ? undefined : 'page'}>
            Mine forslag
          </a>
        </li>
        <TilbehandlingFane aktiv={fane === 'behandling'} />
      </ul>
    </nav>
  )
}

function Oversikt({ fane, overskrift }: { fane?: Forslagsfane; overskrift: string }) {
  return (
    <>
      <Hode overskrift={overskrift} overtittel="Endringsforslag" tittel={fane === 'behandling' ? 'Til behandling' : 'Mine forslag'}>
        <Faner fane={fane} />
      </Hode>
      {fane === 'behandling' ? <Tilbehandling /> : <MineForslag />}
    </>
  )
}

/** Henting med lasting og feil, og en funksjon som henter på nytt. */
export function useHentet<T>(hent: () => Promise<T>) {
  const [tilstand, setTilstand] = useState<{ status: 'laster' } | { status: 'feil'; melding: string } | { status: 'klar'; data: T }>({
    status: 'laster',
  })
  const oppfrisk = useCallback(async () => {
    try {
      setTilstand({ status: 'klar', data: await hent() })
    } catch (aarsak) {
      setTilstand({ status: 'feil', melding: melding(aarsak) })
    }
  }, [hent])
  useEffect(() => {
    void oppfrisk()
  }, [oppfrisk])
  return { tilstand, oppfrisk }
}

function MineForslag() {
  const { tilstand } = useHentet(hentMineForslag)
  if (tilstand.status === 'laster') return <p className="gruppeside__hint">Henter forslagene …</p>
  if (tilstand.status === 'feil') return <p className="skjemafeil" role="alert">{tilstand.melding}</p>
  if (tilstand.data.length === 0) {
    return (
      <p className="gruppeside__hint">
        Du har ikke sendt noen forslag ennå. Velg «Foreslå endring» på en fagside eller i fortolkningen for å foreslå en
        endring i innholdet.
      </p>
    )
  }
  const venter = tilstand.data.filter((f) => f.venter_pa_meg).length
  return (
    <>
      {venter > 0 && (
        <p className="gruppeside__kvittering" role="status">
          {venter === 1 ? 'Ett forslag venter på svar fra deg.' : `${venter} forslag venter på svar fra deg.`}
        </p>
      )}
      <ul className="forslagsliste">
        {tilstand.data.map((f) => (
          <li key={f.id}>
            <Forslagslenke rad={f} />
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * Ett forslag i en liste: hva det gjelder, statusen og begynnelsen av
 * forslaget. Også til fanen «Til behandling», med `behandler` og det fanen
 * vil si i tillegg (`children`, i linjen nederst).
 */
export function Forslagslenke({
  rad,
  behandler,
  children,
}: {
  rad: Pick<Forslagsrad, 'id' | 'status' | 'ressurs' | 'sted' | 'sammendrag' | 'oppdatert_kl'>
  behandler?: boolean
  children?: ReactNode
}) {
  return (
    <a className="forslagsrad" href={forslagsadresse(rad.id)}>
      <span className="forslagsrad__topp">
        <span className="forslagsrad__hva">{hvaGjelder(rad.ressurs, rad.sted)}</span>
        <Statusmerke status={rad.status} behandler={behandler} />
      </span>
      <span className="forslagsrad__tekst">{rad.sammendrag}</span>
      <span className="forslagsrad__meta">
        Sist endret {kortTid(rad.oppdatert_kl)}
        {children}
      </span>
    </a>
  )
}

function Forslagsvisning({ id, overskrift }: { id: string; overskrift: string }) {
  const hent = useCallback(() => hentForslag(id), [id])
  const { tilstand, oppfrisk } = useHentet(hent)
  if (tilstand.status === 'laster') return <p className="gruppeside__hint">Henter forslaget …</p>
  if (tilstand.status === 'feil') {
    return (
      <>
        <Hode overskrift={overskrift} overtittel={<a href={forslagsadresse()}>Mine forslag</a>} tittel="Forslaget" />
        <p className="skjemafeil" role="alert">
          {tilstand.melding}
        </p>
      </>
    )
  }
  const f = tilstand.data
  const lenke = ressursadresse(f.ressurs)
  return (
    <>
      <Hode
        overskrift={overskrift}
        overtittel={<a href={forslagsadresse(undefined, f.er_mitt ? undefined : 'behandling')}>{f.er_mitt ? 'Mine forslag' : 'Til behandling'}</a>}
        tittel={hvaGjelder(f.ressurs, f.sted)}
      >
        <p className="gruppeside__meta">
          <Statusmerke status={f.status} behandler={!f.er_mitt} />
          <span>
            Sendt {kortTid(f.opprettet_kl)}
            {!f.er_mitt && f.stilt_av ? ` av ${personnavn(f.stilt_av, 'en bruker')}` : ''}
          </span>
          {lenke && <a href={lenke}>Gå til {f.ressurs.type === 'infoside' ? 'fagsiden' : 'fortolkningen'}</a>}
        </p>
      </Hode>
      <article className="forslagsvisning">
        {f.utdrag && (
          <section className="forslagsvisning__del">
            <h2 className="gruppeside__deltittel">Slik sto det</h2>
            <blockquote className="forslagsvisning__sitat">{f.utdrag}</blockquote>
          </section>
        )}
        <section className="forslagsvisning__del">
          <h2 className="gruppeside__deltittel">Forslaget</h2>
          <p className="forslagsvisning__tekst">{f.forslag}</p>
        </section>
        <section className="forslagsvisning__del">
          <h2 className="gruppeside__deltittel">Begrunnelsen</h2>
          <p className="forslagsvisning__tekst">{f.begrunnelse}</p>
        </section>
        {f.kilder.length > 0 && (
          <section className="forslagsvisning__del">
            <h2 className="gruppeside__deltittel">Kilder</h2>
            <ol className="forslagsvisning__kilder">
              {f.kilder.map((k, i) => (
                <li key={i}>
                  {[k.tekst, k.referansetittel].filter(Boolean).join(' · ')}
                  {k.lenke && (
                    <>
                      {(k.tekst || k.referansetittel) && ' · '}
                      <a href={k.lenke} target="_blank" rel="noreferrer noopener">
                        {k.lenke}
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
        {f.vedtak?.begrunnelse && (
          <section className="forslagsvisning__del">
            <h2 className="gruppeside__deltittel">{f.status === 'avvist' ? 'Hvorfor det ble avvist' : 'Behandlerens begrunnelse'}</h2>
            <p className="forslagsvisning__tekst">{f.vedtak.begrunnelse}</p>
          </section>
        )}
        {f.status === 'godkjent' && (
          <p className="gruppeside__hint">
            Et godkjent forslag er ikke publisert ennå. Det arbeides inn i utkastet og publiseres etter den vanlige kontrollen.
          </p>
        )}
        <Behandlerhandlinger forslag={f} oppfrisk={oppfrisk} />
        <Tidslinje forslag={f} />
        <Forslagsstillerhandlinger forslag={f} oppfrisk={oppfrisk} />
      </article>
    </>
  )
}

function Tidslinje({ forslag }: { forslag: Forslag }) {
  return (
    <section className="forslagsvisning__del">
      <h2 className="gruppeside__deltittel">Historikk</h2>
      <ol className="tidslinje">
        {forslag.hendelser.map((h) => (
          <li key={h.id} className="tidslinje__hendelse">
            <p className="tidslinje__hvem">
              <b>{personnavn(h.utfort_av, h.art === 'opprettet' || h.art === 'presisering' ? 'Forslagsstilleren' : 'En redaktør')}</b>{' '}
              {HENDELSESTEKST[h.art].toLowerCase()} · <time dateTime={h.utfort_kl} title={fullTid(h.utfort_kl)}>{kortTid(h.utfort_kl)}</time>
            </p>
            {h.tekst && <p className="tidslinje__tekst">{h.tekst}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Det forslagsstilleren kan gjøre mens forslaget er åpent: svare (eller kommentere) og trekke det tilbake. */
function Forslagsstillerhandlinger({ forslag, oppfrisk }: { forslag: Forslag; oppfrisk: () => Promise<void> }) {
  const [svar, setSvar] = useBevart('svar', '')
  const [trekker, setTrekker] = useBevart('trekker', false)
  const [grunn, setGrunn] = useBevart('trekkgrunn', '')
  const [opptatt, setOpptatt] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const [kvittering, setKvittering] = useState<string | null>(null)
  // Kvitteringen står igjen når handlingen tok bort det som var å gjøre (et forslag som er trukket).
  if (!forslag.er_mitt || (!forslag.kan_svare && !forslag.kan_trekke && !kvittering)) return null
  const venter = forslag.status === 'venter_pa_forslagsstiller'

  const utfor = async (handling: () => Promise<void>, ferdig: string) => {
    setOpptatt(true)
    setFeil(null)
    setKvittering(null)
    try {
      await handling()
      setKvittering(ferdig)
      await oppfrisk()
    } catch (aarsak) {
      setFeil(melding(aarsak))
    } finally {
      setOpptatt(false)
    }
  }

  return (
    <section className="forslagsvisning__del" aria-label="Det du kan gjøre">
      {kvittering && (
        <p className="gruppeside__kvittering" role="status">
          {kvittering}
        </p>
      )}
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      {forslag.kan_svare && (
        <form
          className="gruppeside__skjema forslagsskjema"
          onSubmit={(e) => {
            e.preventDefault()
            if (!svar.trim()) {
              setFeil('Skriv et svar.')
              return
            }
            void utfor(async () => {
              await svarPaForslag(forslag.id, svar.trim())
              setSvar('')
            }, venter ? 'Svaret er sendt, og forslaget er tilbake til behandling.' : 'Kommentaren er lagt til.')
          }}
        >
          <Tekstomrade
            merkelapp={venter ? 'Svar på spørsmålet' : 'Legg til en kommentar'}
            verdi={svar}
            onEndre={setSvar}
            maks={GRENSER.svar}
            pasientregel
          />
          <div className="gruppeside__handlinger">
            <Button type="submit" className="knapp--kompakt" disabled={opptatt}>
              {venter ? 'Send svaret' : 'Legg til'}
            </Button>
          </div>
        </form>
      )}
      {forslag.kan_trekke &&
        (trekker ? (
          <form
            className="gruppeside__skjema forslagsskjema"
            onSubmit={(e) => {
              e.preventDefault()
              void utfor(async () => {
                await trekkForslag(forslag.id, grunn)
                setTrekker(false)
                setGrunn('')
              }, 'Forslaget er trukket tilbake.')
            }}
          >
            <Tekstomrade merkelapp="Hvorfor trekker du forslaget? (valgfritt)" verdi={grunn} onEndre={setGrunn} maks={GRENSER.svar} rader={2} />
            <div className="gruppeside__handlinger">
              <Button variant="subtle" onClick={() => setTrekker(false)}>
                Avbryt
              </Button>
              <Button type="submit" className="knapp--kompakt" disabled={opptatt}>
                Trekk forslaget
              </Button>
            </div>
          </form>
        ) : (
          <div className="gruppeside__handlinger">
            <Button variant="kant" className="knapp--kompakt" onClick={() => setTrekker(true)}>
              Trekk tilbake
            </Button>
          </div>
        ))}
    </section>
  )
}
