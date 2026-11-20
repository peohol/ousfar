import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { klient } from '../../auth/klient'
import { kanGiRedaktoransvar, useRettigheter } from '../../auth/rettigheter'
import { useBevart } from '../../oppdatering/Bevaring'
import { kilderSomBorSesOver, lagDatakildeleser, type Datakildeleser } from '../../datakilder/status'
import { useJevnligSjekk } from '../../hooks/useJevnligSjekk'
import { useNaarLedig } from '../../hooks/useNaarLedig'
import { senere } from '../../oppdatering/senere'
import { NarApnet } from '../Senere'
import { adminstatus, adminvalg, lyttEtterAdminpanel, ADMINVALG, type Adminpanel } from './adminvisning'
import type { Kurateringsklient } from '../../kuratering/klient'
import { redaktorvarsel, type Fagsaklager } from '../../verktoy/overvaking/fagsak'
import type { Kildeovervakingslager } from '../../verktoy/overvaking/varsling'
import { fagsaklager } from './fagsaklager'

// Vinduene hentes første gang de åpnes; sjekkene under går uansett. Kildeovervåkingen
// og nødstoppen tar med seg reglene til verktøyene, som ingen andre trenger ved oppstart.
const Autoerstattregler = senere(() => import('./Autoerstattregler'), 'Autoerstattregler')
const Brukerliste = senere(() => import('./Brukerliste'), 'Brukerliste')
const Datakilder = senere(() => import('./Datakilder'), 'Datakilder')
const Redaktorer = senere(() => import('./Redaktorer'), 'Redaktorer')
const Stillinger = senere(() => import('./Stillinger'), 'Stillinger')
const Kurateringsoversikt = senere(() => import('../kuratering/Utgavelister'), 'Kurateringsoversikt')
const Kildeovervaking = senere(() => import('./Kildeovervaking'), 'Kildeovervaking')
const Verktoysperrer = senere(() => import('./Verktoysperrer'), 'Verktoysperrer')

/** Teksten ved prikken når kildeovervåkingen ikke kunne leses. */
const KILDEOVERVAKING_ULEST = 'kildeovervåkingen kunne ikke leses'

/**
 * Det som bør ses over, sjekket som idéene ser etter nye kommentarer: når
 * appen er åpnet og ledig, når fanen åpnes, jevnlig og når et vindu lukkes. `hent` gir det i korte
 * tekster (tomt når ingenting venter), og bør ha fast identitet. En sjekk som
 * feiler, endrer ingenting, med mindre `vedFeil` er gitt: da står den teksten,
 * så «kunne ikke leses» aldri ser ut som «ingenting venter». Neste sjekk
 * prøver igjen.
 */
function useTilsyn(admin: boolean, hent: () => Promise<string[]>, vedFeil?: string) {
  const [meldinger, setMeldinger] = useState<string[]>([])
  // Første sjekk venter til appen er vist og ledig: prikken er ingen grunn
  // til å konkurrere med det brukeren skal se først.
  const [ledig, setLedig] = useState(false)
  useNaarLedig(useCallback(() => setLedig(true), []))
  const sjekk = useCallback(() => {
    if (!admin || !ledig) return
    hent().then(setMeldinger, () => {
      if (vedFeil) setMeldinger([vedFeil])
    })
  }, [admin, ledig, hent, vedFeil])
  useJevnligSjekk(sjekk)
  return { meldinger, sjekk }
}

/**
 * Administrasjonens vinduer, etter rettighetene databasen gir den innloggede
 * (`useRettigheter`), ikke den gamle adminrollen. Veien inn er «Administrasjon»
 * i hovedmenyen (`adminvisning.ts`, D6). Systemarkitektene får brukerne,
 * driftstatusen for datakildene, kurateringene, kildeovervåkingen og
 * nødstoppen for de kliniske verktøyene, autoerstatt-reglene i
 * teksteditorene og stillingslista (docs/stillinger.md). En lokal administrator får «Brukere», der vedkommende kan
 * gi nytt passord og opprette brukere etter myndigheten sin, og «Redaktører»,
 * der vedkommende gir og tar tilbake redaktøransvar i eget fagmiljø (P5).
 * Andre får ingenting. Det er et grensesnitt, ikke en tilgangskontroll:
 * databasen og Edge-funksjonene kontrollerer selv.
 *
 * Bør en datakilde ses over, eller venter en faglig kildesak på beslutning
 * (eller et mulig sikkerhetsproblem vurderes), meldes det i `adminstatus`, og
 * hovedmenyen viser en prikk på knappen, på «Administrasjon» og på valget.
 * Tekniske avvik i kildeovervåkingen gir ingen prikk; de følges opp i det
 * tekniske sporet.
 */
export function Administrasjon({
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
  const redaktorer = kanGiRedaktoransvar(rettigheter)
  const tillatt = useMemo(() => new Set<Adminpanel>(adminvalg(rettigheter).map((v) => v.panel)), [rettigheter])
  // Nøkkelen er den gamle fra adminmenyen i toppmenyen, så et åpent vindu overlever oppdateringen.
  const [panel, setPanel] = useBevart<Adminpanel | null>('adminmeny', null)
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

  const sesOver = datakilder.meldinger.length ? `${datakilder.meldinger.join(', ')} bør ses over` : undefined
  const kildevarsel = kilder.meldinger.length ? kilder.meldinger.join('; ') : undefined
  useEffect(() => {
    adminstatus.sett({ ...(admin && sesOver && { datakilder: sesOver }), ...(admin && kildevarsel && { kildeovervaking: kildevarsel }) })
  }, [admin, sesOver, kildevarsel])
  // Ingen gammel status henger igjen etter utlogging.
  useEffect(() => () => adminstatus.sett({}), [])

  // Et vindu åpnes bare for den som har valget.
  useEffect(() => lyttEtterAdminpanel((neste) => tillatt.has(neste) && setPanel(neste)), [tillatt, setPanel])

  // Hvert vindu lukker bare seg selv: når ett vindu åpner et annet (kildeovervåkingen
  // åpner nødstoppen), lukkes det første etterpå, og det skal ikke lukke det nye.
  const lukk = useMemo(
    () =>
      Object.fromEntries(
        ADMINVALG.map(({ panel: navn }) => [
          navn,
          () => {
            setPanel((naa) => (naa === navn ? null : naa))
            sjekkDatakilder()
            sjekkKilder()
          },
        ]),
      ) as Record<Adminpanel, () => void>,
    [setPanel, sjekkDatakilder, sjekkKilder],
  )

  if (tillatt.size === 0) return null
  const apen = (navn: Adminpanel) => panel === navn && tillatt.has(navn)

  // Hvert vindu er med først når det har vært åpnet (`NarApnet`).
  const vindu = (navn: Adminpanel, innhold: ReactNode) => (
    <NarApnet key={navn} apen={apen(navn)}>
      {innhold}
    </NarApnet>
  )
  return (
    <>
      {vindu('brukere', <Brukerliste apen={apen('brukere')} onLukk={lukk.brukere} />)}
      {redaktorer && vindu('redaktorer', <Redaktorer apen={apen('redaktorer')} onLukk={lukk.redaktorer} />)}
      {admin && (
        <>
          {vindu('stillinger', <Stillinger apen={apen('stillinger')} onLukk={lukk.stillinger} />)}
          {vindu('datakilder', <Datakilder apen={apen('datakilder')} onLukk={lukk.datakilder} />)}
          {vindu('autoerstatt', <Autoerstattregler apen={apen('autoerstatt')} onLukk={lukk.autoerstatt} />)}
          {vindu('kurateringer', <Kurateringsoversikt apen={apen('kurateringer')} klient={kuratering} onLukk={lukk.kurateringer} />)}
          {vindu(
            'kildeovervaking',
            <Kildeovervaking
              apen={apen('kildeovervaking')}
              lager={kildelager}
              fagsaker={fagsaker}
              onNodstopp={() => setPanel('verktoysperrer')}
              onLukk={lukk.kildeovervaking}
            />,
          )}
          {vindu('verktoysperrer', <Verktoysperrer apen={apen('verktoysperrer')} onLukk={lukk.verktoysperrer} />)}
        </>
      )}
    </>
  )
}
