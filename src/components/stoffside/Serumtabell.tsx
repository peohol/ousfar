import { useId, useMemo, type ReactNode } from 'react'
import { DOSEKOLONNER, formaterTall, type Doserad } from '../../faginnhold/paneler'
import {
  REFERANSEOMRADEPROSJEKTET,
  lesSerumtabell,
  type Persentilkolonne,
  type Serumblokk,
} from '../../faginnhold/serumtabell'
import { fold } from '../../faginnhold/sok'
import { useFaarPlass } from '../../hooks/useFaarPlass'
import { Uthev } from '../Uthev'

/**
 * Tabellen over serumkonsentrasjoner ved ulike doser, med samme oppbygning
 * som i kilden (`originaldata/Psykofarmaka.pdf`): én kolonne per dose og én
 * rad hver for antall prøver, 10-persentil, median og 90-persentil, én tabell
 * per stoff, og referanseområdeprosjektet i en egen liten tabell under.
 * Kildene står i panelets referansefelt, ikke som tekst over hver tabell.
 *
 * Tallene og tekstene er de lagrede, lest tilbake uten tap (`lesSerumtabell`).
 * Rader som ikke har den formen, vises som vanlige rader med kolonnene som er
 * i bruk. Tabellene er ekte HTML-tabeller med rad- og kolonneoverskrifter.
 *
 * Tabellene ruller aldri sidelengs (`useFaarPlass`). Får persentiltabellen
 * ikke plass i bredden, snus den: dosene blir rader og målene kolonner. Får
 * heller ikke den plass, eller får de vanlige radene ikke plass, vises hver
 * dose eller rad for seg, med navnet på målet eller kolonnen foran hver verdi.
 */
export function Serumtabell({ rader, tittel }: { rader: readonly Doserad[]; tittel: string }) {
  const blokker = useMemo(() => lesSerumtabell(rader), [rader])
  return (
    <div className="serumtabell">
      {blokker.map((blokk, i) => (
        <Blokk key={i} blokk={blokk} tittel={tittel} />
      ))}
    </div>
  )
}

function Blokk({ blokk, tittel }: { blokk: Serumblokk; tittel: string }) {
  switch (blokk.slag) {
    case 'persentiler':
      return <Persentiltabell blokk={blokk} />
    case 'prosjekt':
      return <Prosjekttabell blokk={blokk} />
    case 'rader':
      return <Radtabell rader={blokk.rader} tittel={tittel} />
  }
}

/** En tom celle der kilden ikke har noe tall, som i PDF-en. */
function Celle({ verdi }: { verdi: number | null }) {
  if (verdi === null) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="kun-skjermleser">ikke oppgitt</span>
      </>
    )
  }
  return <Uthev tekst={formaterTall(verdi)} />
}

const PERSENTILRADER: readonly { felt: keyof Omit<Persentilkolonne, 'dose'>; tittel: (enhet: string) => string }[] = [
  { felt: 'antall', tittel: () => 'Antall prøver' },
  { felt: 'p10', tittel: (enhet) => `10-persentil (${enhet})` },
  { felt: 'median', tittel: (enhet) => `Median (${enhet})` },
  { felt: 'p90', tittel: (enhet) => `90-persentil (${enhet})` },
]

/** Kolonnen for alle dosene samlet, som står sist i kilden. */
function erSamlet(dose: string): boolean {
  return fold(dose) === 'alle'
}

/** Persentiltabellens utforminger, fra den bredeste til den smaleste. */
const PERSENTILOPPSETT = [DoserSomKolonner, DoserSomRader, DoserHverForSeg] as const

function Persentiltabell({ blokk }: { blokk: Extract<Serumblokk, { slag: 'persentiler' }> }) {
  const overskrift = useId()
  const [boks, valgt] = useFaarPlass(PERSENTILOPPSETT.length, blokk)
  const Oppsett = PERSENTILOPPSETT[valgt]!
  // En rad der kilden ikke har et eneste tall, tas ikke med.
  const maalene = PERSENTILRADER.filter(({ felt }) => blokk.kolonner.some((k) => k[felt] !== null))
  return (
    <section className="serumtabell__del" aria-labelledby={overskrift}>
      <header className="serumtabell__hode">
        <h3 id={overskrift} className="serumtabell__stoff">
          <Uthev tekst={blokk.stoff} />
        </h3>
      </header>
      <div ref={boks} className="serumtabell__ramme">
        <Oppsett blokk={blokk} maalene={maalene} overskrift={overskrift} />
      </div>
    </section>
  )
}

interface Persentiloppsett {
  blokk: Extract<Serumblokk, { slag: 'persentiler' }>
  maalene: typeof PERSENTILRADER
  overskrift: string
}

/** Som i kilden: én kolonne per dose og én rad per mål. */
function DoserSomKolonner({ blokk, maalene, overskrift }: Persentiloppsett) {
  return (
    <table className="serumtabell__tabell serumtabell__tabell--persentiler" aria-labelledby={overskrift}>
      <thead>
        <tr>
          <th scope="col">Dose</th>
          {blokk.kolonner.map((k, i) => (
            <th key={i} scope="col" className="serumtabell__dose" data-samlet={erSamlet(k.dose) || undefined}>
              <Uthev tekst={k.dose} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {maalene.map(({ felt, tittel }) => (
          <tr key={felt}>
            <th scope="row">{tittel(blokk.enhet)}</th>
            {blokk.kolonner.map((k, i) => (
              <td key={i} data-felt={felt} data-samlet={erSamlet(k.dose) || undefined}>
                <Celle verdi={k[felt]} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Den samme tabellen snudd, for smale flater: én rad per dose og én kolonne per mål. */
function DoserSomRader({ blokk, maalene, overskrift }: Persentiloppsett) {
  return (
    <table
      className="serumtabell__tabell serumtabell__tabell--persentiler serumtabell__tabell--snudd"
      aria-labelledby={overskrift}
    >
      <thead>
        <tr>
          <th scope="col">Dose</th>
          {maalene.map(({ felt, tittel }) => (
            <th key={felt} scope="col" data-felt={felt}>
              {tittel(blokk.enhet)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {blokk.kolonner.map((k, i) => (
          <tr key={i} data-samlet={erSamlet(k.dose) || undefined}>
            <th scope="row" className="serumtabell__dose">
              <Uthev tekst={k.dose} />
            </th>
            {maalene.map(({ felt }) => (
              <td key={felt} data-felt={felt}>
                <Celle verdi={k[felt]} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Smalest: hver dose for seg, med målene under. */
function DoserHverForSeg({ blokk, maalene, overskrift }: Persentiloppsett) {
  return (
    <Stabel
      etikett={overskrift}
      elementer={blokk.kolonner.map((k) => ({
        tittel: <Uthev tekst={k.dose} />,
        samlet: erSamlet(k.dose),
        verdier: maalene.map(({ felt, tittel }) => ({
          felt,
          navn: tittel(blokk.enhet),
          verdi: <Celle verdi={k[felt]} />,
        })),
      }))}
    />
  )
}

interface Stabelelement {
  tittel?: ReactNode
  samlet?: boolean
  verdier: readonly { felt: string; navn: string; verdi: ReactNode }[]
}

/** En tabell vist som en liste, ett element per rad, med navnet foran hver verdi. */
function Stabel({ etikett, elementer }: { etikett: string; elementer: readonly Stabelelement[] }) {
  return (
    <ul className="serumtabell__stabel" aria-labelledby={etikett}>
      {elementer.map(({ tittel, samlet, verdier }, i) => (
        <li key={i} data-samlet={samlet || undefined}>
          {tittel && <p className="serumtabell__dose">{tittel}</p>}
          <dl>
            {verdier.map(({ felt, navn, verdi }) => (
              <div key={felt} data-felt={felt}>
                <dt>{navn}</dt>
                <dd>{verdi}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  )
}

function Prosjekttabell({ blokk }: { blokk: Extract<Serumblokk, { slag: 'prosjekt' }> }) {
  const overskrift = useId()
  return (
    <section className="serumtabell__del serumtabell__del--prosjekt" aria-labelledby={overskrift}>
      <header className="serumtabell__hode">
        <h3 id={overskrift} className="serumtabell__stoff">
          <Uthev tekst={`${REFERANSEOMRADEPROSJEKTET.navn}, dose ${blokk.doser}`} />
        </h3>
      </header>
      <table className="serumtabell__tabell serumtabell__tabell--prosjekt" aria-labelledby={overskrift}>
        <tbody>
          <tr data-felt="p10">
            <th scope="row">10-persentil ({blokk.enhet})</th>
            <td>
              <Celle verdi={blokk.p10} />
            </td>
          </tr>
          <tr data-felt="p90">
            <th scope="row">90-persentil ({blokk.enhet})</th>
            <td>
              <Celle verdi={blokk.p90} />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/**
 * Rader som ikke er en persentiltabell, med kolonnene som faktisk er i bruk.
 * Får tabellen ikke plass, vises hver rad for seg med kolonnenavnene foran.
 */
function Radtabell({ rader, tittel }: { rader: readonly Doserad[]; tittel: string }) {
  const overskrift = useId()
  const [boks, valgt] = useFaarPlass(2, rader)
  const kolonner = DOSEKOLONNER.filter(({ felt }) => rader.some((rad) => rad[felt] !== ''))
  return (
    <div ref={boks} className="serumtabell__ramme">
      <span id={overskrift} className="kun-skjermleser">
        {tittel}
      </span>
      {valgt === 0 ? (
        <table className="serumtabell__tabell serumtabell__tabell--rader" aria-labelledby={overskrift}>
          <thead>
            <tr>
              {kolonner.map(({ felt, tittel: kolonne }) => (
                <th key={felt} scope="col">
                  {kolonne}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rader.map((rad, i) => (
              <tr key={i}>
                {kolonner.map(({ felt }) => (
                  <td key={felt}>
                    <Uthev tekst={rad[felt]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Stabel
          etikett={overskrift}
          elementer={rader.map((rad) => ({
            verdier: kolonner
              .filter(({ felt }) => rad[felt] !== '')
              .map(({ felt, tittel: navn }) => ({ felt, navn, verdi: <Uthev tekst={rad[felt]} /> })),
          }))}
        />
      )}
    </div>
  )
}
