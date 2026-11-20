import { useCallback, useEffect, useId, useMemo, useRef, type ReactNode } from 'react'
import { Bevaringsomrade, useBevart } from '../../oppdatering/Bevaring'
import { byggSidemodell, harFaginnhold, referanseunivers } from '../../faginnhold/stoffside'
import { PANELER } from '../../faginnhold/paneler'
import { taRedigeringsonske } from '../../faginnhold/redigeringsonske'
import { indekserSide, sokeord, stoffidentitet } from '../../faginnhold/sok'
import { useLukkMedEscape } from '../../hooks/useLukkMedEscape'
import { Button } from '../Button'
import { Favorittknapp } from '../Favorittknapp'
import { Ikonknapp } from '../Ikonknapp'
import { Lukkeknapp } from '../Lukkeknapp'
import { ToppmenyInnhold } from '../toppmeny/Toppmenykilde'
import { Referanseliste } from '../referanser/Referanseliste'
import { SeksjonsstyringKilde, skuffnokkel, useAdressested } from '../seksjoner/Seksjonsstyring'
import { Innholdsfortegnelse } from '../seksjoner/Innholdsfortegnelse'
import { Sidereferanser } from '../referanser/Sidereferanser'
import { useFaginnholdskilde } from './Faginnholdskilde'
import { useFavoritter } from '../../favoritter/Favorittkilde'
import { useStoffregisterkilde } from '../../stoffregister/Stoffregisterkilde'
import { Fagsidebanner, Fagsidemeny } from '../stoffregister/Fagsidestatus'
import { ForslagsstedKilde, type Forslagsapning } from '../forslag/Forslagskilde'
import { forslagsreferanser, forslagsvalgForFagside } from '../../forslag/fagside'
import { Kurateringsbanner } from '../kuratering/Utgavelister'
import { Registerhandlingskilde } from '../stoffregister/Registerhandling'
import { Identitetspanel } from './Identitetspanel'
import { finnKobling, Preparatpanel, preparatsoketekster } from './Preparatpanel'
import { useLegemidler } from './useLegemidler'
import { Interaksjonspanel, interaksjonssoketekster } from './Interaksjonspanel'
import { useInteraksjoner } from './useInteraksjoner'
import { Kortpanel, Mekanismepanel, Tabellpanel, Tekstpanel, type Panelkontekst } from './Paneler'
import { ViktigeData } from './ViktigeData'
import { Redigeringskilde } from './Redigeringskontekst'
import { Redigeringshandlinger } from './Redigeringslinje'
import { Sidesok } from './Sidesok'
import { Uthevingskilde } from '../Uthev'
import { festreferanser } from '../../legemiddeldata/referanser'
import { slaSammenAutomatiske, ventendeKilder } from '../../faginnhold/referanser'
import { clinpgxlitteratur, clinpgxreferanser } from '../../clinpgx/referanser'
import { cpicreferanser } from '../../cpic/referanser'
import { FARMAKOGENETIKKPANEL, kobledeKjemikalier, koblingsgrunnlag } from '../../clinpgx/stoffside'
import { Farmakogenetikkpanel, farmakogenetikksoketekster } from './Farmakogenetikkpanel'
import { useBivirkninger, useCpic, useCypinfo, useFarmakogenetikk, useKjemi, useLaboratorieanalyser, useMolvekter } from './useFarmakogenetikk'
import { Konsentrasjonskilde, konsentrasjonIEnhet } from './Konsentrasjon'
import { useMaleenhet } from '../../enheter/Maleenhet'
import { finnNoder, NODER } from '../../faginnhold/riktekst'
import { Kjemipanel } from './Kjemipanel'
import { Laboratoriepanel } from './Laboratoriepanel'
import { LABPANEL, labsoketekster } from '../../farmakologiportalen/stoffside'
import { fpreferanser } from '../../farmakologiportalen/referanser'
import { KJEMIPANEL, kjemisoketekster } from '../../kjemi/stoffside'
import { pubchemreferanser } from '../../kjemi/referanser'
import { Bivirkningspanel, bivirkningssoketekster, harBivirkninger } from './Bivirkningspanel'
import { BIVIRKNINGSPANEL, bivirkningsreferanser } from '../../bivirkninger/referanser'
import { visningForKort } from '../../bivirkninger/stoffside'
import type { Visning } from '../../bivirkninger/modell'
import { useStoffside, type Sidemodus } from './useStoffside'
import { cypinfoSynlig } from '../../cypinfo/stoffside'
import { INTERAKSJONSPANEL, PREPARATPANEL } from '../../legemiddeldata/stoffside'
import { useRettigheter } from '../../auth/rettigheter'
import type { Stoff, Stoffregister } from '../../domain/stoffregister'

export interface StoffsideProps {
  /** Stoffets nøkkel fra adressen (`#/stoff/<nøkkel>`). */
  stoff: string
  /** Seksjonen og eventuelt detaljkortet adressen peker på (se `src/domain/rute.ts`). */
  sted?: readonly string[]
  /** Stoffregisteret, med stoffsidene i databasen. */
  register: Stoffregister
  /** Tilbake til fortolkningen slik den sto. */
  onLukk: () => void
  /**
   * En annen utgave av siden enn den gjeldende: en tidligere versjon eller en
   * kurateringsgren (`src/components/kuratering/`). Innholdet kommer da fra
   * kilden rundt siden, og siden vises bare til lesing, med `banner` øverst i
   * stedet for sidens egne handlinger. `navn` skiller det som tas vare på for
   * utgaven fra det som tas vare på for siden.
   */
  utgave?: { navn: string; banner: ReactNode }
}

/**
 * Stoffsiden: den eneste fagsiden appen har. Hvert stoff i stoffregisteret har
 * én, etter nøkkelen, og den handler alltid om stoffet — aldri om en
 * laboratorieanalytt.
 *
 * Siden er et oppslagsverk: panelene i fast rekkefølge (se
 * `src/faginnhold/paneler.ts`), med referansene nummerert etter første
 * forekomst og listet nederst. Identiteten og viktige data står alltid fram
 * øverst; de andre panelene er seksjoner som åpnes og lukkes, med en kort
 * oppsummering når de er lukket (`src/components/seksjoner/`). En adresse med
 * et sted etter nøkkelen åpner seksjonen eller detaljkortet den peker på.
 *
 * Fagsidene og fortolkningen er helt adskilte domener (`docs/domener.md`):
 * siden viser ingen laboratorieanalyser eller analyttkoder, lenker ikke til
 * fortolkningen og leser ingenting derfra.
 *
 * Normalt står siden i lesemodus og viser det publiserte. Administratorer kan
 * slå på redigeringsmodus, som viser utkastet med diskrete knapper for å endre
 * det, og publiserer når de er ferdige.
 *
 * Tastene: `Escape` lukker siden, `Ctrl + B` eller `Cmd + B` går til søket på
 * siden, og `Ctrl + K` eller `Cmd + K` til fagsøket i toppmenyen.
 */
export function Stoffside(props: StoffsideProps) {
  useLukkMedEscape(props.onLukk)
  // Nøkkelen gir hver side en frisk tilstand: modus, søk, skjemaer og hvilke
  // seksjoner som er åpne, hører til siden. Det samme tas vare på når appen
  // oppdateres, under sidens eget område.
  return (
    <Bevaringsomrade navn={props.utgave ? `utgave:${props.utgave.navn}` : `stoff:${props.stoff}`}>
      <SeksjonsstyringKilde key={props.utgave?.navn ?? props.stoff} bevares>
        <Registerhandlingskilde>
          <Innhold {...props} />
        </Registerhandlingskilde>
      </SeksjonsstyringKilde>
    </Bevaringsomrade>
  )
}

/** En side som ikke finnes. */
function Ikkefunnet({ onLukk, children }: { onLukk: () => void; children: ReactNode }) {
  return (
    <section className="steg stoffside" aria-labelledby="ukjent-stoff">
      <ToppmenyInnhold spor="lukk">
        <Lukkeknapp onLukk={onLukk} />
      </ToppmenyInnhold>
      <div className="kort kort--start">
        <h1 id="ukjent-stoff" className="identitet__navn">
          {children}
        </h1>
        <p>Sjekk adressen, eller finn stoffet i menyen.</p>
      </div>
    </section>
  )
}

function Innhold({ stoff: slug, sted, register, onLukk, utgave }: StoffsideProps) {
  const kanRedigere = useFaginnholdskilde().kanRedigere && !utgave
  const favorittene = useFavoritter()
  const favoritter = utgave ? null : favorittene
  const registerkilde = useStoffregisterkilde()
  const [modus, setModus] = useBevart<Sidemodus>('modus', 'lese')
  // «Åpne utkastet» fra et endringsforslag åpner siden rett i redigeringen.
  useEffect(() => {
    if (kanRedigere && taRedigeringsonske(slug)) setModus('rediger')
  }, [kanRedigere, slug, setModus])
  const [sporring, setSporring] = useBevart('sok', '')
  const beholder = useRef<HTMLElement>(null)
  const overskrift = useId()

  const kjent = register.finn(slug)
  const stoffet = useMemo<Pick<Stoff, 'slug' | 'navn'>>(() => ({ slug, navn: kjent?.navn ?? slug }), [slug, kjent])
  const handlinger = useStoffside(stoffet, modus)
  const { side, referansebase, konflikt, plan } = handlinger
  const modell = useMemo(() => byggSidemodell(side.data), [side.data])
  const navn = side.data.stoff?.navn ?? kjent?.navn ?? ''
  const kategorier = useMemo(() => register.kategorierFor(slug), [register, slug])
  // Et stoff finnes når registeret har det, eller databasen har en side med nøkkelen.
  const finnes = Boolean(kjent || side.data.stoff)
  // Knappene for å endre vises først når utkastet er hentet, så ingenting
  // lagres mot det publiserte som sto før redigeringen ble slått på.
  const redigerer = handlinger.kanEndres

  useEffect(() => {
    if (!navn) return
    const forrige = document.title
    document.title = `${navn} – OUSFAR`
    return () => {
      document.title = forrige
    }
  }, [navn])

  const koblet = useMemo(() => finnKobling(modell).kobling.virkestoff.map((v) => v.fest_id), [modell])
  const legemidler = useLegemidler(koblet)
  const interaksjoner = useInteraksjoner(legemidler, koblet)
  const kjemikalier = useMemo(() => kobledeKjemikalier(modell), [modell])
  const farmakogenetikk = useFarmakogenetikk(kjemikalier)
  const pgx = farmakogenetikk.tilstand
  const cpic = useCpic(kjemikalier)
  const cpictilstand = cpic.tilstand
  const cypinfo = useCypinfo(koblet, navn, cypinfoSynlig(useRettigheter())).tilstand
  const bivirkninger = useBivirkninger(slug).tilstand
  const kjemi = useKjemi(slug)
  const laboratorier = useLaboratorieanalyser(slug, kjemi)
  // Konsentrasjonene i teksten kan gjelde forbindelser som ikke hører til stoffet.
  const nevnte = useMemo(
    () => finnNoder(side.data.elementer, NODER.konsentrasjon).flatMap((n) => (typeof n.attrs?.forbindelse === 'string' ? [n.attrs.forbindelse] : [])),
    [side.data.elementer],
  )
  const molvekter = useMolvekter(kjemi, nevnte)
  const sideforbindelser = useMemo(() => kjemi.rader.map((r) => r.forbindelse), [kjemi])
  // Visningen av bivirkningene styrer også hvilke kort søket på siden peker på.
  const [bivirkningsvisning, setBivirkningsvisning] = useBevart<Visning>('bivirkningsvisning', 'frekvens')
  // Redaksjonelle og automatiske referanser (FEST, ClinPGx, CPIC og preparatomtalene) nummereres sammen.
  // Mens en kilde hentes, venter numrene fra panelet dens og utover, så ingen vist nummer endres når den kommer.
  const univers = useMemo(
    () =>
      referanseunivers(
        modell,
        slaSammenAutomatiske(
          ventendeKilder({
            [PREPARATPANEL]: [legemidler],
            [INTERAKSJONSPANEL]: [legemidler, interaksjoner],
            [FARMAKOGENETIKKPANEL]: [pgx, cpictilstand],
            [BIVIRKNINGSPANEL]: [bivirkninger],
            [LABPANEL]: [laboratorier],
            [KJEMIPANEL]: [kjemi],
          }),
          festreferanser(
            legemidler.status === 'klar' ? legemidler.utvalg : null,
            interaksjoner.status === 'klar' ? interaksjoner.oversikt : null,
          ),
          // CPIC står over ClinPGx i «Farmakogenetikk», og elementene nummereres i denne rekkefølgen.
          cpicreferanser(
            cpictilstand.status === 'klar' ? cpictilstand.visning : null,
            clinpgxlitteratur(pgx.status === 'klar' ? pgx.visning : null),
          ),
          clinpgxreferanser(pgx.status === 'klar' ? pgx.utvalg : null, pgx.status === 'klar' ? pgx.visning : null),
          bivirkningsreferanser(bivirkninger.status === 'klar' ? bivirkninger.utvalg : null),
          fpreferanser(laboratorier),
          pubchemreferanser(kjemi),
        ),
      ),
    [modell, legemidler, interaksjoner, pgx, cpictilstand, bivirkninger, kjemi, laboratorier],
  )
  const grunnlag = useMemo(
    () => koblingsgrunnlag(legemidler.status === 'klar' ? legemidler.utvalg : null, koblet),
    [legemidler, koblet],
  )

  // Konsentrasjonene i teksten slik leseren ser dem: i oppsummeringene og i søket på siden.
  const { enhet: maleenhet } = useMaleenhet()
  const konsentrasjon = useCallback(
    (attrs: unknown) => {
      const vist = konsentrasjonIEnhet(attrs, maleenhet, molvekter)
      return `${vist.tekst} ${vist.enhet}`
    },
    [maleenhet, molvekter],
  )
  // Stedene treffene står, regnes først ut når det søkes på siden: ellers
  // ville hele siden indekseres på nytt hver gang en kilde kommer inn mens
  // den lastes, uten at noen ser resultatet.
  const soker = sporring.trim() !== ''
  const dokumenter = useMemo(
    () =>
      soker
        ? indekserSide(
            stoffidentitet({ slug, navn, aliaser: kjent?.aliaser ?? [] }),
            modell,
            [
              ...preparatsoketekster(legemidler),
              ...interaksjonssoketekster(interaksjoner),
              ...farmakogenetikksoketekster(pgx, cpictilstand),
              ...bivirkningssoketekster(bivirkninger, bivirkningsvisning),
              ...labsoketekster(laboratorier),
              ...kjemisoketekster(kjemi),
            ],
            konsentrasjon,
          )
        : [],
    [soker, slug, navn, kjent, modell, legemidler, interaksjoner, pgx, cpictilstand, bivirkninger, bivirkningsvisning, kjemi, laboratorier, konsentrasjon],
  )
  // Det et forslag kan gjelde: det publiserte på siden, slik leseren ser det.
  const visesPublisert = modus === 'lese' && !utgave && side.status === 'klar' && side.tilstand === 'publisert'
  const forslagsapning = useMemo<Forslagsapning | null>(
    () =>
      visesPublisert
        ? {
            tittel: navn,
            valg: forslagsvalgForFagside(navn, side.data, modell, konsentrasjon),
            referanser: forslagsreferanser(modell),
            fagside: slug,
          }
        : null,
    [visesPublisert, navn, side.data, modell, konsentrasjon, slug],
  )
  // Treffene telles på nytt når innholdet endres, også når konsentrasjonene vises i en annen enhet.
  const sokeinnhold = useMemo(() => [side.data, konsentrasjon], [side.data, konsentrasjon])
  const ord = useMemo(() => sokeord(sporring), [sporring])

  const kontekst: Panelkontekst = { modell, redigerer, handlinger, konsentrasjon }
  const redigeringsverdi = useMemo(
    () => ({
      redigerer,
      referansebase,
      opprettReferanse: handlinger.opprettReferanse,
      gjenopprett: handlinger.gjenopprett,
    }),
    [redigerer, referansebase, handlinger.opprettReferanse, handlinger.gjenopprett],
  )
  // En side uten faginnhold er ikke faglig kuratert, selv om den viser data
  // OUSFAR henter selv (preparatene fra FEST, kjemien, laboratoriene).
  // Det sies først når kildene som avgjør det, er hentet, så det aldri står feil et øyeblikk.
  const utenFaginnhold = !harFaginnhold(modell) && !harBivirkninger(bivirkninger)
  const harData = modell.paneler.size > 0 || kjemi.rader.some((r) => r.data) || laboratorier.tabeller.length > 0
  const avgjort = ![bivirkninger, kjemi, laboratorier].some((kilde) => kilde.status === 'laster')

  // En side som åpnes, begynner øverst, med fokus på navnet — så tastaturet og
  // skjermleseren står der siden begynner, og ikke igjen i menyen eller modulen.
  // Peker adressen på et sted på siden, åpnes det og rulles det dit i stedet.
  const pekerPaaSted = useAdressested(sted)
  const stedsnokkel = skuffnokkel(sted ?? [])
  useEffect(() => {
    if (!pekerPaaSted) window.scrollTo({ top: 0 })
    document.getElementById(overskrift)?.focus({ preventScroll: true })
  }, [overskrift, pekerPaaSted])
  // En lenke til en gruppe bivirkninger viser den visningen gruppen står i.
  const lenketVisning = sted?.[0] === BIVIRKNINGSPANEL ? visningForKort(sted[1]) : null
  useEffect(() => {
    if (lenketVisning) setBivirkningsvisning(lenketVisning)
  }, [stedsnokkel, lenketVisning, setBivirkningsvisning])

  if (side.status === 'klar' && !finnes) {
    return <Ikkefunnet onLukk={onLukk}>Fant ingen fagside for «{slug}»</Ikkefunnet>
  }
  // Papirkurven ser bare administratorene.
  if (register.status(slug) === 'papirkurv' && !registerkilde?.admin) {
    return <Ikkefunnet onLukk={onLukk}>Fagsiden er slettet</Ikkefunnet>
  }

  return (
    <ForslagsstedKilde apning={forslagsapning}>
      <section ref={beholder} className="stoffside" aria-labelledby={overskrift} data-modus={modus}>
        {/* Sidens handlinger står i toppmenyen (i dokken på smale flater). */}
        {/* Mens siden redigeres, er det redigeringen som står i menyen; veien
            ut er «Avslutt redigering», og Escape lukker siden som før. */}
        {kanRedigere && modus === 'rediger' ? (
          <Redigeringshandlinger
            data={side.data}
            plan={plan}
            laster={!redigerer}
            onPubliser={handlinger.publiser}
            onAvslutt={() => setModus('lese')}
          />
        ) : (
          <>
            {favoritter && finnes && (
              <ToppmenyInnhold spor="favoritt">
                <Favorittknapp stoff={slug} favoritt={favoritter.erFavoritt(slug)} onSett={favoritter.sett} />
              </ToppmenyInnhold>
            )}
            <ToppmenyInnhold spor="redigering">
              {kanRedigere && (
                <Ikonknapp ikon="edit" etikett="Rediger" aria-pressed="false" onClick={() => setModus('rediger')} />
              )}
              {finnes && !utgave && <Fagsidemeny slug={slug} navn={navn} />}
            </ToppmenyInnhold>
            <ToppmenyInnhold spor="lukk">
              <Lukkeknapp onLukk={onLukk} />
            </ToppmenyInnhold>
          </>
        )}

        {/* Søket på siden står også i toppmenyen, foran handlingene. */}
        <ToppmenyInnhold spor="sidesok">
          <Sidesok
            sporring={sporring}
            onEndre={setSporring}
            beholder={beholder}
            dokumenter={dokumenter}
            innholdsnokkel={sokeinnhold}
          />
        </ToppmenyInnhold>

        {/* Seksjonene på siden, til venstre for innholdet der det er plass, ellers i toppmenyen. */}
        <Innholdsfortegnelse />

        {utgave ? (
          utgave.banner
        ) : (
          <>
            <Fagsidebanner slug={slug} />
            <Kurateringsbanner stoff={slug} />
          </>
        )}
        {modus === 'rediger' && redigerer && !side.data.infoside && (
          <p className="redigeringsstripe">Siden opprettes i databasen første gang du lagrer noe på den.</p>
        )}
        {konflikt && (
          <div className="sidevarsel" role="alert">
            <p>Noen andre har endret siden mens du redigerte. Ingenting er skrevet over.</p>
            <Button variant="subtle" onClick={handlinger.lastInn}>
              Hent nyeste utgave
            </Button>
          </div>
        )}
        {side.status === 'feil' && (
          <div className="sidevarsel" role="alert">
            <p>Fikk ikke hentet innholdet på siden. {side.feil}</p>
            <Button variant="subtle" onClick={handlinger.lastInn}>
              Prøv igjen
            </Button>
          </div>
        )}

        <Uthevingskilde ord={ord}>
          <Sidereferanser
            nummerering={univers.nummerering}
            referanser={univers.referanser}
            panelreferanser={univers.panelreferanser}
            komplett={univers.komplett}
          >
            <Redigeringskilde verdi={redigeringsverdi}>
              <Konsentrasjonskilde molvekter={molvekter} sideforbindelser={sideforbindelser}>
                <div className="stoffside__paneler" aria-busy={side.status === 'laster'}>
                  {PANELER.map((definisjon) => {
                    switch (definisjon.form) {
                      case 'identitet':
                        return (
                          <Identitetspanel
                            key={definisjon.nokkel}
                            definisjon={definisjon}
                            navn={navn}
                            kategorier={kategorier}
                            overskriftId={overskrift}
                            kontekst={kontekst}
                          />
                        )
                      case 'legemidler':
                        return (
                          <Preparatpanel
                            key={definisjon.nokkel}
                            definisjon={definisjon}
                            kontekst={kontekst}
                            sidenavn={navn}
                            legemidler={legemidler}
                          />
                        )
                      case 'interaksjoner':
                        return (
                          <Interaksjonspanel
                            key={definisjon.nokkel}
                            definisjon={definisjon}
                            kontekst={kontekst}
                            koblet={koblet.length > 0}
                            interaksjoner={interaksjoner}
                          />
                        )
                      case 'datakort':
                        return (
                          <ViktigeData
                            key={definisjon.nokkel}
                            definisjon={definisjon}
                            kontekst={kontekst}
                            stoff={slug}
                            stoffnavn={navn || slug}
                          />
                        )
                      case 'tekst':
                        return <Tekstpanel key={definisjon.nokkel} definisjon={definisjon} kontekst={kontekst} />
                      case 'kort':
                        return definisjon.nokkel === FARMAKOGENETIKKPANEL ? (
                          <Farmakogenetikkpanel
                            key={definisjon.nokkel}
                            definisjon={definisjon}
                            kontekst={kontekst}
                            tilstand={pgx}
                            cpic={cpictilstand}
                            cypinfo={cypinfo}
                            grunnlag={grunnlag}
                            sidenavn={navn}
                            sted={sted}
                            onHentet={farmakogenetikk.lesPaNytt}
                            onCpicHentet={cpic.lesPaNytt}
                          />
                        ) : definisjon.nokkel === BIVIRKNINGSPANEL ? (
                          <Bivirkningspanel
                            key={definisjon.nokkel}
                            definisjon={definisjon}
                            kontekst={kontekst}
                            tilstand={bivirkninger}
                            visning={bivirkningsvisning}
                            onVelgVisning={setBivirkningsvisning}
                          />
                        ) : (
                          <Kortpanel key={definisjon.nokkel} definisjon={definisjon} kontekst={kontekst} />
                        )
                      case 'mekanismer':
                        return <Mekanismepanel key={definisjon.nokkel} definisjon={definisjon} kontekst={kontekst} />
                      case 'tabell':
                        return <Tabellpanel key={definisjon.nokkel} definisjon={definisjon} kontekst={kontekst} />
                      case 'laboratorier':
                        return (
                          <Laboratoriepanel key={definisjon.nokkel} definisjon={definisjon} kontekst={kontekst} visning={laboratorier} />
                        )
                      case 'kjemi':
                        return <Kjemipanel key={definisjon.nokkel} definisjon={definisjon} kontekst={kontekst} visning={kjemi} />
                    }
                  })}

                  {!redigerer && side.status === 'klar' && avgjort && utenFaginnhold && (
                    <p className="stoffside__tom">
                      {harData
                        ? 'Denne siden har ikke fått faginnhold ennå og er ikke faglig kuratert. Det som står her, er hentet automatisk fra offentlige datakilder.'
                        : 'Denne siden har ikke fått faginnhold ennå.'}
                    </p>
                  )}
                  <Referanseliste />
                </div>
              </Konsentrasjonskilde>
            </Redigeringskilde>
          </Sidereferanser>
        </Uthevingskilde>
      </section>
    </ForslagsstedKilde>
  )
}
