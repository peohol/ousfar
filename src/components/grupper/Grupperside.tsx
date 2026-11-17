import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type MouseEvent, type MutableRefObject, type ReactNode } from 'react'
import { visningsnavn } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import { useProfil } from '../../auth/okt'
import { gruppeside } from '../../diskusjoner/modell'
import { gruppeadresse, type Gruppefane } from '../../domain/rute'
import {
  arkiverGruppe,
  avsluttGruppemedlemskap,
  endreGruppe,
  hentGruppeoversikt,
  inviterTilGruppe,
  opprettGruppe,
  settGrupperolle,
  svarPaaInvitasjon,
} from '../../grupper/api'
import { useGrupper } from '../../grupper/kilde'
import {
  GRUPPEROLLER,
  ROLLEFORKLARING,
  ROLLENAVN,
  delMedlemmer,
  gruppetilhorighet,
  type Gruppemedlem,
  type Gruppeoversikt,
  type Grupperolle,
} from '../../grupper/modell'
import { useLukkMedEscape } from '../../hooks/useLukkMedEscape'
import { Bevaringsomrade, useBevart } from '../../oppdatering/Bevaring'
import { IKKE_PASIENTOPPLYSNINGER } from '../../traad/modell'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Lukkeknapp } from '../Lukkeknapp'
import { Merke } from '../Merke'
import { ToppmenyInnhold } from '../toppmeny/Toppmenykilde'
import { Avatar } from '../konto/Avatar'
import { Bekreftelseskort } from '../konto/Bekreftelseskort'
import { Felt } from '../konto/Felt'
import { visDiskusjonene } from '../diskusjoner/diskusjonsvisning'
import type { Forlat } from '../ideer/useForlatvakt'
import { Gruppeideer } from './Gruppeideer'

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const melding = (aarsak: unknown) => (aarsak instanceof Error ? aarsak.message : UVENTET)

/** Valget for en gruppe på tvers av fagmiljøene i skjemaet for en ny gruppe. */
const PAA_TVERS = ''

/**
 * Gruppene (`#/grupper`): invitasjonene, gruppene den innloggede er med i og
 * skjemaet for en ny gruppe, eller én gruppe (`#/grupper/<ID>`) med
 * medlemmene og det de ansvarlige kan gjøre. Gruppen har faner for oversikten
 * og idéene (`…/ideer`, `…/ideer/<idé-ID>`), og en til diskusjonene, som står
 * i diskusjonsmenyen, som på de andre sidene. Knappene er et grensesnitt, ikke
 * en tilgangskontroll: databasen kontrollerer hver handling på nytt
 * (docs/fagmiljoer.md, «Gruppene» og «Idéer og oppgaver i gruppene»).
 */
export function Grupperside({
  gruppe,
  fane,
  element,
  onLukk,
}: {
  gruppe?: string
  /** Fanen i gruppen; uten står oversikten. */
  fane?: Gruppefane
  /** Idéen eller oppgaven som står åpen i fanen. */
  element?: string
  onLukk: () => void
}) {
  const overskrift = useId()
  /** Vakten til skjemaet som står åpent i en fane, så siden og fanene spør før endringer forlates. */
  const skjemavakt = useRef<Forlat | null>(null)
  const lukk = () => (skjemavakt.current ? skjemavakt.current(onLukk) : onLukk())
  useLukkMedEscape(lukk)

  // En ny side begynner øverst, med fokus på overskriften.
  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.getElementById(overskrift)?.focus({ preventScroll: true })
  }, [gruppe, overskrift])

  return (
    <section className="gruppeside" aria-labelledby={overskrift}>
      <ToppmenyInnhold spor="lukk">
        <Lukkeknapp onLukk={lukk} />
      </ToppmenyInnhold>
      <Bevaringsomrade navn={gruppe ? `gruppe:${gruppe}` : 'grupper'}>
        {gruppe ? (
          <Gruppevisning key={gruppe} id={gruppe} fane={fane} element={element} overskrift={overskrift} skjemavakt={skjemavakt} />
        ) : (
          <Oversikt overskrift={overskrift} />
        )}
      </Bevaringsomrade>
    </section>
  )
}

/** Sidens tittel i fanen mens siden står åpen. */
function useFanetittel(tittel: string) {
  useEffect(() => {
    const forrige = document.title
    document.title = `${tittel} – OUSFAR`
    return () => {
      document.title = forrige
    }
  }, [tittel])
}

/**
 * Én handling om gangen, med kvitteringen eller feilen etter. `utfor` gir
 * kvitteringen fra handlingen, eller ingen.
 */
function useHandling() {
  const [opptatt, setOpptatt] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const [kvittering, setKvittering] = useState<string | null>(null)
  const utfor = useCallback(async (handling: () => Promise<string | null | void>): Promise<boolean> => {
    setOpptatt(true)
    setFeil(null)
    setKvittering(null)
    try {
      setKvittering((await handling()) || null)
      return true
    } catch (aarsak) {
      setFeil(melding(aarsak))
      return false
    } finally {
      setOpptatt(false)
    }
  }, [])
  return { opptatt, feil, kvittering, utfor }
}

function Tilbakemelding({ feil, kvittering }: { feil: string | null; kvittering: string | null }) {
  return (
    <>
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
    </>
  )
}

function Hode({ overskrift, overtittel, tittel, children }: { overskrift: string; overtittel: ReactNode; tittel: string; children?: ReactNode }) {
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

/** Navnet og beskrivelsen, felles for skjemaet for en ny gruppe og endringen av en. */
function Gruppefelter({
  navn,
  beskrivelse,
  onNavn,
  onBeskrivelse,
  disabled,
}: {
  navn: string
  beskrivelse: string
  onNavn: (navn: string) => void
  onBeskrivelse: (beskrivelse: string) => void
  disabled: boolean
}) {
  const beskrivelseId = useId()
  return (
    <>
      <Felt merkelapp="Navn" value={navn} maxLength={80} required disabled={disabled} onChange={(e) => onNavn(e.target.value)} />
      <div className="felt">
        <label className="felt__merkelapp" htmlFor={beskrivelseId}>
          Beskrivelse
        </label>
        <textarea
          id={beskrivelseId}
          className="felt__inndata"
          rows={3}
          maxLength={1000}
          value={beskrivelse}
          disabled={disabled}
          aria-describedby={`${beskrivelseId}-hjelp`}
          onChange={(e) => onBeskrivelse(e.target.value)}
        />
        <span id={`${beskrivelseId}-hjelp`} className="felt__hjelp">
          {IKKE_PASIENTOPPLYSNINGER}
        </span>
      </div>
    </>
  )
}

/* --- Oversikten -------------------------------------------------------------- */

function Oversikt({ overskrift }: { overskrift: string }) {
  useFanetittel('Grupper')
  const { grupper, invitasjoner, kan_opprette, oppdater } = useGrupper()
  const { opptatt, feil, kvittering, utfor } = useHandling()
  const kanOpprette = kan_opprette.tverrfaglig || kan_opprette.fagmiljoer.length > 0

  const svar = (gruppe: string, navn: string, godta: boolean) =>
    void utfor(async () => {
      await svarPaaInvitasjon(gruppe, godta)
      oppdater()
      return godta ? `Du er med i ${navn}.` : `Invitasjonen til ${navn} er avslått.`
    })

  return (
    <>
      <Hode overskrift={overskrift} overtittel="Samhandling" tittel="Grupper">
        <p className="gruppeside__ingress">
          En gruppe har sine egne diskusjoner, som bare medlemmene ser. Den kan høre til ett fagmiljø eller gå på tvers av
          fagmiljøene. Å være med i en gruppe gir aldri tilgang til et annet fagmiljøs lokale innhold.
        </p>
      </Hode>
      <Tilbakemelding feil={feil} kvittering={kvittering} />

      {invitasjoner.length > 0 && (
        <section className="gruppeside__del" aria-label="Invitasjoner">
          <h2 className="gruppeside__deltittel">Invitasjoner</h2>
          <ul className="brukerliste">
            {invitasjoner.map(({ gruppe, invitert_av }) => (
              <li key={gruppe.id} className="grupperad">
                <span className="grupperad__navn">
                  <span className="brukerrad__fullt">{gruppe.navn}</span>
                  <span className="brukerrad__brukernavn">
                    {gruppetilhorighet(gruppe)}
                    {invitert_av && ` · invitert av ${visningsnavn(invitert_av)}`}
                  </span>
                </span>
                <span className="brukerrad__knapper">
                  <Button variant="kant" icon={<Ikon navn="yes" />} disabled={opptatt} onClick={() => svar(gruppe.id, gruppe.navn, true)}>
                    Godta
                  </Button>
                  <Button variant="kant" icon={<Ikon navn="close" />} disabled={opptatt} onClick={() => svar(gruppe.id, gruppe.navn, false)}>
                    Avslå
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="gruppeside__del" aria-label="Gruppene dine">
        <h2 className="gruppeside__deltittel">Gruppene dine</h2>
        {grupper.length === 0 ? (
          <p className="brukerliste__tomt">Du er ikke med i noen grupper ennå. En ansvarlig i en gruppe kan invitere deg.</p>
        ) : (
          <ul className="brukerliste">
            {grupper.map((g) => (
              <li key={g.id} className="grupperad">
                <a className="grupperad__navn grupperad__lenke" href={gruppeadresse(g.id)}>
                  <span className="brukerrad__fullt">{g.navn}</span>
                  <span className="brukerrad__brukernavn">
                    {gruppetilhorighet(g)} · {g.medlemmer === 1 ? '1 medlem' : `${g.medlemmer} medlemmer`}
                  </span>
                </a>
                <span className="brukerrad__merker">
                  {g.rolle ? <Merke tone={g.rolle === 'medlem' ? 'noytral' : 'aksent'}>{ROLLENAVN[g.rolle]}</Merke> : <Merke>Ikke med</Merke>}
                  {g.status === 'arkivert' && <Merke tone="flate">Arkivert</Merke>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {kanOpprette && <NyGruppe />}
    </>
  )
}

function NyGruppe() {
  const { kan_opprette, oppdater } = useGrupper()
  const [navn, setNavn] = useBevart('ny/navn', '')
  const [beskrivelse, setBeskrivelse] = useBevart('ny/beskrivelse', '')
  const [hvor, setHvor] = useBevart<string>('ny/fagmiljo', kan_opprette.fagmiljoer[0]?.id ?? PAA_TVERS)
  const { opptatt, feil, utfor } = useHandling()
  const hvorId = useId()
  const valg = [
    ...kan_opprette.fagmiljoer.map((f) => ({ verdi: f.id, navn: f.navn })),
    ...(kan_opprette.tverrfaglig ? [{ verdi: PAA_TVERS, navn: 'På tvers av fagmiljøene' }] : []),
  ]
  const valgt = valg.some((v) => v.verdi === hvor) ? hvor : (valg[0]?.verdi ?? PAA_TVERS)

  const opprett = (event: FormEvent) => {
    event.preventDefault()
    void utfor(async () => {
      const id = await opprettGruppe(navn.trim(), beskrivelse.trim(), valgt || null)
      setNavn('')
      setBeskrivelse('')
      oppdater()
      window.location.hash = gruppeadresse(id)
    })
  }

  return (
    <section className="gruppeside__del" aria-label="Ny gruppe">
      <h2 className="gruppeside__deltittel">Ny gruppe</h2>
      <form className="skjema gruppeside__skjema" onSubmit={opprett}>
        <Gruppefelter navn={navn} beskrivelse={beskrivelse} onNavn={setNavn} onBeskrivelse={setBeskrivelse} disabled={opptatt} />
        <div className="felt">
          <label className="felt__merkelapp" htmlFor={hvorId}>
            Hører til
          </label>
          <select id={hvorId} className="felt__inndata" value={valgt} disabled={opptatt} onChange={(e) => setHvor(e.target.value)}>
            {valg.map((v) => (
              <option key={v.verdi} value={v.verdi}>
                {v.navn}
              </option>
            ))}
          </select>
          <span className="felt__hjelp">Du blir ansvarlig for gruppen og kan invitere andre etterpå.</span>
        </div>
        {feil && (
          <p className="skjemafeil" role="alert">
            {feil}
          </p>
        )}
        <div className="skjema__knapper">
          <Button type="submit" icon={<Ikon navn="plus" />} disabled={opptatt || !navn.trim()}>
            Opprett gruppen
          </Button>
        </div>
      </form>
    </section>
  )
}

/* --- Én gruppe --------------------------------------------------------------- */

/** En handling som fjerner tilgang, og som derfor må bekreftes. */
type Bekreftelse = { handling: 'fjern'; medlem: Gruppemedlem } | { handling: 'forlat' } | { handling: 'arkiver' }

function Gruppevisning({
  id,
  fane,
  element,
  overskrift,
  skjemavakt,
}: {
  id: string
  fane?: Gruppefane
  element?: string
  overskrift: string
  skjemavakt: MutableRefObject<Forlat | null>
}) {
  const meg = useProfil()
  const { oppdater } = useGrupper()
  const [oversikt, setOversikt] = useState<Gruppeoversikt | null>(null)
  const [lesefeil, setLesefeil] = useState<string | null>(null)
  const [bekreft, setBekreft] = useState<Bekreftelse | null>(null)
  const [endrer, setEndrer] = useBevart('endre', false)
  const handling = useHandling()
  const { opptatt, utfor } = handling
  // En ny fane, eller en idé eller oppgave i den, begynner øverst. Tilbake på
  // lista i fanen står fokus på kortet man kom fra (`Gruppeideer`).
  const forrigeFane = useRef(fane)
  useEffect(() => {
    if (element || forrigeFane.current !== fane) window.scrollTo({ top: 0 })
    forrigeFane.current = fane
  }, [fane, element])
  useFanetittel(oversikt ? (fane === 'ideer' ? `Idéer – ${oversikt.navn}` : oversikt.navn) : 'Gruppe')
  /** En lenke på siden går gjennom skjemavakten. */
  const vaktet = (e: MouseEvent<HTMLAnchorElement>) => {
    const forlat = skjemavakt.current
    if (!forlat || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const adresse = e.currentTarget.getAttribute('href')!
    forlat(() => {
      window.location.hash = adresse
    })
  }

  const hent = useCallback(async () => {
    try {
      setOversikt(await hentGruppeoversikt(id))
      setLesefeil(null)
    } catch (aarsak) {
      setOversikt(null)
      setLesefeil(melding(aarsak))
    }
  }, [id])

  useEffect(() => {
    void hent()
  }, [hent])

  /** Utfører handlingen, og henter gruppen og oversikten over gruppene på nytt. Sant når den lyktes. */
  const gjor = (arbeid: () => Promise<string | null | void>) =>
    utfor(async () => {
      const kvittering = await arbeid()
      setBekreft(null)
      oppdater()
      await hent()
      return kvittering
    })

  if (!oversikt) {
    return (
      <Hode overskrift={overskrift} overtittel={<a href={gruppeadresse()}>Grupper</a>} tittel="Gruppe">
        <p className={lesefeil ? 'skjemafeil' : 'gruppeside__ingress'} role={lesefeil ? 'alert' : undefined}>
          {lesefeil ?? 'Henter gruppen …'}
        </p>
      </Hode>
    )
  }

  const g = oversikt
  const aktiv = g.status === 'aktiv'

  const forlat = () =>
    void utfor(async () => {
      await avsluttGruppemedlemskap(g.id, meg.id)
      oppdater()
      window.location.hash = gruppeadresse()
    })

  const bekreftelse = (b: Bekreftelse) => {
    switch (b.handling) {
      case 'fjern': {
        const navn = visningsnavn(b.medlem)
        return (
          <Bekreftelseskort
            tittel={`Fjerne ${navn} fra ${g.navn}?`}
            bekreft="Fjern fra gruppen"
            opptatt={opptatt}
            onBekreft={() =>
              gjor(async () => {
                await avsluttGruppemedlemskap(g.id, b.medlem.id)
                return `${navn} er ikke lenger med i gruppen.`
              })
            }
            onAvbryt={() => setBekreft(null)}
          >
            {navn} mister med en gang tilgangen til diskusjonene, varslene og lenkene i gruppen. Det {navn} har skrevet, blir stående.
          </Bekreftelseskort>
        )
      }
      case 'forlat':
        return (
          <Bekreftelseskort tittel={`Forlate ${g.navn}?`} bekreft="Forlat gruppen" opptatt={opptatt} onBekreft={forlat} onAvbryt={() => setBekreft(null)}>
            Du mister med en gang tilgangen til diskusjonene og varslene i gruppen. En ansvarlig kan invitere deg igjen.
          </Bekreftelseskort>
        )
      case 'arkiver':
        return (
          <Bekreftelseskort
            tittel={`Arkivere ${g.navn}?`}
            bekreft="Arkiver gruppen"
            opptatt={opptatt}
            onBekreft={() =>
              gjor(async () => {
                await arkiverGruppe(g.id, true)
                return 'Gruppen er arkivert.'
              })
            }
            onAvbryt={() => setBekreft(null)}
          >
            Medlemmene mister tilgangen til gruppen og diskusjonene i den. Ingenting slettes, og bare systemarkitektene kan åpne den
            igjen.
          </Bekreftelseskort>
        )
    }
  }

  return (
    <>
      <Hode overskrift={overskrift} overtittel={<a href={gruppeadresse()} onClick={vaktet}>Grupper</a>} tittel={g.navn}>
        <p className="gruppeside__meta">
          <span>{gruppetilhorighet(g)}</span>
          {g.rolle && <Merke tone={g.rolle === 'medlem' ? 'noytral' : 'aksent'}>{ROLLENAVN[g.rolle]}</Merke>}
          {!aktiv && <Merke tone="flate">Arkivert</Merke>}
        </p>
        {g.beskrivelse && !fane && <p className="gruppeside__ingress">{g.beskrivelse}</p>}
        <Gruppefaner gruppe={g} fane={fane} onLenke={vaktet} />
      </Hode>

      {fane === 'ideer' ? (
        <Gruppeideer gruppe={g} ide={element} onEndret={() => void hent()} skjemavakt={skjemavakt} />
      ) : (
        <Gruppeoversiktsfane
          gruppe={g}
          meg={meg.id}
          handling={handling}
          endrer={endrer}
          setEndrer={setEndrer}
          bekreft={bekreft}
          setBekreft={setBekreft}
          bekreftelse={bekreftelse}
          gjor={gjor}
        />
      )}
    </>
  )
}

/**
 * Fanene i gruppen: oversikten og idéene, med tallet på det som er nytt, og
 * diskusjonene, som åpner diskusjonsmenyen på siden. Diskusjonene står bare
 * mens gruppen er aktiv, som menyen.
 */
function Gruppefaner({
  gruppe,
  fane,
  onLenke,
}: {
  gruppe: Gruppeoversikt
  fane?: Gruppefane
  /** Før en fane åpnes: spør når et skjema i fanen har endringer. */
  onLenke: (e: MouseEvent<HTMLAnchorElement>) => void
}) {
  const { nye_ideer, venter } = gruppe.samhandling
  const behandler = gruppe.kan_styre
  // De ansvarlige ser hvor mange som venter på behandling, de andre hva som er nytt.
  const idetall = behandler ? venter : nye_ideer
  const idetallnavn = behandler ? `${venter} venter på behandling` : `${nye_ideer} med noe nytt`
  return (
    <nav aria-label="I gruppen">
      <ul className="gruppeside__faner">
        <li>
          <a className="gruppeside__fane" href={gruppeadresse(gruppe.id)} onClick={onLenke} aria-current={fane ? undefined : 'page'}>
            Oversikt
          </a>
        </li>
        <li>
          <a className="gruppeside__fane" href={gruppeadresse(gruppe.id, 'ideer')} onClick={onLenke} aria-current={fane === 'ideer' ? 'page' : undefined}>
            <Ikon navn="idea" storrelse="ui" />
            Idéer
            {idetall > 0 && (
              <span className="gruppeside__fanetall" aria-label={idetallnavn} title={idetallnavn}>
                {idetall}
              </span>
            )}
          </a>
        </li>
        {gruppe.status === 'aktiv' && (
          <li>
            <button type="button" className="gruppeside__fane" onClick={() => visDiskusjonene(gruppeside(gruppe.id))}>
              <Ikon navn="diskusjon" storrelse="ui" />
              Diskusjoner
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}

/** Oversikten over gruppen: handlingene for gruppen, medlemmene og invitasjonen. */
function Gruppeoversiktsfane({
  gruppe: g,
  meg,
  handling,
  endrer,
  setEndrer,
  bekreft,
  setBekreft,
  bekreftelse,
  gjor,
}: {
  gruppe: Gruppeoversikt
  meg: string
  handling: ReturnType<typeof useHandling>
  endrer: boolean
  setEndrer: (endrer: boolean) => void
  bekreft: Bekreftelse | null
  setBekreft: (bekreft: Bekreftelse | null) => void
  bekreftelse: (bekreft: Bekreftelse) => ReactNode
  gjor: (arbeid: () => Promise<string | null | void>) => Promise<boolean>
}) {
  const { opptatt } = handling
  const aktiv = g.status === 'aktiv'
  return (
    <>

      <div className="gruppeside__handlinger">
        {g.kan_styre && aktiv && !endrer && (
          <Button variant="kant" icon={<Ikon navn="edit" />} disabled={opptatt} onClick={() => setEndrer(true)}>
            Endre navn og beskrivelse
          </Button>
        )}
        {g.kan_styre && aktiv && (
          <Button variant="kant" icon={<Ikon navn="arkiv" />} disabled={opptatt} onClick={() => setBekreft({ handling: 'arkiver' })}>
            Arkiver gruppen
          </Button>
        )}
        {g.kan_gjenapne && (
          <Button
            variant="kant"
            icon={<Ikon navn="reset" />}
            disabled={opptatt}
            onClick={() =>
              gjor(async () => {
                await arkiverGruppe(g.id, false)
                return 'Gruppen er åpnet igjen.'
              })
            }
          >
            Åpne gruppen igjen
          </Button>
        )}
        {g.rolle && aktiv && (
          <Button
            variant="kant"
            icon={<Ikon navn="logout" />}
            disabled={opptatt || !g.kan_forlate}
            title={g.kan_forlate ? undefined : 'Du er den siste ansvarlige. Gjør en annen til ansvarlig først.'}
            onClick={() => setBekreft({ handling: 'forlat' })}
          >
            Forlat gruppen
          </Button>
        )}
      </div>

      {endrer && g.kan_styre && aktiv && (
        <Endring
          gruppe={g}
          opptatt={opptatt}
          onLagre={(navn, beskrivelse) =>
            gjor(async () => {
              await endreGruppe(g.id, navn, beskrivelse)
              setEndrer(false)
              return 'Gruppen er endret.'
            })
          }
          onAvbryt={() => setEndrer(false)}
        />
      )}

      {bekreft && bekreftelse(bekreft)}
      <Tilbakemelding feil={handling.feil} kvittering={handling.kvittering} />

      <Medlemmer
        gruppe={g}
        meg={meg}
        opptatt={opptatt}
        onRolle={(medlem, rolle) =>
          gjor(async () => {
            await settGrupperolle(g.id, medlem.id, rolle)
            return `${visningsnavn(medlem)} er ${ROLLENAVN[rolle].toLowerCase()} i gruppen.`
          })
        }
        onFjern={(medlem) =>
          medlem.status === 'invitert'
            ? gjor(async () => {
                await avsluttGruppemedlemskap(g.id, medlem.id)
                return `Invitasjonen til ${visningsnavn(medlem)} er trukket tilbake.`
              })
            : setBekreft({ handling: 'fjern', medlem })
        }
      />

      {g.kan_styre && aktiv && (
        <Invitasjon
          opptatt={opptatt}
          onInviter={(brukernavn) =>
            gjor(async () => {
              const svar = await inviterTilGruppe(g.id, brukernavn)
              return svar.status === 'aktiv' ? `${brukernavn} er alt med i gruppen.` : `${brukernavn} er invitert.`
            })
          }
        />
      )}
    </>
  )
}

function Endring({
  gruppe,
  opptatt,
  onLagre,
  onAvbryt,
}: {
  gruppe: Gruppeoversikt
  opptatt: boolean
  onLagre: (navn: string, beskrivelse: string) => void
  onAvbryt: () => void
}) {
  const [navn, setNavn] = useBevart('endre/navn', gruppe.navn)
  const [beskrivelse, setBeskrivelse] = useBevart('endre/beskrivelse', gruppe.beskrivelse)
  return (
    <form
      className="skjema gruppeside__skjema"
      aria-label="Endre gruppen"
      onSubmit={(e) => {
        e.preventDefault()
        onLagre(navn.trim(), beskrivelse.trim())
      }}
    >
      <Gruppefelter navn={navn} beskrivelse={beskrivelse} onNavn={setNavn} onBeskrivelse={setBeskrivelse} disabled={opptatt} />
      <div className="skjema__knapper">
        <Button type="submit" disabled={opptatt || !navn.trim()}>
          Lagre
        </Button>
        <Button variant="subtle" onClick={onAvbryt}>
          Avbryt
        </Button>
      </div>
    </form>
  )
}

function Medlemmer({
  gruppe,
  meg,
  opptatt,
  onRolle,
  onFjern,
}: {
  gruppe: Gruppeoversikt
  meg: string
  opptatt: boolean
  onRolle: (medlem: Gruppemedlem, rolle: Grupperolle) => void
  onFjern: (medlem: Gruppemedlem) => void
}) {
  const lenker = useAvatarlenker(gruppe.medlemmer)
  const { aktive, inviterte } = delMedlemmer(gruppe.medlemmer)

  const rad = (medlem: Gruppemedlem) => {
    const navn = visningsnavn(medlem)
    const egen = medlem.id === meg
    return (
      <li key={medlem.id} className="brukerrad">
        <Avatar profil={medlem} lenke={medlem.avatar_path ? (lenker.get(medlem.avatar_path) ?? null) : null} />
        <span className="brukerrad__navn">
          <span className="brukerrad__fullt">
            {navn}
            {egen && <span className="brukerrad__deg"> (deg)</span>}
          </span>
          <span className="brukerrad__brukernavn">{medlem.username}</span>
        </span>
        <span className="brukerrad__merker">
          {medlem.kan_endre_rolle && !egen ? (
            <select
              className="felt__inndata gruppeside__rolle"
              aria-label={`Rollen til ${navn}`}
              value={medlem.rolle}
              disabled={opptatt}
              onChange={(e) => onRolle(medlem, e.target.value as Grupperolle)}
            >
              {GRUPPEROLLER.map((r) => (
                <option key={r} value={r} title={ROLLEFORKLARING[r]}>
                  {ROLLENAVN[r]}
                </option>
              ))}
            </select>
          ) : (
            <Merke tone={medlem.rolle === 'medlem' ? 'noytral' : 'aksent'}>{ROLLENAVN[medlem.rolle]}</Merke>
          )}
          {medlem.status === 'invitert' && <Merke>Invitert</Merke>}
          {medlem.status === 'aktiv' && !medlem.har_tilgang && <Merke tone="toksisk">Uten tilgang nå</Merke>}
        </span>
        {medlem.kan_fjerne && (
          <span className="brukerrad__knapper">
            <Button
              variant="kant"
              icon={<Ikon navn="close" />}
              aria-label={medlem.status === 'invitert' ? `Trekk tilbake invitasjonen til ${navn}` : `Fjern ${navn} fra gruppen`}
              disabled={opptatt}
              onClick={() => onFjern(medlem)}
            >
              {medlem.status === 'invitert' ? 'Trekk tilbake' : 'Fjern'}
            </Button>
          </span>
        )}
      </li>
    )
  }

  return (
    <section className="gruppeside__del" aria-label="Medlemmene">
      <h2 className="gruppeside__deltittel">Medlemmene</h2>
      <ul className="brukerliste" aria-label={`Medlemmer i ${gruppe.navn}`}>
        {aktive.map(rad)}
      </ul>
      {aktive.some((m) => !m.har_tilgang) && (
        <p className="brukerliste__merknad">
          «Uten tilgang nå»: medlemmet er ikke lenger med i {gruppe.fagmiljo?.navn ?? 'fagmiljøet'}, og ser ikke gruppen før det
          igjen er medlem der.
        </p>
      )}
      {inviterte.length > 0 && (
        <>
          <h3 className="brukerliste__overskrift">Inviterte</h3>
          <ul className="brukerliste" aria-label={`Inviterte til ${gruppe.navn}`}>
            {inviterte.map(rad)}
          </ul>
        </>
      )}
    </section>
  )
}

function Invitasjon({ opptatt, onInviter }: { opptatt: boolean; onInviter: (brukernavn: string) => Promise<boolean> }) {
  const [brukernavn, setBrukernavn] = useBevart('inviter', '')
  return (
    <section className="gruppeside__del" aria-label="Inviter">
      <h2 className="gruppeside__deltittel">Inviter</h2>
      <form
        className="skjema gruppeside__skjema"
        onSubmit={(e) => {
          e.preventDefault()
          void onInviter(brukernavn.trim()).then((lyktes) => lyktes && setBrukernavn(''))
        }}
      >
        <Felt
          merkelapp="Brukernavn"
          value={brukernavn}
          autoComplete="off"
          disabled={opptatt}
          onChange={(e) => setBrukernavn(e.target.value)}
          hjelp="Den inviterte ser invitasjonen under «Grupper» i kontomenyen, og er med når den er godtatt."
        />
        <div className="skjema__knapper">
          <Button type="submit" icon={<Ikon navn="plus" />} disabled={opptatt || !brukernavn.trim()}>
            Inviter
          </Button>
        </div>
      </form>
    </section>
  )
}
