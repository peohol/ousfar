import { useCallback, useEffect, useId, useMemo, useRef, useState, type FocusEvent } from 'react'
import { hentInnstilling, lagreSisteValg, lengdeinnstilling } from '../../auth/innstillinger'
import { useProfil } from '../../auth/okt'
import { FORSIDE, gruppeadresse, type Rute, type Samtalenokkel } from '../../domain/rute'
import { alleUleste, sokISamtaler, useGruppesamtaler, type Gruppesamtale } from '../../gruppechat/samtaler'
import { useGruppechat } from '../../gruppechat/useGruppechat'
import { useGrupper } from '../../grupper/kilde'
import { gruppetilhorighet, type MinGruppe } from '../../grupper/modell'
import { useEscapelag } from '../../hooks/lagstakk'
import { useKantmeny } from '../../hooks/useKantmeny'
import { useBevart } from '../../oppdatering/Bevaring'
import { merketall } from '../../varsler/modell'
import { Gruppechat, type Chatgruppe } from '../grupper/Gruppechat'
import { Kanthandtak, maalLengde, useDrattLengde } from '../Kanthandtak'
import { Ikon } from '../ikon/Ikon'
import { Lukkeknapp } from '../Lukkeknapp'
import { ToppmenyInnhold } from '../toppmeny/Toppmenykilde'
import { CHATIKON, chatknappnavn, samtaletid, ulesteTekst } from './chatvisning'
import { lyttEtterChatbeskjed, meldChatstatus } from './chatstyring'
import '../../styles/chat.css'

/** Hvordan menyen står, på rotelementet, så resten av appen kan gi plass: `lukket` for boblen, `apen` for panelet. */
const ROTMERKE = 'chatmeny'

/** Bredden brukeren har dratt menyen til, på rotelementet; `chat.css` holder den innenfor grensene. */
const BREDDEVARIABEL = '--chatbredde'

/** Brukerinnstillingene menyen følger, som diskusjonsmenyen. */
export const CHAT_APEN = 'chat.apen'
export const CHAT_BREDDE = 'chat.bredde'
const BREDDE = lengdeinnstilling(CHAT_BREDDE)
const lagreApen = lagreSisteValg<boolean>(CHAT_APEN)

const settBredde = (bredde: number | null) => {
  const stil = document.documentElement.style
  if (bredde === null) stil.removeProperty(BREDDEVARIABEL)
  else stil.setProperty(BREDDEVARIABEL, `${bredde}px`)
}

/** Overskriften på menyen og helsiden. */
const TITTEL = 'Grupper og samtaler'

/**
 * Chatmenyen (docs/gruppechat.md, «Chatmenyen»; D0-designet, skisse 14–16
 * og 25): gruppene og samtalene til den innloggede i venstre kant, og den
 * samme chatten som helside på `#/chat`.
 *
 * 1. Lukket står den på brede flater som en rund boble i venstre kant, under
 *    toppmenyen, med tallet på uleste. På smale flater er inngangen
 *    chatknappen i toppmenyen (`Chatknapp`), og menyen fyller skjermen.
 * 2. Åpen er den et panel langs venstre kant, som resten av appen gir plass
 *    til (`--chatplass`). Øverst «Mine grupper», som lenker til gruppesidene,
 *    så «Samtaler»: én liste, nyeste aktivitet først, med søk. En valgt
 *    samtale vises i panelet, med «Til alle samtaler» tilbake. Panelet kan
 *    dras bredere i høyre kant, og står åpent til det lukkes, også fra side
 *    til side og maskin til maskin (`chat.apen`, `chat.bredde`).
 * 3. «Utvid» gir helsiden `#/chat` (med samtalen i adressen), med lista og
 *    samtalen side om side. Det er den samme komponenten og den samme
 *    tilstanden, ikke en kopi: valgt samtale, søk, utkast og meldinger følger
 *    med. «Gjenopprett» og Escape går tilbake til siden brukeren var på, med
 *    menyen åpen på samme samtale.
 *
 * Escape (lagstakken, flyt.md §4): på helsiden gjenoppretter den; i menyen på
 * brede flater slipper den fokus og lar menyen stå; på smale lukker den.
 * Hovedmenyen parkerer menyen (`chat.css`) uten å endre noe i den.
 *
 * Å åpne menyen merker ingenting lest. En samtale merkes lest av
 * `Gruppechat` når den vises, vinduet er synlig og bunnen er nådd.
 */
export function Chatmeny({
  rute,
  gaaTil,
  tilbake,
}: {
  rute: Rute
  gaaTil: (rute: Rute, valg?: { erstatt?: boolean }) => void
  tilbake: (reserve?: Rute) => void
}) {
  const meg = useProfil()
  const grupper = useGrupper()
  const aktivert = grupper.chat_aktivert
  const { samtaler, kjent } = useGruppesamtaler(meg.id, aktivert)

  const helside = rute.side === 'chat'
  const [apen, setApen] = useBevart('chat/apen', false)
  const [mobilApen, setMobilApen] = useBevart('chat/mobil', false)
  const [valgt, setValgt] = useBevart<string | null>('chat/valgt', null)
  const { lengde: bredde, endrer: endrerBredde, sett: lagreNyBredde } = useDrattLengde('chat/bredde', BREDDE)
  const [fokus, setFokus] = useState(false)
  const meny = useRef<HTMLElement>(null)

  // Om menyen står åpen, følger brukeren. Til det er hentet, gjelder det som stod,
  // og har brukeren åpnet eller lukket den i mellomtiden, vinner det.
  const endretHer = useRef(false)
  useEffect(() => {
    void hentInnstilling(CHAT_APEN).then(
      (lagret) => typeof lagret === 'boolean' && !endretHer.current && setApen(lagret),
      () => undefined,
    )
  }, [setApen])

  const settApen = useCallback(
    (ny: boolean) => {
      endretHer.current = true
      setApen(ny)
      void lagreApen(ny).catch(() => undefined)
    },
    [setApen],
  )

  // På helsiden er adressen fasit for samtalen som er valgt.
  const adressensSamtale = rute.side === 'chat' ? (rute.samtale?.id ?? null) : undefined
  useEffect(() => {
    if (adressensSamtale !== undefined) setValgt(adressensSamtale)
  }, [adressensSamtale, setValgt])
  const vistSamtale = adressensSamtale !== undefined ? adressensSamtale : valgt

  const vist = helside || apen || mobilApen
  const uleste = alleUleste(samtaler)

  useEffect(() => {
    settBredde(bredde)
    return () => settBredde(null)
  }, [bredde])

  // Resten av appen gir plass til boblen, og til panelet når det står åpent.
  useEffect(() => {
    if (!aktivert) return
    const rot = document.documentElement
    rot.dataset[ROTMERKE] = apen && !helside ? 'apen' : 'lukket'
    return () => {
      delete rot.dataset[ROTMERKE]
    }
  }, [aktivert, apen, helside])

  // Chatknappen i toppmenyen viser det samme.
  useEffect(() => {
    meldChatstatus({ finnes: aktivert, mobilApen, uleste })
  }, [aktivert, mobilApen, uleste])
  useEffect(() => () => meldChatstatus({ finnes: false, mobilApen: false, uleste: 0 }), [])

  // Chat og diskusjoner samtidig bare når siden mellom dem får plass.
  useKantmeny('chat', aktivert && apen && !helside, () => settApen(false))

  /** Smal flate: chatknappen står i toppmenyen (se `chat.css`). */
  const smal = () => document.querySelector<HTMLElement>('.chatknapp')?.checkVisibility?.() === true

  /**
   * Fokus til `velger` i menyen når den er tegnet på nytt. Med `bareTapt`
   * bare når fokus ikke lenger står synlig i menyen.
   */
  const flyttFokus = useCallback((velger: string, bareTapt = false) => {
    requestAnimationFrame(() => {
      const aktiv = document.activeElement as HTMLElement | null
      const iMenyen = !!meny.current?.contains(aktiv) && aktiv?.checkVisibility?.() !== false
      if (bareTapt && iMenyen) return
      const maal = meny.current?.querySelector<HTMLElement>(velger)
      if (maal && maal.checkVisibility?.() !== false) maal.focus()
      else if (meny.current?.contains(aktiv)) aktiv?.blur()
    })
  }, [])

  /** Åpner menyen der den står: over siden på smale flater, ellers ved siden av den. */
  const apne = useCallback(() => {
    if (smal()) setMobilApen(true)
    else settApen(true)
  }, [setMobilApen, settApen])

  /** Lukkeknappen: helt lukket. Fra helsiden går den også tilbake dit brukeren kom fra. */
  const lukk = () => {
    settApen(false)
    setMobilApen(false)
    setFokus(false)
    if (helside) tilbake(FORSIDE)
    else flyttFokus('.chatboble')
  }

  /** Fra helsiden til siden brukeren kom fra, med menyen åpen på samme samtale. */
  const gjenopprett = () => {
    if (aktivert) apne()
    tilbake(FORSIDE)
    flyttFokus(vistSamtale ? '.chatsamtale__tilbake' : '.chatpanel__lukk')
  }

  /** Utvid: helsiden, med samtalen som står åpen. */
  const utvid = () => {
    const samtale: Samtalenokkel | undefined = vistSamtale ? { type: 'gruppe', id: vistSamtale } : undefined
    gaaTil({ side: 'chat', ...(samtale && { samtale }) })
    flyttFokus('.chatpanel__gjenopprett')
  }

  /** Escape i menyen: slipper fokus på brede flater, lukker på smale. */
  const slipp = () => {
    setMobilApen(false)
    setFokus(false)
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  useEscapelag(helside, gjenopprett, meny)
  useEscapelag(!helside && (fokus || mobilApen), slipp, meny)

  // Et trykk utenfor lukker menyen over siden på smale flater.
  useEffect(() => {
    if (!mobilApen || helside) return
    const utenfor = (event: PointerEvent) => {
      const mal = event.target as Element | null
      if (meny.current?.contains(mal as Node) || mal?.closest?.('.chatknapp')) return
      setMobilApen(false)
    }
    document.addEventListener('pointerdown', utenfor)
    return () => document.removeEventListener('pointerdown', utenfor)
  }, [mobilApen, helside, setMobilApen])

  /** Velger en samtale: i menyen vises den der, på helsiden følger adressen med. */
  const velg = useCallback(
    (gruppe: string | null) => {
      if (helside) gaaTil(gruppe ? { side: 'chat', samtale: { type: 'gruppe', id: gruppe } } : { side: 'chat' }, { erstatt: true })
      else setValgt(gruppe)
    },
    [helside, gaaTil, setValgt],
  )

  // Chatknappen veksler; en lenke eller «Åpne chat» på gruppesiden kan be om en bestemt samtale.
  const naa = useRef({ vist, mobilApen, apne, velg, helside })
  naa.current = { vist, mobilApen, apne, velg, helside }
  // Først når chatten er slått på: en samtale som er bedt om før det, venter.
  useEffect(() => {
    if (!aktivert) return
    return lyttEtterChatbeskjed((beskjed) => {
      const { mobilApen: mobil, apne: apneNa, velg: velgNa, helside: paHelside } = naa.current
      if ('veksle' in beskjed) {
        if (mobil) setMobilApen(false)
        else apneNa()
        return
      }
      velgNa(beskjed.gruppe)
      if (!paHelside) apneNa()
    })
  }, [aktivert, setMobilApen])

  // Fokus gjør menyen til et lag når det står i et felt eller kom dit med tastaturet.
  const inn = (event: FocusEvent<HTMLElement>) => setFokus(holderApen(event.target))
  const ut = (event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setFokus(false)
  }

  if (!aktivert) {
    return helside ? (
      <section ref={meny} className="chatmeny" data-apen="" data-helside="" role="main" aria-label={TITTEL}>
        <div className="chatpanel">
          <div className="chatpanel__topp">
            <h1 className="chatpanel__tittel">{TITTEL}</h1>
          </div>
          <p className="chatpanel__tom">Chatten er ikke slått på.</p>
        </div>
      </section>
    ) : null
  }

  // Navnet og statusen fra lista, eller fra gruppene (en systemarkitekt leser alle). En gruppe appen
  // ikke kjenner, vises uten navn; databasen svarer da at den ikke finnes eller ikke kan leses.
  const kjentGruppe = vistSamtale
    ? (samtaler.find((s) => s.gruppe.id === vistSamtale)?.gruppe ?? grupper.grupper.find((g) => g.id === vistSamtale))
    : undefined
  const gruppe: Chatgruppe | null = vistSamtale ? (kjentGruppe ?? { id: vistSamtale, navn: '', status: 'aktiv' }) : null
  const Overskrift = helside ? 'h1' : 'h2'

  return (
    <section
      ref={meny}
      className="chatmeny"
      role={helside ? 'main' : 'complementary'}
      aria-label={TITTEL}
      data-apen={vist || undefined}
      data-mobil={(mobilApen && !helside) || undefined}
      data-helside={helside || undefined}
      data-samtale={vistSamtale ? '' : undefined}
      onFocus={inn}
      onBlur={ut}
    >
      {helside && (
        <ToppmenyInnhold spor="lukk">
          <Lukkeknapp onLukk={lukk} />
        </ToppmenyInnhold>
      )}
      {apen && !helside && (
        <Kanthandtak
          etikett="Bredden på chatten"
          kant="hoyre"
          maal={() => ({
            lengde: maalLengde(meny.current!, 'var(--chatpanel)'),
            minst: maalLengde(meny.current!, 'var(--chatpanel-minst)'),
            mest: maalLengde(meny.current!, 'var(--chatpanel-mest)'),
          })}
          onEndre={(ny) => {
            endrerBredde()
            settBredde(ny)
          }}
          onFerdig={lagreNyBredde}
        />
      )}

      <button
        type="button"
        className="chatboble"
        hidden={vist}
        aria-label={`Vis ${chatknappnavn(uleste).toLowerCase()}`}
        onClick={() => {
          apne()
          flyttFokus('.chatpanel__lukk')
        }}
      >
        <Ikon navn={CHATIKON} storrelse="ui" />
        {uleste > 0 && (
          <span className="nyttmerke nyttmerke--boble" aria-hidden="true">
            {merketall(uleste)}
          </span>
        )}
      </button>

      {vist && (
        <div className="chatpanel">
          <div className="chatpanel__topp">
            <Overskrift className="chatpanel__tittel">{TITTEL}</Overskrift>
            {helside ? (
              <button type="button" className="chatpanel__gjenopprett" aria-keyshortcuts="Escape" onClick={gjenopprett}>
                <Ikon navn="helsideAv" storrelse="ui" />
                <span>Gjenopprett</span>
              </button>
            ) : (
              <>
                <button type="button" className="chatpanel__knapp chatpanel__utvid" aria-label="Utvid" title="Utvid" onClick={utvid}>
                  <Ikon navn="helside" storrelse="ui" />
                </button>
                <button type="button" className="chatpanel__knapp chatpanel__lukk" aria-label="Lukk chatten" title="Lukk" onClick={lukk}>
                  <Ikon navn="close" storrelse="ui" />
                </button>
              </>
            )}
          </div>
          <div className="chatpanel__innhold">
            <div className="chatpanel__oversikt" hidden={!helside && !!vistSamtale}>
              <Minegrupper grupper={grupper.grupper} onLenke={() => setMobilApen(false)} />
              <Samtaleliste samtaler={samtaler} kjent={kjent} valgt={vistSamtale} onVelg={(id) => {
                velg(id)
                flyttFokus('.chatsamtale .chatfelt, .chatsamtale .chatlogg')
              }} />
            </div>
            {gruppe ? (
              <Samtalevisning
                key={gruppe.id}
                gruppe={gruppe}
                kjent={!!kjentGruppe}
                medlemmer={grupper.grupper.find((g) => g.id === gruppe.id)?.medlemmer}
                onTilbake={() => {
                  velg(null)
                  flyttFokus(`.chatrad[data-gruppe="${gruppe.id}"] .chatrad__knapp, .chatsamtaler__sokefelt`)
                }}
                onTilGruppen={() => setMobilApen(false)}
              />
            ) : (
              helside && <p className="chatpanel__velg">Velg en samtale.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

/** «Mine grupper»: trekkspillet med gruppene den innloggede er med i, som lenker til gruppesidene. */
function Minegrupper({ grupper, onLenke }: { grupper: readonly MinGruppe[]; onLenke: () => void }) {
  const [apen, setApen] = useBevart('chat/minegrupper', true)
  const id = useId()
  const mine = useMemo(() => grupper.filter((g) => g.rolle !== null), [grupper])
  return (
    <section className="chatgrupper" aria-labelledby={`${id}-tittel`}>
      <h3 id={`${id}-tittel`} className="chatgrupper__hode">
        <button type="button" className="chatgrupper__veksle" aria-expanded={apen} aria-controls={`${id}-liste`} onClick={() => setApen(!apen)}>
          <Ikon navn="chev" storrelse="ui" className="chatgrupper__pil" />
          <span className="chatgrupper__tittel">Mine grupper</span>
          <span className="chatgrupper__antall" aria-label={mine.length === 1 ? '1 gruppe' : `${mine.length} grupper`}>
            {mine.length}
          </span>
        </button>
      </h3>
      <div id={`${id}-liste`} hidden={!apen}>
        {mine.length > 0 && (
          <ul className="chatgrupper__liste">
            {mine.map((g) => (
              <li key={g.id}>
                <a className="chatgrupper__lenke" href={gruppeadresse(g.id)} onClick={onLenke}>
                  <span className="chatgrupper__navn">{g.navn}</span>
                  <span className="chatgrupper__hvor">{g.fagmiljo ? g.fagmiljo.navn : 'På tvers'}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <a className="chatgrupper__alle" href={gruppeadresse()} onClick={onLenke}>
          Alle grupper
          <Ikon navn="chev" storrelse="ui" />
        </a>
      </div>
    </section>
  )
}

/** «Samtaler»: alle samtalene, nyeste aktivitet først, med søk. */
function Samtaleliste({
  samtaler,
  kjent,
  valgt,
  onVelg,
}: {
  samtaler: readonly Gruppesamtale[]
  kjent: boolean
  valgt: string | null
  onVelg: (gruppe: string) => void
}) {
  const [sok, setSok] = useBevart('chat/sok', '')
  const id = useId()
  const treff = sokISamtaler(samtaler, sok)
  const naa = new Date()
  return (
    <section className="chatsamtaler" aria-labelledby={`${id}-tittel`}>
      <h3 id={`${id}-tittel`} className="chatsamtaler__tittel">
        Samtaler
      </h3>
      {samtaler.length > 0 && (
        <div className="chatsamtaler__sok">
          <label htmlFor={`${id}-sok`} className="kun-skjermleser">
            Søk i samtalene
          </label>
          <Ikon navn="search" storrelse="ui" />
          <input
            id={`${id}-sok`}
            type="search"
            className="chatsamtaler__sokefelt"
            placeholder="Søk i samtalene"
            value={sok}
            onChange={(e) => setSok(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && sok) {
                e.preventDefault()
                setSok('')
              }
            }}
          />
        </div>
      )}
      {!kjent ? (
        <p className="chatsamtaler__tom" role="status">
          Henter samtalene …
        </p>
      ) : samtaler.length === 0 ? (
        <p className="chatsamtaler__tom">Du er ikke med i noen grupper med chat ennå.</p>
      ) : treff.length === 0 ? (
        <p className="chatsamtaler__tom">Ingen samtaler passer med søket.</p>
      ) : (
        <ul className="chatsamtaler__liste">
          {treff.map((s) => (
            <li key={s.gruppe.id} className="chatrad" data-gruppe={s.gruppe.id} data-ulest={s.uleste > 0 || undefined}>
              <button
                type="button"
                className="chatrad__knapp"
                aria-current={s.gruppe.id === valgt || undefined}
                onClick={() => onVelg(s.gruppe.id)}
              >
                <span className="chatrad__bilde" aria-hidden="true">
                  <Ikon navn={CHATIKON} storrelse="ui" />
                </span>
                <span className="chatrad__tekst">
                  <span className="chatrad__navn">{s.gruppe.navn}</span>
                  <span className="chatrad__art">Gruppechat · {gruppetilhorighet(s.gruppe)}</span>
                </span>
                <span className="chatrad__meta">
                  {s.siste_kl && <time dateTime={s.siste_kl}>{samtaletid(s.siste_kl, naa)}</time>}
                  {s.uleste > 0 && (
                    <span className="chatrad__uleste">
                      <span aria-hidden="true">{merketall(s.uleste)}</span>
                      <span className="kun-skjermleser">{ulesteTekst(s.uleste)}</span>
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Én samtale: overskriften, og gruppechatten slik den er på gruppesiden. */
function Samtalevisning({
  gruppe,
  kjent,
  medlemmer,
  onTilbake,
  onTilGruppen,
}: {
  gruppe: Chatgruppe
  /** Gruppen står i lista eller blant gruppene; ellers vises ingen overskrift. */
  kjent: boolean
  medlemmer?: number
  onTilbake: () => void
  onTilGruppen: () => void
}) {
  const chat = useGruppechat(gruppe.id)
  const utestengt = chat.status === 'ingen_tilgang'
  const tilgang = kjent && !utestengt
  // Tilgangen er borte (fjernet fra gruppen eller fagmiljøet): «Mine grupper»
  // hentes på nytt med en gang, slik samtalelista gjør (kontrolleren varsler).
  const { oppdater: oppdaterGruppene } = useGrupper()
  useEffect(() => {
    if (utestengt) oppdaterGruppene()
  }, [utestengt, oppdaterGruppene])
  return (
    <div className="chatsamtale">
      {/* På helsiden på brede flater står lista ved siden av, og knappen skjules (chat.css). */}
      <button type="button" className="chatsamtale__tilbake" onClick={onTilbake}>
        <Ikon navn="chev" storrelse="ui" />
        <span>Til alle samtaler</span>
      </button>
      {tilgang && (
        <div className="chatsamtale__hode">
          <span className="chatrad__bilde" aria-hidden="true">
            <Ikon navn={CHATIKON} storrelse="ui" />
          </span>
          <div className="chatsamtale__navn">
            <h3 className="chatsamtale__tittel">{gruppe.navn}</h3>
            <p className="chatsamtale__art">
              Gruppechat{medlemmer !== undefined && ` · ${medlemmer === 1 ? '1 medlem' : `${medlemmer} medlemmer`}`}
            </p>
          </div>
          <a className="chatsamtale__gruppen" href={gruppeadresse(gruppe.id)} onClick={onTilGruppen}>
            Til gruppen
          </a>
        </div>
      )}
      <Gruppechat chat={chat} gruppe={gruppe} />
    </div>
  )
}

/** Fokus som holder menyen som et lag: i et felt det skrives i, eller kommet dit med tastaturet. */
function holderApen(element: HTMLElement): boolean {
  if (element.matches('input, select, textarea, [contenteditable="true"]')) return true
  try {
    return element.matches(':focus-visible')
  } catch {
    return false
  }
}
