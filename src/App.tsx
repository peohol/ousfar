import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useProfil } from './auth/okt'
import { RettigheterKilde, useMineRettigheter, useOppdaterRettigheter, type OppdaterRettigheter, type Rettigheter } from './auth/rettigheter'
import { kanRedigereKodene, redigeringsrett, useLokalEndringsrett } from './faginnhold/redigeringsrett'
import { redigerbareRegelsett } from './redaktorer/ansvar'
import { useMineRedaktoransvar } from './redaktorer/useMineRedaktoransvar'
import { iBakgrunnen } from './auth/aktivitet'
import { klient } from './auth/klient'
import { nettleserlager } from './auth/mellomlager'
import { FaginnholdskildeProvider, type Faginnholdskilde } from './components/stoffside/Faginnholdskilde'
import { SearchStep } from './components/SearchStep'
import { BandStep } from './components/BandStep'
import { EtgPasteStep } from './components/EtgPasteStep'
import { EtgStep } from './components/EtgStep'
import { KontrollStep } from './components/KontrollStep'
import { PasteStep } from './components/PasteStep'
import { RusStep } from './components/RusStep'
import { useHentScenarioregler } from './components/regler/Scenarioreglerkilde'
import { Sidemeny, sidemenyenErApen } from './components/Sidemeny'
import { ThcStep } from './components/ThcStep'
import { BeUrinStep } from './components/BeUrinStep'
import { CopyFlash } from './components/CopyFlash'
import { Senere } from './components/Senere'
import { ruteAv } from './components/Kopibevis'
import { Idelag } from './components/ideer/Idelag'
import { Administrasjon } from './components/konto/Administrasjon'
import { Kontomeny } from './components/konto/Kontomeny'
import { Varselknapp } from './components/varsler/Varselknapp'
import { Fagsok } from './components/sok/Fagsok'
import { Sokeside } from './components/sok/Sokeside'
import { Toppmeny } from './components/toppmeny/Toppmeny'
import { ToppmenyInnhold, ToppmenyKilde } from './components/toppmeny/Toppmenykilde'
import { Ikonknapp } from './components/Ikonknapp'
import { Button } from './components/Button'
import { Ikon } from './components/ikon/Ikon'
import { Versjonspille } from './components/Versjonspille'
import { Chatmeny } from './components/chat/Chatmeny'
import { Chatvarselvakt } from './components/chat/Chatvarselvakt'
import { Chatknapp } from './components/chat/Chatknapp'
import { Direktelenkekilde } from './components/direktelenker/Direktelenkekilde'
import { Lenkemelding } from './components/direktelenker/Lenkemelding'
import { apneFraAdressen } from './components/direktelenker/navigasjon'
import {
  diskusjonssideFor,
  diskusjonssider,
  fortolkningsemne,
  fortolkningssidenavn,
  gruppeForSide,
  gruppesidenavn,
} from './diskusjoner/modell'
import { GruppekildeProvider, useMineGrupper, type Gruppekilde } from './grupper/kilde'
import { FavorittkildeProvider } from './favoritter/Favorittkilde'
import { AutoerstattProvider } from './autoerstatt/Autoerstattkilde'
import { MaleenhetKilde } from './enheter/Maleenhet'
import { lagAutoerstattlager } from './autoerstatt/lagring'
import { lagFavorittlager } from './favoritter/lagring'
import { filtrertPool } from './domain/analysemetoder'
import { erEtgAnalytt, etgTilfeller, type EtgAlternativ, type Etgtilfeller } from './domain/etg'
import type { Rute } from './domain/flytting'
import { erRedigering, FORSIDE, fortolkningsnokkel, fortolkningsrute, lesRute, redigeringsrute, sidesti } from './domain/rute'
import { Forside } from './components/forside/Forside'
import { Ukjentside } from './components/forside/Ukjentside'
import { rusModulFor } from './domain/rus'
import { erThcAnalytt } from './domain/thc'
import { search } from './domain/search'
import { BEVEGELSE, TEMA } from './domain/systemvalg'
import {
  CUTOFF_NOKKEL,
  CUTOFF_SPORSMAL,
  cutoffvalg,
  regelsettvalg,
  type Kommentarvalg,
} from './domain/valg'
import { lagFaginnholdslager, lagerFor } from './faginnhold/lagring'
import { lagFaginnholdsleser } from './faginnhold/lesing'
import { lagKurateringsklient } from './kuratering/klient'
import { lagEndringsloggleser } from './endringslogg/api'
import type { Endringskontekst } from './endringslogg/operasjon'
import { endringssideFor } from './endringslogg/sider'
import { analytterForFortolkning, referanseomraderI } from './domain/analyttkatalog'
import { stoffbeskrivelse } from './domain/stoffregister'
import { Innholdslogg } from './components/endringslogg/Innholdslogg'
import { lesScenarioregler, reglerForModul } from './faginnhold/scenarioregler'
import { thcReglerFra } from './faginnhold/thcregler'
import { lesBeUrinModell } from './katalog/beUrinModell'
import { lagSideleser, lagVersjonsleser, lesSokeindeks } from './faginnhold/globaltSok'
import { utenSider } from './faginnhold/sok'
import { lagRegisterlager } from './stoffregister/api'
import { StoffregisterkildeProvider, useLagStoffregisterkilde } from './stoffregister/Stoffregisterkilde'
import { arbeidsflate, flatebakgrunn } from './components/grupper/arbeidsflate'
import { ForslagskildeProvider } from './components/forslag/Forslagskilde'
import { Fortolkningsforslag } from './components/forslag/Fortolkningsforslag'
import { kallMot } from './legemiddeldata/lager'
import { lagLegemiddelleser, lagLegemiddelsok } from './legemiddeldata/lesing'
import { lagCypinfoleserOmIBruk, lagCypinfosokOmIBruk } from './cypinfo/lesing'
import { cypinfoSynlig } from './cypinfo/stoffside'
import { lagBivirkningsleser } from './bivirkninger/lesing'
import { lagKjemileser } from './kjemi/lesing'
import { lagLableser, lagLabsokleser } from './farmakologiportalen/lesing'
import { useClipboard } from './hooks/useClipboard'
import { useCopyFlash } from './hooks/useCopyFlash'
import { useHenting } from './hooks/useHenting'
import { usePubliserteRegler } from './hooks/usePubliserteRegler'
import {
  digitToIndex,
  erBekreftelse,
  modaltLagLiggerOver,
  SKJULT_FORTOLKNING,
  VIST_FORTOLKNING,
  useKeyboard,
} from './hooks/useKeyboard'
import { inngangsvei, useRute } from './hooks/useRute'
import {
  AnalyttkatalogKilde,
  katalogkildeFor,
  type Katalogkilde,
  lesAnalyttkatalog,
  useAnalyttkatalog,
  useHentAnalyttkatalog,
} from './katalog/Analyttkatalogkilde'
import { useNaarLedig } from './hooks/useNaarLedig'
import { useSokeindeks, type Sokeindekshenter } from './hooks/useSokeindeks'
import { useKontosynk, useKontovalg } from './hooks/useKontovalg'
import { useHusketValg } from './hooks/useSystemvalg'
import { lesThcVisning, THC_VISNING } from './domain/thcPlot'
import { lesPubliserteRegelsett } from './regler/kommentarer'
import { slaOpp } from './regler/publiserte'
import {
  Diskusjonsmeny,
  Forslagsside,
  Fortolkningsredigering,
  Gruppeflate,
  Grupperside,
  Kurateringsside,
  Personalside,
  sidekodeFor,
  Stoffregisterside,
  Stoffside,
  Verktoyside,
  Versjonsside,
} from './sidekode'
import { useBevart } from './oppdatering/Bevaring'
import { meldSide, roligOyeblikk } from './oppdatering/sider'
import { fortolkningsform, initialState, isIdle, reducer, stageOf, type Action, type Stage } from './state'
import type { Analyte } from './types'
import { lagVerktoysperrelager } from './verktoy/sperrer'
import { lagRegelvarsellager } from './verktoy/overvaking/regelvarsler'
import { VerktoytilgangProvider, verktoyeneVisesFor } from './verktoy/synlighet'
import { personalfagmiljo, synligRute } from './personaltilgang'

// Åpnes appen på en slik side (en direkte lenke, eller siden som sto før en
// oppdatering), hentes koden til den sammen med appen, ikke etter den.
if (typeof window !== 'undefined') for (const kode of sidekodeFor(lesRute(window.location.hash))) kode.forhandslast()

const KOPIFEIL = 'Fikk ikke tilgang til utklippstavlen. Kopier teksten manuelt.'

/**
 * Kvitteringen for kopieringen, i millisekunder.
 *
 * `BLINK` er hele blinket. `STEGBYTTE` er hvor lenge båndknappene blir stående
 * etterpå, så blinket rekker å starte ved knappen som ble brukt før limsteget
 * overtar; resten av blinket går der. Begge er korte med vilje — kvitteringen
 * skal rekke å bli sett uten å legge seg i veien for neste svar.
 *
 * `STEGBYTTE` holder bare igjen bildet. Tilstanden går videre med én gang
 * kommentaren er kopiert, slik at et tastetrykk i mellomtiden gjør det samme
 * som ellers i limsteget i stedet for å falle på gulvet.
 */
const BLINK = 500
const INGEN_ALTERNATIVER: EtgAlternativ[] = []
const STEGBYTTE = 130

/** Enter og mellomrom skal ikke både trykke en fokusert knapp og utløse stegets handling. */
function buttonHasFocus(): boolean {
  return document.activeElement?.tagName === 'BUTTON'
}

/**
 * Appen, når analyttkatalogen til fagmiljøet fortolkningen gjelder
 * (arbeidskonteksten) er hentet.
 *
 * Katalogen er laboratoriets egen og står i databasen per fagmiljø; appen har
 * ingen i klientpakken. Til den er hentet, tegnes ingenting opp, så
 * fortolkningen aldri rekker å vise noe uten den. Byttes fagmiljøet, tas
 * arbeidsflaten ned i det samme rettighetene for det nye kommer, og settes
 * opp på nytt når det nye fagmiljøets katalog er hentet: ingenting fra det
 * forrige vises under det nye, og ingenting fra det blir stående. Det som
 * følger kontoen og ikke fagmiljøet
 * ({@link Kontoflate}), står gjennom byttet og hentes ikke på nytt. Kunne
 * katalogen ikke hentes, eller har fagmiljøet ingen, er den tom, og
 * fortolkningen sier fra i stedet for å fortolke.
 */
export default function App() {
  const profil = useProfil()
  // Det den innloggede får gjøre i administrasjonen og stoffregisteret, etter
  // rettighetene i databasen, ikke den gamle adminrollen (P2d).
  const { rettigheter, oppdater: oppdaterRettigheter, arbeidskontekst } = useMineRettigheter(profil.id)
  // Gruppene følger kontoen, ikke fagmiljøet fortolkningen gjelder (P6).
  const grupper = useMineGrupper(profil.id)
  const katalogtilstand = useHentAnalyttkatalog(
    useCallback(() => lesAnalyttkatalog(klient()), []),
    arbeidskontekst,
  )
  const kilde = useMemo(
    () => (katalogtilstand.status === 'laster' ? null : katalogkildeFor(katalogtilstand)),
    [katalogtilstand],
  )
  // Katalogen fra et annet fagmiljø enn det rettighetene nå gjelder, vises
  // ikke: til katalogen for det er hentet, står porten.
  const gjeldende = useKatalogkontekst(kilde, arbeidskontekst) === arbeidskontekst ? kilde : null
  // Kontoflaten settes opp sammen med den første arbeidsflaten, så det den
  // henter, ikke konkurrerer med rettighetene og katalogen når appen åpnes.
  const [kontoenVises, setKontoenVises] = useState(false)
  if (gjeldende && !kontoenVises) setKontoenVises(true)
  if (!kontoenVises) return <div className="port" aria-busy="true" />
  return (
    <Kontoflate rettigheter={rettigheter} oppdaterRettigheter={oppdaterRettigheter} arbeidskontekst={arbeidskontekst} grupper={grupper}>
      {(konto) =>
        gjeldende ? (
          <AnalyttkatalogKilde verdi={gjeldende}>
            <Arbeidsflate
              key={gjeldende.katalog.fagmiljo?.id ?? ''}
              rettigheter={rettigheter}
              arbeidskontekst={arbeidskontekst}
              grupper={grupper}
              konto={konto}
            />
          </AnalyttkatalogKilde>
        ) : (
          <div className="port" aria-busy="true" />
        )
      }
    </Kontoflate>
  )
}

/**
 * Arbeidskonteksten katalogen `kilde` ble hentet i: den som gjaldt da
 * katalogen kom. Byttes fagmiljøet, er den den forrige til katalogen for det
 * nye er hentet. En katalog som kom før rettighetene var kjent (`null`), er
 * hentet i den første kjente.
 */
function useKatalogkontekst(kilde: Katalogkilde | null, arbeidskontekst: string | null): string | null {
  const [fulgt, setFulgt] = useState({ kilde, kontekst: arbeidskontekst })
  if (fulgt.kilde !== kilde || (fulgt.kontekst === null && arbeidskontekst !== null)) {
    setFulgt({ kilde, kontekst: arbeidskontekst })
    return arbeidskontekst
  }
  return fulgt.kontekst
}

/**
 * Det som følger kontoen og ikke fagmiljøet fortolkningen gjelder:
 * preferansene, stoffregisteret og fagsøket, favorittene og autoerstatt.
 * Hentes én gang og står gjennom et bytte av fagmiljø.
 */
function useKonto(brukerId: string, rettigheter: Rettigheter) {
  const tema = useKontovalg(TEMA, brukerId)
  const bevegelse = useKontovalg(BEVEGELSE, brukerId)
  // Visualiseringen i THC-syremodulen, med den valgte eller alle
  // sikkerhetsmarginene, følger brukeren som de andre preferansene.
  const [thcVisning, settThcVisning] = useHusketValg(THC_VISNING.lagring, lesThcVisning, 'valgt')
  const velgThcVisning = useKontosynk(THC_VISNING.konto, lesThcVisning, thcVisning, settThcVisning, brukerId)
  const thcVisualisering = useMemo(() => ({ visning: thcVisning, onVelg: velgThcVisning }), [thcVisning, velgThcVisning])
  // Regelsettene den innloggede er redaktør for (P5), i alle fagmiljøer.
  const mineRedaktoransvar = useMineRedaktoransvar(brukerId, rettigheter.redaktor)
  const faginnholdsklienter = useMemo(
    () => ({
      leser: lagFaginnholdsleser(klient()),
      lager: lagFaginnholdslager(klient()),
      legemidler: lagLegemiddelleser(klient()),
      cypinfo: lagCypinfoleserOmIBruk(klient()),
      bivirkninger: lagBivirkningsleser(klient()),
      kjemi: lagKjemileser(klient()),
      laboratorier: lagLableser(klient()),
      kuratering: lagKurateringsklient(klient()),
    }),
    [],
  )

  // Stoffregisteret: datafilen, med navnene fagsidene i databasen har og
  // sidene registeret ikke kjenner, og inndelingen, arkivet og papirkurven.
  // Redaktørene ser også sidene som ikke er publisert, og lager nye.
  const registerlager = useMemo(() => lagRegisterlager(klient()), [])
  const opprettSide = useCallback(
    async (navn: string, slug: string, endring: Endringskontekst) => {
      await lagerFor(faginnholdsklienter.lager, endring).opprettUtkast('infoside', { navn, slug })
    },
    [faginnholdsklienter.lager],
  )
  // Utkastene og papirkurven er for systemarkitektene, inndelingen for dem
  // med rett til å endre registeret. En ny fagside krever begge deler og
  // retten til å redigere faginnholdet, som er systemarkitektenes.
  const stoffregister = useLagStoffregisterkilde({
    lager: registerlager,
    admin: rettigheter.systemarkitekt,
    kanEndre: rettigheter.stoffregister,
    ...(rettigheter.systemarkitekt && rettigheter.stoffregister && { opprettSide }),
  })
  const { register } = stoffregister
  // Favorittene står både på stoffsidene og i menyen, med stoffets egen
  // nøkkel også for en gammel adresse til det.
  const favorittlager = useMemo(() => lagFavorittlager(klient()), [])
  const autoerstattlager = useMemo(() => lagAutoerstattlager(klient()), [])
  const kanoniskStoff = useCallback((nokkel: string) => register.kanonisk(nokkel)?.slug ?? nokkel, [register])

  // Fagsøket: indeksen over alt publisert fagstoff, hentet når arbeidsflaten er
  // vist og appen har tid til overs, eller første gang noen søker før det. De
  // andre navnene et stoff er kjent under, står i stoffregisteret, og navnene
  // på de publiserte sidene leses derfra først, så et stoffnavn finnes før
  // innholdet er hentet. Søket viser selv at det henter, så hentingen står
  // ikke i lasteindikatoren.
  // CYPinfo er med bare for dem som ser det på fagsidene (`CYPINFO_VISES_FOR`).
  const cypinfoISoket = cypinfoSynlig(rettigheter)
  const hentSokeindeks = useCallback<Sokeindekshenter>(
    (delvis) => {
      const stille = iBakgrunnen(klient())
      return lesSokeindeks(
        {
          sider: lagSideleser(stille),
          stoffer: async () => (await lagRegisterlager(stille).les('publisert')).sider,
          legemidler: lagLegemiddelsok(stille),
          cypinfo: cypinfoISoket ? lagCypinfosokOmIBruk(stille) : null,
          laboratorier: lagLabsokleser(stille),
          versjoner: lagVersjonsleser(stille),
          mellomlager: nettleserlager,
        },
        {},
        delvis,
      )
    },
    [cypinfoISoket],
  )
  const sokeindeks = useSokeindeks(hentSokeindeks)

  return {
    tema,
    bevegelse,
    thcVisualisering,
    mineRedaktoransvar,
    faginnholdsklienter,
    stoffregister,
    sokeindeks,
    favorittlager,
    autoerstattlager,
    kanoniskStoff,
  }
}

type Konto = ReturnType<typeof useKonto>

/**
 * Kildene som følger kontoen ({@link useKonto}), med rettighetene, gruppene og
 * måleenheten, rundt arbeidsflaten. De står gjennom et bytte av fagmiljø.
 */
function Kontoflate({
  rettigheter,
  oppdaterRettigheter,
  arbeidskontekst,
  grupper,
  children,
}: {
  rettigheter: Rettigheter
  oppdaterRettigheter: OppdaterRettigheter
  arbeidskontekst: string | null
  grupper: Gruppekilde
  children: (konto: Konto) => ReactNode
}) {
  const profil = useProfil()
  const konto = useKonto(profil.id, rettigheter)
  // Måleenheten konsentrasjonene vises i, fra preferansene, gjelder overalt,
  // og det samme gjør rettighetene og gruppene.
  return (
    <RettigheterKilde verdi={rettigheter} oppdater={oppdaterRettigheter} arbeidskontekst={arbeidskontekst}>
      <GruppekildeProvider verdi={grupper}>
        <MaleenhetKilde brukerId={profil.id}>
          <StoffregisterkildeProvider kilde={konto.stoffregister}>
            <FavorittkildeProvider lager={konto.favorittlager} brukerId={profil.id} kanonisk={konto.kanoniskStoff}>
              <AutoerstattProvider lager={konto.autoerstattlager} brukerId={profil.id}>
                {children(konto)}
              </AutoerstattProvider>
            </FavorittkildeProvider>
          </StoffregisterkildeProvider>
        </MaleenhetKilde>
      </GruppekildeProvider>
    </RettigheterKilde>
  )
}

function Arbeidsflate({
  rettigheter,
  arbeidskontekst,
  grupper,
  konto,
}: {
  rettigheter: Rettigheter
  /** Fagmiljøet fortolkningen gjelder, som det hentede følger (`arbeidskontekst`). */
  arbeidskontekst: string | null
  grupper: Gruppekilde
  konto: Konto
}) {
  // Laboratorieanalyttene og alt fortolkningen kan fortolke, i fagmiljøets
  // egen katalog. Fagsidene er stoffenes, i stoffregisteret. De to er helt
  // adskilte domener (docs/domener.md): ingen av dem lenker til eller leser
  // fra den andre.
  const katalog = useAnalyttkatalog()
  // Fortolkningen overlever en oppdatering av appen, med analytten lest tilbake etter koden.
  const fortolkningsformen = useMemo(() => fortolkningsform(katalog.fortolkninger), [katalog])
  // Analyttene etter nøkkelen fortolkningssiden deres har i adressen.
  const analyttEtterNokkel = useMemo(
    () => new Map(katalog.fortolkninger.map((a) => [fortolkningsnokkel(a.kode), a])),
    [katalog],
  )
  const [state, setState] = useBevart('fortolkning', initialState, fortolkningsformen)
  const dispatch = useCallback((action: Action) => setState((forrige) => reducer(forrige, action)), [setState])
  const [failedCopy, setFailedCopy] = useState<string | null>(null)
  const profil = useProfil()
  const { tema, bevegelse, thcVisualisering, faginnholdsklienter, stoffregister, sokeindeks, kanoniskStoff } = konto
  // Fagsøkets indeks hentes når appen har tid til overs etter at arbeidsflaten
  // er vist, også etter et fagmiljøbytte: et bytte rett etter oppstart skal ikke
  // vente på den. Den hentes ikke på nytt når den alt er hentet (`krev`).
  useNaarLedig(sokeindeks.krev)
  // Fagsidene er den vanligste veien videre fra forsiden og søket: koden
  // deres hentes når appen har tid til overs, så den første ikke venter på den.
  useNaarLedig(Stoffside.forhandslast)
  const copy = useClipboard()
  const { flash, show } = useCopyFlash(BLINK)
  /**
   * Steget bildet henger igjen i mens kvitteringen starter der knappen sto —
   * det steget kopieringen gikk ut fra. `null` når ingenting dveler. Se
   * `STEGBYTTE` og `vist`.
   */
  const [dveler, setDveler] = useState<Stage | null>(null)
  const stegbytte = useRef<number>()
  /** Ruten båndknappen sto i — beviset i limsteget flyter opp fra den. */
  const [bevisFra, setBevisFra] = useState<Rute | null>(null)

  const stage = stageOf(state)
  // Kopieringen svarer først etter en tur innom nettleseren, og skal legge
  // kvitteringen i det steget den gikk ut fra. Refen holder det steget uten å
  // binde `kopierOgGaaVidere` til en ny utgave for hver rendring.
  const staaende = useRef(stage)
  staaende.current = stage
  // Søket dekker alt fagmiljøet kan fortolke, og filteret på hovedsiden
  // smalner inn hva det kan finne.
  const pool = useMemo(
    () => filtrertPool(katalog.fortolkninger, state.metodefilter),
    [katalog, state.metodefilter],
  )

  // Nødstoppen for de kliniske verktøyene, lest av verktøysidene.
  const verktoysperrer = useMemo(() => lagVerktoysperrelager(klient()), [])
  const regelvarsler = useMemo(() => lagRegelvarsellager(kallMot(klient())), [])
  // Hva den innloggede får redigere: fagsidene (felles) og fortolkningen
  // (lokalt), etter rettighetene i databasen (P2a), og regelsettene
  // den innloggede er redaktør for (P5).
  const lokalEndringsrett = useLokalEndringsrett(profil.id)
  const { mineRedaktoransvar } = konto
  const arbeidsfagmiljoId = rettigheter.arbeidsfagmiljo?.id ?? null
  const redaktorensRegelsett = useMemo(
    () => (mineRedaktoransvar === null ? null : redigerbareRegelsett(mineRedaktoransvar, arbeidsfagmiljoId)),
    [mineRedaktoransvar, arbeidsfagmiljoId],
  )
  const redigering = useMemo(
    () => redigeringsrett(rettigheter, lokalEndringsrett, redaktorensRegelsett),
    [rettigheter, lokalEndringsrett, redaktorensRegelsett],
  )
  const faginnhold = useMemo<Faginnholdskilde>(
    () => ({ ...faginnholdsklienter, kanRedigere: redigering.felles }),
    [faginnholdsklienter, redigering.felles],
  )
  // Fortolkningsreglene databasen gir, er fagmiljøets fortolkningen gjelder
  // (arbeidskonteksten, P4b). Byttes det, også til ingen, tømmes reglene før de nye hentes.
  const regelkontekst = arbeidskontekst
  const regelfagmiljo = rettigheter.arbeidsfagmiljo?.navn ?? null
  // Reglene rusmiddelmodulene fortolkes med, hentet én gang for hele appen.
  const scenarioregler = useHentScenarioregler(
    useCallback(() => lesScenarioregler(klient()), []),
    regelkontekst,
  )
  const hits = useMemo(() => search(state.query, pool), [state.query, pool])
  // Tilfellene EtG-modulen velger mellom: scenariene i modulens regelsett.
  const etgtilfeller = useMemo<Etgtilfeller | null>(() => {
    const analytt = state.analyte
    if (!analytt?.modul || !erEtgAnalytt(analytt)) return null
    const modul = { id: analytt.modul.id, navn: analytt.navn }
    return etgTilfeller(analytt, reglerForModul(scenarioregler.tilstand, modul, scenarioregler.provIgjen, regelfagmiljo))
  }, [state.analyte, scenarioregler, regelfagmiljo])
  const etgAlternativer = etgtilfeller?.status === 'klar' ? etgtilfeller.alternativer : INGEN_ALTERNATIVER

  // Fortolkningsreglene er de publiserte regelsettene i databasen, hentet
  // når appen åpnes. Referanseområdet for hver analytt står i fagmiljøets
  // egen katalog. Steg 2 og tastene bruker det som gjelder analytten.
  const hentRegler = useCallback(
    async () => ({ regelsett: await lesPubliserteRegelsett(faginnhold.leser), referanseomrader: referanseomraderI(katalog) }),
    [faginnhold.leser, katalog],
  )
  const regler = usePubliserteRegler(hentRegler, regelkontekst)

  // THC-syremodulen fortolker med regelsettet og tekstene som er publisert.
  const thc = useHenting(
    useCallback(() => faginnhold.leser.lesThcRegelsett('publisert'), [faginnhold.leser]),
    regelkontekst,
  )
  const { hentPaNytt: hentThcPaNytt } = thc
  const thcRegler = useMemo(
    () => thcReglerFra(thc.tilstand, hentThcPaNytt, regelfagmiljo),
    [thc.tilstand, hentThcPaNytt, regelfagmiljo],
  )
  // Modellen for benzoylekgonin i urin hentes av modulen selv, når den åpnes.
  const hentBeUrinModell = useCallback(() => lesBeUrinModell(klient()), [])
  const endringsloggleser = useMemo(() => lagEndringsloggleser(klient()), [])
  const { register, hentPaNytt: hentStoffsiderPaNytt } = stoffregister
  // En gammel adresse til en analytt fører til fortolkningen, etter katalogen.
  const adressegrunnlag = useMemo(() => ({ register, katalog }), [register, katalog])
  const [adresserute, gaaTil, tilbake] = useRute(apneFraAdressen, adressegrunnlag)
  // En arbeidsflate i en gruppe (idéene, oppgavene) legger seg over siden den
  // ble åpnet fra; appen viser den siden bak flaten (`components/grupper/arbeidsflate.ts`).
  const flate = arbeidsflate(adresserute)
  // Personalfunksjonene finnes bare for dem som har dem i fagmiljøet de
  // arbeider i; for alle andre er adressen en ukjent adresse (K-SKJ-2). Har
  // databasen avvist kalenderen (`avvisPersonal`), er den det også her, til
  // fagmiljøet byttes eller appen åpnes på nytt.
  const [personalAvvist, setPersonalAvvist] = useState(false)
  const personal = personalAvvist ? null : personalfagmiljo(rettigheter)
  const oppdaterRettigheter = useOppdaterRettigheter()
  const avvisPersonal = useCallback(() => {
    setPersonalAvvist(true)
    oppdaterRettigheter()
  }, [oppdaterRettigheter])
  const rute = synligRute(flate ? flatebakgrunn(adresserute, inngangsvei(), adressegrunnlag) : adresserute, personal)
  // Fagsidene, også en tidligere versjon eller en kurateringsgren av en.
  const paaInfoside = rute.side === 'stoff' || rute.side === 'versjon' || rute.side === 'kuratering'
  // Siden brukeren er på, for meldingen om en ny versjon: den står bare når
  // versjonen berører siden, og å gå til en annen side er et rolig øyeblikk
  // der den kan tas i bruk i stillhet (`src/oppdatering/sider.ts`).
  const side = sidesti(rute)
  useEffect(() => meldSide(side), [side])
  useEffect(() => () => meldSide(null), [])
  // Redigeringen av reglene og kommentarene en fortolkning gir, for
  // administratorene i fagmiljøet, på en egen adresse under fortolkningen.
  const redigererFortolkning = erRedigering(rute) && redigering.lokalt && state.analyte !== null
  // Stoffsidene, søkesiden, verktøyene og redigeringen legger seg over fortolkningen, som står skjult bak.
  const fortolkningSkjult = rute.side !== 'fortolkning' || redigererFortolkning

  // De arkiverte fagsidene og dem i papirkurven står ikke i søket.
  const sokbar = sokeindeks.tilstand
  const synligIndeks = useMemo(() => {
    if (sokbar.status !== 'klar') return sokbar
    const skjult = (stoff: string) => ['arkivert', 'papirkurv'].includes(register.status(stoff))
    return { ...sokbar, indeks: utenSider(sokbar.indeks, skjult) }
  }, [sokbar, register])
  const beskrivSide = useCallback((stoff: string) => stoffbeskrivelse(stoff, register), [register])
  const gaaTilAdresse = useCallback(
    (adresse: string) => gaaTil(lesRute(adresse, register, katalog)),
    [gaaTil, register, katalog],
  )
  const regeloppslag = useMemo(
    () => (state.analyte ? slaOpp(regler.tilstand, state.analyte.kode) : null),
    [regler.tilstand, state.analyte],
  )
  const regelsett = regeloppslag?.status === 'klar' ? regeloppslag.regelsett : null
  const valgene = useMemo(() => (regelsett ? regelsettvalg(regelsett) : []), [regelsett])

  // En administrator kan ha publisert endringer på en fagside. Stoffsidene
  // hentes på nytt når hen går fra den, og fagsøket henter indeksen på nytt
  // neste gang det brukes, eller med én gang når hen går rett til søkesiden:
  // den har alt bedt om indeksen før denne effekten kjører, og ber ikke igjen.
  const varPaInfoside = useRef(paaInfoside)
  const { hentPaNytt } = regler
  const { foreld: foreldSokeindeks } = sokeindeks
  const paaSokeside = rute.side === 'sok'
  useEffect(() => {
    if (varPaInfoside.current && !paaInfoside && faginnhold.kanRedigere) {
      hentStoffsiderPaNytt()
      foreldSokeindeks(paaSokeside)
    }
    varPaInfoside.current = paaInfoside
  }, [
    paaInfoside,
    paaSokeside,
    faginnhold.kanRedigere,
    hentStoffsiderPaNytt,
    foreldSokeindeks,
  ])

  // Etter en publisering i redigeringen bruker fortolkningen de nye reglene med en gang.
  const { provIgjen: hentScenarioreglerPaNytt } = scenarioregler
  const reglerPublisert = useCallback(() => {
    hentPaNytt()
    hentThcPaNytt()
    hentScenarioreglerPaNytt()
  }, [hentPaNytt, hentThcPaNytt, hentScenarioreglerPaNytt])

  // Redigeringen er bare for dem med endringsrett; for andre er adressen fortolkningen.
  useEffect(() => {
    if (erRedigering(rute) && redigering.kjent && !redigering.lokalt && rute.side === 'fortolkning') {
      gaaTil({ side: 'fortolkning', analytt: rute.analytt }, { erstatt: true })
    }
  }, [rute, redigering.kjent, redigering.lokalt, gaaTil])

  // Verktøyene vises bare for dem som skal se dem (`src/verktoy/synlighet.ts`);
  // for andre er adressen forsiden.
  const visVerktoy = verktoyeneVisesFor(profil.role)
  useEffect(() => {
    if (rute.side === 'verktoy' && !visVerktoy) gaaTil(FORSIDE, { erstatt: true })
  }, [rute, visVerktoy, gaaTil])

  // Tilstandsmaskinen trenger alternativene det nye søket gir for å se om det
  // smalner inn til én analytt, så søket kjøres her og ikke først når steget
  // tegnes opp. Datasettet er lite nok til at det ikke merkes.
  const setQuery = useCallback(
    (value: string) => {
      const matches = search(value, pool).map((hit) => hit.analyte)
      dispatch({ type: 'sett-sok', value, matches })
    },
    [pool],
  )

  const slippBildet = useCallback(() => {
    window.clearTimeout(stegbytte.current)
    setDveler(null)
  }, [])

  /**
   * Kopierer kommentaren knappen bærer og går videre til limsteget.
   *
   * Knappen står i bildet bare så lenge steget foran vises, enten den ble
   * klikket eller valgt med et tastetrykk. Blinket legges der den står nå, og
   * ruten følger med til limsteget, der beviset flyter opp fra den. Veien er
   * den samme for konsentrasjonsbåndene, for cut-off-valget og for EtG og
   * EtS.
   */
  const kopierOgGaaVidere = useCallback(
    async (tekst: string, velger: string, videre: Action) => {
      if (!(await copy(tekst))) {
        setFailedCopy(tekst)
        return
      }
      setFailedCopy(null)
      const knapp = document.querySelector(velger)
      show(knapp)
      setBevisFra(ruteAv(knapp))
      dispatch(videre)
      setDveler(staaende.current)
      window.clearTimeout(stegbytte.current)
      stegbytte.current = window.setTimeout(() => setDveler(null), STEGBYTTE)
    },
    [copy, show],
  )

  const kopierValg = useCallback(
    (valg: Kommentarvalg) =>
      kopierOgGaaVidere(valg.kommentar, `[data-band="${valg.key}"]`, {
        type: 'velg-band',
        key: valg.key,
      }),
    [kopierOgGaaVidere],
  )

  /**
   * Et valg i steg 2. De fleste kopierer kommentaren med én gang; cut-off-valget
   * går innom kontrollspørsmålet først, siden funnet må være bekreftet av
   * laboratoriet før kommentaren gjelder.
   */
  const velgValg = useCallback(
    (valg: Kommentarvalg) => {
      if (valg.key === CUTOFF_NOKKEL) {
        dispatch({ type: 'spor', kontroll: 'cutoff' })
        return
      }
      void kopierValg(valg)
    },
    [kopierValg],
  )

  /** Hovedkommentaren for tilfellet kopieres straks; resten hører til limsteget. */
  const pickEtg = useCallback(
    (alternativ: EtgAlternativ) => {
      const forste = alternativ.plasseringer[0]
      if (!forste) return
      return kopierOgGaaVidere(forste.tekst, `[data-etg="${alternativ.id}"]`, {
        type: 'velg-etg',
        valg: alternativ.id,
      })
    },
    [kopierOgGaaVidere],
  )

  const back = useCallback(() => {
    slippBildet()
    setFailedCopy(null)
    dispatch({ type: 'tilbake' })
  }, [slippBildet])

  const velgAnalytt = useCallback(
    (analyte: Analyte) => {
      slippBildet()
      setFailedCopy(null)
      dispatch({ type: 'velg-analytt', analyte })
    },
    [slippBildet],
  )

  /**
   * Lukker siden som står: tilbake dit brukeren kom fra i appen, eller til
   * forsiden når siden ble åpnet direkte (`useRute`, «inngangsveien»).
   */
  const lukkInfoside = useCallback(() => tilbake(), [tilbake])
  /** Forsidens hovedhandling: alltid søket, som snarveien i menyen. */
  const apneFortolkning = useCallback(() => gaaTil(fortolkningsrute()), [gaaTil])
  const tilForsiden = useCallback(() => gaaTil(FORSIDE), [gaaTil])
  /** Redigeringen av en fortolkning går tilbake dit, eller til fortolkningen når den ble åpnet direkte. */
  const avsluttRedigering = useCallback(() => tilbake(fortolkningsrute(state.analyte?.kode)), [tilbake, state.analyte])

  /**
   * Fortolkningen av en analytt har sin egen adresse (`#/fortolkning/<nøkkel>`),
   * og adressen og analytten følger hverandre. Velges en analytt i appen, går
   * adressen dit, så tilbakeknappen i nettleseren går til der man var. Endres
   * adressen utenfra — tilbake- og framknappen, et bokmerke, en lenke fra et
   * varsel — åpnes analytten den peker på, eller søket når den ikke peker på
   * noen. Det gjelder også når brukeren kommer til søket (`#/fortolkning`) fra
   * en annen side, som forsiden eller menyen: da åpnes søket, og analytten som
   * sto, ligger igjen i historikken. Ved oppstart vinner adressen når den har
   * en analytt; ellers skrives den om til analytten som alt er åpen
   * (fortolkningen overlevde en oppdatering av appen).
   */
  const analyttnokkel = state.analyte ? fortolkningsnokkel(state.analyte.kode) : undefined
  const startet = useRef(false)
  const forrigeAdresse = useRef<string | null>(null)
  const forrigeAnalytt = useRef(analyttnokkel)
  useEffect(() => {
    const oppstart = !startet.current
    startet.current = true
    const adresseEndret = !oppstart && forrigeAdresse.current !== (rute.side === 'fortolkning' ? (rute.analytt ?? '') : null)
    const analyttEndret = analyttnokkel !== forrigeAnalytt.current
    forrigeAdresse.current = rute.side === 'fortolkning' ? (rute.analytt ?? '') : null
    forrigeAnalytt.current = analyttnokkel
    if (rute.side !== 'fortolkning' || rute.analytt === analyttnokkel) return
    if ((oppstart && rute.analytt) || (adresseEndret && !analyttEndret)) {
      const analytt = rute.analytt ? analyttEtterNokkel.get(rute.analytt) : undefined
      if (analytt) velgAnalytt(analytt)
      else if (rute.analytt) gaaTil(fortolkningsrute(state.analyte?.kode), { erstatt: true })
      else {
        slippBildet()
        setFailedCopy(null)
        dispatch({ type: 'forlat-analytt' })
      }
      return
    }
    gaaTil(fortolkningsrute(state.analyte?.kode), { erstatt: oppstart })
  }, [rute, analyttnokkel, state.analyte, velgAnalytt, gaaTil, slippBildet, dispatch, analyttEtterNokkel])

  // Analyttene fortolkningen gjelder, for «Foreslå endring» i reglene og redigeringsretten.
  const fortolkningsanalytter = useMemo(
    () => (state.analyte ? analytterForFortolkning(state.analyte, katalog) : []),
    [state.analyte, katalog],
  )
  /**
   * Fortolkningen har regler og kommentarer: en modul med scenarioregler,
   * THC-syre, eller en kode med et publisert regelsett. EtG og EtS har ingen.
   * Alle kan foreslå endringer i dem. Administratorene kan redigere dem, og en
   * redaktør for ett regelsett bare fortolkningen for kodene i det.
   */
  const harRegler = useMemo(() => {
    const analytt = state.analyte
    if (!analytt) return false
    if (rusModulFor(analytt) || erThcAnalytt(analytt)) return true
    const { tilstand } = regler
    return tilstand.status === 'klar' && fortolkningsanalytter.some((a) => tilstand.etterKode.has(a.kode))
  }, [state.analyte, regler, fortolkningsanalytter])
  const kanRedigeres = useMemo(
    () =>
      harRegler &&
      !!state.analyte &&
      kanRedigereKodene(redigering, [state.analyte.kode, ...fortolkningsanalytter.map((a) => a.kode)]),
    [harRegler, redigering, state.analyte, fortolkningsanalytter],
  )

  const settMetodefilter = useCallback((metode: string | null) => {
    dispatch({ type: 'sett-metodefilter', metode })
  }, [])

  const reset = useCallback(() => {
    slippBildet()
    setFailedCopy(null)
    dispatch({ type: 'nullstill' })
    // En fortolkning som er nullstilt, har ingenting å miste.
    roligOyeblikk()
  }, [slippBildet])

  useEffect(() => () => window.clearTimeout(stegbytte.current), [])

  /**
   * Valget kontrollsteget spør om. Det leses av regelsettet og ikke av
   * spørsmålet som står, så bildet kan bli stående det korte øyeblikket etter
   * at spørsmålet er besvart — se `dveler`.
   */
  const kontrollvalg = useMemo(() => (regelsett ? cutoffvalg(regelsett) : null), [regelsett])

  /** Ja: kommentaren kopieres, og flyten går videre som ellers. */
  const bekreftKontroll = useCallback(() => {
    if (!state.kontroll || !kontrollvalg) return
    void kopierValg(kontrollvalg)
  }, [state.kontroll, kontrollvalg, kopierValg])

  /**
   * Alt + 1, Alt + 2 osv. setter filteret på hver sin analysemetode, i den
   * rekkefølgen filterraden viser dem. Alt + 0 velger «Alle»: null hører ikke
   * til noen metode, og står derfor for «ingen av dem».
   *
   * Snarveien ligger utenom `useKeyboard`, som med vilje slipper alle
   * modifikatorkombinasjoner gjennom til nettleseren. Den leser `event.code`
   * og ikke `event.key`, siden Alt gjør om tegnet på flere tastaturoppsett —
   * det er den fysiske talltasten som gjelder.
   *
   * Endringsloggen fanger tastaturet for seg, og sidemenyen —
   * stoffregisteret — filtrerer ikke søket.
   */
  useEffect(() => {
    function paaTast(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey) return
      const truffet = /^Digit(\d)$/.exec(event.code)
      if (!truffet?.[1]) return
      const tall = Number(truffet[1])
      if (tall > katalog.metoder.length || modaltLagLiggerOver() || sidemenyenErApen()) return
      event.preventDefault()
      dispatch({
        type: 'sett-metodefilter',
        metode: tall === 0 ? null : (katalog.metoder[tall - 1]?.kode ?? null),
      })
    }
    window.addEventListener('keydown', paaTast)
    return () => window.removeEventListener('keydown', paaTast)
  }, [katalog, dispatch])

  // Enter og mellomrom bekrefter det samme, overalt i appen.
  const confirm = useCallback(
    (event: KeyboardEvent) => {
      if (buttonHasFocus()) return
      if (stage === 'search') {
        // Bare når det ikke er noe å velge mellom. Ellers får mellomrom
        // skrives inn i søkefeltet som vanlig. Det ene alternativet velger som
        // regel seg selv i det søket smalner inn til det; her står det igjen
        // fordi brukeren nettopp kom tilbake fra den analytten.
        if (hits.length !== 1 || !hits[0]) return
        event.preventDefault()
        dispatch({ type: 'velg-analytt', analyte: hits[0].analyte })
      } else if (stage === 'paste') {
        // Mellomrom skal ikke avslutte fra et sted der tasten alt har en jobb
        // — som feltet for manuell kopiering, der teksten skal kunne markeres
        // og kopieres i fred.
        if (!erBekreftelse(event)) return
        event.preventDefault()
        reset()
      }
    },
    [stage, hits, reset],
  )

  useKeyboard({
    Escape: (e) => {
      e.preventDefault()
      back()
    },
    Enter: confirm,
    ' ': confirm,

    ...Object.fromEntries(
      '0123456789'.split('').map((digit) => [
        digit,
        (e: KeyboardEvent) => {
          const index = digitToIndex(digit)
          if (index === null) return

          if (stage === 'search' && state.query !== '') {
            const hit = hits[index]
            if (!hit) return
            e.preventDefault()
            dispatch({ type: 'velg-analytt', analyte: hit.analyte })
          } else if (stage === 'band') {
            const valg = valgene[index]
            if (!valg) return
            e.preventDefault()
            velgValg(valg)
          } else if (stage === 'kontroll') {
            // 1 er ja, 2 er nei — i den rekkefølgen knappene står.
            const svar = [bekreftKontroll, back][index]
            if (!svar) return
            e.preventDefault()
            svar()
          } else if (stage === 'etg') {
            const alternativ = etgAlternativer[index]
            if (!alternativ) return
            e.preventDefault()
            void pickEtg(alternativ)
          } else if (stage === 'paste') {
            // Alle sifre avslutter, slik at man kan bruke samme talltast som i
            // forrige bilde for å komme raskt videre.
            e.preventDefault()
            reset()
          }
        },
      ]),
    ),
  })

  const valgtValg = state.bandKey ? valgene.find((v) => v.key === state.bandKey) : undefined
  const rusModul = state.analyte ? rusModulFor(state.analyte) : undefined
  const etgAlternativ = state.etgValg ? etgAlternativer.find((a) => a.id === state.etgValg) : undefined
  // Et valgt tilfelle reglene ikke har: mens de hentes eller ikke kunne
  // hentes, vises valget av tilfelle med statusen deres, og har de det ikke
  // (lenger), for eksempel etter en oppdatering, velges det på nytt.
  const etgValgUtenTilfelle = state.etgValg !== null && !etgAlternativ
  useEffect(() => {
    if (etgValgUtenTilfelle && etgtilfeller?.status === 'klar') dispatch({ type: 'velg-etg', valg: null })
  }, [etgValgUtenTilfelle, etgtilfeller, dispatch])

  /**
   * Steget som vises. Det henger etter `stage` i det korte øyeblikket knappene
   * i steget foran blir stående, så kvitteringen rekker å starte der knappen
   * sto. Tastene følger `stage` og venter ikke på bildet.
   */
  const vist = dveler ?? stage

  // Diskusjonene hører til siden som står åpen: en fagside, fortolkningen
  // av én analytt, stoffregisteret eller en gruppe den innloggede leser.
  // Forsiden har ingen.
  const sidensGruppe = rute.side === 'grupper' && rute.gruppe ? grupper.grupper.find((g) => g.id === rute.gruppe) : undefined
  const sidesDiskusjoner = diskusjonssideFor(rute)
  const diskusjonsside =
    sidesDiskusjoner && gruppeForSide(sidesDiskusjoner) && sidensGruppe?.status !== 'aktiv' ? null : sidesDiskusjoner
  const sidenavn =
    rute.side === 'stoff'
      ? (register.menystoff(rute.stoff)?.navn ?? rute.stoff)
      : rute.side === 'stoffregister'
        ? 'Stoffregisteret'
        : sidensGruppe
          ? gruppesidenavn(sidensGruppe)
          : state.analyte
            ? fortolkningssidenavn(state.analyte)
            : 'Fortolkningen'
  // Det diskusjonene handler om, til overskriften deres (`diskusjonsoverskrift`).
  // Til analytten er lest, står overskriften uten den.
  const diskusjonsemne = sidensGruppe
    ? sidensGruppe.navn
    : rute.side === 'fortolkning'
      ? state.analyte
        ? fortolkningsemne(state.analyte)
        : ''
      : sidenavn
  // Endringsloggen for innholdet på siden som står åpen.
  const endringsside = useMemo(
    () => endringssideFor(rute, { fortolkning: state.analyte, katalog, kanonisk: kanoniskStoff }),
    [rute, state.analyte, katalog, kanoniskStoff],
  )
  // Sidene en tråd kan flyttes til.
  const sider = useMemo(
    () => diskusjonssider(register.stoffer, katalog.fortolkninger, grupper.grupper),
    [register, katalog, grupper.grupper],
  )

  const app = (
    <ToppmenyKilde>
      <Direktelenkekilde sider={sider}>
        <VerktoytilgangProvider value={visVerktoy}>
          <div
            className="app"
            data-steg={vist}
            data-tomt={isIdle(state) && !fortolkningSkjult ? 'ja' : 'nei'}
            data-side={redigererFortolkning ? 'fortolkningsredigering' : rute.side}
          >
            <Toppmeny
              meny={
                <Sidemeny register={register} rute={rute} />
              }
              sok={
                <Fagsok
                  indeks={synligIndeks}
                  onKrev={sokeindeks.krev}
                  onProvIgjen={sokeindeks.provIgjen}
                  sporring={rute.side === 'sok' ? rute.q : undefined}
                  beskrivSide={beskrivSide}
                  onGaaTil={gaaTilAdresse}
                />
              }
              verktoy={
                <>
                  <Chatknapp />
                  <Varselknapp />
                </>
              }
              konto={<Kontomeny tema={tema} bevegelse={bevegelse} />}
            />

            {!fortolkningSkjult && state.analyte && (
              <ToppmenyInnhold spor="redigering">
                {kanRedigeres && (
                  <Ikonknapp
                    ikon="edit"
                    etikett="Rediger fortolkningen"
                    onClick={() => state.analyte && gaaTil(redigeringsrute(state.analyte.kode))}
                  />
                )}
                {harRegler && (
                  <Fortolkningsforslag
                    key={state.analyte.kode}
                    sidenavn={fortolkningssidenavn(state.analyte)}
                    analytter={fortolkningsanalytter}
                    leser={faginnhold.leser}
                  />
                )}
              </ToppmenyInnhold>
            )}

            {redigererFortolkning && state.analyte && (
              <main className="scene scene--infoside">
                <FaginnholdskildeProvider kilde={faginnhold}>
                  <Senere>
                    <Fortolkningsredigering
                      key={state.analyte.kode}
                      fortolkning={state.analyte}
                      sted={rute.side === 'fortolkning' ? rute.sted : undefined}
                      katalog={katalog}
                      kanPublisere={redigering.publisere}
                      regelsett={redigering.regelsett}
                      onPublisert={reglerPublisert}
                      onAvslutt={avsluttRedigering}
                    />
                  </Senere>
                </FaginnholdskildeProvider>
              </main>
            )}

            {rute.side === 'forside' && (
              <main className="scene scene--forside">
                <Forside onApneFortolkning={apneFortolkning} />
              </main>
            )}

            {rute.side === 'ukjent' && (
              <main className="scene scene--forside">
                <Ukjentside onTilForsiden={tilForsiden} />
              </main>
            )}

            {rute.side === 'stoff' && (
              <main className="scene scene--infoside">
                <FaginnholdskildeProvider kilde={faginnhold}>
                  <Senere>
                    <Stoffside
                      stoff={rute.stoff}
                      sted={rute.sted}
                      register={register}
                      onLukk={lukkInfoside}
                    />
                  </Senere>
                </FaginnholdskildeProvider>
              </main>
            )}

            {(rute.side === 'versjon' || rute.side === 'kuratering') && (
              <main className="scene scene--infoside">
                <FaginnholdskildeProvider kilde={faginnhold}>
                  <Senere>
                    {rute.side === 'versjon' ? (
                      <Versjonsside stoff={rute.stoff} nr={rute.nr} register={register} onGaaTil={gaaTil} onLukk={lukkInfoside} />
                    ) : (
                      <Kurateringsside gren={rute.gren} register={register} onGaaTil={gaaTil} onLukk={lukkInfoside} />
                    )}
                  </Senere>
                </FaginnholdskildeProvider>
              </main>
            )}

            {rute.side === 'stoffregister' && (
              <main className="scene scene--stoffregister">
                <Senere>
                  <Stoffregisterside onLukk={lukkInfoside} kuratering={faginnhold.kuratering} />
                </Senere>
              </main>
            )}

            {rute.side === 'verktoy' && visVerktoy && (
              <main className="scene scene--verktoy">
                <Senere>
                  <Verktoyside verktoy={rute.verktoy} legemidler={faginnhold.legemidler} sperrer={verktoysperrer} regelvarsler={regelvarsler} onLukk={lukkInfoside} />
                </Senere>
              </main>
            )}

            {rute.side === 'grupper' && (
              <main className="scene scene--infoside">
                <Senere>
                  <Grupperside gruppe={rute.gruppe} fane={rute.fane} onLukk={lukkInfoside} />
                </Senere>
              </main>
            )}
            {flate && (
              <Suspense fallback={null}>
                <Gruppeflate key={flate.gruppe} {...flate} />
              </Suspense>
            )}

            {rute.side === 'forslag' && (
              <main className="scene scene--infoside">
                <FaginnholdskildeProvider kilde={faginnhold}>
                  <Senere>
                    <Forslagsside forslag={rute.forslag} fane={rute.fane} onLukk={lukkInfoside} />
                  </Senere>
                </FaginnholdskildeProvider>
              </main>
            )}

            {rute.side === 'kalender' && personal && (
              <main className="scene scene--infoside">
                <Senere>
                  <Personalside
                    key={personal.id}
                    fagmiljo={personal}
                    fane={rute.fane}
                    onGaaTil={gaaTil}
                    onLukk={lukkInfoside}
                    onFinnesIkke={avvisPersonal}
                  />
                </Senere>
              </main>
            )}

            {rute.side === 'sok' && (
              <main className="scene scene--sokeside">
                <Sokeside
                  q={rute.q}
                  indeks={synligIndeks}
                  onKrev={sokeindeks.krev}
                  onProvIgjen={sokeindeks.provIgjen}
                  beskrivSide={beskrivSide}
                  onLukk={lukkInfoside}
                />
              </main>
            )}

            {/* Fortolkningen blir stående bak en åpen stoffside, så det
                brukeren har fylt inn, er der når hen kommer tilbake. Tastene dens
                gjelder bare mens den vises og fokus står i den eller ingen
                steder — se `tastenGjelderFortolkningen`. */}
            <main
              className="scene"
              hidden={fortolkningSkjult}
              data-fortolkning={fortolkningSkjult ? SKJULT_FORTOLKNING : VIST_FORTOLKNING}
            >
              {/* Forsiden er ett klikk unna, men aldri ett Escape unna: søket er siste stopp. */}
              {vist === 'search' && (
                <Button variant="subtle" className="fortolkning__forsiden" icon={<Ikon navn="back" />} onClick={tilForsiden}>
                  Til forsiden
                </Button>
              )}
              {vist === 'search' && (
                <SearchStep
                  query={state.query}
                  hits={hits}
                  metodefilter={state.metodefilter}
                  onFilter={settMetodefilter}
                  onQueryChange={setQuery}
                  onSelect={velgAnalytt}
                  onReset={reset}
                  synlig={!fortolkningSkjult}
                />
              )}

              {vist === 'band' && state.analyte && regeloppslag && (
                <BandStep
                  analyte={state.analyte}
                  regler={regeloppslag}
                  valg={valgene}
                  onPick={velgValg}
                  onBack={back}
                  onProvIgjen={hentPaNytt}
                  failed={failedCopy ? { message: KOPIFEIL, comment: failedCopy } : null}
                  fagmiljo={regelfagmiljo}
                />
              )}

              {vist === 'kontroll' && kontrollvalg && (
                <KontrollStep
                  valg={kontrollvalg}
                  sporsmal={CUTOFF_SPORSMAL}
                  onJa={bekreftKontroll}
                  onNei={back}
                  failed={failedCopy ? { message: KOPIFEIL, comment: failedCopy } : null}
                />
              )}

              {vist === 'thc' && state.analyte && <ThcStep analyte={state.analyte} regler={thcRegler} onBack={back} copy={copy} flashAt={show} visualisering={thcVisualisering} />}
              {vist === 'be_urin' && state.analyte && (
                <BeUrinStep analyte={state.analyte} hentModell={hentBeUrinModell} kontekst={regelkontekst} onBack={back} />
              )}

              {vist === 'rus' && state.analyte && rusModul && (
                <RusStep
                  // Modulen holder sine egne valg. Bytter analytten, skal de nulles,
                  // og nøkkelen gir modulen en frisk tilstand i stedet for å måtte
                  // rydde i den fra utsiden.
                  key={rusModul.id}
                  analyte={state.analyte}
                  modul={rusModul}
                  regler={reglerForModul(scenarioregler.tilstand, rusModul, scenarioregler.provIgjen, regelfagmiljo)}
                  onBack={back}
                  onFinish={reset}
                  copy={copy}
                  flashAt={show}
                />
              )}

              {(vist === 'etg' || (vist === 'etg-paste' && etgValgUtenTilfelle)) && state.analyte && etgtilfeller && (
                <EtgStep
                  analyte={state.analyte}
                  tilfeller={etgtilfeller}
                  onPick={(alternativ) => void pickEtg(alternativ)}
                  onBack={back}
                  failed={failedCopy ? { message: KOPIFEIL, comment: failedCopy } : null}
                />
              )}

              {vist === 'etg-paste' && etgAlternativ && (
                <EtgPasteStep
                  alternativ={etgAlternativ}
                  fra={bevisFra}
                  onBack={back}
                  onFinish={reset}
                  copy={copy}
                  flashAt={show}
                />
              )}

              {vist === 'paste' && state.analyte && valgtValg && (
                <PasteStep
                  analyte={state.analyte}
                  valg={valgtValg}
                  fra={bevisFra}
                  onBack={back}
                  onFinish={reset}
                />
              )}
            </main>

            {diskusjonsside && (
              <Suspense fallback={null}>
                <Diskusjonsmeny side={diskusjonsside} emne={diskusjonsemne} sider={sider} />
              </Suspense>
            )}
            <Chatmeny rute={rute} gaaTil={gaaTil} tilbake={tilbake} />
            <Chatvarselvakt brukerId={profil.id} />
            {/* Vinduene hovedmenyen åpner under Apputvikling og Administrasjon. */}
            <Idelag />
            <Administrasjon />

            {endringsside && (
              <FaginnholdskildeProvider kilde={faginnhold}>
                <Innholdslogg
                  side={endringsside}
                  sidenavn={sidenavn}
                  leser={endringsloggleser}
                  admin={redigering.felles || redigering.lokalt}
                />
              </FaginnholdskildeProvider>
            )}

            {/* Versjonen og veien inn til endringsloggen, fast nederst i hjørnet. */}
            <Versjonspille />

            {/* Kvitteringen ligger utenfor stegene, så den overlever stegbyttet. */}
            {flash && <CopyFlash key={flash.id} flash={flash} varighet={BLINK} />}
            {/* Blinket er visuelt; dette er den samme beskjeden for skjermlesere. */}
            <p className="kun-skjermleser" role="status">
              {flash ? 'Kommentaren er kopiert' : ''}
            </p>

            {/* Meldingen når en direktelenke ikke kunne åpnes. */}
            <Lenkemelding />
          </div>
        </VerktoytilgangProvider>
      </Direktelenkekilde>
    </ToppmenyKilde>
  )
  return <ForslagskildeProvider>{app}</ForslagskildeProvider>
}
