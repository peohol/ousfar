import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { visningsnavn } from '@delt/profil'
import { UTEN_AUTOERSTATT } from '../../autoerstatt/felt'
import { useAvatarlenker } from '../../auth/avatarer'
import { gruppeadresse } from '../../domain/rute'
import { opprettGruppe } from '../../grupper/api'
import { useGrupper } from '../../grupper/kilde'
import {
  GRUPPEROLLER,
  ROLLEFORKLARING,
  ROLLENAVN,
  delMedlemmer,
  type Gruppemedlem,
  type Gruppeoversikt,
  type Grupperolle,
} from '../../grupper/modell'
import { erEmoji, FORESLATTE_EMOJIER } from '../../grupper/symbol'
import { useBevart } from '../../oppdatering/Bevaring'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Ikonknapp } from '../Ikonknapp'
import { Avatar } from '../konto/Avatar'
import { Bildevelgerlast } from '../konto/Bildevelgerlast'
import { Merke } from '../Merke'
import { Modallag } from '../Modallag'
import { Gruppefelter, Tilbakemelding, useHandling, type Handling } from './gruppedeler'
import { Gruppesymbol, symbollenke, useGruppesymbollenker } from './Gruppesymbol'

/** Valget for en gruppe på tvers av fagmiljøene i skjemaet for en ny gruppe. */
const PAA_TVERS = ''

/* --- Opprett gruppe ---------------------------------------------------------- */

/**
 * «Opprett gruppe» fra gruppeoversikten: navnet, en valgfri beskrivelse og
 * hvem som kan bli med, ett av fagmiljøene den innloggede kan opprette
 * grupper i, eller alle på tvers (`kan_opprette`). Den som oppretter, blir
 * ansvarlig og kommer til gruppen.
 */
export function OpprettGruppe({ apen, onLukk }: { apen: boolean; onLukk: () => void }) {
  const { kan_opprette, oppdater } = useGrupper()
  const [navn, setNavn] = useBevart('ny/navn', '')
  const [beskrivelse, setBeskrivelse] = useBevart('ny/beskrivelse', '')
  const [hvor, setHvor] = useBevart<string>('ny/fagmiljo', kan_opprette.fagmiljoer[0]?.id ?? PAA_TVERS)
  const { opptatt, feil, utfor } = useHandling()
  const skjemaId = useId()
  const valg = [
    ...kan_opprette.fagmiljoer.map((f) => ({ verdi: f.id, navn: `Bare ${f.navn}`, hjelp: 'Lokal gruppe' })),
    ...(kan_opprette.tverrfaglig ? [{ verdi: PAA_TVERS, navn: 'På tvers av fagmiljøer', hjelp: 'Alle aktive brukere kan inviteres' }] : []),
  ]
  const valgt = valg.some((v) => v.verdi === hvor) ? hvor : (valg[0]?.verdi ?? PAA_TVERS)

  const opprett = (event: FormEvent) => {
    event.preventDefault()
    void utfor(async () => {
      const id = await opprettGruppe(navn.trim(), beskrivelse.trim(), valgt || null)
      setNavn('')
      setBeskrivelse('')
      oppdater()
      onLukk()
      window.location.hash = gruppeadresse(id)
    })
  }

  return (
    <Modallag
      apen={apen}
      tittel="Opprett gruppe"
      meta="Grupper"
      onLukk={onLukk}
      fot={
        <div className="skjema__knapper gruppemodal__fot">
          <Button variant="subtle" onClick={onLukk}>
            Avbryt
          </Button>
          <Button type="submit" form={skjemaId} disabled={opptatt || !navn.trim()}>
            Opprett gruppe
          </Button>
        </div>
      }
    >
      <form id={skjemaId} className="skjema gruppemodal__skjema" onSubmit={opprett}>
        <Gruppefelter
          navn={navn}
          beskrivelse={beskrivelse}
          onNavn={setNavn}
          onBeskrivelse={setBeskrivelse}
          disabled={opptatt}
          beskrivelsesnavn="Beskrivelse (valgfritt)"
        />
        <fieldset className="gruppemodal__valg" disabled={opptatt}>
          <legend className="gruppemodal__valgtittel">Hvem kan bli med?</legend>
          {valg.map((v) => (
            <label key={v.verdi} className="gruppemodal__alternativ">
              <input type="radio" name={`${skjemaId}-hvor`} value={v.verdi} checked={v.verdi === valgt} onChange={() => setHvor(v.verdi)} />
              <span>
                <span className="gruppemodal__alternativnavn">{v.navn}</span>
                <span className="gruppemodal__alternativhjelp">{v.hjelp}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="gruppeside__hint">
          Du blir ansvarlig for gruppen og kan invitere andre etterpå. Å være med i en gruppe gir aldri tilgang til et annet
          fagmiljøs lokale innhold.
        </p>
        {feil && (
          <p className="skjemafeil" role="alert">
            {feil}
          </p>
        )}
      </form>
    </Modallag>
  )
}

/* --- Medlemmene --------------------------------------------------------------- */

/**
 * «Medlemmer» fra gruppesiden: hele lista, de inviterte og hvem som er uten
 * tilgang nå. De ansvarlige inviterer, endrer roller og fjerner her, med de
 * samme bekreftelsene og reglene som før; databasen kontrollerer hver
 * handling på nytt.
 */
export function Medlemsmodal({
  gruppe,
  meg,
  apen,
  onLukk,
  handling,
  bekreftelse,
  onRolle,
  onFjern,
  onInviter,
}: {
  gruppe: Gruppeoversikt
  meg: string
  apen: boolean
  onLukk: () => void
  handling: Handling
  /** Bekreftelsen som venter, om noen (å fjerne et medlem). */
  bekreftelse: ReactNode
  onRolle: (medlem: Gruppemedlem, rolle: Grupperolle) => void
  onFjern: (medlem: Gruppemedlem) => void
  onInviter: (brukernavn: string) => Promise<boolean>
}) {
  const { opptatt } = handling
  return (
    <Modallag apen={apen} tittel="Medlemmer" meta={gruppe.navn} bred onLukk={onLukk} lukketekst="Lukk medlemmene">
      {gruppe.kan_styre && gruppe.status === 'aktiv' && <Invitasjon opptatt={opptatt} onInviter={onInviter} />}
      {bekreftelse}
      <Tilbakemelding feil={handling.feil} kvittering={handling.kvittering} />
      <Medlemsliste gruppe={gruppe} meg={meg} opptatt={opptatt} onRolle={onRolle} onFjern={onFjern} />
    </Modallag>
  )
}

function Medlemsliste({
  gruppe,
  meg,
  opptatt,
  onRolle,
  onFjern,
}: {
  gruppe: Gruppeoversikt
  meg: string
  opptatt: boolean
  onRolle: (medlem: Gruppemedlem, rolle: Grupperolle) => void
  onFjern: (medlem: Gruppemedlem) => void
}) {
  const lenker = useAvatarlenker(gruppe.medlemmer)
  const { aktive, inviterte } = delMedlemmer(gruppe.medlemmer)

  const rad = (medlem: Gruppemedlem) => {
    const navn = visningsnavn(medlem)
    const egen = medlem.id === meg
    return (
      <li key={medlem.id} className="brukerrad">
        <Avatar profil={medlem} lenke={medlem.avatar_path ? (lenker.get(medlem.avatar_path) ?? null) : null} />
        <span className="brukerrad__navn">
          <span className="brukerrad__fullt">
            {navn}
            {egen && <span className="brukerrad__deg"> (deg)</span>}
          </span>
          <span className="brukerrad__brukernavn">{medlem.username}</span>
        </span>
        <span className="brukerrad__merker">
          {medlem.kan_endre_rolle && !egen ? (
            <select
              className="felt__inndata gruppeside__rolle"
              aria-label={`Rollen til ${navn}`}
              value={medlem.rolle}
              disabled={opptatt}
              onChange={(e) => onRolle(medlem, e.target.value as Grupperolle)}
            >
              {GRUPPEROLLER.map((r) => (
                <option key={r} value={r} title={ROLLEFORKLARING[r]}>
                  {ROLLENAVN[r]}
                </option>
              ))}
            </select>
          ) : (
            <Merke tone={medlem.rolle === 'medlem' ? 'noytral' : 'aksent'}>{ROLLENAVN[medlem.rolle]}</Merke>
          )}
          {medlem.status === 'invitert' && <Merke>Invitert</Merke>}
          {medlem.status === 'aktiv' && !medlem.har_tilgang && <Merke tone="toksisk">Uten tilgang nå</Merke>}
        </span>
        {medlem.kan_fjerne && (
          <span className="brukerrad__knapper">
            <Ikonknapp
              ikon="close"
              etikett={medlem.status === 'invitert' ? `Trekk tilbake invitasjonen til ${navn}` : `Fjern ${navn} fra gruppen`}
              disabled={opptatt}
              onClick={() => onFjern(medlem)}
            />
          </span>
        )}
      </li>
    )
  }

  return (
    <>
      <ul className="brukerliste" aria-label={`Medlemmer i ${gruppe.navn}`}>
        {aktive.map(rad)}
      </ul>
      {aktive.some((m) => !m.har_tilgang) && (
        <p className="brukerliste__merknad">
          «Uten tilgang nå»: medlemmet er ikke lenger med i {gruppe.fagmiljo?.navn ?? 'fagmiljøet'}, og ser ikke gruppen før det
          igjen er medlem der.
        </p>
      )}
      {inviterte.length > 0 && (
        <section className="gruppeside__del" aria-label="Inviterte">
          <h3 className="brukerliste__overskrift">Venter på svar</h3>
          <ul className="brukerliste" aria-label={`Inviterte til ${gruppe.navn}`}>
            {inviterte.map(rad)}
          </ul>
        </section>
      )}
    </>
  )
}

function Invitasjon({ opptatt, onInviter }: { opptatt: boolean; onInviter: (brukernavn: string) => Promise<boolean> }) {
  const [brukernavn, setBrukernavn] = useBevart('inviter', '')
  const feltId = useId()
  const hjelpId = useId()
  return (
    <form
      className="gruppemodal__inviter"
      aria-label="Inviter"
      onSubmit={(e) => {
        e.preventDefault()
        void onInviter(brukernavn.trim()).then((lyktes) => lyktes && setBrukernavn(''))
      }}
    >
      <label className="felt__merkelapp" htmlFor={feltId}>
        Inviter med brukernavn
      </label>
      <div className="gruppemodal__inviterrad">
        <input
          id={feltId}
          className="felt__inndata"
          value={brukernavn}
          autoComplete="off"
          autoCapitalize="none"
          {...UTEN_AUTOERSTATT}
          disabled={opptatt}
          aria-describedby={hjelpId}
          onChange={(e) => setBrukernavn(e.target.value)}
        />
        <Button type="submit" variant="kant" icon={<Ikon navn="plus" />} disabled={opptatt || !brukernavn.trim()}>
          Inviter
        </Button>
      </div>
      <span id={hjelpId} className="felt__hjelp">
        Den inviterte ser invitasjonen øverst under Grupper, og er med når den er godtatt.
      </span>
    </form>
  )
}

/* --- Gruppeinnstillinger --------------------------------------------------------- */

/** Det den innloggede kan gjøre i «Gruppeinnstillinger». Uten noe av det står ikke knappen. */
export function harInnstillinger(g: Gruppeoversikt): boolean {
  const aktiv = g.status === 'aktiv'
  return (g.kan_styre && aktiv) || g.kan_gjenapne || (g.rolle !== null && aktiv)
}

/** Det symbolet settes til: en emoji, et beskåret bilde, eller ingen. */
export type Symbolvalg = { emoji: string } | { bilde: Blob } | null

/**
 * «Gruppeinnstillinger» fra gruppesiden: navnet og beskrivelsen, symbolet, å arkivere
 * og å åpne gruppen igjen for de som kan det, og å forlate den. Å arkivere og
 * å forlate må bekreftes, som før; den siste ansvarlige kan ikke gå.
 */
export function Innstillingsmodal({
  gruppe: g,
  apen,
  onLukk,
  handling,
  bekreftelse,
  onLagre,
  onSymbol,
  onArkiver,
  onGjenapne,
  onForlat,
}: {
  gruppe: Gruppeoversikt
  apen: boolean
  onLukk: () => void
  handling: Handling
  bekreftelse: ReactNode
  onLagre: (navn: string, beskrivelse: string) => void
  onSymbol: (valg: Symbolvalg) => void
  onArkiver: () => void
  onGjenapne: () => void
  onForlat: () => void
}) {
  const { opptatt } = handling
  const aktiv = g.status === 'aktiv'
  return (
    <Modallag apen={apen} tittel="Gruppeinnstillinger" meta={g.navn} onLukk={onLukk}>
      {g.kan_styre && aktiv && <Endring gruppe={g} opptatt={opptatt} onLagre={onLagre} />}
      {g.kan_styre && aktiv && <Symbolvelger gruppe={g} opptatt={opptatt} onSett={onSymbol} />}
      {bekreftelse}
      <Tilbakemelding feil={handling.feil} kvittering={handling.kvittering} />
      <div className="gruppeside__handlinger">
        {g.kan_styre && aktiv && (
          <Button variant="kant" icon={<Ikon navn="arkiv" />} disabled={opptatt} onClick={onArkiver}>
            Arkiver gruppen
          </Button>
        )}
        {g.kan_gjenapne && (
          <Button variant="kant" icon={<Ikon navn="reset" />} disabled={opptatt} onClick={onGjenapne}>
            Åpne gruppen igjen
          </Button>
        )}
        {g.rolle && aktiv && (
          <Button variant="kant" icon={<Ikon navn="logout" />} disabled={opptatt || !g.kan_forlate} onClick={onForlat}>
            Forlat gruppen
          </Button>
        )}
      </div>
      {g.rolle && aktiv && !g.kan_forlate && (
        <p className="gruppeside__hint">Du er den siste ansvarlige. Gjør en annen til ansvarlig før du forlater gruppen.</p>
      )}
    </Modallag>
  )
}

/**
 * Symbolet til gruppen (docs/fagmiljoer.md, «Gruppesymbolet»): et bilde,
 * beskåret til en sirkel som profilbildet, eller en emoji, fra forslagene
 * eller skrevet inn. Lagres med en gang det er valgt.
 */
function Symbolvelger({ gruppe, opptatt, onSett }: { gruppe: Gruppeoversikt; opptatt: boolean; onSett: (valg: Symbolvalg) => void }) {
  const id = useId()
  const lenker = useGruppesymbollenker([gruppe])
  const [egen, setEgen] = useBevart('symbol/emoji', '')
  const [feil, setFeil] = useState<string | null>(null)
  const valgt = gruppe.symbol && 'emoji' in gruppe.symbol ? gruppe.symbol.emoji : null
  // Hvert valg tar bort en feil fra «Annen emoji», så den ikke står ved et lagret symbol.
  const velg = (valg: Symbolvalg) => {
    setFeil(null)
    onSett(valg)
  }
  const brukEgen = (e: FormEvent) => {
    e.preventDefault()
    if (!erEmoji(egen)) {
      setFeil('Skriv inn én emoji.')
      return
    }
    setEgen('')
    velg({ emoji: egen.trim() })
  }
  return (
    <section className="skjema__bolk symbolvelger" aria-labelledby={`${id}-tittel`}>
      <h3 id={`${id}-tittel`} className="skjema__bolktittel">
        Symbol
      </h3>
      <p className="gruppeside__hint">Står ved gruppenavnet og i chatten. Velg et bilde eller en emoji.</p>
      <Bildevelgerlast
        visning={<Gruppesymbol gruppe={gruppe} lenke={symbollenke(gruppe, lenker)} storrelse="stor" />}
        knapp="Velg bilde"
        laast={opptatt}
        onValgt={(bilde) => velg({ bilde })}
      />
      <div className="symbolvelger__emojier" role="group" aria-label="Emojier">
        {FORESLATTE_EMOJIER.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="symbolvelger__emoji"
            aria-pressed={valgt === emoji}
            disabled={opptatt}
            onClick={() => velg({ emoji })}
          >
            {emoji}
          </button>
        ))}
      </div>
      <form className="symbolvelger__egen" onSubmit={brukEgen}>
        <label className="felt__merkelapp" htmlFor={`${id}-egen`}>
          Annen emoji
        </label>
        <div className="gruppemodal__inviterrad">
          <input
            id={`${id}-egen`}
            className="felt__inndata"
            value={egen}
            maxLength={16}
            autoComplete="off"
            {...UTEN_AUTOERSTATT}
            disabled={opptatt}
            onChange={(e) => setEgen(e.target.value)}
          />
          <Button type="submit" variant="kant" disabled={opptatt || !egen.trim()}>
            Bruk
          </Button>
        </div>
      </form>
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      {gruppe.symbol && (
        <div className="skjema__knapper">
          <Button variant="subtle" icon={<Ikon navn="trash" />} disabled={opptatt} onClick={() => velg(null)}>
            Fjern symbolet
          </Button>
        </div>
      )}
    </section>
  )
}

function Endring({ gruppe, opptatt, onLagre }: { gruppe: Gruppeoversikt; opptatt: boolean; onLagre: (navn: string, beskrivelse: string) => void }) {
  const [navn, setNavn] = useBevart('endre/navn', gruppe.navn)
  const [beskrivelse, setBeskrivelse] = useBevart('endre/beskrivelse', gruppe.beskrivelse)
  const uendret = navn.trim() === gruppe.navn && beskrivelse.trim() === gruppe.beskrivelse
  return (
    <form
      className="skjema gruppemodal__skjema"
      aria-label="Navn og beskrivelse"
      onSubmit={(e) => {
        e.preventDefault()
        onLagre(navn.trim(), beskrivelse.trim())
      }}
    >
      <Gruppefelter navn={navn} beskrivelse={beskrivelse} onNavn={setNavn} onBeskrivelse={setBeskrivelse} disabled={opptatt} />
      <div className="skjema__knapper">
        <Button type="submit" disabled={opptatt || !navn.trim() || uendret}>
          Lagre
        </Button>
      </div>
    </form>
  )
}
