import type { Paneldefinisjon } from '../../faginnhold/paneler'
import { ramsOpp } from '../../faginnhold/oppsummering'
import type { Tilleggstekst } from '../../faginnhold/sok'
import { cypinfosoketekster, oppsummerCypinfo } from '../../cypinfo/stoffside'
import { kortelementer, kortoppsummering, Panel, panelteksten, Paneltekst, Redaksjonskort, type Panelkontekst } from './Paneler'
import { Cypinfovisning } from './Cypinfovisning'
import type { Cypinfotilstand } from './useFarmakogenetikk'
import '../../styles/farmakogenetikk.css'

/** Tekstene fra CYPinfo søket på siden finner, med detaljkortet de står i. */
export function farmakogenetikksoketekster(cypinfo: Cypinfotilstand): Tilleggstekst[] {
  return cypinfo.status === 'klar' ? cypinfosoketekster(cypinfo.visning) : []
}

/**
 * Seksjonen «Farmakogenetikk»: øverst redaksjonell fritekst og kort, som
 * redigeres her, og under dem CYPinfos anbefalinger for legemidlene siden er
 * koblet til (`Cypinfovisning`). CYPinfo er OUSFARs eneste automatiske kilde
 * for farmakogenetikk (#437); ClinPGx og CPIC er fjernet. En gammel kobling
 * til ClinPGx på siden (elementtypen `clinpgxkobling`) vises ikke.
 */
export function Farmakogenetikkpanel({
  definisjon,
  kontekst,
  cypinfo,
}: {
  definisjon: Paneldefinisjon
  kontekst: Panelkontekst
  /** CYPinfo for legemidlene siden er koblet til; `ingen` for den som ikke ser CYPinfo. */
  cypinfo: Cypinfotilstand
}) {
  const elementer = kortelementer(kontekst, definisjon.nokkel)
  const tekst = panelteksten(kontekst, definisjon.nokkel)
  const cypinfooppsummering = cypinfo.status === 'klar' ? oppsummerCypinfo(cypinfo.visning) : null
  return (
    <Panel
      definisjon={definisjon}
      kontekst={kontekst}
      tomt={elementer.length === 0 && tekst.tomt && !cypinfooppsummering}
      oppsummering={ramsOpp([!tekst.tomt && tekst.oppsummering, cypinfooppsummering, kortoppsummering(elementer)])}
    >
      <Paneltekst definisjon={definisjon} kontekst={kontekst} tekst={tekst} />
      {/* Står det bare ett redaksjonelt kort, åpnes det bare når panelet ikke har annet innhold ved siden av. */}
      <Redaksjonskort definisjon={definisjon} kontekst={kontekst} elementer={elementer} ettAlene={!cypinfooppsummering && tekst.tomt} />
      <Cypinfovisning tilstand={cypinfo} />
    </Panel>
  )
}
