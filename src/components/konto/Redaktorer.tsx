import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { hentMedlemsoversikt, type Medlem } from '../../auth/api'
import { useRettigheter } from '../../auth/rettigheter'
import { tidspunkt } from '../../faginnhold/historikk'
import { useBevart } from '../../oppdatering/Bevaring'
import {
  ansvarstekst,
  personnavn,
  redaktorlager,
  ressursnavn,
  type Redaktoransvar,
  type Redaktorlager,
  type Redaktoromrade,
  type Redaktoroversikt,
} from '../../redaktorer/ansvar'
import { Button } from '../Button'
import { Modallag } from '../Modallag'
import { Bekreftelseskort } from './Bekreftelseskort'
import { Felt } from './Felt'

/** Tildelingen som fylles ut. */
interface Utkast {
  bruker: string
  omrade: Redaktoromrade
  ressurs: string
  merknad: string
}

const TOMT: Utkast = { bruker: '', omrade: 'fortolkning', ressurs: '', merknad: '' }

/** Teksten ved det nasjonale valget mens det er slått av (B2, #417). */
export const NASJONALT_AV =
  'Kommer når OUSFAR Fag har avklart hvordan nasjonale redaktører passer med kurateringen. Til da har systemarkitektene ansvaret for fagsidene.'

/**
 * «Redaktører» i administrasjonen (P5 tråd A, docs/redaktorer-og-forslag.md):
 * hvem som har redaktøransvar i fagmiljøet, å gi en kollega ansvar for hele
 * fortolkningen eller ett regelsett, å ta ansvaret tilbake, og regelsettene
 * ingen redaktør har ansvaret for. En redaktør endrer utkastet, men
 * publiserer ikke; det gjør administratorene og systemarkitektene som før.
 *
 * Lokale administratorer ser bare egne fagmiljøer; systemarkitektene ser alle,
 * og det nasjonale valget, som står avslått til det slås på i databasen.
 * Dette er visningen; databasen kontrollerer hver handling.
 */
export function Redaktorer({
  apen,
  onLukk,
  lager = redaktorlager,
  hentMedlemmer = hentMedlemsoversikt,
}: {
  apen: boolean
  onLukk: () => void
  lager?: Redaktorlager
  hentMedlemmer?: (fagmiljo: string) => Promise<Medlem[]>
}) {
  const { arbeidsfagmiljo } = useRettigheter()
  const [oversikt, setOversikt] = useState<Redaktoroversikt | null>(null)
  const [medlemmer, setMedlemmer] = useState<Medlem[] | null>(null)
  const [medlemsfeil, setMedlemsfeil] = useState(false)
  const [medlemsforsok, setMedlemsforsok] = useState(0)
  const [feil, setFeil] = useState<string | null>(null)
  const [melding, setMelding] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)
  const [tilbakekaller, setTilbakekaller] = useState<string | null>(null)
  const [valgt, setValgt] = useBevart<string>('redaktorer-fagmiljo', '')
  // Tildelingen som skrives, per fagmiljø, så et bytte aldri tar med valg fra et annet; overlever en oppdatering av appen.
  const [utkastene, setUtkastene] = useBevart<Record<string, Utkast>>('redaktorer-utkast', {})
  const id = useId()
  // Svaret på en handling står øverst; det rulles fram, så det ses også på en smal skjerm.
  const svar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (feil || melding) svar.current?.scrollIntoView?.({ block: 'nearest' })
  }, [feil, melding])

  const les = useCallback(async () => {
    try {
      setOversikt(await lager.oversikt())
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Fikk ikke hentet redaktørene.')
    }
  }, [lager])

  useEffect(() => {
    if (!apen) return
    setFeil(null)
    setMelding(null)
    void les()
  }, [apen, les])

  // Fagmiljøet som vises: det valgte, ellers det den innloggede arbeider i, ellers det første.
  const fagmiljoer = oversikt?.fagmiljoer ?? []
  const fagmiljo =
    fagmiljoer.find((f) => f.id === valgt) ?? fagmiljoer.find((f) => f.id === arbeidsfagmiljo?.id) ?? fagmiljoer[0] ?? null

  const utkast = (fagmiljo && utkastene[fagmiljo.id]) || TOMT
  const setUtkast = (u: Utkast) => fagmiljo && setUtkastene({ ...utkastene, [fagmiljo.id]: u })

  useEffect(() => {
    if (!apen || !fagmiljo) return
    let gjeldende = true
    setMedlemmer(null)
    setMedlemsfeil(false)
    hentMedlemmer(fagmiljo.id).then(
      (m) => gjeldende && setMedlemmer(m),
      () => {
        if (!gjeldende) return
        setMedlemmer([])
        setMedlemsfeil(true)
      },
    )
    return () => {
      gjeldende = false
    }
  }, [apen, fagmiljo?.id, hentMedlemmer, medlemsforsok]) // eslint-disable-line react-hooks/exhaustive-deps

  const ansvar = useMemo(() => (oversikt?.ansvar ?? []).filter((a) => (fagmiljo ? a.fagmiljo?.id === fagmiljo.id : false)), [oversikt, fagmiljo])
  const nasjonale = useMemo(() => (oversikt?.ansvar ?? []).filter((a) => a.nasjonalt), [oversikt])
  const regelsett = useMemo(
    () => (oversikt?.ressurser ?? []).filter((r) => r.type !== 'infoside' && r.fagmiljoId === fagmiljo?.id),
    [oversikt, fagmiljo],
  )
  const utenRedaktor = regelsett.filter((r) => r.harRedaktor === false)
  const aktive = (medlemmer ?? []).filter((m) => m.status === 'aktiv')

  const utfor = async (endring: () => Promise<unknown>, ok: string): Promise<boolean> => {
    if (arbeider) return false
    setArbeider(true)
    setFeil(null)
    setMelding(null)
    try {
      await endring()
      setMelding(ok)
      return true
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
      return false
    } finally {
      await les()
      setArbeider(false)
    }
  }

  const gi = async (h: FormEvent) => {
    h.preventDefault()
    if (!fagmiljo) return
    // Bare valg som står i listene for dette fagmiljøet, sendes.
    const mottaker = aktive.find((m) => m.id === utkast.bruker)
    if (!mottaker) return setFeil('Velg hvem som skal få ansvaret.')
    if (utkast.omrade === 'ressurs' && !regelsett.some((r) => r.id === utkast.ressurs)) return setFeil('Velg regelsettet.')
    const tildelt = await utfor(
      () =>
        lager.tildel({
          bruker: utkast.bruker,
          omrade: utkast.omrade,
          ...(utkast.omrade === 'ressurs' && { ressurs: utkast.ressurs }),
          ...(utkast.omrade === 'fortolkning' && { fagmiljo: fagmiljo.id }),
          merknad: utkast.merknad,
        }),
      `${`${mottaker.first_name} ${mottaker.last_name}`.trim() || mottaker.username} har fått redaktøransvaret.`,
    )
    if (tildelt) setUtkast(TOMT)
  }

  const giNasjonalt = async () => {
    if (!aktive.some((m) => m.id === utkast.bruker)) return setFeil('Velg hvem som skal få ansvaret.')
    if (await utfor(() => lager.tildel({ bruker: utkast.bruker, omrade: 'fagsider', merknad: utkast.merknad }), 'Ansvaret for fagsidene er gitt.')) setUtkast(TOMT)
  }

  const tilbakekall = async (a: Redaktoransvar) => {
    if (await utfor(() => lager.tilbakekall(a.id), `${personnavn(a.bruker)} har ikke lenger ansvaret.`)) setTilbakekaller(null)
  }

  const visAnsvar = (a: Redaktoransvar) => (
    <li key={a.id} className="autoerstatt__rad autoerstatt__rad--skjema">
      <p className="verktoysperrer__mal">{personnavn(a.bruker)}</p>
      <p className="verktoysperrer__grunn">
        {ansvarstekst(a)}
        {!a.gjelder && ' – gjelder ikke nå'}
      </p>
      {a.merknad && <p className="verktoysperrer__grunn">{a.merknad}</p>}
      <p className="felt__hjelp">
        Gitt {tidspunkt(a.tildeltKl)}
        {a.tildeltAv && ` av ${personnavn(a.tildeltAv)}`}
      </p>
      {tilbakekaller === a.id ? (
        <Bekreftelseskort
          tittel={`Ta tilbake ansvaret fra ${personnavn(a.bruker)}?`}
          bekreft="Ta tilbake"
          opptatt={arbeider}
          onBekreft={() => void tilbakekall(a)}
          onAvbryt={() => setTilbakekaller(null)}
        >
          {personnavn(a.bruker)} kan ikke lenger endre utkastet. Det som alt er lagret, står.
        </Bekreftelseskort>
      ) : (
        <div className="autoerstatt__knapper">
          <Button variant="kant" disabled={arbeider} onClick={() => setTilbakekaller(a.id)}>
            Ta tilbake
          </Button>
        </div>
      )}
    </li>
  )

  return (
    <Modallag apen={apen} tittel="Redaktører" ikon="edit" bred onLukk={onLukk}>
      <p className="autoerstatt__ingress">
        En redaktør kan endre utkastet til fortolkningen, for hele fagmiljøet eller for ett regelsett. Redaktøren publiserer ikke; det gjør
        administratorene som før.
      </p>

      <div ref={svar}>
        {feil && (
          <p className="skjemafeil" role="alert">
            {feil}
          </p>
        )}
        {melding && (
          <p className="felt__hjelp" role="status">
            {melding}
          </p>
        )}
      </div>

      {oversikt === null ? (
        !feil && <p className="autoerstatt__tomt">Henter redaktørene …</p>
      ) : !fagmiljo ? (
        <p className="autoerstatt__tomt">Du administrerer ingen fagmiljøer.</p>
      ) : (
        <>
          {fagmiljoer.length > 1 && (
            <label className="felt">
              <span className="felt__merkelapp">Fagmiljø</span>
              <select className="felt__inndata" value={fagmiljo.id} onChange={(e) => setValgt(e.target.value)}>
                {fagmiljoer.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.navn}
                  </option>
                ))}
              </select>
            </label>
          )}

          <section aria-labelledby={`${id}-ansvar`} className="verktoysperrer__del">
            <h3 id={`${id}-ansvar`}>Redaktørene i {fagmiljo.navn}</h3>
            {ansvar.length === 0 ? (
              <p className="autoerstatt__tomt">Ingen redaktører ennå. Administratorene har ansvaret for alt.</p>
            ) : (
              <ul className="autoerstatt__liste">{ansvar.map(visAnsvar)}</ul>
            )}
          </section>

          <form className="verktoysperrer__del" aria-labelledby={`${id}-ny`} onSubmit={(h) => void gi(h)}>
            <h3 id={`${id}-ny`}>Gi redaktøransvar</h3>
            <label className="felt">
              <span className="felt__merkelapp">Hvem</span>
              <select className="felt__inndata" value={utkast.bruker} onChange={(e) => setUtkast({ ...utkast, bruker: e.target.value })}>
                <option value="">{medlemmer === null ? 'Henter medlemmene …' : 'Velg et medlem …'}</option>
                {aktive.map((m) => (
                  <option key={m.id} value={m.id}>
                    {`${m.first_name} ${m.last_name}`.trim() || m.username} ({m.username})
                  </option>
                ))}
              </select>
            </label>
            {medlemsfeil && (
              <>
                <p className="skjemafeil" role="alert">
                  Fikk ikke hentet medlemmene.
                </p>
                <div className="autoerstatt__knapper">
                  <Button variant="kant" onClick={() => setMedlemsforsok((n) => n + 1)}>
                    Prøv igjen
                  </Button>
                </div>
              </>
            )}
            <fieldset className="verktoysperrer__omfang">
              <legend className="felt__merkelapp">Ansvar for</legend>
              <label className="avkryssing">
                <input
                  type="radio"
                  name={`${id}-omrade`}
                  checked={utkast.omrade === 'fortolkning'}
                  onChange={() => setUtkast({ ...utkast, omrade: 'fortolkning', ressurs: '' })}
                />
                Hele fortolkningen i {fagmiljo.navn}
              </label>
              <label className="avkryssing">
                <input
                  type="radio"
                  name={`${id}-omrade`}
                  checked={utkast.omrade === 'ressurs'}
                  disabled={regelsett.length === 0}
                  onChange={() => setUtkast({ ...utkast, omrade: 'ressurs' })}
                />
                Ett regelsett
              </label>
            </fieldset>
            {utkast.omrade === 'ressurs' && (
              <label className="felt">
                <span className="felt__merkelapp">Regelsettet</span>
                <select className="felt__inndata" value={utkast.ressurs} onChange={(e) => setUtkast({ ...utkast, ressurs: e.target.value })}>
                  <option value="">Velg …</option>
                  {regelsett.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.navn}
                      {r.harRedaktor ? ' (har redaktør)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Felt
              merkelapp="Merknad (valgfri)"
              hjelp="For eksempel hvorfor, eller hvor lenge. Vises for administratorene."
              value={utkast.merknad}
              onChange={(e) => setUtkast({ ...utkast, merknad: e.target.value })}
              maxLength={300}
            />
            <div className="autoerstatt__knapper">
              <Button type="submit" disabled={arbeider}>
                Gi ansvaret
              </Button>
            </div>
          </form>

          <section aria-labelledby={`${id}-uten`} className="verktoysperrer__del">
            <h3 id={`${id}-uten`}>Uten redaktør</h3>
            {regelsett.length === 0 ? (
              <p className="autoerstatt__tomt">{fagmiljo.navn} har ingen regelsett ennå.</p>
            ) : utenRedaktor.length === 0 ? (
              <p className="autoerstatt__tomt">Alle regelsettene i {fagmiljo.navn} har en redaktør.</p>
            ) : (
              <>
                <p className="felt__hjelp">Forslag til disse går til administratorene.</p>
                <ul className="autoerstatt__liste">
                  {utenRedaktor.map((r) => (
                    <li key={r.id} className="autoerstatt__rad">
                      {ressursnavn(r)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}

      {oversikt?.nasjonalt.vises && (
        <section aria-labelledby={`${id}-nasjonalt`} className="verktoysperrer__del">
          <h3 id={`${id}-nasjonalt`}>Nasjonale redaktører for fagsidene</h3>
          {oversikt.nasjonalt.aktivert ? (
            <>
              {nasjonale.length === 0 ? (
                <p className="autoerstatt__tomt">Ingen nasjonale redaktører ennå.</p>
              ) : (
                <ul className="autoerstatt__liste">{nasjonale.map(visAnsvar)}</ul>
              )}
              <div className="autoerstatt__knapper">
                <Button variant="kant" disabled={arbeider || !utkast.bruker} onClick={() => void giNasjonalt()}>
                  Gi den valgte ansvar for alle fagsidene
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="kant" disabled aria-describedby={`${id}-nasjonalt-av`}>
                Gi ansvar for alle fagsidene
              </Button>
              <p className="felt__hjelp" id={`${id}-nasjonalt-av`}>
                {NASJONALT_AV}
              </p>
            </>
          )}
          {oversikt.fagsiderUtenRedaktor !== null && (
            <p className="felt__hjelp">
              {oversikt.fagsiderUtenRedaktor === 1 ? 'Én fagside' : `${oversikt.fagsiderUtenRedaktor} fagsider`} uten redaktør.
            </p>
          )}
        </section>
      )}
    </Modallag>
  )
}
