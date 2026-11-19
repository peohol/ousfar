import { useId, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { brukernavnFeil, normaliserBrukernavn } from '@delt/brukernavn'
import { visningsnavn } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import { UTEN_AUTOERSTATT } from '../../autoerstatt/felt'
import { sokeord, treffIntervaller } from '../../faginnhold/sok'
import { useBevart } from '../../oppdatering/Bevaring'
import { personlinje, type Personkilde, type Persontreff } from '../../personsok/modell'
import { usePersonsok } from '../../personsok/usePersonsok'
import { Ikon } from '../ikon/Ikon'
import { Avatar } from '../konto/Avatar'
import { Markert } from '../sok/Markert'
import '../../styles/personsok.css'

/** Et valg i lista: en person, eller brukernavnet slik det er skrevet. */
type Valg = { art: 'person'; person: Persontreff } | { art: 'brukernavn'; brukernavn: string }

/** Det et valg gir tilbake: `true` når det lyktes, så feltet tømmes. */
type Valgsvar = boolean | void | Promise<boolean | void>

export interface PersonsokProps {
  /** Hvor treffene hentes; `null` slår søket av. Må være den samme mellom visningene (`useMemo`). */
  kilde: Personkilde | null
  /** Navnet på feltet. Vises over feltet med `synligEtikett`, ellers bare for skjermlesere. */
  etikett: string
  synligEtikett?: boolean
  /** Forklaringen under feltet. */
  hjelp?: ReactNode
  /** Nøkkelen søket bevares under ved en oppdatering av appen (`useBevart`). */
  bevar: string
  onVelg: (person: Persontreff) => Valgsvar
  /**
   * Gir et valg for brukernavnet slik det er skrevet, når det er et gyldig
   * brukernavn og ingen av treffene har det: for den som ikke finnes i søket
   * (en konto den innloggede ikke ser), som før søket kom.
   */
  onBrukernavn?: (brukernavn: string) => Valgsvar
  /** Tekst bak linja under navnet, f.eks. «Finnes alt en samtale». */
  tillegg?: (person: Persontreff) => string | null
  /** Mens noe annet pågår: ingenting kan velges. */
  opptatt?: boolean
  autoFocus?: boolean
}

/**
 * Personsøket (docs/fagmiljoer.md, «Personsøket»): feltet der noen skal
 * velge en annen person, med treffene rett under. Det søkes etter navnet og
 * brukernavnet, og en skrivefeil går som regel bra.
 *
 * Feltet er en kombinasjonsboks, som fagsøket: piltastene velger et treff,
 * `Enter` velger det, og `Escape` tømmer feltet (et tomt felt slipper
 * `Escape` videre). Det første treffet står valgt når treffene kommer.
 */
export function Personsok({
  kilde,
  etikett,
  synligEtikett,
  hjelp,
  bevar,
  onVelg,
  onBrukernavn,
  tillegg,
  opptatt = false,
  autoFocus,
}: PersonsokProps) {
  const id = useId()
  const [sok, setSok] = useBevart(bevar, '')
  const [aktiv, setAktiv] = useState(0)
  const { svar, glem } = usePersonsok(kilde, sok)
  const treff = svar.status === 'klar' ? svar.treff : []
  const ord = useMemo(() => sokeord(sok), [sok])

  const brukernavn = normaliserBrukernavn(sok)
  const somBrukernavn =
    onBrukernavn && svar.status === 'klar' && brukernavnFeil(brukernavn) === null && !treff.some((t) => t.username === brukernavn)
  const valg: Valg[] = [
    ...treff.map((person) => ({ art: 'person' as const, person })),
    ...(somBrukernavn ? [{ art: 'brukernavn' as const, brukernavn }] : []),
  ]
  const valgt = Math.min(aktiv, valg.length - 1)
  const lenker = useAvatarlenker(treff.map((t) => ({ avatar_path: t.avatar_path ?? null, updated_at: t.updated_at ?? '' })))

  const endre = (ny: string) => {
    setSok(ny)
    setAktiv(0)
  }

  const velg = async (v: Valg) => {
    if (opptatt) return
    const lyktes = await (v.art === 'person' ? onVelg(v.person) : onBrukernavn?.(v.brukernavn))
    if (lyktes) {
      endre('')
      glem()
    }
  }

  const paaTast = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (valg.length === 0) return
        e.preventDefault()
        setAktiv(e.key === 'ArrowDown' ? Math.min(valgt + 1, valg.length - 1) : Math.max(valgt - 1, 0))
        return
      case 'Enter': {
        e.preventDefault()
        const v = valg[valgt]
        if (v) void velg(v)
        return
      }
      case 'Escape':
        if (!sok) return
        e.preventDefault()
        e.stopPropagation()
        endre('')
        return
    }
  }

  const listeId = `${id}-treff`
  const radId = (i: number) => `${id}-treff-${i}`
  const hjelpId = `${id}-hjelp`
  const statusId = `${id}-status`

  const rad = (v: Valg, i: number) => {
    const nokkel = v.art === 'person' ? v.person.id : `brukernavn-${v.brukernavn}`
    const felles = {
      id: radId(i),
      role: 'option',
      'aria-selected': i === valgt,
      'aria-disabled': opptatt || undefined,
      className: 'personsok__rad',
      onMouseDown: (e: MouseEvent) => e.preventDefault(),
      onMouseEnter: () => setAktiv(i),
      onClick: () => void velg(v),
    }
    if (v.art === 'brukernavn') {
      return (
        <li key={nokkel} {...felles}>
          <span className="avatar avatar--liten personsok__ikon" aria-hidden="true">
            <Ikon navn="user" storrelse="ui" />
          </span>
          <span className="personsok__tekst">
            <span className="personsok__navn">Bruk brukernavnet «{v.brukernavn}»</span>
            <span className="personsok__linje">For en som ikke finnes i søket. Brukernavnet må være skrevet nøyaktig.</span>
          </span>
        </li>
      )
    }
    const p = v.person
    const navn = visningsnavn(p)
    const ekstra = tillegg?.(p)
    return (
      <li key={nokkel} {...felles}>
        <Avatar profil={{ ...p, avatar_path: p.avatar_path ?? null }} lenke={p.avatar_path ? (lenker.get(p.avatar_path) ?? null) : null} storrelse="liten" />
        <span className="personsok__tekst">
          <span className="personsok__navn">
            <Markert tekst={navn} treff={treffIntervaller(navn, ord)} />
          </span>
          <span className="personsok__linje">
            {personlinje(p)}
            {ekstra && ` · ${ekstra}`}
          </span>
        </span>
      </li>
    )
  }

  const melding =
    svar.status === 'kort'
      ? sok.trim() && kilde
        ? 'Skriv minst to tegn.'
        : null
      : svar.status === 'soker'
        ? 'Søker …'
        : svar.status === 'klar' && valg.length === 0
          ? 'Ingen treff.'
          : null

  return (
    <div className="personsok">
      <label htmlFor={`${id}-felt`} className={synligEtikett ? 'felt__merkelapp' : 'kun-skjermleser'}>
        {etikett}
      </label>
      <div className="personsok__felt">
        <Ikon navn="search" storrelse="ui" />
        <input
          id={`${id}-felt`}
          type="search"
          className="personsok__inndata"
          placeholder="Søk etter navn eller brukernavn"
          autoComplete="off"
          autoCapitalize="none"
          {...UTEN_AUTOERSTATT}
          autoFocus={autoFocus}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={valg.length > 0}
          aria-controls={listeId}
          aria-describedby={[hjelp && hjelpId, statusId].filter(Boolean).join(' ') || undefined}
          {...(valg.length > 0 && { 'aria-activedescendant': radId(valgt) })}
          value={sok}
          onChange={(e) => endre(e.target.value)}
          onKeyDown={paaTast}
        />
      </div>
      {hjelp && (
        <span id={hjelpId} className="felt__hjelp">
          {hjelp}
        </span>
      )}
      <ul id={listeId} role="listbox" aria-label="Treff" className="personsok__treff" hidden={valg.length === 0}>
        {valg.map(rad)}
      </ul>
      <p id={statusId} className="personsok__melding" role="status">
        {melding}
      </p>
      {svar.status === 'feil' && (
        <p className="skjemafeil" role="alert">
          {svar.melding}
        </p>
      )}
    </div>
  )
}
