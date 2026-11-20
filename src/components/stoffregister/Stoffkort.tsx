import { stoffadresse } from '../../domain/rute'
import type { Registerstoff } from '../../domain/stoffregister'
import { klartekst } from '../../faginnhold/riktekst'
import { forhandsvisning } from '../../faginnhold/oppsummering'
import { useStoffregisterkilde } from '../../stoffregister/Stoffregisterkilde'
import { Knappelenke } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Detaljkort } from '../seksjoner/Seksjon'
import { Riktekst } from '../stoffside/Riktekst'

/**
 * Ett stoff på helsiden: et detaljkort som åpnes animert, som kortene på
 * fagsidene. Lukket viser det navnet og begynnelsen på oppsummeringen. Åpnet
 * viser det hele oppsummeringen og veien til fagsiden. Registeret er
 * fagsidenes og viser ingen laboratorieanalyser (`docs/domener.md`).
 *
 * Kortet er bare for å lese. Det som endrer stoffet — hvor det står, arkivet
 * og slettingen — gjøres i redigeringen (`Redigeringsbrett`). Oppsummeringen
 * skrives på fagsiden (panelet «Identitet»), ikke her.
 */
export function Stoffkort({
  id,
  stoff,
}: {
  /** Kortets nøkkel i seksjonen. Et stoff kan stå flere steder i én kategori. */
  id: string
  stoff: Registerstoff
}) {
  const kilde = useStoffregisterkilde()
  if (!kilde) return null
  const tekst = kilde.oppsummering(stoff.slug)

  return (
    <Detaljkort
      id={id}
      className="stoffkort"
      tittel={stoff.navn}
      oppsummering={tekst ? forhandsvisning(klartekst(tekst)) : undefined}
    >
      {tekst ? (
        <div className="stoffkort__oppsummering">
          <Riktekst dokument={tekst} />
        </div>
      ) : (
        <p className="stoffkort__tom">Ingen oppsummering ennå. Den skrives på fagsiden.</p>
      )}

      <div className="stoffkort__handlinger">
        <Knappelenke variant="kant" href={stoffadresse(stoff.slug)} icon={<Ikon navn="indik" />}>
          Åpne fagside
        </Knappelenke>
      </div>
    </Detaljkort>
  )
}

