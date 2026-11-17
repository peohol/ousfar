import { dato } from '../../legemiddeldata/referanser'
import type { Niva } from '../../cypinfo/modell'
import {
  CYPINFO_ADRESSE,
  CYPINFO_TITTEL,
  CYPINFO_VISES_FOR,
  gensettittel,
  legemiddeloppsummering,
  type Cypinfolegemiddel,
} from '../../cypinfo/stoffside'
import { Merke, type Merketone } from '../Merke'
import { Detaljkort } from '../seksjoner/Seksjon'
import { Uthev } from '../Uthev'
import { Gruppe, Kildelenke } from './Farmakogenetikkdeler'
import { elementAnker } from './Paneler'
import type { Cypinfotilstand } from './useFarmakogenetikk'

/** Tonen for nivået. Betydningen står alltid i teksten ved siden av. */
const TONE: Record<Niva, Merketone> = { high: 'alvorlig', medium: 'toksisk', standard: 'aksent', info: 'noytral' }

/**
 * CYPinfo i «Farmakogenetikk»: ett detaljkort per legemiddel siden er koblet
 * til, med CYPinfos anbefaling ved hver fenotype, gruppert etter genene, eller
 * CYPinfos faste tekst når genene ikke er relevante. Tekstene er CYPinfos,
 * uendret. For en pasients eget resultat lenkes det til CYPinfo.
 */
export function Cypinfovisning({ tilstand }: { tilstand: Cypinfotilstand }) {
  if (tilstand.status === 'ingen') return null
  if (tilstand.status === 'laster') {
    return (
      <p className="preparater__melding" role="status">
        Henter anbefalingene fra CYPinfo …
      </p>
    )
  }
  if (tilstand.status === 'feil') {
    return (
      <p className="preparater__melding" role="alert">
        Fikk ikke hentet anbefalingene fra CYPinfo. {tilstand.feil}
      </p>
    )
  }
  const { visning } = tilstand
  if (visning.legemidler.length === 0) return null
  const hentet = dato(visning.kilde.kontrollert_kl ?? visning.kilde.endret_kl)
  return (
    <div className="farmakogenetikk">
      <Gruppe
        tittel={CYPINFO_TITTEL}
        ingress={
          <>
            Hva CYPinfo anbefaler ved de ulike fenotypene, med CYPinfos tekst. For en pasients eget resultat:{' '}
            <Kildelenke lenke={CYPINFO_ADRESSE}>cypinfo.no</Kildelenke>.
            {CYPINFO_VISES_FOR === 'systemarkitekter' && ' Vises foreløpig bare for systemarkitekter.'}
          </>
        }
      >
        {visning.legemidler.map((l) => (
          <Legemiddelkortet key={l.id} legemiddel={l} hentet={hentet} />
        ))}
      </Gruppe>
    </div>
  )
}

function Legemiddelkortet({ legemiddel: l, hentet }: { legemiddel: Cypinfolegemiddel; hentet: string | null }) {
  return (
    <li>
      <Detaljkort id={l.kort} ikon="dna" tittel={<Uthev tekst={l.navn} />} oppsummering={legemiddeloppsummering(l)}>
        <div className="interaksjon" id={elementAnker(l.kort)}>
          {l.utenRelevanteGener && (
            <ul className="cypinfo__anbefalinger">
              <Anbefaling niva={l.utenRelevanteGener.niva} nivatekst={l.utenRelevanteGener.nivatekst} avsnitt={l.utenRelevanteGener.avsnitt} />
            </ul>
          )}
          {l.gensett.map((s) => (
            <section key={s.gener.join(' ')} aria-label={gensettittel(s.gener)}>
              <p className="cypinfo__overskrift">{gensettittel(s.gener)}</p>
              <ul className="cypinfo__anbefalinger">
                {s.rader.map((r) => (
                  <Anbefaling key={r.id} fenotyper={r.fenotyper} niva={r.niva} nivatekst={r.nivatekst} avsnitt={r.avsnitt} />
                ))}
              </ul>
            </section>
          ))}
          <p className="farmakogenetikk__ingress">
            Kilde: CYPinfo{hentet ? `, kontrollert ${hentet}` : ''}. Gjelder ikke legemiddelinteraksjoner.
          </p>
        </div>
      </Detaljkort>
    </li>
  )
}

function Anbefaling({
  fenotyper = [],
  niva,
  nivatekst,
  avsnitt,
}: {
  fenotyper?: readonly { gen: string; fenotype: string }[]
  niva: Niva
  nivatekst: string
  avsnitt: readonly string[]
}) {
  return (
    <li className="cypinfo__anbefaling">
      {fenotyper.length > 0 && (
        <p className="cypinfo__fenotyper">
          {fenotyper.map((f) => (
            <span key={f.gen} className="cypinfo__fenotype">
              <Uthev tekst={`${f.gen}: ${f.fenotype}`} />
            </span>
          ))}
        </p>
      )}
      <p className="cypinfo__niva">
        <Merke tone={TONE[niva]}>{nivatekst}</Merke>
      </p>
      {avsnitt.length > 0 ? (
        avsnitt.map((a, i) => (
          <p key={i} className="cypinfo__tekst">
            <Uthev tekst={a} />
          </p>
        ))
      ) : (
        <p className="cypinfo__tekst cypinfo__tekst--mangler">Teksten kommer ved neste henting fra CYPinfo.</p>
      )}
    </li>
  )
}
