import { useEffect, useId, useRef, useState } from 'react'
import type { Profilkort } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import { direkteapi } from '../../direktemeldinger/api'
import { personnavn, type Direktemottaker, type Direktesamtale } from '../../direktemeldinger/modell'
import type { Direktemeldinger } from '../../direktemeldinger/useDirekte'
import { useDirektesamtale } from '../../direktemeldinger/useDirektesamtale'
import { useBevart } from '../../oppdatering/Bevaring'
import { Button } from '../Button'
import { Gruppechat } from '../grupper/Gruppechat'
import { Ikon } from '../ikon/Ikon'
import { Avatar } from '../konto/Avatar'
import { Bekreftelseskort } from '../konto/Bekreftelseskort'
import { Menyvalg, Nedtrekksmeny } from '../toppmeny/Nedtrekksmeny'
import { TilSamtalene } from './TilSamtalene'

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const feiltekst = (aarsak: unknown) => (aarsak instanceof Error && aarsak.message ? aarsak.message : UVENTET)

/** Søket venter så lenge etter siste tastetrykk, og trenger så mange tegn. */
export const SOKEPAUSE_MS = 250
export const SOK_MINST = 2

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
 * «Ny direktemelding» (skisse 17): søket etter personer i alle fagmiljøer som
 * tillater direktemeldinger. Treffene viser bare navnet og brukernavnet, og
 * om det alt finnes en samtale. Et treff åpner samtalen med personen, den
 * som finnes eller en ny.
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
  const [sok, setSok] = useBevart('chat/nysok', '')
  // Treffene hører til søkeordet de ble hentet for: et endret søk viser aldri de gamle.
  const [svar, setSvar] = useState<{ ord: string; treff: Direktemottaker[] } | null>(null)
  const [apner, setApner] = useState<string | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const id = useId()
  const tillatt = direkte.valg.tillat_direktemeldinger
  const ord = sok.trim()
  const treff = svar?.ord === ord ? svar.treff : null

  useEffect(() => {
    setFeil(null)
    if (!tillatt || ord.length < SOK_MINST) return
    let gjeldende = true
    const tidtaker = setTimeout(() => {
      direkteapi.sokDirektemottakere(ord).then(
        (treff) => gjeldende && setSvar({ ord, treff }),
        (aarsak) => gjeldende && setFeil(feiltekst(aarsak)),
      )
    }, SOKEPAUSE_MS)
    return () => {
      gjeldende = false
      clearTimeout(tidtaker)
    }
  }, [ord, tillatt])

  const finnes = new Set(direkte.samtaler.flatMap((s) => (s.motpart ? [s.motpart.id] : [])))

  const apne = async (person: Direktemottaker) => {
    setApner(person.id)
    setFeil(null)
    try {
      const samtale = await direkteapi.aapneDirektesamtale(person.id)
      setSok('')
      direkte.oppdater()
      onApnet(samtale)
    } catch (aarsak) {
      setFeil(feiltekst(aarsak))
    } finally {
      setApner(null)
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
        <>
          <div className="chatsamtaler__sok">
            <label htmlFor={`${id}-sok`} className="kun-skjermleser">
              Søk etter navn eller brukernavn
            </label>
            <Ikon navn="search" storrelse="ui" />
            <input
              id={`${id}-sok`}
              type="search"
              className="chatsamtaler__sokefelt chatny__sokefelt"
              placeholder="Søk etter navn eller brukernavn"
              autoComplete="off"
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && sok) {
                  e.preventDefault()
                  e.stopPropagation()
                  setSok('')
                }
              }}
            />
          </div>
          {ord.length < SOK_MINST ? (
            <p className="chatsamtaler__tom">Skriv minst to tegn.</p>
          ) : treff === null ? (
            !feil && (
              <p className="chatsamtaler__tom" role="status">
                Søker …
              </p>
            )
          ) : treff.length === 0 ? (
            <p className="chatsamtaler__tom" role="status">
              Ingen treff.
            </p>
          ) : (
            <ul className="chatsamtaler__liste" aria-label="Treff">
              {treff.map((t) => (
                <li key={t.id} className="chatrad">
                  <button type="button" className="chatrad__knapp" disabled={apner !== null} onClick={() => void apne(t)}>
                    <Personbilde person={{ ...t, avatar_path: null }} aktiv={false} lenke={null} />
                    <span className="chatrad__tekst">
                      <span className="chatrad__navn">{personnavn(t)}</span>
                      <span className="chatrad__art">
                        @{t.username}
                        {finnes.has(t.id) && ' · Finnes alt en samtale'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
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
  const navn = personnavn(person)
  const lenker = useAvatarlenker(person ? [person] : [])
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
          <Personbilde
            person={person}
            aktiv={!!person && direkte.aktive.has(person.id)}
            lenke={person?.avatar_path ? (lenker.get(person.avatar_path) ?? null) : null}
          />
          <div className="chatsamtale__navn">
            <h3 className="chatsamtale__tittel">{navn}</h3>
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
