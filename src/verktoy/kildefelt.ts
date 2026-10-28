/**
 * De offentlige datasettene fra Psychiatrienet (P1 og P3 i
 * `docs/verktøy-utviklingsplan.md`) og feltene hvert av dem har lov til å ha.
 *
 * Psychiatrienet gir ingen lisens til tekstene, og repoet er offentlig
 * (`docs/verktøy-p3-rettigheter.md`). Datasettene skal derfor bare ha koder,
 * legemiddelnavn, sidetitler, adresser, tidspunkter, tall og kontrollsummer,
 * aldri en setning, overskrift, fotnote, lenketekst eller lenketittel fra
 * kilden. Listen er fullstendig: et felt som ikke står her, er ikke tillatt,
 * og et nytt felt må legges til med vilje etter en vurdering mot
 * rettighetsnotatet. Skriptene kontrollerer dataene før de skriver
 * (`kontrollerKildefelt`), og testene kontrollerer filene i repoet.
 */

/** Hva slags verdi et felt kan ha. `navn` er en kode, et legemiddelnavn eller en sidetittel, aldri en setning. */
export type Verdiform = 'tall' | 'tid' | 'sha' | 'adresse' | 'lenke' | 'kode' | 'navn' | 'egen'

export const VERDIFORMER: Record<Verdiform, (x: unknown) => boolean> = {
  tall: (x) => typeof x === 'number' && Number.isInteger(x),
  tid: (x) => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(x),
  sha: (x) => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x),
  adresse: (x) => typeof x === 'string' && /^https?:\/\/([a-z]+\.)?psychiatrienet\.nl\/\S*$/.test(x),
  // Også kildens egne lenker til wikien, f.eks. til en side som ikke finnes.
  lenke: (x) => typeof x === 'string' && /^(\/|https?:\/\/([a-z]+\.)?psychiatrienet\.nl\/)\S+$/.test(x),
  kode: (x) => typeof x === 'string' && /^[A-Za-z_]{1,40}$/.test(x),
  // Kort og uten setningsskille.
  navn: (x) => typeof x === 'string' && x.length <= 60 && !/[.:;!?](\s|$)/.test(x),
  // Våre egne felt (beskrivelsen av arkivet) og objekter som kan være `null`.
  egen: () => true,
}

type Feltliste = Record<string, Verdiform>

/** Feltene i en switchtabell (`Switchtabell` uten identitet og revisjon) under `p`. */
const tabellfelt = (p: string): Feltliste => ({
  [`${p}.radetikett`]: 'navn',
  [`${p}.kolonneetikett`]: 'navn',
  [`${p}.rader[].kode`]: 'kode',
  [`${p}.rader[].navn`]: 'navn',
  [`${p}.kolonner[].kode`]: 'kode',
  [`${p}.kolonner[].navn`]: 'navn',
  [`${p}.grupper[].navn`]: 'navn',
  [`${p}.grupper[].href`]: 'lenke',
  [`${p}.grupper[].medlemmer[].navn`]: 'navn',
  [`${p}.grupper[].medlemmer[].href`]: 'lenke',
  [`${p}.celler[].rad`]: 'kode',
  [`${p}.celler[].kolonne`]: 'kode',
  [`${p}.celler[].type`]: 'kode',
  [`${p}.celler[].href`]: 'lenke',
})

/** Hvert offentlige kildedatasett i `src/data/verktoy/` og feltene det kan ha. */
export const KILDEFELT = {
  /** P1: de tre switchtabellene (`npm run verktoy:kartlegging -- tabeller`). */
  'psychiatrienet-tabeller.json': {
    hentet: 'tid',
    'tabeller[].id': 'kode',
    'tabeller[].url': 'adresse',
    'tabeller[].sha256': 'sha',
    'tabeller[].revisjon': 'tall',
    'tabeller[].lagret': 'tid',
    ...tabellfelt('tabeller[]'),
  },
  /** P1: om hver lenket side finnes (`npm run verktoy:kartlegging -- lenker`). */
  'psychiatrienet-lenker.json': {
    hentet: 'tid',
    'sider[].href': 'lenke',
    'sider[].status': 'tall',
    'sider[].endelig': 'adresse',
    'sider[].overskrift': 'navn',
    'sider[].revisjon': 'tall',
    'sider[].lagret': 'tid',
  },
  /** P3: kildearkivet (`npm run verktoy:kildeimport -- hent`). */
  'psychiatrienet-kildearkiv.json': {
    om: 'egen',
    'uttrekk[].nr': 'tall',
    'uttrekk[].startet': 'tid',
    'uttrekk[].ferdig': 'tid',
    'uttrekk[].leser': 'tall',
    'tabeller[].tabell': 'kode',
    'tabeller[].url': 'adresse',
    'tabeller[].hentet': 'tid',
    'tabeller[].sha256': 'sha',
    'tabeller[].revisjon': 'tall',
    'tabeller[].lagret': 'tid',
    'tabeller[].forst_sett': 'tall',
    'tabeller[].sist_sett': 'tall',
    ...tabellfelt('tabeller[]'),
    'sider[].href': 'lenke',
    'sider[].url': 'adresse',
    'sider[].hentet': 'tid',
    'sider[].status': 'tall',
    'sider[].endelig': 'adresse',
    'sider[].leser': 'tall',
    'sider[].forst_sett': 'tall',
    'sider[].sist_sett': 'tall',
    'sider[].innhold': 'egen',
    'sider[].innhold.overskrift': 'navn',
    'sider[].innhold.revisjon': 'tall',
    'sider[].innhold.lagret': 'tid',
    'sider[].innhold.sha256_side': 'sha',
    'sider[].innhold.sha256_anbefaling': 'sha',
    'sider[].innhold.sidetype': 'kode',
    'sider[].innhold.retning': 'egen',
    'sider[].innhold.retning.fra': 'navn',
    'sider[].innhold.retning.til': 'navn',
    'sider[].innhold.avsnitt[]': 'kode',
    'sider[].innhold.legemidler[].navn': 'navn',
    'sider[].innhold.legemidler[].href': 'lenke',
    'sider[].innhold.legemidler[].medlemmer[].navn': 'navn',
    'sider[].innhold.legemidler[].medlemmer[].href': 'lenke',
    'sider[].innhold.undertabell': 'egen',
    ...tabellfelt('sider[].innhold.undertabell'),
  },
} satisfies Record<string, Feltliste>

export type Kildedatasett = keyof typeof KILDEFELT

/**
 * Feltene i `x` som ikke står i `felt`, eller har en verdi av feil form.
 * `sti` er hvor `x` ligger i datasettet (`''` for hele datasettet); et
 * element i en liste har stien til listen med `[]`.
 */
export function feltfeil(felt: Feltliste, x: unknown, sti = '', feil: string[] = []): string[] {
  if (Array.isArray(x)) x.forEach((y) => feltfeil(felt, y, `${sti}[]`, feil))
  else if (x && typeof x === 'object') for (const [n, y] of Object.entries(x)) feltfeil(felt, y, sti ? `${sti}.${n}` : n, feil)
  else if (!felt[sti]) feil.push(`${sti}: ikke et tillatt felt`)
  else if (x !== null && !VERDIFORMER[felt[sti]](x)) feil.push(`${sti}: ${JSON.stringify(x).slice(0, 80)} er ikke ${felt[sti]}`)
  return feil
}

/** Kaster når et datasett har et felt som ikke er tillatt, så det aldri blir skrevet. */
export function kontrollerKildefelt(datasett: Kildedatasett, data: unknown): void {
  const feil = [...new Set(feltfeil(KILDEFELT[datasett], data))]
  if (feil.length > 0) throw new Error(`${datasett} har felt som ikke er tillatt, og er ikke skrevet:\n${feil.slice(0, 20).join('\n')}`)
}
