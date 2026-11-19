import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { navnFeil, normaliserNavn, visningsnavn } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import { useBevart } from '../../oppdatering/Bevaring'
import {
  finnStilling,
  fjernStilling,
  fjernStillingskategori,
  flyttStilling,
  flyttStillingskategori,
  hentBrukereMedStilling,
  hentStillingsbruk,
  lagreStilling,
  lagreStillingskategori,
  oppfriskStillinger,
  settStilling,
  useStillinger,
  type Stilling,
  type Stillingsinnehaver,
  type Stillingskatalog,
  type Stillingskategori,
} from '../../stillinger/katalog'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Ikonknapp } from '../Ikonknapp'
import { Merke } from '../Merke'
import { Modallag } from '../Modallag'
import { Stillingsvelger } from '../stillinger/Stillingsvelger'
import { Bekreftknapp } from '../traad/Smadeler'
import { Avatar } from './Avatar'
import { Felt } from './Felt'

/** Det som skrives på: en ny eller endret kategori eller stilling (`id` er `null` for en ny). */
type Utkast =
  | { slag: 'kategori'; id: string | null; navn: string }
  | { slag: 'stilling'; id: string | null; kategori: string; navn: string }

/** Hvor i lista et utkast står: raden det endrer, eller kategorien en ny stilling skal i. */
const utkastsplass = (u: Utkast) => `${u.slag}:${u.id ?? (u.slag === 'stilling' ? `ny i ${u.kategori}` : 'ny')}`

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const melding = (aarsak: unknown) => (aarsak instanceof Error ? aarsak.message : UVENTET)
const antallBrukere = (n: number) => (n === 1 ? '1 bruker' : `${n} brukere`)

/**
 * Stillingslista, for systemarkitektene (docs/stillinger.md): kategoriene og
 * stillingene i dem, i rekkefølgen brukerne ser dem. Her legges de til, får
 * nytt navn, flyttes og fjernes. Ved hver stilling står hvor mange som har
 * den. En stilling noen har, fjernes på en egen side som viser hvem det
 * gjelder: de kan få en annen stilling alle på én gang, eller én og én.
 * Databasen kontrollerer hver endring på nytt.
 */
export function Stillinger({ apen, onLukk }: { apen: boolean; onLukk: () => void }) {
  const katalog = useStillinger()
  const [utkast, setUtkast] = useBevart<Utkast | null>('stillinger.utkast', null)
  const [fjernes, setFjernes] = useBevart<string | null>('stillinger.fjernes', null)
  const [bruk, setBruk] = useState<Map<string, number>>(new Map())
  const [feil, setFeil] = useState<string | null>(null)
  const [kvittering, setKvittering] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)

  const hentBruk = useCallback(async () => {
    try {
      setBruk(await hentStillingsbruk())
    } catch (aarsak) {
      setFeil(melding(aarsak))
    }
  }, [])

  useEffect(() => {
    if (!apen) return
    setFeil(null)
    setKvittering(null)
    void oppfriskStillinger()
    void hentBruk()
  }, [apen, hentBruk])

  /** Gjør endringen, viser kvitteringen eller feilen, og henter tallene på nytt. */
  const utfor = async (arbeid: () => Promise<string | null>): Promise<boolean> => {
    if (arbeider) return false
    setArbeider(true)
    setFeil(null)
    setKvittering(null)
    try {
      setKvittering(await arbeid())
      return true
    } catch (aarsak) {
      setFeil(melding(aarsak))
      return false
    } finally {
      await hentBruk()
      setArbeider(false)
    }
  }

  const lagre = async (hendelse: FormEvent) => {
    hendelse.preventDefault()
    if (!utkast) return
    const navn = normaliserNavn(utkast.navn)
    const lokalFeil = navnFeil(navn, 'Navnet')
    if (lokalFeil) {
      setFeil(lokalFeil)
      return
    }
    const ok = await utfor(async () => {
      if (utkast.slag === 'kategori') await lagreStillingskategori(utkast.id, navn)
      else await lagreStilling(utkast.id, utkast.kategori, navn)
      return null
    })
    if (ok) setUtkast(null)
  }

  const apneUtkast = (neste: Utkast | null) => {
    setFeil(null)
    setKvittering(null)
    setUtkast(neste)
  }

  const fjernet = finnStilling(katalog, fjernes)

  /** Skjemaet står der utkastet hører til: på raden det endrer, eller der det nye skal stå. */
  const skjema = (her: Utkast) =>
    utkast && utkastsplass(utkast) === utkastsplass(her) ? (
      <Utkastskjema
        utkast={utkast}
        katalog={katalog}
        arbeider={arbeider}
        onEndre={setUtkast}
        onLagre={(h) => void lagre(h)}
        onAvbryt={() => apneUtkast(null)}
      />
    ) : null

  return (
    <Modallag
      apen={apen}
      tittel="Stillinger"
      ikon="stilling"
      bred
      onLukk={onLukk}
      tilbake={
        fjernet
          ? {
              etikett: 'Tilbake til stillingene',
              onTilbake: () => setFjernes(null),
            }
          : undefined
      }
      handling={
        fjernet || (utkast?.slag === 'kategori' && utkast.id === null) ? null : (
          <Button
            className="knapp--kompakt"
            icon={<Ikon navn="plus" />}
            onClick={() => apneUtkast({ slag: 'kategori', id: null, navn: '' })}
          >
            Ny kategori
          </Button>
        )
      }
    >
      {fjernet ? (
        <Stillingsfjerning
          stilling={fjernet.stilling}
          katalog={katalog}
          onFjernet={(tekst) => {
            setFjernes(null)
            setKvittering(tekst)
            void hentBruk()
          }}
          onAvbryt={() => setFjernes(null)}
        />
      ) : (
        <>
          <p className="stillinger__ingress">
            Stillingene brukerne kan velge, i den rekkefølgen de vises. En stilling noen har, kan fjernes når de har
            fått en annen.
          </p>

          {skjema({ slag: 'kategori', id: null, navn: '' })}

          {feil && (
            <p className="skjemafeil" role="alert">
              {feil}
            </p>
          )}
          {kvittering && (
            <p className="brukerliste__kvittering" role="status">
              {kvittering}
            </p>
          )}

          {katalog.length === 0 ? (
            <p className="stillinger__tomt">Ingen stillinger ennå.</p>
          ) : (
            katalog.map((kategori, i) => (
              <Kategoriseksjon
                key={kategori.id}
                kategori={kategori}
                plass={i}
                antallKategorier={katalog.length}
                bruk={bruk}
                arbeider={arbeider}
                skjema={skjema}
                onUtkast={apneUtkast}
                onFjern={setFjernes}
                utfor={(arbeid) => void utfor(arbeid)}
              />
            ))
          )}
        </>
      )}
    </Modallag>
  )
}

/** En kategori: overskriften med handlingene, stillingene i den, og «Ny stilling». */
function Kategoriseksjon({
  kategori,
  plass,
  antallKategorier,
  bruk,
  arbeider,
  skjema,
  onUtkast,
  onFjern,
  utfor,
}: {
  kategori: Stillingskategori
  plass: number
  antallKategorier: number
  bruk: Map<string, number>
  arbeider: boolean
  skjema: (gjelder: Utkast) => ReactNode
  onUtkast: (utkast: Utkast) => void
  onFjern: (stilling: string) => void
  utfor: (arbeid: () => Promise<string | null>) => void
}) {
  const overskriftId = useId()
  const kategoriskjema = skjema({
    slag: 'kategori',
    id: kategori.id,
    navn: '',
  })
  const nyStilling = skjema({
    slag: 'stilling',
    id: null,
    kategori: kategori.id,
    navn: '',
  })
  const tom = kategori.stillinger.length === 0
  return (
    <section className="stillinger__kategori" aria-labelledby={overskriftId}>
      {kategoriskjema ?? (
        <div className="stillinger__hode">
          <h3 id={overskriftId} className="stillinger__kategorinavn">
            {kategori.navn}
          </h3>
          <span className="stillinger__knapper">
            <Flytteknapper
              navn={`kategorien ${kategori.navn}`}
              plass={plass}
              antall={antallKategorier}
              arbeider={arbeider}
              onFlytt={(indeks) => utfor(async () => (await flyttStillingskategori(kategori.id, indeks), null))}
            />
            <Button
              variant="kant"
              icon={<Ikon navn="edit" />}
              aria-label={`Endre navnet på kategorien ${kategori.navn}`}
              disabled={arbeider}
              onClick={() =>
                onUtkast({
                  slag: 'kategori',
                  id: kategori.id,
                  navn: kategori.navn,
                })
              }
            >
              Endre
            </Button>
            {tom && (
              <Bekreftknapp
                ikon="trash"
                tekst="Fjern"
                bekreftTekst="Bekreft"
                etikett={`Fjern kategorien ${kategori.navn}`}
                bekreftEtikett={`Bekreft at kategorien ${kategori.navn} fjernes`}
                onBekreft={() =>
                  utfor(async () => {
                    await fjernStillingskategori(kategori.id)
                    return `Kategorien ${kategori.navn} er fjernet.`
                  })
                }
              />
            )}
          </span>
        </div>
      )}

      {tom ? (
        <p className="stillinger__tomt">Ingen stillinger i kategorien. En tom kategori vises ikke for brukerne.</p>
      ) : (
        <ul className="stillinger__liste" aria-label={`Stillingene i ${kategori.navn}`}>
          {kategori.stillinger.map((stilling, i) => (
            <li key={stilling.id} className="stillinger__rad">
              {skjema({
                slag: 'stilling',
                id: stilling.id,
                kategori: stilling.kategori_id,
                navn: '',
              }) ?? (
                <Stillingsrad
                  stilling={stilling}
                  plass={i}
                  antall={kategori.stillinger.length}
                  brukere={bruk.get(stilling.id) ?? 0}
                  arbeider={arbeider}
                  onEndre={() =>
                    onUtkast({
                      slag: 'stilling',
                      id: stilling.id,
                      kategori: stilling.kategori_id,
                      navn: stilling.navn,
                    })
                  }
                  onFjern={() => onFjern(stilling.id)}
                  utfor={utfor}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {nyStilling ?? (
        <div className="skjema__knapper">
          <Button
            variant="kant"
            icon={<Ikon navn="plus" />}
            aria-label={`Ny stilling i ${kategori.navn}`}
            disabled={arbeider}
            onClick={() =>
              onUtkast({
                slag: 'stilling',
                id: null,
                kategori: kategori.id,
                navn: '',
              })
            }
          >
            Ny stilling
          </Button>
        </div>
      )}
    </section>
  )
}

/** En stilling: navnet, hvor mange som har den, og handlingene. */
function Stillingsrad({
  stilling,
  plass,
  antall,
  brukere,
  arbeider,
  onEndre,
  onFjern,
  utfor,
}: {
  stilling: Stilling
  plass: number
  antall: number
  brukere: number
  arbeider: boolean
  onEndre: () => void
  onFjern: () => void
  utfor: (arbeid: () => Promise<string | null>) => void
}) {
  return (
    <>
      <span className="stillinger__navn">
        {stilling.navn}
        {brukere > 0 && <Merke>{antallBrukere(brukere)}</Merke>}
      </span>
      <span className="stillinger__knapper">
        <Flytteknapper
          navn={stilling.navn}
          plass={plass}
          antall={antall}
          arbeider={arbeider}
          onFlytt={(indeks) => utfor(async () => (await flyttStilling(stilling.id, indeks), null))}
        />
        <Button
          variant="kant"
          icon={<Ikon navn="edit" />}
          aria-label={`Endre stillingen ${stilling.navn}`}
          disabled={arbeider}
          onClick={onEndre}
        >
          Endre
        </Button>
        {brukere > 0 ? (
          <Button
            variant="kant"
            icon={<Ikon navn="trash" />}
            aria-label={`Fjern stillingen ${stilling.navn}`}
            disabled={arbeider}
            onClick={onFjern}
          >
            Fjern
          </Button>
        ) : (
          <Bekreftknapp
            ikon="trash"
            tekst="Fjern"
            bekreftTekst="Bekreft"
            etikett={`Fjern stillingen ${stilling.navn}`}
            bekreftEtikett={`Bekreft at stillingen ${stilling.navn} fjernes`}
            onBekreft={() =>
              utfor(async () => {
                await fjernStilling(stilling.id)
                return `Stillingen ${stilling.navn} er fjernet.`
              })
            }
          />
        )}
      </span>
    </>
  )
}

/** Opp og ned i lista. Knappen i enden er slått av. */
function Flytteknapper({
  navn,
  plass,
  antall,
  arbeider,
  onFlytt,
}: {
  navn: string
  plass: number
  antall: number
  arbeider: boolean
  onFlytt: (indeks: number) => void
}) {
  return (
    <>
      <Ikonknapp
        ikon="opp"
        etikett={`Flytt ${navn} opp`}
        variant="kant"
        storrelse="liten"
        utenTips
        disabled={arbeider || plass === 0}
        onClick={() => onFlytt(plass - 1)}
      />
      <Ikonknapp
        ikon="ned"
        etikett={`Flytt ${navn} ned`}
        variant="kant"
        storrelse="liten"
        utenTips
        disabled={arbeider || plass === antall - 1}
        onClick={() => onFlytt(plass + 1)}
      />
    </>
  )
}

/** Skjemaet for en ny eller endret kategori eller stilling. En stilling kan også flyttes til en annen kategori. */
function Utkastskjema({
  utkast,
  katalog,
  arbeider,
  onEndre,
  onLagre,
  onAvbryt,
}: {
  utkast: Utkast
  katalog: Stillingskatalog
  arbeider: boolean
  onEndre: (utkast: Utkast) => void
  onLagre: (hendelse: FormEvent) => void
  onAvbryt: () => void
}) {
  const kategoriId = useId()
  const merkelapp =
    utkast.slag === 'kategori'
      ? utkast.id
        ? 'Nytt navn på kategorien'
        : 'Navnet på den nye kategorien'
      : utkast.id
        ? 'Navnet på stillingen'
        : 'Navnet på den nye stillingen'
  return (
    <form className="skjema stillinger__skjema" onSubmit={onLagre}>
      <div className="stillinger__felter">
        <Felt
          merkelapp={merkelapp}
          autoComplete="off"
          autoFocus
          value={utkast.navn}
          onChange={(e) => onEndre({ ...utkast, navn: e.target.value })}
        />
        {utkast.slag === 'stilling' && utkast.id && (
          <div className="felt">
            <label className="felt__merkelapp" htmlFor={kategoriId}>
              Kategori
            </label>
            <select
              id={kategoriId}
              className="felt__inndata"
              value={utkast.kategori}
              onChange={(e) => onEndre({ ...utkast, kategori: e.target.value })}
            >
              {katalog.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.navn}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="skjema__knapper">
        <Button type="submit" disabled={arbeider}>
          {arbeider ? 'Lagrer …' : 'Lagre'}
        </Button>
        <Button variant="subtle" onClick={onAvbryt}>
          Avbryt
        </Button>
      </div>
    </form>
  )
}

/**
 * Siden for å fjerne en stilling noen har. Den viser hvem som har den, med
 * fagmiljøene deres, og lar systemarkitekten velge en annen stilling til
 * alle på én gang (og fjerne den i samme operasjon), eller til én og én. Når
 * ingen lenger har den, kan den fjernes.
 */
function Stillingsfjerning({
  stilling,
  katalog,
  onFjernet,
  onAvbryt,
}: {
  stilling: Stilling
  katalog: Stillingskatalog
  onFjernet: (kvittering: string) => void
  onAvbryt: () => void
}) {
  const [brukere, setBrukere] = useState<Stillingsinnehaver[] | null>(null)
  const [alle, setAlle] = useState<string | null>(null)
  const [hver, setHver] = useState<Record<string, string | null>>({})
  const [feil, setFeil] = useState<string | null>(null)
  const [kvittering, setKvittering] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)
  const lenker = useAvatarlenker(brukere ?? [])

  const hent = useCallback(async () => {
    try {
      setBrukere(await hentBrukereMedStilling(stilling.id))
    } catch (aarsak) {
      setFeil(melding(aarsak))
    }
  }, [stilling.id])

  useEffect(() => {
    void hent()
  }, [hent])

  const utfor = async (arbeid: () => Promise<void>) => {
    if (arbeider) return
    setArbeider(true)
    setFeil(null)
    setKvittering(null)
    try {
      await arbeid()
    } catch (aarsak) {
      setFeil(melding(aarsak))
      await hent()
    } finally {
      setArbeider(false)
    }
  }

  const navnPaa = (id: string | null) => finnStilling(katalog, id)?.stilling.navn ?? ''

  const erstattForAlle = () =>
    void utfor(async () => {
      if (!alle) return
      const antall = await fjernStilling(stilling.id, alle)
      onFjernet(
        `Stillingen ${stilling.navn} er fjernet. ${antall === 1 ? 'Én bruker' : `${antall} brukere`} har fått stillingen ${navnPaa(alle)}.`,
      )
    })

  const erstattFor = (bruker: Stillingsinnehaver) =>
    void utfor(async () => {
      const ny = hver[bruker.id]
      if (!ny) return
      await settStilling(bruker.id, ny)
      setKvittering(`${visningsnavn(bruker)} har nå stillingen ${navnPaa(ny)}.`)
      await hent()
    })

  const fjernNaa = () =>
    void utfor(async () => {
      await fjernStilling(stilling.id)
      onFjernet(`Stillingen ${stilling.navn} er fjernet.`)
    })

  const igjen = brukere?.length ?? 0

  return (
    <div className="stillingsfjerning">
      <h3 className="stillingsfjerning__tittel">Fjerne stillingen {stilling.navn}</h3>

      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      {kvittering && (
        <p className="brukerliste__kvittering" role="status">
          {kvittering}
        </p>
      )}

      {brukere === null ? (
        !feil && <p className="stillinger__tomt">Henter brukerne …</p>
      ) : igjen === 0 ? (
        <>
          <p className="stillingsfjerning__tekst">Ingen har stillingen lenger, så den kan fjernes.</p>
          <div className="skjema__knapper">
            <Button icon={<Ikon navn="trash" />} disabled={arbeider} onClick={fjernNaa}>
              Fjern {stilling.navn}
            </Button>
            <Button variant="subtle" onClick={onAvbryt}>
              Avbryt
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="stillingsfjerning__tekst">
            {igjen === 1 ? 'Én bruker har' : `${igjen} brukere har`} denne stillingen. Gi dem en annen stilling før den
            fjernes: alle på én gang, eller én og én i lista under.
          </p>

          <form
            className="stillingsfjerning__alle"
            aria-label="Gi alle en annen stilling"
            onSubmit={(h) => {
              h.preventDefault()
              erstattForAlle()
            }}
          >
            <Stillingsvelger
              merkelapp="Ny stilling for alle"
              katalog={katalog}
              verdi={alle}
              unntatt={stilling.id}
              onEndre={setAlle}
            />
            <div className="skjema__knapper">
              <Button type="submit" disabled={arbeider || !alle}>
                Gi alle {navnPaa(alle) || 'den nye stillingen'} og fjern {stilling.navn}
              </Button>
              <Button variant="subtle" onClick={onAvbryt}>
                Avbryt
              </Button>
            </div>
          </form>

          <h4 className="stillingsfjerning__undertittel">Én og én</h4>
          <ul className="brukerliste stillingsfjerning__liste" aria-label={`Brukerne med stillingen ${stilling.navn}`}>
            {brukere.map((bruker) => {
              const navn = visningsnavn(bruker)
              return (
                <li key={bruker.id} className="brukerrad stillingsfjerning__rad">
                  <Avatar
                    profil={bruker}
                    lenke={bruker.avatar_path ? (lenker.get(bruker.avatar_path) ?? null) : null}
                  />
                  <span className="brukerrad__navn">
                    <span className="brukerrad__fullt">{navn}</span>
                    <span className="brukerrad__brukernavn">{[bruker.username, ...bruker.fagmiljoer].join(' · ')}</span>
                  </span>
                  <Stillingsvelger
                    merkelapp={`Ny stilling for ${navn}`}
                    skjultMerkelapp
                    katalog={katalog}
                    verdi={hver[bruker.id] ?? null}
                    unntatt={stilling.id}
                    disabled={arbeider}
                    onEndre={(ny) => setHver((forrige) => ({ ...forrige, [bruker.id]: ny }))}
                  />
                  <Button
                    variant="kant"
                    aria-label={`Lagre ny stilling for ${navn}`}
                    disabled={arbeider || !hver[bruker.id]}
                    onClick={() => erstattFor(bruker)}
                  >
                    Lagre
                  </Button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
