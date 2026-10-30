import { useCallback, useEffect, useId, useMemo, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import type { Profil } from '@delt/profil'
import { Bevaringsomrade, useBevart } from '../../oppdatering/Bevaring'
import { hentAlleProfiler } from '../../auth/api'
import {
  flyttDiskusjonTil,
  flyttKategoriTil,
  hentApen,
  hentBredde,
  hentDiskusjoner,
  hentDiskusjonstekster,
  lagreApen,
  lagreBredde,
  losOppKategori,
  opprettKategori,
  type Kategorivalg,
} from '../../diskusjoner/api'
import {
  TOM_OVERSIKT,
  adresseForSide,
  antallNye,
  flyttDiskusjon,
  flyttKategori,
  grupper,
  sokIDiskusjoner,
  type Diskusjonskategori,
  type Diskusjonsoversikt as Oversikt,
  type Diskusjonsside,
  type Diskusjonssider,
  type Diskusjonstekster,
} from '../../diskusjoner/modell'
import { useJevnligSjekk } from '../../hooks/useJevnligSjekk'
import { useRestenInert } from '../../hooks/useRestenInert'
import { merketall } from '../../varsler/modell'
import { Kanthandtak, maalLengde, useDrattLengde } from '../Kanthandtak'
import { Ikon } from '../ikon/Ikon'
import { ToppmenyInnhold } from '../toppmeny/Toppmenykilde'
import { Toppmenyknapp } from '../toppmeny/Toppmenyknapp'
import { Forfatterkilde } from '../traad/Forfatterkontekst'
import type { Fremheving } from '../traad/Kommentartraad'
import { Diskusjonsoversikt, Traadknapp } from './Diskusjonsoversikt'
import { Diskusjonsside as Traadside } from './Diskusjonsside'
import { Kategoriskjema, Traadskjema } from './Skjemaer'
import { lyttEtterDiskusjon, taDiskusjon, visDiskusjon } from './diskusjonsvisning'
import '../../styles/diskusjoner.css'

/** Merket menyen bærer som `data-lag` mens fokus står i den (se `lagLiggerOver()`). */
export const DISKUSJON_LAG = 'diskusjoner'

/**
 * Hvordan menyen står, satt på rotelementet så resten av appen kan gi plass:
 * `lukket` for boblen, `apen` for hele menyen.
 */
const ROTMERKE = 'diskusjonsmeny'

/** Bredden brukeren har dratt menyen til, satt på rotelementet; `diskusjoner.css` holder den innenfor grensene. */
const BREDDEVARIABEL = '--diskusjonsbredde'
const BREDDE = { hent: hentBredde, lagre: lagreBredde }
const settBredde = (bredde: number | null) => {
  const stil = document.documentElement.style
  if (bredde === null) stil.removeProperty(BREDDEVARIABEL)
  else stil.setProperty(BREDDEVARIABEL, `${bredde}px`)
}

type Visning =
  | { side: 'liste' }
  | { side: 'traad'; id: string }
  | { side: 'ny-traad'; kategori?: string }
  | { side: 'kategori'; id?: string }

const LISTE: Visning = { side: 'liste' }

/** Plassen sist i en kategori; databasen legger tråden der. */
const SIST = Number.MAX_SAFE_INTEGER

/**
 * Diskusjonene på siden som står åpen — en fagside eller fortolkningen av én
 * analytt — i en fast meny til høyre. Den har fire tilstander:
 *
 * 1. Lukket står den på brede flater som en rund boble med samtaleikonet, der
 *    toppen av menyen står åpen, og et blått merke når noe er nytt.
 * 2. Med pekeren over (eller fokus fra tastaturet) vokser boblen litt og sier
 *    «Diskusjoner — Trykk for å vise». Det er bare utseende (`diskusjoner.css`).
 * 3. Et trykk på boblen åpner menyen. Den står åpen, også fra side til side og
 *    fra maskin til maskin (brukerinnstillingen `diskusjoner.laast`), til
 *    lukkeknappen trykkes, og resten av appen gir plass til den.
 * 4. «Maksimer» viser den som helside over hele vinduet, med oversikten eller
 *    én tråd. Det er en tilstand over siden som står, ikke en egen side:
 *    `Escape` eller knappen igjen tar brukeren tilbake til menyen slik den
 *    stod, og lukkeknappen lukker den helt. Resten av appen er inert så lenge.
 *
 * Åpen kan menyen gjøres bredere ved å dra i venstre kanten (eller med
 * piltastene på den); bredden følger brukeren (`diskusjoner.bredde`). Den
 * smaleste bredden er den menyen har fra før.
 *
 * På smale flater står en knapp i toppmenyen (dokken) i stedet for boblen,
 * som åpner menyen over siden.
 *
 * Mens fokus står i menyen, er den et lag over appen: tastene i fortolkningen
 * ligger i ro, så det som skrives her, ikke velger eller kopierer noe bak.
 */
export function Diskusjonsmeny({
  side,
  sidenavn,
  sider,
}: {
  side: Diskusjonsside
  sidenavn: string
  /** Sidene en tråd kan flyttes til. */
  sider: Diskusjonssider
}) {
  const [apen, setApen] = useBevart('diskusjoner/apen', false)
  // Bredden følger brukeren som om menyen står åpen (`diskusjoner.bredde`).
  const { lengde: bredde, endrer: endrerBredde, sett: lagreNyBredde } = useDrattLengde('diskusjoner/bredde', BREDDE)
  const [mobilApen, setMobilApen] = useBevart('diskusjoner/mobil', false)
  const [helside, setHelside] = useBevart('diskusjoner/helside', false)
  const [fokus, setFokus] = useState(false)
  const meny = useRef<HTMLElement>(null)

  // Om menyen står åpen, er lagret på brukeren. Til det er hentet, gjelder det som stod.
  useEffect(() => {
    void hentApen().then((lagret) => lagret !== null && setApen(lagret), () => undefined)
  }, [setApen])

  useEffect(() => {
    settBredde(bredde)
    return () => settBredde(null)
  }, [bredde])

  const visBredde = (ny: number) => {
    endrerBredde()
    settBredde(ny)
  }

  const settApen = useCallback(
    (ny: boolean) => {
      setApen(ny)
      void lagreApen(ny).catch(() => undefined)
    },
    [setApen],
  )

  const vist = apen || mobilApen || helside
  useRestenInert(meny, helside)

  // Resten av appen gir plass til boblen, og til hele menyen når den står åpen.
  useEffect(() => {
    const rot = document.documentElement
    rot.dataset[ROTMERKE] = apen ? 'apen' : 'lukket'
    return () => {
      delete rot.dataset[ROTMERKE]
    }
  }, [apen])

  // Et trykk utenfor lukker menyen over siden på smale flater.
  useEffect(() => {
    if (!mobilApen) return
    const utenfor = (event: PointerEvent) => {
      if (meny.current?.contains(event.target as Node)) return
      if ((event.target as Element | null)?.closest?.('.diskusjonsknapp')) return
      setMobilApen(false)
    }
    document.addEventListener('pointerdown', utenfor)
    return () => document.removeEventListener('pointerdown', utenfor)
  }, [mobilApen, setMobilApen])

  /**
   * Fokus gjør menyen til et lag når det står i et felt det skrives i, eller
   * kom dit med tastaturet. Et museklikk på en knapp i menyen skal ikke holde
   * tastene i fortolkningen i ro.
   */
  const inn = (event: FocusEvent<HTMLElement>) => setFokus(holderApen(event.target))
  const ut = (event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setFokus(false)
  }

  /** Åpner menyen der den står: over siden på smale flater, ellers ved siden av den. */
  const apne = useCallback(() => {
    if (smalFlate()) setMobilApen(true)
    else settApen(true)
  }, [setMobilApen, settApen])

  /** Boblen ble trykket: menyen åpnes, og fokus går til lukkeknappen, så samme tast lukker igjen. */
  const apneFraBoblen = () => {
    apne()
    flyttFokus('.diskusjonspanel__lukk')
  }

  /**
   * Tilbake fra helsiden til menyen, åpen som før — på smale flater også om
   * helsiden ble åpnet på en bred. Står fokus ikke lenger i menyen, går det
   * til knappen for helsiden.
   */
  const avsluttHelside = () => {
    setHelside(false)
    apne()
    flyttFokus('.diskusjonspanel__helside', true)
  }

  /** Lukkeknappen: helt lukket, også fra helsiden. Fokus går til boblen. */
  const lukk = () => {
    setHelside(false)
    settApen(false)
    setMobilApen(false)
    setFokus(false)
    flyttFokus('.diskusjonsboble')
  }

  /**
   * Escape uten helside: menyen over siden på smale flater lukkes, og fokus
   * slippes. Menyen ved siden av siden står åpen til den lukkes med knappen.
   */
  const slipp = () => {
    setMobilApen(false)
    setFokus(false)
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  /**
   * Fokus til `velger` i menyen når den er tegnet på nytt, så det ikke blir
   * borte med knappen som ble trykket. Med `bareTapt` bare når fokus ikke
   * lenger står synlig i menyen. Er målet ikke synlig, slippes fokus.
   */
  const flyttFokus = (velger: string, bareTapt = false) =>
    requestAnimationFrame(() => {
      const aktiv = document.activeElement as HTMLElement | null
      const iMenyen = !!meny.current?.contains(aktiv) && aktiv?.checkVisibility?.() !== false
      if (bareTapt && iMenyen) return
      const maal = meny.current?.querySelector<HTMLElement>(velger)
      if (maal && maal.checkVisibility?.() !== false) maal.focus()
      else if (meny.current?.contains(aktiv)) aktiv?.blur()
    })

  return (
    <>
      <ToppmenyInnhold spor="diskusjoner">
        <Toppmenyknapp
          ikon="diskusjon"
          className="diskusjonsknapp"
          aria-expanded={mobilApen}
          onClick={() => setMobilApen((a) => !a)}
        >
          Diskusjoner
        </Toppmenyknapp>
      </ToppmenyInnhold>
      <aside
        ref={meny}
        className="diskusjonsmeny"
        aria-label={`Diskusjoner om ${sidenavn}`}
        data-apen={vist || undefined}
        data-mobil={mobilApen || undefined}
        data-helside={helside || undefined}
        {...((fokus || helside) && { 'data-lag': DISKUSJON_LAG })}
        onFocus={inn}
        onBlur={ut}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || event.defaultPrevented) return
          // Et lag over menyen, som flyttingen av en tråd, lukkes for seg.
          if ((event.target as HTMLElement).isContentEditable || (event.target as HTMLElement).closest('dialog')) return
          event.preventDefault()
          // Escape går ut av helsiden eller menyen og ikke noe mer: fokus slippes i `slipp()`, så
          // uten dette ville fortolkningen bak tatt den som «Bytt analytt».
          event.stopPropagation()
          if (helside) avsluttHelside()
          else slipp()
        }}
      >
        {vist && !helside && (
          <Kanthandtak
            etikett="Bredden på diskusjonene"
            maal={() => ({
              lengde: maalLengde(meny.current!, 'var(--diskusjonspanel)'),
              minst: maalLengde(meny.current!, 'var(--diskusjonspanel-minst)'),
              mest: maalLengde(meny.current!, 'var(--diskusjonspanel-mest)'),
            })}
            onEndre={visBredde}
            onFerdig={lagreNyBredde}
          />
        )}
        <Bevaringsomrade navn={`diskusjoner:${side}`}>
          <Diskusjonsflate
            key={side}
            side={side}
            sidenavn={sidenavn}
            sider={sider}
            apen={vist}
            helside={helside}
            onHelside={() => (helside ? avsluttHelside() : setHelside(true))}
            onApne={apneFraBoblen}
            onLukk={lukk}
            onVarslet={apne}
          />
        </Bevaringsomrade>
      </aside>
    </>
  )
}

/** Innholdet i menyen for én side. Byttes ut når siden byttes, så ingenting henger igjen fra forrige. */
function Diskusjonsflate({
  side,
  sidenavn,
  sider,
  apen,
  helside,
  onHelside,
  onApne,
  onLukk,
  onVarslet,
}: {
  side: Diskusjonsside
  sidenavn: string
  sider: Diskusjonssider
  apen: boolean
  /** Menyen står som helside over hele vinduet. */
  helside: boolean
  onHelside: () => void
  onApne: () => void
  onLukk: () => void
  /** En tråd et varsel ba om, er åpnet. */
  onVarslet: () => void
}) {
  const [oversikt, setOversikt] = useState<Oversikt | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const [visning, setVisning] = useBevart<Visning>('visning', LISTE)
  const [sok, setSok] = useBevart('sok', '')
  const [tekster, setTekster] = useState<Diskusjonstekster[] | null>(null)
  const [profiler, setProfiler] = useState<Profil[]>([])
  /** Kommentaren en direktelenke førte til, i tråden som står åpen. */
  const [fremhev, setFremhev] = useState<Fremheving | null>(null)
  const kropp = useRef<HTMLDivElement>(null)
  /** Plassen over det som rulles, der en åpen tråd har overskriften sin. */
  const [traadhode, setTraadhode] = useState<HTMLDivElement | null>(null)
  const sokId = useId()

  const hent = useCallback(async () => {
    try {
      setOversikt(await hentDiskusjoner(side))
      setFeil(null)
    } catch {
      setFeil('Fikk ikke hentet diskusjonene.')
    }
  }, [side])
  useJevnligSjekk(useCallback(() => void hent(), [hent]))

  // Navnene og bildene til dem som skriver, hentes første gang menyen åpnes.
  const profilerHentet = useRef(false)
  useEffect(() => {
    if (!apen || profilerHentet.current) return
    profilerHentet.current = true
    void hentAlleProfiler().then(setProfiler, () => undefined)
  }, [apen])

  // Tekstene til søket hentes når det søkes, og på nytt når trådene er endret.
  const soker = sok.trim() !== ''
  useEffect(() => {
    if (!soker) return
    void hentDiskusjonstekster(side).then(setTekster, () => setTekster([]))
  }, [soker, side, oversikt])

  // En tråd et varsel eller en direktelenke ba om, åpnes når menyen for siden står.
  useEffect(() => {
    const apneVenter = () => {
      const venter = taDiskusjon(side)
      if (!venter) return
      setVisning({ side: 'traad', id: venter.diskusjon })
      setFremhev(venter.kommentar ? { kommentar: venter.kommentar, nr: Date.now() } : null)
      if (!venter.kommentar) kropp.current?.scrollTo({ top: 0 })
      onVarslet()
    }
    apneVenter()
    return lyttEtterDiskusjon(apneVenter)
  }, [side, setVisning, onVarslet])

  const data = oversikt ?? TOM_OVERSIKT
  const gruppering = useMemo(() => grupper(data), [data])
  const kategorier = useMemo(() => gruppering.kategorier.map((g) => g.kategori), [gruppering])
  const treff = useMemo(() => (soker && tekster ? sokIDiskusjoner(sok, data.diskusjoner, tekster) : []), [soker, sok, data, tekster])

  const tilListe = () => {
    setVisning(LISTE)
    setFremhev(null)
    void hent()
  }
  const apneTraad = (id: string) => {
    setVisning({ side: 'traad', id })
    setFremhev(null)
    kropp.current?.scrollTo({ top: 0 })
  }

  /** Flyttingen vises med én gang og lagres etterpå. Går lagringen galt, hentes lista på nytt. */
  const lagreFlytting = async (endring: (o: Oversikt) => Oversikt, lagring: () => Promise<void>) => {
    setOversikt((o) => (o ? endring(o) : o))
    try {
      await lagring()
      setFeil(null)
    } catch (e) {
      setFeil((e as Error).message)
      await hent()
      throw e
    }
  }
  const flyttTraad = (id: string, kategori: string, indeks: number) =>
    lagreFlytting((o) => flyttDiskusjon(o, id, kategori, indeks), () => flyttDiskusjonTil(id, kategori, indeks))
  /**
   * Sist i en kategori på siden, eller i en ny, som lages først. Lista hentes
   * på nytt også når flyttingen feiler etter at kategorien er laget, så den
   * nye kategorien står der og kan velges neste gang.
   */
  const flyttTraadHer = async (id: string, valg: Kategorivalg) => {
    if ('id' in valg) return flyttTraad(id, valg.id, SIST)
    try {
      await flyttDiskusjonTil(id, await opprettKategori(side, valg.navn, valg.emoji), SIST)
    } finally {
      await hent()
    }
  }
  const flyttKat = (id: string, indeks: number) =>
    lagreFlytting((o) => flyttKategori(o, id, indeks), () => flyttKategoriTil(id, indeks))

  const merkSett = useCallback(
    (id: string) =>
      setOversikt((o) =>
        o ? { ...o, diskusjoner: o.diskusjoner.map((d) => (d.id === id ? { ...d, usett: false, nye_kommentarer: 0 } : d)) } : o,
      ),
    [],
  )

  const losOpp = async (kategori: Diskusjonskategori) => {
    try {
      await losOppKategori(kategori.id)
      await hent()
    } catch (e) {
      setFeil((e as Error).message)
    }
  }

  let innhold: ReactNode
  if (visning.side === 'traad') {
    innhold = (
      <Traadside
        key={visning.id}
        id={visning.id}
        side={side}
        sider={sider}
        kategorier={kategorier}
        onEndret={hent}
        onSett={merkSett}
        onFlytt={(kategori) => flyttTraadHer(visning.id, kategori)}
        onFlyttetTilSide={(til) => {
          // Tråden følges til siden den er flyttet til, der menyen åpner den.
          setVisning(LISTE)
          visDiskusjon(til, visning.id)
          window.location.hash = adresseForSide(til)
        }}
        onSlettet={tilListe}
        fremhev={fremhev}
        hode={traadhode}
      />
    )
  } else if (visning.side === 'ny-traad') {
    innhold = (
      <Traadskjema
        side={side}
        kategori={visning.kategori}
        kategorier={kategorier}
        onAvbryt={tilListe}
        onLagret={(id) => {
          void hent()
          apneTraad(id)
        }}
      />
    )
  } else if (visning.side === 'kategori') {
    innhold = (
      <Kategoriskjema
        side={side}
        kategori={kategorier.find((k) => k.id === visning.id)}
        kategorier={kategorier}
        onAvbryt={tilListe}
        onLagret={tilListe}
      />
    )
  } else if (soker) {
    innhold = !tekster ? (
      <p className="diskusjonsoversikt__tom">Søker …</p>
    ) : treff.length === 0 ? (
      <p className="diskusjonsoversikt__tom">Ingen tråder passer med søket.</p>
    ) : (
      <ul className="traadliste traadliste--treff" aria-label="Treff">
        {treff.map(({ diskusjon, utdrag }) => (
          <li key={diskusjon.id} className="traadrad" data-arkivert={diskusjon.arkivert_kl ? true : undefined}>
            <Traadknapp diskusjon={diskusjon} utdrag={utdrag} onApne={apneTraad} />
          </li>
        ))}
      </ul>
    )
  } else {
    innhold = (
      <Diskusjonsoversikt
        gruppering={gruppering}
        kategorier={kategorier}
        onApne={apneTraad}
        onNyTraad={(kategori) => setVisning({ side: 'ny-traad', kategori })}
        onNyKategori={() => setVisning({ side: 'kategori' })}
        onEndreKategori={(k) => setVisning({ side: 'kategori', id: k.id })}
        onLosOpp={(k) => void losOpp(k)}
        onFlyttKategori={(id, indeks) => void flyttKat(id, indeks).catch(() => undefined)}
        onFlyttTraad={(id, kategori, indeks) => void flyttTraad(id, kategori, indeks).catch(() => undefined)}
      />
    )
  }

  // Det blå merket på boblen: alle tråder med noe nytt, unntatt de arkiverte.
  const nye = useMemo(
    () => gruppering.kategorier.reduce((sum, g) => sum + antallNye(g.diskusjoner), antallNye(gruppering.ukategoriserte)),
    [gruppering],
  )

  return (
    <Forfatterkilde profiler={profiler}>
      {/* Lukket: boblen. Med pekeren over vokser den og sier hva den er (`diskusjoner.css`). */}
      <button
        type="button"
        className="diskusjonsboble"
        hidden={apen}
        aria-label={nye > 0 ? `Vis diskusjonene, ${nye} med nytt` : 'Vis diskusjonene'}
        onClick={onApne}
      >
        <span className="diskusjonsboble__innhold" aria-hidden="true">
          <Ikon navn="diskusjon" className="diskusjonsboble__ikon" />
          <span className="diskusjonsboble__tittel">Diskusjoner</span>
          <span className="diskusjonsboble__hint">Trykk for å vise</span>
        </span>
        {nye > 0 && (
          <span className="nyttmerke nyttmerke--boble" aria-hidden="true">
            {merketall(nye)}
          </span>
        )}
      </button>

      <div className="diskusjonspanel" hidden={!apen}>
        <div className="diskusjonspanel__topp">
          <h2 className="diskusjonspanel__tittel">
            <Ikon navn="diskusjon" storrelse="ui" />
            <span>Diskusjoner</span>
          </h2>
          <button
            type="button"
            className="diskusjonspanel__helside"
            aria-pressed={helside}
            aria-label="Maksimer"
            title={helside ? 'Gjenopprett' : 'Maksimer'}
            onClick={onHelside}
          >
            <Ikon navn={helside ? 'helsideAv' : 'helside'} storrelse="ui" />
          </button>
          <button
            type="button"
            className="diskusjonspanel__lukk"
            aria-label="Lukk diskusjonene"
            title="Lukk"
            onClick={onLukk}
          >
            <Ikon navn="close" storrelse="ui" />
          </button>
        </div>
        <p className="diskusjonspanel__side">{sidenavn}</p>
        {/* Tilbake, overskriften på tråden og søket står fast over det som rulles. */}
        {visning.side === 'traad' && (
          <>
            <button type="button" className="diskusjonspanel__tilbake" onClick={tilListe}>
              <Ikon navn="chev" storrelse="ui" />
              <span>Alle tråder</span>
            </button>
            <div ref={setTraadhode} className="diskusjonspanel__traadhode" />
          </>
        )}
        {visning.side === 'liste' && (
          <div className="diskusjonspanel__sok">
            <label htmlFor={sokId} className="kun-skjermleser">
              Søk i trådene
            </label>
            <Ikon navn="search" storrelse="ui" />
            <input
              id={sokId}
              type="search"
              className="diskusjonspanel__sokefelt"
              placeholder="Søk i trådene"
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
        {feil && (
          <p className="skjemafeil" role="alert">
            {feil}
          </p>
        )}
        <div ref={kropp} className="diskusjonspanel__kropp">
          {innhold}
        </div>
      </div>
    </Forfatterkilde>
  )
}

/** Smal flate: knappen for diskusjonene står i dokken (se `diskusjoner.css`). */
function smalFlate(): boolean {
  return document.querySelector<HTMLElement>('.diskusjonsknapp')?.checkVisibility?.() === true
}

/** Fokus som holder menyen åpen: i et felt det skrives i, eller kommet dit med tastaturet. */
function holderApen(element: HTMLElement): boolean {
  if (element.matches('input, select, textarea, [contenteditable="true"]')) return true
  try {
    return element.matches(':focus-visible')
  } catch {
    // En nettleser som ikke kjenner `:focus-visible`: bare feltene holder den åpen.
    return false
  }
}
