import { useCallback, useState } from 'react'
import { useBevart } from '../../oppdatering/Bevaring'
import { visningsnavn } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import { useOkt, useProfil } from '../../auth/okt'
import { useRettigheter } from '../../auth/rettigheter'
import { forslagsadresse } from '../../domain/rute'
import { Ikon } from '../ikon/Ikon'
import { Menyvalg, Nedtrekksmeny } from '../toppmeny/Nedtrekksmeny'
import { TilbehandlingMenyvalg } from '../forslag/behandling/Tilbehandling'
import { Arbeidsfagmiljovalg } from './Arbeidsfagmiljovalg'
import { Avatar } from './Avatar'
import { Innstillinger, innstillingsforklaring, type Visningsvalg } from './Innstillinger'
import { Kontopanel } from './Kontopanel'
import { MittRedaktoransvar } from './MittRedaktoransvar'

export type KontomenyProps = Visningsvalg

/**
 * Kontoen, fra avataren helt til høyre i toppmenyen (D6; skisse 20): hvem
 * appen er logget inn som, veien til egen profil, fagmiljøet en med flere
 * medlemskap arbeider i, egne forslag og forslagene til behandling,
 * redaktøransvaret for en redaktør, Innstillinger (et vindu med fanene) og
 * utlogging. Gruppene og invitasjonene står i hovedmenyen.
 */
export function Kontomeny({ tema, bevegelse }: KontomenyProps) {
  const profil = useProfil()
  const { loggUt } = useOkt()
  const lenker = useAvatarlenker([profil])
  const lenke = profil.avatar_path ? (lenker.get(profil.avatar_path) ?? null) : null
  const navn = visningsnavn(profil)

  const [kontopanel, setKontopanel] = useBevart('kontopanel', false)
  // Fagmiljøskuffen i menyen.
  const [fagmiljoApen, setFagmiljoApen] = useState(false)
  // Teller åpningene, så det som skal være ferskt når menyen åpnes, kan hentes på nytt.
  const [apninger, setApninger] = useState(0)
  const [innstillinger, setInnstillinger] = useBevart('innstillinger', false)
  const lukkInnstillinger = useCallback(() => setInnstillinger(false), [setInnstillinger])
  // Fast identitet: `Modallag` kobler den til lukkehendelsen på dialogen.
  const lukkKontopanel = useCallback(() => setKontopanel(false), [])
  const { redaktor } = useRettigheter()
  const [redaktoransvar, setRedaktoransvar] = useBevart('mitt-redaktoransvar', false)
  const lukkRedaktoransvar = useCallback(() => setRedaktoransvar(false), [])

  return (
    <>
      <Nedtrekksmeny
        className="kontomeny"
        knapp={{
          ikon: 'user',
          etikett: `Kontoen din – ${navn}`,
          variant: 'aksent',
          className: 'kontomeny__knapp',
          innhold: <Avatar profil={profil} lenke={lenke} storrelse="liten" />,
        }}
        etikett="Konto"
        lag="kontomeny"
        // Neste gang menyen åpnes, står skuffen lukket igjen.
        onApne={() => {
          setFagmiljoApen(false)
          setApninger((n) => n + 1)
        }}
      >
        {(lukk) => (
          <>
            <div className="kontomeny__hode">
              <Avatar profil={profil} lenke={lenke} storrelse="middels" />
              <div className="kontomeny__hvem">
                <span className="kontomeny__navn">{navn}</span>
                <span className="kontomeny__brukernavn">{profil.username}</span>
              </div>
              {profil.role === 'admin' && (
                <span className="kontomeny__merke">
                  <Ikon navn="shield" />
                  Admin
                </span>
              )}
            </div>
            <ul className="nedtrekk__valg">
              <li>
                <Menyvalg
                  ikon="user"
                  tekst="Endre navn og profilbilde"
                  onClick={() => {
                    // Menyen lukkes først, så vinduet gir fokus tilbake til avataren.
                    lukk()
                    setKontopanel(true)
                  }}
                />
              </li>
              <Arbeidsfagmiljovalg apen={fagmiljoApen} onVeksle={() => setFagmiljoApen((a) => !a)} />
              <li>
                <Menyvalg
                  ikon="foresla"
                  tekst="Mine forslag"
                  onClick={() => {
                    lukk()
                    window.location.hash = forslagsadresse()
                  }}
                />
              </li>
              <TilbehandlingMenyvalg onGaa={lukk} apning={apninger} />
              {redaktor && (
                <li>
                  <Menyvalg
                    ikon="edit"
                    tekst="Mitt redaktøransvar"
                    onClick={() => {
                      lukk()
                      setRedaktoransvar(true)
                    }}
                  />
                </li>
              )}
              <li>
                <Menyvalg
                  ikon="gears"
                  tekst="Innstillinger"
                  forklaring={innstillingsforklaring()}
                  onClick={() => {
                    lukk()
                    setInnstillinger(true)
                  }}
                />
              </li>
              <li>
                <Menyvalg ikon="logout" tekst="Logg ut" onClick={() => void loggUt()} />
              </li>
            </ul>
          </>
        )}
      </Nedtrekksmeny>
      <Kontopanel apen={kontopanel} onLukk={lukkKontopanel} />
      <Innstillinger apen={innstillinger} onLukk={lukkInnstillinger} tema={tema} bevegelse={bevegelse} />
      {redaktor && <MittRedaktoransvar apen={redaktoransvar} onLukk={lukkRedaktoransvar} />}
    </>
  )
}
