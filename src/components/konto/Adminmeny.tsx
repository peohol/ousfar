import { useCallback, useMemo, useState } from 'react'
import { klient } from '../../auth/klient'
import { harAdministrasjon, useRettigheter } from '../../auth/rettigheter'
import { useBevart } from '../../oppdatering/Bevaring'
import { kilderSomBorSesOver, lagDatakildeleser, type Datakildeleser } from '../../datakilder/status'
import { useJevnligSjekk } from '../../hooks/useJevnligSjekk'
import { Menyvalg, Nedtrekksmeny } from '../toppmeny/Nedtrekksmeny'
import { Autoerstattregler } from './Autoerstattregler'
import { Brukerliste } from './Brukerliste'
import { Datakilder } from './Datakilder'
import type { Kurateringsklient } from '../../kuratering/klient'
import { redaktorvarsel, type Fagsaklager } from '../../verktoy/overvaking/fagsak'
import type { Kildeovervakingslager } from '../../verktoy/overvaking/varsling'
import { Kurateringsoversikt } from '../kuratering/Utgavelister'
import { fagsaklager, Kildeovervaking } from './Kildeovervaking'
import { Verktoysperrer } from './Verktoysperrer'

/** Teksten ved prikken når kildeovervåkingen ikke kunne leses. */
const KILDEOVERVAKING_ULEST = 'kildeovervåkingen kunne ikke leses'

const PANELENE = ['brukere', 'datakilder', 'autoerstatt', 'kurateringer', 'verktoysperrer', 'kildeovervaking'] as const
type Panel = (typeof PANELENE)[number] | null

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
 * Administrasjonsmenyen i toppmenyen, til venstre for kontoen, etter
 * rettighetene databasen gir den innloggede (`useRettigheter`), ikke den gamle
 * adminrollen. Systemarkitektene får brukerne, driftstatusen for datakildene,
 * kurateringene, kildeovervåkingen og nødstoppen for de kliniske verktøyene,
 * og autoerstatt-reglene i teksteditorene. En lokal administrator får bare
 * «Brukere», der vedkommende kan gi nytt passord og opprette brukere etter
 * myndigheten sin. Andre ser den ikke. Den er et grensesnitt, ikke en
 * tilgangskontroll: databasen og Edge-funksjonene kontrollerer selv. Bør en datakilde ses over, eller
 * venter en faglig kildesak på beslutning (eller et mulig sikkerhetsproblem
 * vurderes), står det en prikk på knappen og på valget. Tekniske avvik i
 * kildeovervåkingen gir ingen prikk; de følges opp i det tekniske sporet.
 */
export function Adminmeny({
  leser,
  kuratering,
  kildelager,
  fagsaker,
}: {
  leser?: Datakildeleser
  kuratering?: Kurateringsklient
  kildelager?: Kildeovervakingslager
  fagsaker?: Fagsaklager
} = {}) {
  const rettigheter = useRettigheter()
  const admin = rettigheter.systemarkitekt
  const [panel, setPanel] = useBevart<Panel>('adminmeny', null)
  // Bare én endring per datakilde hentes; vurderingen er den samme som i panelet.
  const datakilder = useTilsyn(
    admin,
    useCallback(async () => kilderSomBorSesOver(await (leser ?? lagDatakildeleser(klient())).status(1)), [leser]),
  )
  // Bare de faglige sakene som venter på redaktøren; ingen frister.
  // Kildeovervåkingen er en sikkerhetskontroll, så en lesing som feiler, vises.
  const kilder = useTilsyn(
    admin,
    useCallback(async () => redaktorvarsel(await (fagsaker ?? fagsaklager()).les()), [fagsaker]),
    KILDEOVERVAKING_ULEST,
  )
  const { sjekk: sjekkDatakilder } = datakilder
  const { sjekk: sjekkKilder } = kilder
  // Hvert vindu lukker bare seg selv: når ett vindu åpner et annet (kildeovervåkingen
  // åpner nødstoppen), lukkes det første etterpå, og det skal ikke lukke det nye.
  const lukk = useMemo(
    () =>
      Object.fromEntries(
        PANELENE.map((navn) => [
          navn,
          () => {
            setPanel((naa) => (naa === navn ? null : naa))
            sjekkDatakilder()
            sjekkKilder()
          },
        ]),
      ) as Record<Exclude<Panel, null>, () => void>,
    [setPanel, sjekkDatakilder, sjekkKilder],
  )
  const sesOver = datakilder.meldinger.length ? `${datakilder.meldinger.join(', ')} bør ses over` : undefined
  const kildevarsel = kilder.meldinger.length ? kilder.meldinger.join('; ') : undefined
  const varsel = [sesOver, kildevarsel].filter(Boolean).join('; ') || undefined

  if (!harAdministrasjon(rettigheter)) return null

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
              {admin && (
                <>
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
                </>
              )}
            </ul>
          )
        }}
      </Nedtrekksmeny>
      <Brukerliste apen={panel === 'brukere'} onLukk={lukk.brukere} />
      {admin && (
        <>
          <Datakilder apen={panel === 'datakilder'} onLukk={lukk.datakilder} />
          <Autoerstattregler apen={panel === 'autoerstatt'} onLukk={lukk.autoerstatt} />
          <Kurateringsoversikt apen={panel === 'kurateringer'} klient={kuratering} onLukk={lukk.kurateringer} />
          <Kildeovervaking apen={panel === 'kildeovervaking'} lager={kildelager} fagsaker={fagsaker} onNodstopp={() => setPanel('verktoysperrer')} onLukk={lukk.kildeovervaking} />
          <Verktoysperrer apen={panel === 'verktoysperrer'} onLukk={lukk.verktoysperrer} />
        </>
      )}
    </>
  )
}
