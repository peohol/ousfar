import type { CSSProperties } from 'react'
import { Card } from './Card'
import { ManualCopy } from './ManualCopy'
import { Metalinje } from './Metalinje'
import { Panelhode } from './Panelhode'
import { Shortcut } from './Shortcut'
import { StepBar } from './StepBar'
import { Regelstatus } from './Regelstatus'
import { useTips } from './Tips'
import type { EtgAlternativ, Etgtilfeller } from '../domain/etg'
import { indexToDigit } from '../hooks/useKeyboard'
import type { Analyte } from '../types'

export interface EtgStepProps {
  /** Søkeoppføringen modulen ble åpnet fra: kodene, metoden og navnet. */
  analyte: Analyte
  /** Tilfellene fra modulens regelsett, eller hvorfor de ikke er der. */
  tilfeller: Etgtilfeller
  onPick: (alternativ: EtgAlternativ) => void
  onBack: () => void
  /** Kommentaren som skal kopieres for hånd, når utklippstavlen er utilgjengelig. */
  failed: { message: string; comment: string } | null
}

/**
 * Fortolkningsmodulen for etylglukuronid (EtG) og etylsulfat (EtS) i urin.
 *
 * De to omdannelsesproduktene vurderes alltid sammen, og det eneste modulen
 * trenger å vite er hva som er påvist av dem. Det gjør steget til det samme
 * valget som konsentrasjonsbåndene er for psykofarmaka: én knapp per tilfelle,
 * med tallet sitt, og kommentaren kopiert i det knappen trykkes. Derfor er
 * knappene bygd som båndknappene, og følger med videre til limsteget på samme
 * måte. Tilfellene og tekstene er regelsettet fagmiljøet har publisert; uten
 * det sier modulen fra i stedet for å fortolke.
 */
export function EtgStep({ analyte, tilfeller, onPick, onBack, failed }: EtgStepProps) {
  const koder = (analyte.modul?.analytter ?? []).map((a) => a.kode)
  return (
    <section className="steg steg--etg" aria-label="Velg hva som er påvist">
      <StepBar onEsc={onBack}>Bytt analytt</StepBar>

      <Card align="start" className="analyttkort">
        <Metalinje koder={koder} metode={analyte.analysemetode} lenker />
        <h1 className="analytt__navn">{analyte.navn}</h1>
        {analyte.modul?.undertittel && <p className="modul-undertittel">{analyte.modul.undertittel}</p>}
      </Card>

      <Card align="start" className="bandkort">
        {tilfeller.status === 'klar' ? (
          <EtgValg alternativer={tilfeller.alternativer} onPick={onPick} />
        ) : (
          <Regelstatus regler={tilfeller} />
        )}
      </Card>

      {failed && <ManualCopy message={failed.message} comment={failed.comment} />}
    </section>
  )
}

/** Knappene, én per tilfelle, med tallet sitt. */
function EtgValg({
  alternativer,
  onPick,
}: {
  alternativer: EtgAlternativ[]
  onPick: (alternativ: EtgAlternativ) => void
}) {
  return (
    <>
      <Panelhode>Påvist i denne prøven</Panelhode>
      {/* Samme rad som båndknappene, men med ord i stedet for tall: hver
            knapp trenger mer bredde før skriften må krympe, og tallmerket står
            alltid og er regnet med i bredden. */}
      <ul
        className="band"
        style={
          {
            '--antall': alternativer.length,
            '--band-innhold': 13,
          } as CSSProperties
        }
      >
        {alternativer.map((alternativ, i) => (
          <EtgKnapp
            key={alternativ.id}
            alternativ={alternativ}
            snarvei={indexToDigit(i)}
            onPick={() => onPick(alternativ)}
          />
        ))}
      </ul>
    </>
  )
}

/**
 * Ett av tilfellene. Kommentaren som havner på utklippstavlen henger på
 * knappen som et tips, så den kan leses før valget tas — som på båndknappene.
 *
 * Tallmerket står alltid. Modulen er tre knapper og ingenting annet, og da er
 * tastene den raskeste veien gjennom den; de skal ikke måtte slås på først.
 */
function EtgKnapp({ alternativ, snarvei, onPick }: { alternativ: EtgAlternativ; snarvei: string; onPick: () => void }) {
  const forste = alternativ.plasseringer[0]
  const tips = useTips(forste?.tekst ?? '')

  return (
    <li>
      <button
        type="button"
        // Kvitteringen legges der knappen står, og beviset i neste steg flyter
        // opp fra den samme ruten. Begge finner knappen herfra — også når
        // tilfellet ble valgt med tastaturet.
        data-etg={alternativ.id}
        className="bandknapp bandknapp--noytral"
        onClick={onPick}
        aria-keyshortcuts={snarvei}
        {...tips.props}
      >
        <span className="bandknapp__verdi">{alternativ.merke}</span>
        <Shortcut always>{snarvei}</Shortcut>
      </button>
      {tips.forklaring}
    </li>
  )
}
