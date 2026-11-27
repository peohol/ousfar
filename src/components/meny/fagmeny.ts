import { STOFFREGISTERADRESSE, stoffadresse, verktoyadresse, type Rute } from '../../domain/rute'
import type { Registerkategori, Registerstoff, Stoffregister } from '../../domain/stoffregister'
import { navnenokkel } from '../../domain/sokenavn'
import { begynnerOrd, navneord } from '../../faginnhold/sok'
import type { Favoritter } from '../../favoritter/Favorittkilde'
import type { Verktoy } from '../../verktoy/register'
import { kategoriikon } from '../ikon/register'
import type { Menyavsnitt, Menypunkt } from './menytre'

/**
 * «Fag» i hovedmenyen: stoffregisteret, verktøyene og favorittene, bygd av
 * de samme kildene som helsidene (Issue #604). Hvert stoff lenker alltid til
 * fagsiden (`#/stoff/<nøkkel>`), uten laboratoriets analyttkoder: de hører
 * til fortolkningen (`docs/domener.md`).
 */
export interface Fagkilder {
  /** Stoffregisteret med inndelingen i databasen (`byggStoffregister`). */
  register: Stoffregister
  /** `null` uten noen innlogget som kan ha favoritter. */
  favoritter: Favoritter | null
  /** Verktøyene den innloggede skal se; tom for dem som ikke skal se dem (`src/verktoy/synlighet.ts`). */
  verktoy: readonly Verktoy[]
  /** Av lister stoffene i hver kategori i én alfabetisk bolk, uten underkategoriene. */
  visUnderkategorier: boolean
  settVisUnderkategorier: (pa: boolean) => void
  rute: Rute
}

export function fagmeny(k: Fagkilder): Menypunkt {
  return {
    id: 'fag',
    navn: 'Fag',
    ikon: 'fag',
    undermeny: { navn: 'Fag', avsnitt: [{ id: 'fag', punkter: [stoffregistermeny(k), verktoymeny(k), favorittmeny(k)] }] },
  }
}

const antall = (n: number) => ({ merke: String(n), merkeetikett: n === 1 ? '1 stoff' : `${n} stoffer` })

function stoffpunkt(stoff: Registerstoff, rute: Rute): Menypunkt {
  return {
    id: stoff.slug,
    navn: stoff.navn,
    adresse: stoffadresse(stoff.slug),
    gjeldende: rute.side === 'stoff' && rute.stoff === stoff.slug,
  }
}

function stoffregistermeny(k: Fagkilder): Menypunkt {
  return {
    id: 'stoffregister',
    navn: 'Stoffregister',
    ikon: 'stoffregister',
    undermeny: {
      navn: 'Stoffregister',
      sok: { etikett: 'Søk i stoffregisteret', finn: (sporring) => stoffsok(k, sporring), ingenTreff: 'Ingen stoffer passer med søket.' },
      avsnitt: [
        {
          id: 'helside',
          punkter: [
            {
              id: 'hele',
              navn: 'Hele stoffregisteret',
              ikon: 'helside',
              adresse: STOFFREGISTERADRESSE,
              gjeldende: k.rute.side === 'stoffregister',
            },
          ],
        },
        { id: 'kategorier', overskrift: 'Stoffkategorier', punkter: k.register.kategorier.map((kat) => kategoripunkt(kat, k)) },
      ],
    },
  }
}

/** En kategori, med stoffene i den, og underkategoriene som mellomoverskrifter når de vises. */
function kategoripunkt(kategori: Registerkategori, k: Fagkilder): Menypunkt {
  const under = k.visUnderkategorier ? kategori.underkategorier : []
  // Står noen stoffer direkte i kategorien ved siden av underkategoriene, står
  // de først, uten overskrift.
  const iUnder = new Set(under.flatMap((u) => u.stoffer.map((s) => s.slug)))
  const direkte = under.length > 0 ? kategori.stoffer.filter((s) => !iUnder.has(s.slug)) : kategori.stoffer
  const avsnitt: Menyavsnitt[] = [
    { id: 'direkte', punkter: direkte.map((s) => stoffpunkt(s, k.rute)) },
    ...under.map((u) => ({ id: u.id, overskrift: u.navn, punkter: u.stoffer.map((s) => stoffpunkt(s, k.rute)) })),
  ]
  return {
    id: kategori.id,
    navn: kategori.navn,
    ikon: kategoriikon(kategori.ikon),
    ...antall(kategori.stoffer.length),
    undermeny: {
      navn: kategori.navn,
      avsnitt,
      bryter:
        kategori.underkategorier.length > 0
          ? { navn: 'Vis underkategorier', pa: k.visUnderkategorier, onEndre: k.settVisUnderkategorier }
          : undefined,
    },
  }
}

/**
 * Stoffene et søk finner på navnet eller et annet navn (alias): hvert ord i
 * søket må være begynnelsen på et ord i det, med søk og navn delt likt på
 * bindestrek, komma og andre skilletegn ({@link navneord}). Som i fagsøket
 * treffer søket også når navnenøkkelen til navnet begynner med søkets, så
 * «THCCOOH», «kvetiapin» og «Δ9-THC» finner det samme som «THC-COOH»,
 * «quetiapin» og «delta-9-THC». Treff på navnet står først, og et treff på et
 * annet navn viser det navnet ved siden av.
 */
export function stoffsok(k: Pick<Fagkilder, 'register' | 'rute'>, sporring: string): Menyavsnitt[] {
  const ord = navneord(sporring)
  if (ord.length === 0) return []
  const nokkel = navnenokkel(sporring)
  const passer = (navn: string) => begynnerOrd(ord, navn) || (nokkel !== '' && navnenokkel(navn).startsWith(nokkel))
  const paNavn: Menypunkt[] = []
  const paAlias: Menypunkt[] = []
  for (const stoff of k.register.stoffer) {
    const vist = k.register.menystoff(stoff.slug)
    if (!vist) continue
    if (passer(stoff.navn)) paNavn.push(stoffpunkt(vist, k.rute))
    else {
      const alias = stoff.aliaser.find(passer)
      if (alias) paAlias.push({ ...stoffpunkt(vist, k.rute), hint: alias })
    }
  }
  const punkter = [...paNavn, ...paAlias]
  return punkter.length > 0 ? [{ id: 'treff', punkter }] : []
}

function verktoymeny(k: Fagkilder): Menypunkt {
  const { rute } = k
  return {
    id: 'verktoy',
    navn: 'Verktøy',
    ikon: 'verktoy',
    vis: k.verktoy.length > 0,
    undermeny: {
      navn: 'Verktøy',
      avsnitt: [
        {
          id: 'oversikt',
          punkter: [
            {
              id: 'oversikt',
              navn: 'Verktøyoversikten',
              ikon: 'helside',
              adresse: verktoyadresse(),
              gjeldende: rute.side === 'verktoy' && !rute.verktoy,
            },
          ],
        },
        {
          id: 'verktoyene',
          overskrift: 'Verktøyene',
          punkter: k.verktoy.map((v) => ({
            id: v.id,
            navn: v.navn,
            ikon: v.ikon,
            beskrivelse: v.beskrivelse,
            adresse: verktoyadresse(v.id),
            gjeldende: rute.side === 'verktoy' && rute.verktoy === v.id,
          })),
        },
      ],
    },
  }
}

/** Et stoff registeret ikke kjenner (lenger), med nøkkelen som navn, så det fortsatt kan fjernes. */
const ukjentStoff = (slug: string): Registerstoff => ({ slug, navn: slug, side: false, innhold: false })

/**
 * Brukerens favoritter, alfabetisk, hver med en knapp som fjerner den. En
 * fagside i papirkurven står ikke her; hentes den tilbake, er den her igjen.
 */
function favorittmeny(k: Fagkilder): Menypunkt {
  const { favoritter, register } = k
  const stoffer = (favoritter?.stoffer ?? [])
    .filter((slug) => register.status(slug) !== 'papirkurv')
    .map((slug) => register.menystoff(slug) ?? ukjentStoff(slug))
    .sort((a, b) => a.navn.localeCompare(b.navn, 'nb'))
  return {
    id: 'favoritter',
    navn: 'Favoritter',
    ikon: 'star',
    vis: favoritter !== null,
    ...antall(stoffer.length),
    undermeny: {
      navn: 'Favoritter',
      tomt: 'Trykk på stjernen på en fagside for å legge den til her.',
      avsnitt: [
        {
          id: 'favoritter',
          punkter: stoffer.map((s) => ({
            ...stoffpunkt(s, k.rute),
            tillegg: { etikett: `Fjern ${s.navn} fra favoritter`, ikon: 'close', handling: () => favoritter?.sett(s.slug, false) },
          })),
        },
      ],
    },
  }
}
