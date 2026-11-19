import { useEffect, useId, useRef, useState } from 'react'
import type { Profilkort } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import { direkteapi } from '../../direktemeldinger/api'
import { motpartnavn, type Direktesamtale } from '../../direktemeldinger/modell'
import type { Direktemeldinger } from '../../direktemeldinger/useDirekte'
import { useDirektesamtale } from '../../direktemeldinger/useDirektesamtale'
import type { Persontreff } from '../../personsok/modell'
import { Button } from '../Button'
import { Gruppechat } from '../grupper/Gruppechat'
import { Avatar } from '../konto/Avatar'
import { Bekreftelseskort } from '../konto/Bekreftelseskort'
import { Menyvalg, Nedtrekksmeny } from '../toppmeny/Nedtrekksmeny'
import { Personsok } from '../personsok/Personsok'
import { Profilutlos } from '../profilkort/Profilkort'
import { TilSamtalene } from './TilSamtalene'

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const feiltekst = (aarsak: unknown) => (aarsak instanceof Error && aarsak.message ? aarsak.message : UVENTET)

/** «Direktemelding · @brukernavn» under navnet. */
const artstekst = (person: Pick<Profilkort, 'username'> | null) => (person?.username ? `Direktemelding · @${person.username}` : 'Direktemelding')

/**
 * Bildet til den andre i en direktesamtale, med prikken når hen er aktiv nå
 * (bare når hen selv har slått på «Vis når jeg er aktiv»). Uten konto en tom
 * sirkel.
 */
export function Personbilde({
  person,
  aktiv,
  lenke,
}: {
  person: Pick<Profilkort, 'first_name' | 'last_name' | 'username' | 'avatar_path'> | null
  aktiv: boolean
  lenke: string | null
}) {
  return (
    <span className="chatperson" data-aktiv={aktiv || undefined}>
      {person ? <Avatar profil={person} lenke={lenke} storrelse="liten" /> : <span className="avatar avatar--liten" aria-hidden="true" />}
      {aktiv && <span className="chatperson__aktiv" role="img" aria-label="Aktiv nå" />}
    </span>
  )
}

/**
 * «Ny direktemelding» (skisse 17): personsøket (`Personsok`) blant personer i
 * alle fagmiljøer som tillater direktemeldinger. Treffene viser bare navnet og
 * brukernavnet, og om det alt finnes en samtale. Et treff åpner samtalen med
 * personen, den som finnes eller en ny.
 */
export function NyDirektemelding({
  direkte,
  onApnet,
  onTilbake,
}: {
  direkte: Direktemeldinger
  onApnet: (samtale: string) => void
  onTilbake: () => void
}) {
  const [apner, setApner] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const id = useId()
  const tillatt = direkte.valg.tillat_direktemeldinger

  const finnes = new Set(direkte.samtaler.flatMap((s) => (s.motpart ? [s.motpart.id] : [])))

  const apne = async (person: Persontreff) => {
    setApner(true)
    setFeil(null)
    try {
      const samtale = await direkteapi.aapneDirektesamtale(person.id)
      direkte.oppdater()
      onApnet(samtale)
      return true
    } catch (aarsak) {
      setFeil(feiltekst(aarsak))
      return false
    } finally {
      setApner(false)
    }
  }

  return (
    <section className="chatny" aria-labelledby={`${id}-tittel`}>
      <TilSamtalene onTilbake={onTilbake} undervisning />
      <h3 id={`${id}-tittel`} className="chatny__tittel">
        Ny direktemelding
      </h3>
      <p className="chatny__om">Personer i alle fagmiljøer som tillater direktemeldinger.</p>
      {!tillatt ? (
        <div className="chatny__av">
          <p>Slå på «Tillat direktemeldinger» for å finne andre og starte en samtale.</p>
          <Button variant="kant" onClick={() => void direkte.settValg({ tillat_direktemeldinger: true }).catch((aarsak) => setFeil(feiltekst(aarsak)))}>
            Slå på
          </Button>
        </div>
      ) : (
        <Personsok
          kilde={direkteapi.sokDirektemottakere}
          etikett="Søk etter navn eller brukernavn"
          bevar="chat/nysok"
          opptatt={apner}
          tillegg={(person) => (finnes.has(person.id) ? 'Finnes alt en samtale' : null)}
          onVelg={apne}
        />
      )}
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
    </section>
  )
}

/**
 * Én direktesamtale (skisse 18): den andre øverst, med prikken når hen er
 * aktiv, og en meny for demping, skjuling og blokkering; under den chatten
 * slik den er i en gruppe, med den låste linjen når det ikke kan sendes.
 */
export function Direktevisning({
  samtale,
  direkte,
  onTilbake,
}: {
  samtale: string
  direkte: Direktemeldinger
  onTilbake: () => void
}) {
  const chat = useDirektesamtale(samtale)
  const rad: Direktesamtale | undefined = direkte.samtaler.find((s) => s.id === samtale)
  const person = chat.direkte?.motpart ?? rad?.motpart ?? null
  // Det samme korte navnet som i lista over samtalene.
  const navn = motpartnavn(direkte.samtaler, person)(person)
  const lenker = useAvatarlenker(person ? [person] : [])
  const bildelenke = person?.avatar_path ? (lenker.get(person.avatar_path) ?? null) : null
  const utestengt = chat.status === 'ingen_tilgang'
  const dempet = rad?.dempet ?? chat.direkte?.dempet ?? false
  const blokkert = chat.direkte?.sperre === 'selv_blokkert'
  const [blokkerer, setBlokkerer] = useState(false)
  const [opptatt, setOpptatt] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const menyRot = useRef<HTMLDivElement>(null)

  // Samtalen er borte (lagringstiden, eller tilgangen til OUSFAR): lista hentes på nytt.
  const { oppdater } = direkte
  useEffect(() => {
    if (utestengt) oppdater()
  }, [utestengt, oppdater])

  /** Gjør handlingen, og henter lista og de åpne samtalene på nytt etterpå. */
  const gjor = async (handling: () => Promise<void>, etter?: () => void) => {
    setOpptatt(true)
    setFeil(null)
    try {
      await handling()
      oppdater()
      etter?.()
    } catch (aarsak) {
      setFeil(feiltekst(aarsak))
    } finally {
      setOpptatt(false)
    }
  }

  const tilMenyen = () => requestAnimationFrame(() => menyRot.current?.querySelector<HTMLElement>('button')?.focus())

  return (
    <div className="chatsamtale" data-direkte="">
      <TilSamtalene onTilbake={onTilbake} />
      {!utestengt && (
        <div className="chatsamtale__hode" ref={menyRot}>
          <Profilutlos person={person} lenke={bildelenke} variant="peker">
            <Personbilde person={person} aktiv={!!person && direkte.aktive.has(person.id)} lenke={bildelenke} />
          </Profilutlos>
          <div className="chatsamtale__navn">
            <h3 className="chatsamtale__tittel">
              <Profilutlos person={person} lenke={bildelenke}>
                {navn}
              </Profilutlos>
            </h3>
            <p className="chatsamtale__art">
              {artstekst(person)}
              {dempet && ' · Dempet'}
            </p>
          </div>
          <Nedtrekksmeny
            className="brukermeny"
            knapp={{ ikon: 'more', etikett: `Valg for samtalen med ${navn}`, variant: 'stille', storrelse: 'liten', utenTips: true }}
            etikett={`Valg for samtalen med ${navn}`}
            lag="chatmeny"
            lat
          >
            {(lukk) => (
              <ul className="nedtrekk__valg">
                <li>
                  <Menyvalg
                    ikon="bell"
                    tekst={dempet ? 'Opphev dempingen' : 'Demp samtalen'}
                    forklaring={dempet ? undefined : 'Uleste herfra telles ikke på chatknappen.'}
                    onClick={() => {
                      lukk()
                      void gjor(() => direkteapi.dempDirektesamtale(samtale, !dempet))
                    }}
                  />
                </li>
                <li>
                  <Menyvalg
                    ikon="skjul"
                    tekst="Skjul samtalen"
                    forklaring="Fra din liste, til det kommer en ny melding. Ingenting slettes."
                    onClick={() => {
                      lukk()
                      void gjor(() => direkteapi.skjulDirektesamtale(samtale), onTilbake)
                    }}
                  />
                </li>
                {person && (
                  <li>
                    <Menyvalg
                      ikon={blokkert ? 'vis' : 'no'}
                      tekst={blokkert ? 'Opphev blokkeringen' : `Blokker ${navn}`}
                      onClick={() => {
                        lukk()
                        if (blokkert) void gjor(() => direkteapi.opphevBlokkering(person.id))
                        else setBlokkerer(true)
                      }}
                    />
                  </li>
                )}
              </ul>
            )}
          </Nedtrekksmeny>
        </div>
      )}
      {blokkerer && person && (
        <Bekreftelseskort
          tittel={`Blokkere ${navn}?`}
          bekreft="Blokker"
          opptatt={opptatt}
          onBekreft={() => void gjor(() => direkteapi.blokkerBruker(person.id), () => setBlokkerer(false))}
          onAvbryt={() => {
            setBlokkerer(false)
            tilMenyen()
          }}
        >
          Ingen av dere kan sende nye meldinger i samtalen, og dere finner ikke hverandre i søket. {navn} får ikke vite det. Samtalen står,
          og blokkeringen kan oppheves.
        </Bekreftelseskort>
      )}
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      <Gruppechat chat={chat} gruppe={{ id: samtale, navn, status: 'aktiv' }} art="direkte" />
    </div>
  )
}
