import { useId, useState } from 'react'
import { adresse, redigeringsrute, stoffadresse, versjonsadresse } from '../../../domain/rute'
import { onskRedigering } from '../../../faginnhold/redigeringsonske'
import { innholdsfelter } from '../../../faginnhold/innholdsfelter'
import { OBJEKTTYPER, type Objekttype } from '../../../faginnhold/modell'
import { behandle, markerInnarbeidet, muligeBehandlinger, taForslag, type Behandling } from '../../../forslag/behandling'
import { GRENSER, personnavn, type Forslag, type Forslagskonflikt, type Forslagsressurs } from '../../../forslag/modell'
import { useBevart } from '../../../oppdatering/Bevaring'
import { IKKE_PASIENTOPPLYSNINGER } from '../../../traad/modell'
import { Button } from '../../Button'
import { Historikkvindu } from '../../historikk/Historikkvindu'
import { useValgfriFaginnholdskilde } from '../../stoffside/Faginnholdskilde'
import { Tekstomrade } from '../Tekstomrade'
import '../../../styles/forslagsbehandling.css'

const UVENTET = 'Noe gikk galt. Prøv igjen.'

/** Skjemaet for hver behandling: knappen som åpner det, feltet og hva som skjer. */
const SKJEMA: Readonly<
  Record<
    Behandling,
    { knapp: string; merkelapp: string; send: string; kvittering: string; mangler?: string; forklaring?: string }
  >
> = {
  kommenter: {
    knapp: 'Kommenter',
    merkelapp: 'Kommentar til forslagsstilleren',
    send: 'Legg til kommentaren',
    kvittering: 'Kommentaren er lagt til.',
    mangler: 'Skriv en kommentar.',
  },
  presisering: {
    knapp: 'Be om presisering',
    merkelapp: 'Hva lurer du på?',
    send: 'Send spørsmålet',
    kvittering: 'Spørsmålet er sendt. Forslaget venter på svar fra forslagsstilleren.',
    mangler: 'Skriv spørsmålet.',
  },
  godkjenn: {
    knapp: 'Godkjenn',
    merkelapp: 'Begrunnelse (valgfritt)',
    send: 'Godkjenn forslaget',
    kvittering: 'Forslaget er godkjent. Arbeid det inn i utkastet, og marker det som innarbeidet.',
    forklaring: 'Et godkjent forslag publiseres ikke. Det arbeides inn i utkastet og publiseres etter den vanlige kontrollen.',
  },
  avvis: {
    knapp: 'Avvis',
    merkelapp: 'Hvorfor avvises forslaget?',
    send: 'Avvis forslaget',
    kvittering: 'Forslaget er avvist.',
    mangler: 'Skriv hvorfor forslaget avvises.',
    forklaring: 'Forslagsstilleren ser begrunnelsen.',
  },
}

/** Statusene der det betyr noe for avgjørelsen at innholdet er endret. */
const UAVGJORT = new Set(['ny', 'under_behandling', 'venter_pa_forslagsstiller', 'godkjent'])

/** Skjemaene som kan stå åpne: en behandling, eller bekreftelsen av innarbeidingen. */
type Apent = Behandling | 'innarbeid' | null

/**
 * Adressen til den vanlige redigeringen av innholdet forslaget gjelder: reglene
 * og kommentarene på fortolkningens redigeringsside, eller fagsiden, som da
 * åpnes i redigeringen (`redigeringsonske.ts`).
 */
export function utkastlenke(ressurs: Forslagsressurs): { href: string; onClick?: () => void } | null {
  if (ressurs.type === 'infoside') {
    const stoff = ressurs.stoff
    return stoff ? { href: stoffadresse(stoff), onClick: () => onskRedigering(stoff) } : null
  }
  return ressurs.analyttkode ? { href: adresse(redigeringsrute(ressurs.analyttkode)) } : null
}

const erObjekttype = (type: string): type is Objekttype => (OBJEKTTYPER as readonly string[]).includes(type)

/**
 * Hva som er endret siden forslaget ble skrevet, med ordene behandleren
 * trenger: det forslaget gjelder (elementet eller ressursen), resten av
 * fagsiden, og utkastet som ikke er publisert.
 */
export function konfliktmerknad(k: Forslagskonflikt): string {
  const deler: string[] = []
  if (k.endret_siden) {
    deler.push(
      `Innholdet er endret siden forslaget ble skrevet. Forslaget gjelder revisjon ${k.grunnrevisjon}${
        k.publisert_revisjon ? `, og revisjon ${k.publisert_revisjon} er publisert nå` : ''
      }.`,
    )
  }
  if (k.side_endret_siden) {
    deler.push(
      `Fagsiden er publisert på nytt siden forslaget ble skrevet mot versjon ${k.sideversjon}${
        k.publisert_sideversjon ? `; versjon ${k.publisert_sideversjon} er den gjeldende` : ''
      }. Den tidligere versjonen kan sammenlignes med den gjeldende.`,
    )
  }
  if (!k.endret_siden && !k.side_endret_siden) deler.push('Det publiserte er som da forslaget ble skrevet.')
  if (k.utkast_endret) deler.push('Utkastet har endringer som ikke er publisert, og de vises i redigeringen.')
  return deler.join(' ')
}

/**
 * Det den som behandler forslaget, kan gjøre (P5 tråd C): ta det, kommentere,
 * be om en presisering, godkjenne, avvise med begrunnelse, åpne utkastet og
 * markere et godkjent forslag som innarbeidet. Er innholdet endret siden
 * forslaget ble skrevet, sier siden det, med historikken for sammenligning;
 * ingenting skrives over. Knappene er et grensesnitt: databasen kontrollerer
 * hver handling på nytt, og en som kom først, gir en melding om at forslaget
 * er endret i mellomtiden.
 */
export function Behandlerhandlinger({ forslag: f, oppfrisk }: { forslag: Forslag; oppfrisk: () => void | Promise<void> }) {
  const overskrift = useId()
  const [apent, setApent] = useBevart<Apent>('behandling', null)
  const [tekst, setTekst] = useBevart('behandlingstekst', '')
  const [historikk, setHistorikk] = useState(false)
  const [opptatt, setOpptatt] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const [kvittering, setKvittering] = useState<string | null>(null)
  const faginnhold = useValgfriFaginnholdskilde()

  if (!f.kan_behandle) return null
  const { ta, behandlinger, innarbeid } = muligeBehandlinger(f)
  const utkast = f.status === 'trukket' || f.status === 'avvist' ? null : utkastlenke(f.ressurs)
  const k = f.konflikt
  const endret = k.endret_siden || k.side_endret_siden
  const objekt = f.element ?? { id: f.ressurs.id, type: f.ressurs.type }
  const kanSammenligne = faginnhold !== null && erObjekttype(objekt.type)
  // Historikken sammenligner det publiserte med revisjonen forslaget bygger
  // på, og vises bare når de er forskjellige. Utkastet og resten av fagsiden
  // har hver sin vei: redigeringen og den tidligere fagsideversjonen.
  const visEndringer = kanSammenligne && k.endret_siden
  const sideversjon =
    k.side_endret_siden && k.sideversjon !== null && f.ressurs.stoff
      ? {
          href: versjonsadresse(f.ressurs.stoff, k.sideversjon),
          tekst: `Se fagsiden slik den var (versjon ${k.sideversjon})`,
        }
      : null

  const apne = (skjema: Apent) => {
    setApent(skjema)
    setTekst('')
    setFeil(null)
  }

  const utfor = async (handling: () => Promise<void>, ferdig: string) => {
    setOpptatt(true)
    setFeil(null)
    setKvittering(null)
    try {
      await handling()
      setApent(null)
      setTekst('')
      setKvittering(ferdig)
      await oppfrisk()
    } catch (aarsak) {
      setFeil(aarsak instanceof Error ? aarsak.message : UVENTET)
    } finally {
      setOpptatt(false)
    }
  }

  const skjema = apent && apent !== 'innarbeid' ? SKJEMA[apent] : null

  return (
    <section className="forslagsvisning__del behandling" aria-labelledby={overskrift}>
      <h2 id={overskrift} className="gruppeside__deltittel">
        Behandling
      </h2>
      <p className="behandling__hvem">
        {f.behandler
          ? f.behandler.er_meg
            ? 'Du behandler forslaget.'
            : `${personnavn(f.behandler, 'En annen')} behandler forslaget.`
          : f.status === 'ny'
            ? 'Ingen har tatt forslaget ennå.'
            : 'Ingen behandler forslaget nå.'}
        {f.innarbeidet && ` Arbeidet inn i revisjon ${f.innarbeidet.revisjon} av utkastet.`}
      </p>

      {(endret || k.utkast_endret) && UAVGJORT.has(f.status) && (
        <div className="behandling__konflikt" role="note" aria-label="Innholdet er endret">
          <p>{konfliktmerknad(k)} Se over hva som er endret før du avgjør; ingenting skrives over.</p>
          {(visEndringer || sideversjon || (k.utkast_endret && utkast)) && (
            <div className="behandling__konfliktvalg">
              {visEndringer && (
                <Button variant="kant" className="knapp--kompakt" onClick={() => setHistorikk(true)}>
                  Se hva som er endret
                </Button>
              )}
              {sideversjon && (
                <a className="knapp knapp--kant knapp--kompakt" href={sideversjon.href}>
                  {sideversjon.tekst}
                </a>
              )}
              {k.utkast_endret && utkast && (
                <a className="knapp knapp--kant knapp--kompakt" href={utkast.href} onClick={utkast.onClick}>
                  Se utkastet
                </a>
              )}
            </div>
          )}
        </div>
      )}

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

      {skjema && apent && apent !== 'innarbeid' ? (
        <form
          className="gruppeside__skjema forslagsskjema"
          // Feltet er merket påkrevd for skjermlesere; meldingen er appens egen.
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (skjema.mangler && !tekst.trim()) {
              setFeil(skjema.mangler)
              return
            }
            void utfor(() => behandle(apent, f.id, tekst), skjema.kvittering)
          }}
        >
          {skjema.forklaring && <p className="forslagsskjema__ingress">{skjema.forklaring}</p>}
          {apent === 'godkjenn' && endret && (
            <p className="forslagsskjema__ingress">
              Innholdet er endret siden forslaget ble skrevet. Det blir notert i historikken at du har sett det.
            </p>
          )}
          <Tekstomrade
            merkelapp={skjema.merkelapp}
            verdi={tekst}
            onEndre={setTekst}
            maks={GRENSER.svar}
            pakrevd={Boolean(skjema.mangler)}
            hjelp={IKKE_PASIENTOPPLYSNINGER}
            autoFocus
          />
          <div className="gruppeside__handlinger">
            <Button variant="subtle" onClick={() => apne(null)}>
              Avbryt
            </Button>
            <Button type="submit" className="knapp--kompakt" disabled={opptatt}>
              {skjema.send}
            </Button>
          </div>
        </form>
      ) : apent === 'innarbeid' ? (
        <form
          className="gruppeside__skjema forslagsskjema"
          onSubmit={(e) => {
            e.preventDefault()
            void utfor(() => markerInnarbeidet(f.id), 'Forslaget er markert som innarbeidet i utkastet.')
          }}
        >
          <p className="forslagsskjema__ingress">
            Gjør dette når endringen er lagret i utkastet. Forslaget kobles til revisjonen utkastet står på nå, og
            forslagsstilleren får beskjed. Utkastet publiseres som vanlig.
          </p>
          <div className="gruppeside__handlinger">
            <Button variant="subtle" onClick={() => apne(null)}>
              Avbryt
            </Button>
            <Button type="submit" className="knapp--kompakt" disabled={opptatt}>
              Marker som innarbeidet
            </Button>
          </div>
        </form>
      ) : (
        <div className="gruppeside__handlinger">
          {ta && (
            <Button
              className="knapp--kompakt"
              disabled={opptatt}
              onClick={() => void utfor(() => taForslag(f.id), f.behandler ? 'Du har tatt over forslaget.' : 'Du har tatt forslaget.')}
            >
              {f.behandler ? 'Ta over' : 'Ta forslaget'}
            </Button>
          )}
          {behandlinger.map((b) => (
            <Button key={b} variant="kant" className="knapp--kompakt" disabled={opptatt} onClick={() => apne(b)}>
              {SKJEMA[b].knapp}
            </Button>
          ))}
          {innarbeid && (
            <Button className="knapp--kompakt" disabled={opptatt} onClick={() => apne('innarbeid')}>
              Marker som innarbeidet
            </Button>
          )}
          {utkast && (
            <a className="knapp knapp--kant knapp--kompakt" href={utkast.href} onClick={utkast.onClick}>
              Åpne utkastet
            </a>
          )}
        </div>
      )}

      {historikk && visEndringer && (
        <Historikkvindu
          apen
          navn={f.sted ?? f.ressurs.navn}
          objekt={objekt.id}
          felter={(innhold) => innholdsfelter(objekt.type as Objekttype, innhold as never)}
          forstValgt={k.publisert_revisjon ?? undefined}
          forstMot={k.grunnrevisjon || null}
          onLukk={() => setHistorikk(false)}
        />
      )}
    </section>
  )
}
