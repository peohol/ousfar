import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { Button } from './Button'
import { Sikkerhetsmargin } from './Sikkerhetsmargin'
import { Fjernknapp, Provegruppe } from './Provegruppe'
import { Tallfelt } from './Tallfelt'
import {
  FORRIGE_PROVEFELT,
  erUtenMargin,
  forrigeProve,
  kortTidMellomProvene,
  langtMellomProvene,
  thcFeltfeil,
  tomThcProve,
  type ThcFeltkrav,
  type ThcInndata,
  type ThcProve,
} from '../domain/thcMotor'
import type { ThcRegelsett } from '../domain/thcRegelsett'
import { beregnIrcak, dagerMellom, formaterIrcak } from '../domain/thcTall'
import { kortTidtekst, langTidtekst, underCutofftekst, type MildereMarginer } from '../domain/thcVisning'

export interface ThcSkjemaProps {
  inndata: ThcInndata
  onEndre: <K extends keyof ThcInndata>(felt: K, verdi: ThcInndata[K]) => void
  /** Reglene skjemaet fylles ut mot: sikkerhetsmarginene og grensene for kort og lang tid står der. */
  regler: ThcRegelsett
  /** Feltet som står først, og som får fokus når skjemaet åpnes eller nullstilles. */
  forsteFelt?: Ref<HTMLInputElement>
  /** Det høyere marginer ville gitt, i snakkebobler ved sikkerhetsmarginen (`useThcFortolkning`). */
  mildere?: MildereMarginer
}

/**
 * Feltene i THC-syrefortolkningen (#586, etter mønster fra benzoylekgonin i
 * urin, #576): bruksmønsteret og «ingen tidligere prøve» diskret øverst,
 * forrige og denne prøven side om side, de tidligere prøvene i den samlede
 * vurderingen under dem, lagt til og fjernet med hver sin knapp, kort eller
 * lang tid mellom prøvene i én kort linje med valget ved, og
 * sikkerhetsmarginen med forklaringen bak et lite informasjonstegn. Et
 * ugyldig felt sies ved feltet; et tomt felt sies ikke.
 *
 * Brukes både i fortolkningsmodulen og i simulatoren på redigeringssiden, så
 * de spør på samme måte. Den samlede vurderingen er med så snart det står en
 * tidligere prøve: `samletVurdering` holdes lik det.
 */
export function ThcSkjema({ inndata, onEndre, regler, forsteFelt, mildere }: ThcSkjemaProps) {
  const ingen = inndata.ingenTidligere
  // Avkryssingen står inne i «Forrige prøve», så den gjelder bare når det
  // finnes en forrige prøve å fortolke.
  const underCutoff = !ingen && inndata.forrigeUnderCutoff
  const kortTid = kortTidMellomProvene(regler, inndata)
  const langt = langtMellomProvene(regler, inndata)
  const dager = dagerMellom(inndata.forrigeDato, inndata.aktuellDato)
  const tidligere = inndata.tidligere ?? []
  // De tidligere prøvene og marginen betyr ingenting når prøvene ikke
  // vurderes mot hverandre.
  const vurderes = !ingen && !(kortTid && inndata.kortTid)
  // Merknaden om større måleusikkerhet gjelder bare når den faktisk brukes:
  // med en margin som korrigerer, og en beregnet IRCAK over 0 i forrige prøve
  // (ikke mens UCAK og NKRE ennå ikke gir en).
  const beregnetForrige = underCutoff ? beregnIrcak(inndata.forrigeUcak, inndata.forrigeNkre) : null
  const storreUsikkerhet =
    vurderes && !erUtenMargin(inndata.sikkerhetsmargin) && beregnetForrige !== null && beregnetForrige > 0

  const endreForrige = <K extends keyof ThcProve>(felt: K, verdi: ThcProve[K]) =>
    onEndre(FORRIGE_PROVEFELT[felt], verdi as unknown as ThcInndata[(typeof FORRIGE_PROVEFELT)[K]])
  const settTidligere = (prover: ThcProve[]) => {
    onEndre('tidligere', prover)
    onEndre('samletVurdering', prover.length > 0)
  }

  // En ny tidligere prøve får fokus i det første feltet; når en fjernes, går
  // fokuset til knappen som legger til en ny, og når forslaget om å fortolke
  // uten forrige prøve tas, til avkryssingen det huket av. Fokuset forsvinner
  // aldri med knappen som ble trykket.
  const [fokus, setFokus] = useState<{ til: 'ny' | 'legg' | 'ingen'; teller: number } | null>(null)
  const nyttFelt = useRef<HTMLInputElement>(null)
  const leggTil = useRef<HTMLButtonElement>(null)
  const ingenBoks = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const mal = { ny: nyttFelt, legg: leggTil, ingen: ingenBoks }[fokus?.til ?? 'ny']
    if (fokus) mal.current?.focus()
  }, [fokus])
  const flyttFokus = (til: 'ny' | 'legg' | 'ingen') => setFokus((f) => ({ til, teller: (f?.teller ?? 0) + 1 }))

  return (
    <div className="be-skjema thc-skjema">
      <div className="thc-valg">
        <label className="avkryssing avkryssing--felt">
          <input type="checkbox" checked={inndata.kronisk} onChange={(e) => onEndre('kronisk', e.target.checked)} />
          Legg kronisk bruk til grunn
        </label>
        <label className="avkryssing avkryssing--felt">
          <input
            ref={ingenBoks}
            type="checkbox"
            checked={ingen}
            onChange={(e) => onEndre('ingenTidligere', e.target.checked)}
          />
          Ingen tidligere prøve tilgjengelig
        </label>
      </div>

      <div className="be-prover">
        {!ingen && (
          <Provefelter
            tittel="Forrige prøve"
            prove={forrigeProve(inndata)}
            onEndre={endreForrige}
            forsteFelt={forsteFelt}
            verdienVurderes={vurderes}
          />
        )}

        <Provegruppe tittel="Denne prøven">
          <div className={`be-prove__felt ${ingen ? 'thc-prove__felt--en' : 'thc-prove__felt--to'}`}>
            <Tallinndata
              navn="IRCAK"
              smal
              verdi={inndata.aktuellVerdi}
              krav="over_null"
              onEndre={(verdi) => onEndre('aktuellVerdi', verdi)}
              feltRef={ingen ? forsteFelt : undefined}
            />
            {/* Uten en tidligere prøve å telle døgn mot brukes ikke datoen,
                og da skal den heller ikke fylles ut. */}
            {!ingen && <Datofelt verdi={inndata.aktuellDato} onEndre={(verdi) => onEndre('aktuellDato', verdi)} />}
          </div>
        </Provegruppe>

        {vurderes &&
          tidligere.map((prove, i) => {
            const tittel = tidligere.length === 1 ? 'Tidligere prøve' : `Tidligere prøve ${i + 1}`
            return (
              <Provefelter
                key={i}
                tittel={tittel}
                prove={prove}
                forsteFelt={i === tidligere.length - 1 ? nyttFelt : undefined}
                onEndre={(felt, verdi) => settTidligere(tidligere.map((p, j) => (j === i ? { ...p, [felt]: verdi } : p)))}
                onFjern={() => {
                  settTidligere(tidligere.filter((_, j) => j !== i))
                  flyttFokus('legg')
                }}
              />
            )
          })}
      </div>

      {/* Prøvene ble tatt så tett at de kanskje ikke bør vurderes mot
          hverandre. Brukeren avgjør; avkryssingen er av til den hukes av, og
          gjelder bare så lenge datoene sier at det er kort tid. */}
      {kortTid && (
        <div className="thc-tidsrom">
          <p>{kortTidtekst(dager)}</p>
          <label className="avkryssing avkryssing--felt">
            <input
              type="checkbox"
              checked={inndata.kortTid ?? false}
              onChange={(e) => onEndre('kortTid', e.target.checked)}
            />
            Ikke sammenlign prøvene (kort tid)
          </label>
        </div>
      )}
      {!ingen && langt && (
        <div className="thc-tidsrom thc-tidsrom--langt">
          <p>{langTidtekst(dager)}</p>
          <Button
            variant="kant"
            className="be-legg-til"
            onClick={() => {
              onEndre('ingenTidligere', true)
              flyttFokus('ingen')
            }}
          >
            Fortolk uten forrige prøve
          </Button>
        </div>
      )}

      {/* Sikkerhetsmarginen gjelder bare sammenligningen mot forrige
          prøve, så uten en slik sammenligning er den ikke noe å ta stilling
          til — samme grunn som datoene skjules av. */}
      {vurderes && (
        <div className="be-skjema__rad">
          <Button
            ref={leggTil}
            variant="kant"
            className="be-legg-til"
            onClick={() => {
              settTidligere([...tidligere, tomThcProve()])
              flyttFokus('ny')
            }}
          >
            + Legg til tidligere prøve
          </Button>
          <div className="thc-margin">
            <Sikkerhetsmargin
              marginer={regler.sikkerhetsmarginer.map(({ margin }) => margin)}
              standard={regler.standard_sikkerhetsmargin}
              verdi={inndata.sikkerhetsmargin}
              onVelg={(margin) => onEndre('sikkerhetsmargin', margin)}
              maalinger="THC-syre og kreatinin"
              merSkalTil="kommentaren sier at cannabis har vært inntatt etter forrige prøve. Tvilen kommer prøvegiver til gode"
              mildere={mildere}
            />
            {storreUsikkerhet && (
              <p className="thc-margin__merknad">{underCutofftekst(regler.maleusikkerhet.faktor_under_cutoff)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Datofeltet i en prøve. */
function Datofelt({ verdi, onEndre }: { verdi: string; onEndre: (verdi: string) => void }) {
  return (
    <label className="skjemafelt">
      <span>Prøvedato</span>
      <input className="inndatafelt" type="date" value={verdi} onChange={(e) => onEndre(e.target.value)} />
    </label>
  )
}

/**
 * Et tallfelt med ledeteksten over og en kort feil under når verdien er
 * ugyldig ({@link thcFeltfeil}). Navnet er ledeteksten alene, ikke feilen.
 */
function Tallinndata({
  navn,
  verdi,
  krav,
  onEndre,
  feltRef,
  smal = false,
  vurderes = true,
}: {
  navn: string
  verdi: string
  krav: ThcFeltkrav
  onEndre: (verdi: string) => void
  feltRef?: Ref<HTMLInputElement> | undefined
  /** IRCAK: aldri mer enn fire siffer, så feltet er smalt. */
  smal?: boolean
  /** Brukes verdien ikke i fortolkningen, sies det heller ingen feil ved den. */
  vurderes?: boolean
}) {
  const id = useId()
  const feil = vurderes ? thcFeltfeil(verdi, krav) : null
  return (
    <label className="skjemafelt">
      <span id={`${id}-navn`}>{navn}</span>
      <Tallfelt
        ref={feltRef}
        value={verdi}
        onChange={onEndre}
        className={smal ? 'thc-ircak' : undefined}
        aria-labelledby={`${id}-navn`}
        aria-invalid={feil ? true : undefined}
        aria-describedby={feil ? `${id}-feil` : undefined}
      />
      {feil && (
        <span className="be-feltfeil" id={`${id}-feil`}>
          {feil}
        </span>
      )}
    </label>
  )
}

/**
 * Feltene for én tidligere prøve: IRCAK, eller UCAK og NKRE når den lå under
 * cut-off, med IRCAK regnet ut av dem diskret under, og prøvedatoen. Brukes
 * for forrige prøve og for prøvene i den samlede vurderingen.
 */
function Provefelter({
  tittel,
  prove,
  onEndre,
  onFjern,
  forsteFelt,
  verdienVurderes = true,
}: {
  tittel: string
  prove: ThcProve
  onEndre: <K extends keyof ThcProve>(felt: K, verdi: ThcProve[K]) => void
  onFjern?: () => void
  forsteFelt?: Ref<HTMLInputElement> | undefined
  /**
   * Usann når prøvene ikke sammenlignes (kort tid): motoren leser da ikke
   * verdien, så feltene sier ingen feil. Verdiene og datoen står, så
   * sammenligningen kan tas opp igjen.
   */
  verdienVurderes?: boolean
}) {
  const beregnetIrcak = prove.underCutoff ? beregnIrcak(prove.ucak, prove.nkre) : null
  return (
    <Provegruppe
      tittel={tittel}
      valg={
        <>
          {/* Var urinen så fortynnet at THC-syre havnet under
              påvisningsgrensen, svarer labsystemet «ikke påvist» og regner
              ingen IRCAK. De to interne tallene tastes da i stedet, og IRCAK
              regnes ut av dem. */}
          <label className="avkryssing avkryssing--felt">
            <input type="checkbox" checked={prove.underCutoff} onChange={(e) => onEndre('underCutoff', e.target.checked)} />
            Under cut-off
          </label>
          {onFjern && <Fjernknapp etikett={`Fjern ${tittel.toLowerCase()}`} onClick={onFjern} />}
        </>
      }
    >
      <div className={`be-prove__felt ${prove.underCutoff ? 'thc-prove__felt--tre' : 'thc-prove__felt--to'}`}>
        {prove.underCutoff ? (
          <>
            <Tallinndata
              navn="UCAK (THC-syre)"
              verdi={prove.ucak}
              krav="ikke_negativ"
              onEndre={(verdi) => onEndre('ucak', verdi)}
              feltRef={forsteFelt}
              vurderes={verdienVurderes}
            />
            <Tallinndata
              navn="NKRE (kreatinin)"
              verdi={prove.nkre}
              krav="over_null"
              onEndre={(verdi) => onEndre('nkre', verdi)}
              vurderes={verdienVurderes}
            />
          </>
        ) : (
          <Tallinndata
            navn="IRCAK"
            smal
            verdi={prove.verdi}
            krav="ikke_negativ"
            onEndre={(verdi) => onEndre('verdi', verdi)}
            feltRef={forsteFelt}
            vurderes={verdienVurderes}
          />
        )}
        <Datofelt verdi={prove.dato} onEndre={(verdi) => onEndre('dato', verdi)} />
      </div>
      {prove.underCutoff && (
        <p className="be-kvotient" role="status">
          Beregnet IRCAK <strong>{beregnetIrcak === null ? '–' : formaterIrcak(beregnetIrcak)}</strong>
        </p>
      )}
    </Provegruppe>
  )
}
