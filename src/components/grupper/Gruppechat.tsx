import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { kortnavn, type Profilkort } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import type { Samtaletype } from '../../domain/rute'
import { avsendernavn, type Gruppechat as Chattilstand, type Gruppemelding } from '../../gruppechat/modell'
import type { Gruppe } from '../../grupper/modell'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Gruppechatmelding, Ventendemelding } from './Gruppechatmelding'
import { Gruppechatskriving, glemUtkastene } from './Gruppechatskriving'
import { dagsnavn, dagsnokkel, henger, laastTekst, nyeEtter, nyeMeldingerTekst } from './gruppechatvisning'
import '../../styles/gruppechat.css'

/** Det chatten trenger å vite om gruppen. */
export type Chatgruppe = Pick<Gruppe, 'id' | 'navn' | 'status'>

/** Så nær bunnen (px) regnes lista som rullet helt ned, og følger nye meldinger. */
const NEDERST_INNEN = 48
/** Så nær toppen (px) hentes eldre meldinger av seg selv. */
const ELDRE_INNEN = 64

const rolig = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Chatten i en gruppe (docs/gruppechat.md, «Brukerflaten»): meldingene etter
 * dag og skrivefeltet.
 *
 * Står brukeren nederst i lista, følger den nye meldinger; har hen rullet
 * opp, står den stille, og «N nye meldinger» tar hen ned. Eldre meldinger
 * hentes ved toppen eller med «Vis eldre», uten at det man leser flytter seg.
 * Meldingene merkes lest når de nyeste er synlige og fanen i nettleseren er
 * framme. Knappene er et grensesnitt, ikke en tilgangskontroll: databasen
 * avgjør hver handling.
 *
 * En direktesamtale (`art="direkte"`, D5) vises med den samme komponenten:
 * `gruppe` er da samtalen med navnet på den andre, og bare den låste linjen og
 * slettetekstene er andre.
 */
export function Gruppechat({ chat, gruppe, art = 'gruppe' }: { chat: Chattilstand; gruppe: Chatgruppe; art?: Samtaletype }) {
  const overskrift = useId()
  const logg = useRef<HTMLDivElement>(null)
  const felt = useRef<HTMLTextAreaElement>(null)
  const { meldinger, ventende, status } = chat
  const aktiv = gruppe.status === 'aktiv'
  const sisteNr = meldinger.at(-1)?.nr ?? 0
  const direkte = art === 'direkte'
  /** I en direktesamtale er navnet på den andre samtalens navn, det samme som over samtalen. */
  const motpart = direkte ? gruppe.navn : undefined

  // Den nyeste tilstanden for effektene, uten at de kjøres på nytt for hver ny funksjon.
  const naa = useRef(chat)
  naa.current = chat

  /** Lista står nederst (eller er så kort at den ikke ruller). */
  const [nederst, setNederst] = useState(true)
  const nederstFor = useRef(true)
  /** Den nyeste meldingen brukeren har sett nederst i lista; nyere fra andre telles på knappen. */
  const [sistSett, setSistSett] = useState<number | null>(null)
  /**
   * Hvor langt brukeren hadde lest da chatten ble åpnet, og den første uleste
   * fra andre etter det, der «Nye meldinger» står. Settes én gang, første gang
   * meldingene står, så skillet ikke flytter seg mens man leser.
   */
  const start = useRef<{ lestTil: number; skille: number | null } | null>(null)
  if (status === 'klar' && !start.current) {
    start.current = { lestTil: chat.lestTilNr, skille: meldinger.find((m) => m.nr > chat.lestTilNr && !m.egen)?.nr ?? null }
  }
  const skille = start.current?.skille ?? null
  const apnet = useRef(false)
  /** Meldingen øverst og hvor den sto, mens eldre hentes, så den blir stående. */
  const anker = useRef<{ id: string; fra: number } | null>(null)
  /** Neste oppdatering skal til bunnen: brukeren sendte selv. */
  const tilBunns = useRef(false)
  const antallVentende = useRef(ventende.length)

  const forfattere = useMemo(() => {
    const unike = new Map<string, Profilkort>()
    for (const m of meldinger) if (m.forfatter) unike.set(m.forfatter.id, m.forfatter)
    return [...unike.values()]
  }, [meldinger])
  const lenker = useAvatarlenker(forfattere)
  // De andre står med fornavnet, eller mer når det trengs for å skille dem (`kortnavn`); eget navn vises ikke.
  const navnene = useMemo(() => {
    const egne = new Set(meldinger.flatMap((m) => (m.egen && m.forfatter ? [m.forfatter.id] : [])))
    return kortnavn(forfattere.filter((f) => !egne.has(f.id)))
  }, [meldinger, forfattere])
  const navn = (m: Gruppemelding) => (motpart && !m.egen ? motpart : (m.forfatter && navnene.get(m.forfatter.id)) || avsendernavn(m))

  const rullTilBunns = useCallback((jevnt = false) => {
    const el = logg.current
    if (!el) return
    if (jevnt && !rolig() && typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    else el.scrollTop = el.scrollHeight
  }, [])

  // Første gang meldingene står: ned til den første uleste fra andre, eller til bunnen.
  useLayoutEffect(() => {
    if (!start.current || apnet.current) return
    apnet.current = true
    setSistSett(start.current.lestTil)
    const el = logg.current
    const merke = el?.querySelector<HTMLElement>('.chatlogg__nye')
    if (el && merke && merke.offsetTop > el.clientHeight / 2) {
      // Mange uleste: skillet øverst, så de leses fra starten. Lista følger ikke nye før man er nede.
      el.scrollTop = merke.offsetTop
      nederstFor.current = false
      setNederst(false)
    } else rullTilBunns()
  }, [status, rullTilBunns])

  // Etter hver endring i lista: eldre lagt til over, egne sendt, eller nye mens man står nederst.
  useLayoutEffect(() => {
    const el = logg.current
    if (!el || !apnet.current) return
    const holdt = anker.current
    if (holdt) {
      const melding = el.querySelector<HTMLElement>(`[data-melding="${holdt.id}"]`)
      if (melding) el.scrollTop = melding.offsetTop - holdt.fra
      if (!chat.henterEldre) anker.current = null
      return
    }
    const nyVentende = ventende.length > antallVentende.current
    antallVentende.current = ventende.length
    if (tilBunns.current || nyVentende || nederstFor.current) {
      tilBunns.current = false
      rullTilBunns()
    }
  }, [meldinger, ventende.length, chat.henterEldre, rullTilBunns])

  // Det man ser nederst er sett.
  useEffect(() => {
    if (nederst && apnet.current) setSistSett((forrige) => Math.max(forrige ?? 0, sisteNr))
  }, [nederst, sisteNr])

  // Merkes lest når de nyeste er synlige og nettleserfanen er framme. Står chatten skjult
  // (chatmenyen parkert bak hovedmenyen), merkes ingenting.
  useEffect(() => {
    if (status !== 'klar' || !nederst || sisteNr <= chat.lestTilNr) return
    const merk = () => {
      const synlig = logg.current?.checkVisibility?.({ visibilityProperty: true }) !== false
      if (document.visibilityState !== 'hidden' && synlig) naa.current.merkLest(sisteNr)
    }
    merk()
    document.addEventListener('visibilitychange', merk)
    return () => document.removeEventListener('visibilitychange', merk)
  }, [status, nederst, sisteNr, chat.lestTilNr])

  // Uten tilgang glemmes utkastet i gruppen, så det ikke står igjen i minnet.
  useEffect(() => {
    if (status === 'ingen_tilgang') glemUtkastene(gruppe.id)
  }, [status, gruppe.id])

  const hentEldre = () => {
    const el = logg.current
    const forste = el?.querySelector<HTMLElement>('[data-melding]')
    if (el && forste?.dataset.melding) anker.current = { id: forste.dataset.melding, fra: forste.offsetTop - el.scrollTop }
    void chat.hentEldre()
  }

  const paaRulling = () => {
    const el = logg.current
    if (!el) return
    const bunn = el.scrollHeight - el.scrollTop - el.clientHeight <= NEDERST_INNEN
    nederstFor.current = bunn
    setNederst(bunn)
    if (el.scrollTop <= ELDRE_INNEN && chat.flereEldre && !chat.henterEldre && !anker.current) hentEldre()
  }

  const tilDeNye = () => {
    rullTilBunns(true)
    nederstFor.current = true
    setNederst(true)
    const alle = logg.current?.querySelectorAll<HTMLElement>('.chatmelding')
    alle?.[alle.length - 1]?.focus({ preventScroll: true })
  }

  if (status === 'ingen_tilgang') {
    return (
      <section className="gruppechat" aria-label="Chat">
        <p className="notis gruppechat__tilstand" role="alert">
          <Ikon navn="lock" storrelse="ui" />
          {direkte ? 'Samtalen finnes ikke, eller du har ikke tilgang til den.' : 'Du har ikke lenger tilgang til denne gruppen.'}
        </p>
      </section>
    )
  }
  if (status === 'feil') {
    return (
      <section className="gruppechat" aria-label="Chat">
        <p className="skjemafeil" role="alert">
          {chat.feil ?? 'Chatten kunne ikke hentes. Prøv igjen.'}
        </p>
      </section>
    )
  }
  if (status === 'laster') {
    return (
      <section className="gruppechat" aria-label="Chat">
        <p className="gruppechat__tilstand" role="status">
          Henter meldingene …
        </p>
      </section>
    )
  }

  const nye = sistSett === null || nederst ? 0 : nyeEtter(meldinger, sistSett)
  const tom = meldinger.length === 0 && ventende.length === 0 && !chat.flereEldre
  const kanSkrive = aktiv && chat.kanSkrive

  return (
    <section className="gruppechat" aria-labelledby={overskrift}>
      <h2 id={overskrift} className="kun-skjermleser">
        Chat
      </h2>
      {chat.tilkobling !== 'tilkoblet' && (
        <p className="gruppechat__tilkobling" role="status">
          Kobler til igjen …
        </p>
      )}

      <div className="gruppechat__ramme">
        <div
          ref={logg}
          className="chatlogg"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-busy={chat.henterEldre || undefined}
          aria-label={`Meldinger i ${gruppe.navn}`}
          tabIndex={0}
          onScroll={paaRulling}
        >
          {chat.flereEldre && (
            <div className="chatlogg__eldre">
              <Button variant="kant" icon={<Ikon navn="opp" />} disabled={chat.henterEldre} onClick={hentEldre}>
                {chat.henterEldre ? 'Henter eldre …' : 'Vis eldre meldinger'}
              </Button>
            </div>
          )}
          {tom ? (
            <p className="chatlogg__tom">Ingen meldinger ennå.{kanSkrive && ' Skriv den første.'}</p>
          ) : (
            <ol className="chatlogg__liste">
              {meldinger.map((melding, i) => {
                const forrige = meldinger[i - 1]
                const nyDag = !forrige || dagsnokkel(forrige.skrevet_kl) !== dagsnokkel(melding.skrevet_kl)
                const nyeHer = melding.nr === skille
                return (
                  <Fragment key={melding.id}>
                    {nyDag && (
                      <li className="chatlogg__dag">
                        <h3 className="chatlogg__dagnavn">{dagsnavn(melding.skrevet_kl)}</h3>
                      </li>
                    )}
                    {nyeHer && (
                      <li className="chatlogg__nye">
                        <span>Nye meldinger</span>
                      </li>
                    )}
                    <Gruppechatmelding
                      melding={melding}
                      navn={navn(melding)}
                      sammen={!nyDag && !nyeHer && henger(forrige, melding)}
                      laast={!aktiv}
                      bildelenke={melding.forfatter?.avatar_path ? (lenker.get(melding.forfatter.avatar_path) ?? null) : null}
                      grenser={chat.grenser}
                      onEndre={chat.endre}
                      onSlett={chat.slett}
                      motpart={motpart}
                    />
                  </Fragment>
                )
              })}
              {ventende.map((v, i) => (
                <Ventendemelding
                  key={v.klient_id}
                  ventende={v}
                  sammen={i > 0 || meldinger.at(-1)?.egen === true}
                  onProvIgjen={chat.provIgjen}
                  onForkast={chat.forkast}
                />
              ))}
            </ol>
          )}
        </div>
        {nye > 0 && (
          <button type="button" className="chatlogg__tilnye" onClick={tilDeNye}>
            <Ikon navn="ned" storrelse="ui" />
            {nyeMeldingerTekst(nye)}
          </button>
        )}
      </div>

      {kanSkrive ? (
        <Gruppechatskriving
          ref={felt}
          gruppe={gruppe.id}
          gruppenavn={gruppe.navn}
          grenser={chat.grenser}
          onSend={(tekst) => {
            tilBunns.current = true
            chat.send(tekst)
            felt.current?.focus()
          }}
        />
      ) : (
        <p className="gruppechat__laast">
          <Ikon navn="lock" storrelse="ui" />
          {laastTekst(aktiv, chat.direkte, motpart)}
        </p>
      )}
    </section>
  )
}
