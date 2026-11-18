import type { Kategoristi } from '../../domain/stoffregister'
import type { Paneldefinisjon } from '../../faginnhold/paneler'
import { Fragment, useRef } from 'react'
import { Referansefelt } from '../referanser/Referansefelt'
import { useSidereferanser } from '../referanser/Sidereferanser'
import { useFastSted } from '../seksjoner/Seksjonsstyring'
import { Ikon } from '../ikon/Ikon'
import { kategoriikon } from '../ikon/register'
import { Uthev } from '../Uthev'
import { panelAnker, panelteksten, Paneltekst, type Panelkontekst } from './Paneler'

/** Navnet på den korte oppsummeringen av stoffet, i redigeringen. */
const OPPSUMMERING = 'Oppsummering'
import '../../styles/monograf-topp.css'

/**
 * Panel 1: hva siden handler om. Over navnet står kategoriene stoffet har i
 * stoffregisteret, de samme som i sidemenyen («Antidepressiver › SSRI»).
 * Stoffet er hovedoverskriften. Står alltid fram, over viktige data
 * (`ViktigeData.tsx`).
 *
 * Fagsiden viser ingen laboratorieanalyser og lenker ikke til fortolkningen:
 * de to er helt adskilte domener (`docs/domener.md`).
 *
 * Nederst står den korte oppsummeringen av stoffet: rikteksten i panelet, som
 * redigeres her. Den samme teksten står på stoffets kort i helsiden for
 * stoffregisteret.
 */
export function Identitetspanel({
  definisjon,
  navn,
  kategorier,
  overskriftId,
  kontekst,
}: {
  definisjon: Paneldefinisjon
  navn: string
  /** Kategoriene i stoffregisteret (`kategorierFor`). */
  kategorier: Kategoristi[]
  overskriftId: string
  /** Siden med redigeringen, for oppsummeringen. Uten den vises ingen oppsummering. */
  kontekst?: Panelkontekst
}) {
  const panelreferanser = useSidereferanser().panelreferanser[definisjon.nokkel] ?? []
  const flate = useRef<HTMLElement>(null)
  useFastSted(definisjon.nokkel, flate)

  return (
    <section ref={flate} id={panelAnker(definisjon.nokkel)} className="identitet" aria-labelledby={overskriftId}>
      <p className="metalinje">
        {kategorier.map((k, i) => (
          <Fragment key={nokkel(k)}>
            {i > 0 && <span aria-hidden="true">·</span>}
            <span className="identitet__kategori">
              <Ikon navn={kategoriikon(k.ikon)} className="identitet__kategoriikon" />
              <span className="identitet__kategoristi">
                {k.kategori}
                {k.underkategori && (
                  <>
                    {' '}
                    <span aria-hidden="true">›</span> {k.underkategori}
                  </>
                )}
              </span>
            </span>
          </Fragment>
        ))}
      </p>
      <h1 id={overskriftId} className="identitet__navn" tabIndex={-1}>
        <Uthev tekst={navn} />
      </h1>
      {kontekst && (
        <Paneltekst
          definisjon={{ ...definisjon, tittel: OPPSUMMERING }}
          kontekst={kontekst}
          tekst={panelteksten(kontekst, definisjon.nokkel)}
        />
      )}
      <Referansefelt ider={panelreferanser} niva="panel" />
    </section>
  )
}

function nokkel(k: Kategoristi): string {
  return `${k.kategori}/${k.underkategori ?? ''}`
}
