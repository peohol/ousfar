/**
 * Det databasen og appen gir til panelene på forsiden, som rader i
 * `Oppsummeringskort` (docs/forside.md). Rene funksjoner: tekstene er de samme
 * som i varselvinduet (`src/varsler/modell.ts`), og hver rad lenker til selve
 * hendelsen — idéen eller kommentaren, tråden, forslaget, oppgaven, gruppen
 * eller delen av fagsiden — ikke til en liste.
 */
import { fortolkningsadresseForAnalytt, type Analyttkatalog } from '../../domain/analyttkatalog'
import { FORSIDEADRESSE, FORTOLKNINGSADRESSE, forslagsadresse, gruppeadresse, stoffadresse } from '../../domain/rute'
import { lenkeadresse } from '../../direktelenker/mal'
import { gruppetilhorighet } from '../../grupper/modell'
import { visningsnavn } from '@delt/profil'
import {
  aktorer,
  deletekst,
  diskusjonstekst,
  erDiskusjonsvarsel,
  erForslagsvarsel,
  erGruppevarsel,
  favorittsted,
  forslagstekst,
  fortolkningsobjekter,
  gruppemaal,
  gruppetekst,
  idetekst,
  navneliste,
  objekttekst,
  ressurstekst,
  varselforslag,
  varselgruppe,
  varselgruppeoppgave,
  type Databasevarsel,
  type Endringsvarsel,
} from '../../varsler/modell'
import type { Ikonnavn } from '../ikon/register'
import type { Hendelse } from '../oppsummering/hendelse'
import type { Fagsideendring, Forsidegruppe, Forsideoppgave } from '../../forside/oppsummering'
import type { Gruppeinvitasjon } from '../../grupper/modell'

/** Det radene trenger å vite om den innloggede og appen. */
export interface Radkontekst {
  meg: string
  /** Navnet på en bruker, etter ID-en. */
  navn: (id: string) => string
  katalog: Analyttkatalog
}

const IKON: Partial<Record<Databasevarsel['kategori'], Ikonnavn>> = {
  fortolkning: 'interp',
  mine_ideer: 'comment',
  nye_ideer: 'idea',
  gruppeideer: 'idea',
  gruppeoppgaver: 'oppgaver',
  mine_forslag: 'foresla',
  forslag_til_behandling: 'foresla',
  mine_diskusjoner: 'diskusjon',
  aktive_diskusjoner: 'diskusjon',
  favorittdiskusjoner: 'diskusjon',
}

/** Den siste kommentaren i hendelsene, som lenken peker på. */
const sisteKommentar = (varsel: Databasevarsel) => [...varsel.hendelser].reverse().find((h) => h.kommentar)?.kommentar ?? null

/** «Tittel · sted», uten det som mangler. */
const hvor = (...ledd: (string | null | undefined)[]) => ledd.filter(Boolean).join(' · ')

/**
 * Et varsel fra databasen som en rad. Raden fører dit varselet gjelder, og
 * `ved` merker det lest, som i varselvinduet.
 */
export function varselrad(varsel: Databasevarsel, { meg, navn, katalog }: Radkontekst, ved: () => void): Hendelse {
  const felles = { id: varsel.id, ikon: IKON[varsel.kategori] ?? 'bell', tid: varsel.oppdatert_kl, ulest: !varsel.lest, ved }

  if (varsel.kategori === 'fortolkning') {
    const objekter = fortolkningsobjekter(varsel)
    const forste = objekter[0]
    const kode = forste?.analyttkode
    return {
      ...felles,
      tittel: forste ? `${objekttekst(forste)}${objekter.length > 1 ? ` og ${objekter.length - 1} til` : ''}` : 'Fortolkningen er endret',
      hvor: hvor('Fortolkningen er endret', `publisert av ${navneliste(aktorer(varsel.hendelser).map(navn))}`),
      til: (kode && fortolkningsadresseForAnalytt(kode, katalog)) || FORTOLKNINGSADRESSE,
    }
  }

  if (erForslagsvarsel(varsel)) {
    const forslag = varselforslag(varsel)
    return {
      ...felles,
      tittel: forslagstekst(varsel, navn),
      hvor: hvor(forslag && ressurstekst(forslag.ressurs), 'Endringsforslag'),
      til: forslagsadresse(forslag?.id, forslag ? undefined : varsel.kategori === 'forslag_til_behandling' ? 'behandling' : undefined),
    }
  }

  if (erGruppevarsel(varsel)) {
    const gruppe = varselgruppe(varsel)
    const maal = gruppemaal(varsel)
    const oppgave = varselgruppeoppgave(varsel)
    const til =
      maal?.slag === 'oppgave'
        ? gruppeadresse(maal.gruppe, 'oppgaver', maal.id)
        : maal?.slag === 'ide'
          ? lenkeadresse({ slag: 'ide', id: maal.id, kommentar: sisteKommentar(varsel) })
          : gruppeadresse(maal?.gruppe)
    return {
      ...felles,
      tittel: gruppetekst(varsel, navn),
      hvor: hvor(gruppe?.navn, oppgave ? `«${oppgave.tittel}»` : varsel.ide && `«${varsel.ide.tittel}»`),
      til,
    }
  }

  if (erDiskusjonsvarsel(varsel)) {
    const diskusjon = varsel.diskusjon
    return {
      ...felles,
      tittel: diskusjonstekst(varsel, meg, navn),
      hvor: hvor(diskusjon && `«${diskusjon.tittel}»`, 'Diskusjon'),
      til: diskusjon ? lenkeadresse({ slag: 'diskusjon', id: diskusjon.id, kommentar: sisteKommentar(varsel) }) : FORSIDEADRESSE,
    }
  }

  // Idéene: felles og i gruppene. Direktelenken åpner en gruppeidé i gruppen.
  const ide = varsel.ide
  return {
    ...felles,
    tittel: idetekst(varsel, meg, navn),
    hvor: hvor(ide && `«${ide.tittel}»`, ide?.gruppe?.navn ?? 'Idéer'),
    til: ide ? lenkeadresse({ slag: 'ide', id: ide.id, kommentar: sisteKommentar(varsel) }) : FORSIDEADRESSE,
  }
}

const ENDRINGSART: Record<Endringsvarsel['kategori'], string> = {
  kritisk_faglig: 'Kritisk faglig melding',
  fortolkning: 'Endrer fortolkningen',
  funksjonalitet: 'Ny funksjon',
}

/**
 * En føring i endringsloggen som er et varsel. Den har ingen egen adresse, så
 * raden er en knapp: `ved` åpner endringsloggen med føringen.
 */
export function endringsrad(varsel: Endringsvarsel, ved: () => void): Hendelse {
  return {
    id: varsel.id,
    ikon: varsel.kategori === 'kritisk_faglig' ? 'shield' : 'history',
    tittel: varsel.endring.sammendrag,
    hvor: hvor('Appen', ENDRINGSART[varsel.kategori]),
    tid: varsel.oppdatert_kl,
    ulest: !varsel.lest,
    ved,
  }
}

/** En invitasjon til en gruppe: den står øverst i gruppeoversikten, der den besvares. */
export function invitasjonsrad(invitasjon: Gruppeinvitasjon): Hendelse {
  const av = invitasjon.invitert_av
  return {
    id: `invitasjon:${invitasjon.gruppe.id}`,
    ikon: 'ideoppgaver',
    tittel: `Invitasjon til ${invitasjon.gruppe.navn}`,
    hvor: hvor(av && `fra ${visningsnavn(av)}`, gruppetilhorighet(invitasjon.gruppe)),
    tid: invitasjon.invitert_kl,
    ulest: true,
    til: gruppeadresse(),
  }
}

/** «1 ny» eller «3 nye» i en gruppe: nye idéer og uleste meldinger. */
export function nyttIGruppen(gruppe: Forsidegruppe): number {
  return gruppe.samhandling.nye_ideer + (gruppe.samhandling.chat_uleste ?? 0)
}

export function grupperad(gruppe: Forsidegruppe): Hendelse {
  const nye = nyttIGruppen(gruppe)
  return {
    id: gruppe.id,
    ikon: 'ideoppgaver',
    tittel: gruppe.navn,
    hvor: hvor(gruppetilhorighet(gruppe), `${gruppe.medlemmer} ${gruppe.medlemmer === 1 ? 'medlem' : 'medlemmer'}`),
    merknad: nye > 0 ? `${nye} ${nye === 1 ? 'ny' : 'nye'}` : undefined,
    til: gruppeadresse(gruppe.id),
  }
}

/** En fagside med publiserte endringer, som lenker til den første delen som ble endret. */
export function fagsiderad(endring: Fagsideendring): Hendelse {
  const deler = endring.deler.length > 0 ? `${deletekst(endring.deler)} er oppdatert` : 'Oppdatert'
  return {
    id: endring.side.id,
    ikon: 'stoffregister',
    tittel: endring.side.navn,
    hvor: deler,
    tid: endring.kl,
    til: stoffadresse(endring.side.stoff, favorittsted(endring.deler)),
  }
}

export function oppgaverad(oppgave: Forsideoppgave): Hendelse {
  return {
    id: oppgave.id,
    ikon: 'oppgaver',
    tittel: oppgave.tittel,
    hvor: hvor(oppgave.gruppe.navn, oppgave.prioritet === 'hoy' ? 'Høy prioritet' : 'Oppgave'),
    tid: oppgave.kl,
    til: gruppeadresse(oppgave.gruppe.id, 'oppgaver', oppgave.id),
  }
}

/** En favorittside: en snarvei, uten tid. */
export function favorittrad(stoff: string, navn: string): Hendelse {
  return { id: stoff, ikon: 'star', tittel: navn, hvor: 'Favoritt', til: stoffadresse(stoff) }
}
