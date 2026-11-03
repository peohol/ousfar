import { useEffect, useId, useState } from 'react'
import { fullTid, kortTid, type Skjulehandling } from '../../traad/modell'
import { Ikon } from '../ikon/Ikon'
import type { Ikonnavn } from '../ikon/register'
import '../../styles/traad.css'

/** Et tidspunkt kort, med hele datoen og klokkeslettet ved peker og for skjermlesere. */
export function Tidspunkt({ iso, endret }: { iso: string; endret?: string | null }) {
  return (
    <>
      <time dateTime={iso} title={fullTid(iso)}>
        {kortTid(iso)}
      </time>
      {endret && (
        <span className="ide-endret" title={`Endret ${fullTid(endret)}`}>
          {' '}
          · endret
        </span>
      )}
    </>
  )
}

/**
 * Hjertet på en idé eller kommentar: antallet, og om den innloggede har gitt
 * et. Knappen sier det samme med `aria-pressed`.
 */
export function Hjerteknapp({
  antall,
  gitt,
  onVeksle,
  hva,
  laast = false,
}: {
  antall: number
  gitt: boolean
  onVeksle: () => void
  /** «idéen» eller «kommentaren», til navnet på knappen. */
  hva: string
  /** Idéen er frosset: hjertene står, men kan ikke gis eller tas tilbake. */
  laast?: boolean
}) {
  return (
    <button
      type="button"
      className="idehandling hjerteknapp"
      aria-pressed={gitt}
      aria-label={laast ? `${antall} ${antall === 1 ? 'hjerte' : 'hjerter'} på ${hva}` : `${gitt ? 'Ta tilbake hjertet på' : 'Gi hjerte til'} ${hva} (${antall})`}
      data-ih=""
      disabled={laast}
      onClick={onVeksle}
    >
      <Ikon navn="heart" storrelse="ui" />
      <span aria-hidden="true">{antall}</span>
    </button>
  )
}

/**
 * En rad med piller der én er valgt, med navnet på raden foran: sorteringen
 * i lista og statusen på en idé.
 */
export function Valgrad<T extends string>({
  navn,
  valg,
  valgt,
  etiketter,
  onVelg,
}: {
  navn: string
  valg: readonly T[]
  valgt: T
  etiketter: Record<T, string>
  onVelg: (verdi: T) => void
}) {
  const id = useId()
  return (
    <div className="idevalg" role="group" aria-labelledby={id}>
      <span id={id} className="idevalg__navn">
        {navn}
      </span>
      {valg.map((v) => (
        <button key={v} type="button" className="sokefilter" aria-pressed={v === valgt} onClick={() => onVelg(v)}>
          {etiketter[v]}
        </button>
      ))}
    </div>
  )
}

/** En liten tekstknapp med ikon i handlingsraden under en idé eller kommentar. */
export function Idehandling({
  ikon,
  children,
  onClick,
  ...rest
}: {
  ikon: Ikonnavn
  children: string
  onClick: () => void
  'aria-expanded'?: boolean
  /** Et lengre navn enn det som står på knappen, som begynner med det. */
  'aria-label'?: string
  'aria-haspopup'?: 'dialog'
}) {
  return (
    <button type="button" className="idehandling" data-ih="" onClick={onClick} {...rest}>
      <Ikon navn={ikon} storrelse="ui" />
      <span>{children}</span>
    </button>
  )
}

/** Hvor lenge «Bekreft» står før knappen går tilbake. */
const BEKREFT_I = 4000

/**
 * En handling i to trykk, som sletting: det første gjør knappen om til
 * «Bekreft …», det andre gjør det. Går fokus ut, eller går det noen
 * sekunder, er den tilbake.
 */
export function Bekreftknapp({
  ikon,
  tekst,
  bekreftTekst,
  etikett = tekst,
  bekreftEtikett = bekreftTekst,
  onBekreft,
}: {
  ikon: Ikonnavn
  tekst: string
  bekreftTekst: string
  /** Navnet på knappen, når teksten alene ikke sier hva den gjelder. */
  etikett?: string
  bekreftEtikett?: string
  onBekreft: () => void
}) {
  const [bekreft, setBekreft] = useState(false)
  useEffect(() => {
    if (!bekreft) return
    const frist = window.setTimeout(() => setBekreft(false), BEKREFT_I)
    return () => window.clearTimeout(frist)
  }, [bekreft])

  return (
    <button
      type="button"
      className="idehandling idehandling--slett"
      data-bekreft={bekreft || undefined}
      aria-label={bekreft ? bekreftEtikett : etikett}
      data-ih=""
      onBlur={() => setBekreft(false)}
      onClick={() => (bekreft ? onBekreft() : setBekreft(true))}
    >
      <Ikon navn={ikon} storrelse="ui" />
      <span aria-live="polite">{bekreft ? bekreftTekst : tekst}</span>
    </button>
  )
}

/** Sletting i to trykk. */
export function Slettknapp({ onSlett, hva }: { onSlett: () => void; hva: string }) {
  return (
    <Bekreftknapp
      ikon="trash"
      tekst="Slett"
      bekreftTekst="Bekreft sletting"
      etikett={`Slett ${hva}`}
      bekreftEtikett={`Bekreft sletting av ${hva}`}
      onBekreft={onSlett}
    />
  )
}

/**
 * Det en administrator kan gjøre med innholdet i et innlegg eller en
 * kommentar i diskusjonene: «Skjul» (i to trykk), og når det er skjult,
 * «Vis igjen» eller «Fjern for godt» (i to trykk). Det som ble skjult før
 * teksten ble tatt vare på, kan ikke vises igjen, og da står ingen knapp.
 */
export function Skjulehandlinger({
  hva,
  skjulTekst = 'Skjul',
  skjult,
  kanVises,
  onHandling,
}: {
  /** «innlegget» eller «kommentaren». */
  hva: string
  /** Teksten på «Skjul», når den alene ikke sier hva som skjules. */
  skjulTekst?: string
  skjult: boolean
  kanVises: boolean
  onHandling: (handling: Skjulehandling) => void
}) {
  const innholdet = `innholdet i ${hva}`
  if (!skjult) {
    return (
      <Bekreftknapp
        ikon="skjul"
        tekst={skjulTekst}
        bekreftTekst="Bekreft skjuling"
        etikett={skjulTekst === 'Skjul' ? `Skjul ${innholdet}` : skjulTekst}
        bekreftEtikett={`Bekreft at ${innholdet} skjules`}
        onBekreft={() => onHandling('skjul')}
      />
    )
  }
  if (!kanVises) return null
  return (
    <>
      <Idehandling ikon="vis" aria-label={`Vis igjen ${innholdet}`} onClick={() => onHandling('vis')}>
        Vis igjen
      </Idehandling>
      <Bekreftknapp
        ikon="trash"
        tekst="Fjern for godt"
        bekreftTekst="Bekreft fjerning"
        etikett={`Fjern for godt ${innholdet}`}
        bekreftEtikett={`Bekreft at ${innholdet} fjernes for godt`}
        onBekreft={() => onHandling('fjern')}
      />
    </>
  )
}
