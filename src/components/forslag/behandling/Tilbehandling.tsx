import { useEffect, useState } from 'react'
import { useRettigheter } from '../../../auth/rettigheter'
import { forslagsadresse } from '../../../domain/rute'
import { hentForslagsantall, hentForslagsko, ventende, type Korad } from '../../../forslag/behandling'
import { forst } from '../../../forslag/modell'
import { useBevart } from '../../../oppdatering/Bevaring'
import { Bryter } from '../../Bryter'
import { Merke } from '../../Merke'
import { Menyvalg } from '../../toppmeny/Nedtrekksmeny'
import { Forslagslenke, useHentet } from '../Forslagsside'
import '../../../styles/forslagsbehandling.css'

/** Listene i arbeidskøen, i den rekkefølgen de står. */
const UTVALG = [
  { verdi: 'nye', tekst: 'Nye', tom: 'Ingen nye forslag venter.' },
  { verdi: 'pagaende', tekst: 'Pågående', tom: 'Ingen forslag er under behandling.' },
  { verdi: 'ferdige', tekst: 'Ferdige', tom: 'Ingen forslag er ferdigbehandlet ennå.' },
] as const
type Utvalg = (typeof UTVALG)[number]['verdi']

/** Fanen «Til behandling» på `#/forslag`, bare for dem som behandler forslag. */
export function TilbehandlingFane({ aktiv }: { aktiv: boolean }) {
  if (!useRettigheter().behandlerForslag) return null
  return (
    <li>
      <a className="gruppeside__fane" href={forslagsadresse(undefined, 'behandling')} aria-current={aktiv ? 'page' : undefined}>
        Til behandling
      </a>
    </li>
  )
}

/**
 * Arbeidskøen (`#/forslag/til-behandling`): forslagene til innholdet den
 * innloggede kan behandle, som nye, pågående og ferdige, og et filter for dem
 * ingen redaktør har ansvaret for. Databasen avgjør hva som står her
 * (`les_forslagsko`); andre fagmiljøers lokale innhold kommer aldri med.
 */
export function Tilbehandling() {
  const { tilstand } = useHentet(hentForslagsko)
  const [utvalg, setUtvalg] = useBevart<Utvalg>('utvalg', 'nye')
  const [utenRedaktor, setUtenRedaktor] = useBevart('uten-redaktor', false)

  if (tilstand.status === 'laster') return <p className="gruppeside__hint">Henter forslagene …</p>
  if (tilstand.status === 'feil') {
    return (
      <p className="skjemafeil" role="alert">
        {tilstand.melding}
      </p>
    )
  }
  const ko = tilstand.data
  const filtrert = (rader: readonly Korad[]) => (utenRedaktor ? rader.filter((r) => r.uten_redaktor) : rader)
  const valgt = UTVALG.find((u) => u.verdi === utvalg) ?? UTVALG[0]
  // De den innloggede behandler selv, står øverst (D6).
  const rader = forst(filtrert(ko[valgt.verdi]), (r) => r.behandler_er_meg)

  return (
    <div className="forslagsko">
      <div className="forslagsko__valg">
        <div className="gruppeside__faner" role="group" aria-label="Vis forslagene">
          {UTVALG.map((u) => (
            <button
              key={u.verdi}
              type="button"
              className="gruppeside__fane forslagsko__utvalg"
              aria-pressed={u.verdi === valgt.verdi}
              onClick={() => setUtvalg(u.verdi)}
            >
              {u.tekst} <span className="forslagsko__tall">{filtrert(ko[u.verdi]).length}</span>
            </button>
          ))}
        </div>
        <Bryter pa={utenRedaktor} onEndre={setUtenRedaktor}>
          Bare uten redaktør
        </Bryter>
      </div>
      {rader.length === 0 ? (
        <p className="gruppeside__hint">{utenRedaktor ? 'Ingen forslag uten redaktør i denne listen.' : valgt.tom}</p>
      ) : (
        <ul className="forslagsliste" aria-label={`${valgt.tekst} forslag`}>
          {rader.map((r) => (
            <li key={r.id}>
              <Forslagslenke rad={r} behandler>
                <Koradtillegg rad={r} ferdig={valgt.verdi === 'ferdige'} />
              </Forslagslenke>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Det køen sier om forslaget i tillegg: hvem det er fra, hvem som behandler det, og merkene. */
function Koradtillegg({ rad, ferdig }: { rad: Korad; ferdig: boolean }) {
  const fra = rad.stilt_av?.er_meg ? 'ditt eget forslag' : `fra ${rad.stilt_av?.navn ?? 'en bruker'}`
  const hvem = ferdig ? '' : rad.behandler_er_meg ? ' · du behandler det' : rad.har_behandler ? ' · en annen behandler det' : ''
  return (
    <>
      {` · ${fra}${hvem}`}
      {(rad.uten_redaktor || (!ferdig && rad.endret_siden)) && (
        <span className="forslagsko__merker">
          {rad.uten_redaktor && <Merke>Uten redaktør</Merke>}
          {!ferdig && rad.endret_siden && <Merke tone="alvorlig">Innholdet er endret siden</Merke>}
        </span>
      )}
    </>
  )
}

/**
 * «Til behandling» i kontomenyen, med tallet på forslag som venter: de ingen
 * har tatt, og dem den innloggede behandler. Bare for dem som behandler
 * forslag. Tallet hentes på nytt hver gang `apning` endres, det vil si hver
 * gang menyen åpnes, siden menyen står i dokumentet også når den er lukket.
 */
export function TilbehandlingMenyvalg({ onGaa, apning = 0 }: { onGaa: () => void; apning?: number }) {
  const behandler = useRettigheter().behandlerForslag
  const [antall, setAntall] = useState<number | null>(null)
  useEffect(() => {
    if (!behandler) return
    let gjelder = true
    hentForslagsantall()
      .then((a) => gjelder && setAntall(ventende(a)))
      .catch(() => gjelder && setAntall(null))
    return () => {
      gjelder = false
    }
  }, [behandler, apning])
  if (!behandler) return null
  return (
    <li>
      <Menyvalg
        ikon="edit"
        tekst="Til behandling"
        forklaring={antall ? (antall === 1 ? 'Ett forslag venter' : `${antall} forslag venter`) : undefined}
        onClick={() => {
          onGaa()
          window.location.hash = forslagsadresse(undefined, 'behandling')
        }}
      />
    </li>
  )
}
