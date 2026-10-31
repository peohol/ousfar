import { useCallback, useState } from 'react'
import { klient } from '../../auth/klient'
import { useBevart } from '../../oppdatering/Bevaring'
import { useProfil } from '../../auth/okt'
import { kilderSomBorSesOver, lagDatakildeleser, type Datakildeleser } from '../../datakilder/status'
import { useJevnligSjekk } from '../../hooks/useJevnligSjekk'
import { Menyvalg, Nedtrekksmeny } from '../toppmeny/Nedtrekksmeny'
import { Autoerstattregler } from './Autoerstattregler'
import { Brukerliste } from './Brukerliste'
import { Datakilder } from './Datakilder'
import type { Kurateringsklient } from '../../kuratering/klient'
import { oppmerksomhet, type Kildeovervakingslager } from '../../verktoy/overvaking/varsling'
import { Kurateringsoversikt } from '../kuratering/Utgavelister'
import { Kildeovervaking, kildeovervakingslager } from './Kildeovervaking'
import { Verktoysperrer } from './Verktoysperrer'

/** Teksten ved prikken når kildeovervåkingen ikke kunne leses. */
const KILDEOVERVAKING_ULEST = 'kildeovervåkingen kunne ikke leses'

type Panel = 'brukere' | 'datakilder' | 'autoerstatt' | 'kurateringer' | 'verktoysperrer' | 'kildeovervaking' | null

/**
 * Det som bør ses over, sjekket som idémenyen ser etter nye kommentarer: når
 * appen og fanen åpnes, jevnlig og når et panel lukkes. `hent` gir det i korte
 * tekster (tomt når ingenting venter), og bør ha fast identitet. En sjekk som
 * feiler, endrer ingenting, med mindre `vedFeil` er gitt: da står den teksten,
 * så «kunne ikke leses» aldri ser ut som «ingenting venter». Neste sjekk
 * prøver igjen.
 */
function useTilsyn(admin: boolean, hent: () => Promise<string[]>, vedFeil?: string) {
  const [meldinger, setMeldinger] = useState<string[]>([])
  const sjekk = useCallback(() => {
    if (!admin) return
    hent().then(setMeldinger, () => {
      if (vedFeil) setMeldinger([vedFeil])
    })
  }, [admin, hent, vedFeil])
  useJevnligSjekk(sjekk)
  return { meldinger, sjekk }
}

/**
 * Administratorenes egen meny i toppmenyen, til venstre for kontoen: brukerne,
 * driftstatusen for datakildene, kildeovervåkingen og nødstoppen for de
 * kliniske verktøyene, og autoerstatt-reglene i teksteditorene. Andre ser den
 * ikke. Den er et grensesnitt, ikke en tilgangskontroll: databasen og
 * Edge-funksjonene slår opp rollen selv. Bør en datakilde ses over, eller
 * venter et funn fra kildeovervåkingen, står det en prikk på knappen og på
 * valget.
 */
export function Adminmeny({ leser, kuratering, kildelager }: { leser?: Datakildeleser; kuratering?: Kurateringsklient; kildelager?: Kildeovervakingslager } = {}) {
  const admin = useProfil().role === 'admin'
  const [panel, setPanel] = useBevart<Panel>('adminmeny', null)
  // Bare én endring per datakilde hentes; vurderingen er den samme som i panelet.
  const datakilder = useTilsyn(
    admin,
    useCallback(async () => kilderSomBorSesOver(await (leser ?? lagDatakildeleser(klient())).status(1)), [leser]),
  )
  // Bare de åpne funnene og den siste kjøringen; fristene regnes som i vinduet.
  // Kildeovervåkingen er en sikkerhetskontroll, så en lesing som feiler, vises.
  const kilder = useTilsyn(
    admin,
    useCallback(async () => oppmerksomhet(await (kildelager ?? kildeovervakingslager()).les(0), Date.now()), [kildelager]),
    KILDEOVERVAKING_ULEST,
  )
  const { sjekk: sjekkDatakilder } = datakilder
  const { sjekk: sjekkKilder } = kilder
  const lukkPanel = useCallback(() => {
    setPanel(null)
    sjekkDatakilder()
    sjekkKilder()
  }, [sjekkDatakilder, sjekkKilder])
  const sesOver = datakilder.meldinger.length ? `${datakilder.meldinger.join(', ')} bør ses over` : undefined
  const kildevarsel = kilder.meldinger.length ? kilder.meldinger.join('; ') : undefined
  const varsel = [sesOver, kildevarsel].filter(Boolean).join('; ') || undefined

  if (!admin) return null

  return (
    <>
      <Nedtrekksmeny
        className="adminmeny"
        knapp={{
          ikon: 'shield',
          etikett: `Administrasjon${varsel ? ` (${varsel})` : ''}`,
          variant: 'stille',
          storrelse: 'liten',
        }}
        etikett="Administrasjon"
        lag="adminmeny"
        ved={varsel && <span className="nyprikk toppmeny__prikk" aria-hidden="true" />}
      >
        {(lukk) => {
          /** Et valg lukker menyen først, så vinduet det åpner gir fokus tilbake til knappen. */
          const apne = (neste: Exclude<Panel, null>) => () => {
            lukk()
            setPanel(neste)
          }
          return (
            <ul className="nedtrekk__valg">
              <li>
                <Menyvalg ikon="user" tekst="Brukere" onClick={apne('brukere')} />
              </li>
              <li>
                <Menyvalg ikon="reset" tekst="Datakilder" nytt={sesOver} onClick={apne('datakilder')} />
              </li>
              <li>
                <Menyvalg ikon="oppgaver" tekst="Kurateringer" onClick={apne('kurateringer')} />
              </li>
              <li>
                <Menyvalg ikon="refs" tekst="Kildeovervåking" nytt={kildevarsel} onClick={apne('kildeovervaking')} />
              </li>
              <li>
                <Menyvalg ikon="lock" tekst="Kliniske verktøy" onClick={apne('verktoysperrer')} />
              </li>
              <li>
                <Menyvalg ikon="edit" tekst="Autoerstatt" onClick={apne('autoerstatt')} />
              </li>
            </ul>
          )
        }}
      </Nedtrekksmeny>
      <Brukerliste apen={panel === 'brukere'} onLukk={lukkPanel} />
      <Datakilder apen={panel === 'datakilder'} onLukk={lukkPanel} />
      <Autoerstattregler apen={panel === 'autoerstatt'} onLukk={lukkPanel} />
      <Kurateringsoversikt apen={panel === 'kurateringer'} klient={kuratering} onLukk={lukkPanel} />
      <Kildeovervaking apen={panel === 'kildeovervaking'} lager={kildelager} onLukk={lukkPanel} />
      <Verktoysperrer apen={panel === 'verktoysperrer'} onLukk={lukkPanel} />
    </>
  )
}
