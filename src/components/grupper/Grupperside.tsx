import { useEffect, useId, useMemo, type ReactNode } from 'react'
import { visningsnavn } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import { useProfil } from '../../auth/okt'
import { gruppeside } from '../../diskusjoner/modell'
import { gruppeadresse, type Gruppefane } from '../../domain/rute'
import { arkiverGruppe, avsluttGruppemedlemskap, endreGruppe, inviterTilGruppe, settGruppesymbol, settGrupperolle, svarPaaInvitasjon } from '../../grupper/api'
import { useGrupper } from '../../grupper/kilde'
import { ROLLENAVN, delMedlemmer, gruppetilhorighet, type Gruppemedlem, type Gruppeoversikt, type MinGruppe } from '../../grupper/modell'
import { useLukkMedEscape } from '../../hooks/useLukkMedEscape'
import { erstattAdressen, tilbakeTil } from '../../hooks/useRute'
import { Bevaringsomrade, useBevart } from '../../oppdatering/Bevaring'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import type { Ikonnavn } from '../ikon/register'
import { Avatar } from '../konto/Avatar'
import { Profilutlos } from '../profilkort/Profilkort'
import { Bekreftelseskort } from '../konto/Bekreftelseskort'
import { Lukkeknapp } from '../Lukkeknapp'
import { Merke } from '../Merke'
import { Oppsummeringskort } from '../oppsummering/Oppsummeringskort'
import { ToppmenyInnhold } from '../toppmeny/Toppmenykilde'
import { visDiskusjonene } from '../diskusjoner/diskusjonsvisning'
import { visGruppesamtale } from '../chat/chatstyring'
import { Gruppeaktivitet } from './Gruppeaktivitet'
import { Innstillingsmodal, Medlemsmodal, OpprettGruppe, harInnstillinger } from './Gruppemodaler'
import { Gruppesymbol, symbollenke, useGruppesymbollenker } from './Gruppesymbol'
import { Tilbakelenke, Tilbakemelding, useFanetittel, useGruppeoversikt, useHandling } from './gruppedeler'

/** Gruppeoversikten, reserven når en gruppe lukkes og ble åpnet utenfra. */
const GRUPPER = gruppeadresse()

/**
 * Gruppene (`#/grupper`): invitasjonene, søket og gruppene den innloggede
 * leser; eller én gruppe (`#/grupper/<ID>`) som et oversiktsbilde uten faner:
 * medlemslinjen og fire korte paneler for idéene, oppgavene, diskusjonene og
 * chatten. Medlemmene, innstillingene og en ny gruppe er modaler; idéene og
 * oppgavene er arbeidsflater over siden (`Gruppeflate`), og chatten står i
 * chatmenyen. Den gamle adressen til chatten (`…/chat`) åpner gruppen med
 * samtalen i chatmenyen, og skrives om til gruppen.
 *
 * Knappene er et grensesnitt, ikke en tilgangskontroll: databasen
 * kontrollerer hver handling på nytt (docs/fagmiljoer.md, «Gruppene» og
 * «Idéer og oppgaver i gruppene»).
 */
export function Grupperside({
  gruppe,
  fane,
  onLukk,
}: {
  gruppe?: string
  /** Bare den gamle adressen til chatten (`chat`) kommer hit; idéene og oppgavene er arbeidsflater. */
  fane?: Gruppefane
  onLukk: () => void
}) {
  const overskrift = useId()
  // En gruppe lukkes dit brukeren kom fra, eller til gruppeoversikten.
  const lukk = gruppe ? () => tilbakeTil(GRUPPER) : onLukk
  useLukkMedEscape(lukk)

  // Den gamle adressen til chatten: samtalen i chatmenyen, og adressen til gruppen
  // uten en ny oppføring i historikken (flyt.md §1, «Gamle adresser»).
  const gammelChat = gruppe && fane === 'chat'
  useEffect(() => {
    if (!gammelChat) return
    visGruppesamtale(gruppe)
    erstattAdressen(gruppeadresse(gruppe))
  }, [gammelChat, gruppe])

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
          <Gruppedashboard key={gruppe} id={gruppe} overskrift={overskrift} onLukk={lukk} />
        ) : (
          <Oversikt overskrift={overskrift} onLukk={lukk} />
        )}
      </Bevaringsomrade>
    </section>
  )
}

function Tittel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h1 id={id} className="gruppeside__tittel" tabIndex={-1}>
      {children}
    </h1>
  )
}

/* --- Oversikten -------------------------------------------------------------- */

/** Gruppene som passer med søket: navnet og tilhørigheten, etter hvert ord. */
export function sokIGrupper<T extends MinGruppe>(grupper: readonly T[], sok: string): T[] {
  const ord = sok.toLocaleLowerCase('nb').split(/\s+/).filter(Boolean)
  if (ord.length === 0) return [...grupper]
  return grupper.filter((g) => {
    const tekst = `${g.navn} ${gruppetilhorighet(g)}`.toLocaleLowerCase('nb')
    return ord.every((o) => tekst.includes(o))
  })
}

const antallMedlemmer = (n: number) => (n === 1 ? '1 medlem' : `${n} medlemmer`)

function Oversikt({ overskrift, onLukk }: { overskrift: string; onLukk: () => void }) {
  useFanetittel('Grupper')
  const { grupper, invitasjoner, kan_opprette, oppdater } = useGrupper()
  const { opptatt, feil, kvittering, utfor } = useHandling()
  const [ny, setNy] = useBevart('ny/apen', false)
  const [sok, setSok] = useBevart('sok', '')
  const sokId = useId()
  const kanOpprette = kan_opprette.tverrfaglig || kan_opprette.fagmiljoer.length > 0
  const { aktive, arkiverte } = useMemo(() => {
    const treff = sokIGrupper(grupper, sok)
    return { aktive: treff.filter((g) => g.status === 'aktiv'), arkiverte: treff.filter((g) => g.status !== 'aktiv') }
  }, [grupper, sok])

  const svar = (gruppe: string, navn: string, godta: boolean) =>
    void utfor(async () => {
      await svarPaaInvitasjon(gruppe, godta)
      oppdater()
      return godta ? `Du er med i ${navn}.` : `Invitasjonen til ${navn} er avslått.`
    })

  return (
    <>
      <Tilbakelenke reserve="forsiden" onTilbake={onLukk} />
      <header className="gruppeside__tittelrad">
        <Tittel id={overskrift}>Grupper</Tittel>
        {kanOpprette && (
          <Button icon={<Ikon navn="plus" />} onClick={() => setNy(true)}>
            Opprett gruppe
          </Button>
        )}
      </header>
      <Tilbakemelding feil={feil} kvittering={kvittering} />

      {invitasjoner.length > 0 && (
        <section className="gruppeside__del" aria-label="Invitasjoner">
          <ul className="gruppeinvitasjoner">
            {invitasjoner.map(({ gruppe, invitert_av }) => (
              <li key={gruppe.id} className="gruppeinvitasjon">
                <span className="gruppeinvitasjon__tekst">
                  <span>
                    {invitert_av ? (
                      <>
                        <strong>{visningsnavn(invitert_av)}</strong> har invitert deg til <strong>{gruppe.navn}</strong>.
                      </>
                    ) : (
                      <>
                        Du er invitert til <strong>{gruppe.navn}</strong>.
                      </>
                    )}
                  </span>
                  <span className="gruppeinvitasjon__meta">{gruppetilhorighet(gruppe)}</span>
                </span>
                <span className="gruppeinvitasjon__knapper">
                  <Button disabled={opptatt} aria-label={`Godta invitasjonen til ${gruppe.navn}`} onClick={() => svar(gruppe.id, gruppe.navn, true)}>
                    Godta
                  </Button>
                  <Button variant="kant" disabled={opptatt} aria-label={`Avslå invitasjonen til ${gruppe.navn}`} onClick={() => svar(gruppe.id, gruppe.navn, false)}>
                    Avslå
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {grupper.length === 0 ? (
        <p className="gruppeside__tomt">Du er ikke med i noen grupper ennå.</p>
      ) : (
        <>
          <div className="felt gruppeside__sok">
            <label className="kun-skjermleser" htmlFor={sokId}>
              Søk i gruppene
            </label>
            <input
              id={sokId}
              className="felt__inndata"
              type="search"
              placeholder="Søk i gruppene"
              value={sok}
              autoComplete="off"
              onChange={(e) => setSok(e.target.value)}
            />
          </div>
          <Gruppeliste navn="Gruppene dine" grupper={aktive} tom={sok.trim() ? 'Ingen grupper passer med søket.' : 'Ingen aktive grupper.'} />
          {arkiverte.length > 0 && <Gruppeliste navn="Arkiverte" grupper={arkiverte} synligTittel />}
        </>
      )}

      {ny && <OpprettGruppe apen onLukk={() => setNy(false)} />}
    </>
  )
}

function Gruppeliste({ navn, grupper, tom, synligTittel }: { navn: string; grupper: MinGruppe[]; tom?: string; synligTittel?: boolean }) {
  const id = useId()
  const lenker = useGruppesymbollenker(grupper)
  return (
    <section className="gruppeside__del" aria-labelledby={id}>
      <h2 id={id} className={synligTittel ? 'gruppeside__deltittel' : 'kun-skjermleser'}>
        {navn}
      </h2>
      {grupper.length === 0 ? (
        tom && <p className="gruppeside__tomt">{tom}</p>
      ) : (
        <ul className="gruppeliste">
          {grupper.map((g) => (
            <li key={g.id}>
              <a className="gruppeliste__rad" href={gruppeadresse(g.id)}>
                <Gruppesymbol gruppe={g} lenke={symbollenke(g, lenker)} />
                <span className="gruppeliste__navn">
                  <span className="gruppeliste__tittel">{g.navn}</span>
                  <span className="gruppeliste__meta">
                    {gruppetilhorighet(g)} · {antallMedlemmer(g.medlemmer)} · {g.rolle ? ROLLENAVN[g.rolle] : 'Ikke medlem'}
                  </span>
                </span>
                {g.status === 'arkivert' && <Merke tone="flate">Arkivert</Merke>}
                <Ikon navn="chev" storrelse="ui" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* --- Én gruppe --------------------------------------------------------------- */

/** En handling som fjerner tilgang, og som derfor må bekreftes. */
type Bekreftelse = { handling: 'fjern'; medlem: Gruppemedlem } | { handling: 'forlat' } | { handling: 'arkiver' }

type Gruppemodal = 'medlemmer' | 'innstillinger'

function Gruppedashboard({ id, overskrift, onLukk }: { id: string; overskrift: string; onLukk: () => void }) {
  const meg = useProfil()
  const { oppdater } = useGrupper()
  const { oversikt, lesefeil, hent } = useGruppeoversikt(id)
  const [modal, setModal] = useBevart<Gruppemodal | null>('modal', null)
  const [bekreft, setBekreft] = useBevart<Bekreftelse | null>('bekreft', null)
  const handling = useHandling()
  const { opptatt, utfor } = handling
  useFanetittel(oversikt?.navn ?? 'Gruppe')
  const symbollenker = useGruppesymbollenker(oversikt ? [oversikt] : [])

  if (!oversikt) {
    return (
      <>
        <Tilbakelenke reserve="Grupper" onTilbake={onLukk} />
        <Tittel id={overskrift}>Gruppe</Tittel>
        <p className={lesefeil ? 'skjemafeil' : 'gruppeside__ingress'} role={lesefeil ? 'alert' : undefined}>
          {lesefeil ?? 'Henter gruppen …'}
        </p>
      </>
    )
  }

  const g = oversikt
  const aktiv = g.status === 'aktiv'
  const apne = (m: Gruppemodal) => {
    handling.nullstill()
    setBekreft(null)
    setModal(m)
  }
  const lukkModal = () => {
    setBekreft(null)
    setModal(null)
  }

  /** Utfører handlingen, og henter gruppen og oversikten over gruppene på nytt. Sant når den lyktes. */
  const gjor = (arbeid: () => Promise<string | null | void>) =>
    utfor(async () => {
      const kvittering = await arbeid()
      setBekreft(null)
      oppdater()
      await hent()
      return kvittering
    })

  const bekreftelse = (b: Bekreftelse | null) => {
    if (!b) return null
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
          <Bekreftelseskort
            tittel={`Forlate ${g.navn}?`}
            bekreft="Forlat gruppen"
            opptatt={opptatt}
            onBekreft={() =>
              void utfor(async () => {
                await avsluttGruppemedlemskap(g.id, meg.id)
                oppdater()
                lukkModal()
                window.location.hash = GRUPPER
              })
            }
            onAvbryt={() => setBekreft(null)}
          >
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
      <Tilbakelenke reserve="Grupper" onTilbake={onLukk} />
      <header className="gruppeside__hode">
        <div className="gruppeside__tittelrad">
          <Gruppesymbol gruppe={g} lenke={symbollenke(g, symbollenker)} />
          <Tittel id={overskrift}>{g.navn}</Tittel>
          {harInnstillinger(g) && (
            <Button variant="subtle" icon={<Ikon navn="gears" />} onClick={() => apne('innstillinger')}>
              Gruppeinnstillinger
            </Button>
          )}
        </div>
        {g.beskrivelse && <p className="gruppeside__ingress">{g.beskrivelse}</p>}
        <div className="gruppeside__meta">
          <Medlemslinje gruppe={g} onVis={() => apne('medlemmer')} />
          <span>{gruppetilhorighet(g)}</span>
          {g.rolle ? (
            <Merke tone={g.rolle === 'medlem' ? 'noytral' : 'aksent'}>{ROLLENAVN[g.rolle]}</Merke>
          ) : (
            <Merke>Ikke medlem</Merke>
          )}
          {!aktiv && <Merke tone="flate">Arkivert</Merke>}
        </div>
      </header>

      {!aktiv && (
        <p className="gruppeside__lesemodus" role="note">
          <Ikon navn="arkiv" storrelse="ui" />
          Gruppen er arkivert. Du ser den i lesemodus, og ingenting i den kan endres.
        </p>
      )}

      <Gruppeaktivitet gruppe={g} />
      <Paneler gruppe={g} />

      {modal === 'medlemmer' && (
        <Medlemsmodal
          gruppe={g}
          meg={meg.id}
          apen
          onLukk={lukkModal}
          handling={handling}
          bekreftelse={bekreft?.handling === 'fjern' ? bekreftelse(bekreft) : null}
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
          onInviter={(brukernavn, navn = brukernavn) =>
            gjor(async () => {
              const svar = await inviterTilGruppe(g.id, brukernavn)
              return svar.status === 'aktiv' ? `${navn} er alt med i gruppen.` : `${navn} er invitert.`
            })
          }
        />
      )}
      {modal === 'innstillinger' && (
        <Innstillingsmodal
          gruppe={g}
          apen
          onLukk={lukkModal}
          handling={handling}
          bekreftelse={bekreft && bekreft.handling !== 'fjern' ? bekreftelse(bekreft) : null}
          onLagre={(navn, beskrivelse) =>
            gjor(async () => {
              await endreGruppe(g.id, navn, beskrivelse)
              return 'Gruppen er endret.'
            })
          }
          onSymbol={(valg) =>
            gjor(async () => {
              await settGruppesymbol(g.id, valg)
              return valg ? 'Symbolet er lagret.' : 'Symbolet er fjernet.'
            })
          }
          onArkiver={() => setBekreft({ handling: 'arkiver' })}
          onGjenapne={() =>
            gjor(async () => {
              await arkiverGruppe(g.id, false)
              return 'Gruppen er åpnet igjen.'
            })
          }
          onForlat={() => setBekreft({ handling: 'forlat' })}
        />
      )}
    </>
  )
}

/** Høyst så mange profilbilder i medlemslinjen. */
const AVATARER = 4

/** «PH KN ON AB  8 medlemmer · Vis medlemmer»: de første medlemmene og knappen til hele lista. */
function Medlemslinje({ gruppe, onVis }: { gruppe: Gruppeoversikt; onVis: () => void }) {
  const { aktive, inviterte } = delMedlemmer(gruppe.medlemmer)
  const forste = aktive.slice(0, AVATARER)
  const lenker = useAvatarlenker(forste)
  return (
    <span className="medlemslinje">
      {forste.length > 0 && (
        <span className="medlemslinje__bilder" aria-hidden="true">
          {forste.map((m) => {
            const lenke = m.avatar_path ? (lenker.get(m.avatar_path) ?? null) : null
            return (
              <Profilutlos key={m.id} person={m} lenke={lenke} variant="peker">
                <Avatar profil={m} storrelse="mini" lenke={lenke} />
              </Profilutlos>
            )
          })}
        </span>
      )}
      <button type="button" className="medlemslinje__knapp" onClick={onVis}>
        {antallMedlemmer(aktive.length)} · Vis medlemmer
        {inviterte.length > 0 && gruppe.kan_styre && <span className="kun-skjermleser">, {inviterte.length} venter på svar</span>}
      </button>
    </span>
  )
}

/* --- Panelene ------------------------------------------------------------------ */

/**
 * Et kort panel på gruppesiden: det felles oppsummeringskortet med ett kort
 * signal og én sekundærknapp. Hendelsene selv står under «Siste aktivitet»
 * (`Gruppeaktivitet`).
 */
function Gruppepanel({ ikon, tittel, signal, children }: { ikon: Ikonnavn; tittel: string; signal: string; children?: ReactNode }) {
  return (
    <Oppsummeringskort tittel={tittel} ikon={ikon} innhold={KLAR} tomtekst={signal}>
      {children && <div className="gruppepanel__handling">{children}</div>}
    </Oppsummeringskort>
  )
}

/** Panelene på gruppesiden har tallene sine med gruppen, og laster ikke for seg. */
const KLAR = { status: 'klar', hendelser: [] } as const

/** En lenke som ser ut som en sekundærknapp, så den kan åpnes i en ny fane. */
function Panellenke({ href, children }: { href: string; children: string }) {
  return (
    <a className="knapp knapp--kant" href={href}>
      <span className="knapp__tekst">{children}</span>
    </a>
  )
}

const flertall = (n: number, en: string, flere: string) => `${n} ${n === 1 ? en : flere}`

/**
 * De fire korte panelene: hvert med et kort signal og én knapp. Tallene er
 * gruppens samhandling (`gruppeoversikt`), de samme som fanene hadde.
 * Diskusjonene står i diskusjonsmenyen bare mens gruppen er aktiv, og chatten
 * i chatmenyen bare når den er slått på (`chat_uleste`).
 */
function Paneler({ gruppe: g }: { gruppe: Gruppeoversikt }) {
  const { nye_ideer, venter, mine_oppgaver, chat_uleste } = g.samhandling
  const aktiv = g.status === 'aktiv'
  return (
    <div className="gruppepaneler">
      <Gruppepanel
        ikon="idea"
        tittel="Idéer"
        signal={`${flertall(venter, 'åpen', 'åpne')} · ${flertall(nye_ideer, 'ny', 'nye')}${g.kan_styre && aktiv && venter > 0 ? ' · venter på behandling' : ''}`}
      >
        <Panellenke href={gruppeadresse(g.id, 'ideer')}>Åpne idéer</Panellenke>
      </Gruppepanel>
      <Gruppepanel
        ikon="oppgaver"
        tittel="Oppgaver"
        signal={mine_oppgaver > 0 ? `${mine_oppgaver} tildelt deg` : 'Ingen tildelt deg'}
      >
        <Panellenke href={gruppeadresse(g.id, 'oppgaver')}>Åpne oppgaver</Panellenke>
      </Gruppepanel>
      <Gruppepanel
        ikon="diskusjon"
        tittel="Diskusjoner"
        signal={aktiv ? 'Åpnes i diskusjonsmenyen; siden blir stående.' : 'Lukket mens gruppen er arkivert.'}
      >
        {aktiv && (
          <Button variant="kant" onClick={() => visDiskusjonene(gruppeside(g.id))}>
            Åpne diskusjoner
          </Button>
        )}
      </Gruppepanel>
      {chat_uleste !== null && (
        <Gruppepanel
          ikon="samtale"
          tittel="Gruppechat"
          signal={chat_uleste > 0 ? flertall(chat_uleste, 'ulest melding', 'uleste meldinger') : 'Ingen uleste meldinger'}
        >
          <Button variant="kant" onClick={() => visGruppesamtale(g.id)}>
            Åpne chat
          </Button>
        </Gruppepanel>
      )}
    </div>
  )
}
