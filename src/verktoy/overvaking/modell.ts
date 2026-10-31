/**
 * Overvåkingen av kunnskapsgrunnlaget for OUSFAR Verktøy (P12.1 og P12.5 i
 * `docs/verktøy-utviklingsplan.md`, `docs/verktøy-p12-overvaking.md`): hva som
 * er nytt, endret, fjernet eller ikke kunne kontrolleres i kildedokumentene,
 * Psychiatrienets kildeoppføringer og preparatene i FEST, sammenlignet med
 * grunnlaget reglene ble kontrollert mot.
 *
 * Overvåkingen leser bare. Den endrer, godkjenner eller sperrer ingen regel,
 * og den skriver ikke grunnlaget: det endres bare i en PR med ny faglig
 * kontroll, så hver godkjenning fortsatt viser hva den gjaldt.
 */

/** Hvor endringen er funnet. */
export type Funnkilde = 'dokument' | 'psychiatrienet' | 'fest'

export type Funnart = 'ny' | 'endret' | 'fjernet' | 'utilgjengelig'

/**
 * `krever_vurdering`: endringen treffer noe en klinisk godkjent regel bygger
 * på, og regelen må vurderes på nytt før den brukes videre. `informativ`:
 * endringen er registrert, men berører ingen godkjent regel, eller sier ikke
 * noe om innholdet (en kilde som ikke svarte).
 */
export type Funnniva = 'informativ' | 'krever_vurdering'

/**
 * Prioriteten til et funn som krever vurdering (`docs/verktøy-p12-regelforvaltning.md`
 * §5 punkt 3). `hoy`: kan være en reell sikkerhetsrisiko, som en kilde eller et
 * preparat som er borte, en styrke eller form i det godkjente omfanget som er
 * endret, eller en endret anbefaling i kildeoppføringen regelen sammenlignes
 * med. `vanlig`: en endret kontrollsum for et kildedokument, uten at det er
 * påvist hva som er endret.
 */
export type Funnprioritet = 'hoy' | 'vanlig'

/** En klinisk godkjent regelversjon et funn kan berøre, med fingeravtrykket godkjenningen gjelder. */
export interface Berort {
  regelsett: string
  regel: string
  versjon: number
  fingeravtrykk: string
  /** Hva i regelen funnet treffer. */
  hvorfor: string
}

export interface Overvakingsfunn {
  /** Stabil nøkkel: samme funn har samme id fra kjøring til kjøring. */
  id: string
  kilde: Funnkilde
  art: Funnart
  niva: Funnniva
  /** Kildens, oppføringens eller preparatets id. */
  objekt: string
  /** Hva det er, i klartekst: tittel, virkestoff og retning, preparatnavn. Aldri kildetekst. */
  etikett: string
  /** Hva som er endret, ett punkt per forhold. Aldri kildetekst. */
  detaljer: string[]
  berorte: Berort[]
  /** Bare for et funn som krever vurdering. */
  prioritet?: Funnprioritet
}

/** Hva en del av overvåkingen sammenlignet med, og om den ble kjørt. */
export interface Grunnlagsdel {
  kilde: Funnkilde
  kjort: boolean
  /** Hva som ble sammenlignet, i klartekst. */
  beskrivelse: string
  /** Antall objekter som ble kontrollert. */
  kontrollert: number
}

export interface Overvakingsrapport {
  versjon: 1
  kjort_kl: string
  grunnlag: Grunnlagsdel[]
  funn: Overvakingsfunn[]
  /** Det som stoppet en del av kontrollen; da er den delen ikke kontrollert. */
  feil: string[]
  /** En prøvekjøring med bare det syntetiske funnet, som prøver varslingen i appen. */
  provesak?: boolean
}

export const ARTTEKST: Record<Funnart, string> = { ny: 'ny', endret: 'endret', fjernet: 'fjernet', utilgjengelig: 'kunne ikke kontrolleres' }

export const NIVATEKST: Record<Funnniva, string> = { informativ: 'informativ', krever_vurdering: 'krever ny faglig vurdering' }

export const KILDETEKST: Record<Funnkilde, string> = { dokument: 'Kildedokument', psychiatrienet: 'Psychiatrienet', fest: 'FEST' }

/** Nivået et funn får: krever vurdering når det berører en godkjent regel og sier noe om innholdet. */
export const nivaFor = (art: Funnart, berorte: readonly Berort[], vesentlig = true): Funnniva =>
  art !== 'utilgjengelig' && vesentlig && berorte.length > 0 ? 'krever_vurdering' : 'informativ'

export const PRIORITETSTEKST: Record<Funnprioritet, string> = { hoy: 'høy', vanlig: 'vanlig' }

/** Prioriteten et funn som krever vurdering, får; et informativt funn har ingen. */
export const prioritetFor = (f: Pick<Overvakingsfunn, 'niva' | 'kilde' | 'art'>): Funnprioritet | undefined =>
  f.niva !== 'krever_vurdering' ? undefined : f.kilde === 'dokument' && f.art === 'endret' ? 'vanlig' : 'hoy'

/** Funnene som krever vurdering først, så etter kilde og id, så rapporten og avtrykket er stabile. */
export function sorterFunn(funn: readonly Overvakingsfunn[]): Overvakingsfunn[] {
  const niva: Record<Funnniva, number> = { krever_vurdering: 0, informativ: 1 }
  const kilde: Record<Funnkilde, number> = { dokument: 0, psychiatrienet: 1, fest: 2 }
  return [...funn].sort((a, b) => niva[a.niva] - niva[b.niva] || kilde[a.kilde] - kilde[b.kilde] || a.id.localeCompare(b.id))
}
