import { useCallback, useEffect, useId, useState } from 'react'
import { tidspunkt } from '../../faginnhold/historikk'
import { useBevart } from '../../oppdatering/Bevaring'
import {
  gjenstaende,
  sorterSaker,
  TILTAKSTEKST,
  underVurdering,
  UTFALLTEKST,
  VALGTITTEL,
  type Beslutningsvalg,
  type Beslutning,
  type Berortanbefaling,
  type Fagsak,
  type Fagsaklager,
  type Redaktoroversikt,
  type Saksfase,
  type Tekniskspor,
} from '../../verktoy/overvaking/fagsak'
import { REGELSETTENE } from '../../verktoy/tilgjengelighet'
import { Button } from '../Button'
import { Details } from '../Details'
import { Merke } from '../Merke'

const REGLER = REGELSETTENE.flatMap((s) => s.regler)

/** Anbefalingen med navnet klinikerne kjenner, aldri regelens ID. */
const anbefalingsnavn = (b: Pick<Berortanbefaling, 'regel' | 'versjon'>) => {
  const tittel = REGLER.find((r) => r.id === b.regel)?.tittel
  return tittel ? `${tittel} (godkjent versjon ${b.versjon})` : `En godkjent anbefaling som ikke finnes i denne versjonen av appen (versjon ${b.versjon})`
}

const TEKNISK: Record<Tekniskspor, string> = {
  normal: 'Kildekontrollen går som normalt.',
  oppfolging: 'Noen kilder følges opp teknisk. Det krever ingenting av deg, og du får en sak her hvis det viser seg å ha faglig betydning.',
  ukjent: 'Det er ukjent om siste kildekontroll gikk som den skulle. Det følges opp teknisk; du får en sak her hvis noe har faglig betydning.',
}

const FASETEKST: Record<Saksfase, string> = { beslutning: 'Beslutning', oppfolging: 'Oppfølging', avsluttet: 'Avsluttet' }
const FASENE = Object.keys(FASETEKST) as Saksfase[]

/** Hvor saken står i forløpet beslutning → oppfølging → avsluttet. */
function Forlop({ fase }: { fase: Saksfase }) {
  const her = FASENE.indexOf(fase)
  return (
    <ol className="fagsak__forlop" aria-label="Hvor saken står">
      {FASENE.map((f, i) => (
        <li key={f} className={i < her ? 'fagsak__trinn--forbi' : i === her ? 'fagsak__trinn--her' : undefined} aria-current={i === her ? 'step' : undefined}>
          {FASETEKST[f]}
        </li>
      ))}
    </ol>
  )
}

function Hode({ s, tittelId }: { s: Fagsak; tittelId?: string }) {
  return (
    <header className="fagsak__hode">
      <p className="fagsak__merker">
        {s.alvor === 'sikkerhet' ? <Merke tone="alvorlig">Sikkerhet</Merke> : <Merke tone="referanse">Faglig spørsmål</Merke>}
        {s.prove && <Merke tone="flate">Prøve uten klinisk betydning</Merke>}
      </p>
      <h4 id={tittelId} className="fagsak__tittel">
        {s.tittel}
      </h4>
      <Forlop fase={s.fase} />
    </header>
  )
}

/** Hvordan verktøyet virker nå; først i saken, fordi det er det som betyr noe for pasientene. */
function StatusNa({ s }: { s: Fagsak }) {
  return (
    <p className={`fagsak__na${s.alvor === 'sikkerhet' ? ' fagsak__na--sikkerhet' : ''}`}>
      <span className="fagsak__naetikett">Nå: </span>
      {s.status_na}
    </p>
  )
}

/** Hva som er endret, hva det berører, og hvorfor det betyr noe. */
function Grunnlag({ s }: { s: Fagsak }) {
  return (
    <dl className="fagsak__grunnlag">
      <dt>Hva er endret?</dt>
      <dd>
        <p>{s.endring}</p>
        <p className="felt__hjelp">
          Kilde:{' '}
          {s.kilde.lenke ? (
            <a href={s.kilde.lenke} target="_blank" rel="noreferrer">
              {s.kilde.navn}
            </a>
          ) : (
            s.kilde.navn
          )}
          {s.kilde.sammenlignet_kl && `, sammenlignet ${tidspunkt(s.kilde.sammenlignet_kl)}`}.
        </p>
      </dd>
      <dt>Hvilke anbefalinger berøres?</dt>
      <dd>
        {s.berorte.length === 0 ? (
          <p>Ingen godkjent anbefaling i verktøyene.</p>
        ) : (
          <ul>
            {s.berorte.map((b) => (
              <li key={`${b.regel}-${b.versjon}`}>
                <strong>{anbefalingsnavn(b)}</strong>
                {b.sperret && (
                  <>
                    {' '}
                    <Merke tone="alvorlig">Sperret med nødstoppen</Merke>
                  </>
                )}
                : {b.hva}
              </li>
            ))}
          </ul>
        )}
      </dd>
      <dt>Hvorfor er dette faglig relevant?</dt>
      <dd>
        <p>{s.relevans}</p>
      </dd>
    </dl>
  )
}

/** Det som skjer etter valget: straks, deretter, og for klinikerne imens. */
function Virkning({ s, valg }: { s: Fagsak; valg: Beslutningsvalg }) {
  const v = s.valg.find((x) => x.valg === valg)!
  return (
    <div className="fagsak__virkning" aria-live="polite">
      <p className="fagsak__virkningstittel">Hvis du velger «{VALGTITTEL[valg]}»</p>
      <dl>
        <dt>Skjer med en gang</dt>
        <dd>{v.na.length === 0 ? <p>Ingenting endres med en gang.</p> : <ul>{v.na.map((t) => <li key={t}>{t}</li>)}</ul>}</dd>
        <dt>Må deretter gjøres og kontrolleres</dt>
        <dd>{v.deretter.length === 0 ? <p>Ingenting mer; saken avsluttes når beslutningen er registrert og kontrollert.</p> : <ul>{v.deretter.map((t) => <li key={t}>{t}</li>)}</ul>}</dd>
        <dt>For klinikerne i mellomtiden</dt>
        <dd>
          <p>{v.verktoyet}</p>
        </dd>
      </dl>
    </div>
  )
}

interface Utkast {
  valg: Beslutningsvalg | null
  merknad: string
  /** Utgaven av saken valget ble tatt for. */
  versjon: number
}

/** En sak som venter på en beslutning: grunnlaget, anbefalingen, valgene og hva hvert av dem vil gjøre. */
function Beslutningskort({
  s,
  utkast,
  setUtkast,
  arbeider,
  onBeslutt,
  onNodstopp,
}: {
  s: Fagsak
  utkast: Utkast
  setUtkast: (u: Utkast) => void
  arbeider: boolean
  onBeslutt: () => void
  onNodstopp?: () => void
}) {
  const id = useId()
  if (underVurdering(s)) return <Vurderingskort s={s} onNodstopp={onNodstopp} />
  const anbefalt = s.anbefaling!.valg
  return (
    <article className="fagsak" aria-labelledby={`${id}-t`}>
      <Hode s={s} tittelId={`${id}-t`} />
      <StatusNa s={s} />
      {s.beslutning?.valg === 'utsett' && (
        <p className="felt__hjelp">
          Utsatt {tidspunkt(s.beslutning.kl)} av {s.beslutning.av}
          {s.beslutning.merknad ? `: ${s.beslutning.merknad}` : ''}.
        </p>
      )}
      <TidligereISaken s={s} />
      <Grunnlag s={s} />

      <div className="fagsak__anbefaling">
        <p className="fagsak__virkningstittel">Anbefalt beslutning: {VALGTITTEL[anbefalt]}</p>
        <p>{s.anbefaling!.begrunnelse}</p>
        <p className="felt__hjelp">Vurdert av {s.anbefaling!.av}.</p>
      </div>

      <fieldset className="fagsak__valg">
        <legend>Din beslutning</legend>
        {s.valg.map((v) => (
          <label key={v.valg} className={`fagsak__valgrad${utkast.valg === v.valg ? ' fagsak__valgrad--valgt' : ''}`}>
            <input type="radio" name={`${id}-valg`} value={v.valg} checked={utkast.valg === v.valg} onChange={() => setUtkast({ ...utkast, valg: v.valg })} />
            <span className="fagsak__valgtekst">
              <span className="fagsak__valgnavn">
                {VALGTITTEL[v.valg]}
                {v.valg === anbefalt && <Merke tone="aksent">Anbefalt</Merke>}
              </span>
              <span className="felt__hjelp">{v.verktoyet}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {utkast.valg && (
        <>
          <Virkning s={s} valg={utkast.valg} />
          <label className="felt">
            <span className="felt__merkelapp">Merknad (valgfri)</span>
            <textarea className="felt__inndata" rows={2} maxLength={2000} value={utkast.merknad} onChange={(e) => setUtkast({ ...utkast, merknad: e.target.value })} />
          </label>
          <div className="autoerstatt__knapper">
            <Button disabled={arbeider} onClick={onBeslutt}>
              Registrer beslutningen
            </Button>
          </div>
        </>
      )}
    </article>
  )
}

/**
 * En sikkerhetssak der spørsmålet ennå vurderes faglig: ingenting å velge
 * ennå, men redaktøren skal vite om den med en gang og kan bruke nødstoppen.
 */
function Vurderingskort({ s, onNodstopp }: { s: Fagsak; onNodstopp?: () => void }) {
  const id = useId()
  return (
    <article className="fagsak" aria-labelledby={`${id}-t`}>
      <Hode s={s} tittelId={`${id}-t`} />
      <StatusNa s={s} />
      <TidligereISaken s={s} />
      <Grunnlag s={s} />
      <div className="fagsak__anbefaling fagsak__anbefaling--vurderes">
        <p className="fagsak__virkningstittel">Sikkerhetsproblem under vurdering</p>
        <p>
          Problemet vurderes faglig nå, og du får et konkret spørsmål med en anbefaling her når vurderingen er ferdig. Mener du at en plan kan være uforsvarlig før det, kan du
          deaktivere den berørte regelen med nødstoppen. Andre anbefalinger virker som før.
        </p>
      </div>
      {onNodstopp && (
        <div className="autoerstatt__knapper">
          <Button variant="kant" onClick={onNodstopp}>
            Åpne nødstoppen
          </Button>
        </div>
      )}
    </article>
  )
}

function Beslutningslinje({ b }: { b: Beslutning | null }) {
  if (!b) return null
  return (
    <p className="fagsak__beslutning">
      {b.valg === 'utsett' ? 'Utsatt' : 'Besluttet'} {tidspunkt(b.kl)} av {b.av}: <strong>{VALGTITTEL[b.valg]}</strong>
      {b.merknad ? `. ${b.merknad}` : ''}
    </p>
  )
}

/** Et nytt spørsmål etter tidligere beslutninger: det som alt er besluttet og gjort, står med. */
function TidligereISaken({ s }: { s: Pick<Fagsak, 'tidligere' | 'tiltak'> }) {
  if (s.tidligere.length === 0 && s.tiltak.length === 0) return null
  return (
    <div className="fagsak__tidligere">
      <p className="fagsak__virkningstittel">Tidligere i saken</p>
      <Tidligere s={s} />
      {s.tiltak.length > 0 && <Tiltaksliste s={s} />}
    </div>
  )
}

/** De tidligere beslutningene i saken, eldste først; den gjeldende står for seg. */
function Tidligere({ s }: { s: Pick<Fagsak, 'tidligere'> }) {
  return (
    <>
      {s.tidligere.map((b, i) => (
        <Beslutningslinje key={i} b={b} />
      ))}
    </>
  )
}

/** Tiltakene etter en beslutning, med hvor langt hvert av dem har kommet. */
function Tiltaksliste({ s }: { s: Pick<Fagsak, 'tiltak'> }) {
  return (
    <ul className="fagsak__tiltak">
      {s.tiltak.map((t, i) => (
        <li key={i} className={`fagsak__tiltak--${t.status}`}>
          <span className="fagsak__tiltakstatus">{TILTAKSTEKST[t.status]}</span>
          <span>
            {t.tekst}
            {t.lenke && (
              <>
                {' '}
                <a href={t.lenke} target="_blank" rel="noreferrer">
                  Se endringen
                </a>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** En sak der beslutningen er tatt, og tiltakene ennå ikke er utført og kontrollert. */
function Oppfolgingskort({ s }: { s: Fagsak }) {
  const id = useId()
  return (
    <article className="fagsak" aria-labelledby={`${id}-t`}>
      <Hode s={s} tittelId={`${id}-t`} />
      <StatusNa s={s} />
      <Tidligere s={s} />
      <Beslutningslinje b={s.beslutning} />
      <Tiltaksliste s={s} />
      <p className="felt__hjelp">
        {gjenstaende(s).length === 0
          ? 'Alle tiltakene er utført og kontrollert; saken avsluttes ved neste kontroll.'
          : 'Saken avsluttes når alle tiltakene er utført og kontrollert. Du trenger ikke gjøre noe mer.'}
      </p>
    </article>
  )
}

function Avsluttet({ s }: { s: Fagsak }) {
  return (
    <li className="autoerstatt__rad autoerstatt__rad--skjema">
      <p className="verktoysperrer__mal">
        {s.tittel}
        {s.prove && ' (prøve)'}
      </p>
      <Tidligere s={s} />
      <Beslutningslinje b={s.beslutning} />
      <p className="felt__hjelp">
        Avsluttet {tidspunkt(s.avsluttet!.kl)}: {UTFALLTEKST[s.avsluttet!.utfall]}.
      </p>
    </li>
  )
}

/**
 * Utkastet som gjelder saken slik den er nå. Er saken endret siden valget ble
 * tatt (et annet spørsmål eller andre valg), gjelder ikke valget lenger og må
 * tas på nytt; merknaden beholdes.
 */
function utkastFor(s: Pick<Fagsak, 'versjon' | 'valg'>, u: Utkast | undefined): Utkast {
  if (!u) return { valg: null, merknad: '', versjon: s.versjon }
  return u.versjon === s.versjon && (u.valg === null || s.valg.some((v) => v.valg === u.valg)) ? u : { ...u, valg: null, versjon: s.versjon }
}

/**
 * Kildeovervåkingen slik en faglig redaktør ser den (VDR-2,
 * `docs/verktøy-omlegging-2026-11.md` §4): bare saker der en faglig
 * beslutning trengs, med grunnlaget, anbefalingen og hva hvert valg vil gjøre,
 * og saker som følges opp til tiltakene er utført og kontrollert. Tekniske
 * avvik, kontrollsummer og interne nøkler vises ikke. Tilgangen og
 * overgangene avgjøres i databasen; dette er bare visningen. Innholdet i
 * vinduet «Kildeovervåking» (`Kildeovervaking.tsx`).
 */
export function Fagsaker({ apen, lager, onNodstopp }: { apen: boolean; lager: Fagsaklager | null; onNodstopp?: () => void }) {
  const [data, setData] = useState<Redaktoroversikt | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const [ulest, setUlest] = useState(false)
  const [arbeider, setArbeider] = useState(false)
  // Valget og merknaden som skrives, overlever en oppdatering av appen.
  const [utkast, setUtkast] = useBevart<Record<string, Utkast>>('fagsak-utkast', {})
  const id = useId()

  const les = useCallback(async () => {
    if (!lager) return
    try {
      setData(await lager.les())
      setUlest(false)
    } catch (e) {
      setUlest(true)
      setFeil(e instanceof Error ? e.message : 'Fikk ikke hentet sakene.')
    }
  }, [lager])

  useEffect(() => {
    if (!apen) return
    setFeil(null)
    void les()
  }, [apen, les])

  const glem = (sak: string) => setUtkast(({ [sak]: _, ...resten }) => resten)

  const beslutt = async (s: Fagsak) => {
    const u = utkastFor(s, utkast[s.id])
    if (!lager || arbeider || !u.valg) return
    setArbeider(true)
    setFeil(null)
    try {
      const svar = await lager.beslutt(s.id, s.versjon, u.valg, u.merknad.trim() || null)
      // Ved «endret» gjaldt valget en eldre utgave av saken; det skal tas på nytt etter å ha lest den.
      glem(s.id)
      if (svar === 'endret') setFeil('Saken ble endret mens du leste den. Les den oppdaterte saken før du bestemmer deg.')
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Beslutningen ble ikke registrert. Prøv igjen.')
    } finally {
      await les()
      setArbeider(false)
    }
  }

  const saker = sorterSaker(data?.saker ?? [])
  const venter = saker.filter((s) => s.fase === 'beslutning')
  const oppfolging = saker.filter((s) => s.fase === 'oppfolging')
  const avsluttede = saker.filter((s) => s.fase === 'avsluttet')

  return (
    <>
      <p className="autoerstatt__ingress">
        Kildene de godkjente anbefalingene i verktøyene bygger på, kontrolleres hver uke. Du får en sak her bare når en endring krever en faglig beslutning. Tekniske avvik
        følges opp uten deg.
      </p>

      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}

      {ulest && (
        <div className="kildeovervaking__ulest">
          <p className="kildeovervaking__over">{data ? 'Sakene kunne ikke leses på nytt, så det som vises, kan være utdatert.' : 'Sakene kunne ikke leses, så det er ukjent om noe venter på deg.'}</p>
          <Button
            variant="kant"
            disabled={arbeider}
            onClick={() => {
              setFeil(null)
              void les()
            }}
          >
            Prøv igjen
          </Button>
        </div>
      )}

      {data && (
        <p className={`fagsak__teknisk${data.teknisk === 'normal' ? '' : ' fagsak__teknisk--merk'}`}>
          {TEKNISK[data.teknisk]}
          {data.sist_kontrollert_kl && ` Sist kontrollert ${tidspunkt(data.sist_kontrollert_kl)}.`}
        </p>
      )}

      <section aria-labelledby={`${id}-venter`} className="verktoysperrer__del">
        <h3 id={`${id}-venter`}>Trenger din beslutning</h3>
        {data === null ? (
          ulest ? null : <p className="autoerstatt__tomt">Henter sakene …</p>
        ) : venter.length === 0 ? (
          <p className="autoerstatt__tomt">Ingenting venter på deg.</p>
        ) : (
          venter.map((s) => (
            <Beslutningskort key={s.id} s={s} utkast={utkastFor(s, utkast[s.id])} setUtkast={(u) => setUtkast((alle) => ({ ...alle, [s.id]: u }))} arbeider={arbeider}
              onBeslutt={() => void beslutt(s)}
              onNodstopp={onNodstopp}
            />
          ))
        )}
      </section>

      {oppfolging.length > 0 && (
        <section aria-labelledby={`${id}-oppfolging`} className="verktoysperrer__del">
          <h3 id={`${id}-oppfolging`}>Oppfølging pågår</h3>
          {oppfolging.map((s) => (
            <Oppfolgingskort key={s.id} s={s} />
          ))}
        </section>
      )}

      {avsluttede.length > 0 && (
        <section aria-label="Avsluttede saker" className="verktoysperrer__del">
          <Details summary={`Avsluttede saker (${avsluttede.length})`}>
            <ul className="autoerstatt__liste">
              {avsluttede.map((s) => (
                <Avsluttet key={s.id} s={s} />
              ))}
            </ul>
          </Details>
        </section>
      )}
    </>
  )
}
