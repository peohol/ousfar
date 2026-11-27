import { useId, type MouseEvent } from 'react'
import { Bryter } from '../Bryter'
import { Ikon } from '../ikon/Ikon'
import { gjeldendeUnder, nyttUnder, type Menyavsnitt, type Menypunkt, type Menyniva as Niva } from './menytre'

/**
 * Innholdet i ett menynivå (`meny/menytre.ts`): søkefeltet og bryteren når
 * nivået har dem, og avsnittene med valgene, eller treffene på søket. Alt
 * står i panelets ene rulleområde; ingenting her ruller for seg.
 */
export interface MenynivaProps {
  niva: Niva
  /** Søket i nivået, når det har et søkefelt. */
  sporring: string
  onSok: (sporring: string) => void
  /** Et valg med undermeny er valgt. `tastatur` er sant når det ble valgt med tastaturet. */
  onInn: (punkt: Menypunkt, tastatur: boolean) => void
  /** En lenke er fulgt i samme fane: menyen lukkes. */
  onLenke: () => void
}

/** Klassen hvert valg har, så panelet kan flytte fokus mellom dem med piltastene. */
export const MENYVALG = 'menyvalg'

export function Menyniva({ niva, sporring, onSok, onInn, onLenke }: MenynivaProps) {
  const sokId = useId()
  const treff = niva.sok && sporring.trim() ? niva.sok.finn(sporring) : null
  const avsnitt = treff ?? niva.avsnitt
  const antallTreff = treff?.reduce((n, a) => n + a.punkter.length, 0) ?? 0

  return (
    <>
      {niva.sok && (
        <div className="menysok">
          <label htmlFor={sokId} className="kun-skjermleser">
            {niva.sok.etikett}
          </label>
          <Ikon navn="search" storrelse="ui" />
          <input
            id={sokId}
            type="search"
            className="menysok__felt"
            placeholder={niva.sok.etikett}
            value={sporring}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => onSok(e.target.value)}
            onKeyDown={(e) => {
              // Escape tømmer feltet først; menyen lukkes ved neste trykk (lagstakken).
              if (e.key === 'Escape' && sporring) {
                e.preventDefault()
                onSok('')
              }
            }}
          />
        </div>
      )}
      {treff && (
        <p className={antallTreff === 0 ? 'menyniva__tomt' : 'kun-skjermleser'} role="status">
          {antallTreff === 0 ? niva.sok!.ingenTreff : antallTreff === 1 ? 'Ett treff' : `${antallTreff} treff`}
        </p>
      )}
      {niva.bryter && !treff && (
        <Bryter className="menyveksle" pa={niva.bryter.pa} onEndre={niva.bryter.onEndre}>
          {niva.bryter.navn}
        </Bryter>
      )}
      {!treff && avsnitt.length === 0 && niva.tomt && <p className="menyniva__tomt">{niva.tomt}</p>}
      {avsnitt.map((a) => (
        <Avsnitt key={a.id} avsnitt={a} onInn={onInn} onLenke={onLenke} />
      ))}
    </>
  )
}

function Avsnitt({ avsnitt: a, onInn, onLenke }: { avsnitt: Menyavsnitt } & Pick<MenynivaProps, 'onInn' | 'onLenke'>) {
  const overskrift = useId()
  return (
    <div className="menyavsnitt">
      {a.overskrift && (
        <h3 className="menyavsnitt__overskrift" id={overskrift}>
          {a.overskrift}
        </h3>
      )}
      <ul className="menyavsnitt__liste" aria-labelledby={a.overskrift ? overskrift : undefined}>
        {a.punkter.map((p) => (
          <li key={p.id} className={p.tillegg && 'menyavsnitt__rad'}>
            <Menyvalg punkt={p} onInn={onInn} onLenke={onLenke} />
            {p.tillegg && (
              <button type="button" className="menyvalg__tillegg" aria-label={p.tillegg.etikett} onClick={p.tillegg.handling}>
                <Ikon navn={p.tillegg.ikon} storrelse="ui" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Et klikk som åpner lenken i samme fane. Med en modifikator eller midtknappen åpnes den et annet sted, og menyen står. */
const iSammeFane = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

function Menyvalg({ punkt: p, onInn, onLenke }: { punkt: Menypunkt } & Pick<MenynivaProps, 'onInn' | 'onLenke'>) {
  const nytt = nyttUnder(p)
  const felles = {
    className: MENYVALG,
    'data-menyvalg': p.id,
    'aria-current': p.gjeldende ? ('page' as const) : undefined,
    'data-gjeldende': !p.gjeldende && gjeldendeUnder(p) ? 'under' : undefined,
    // Valg uten ikon, som stoffene i en kategori, står tettere.
    'data-ikon': p.ikon ? '' : undefined,
  }
  const innhold = (
    <>
      {p.ikon && <Ikon navn={p.ikon} storrelse="ui" className="menyvalg__ikon" />}
      <span className="menyvalg__tekst">
        <span className="menyvalg__navn">{p.navn}</span>
        {p.beskrivelse && <span className="menyvalg__beskrivelse">{p.beskrivelse}</span>}
      </span>
      {/* Et tall sier fra selv; prikken står bare der det ikke er noe tall. */}
      {nytt.length > 0 && !p.merke && <span className="nyprikk" role="img" aria-label={nytt.join(', ')} />}
      {p.merke &&
        (p.merkeetikett ? (
          <>
            <span className="menyvalg__merke" aria-hidden="true">
              {p.merke}
            </span>
            <span className="kun-skjermleser">{p.merkeetikett}</span>
          </>
        ) : (
          <span className="menyvalg__merke">{p.merke}</span>
        ))}
      {p.hint && <span className="menyvalg__merke">{p.hint}</span>}
      {p.undermeny && <Ikon navn="chev" className="menyvalg__pil" />}
    </>
  )

  if (p.adresse)
    return (
      <a {...felles} href={p.adresse} onClick={(e) => iSammeFane(e) && onLenke()}>
        {innhold}
      </a>
    )
  return (
    <button
      type="button"
      {...felles}
      data-undermeny={p.undermeny ? '' : undefined}
      // `detail` er 0 når knappen ble trykket med tastaturet.
      onClick={p.undermeny ? (e) => onInn(p, e.detail === 0) : p.handling}
    >
      {innhold}
    </button>
  )
}
