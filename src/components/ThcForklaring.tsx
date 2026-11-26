import {
  erUtenMargin,
  konsentrasjonsniva,
  type ThcGrunnlag,
  type ThcKonklusjon,
  type ThcSamletVurdering,
} from '../domain/thcMotor'
import type { ThcRegelsett } from '../domain/thcRegelsett'
import { formaterIrcak } from '../domain/thcTall'
import { antallDager, endringsfrase, forventetNedgang, nivabeskrivelse, somProsent } from '../domain/thcVisning'

/**
 * Grunnlaget for fortolkningen, i vanlig språk — til å lese for den som vil
 * forstå hvordan kommentaren ble til. Ligger som en egen sammenleggbar
 * «Forklaring», lukket som standard (#586), og gjelder bare fortolkning mot
 * forrige prøve.
 *
 * Teksten er delt i fire korte bolker med de samme overskriftene som i
 * fortolkningen av benzoylekgonin i urin — hvor stor endringen er, hvordan
 * det er tatt hensyn til måleusikkerhet, hva som var å vente uten et nytt
 * inntak, og hvorfor konklusjonen ble som den ble — med prosentvis endring i
 * stedet for forholdstall og regneuttrykk.
 *
 * Tallene er motorens, og grensene, nivåene og faktoren under cut-off leses av
 * regelsettet fortolkningen brukte, så forklaringen alltid stemmer med
 * kommentaren.
 */
export function ThcForklaring({
  grunnlag,
  konklusjon,
  samlet = null,
  samletUtenNyttInntak = false,
  regler,
}: {
  grunnlag: ThcGrunnlag
  konklusjon: ThcKonklusjon
  /** Den tidligere prøven den samlede vurderingen fant nytt inntak etter. */
  samlet?: ThcSamletVurdering | null
  /** Den samlede vurderingen ble gjort, men ingen tidligere prøve ga nytt inntak. */
  samletUtenNyttInntak?: boolean
  regler: ThcRegelsett
}) {
  const { forrige, aktuell, dager, kronisk, maltEndring, korrigertEndring, forventet, underCutoff } = grunnlag

  // Grensene kommentaren faktisk bruker for bruksmønsteret.
  const { hosFleste, ovreGrense } = forventetNedgang(regler, kronisk, forventet)
  const niva = konsentrasjonsniva(regler, aktuell).navn

  // Uten sikkerhetsmargin er det den målte endringen selv som sammenlignes
  // med kurvene, og forklaringen må kalle den det den er.
  const utenMargin = erUtenMargin(grunnlag.sikkerhetsmargin)
  // Komma etter leddsetningen, som i «Endringen som fortolkes, viser …».
  const endringen = utenMargin ? 'Den målte endringen' : 'Endringen som fortolkes,'

  const vurdering =
    konklusjon === 'nytt_inntak'
      ? `${endringen} viser mindre nedgang enn det som anses mulig selv ved den tregeste dokumenterte ` +
        'utskillelsen. Kommentaren sier derfor at cannabis har vært inntatt etter forrige prøve.'
      : konklusjon === 'vanskelig'
        ? `${endringen} viser mindre nedgang enn forventet, men er fortsatt mulig ved spesielt treg utskillelse. ` +
          'Kommentaren sier derfor at analyseresultatet i seg selv ikke gir grunnlag for å fastslå om cannabis ' +
          'har vært inntatt etter forrige prøve.'
        : `${endringen} ligger innenfor det som er forventet. Kommentaren sier derfor at cannabis ikke ` +
          'nødvendigvis har vært inntatt etter forrige prøve' +
          (underCutoff ? ', selv om den ble rapportert som «ikke påvist».' : '.')

  return (
    <div className="thc-forklaring">
      <section className="thc-forklaring__bolk">
        <h3 className="thc-forklaring__tittel">Hvor stor er endringen mellom prøvene?</h3>
        <div className="thc-forklaring__kropp">
          <p>
            IRCAK er {formaterIrcak(aktuell)} i denne prøven og {formaterIrcak(forrige)} i forrige prøve,{' '}
            {antallDager(dager)} tidligere. Det er {endringsfrase(maltEndring)}.
          </p>
          {underCutoff && (
            <p>
              THC-syre lå under cut-off i forrige prøve, så labsystemet regnet ikke ut IRCAK for den. Her er
              den regnet ut som THC-syre delt på kreatinin (UCAK/NKRE).
            </p>
          )}
        </div>
      </section>

      <section className="thc-forklaring__bolk">
        <h3 className="thc-forklaring__tittel">Hvordan er det tatt hensyn til måleusikkerhet?</h3>
        <div className="thc-forklaring__kropp">
          {utenMargin ? (
            <p>
              Målingene er usikre, så den sanne endringen kan være noe større eller mindre enn den målte. Uten
              sikkerhetsmargin er det ikke tatt hensyn til det: den målte endringen sammenlignes direkte med
              utskillelsesprofilene.
            </p>
          ) : (
            <p>
              Målingene er usikre, så den sanne endringen kan være noe større eller mindre enn den målte. Med{' '}
              {somProsent(grunnlag.sikkerhetsmargin)}&nbsp;% sikkerhetsmargin legges en mer forsiktig endring til
              grunn: {endringsfrase(korrigertEndring)}. Slik kommer tvilen prøvegiver til gode.
            </p>
          )}
          {underCutoff && !utenMargin && (
            <p>
              Fordi forrige prøve var under cut-off, er måleusikkerheten satt{' '}
              {/* Hardt mellomrom: tallet og prosenttegnet skal ikke skilles av et linjeskift. */}
              {`${Math.round((regler.maleusikkerhet.faktor_under_cutoff - 1) * 100)} %`} høyere enn ellers. Det
              gjør fortolkningen mer forsiktig.
            </p>
          )}
        </div>
      </section>

      <section className="thc-forklaring__bolk">
        <h3 className="thc-forklaring__tittel">Hva kan forventes dersom det ikke har skjedd et nytt inntak?</h3>
        <div className="thc-forklaring__kropp">
          <p>
            Etter {antallDager(dager)} ved {kronisk ? 'kronisk bruk' : 'et enkeltinntak'}, fra IRCAK{' '}
            {formaterIrcak(forrige)}, ventes hos de aller fleste en nedgang på minst {hosFleste}&nbsp;%. Ved den
            tregeste utskillelsen som anses mulig, er nedgangen {ovreGrense}&nbsp;%.
          </p>
        </div>
      </section>

      <section className="thc-forklaring__bolk">
        <h3 className="thc-forklaring__tittel">Hvorfor blir konklusjonen slik?</h3>
        <div className="thc-forklaring__kropp">
          <p>{vurdering}</p>
          {samlet && (
            <p>
              Sammenlignet med prøven tatt {samlet.dato}, {antallDager(samlet.dager)} før denne, er nedgangen derimot
              mindre enn det som anses mulig. Den samlede vurderingen sier derfor at det har skjedd minst ett inntak
              etter den prøven.
            </p>
          )}
          {samletUtenNyttInntak && (
            <p>
              Denne prøven er også sammenlignet med de tidligere prøvene, men ingen av dem ga nytt inntak, så
              kommentaren gjelder bare forrige prøve.
            </p>
          )}
          <p>
            Kommentarens åpning følger konsentrasjonen i denne prøven: {nivabeskrivelse(regler)}.{' '}
            {formaterIrcak(aktuell)} regnes derfor som {niva} konsentrasjon.
          </p>
        </div>
      </section>
    </div>
  )
}
