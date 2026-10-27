/**
 * Preparatene i FEST for virkestoffene i switchtabellene, ordnet etter
 * formulering: peroral, peroral med modifisert frisetting, injeksjon,
 * depotinjeksjon osv.
 *
 * Brukes av skriptet som lager `src/data/verktoy/fest-formuleringer.json` fra
 * en FEST-fil, og av testene. Appen leser FEST fra databasen
 * (`docs/legemiddeldata.md`); dette er et øyeblikksbilde for kartleggingen i
 * P1 (`docs/verktøy-utviklingsplan.md`), ikke en ny synkronisering.
 *
 * Formuleringen leses av FESTs legemiddelform og administrasjonsvei. FEST skiller
 * ikke en esterdepot fra en vanlig injeksjon i formen eller styrken: Haldol
 * Depot og Haldol inj er begge «Injeksjonsvæske, oppløsning» med styrken på
 * haloperidol. Slike preparater får formuleringen sin fra en uttrykkelig
 * overstyring i kartleggingen (`festoverstyringer`), aldri av navnet alene.
 */
import type { Festpost, Kode, Merkevaredata, Pakningsdata, Styrkedata, Virkestoffdata } from '../legemiddeldata/fest'

export const FORMULERINGSKLASSER = {
  peroral: 'Peroral, vanlig frisetting',
  peroral_modifisert: 'Peroral, modifisert frisetting',
  injeksjon: 'Injeksjon, korttidsvirkende',
  middels_langtidsvirkende: 'Injeksjon, middels langtidsvirkende (MA)',
  depotinjeksjon: 'Depotinjeksjon (LA)',
  annen: 'Annen administrasjonsform',
} as const

export type Formuleringsklasse = keyof typeof FORMULERINGSKLASSER

export type Markedsstatus = 'markedsfort' | 'midlertidig_utgatt' | 'avregistrert' | 'ikke_markedsfort' | 'uten_pakning'

/** Formuleringen etter FESTs form og vei, før overstyringene. */
export function formuleringsklasse(legemiddelform: string | null, veier: readonly string[]): Formuleringsklasse {
  const form = (legemiddelform ?? '').toLowerCase()
  if (form.includes('depotinjeksjon')) return 'depotinjeksjon'
  if (veier.includes('Oral bruk')) {
    return /^(depot|entero)|modifisert frisetting/.test(form) ? 'peroral_modifisert' : 'peroral'
  }
  if (veier.some((v) => /intramuskulær|intravenøs|subkutan/i.test(v))) return 'injeksjon'
  return 'annen'
}

/**
 * Den beste statusen blant pakningene, på en gitt dag: én pakning på markedet
 * holder. Datoene i FEST er inklusive.
 */
export function markedsstatus(pakninger: readonly Pakningsdata[], dag: string): Markedsstatus {
  if (pakninger.length === 0) return 'uten_pakning'
  const per = (p: Pakningsdata): Markedsstatus => {
    if (p.avregistrert_dato && p.avregistrert_dato.slice(0, 10) <= dag) return 'avregistrert'
    if (p.midlertidig_utgatt_dato && p.midlertidig_utgatt_dato.slice(0, 10) <= dag) return 'midlertidig_utgatt'
    if (p.markedsforingsdato && p.markedsforingsdato.slice(0, 10) <= dag) return 'markedsfort'
    return 'ikke_markedsfort'
  }
  const rang: Markedsstatus[] = ['markedsfort', 'midlertidig_utgatt', 'ikke_markedsfort', 'avregistrert']
  return rang.find((r) => pakninger.some((p) => per(p) === r)) ?? 'avregistrert'
}

export interface Festoverstyring {
  virkestoff: string
  varenavn: string
  klasse: Formuleringsklasse
  grunn: string
}

export interface Festpreparat {
  /** Merkevarens ID i FEST. */
  id: string
  varenavn: string
  navn_form_styrke: string
  legemiddelform: Kode | null
  administrasjonsveier: string[]
  preparattype: string | null
  atc: string | null
  /** Andre virkestoff i et kombinasjonspreparat. */
  kombinert_med: string[]
  klasse: Formuleringsklasse
  /** Grunnen når klassen er overstyrt. */
  overstyrt: string | null
  marked: Markedsstatus
}

export interface Festvirkestoff {
  /** Nøkkelen i kartleggingen. */
  nokkel: string
  id: string
  navn: string | null
  navn_engelsk: string | null
  salter: { id: string; navn: string; navn_engelsk: string | null }[]
  preparater: Festpreparat[]
}

export interface Festformuleringer {
  /** `HentetDato` i FEST-filen, som også er dagen markedsstatusen gjelder. */
  fest_hentet: string | null
  /** Filen og når DMP sist endret den (`Last-Modified`). */
  fil: string
  fil_endret: string | null
  virkestoffer: Festvirkestoff[]
}

/**
 * Samler preparatene for virkestoffene (moderstoff-ID-er i FEST) fra postene i
 * en FEST-fil. Et preparat hører til virkestoffet når en av styrkene eller
 * virkestoffene uten styrke peker på moderstoffet eller et av saltene.
 */
export async function lagFestformuleringer(
  poster: AsyncIterable<Festpost>,
  virkestoffer: readonly { nokkel: string; fest_id: string }[],
  overstyringer: readonly Festoverstyring[],
  fil: { navn: string; endret: string | null; hentetDato: () => string | null },
): Promise<Festformuleringer> {
  const vs = new Map<string, Virkestoffdata>()
  const styrker = new Map<string, Styrkedata>()
  const merkevarer = new Map<string, Merkevaredata>()
  const pakninger = new Map<string, Pakningsdata[]>()
  for await (const p of poster) {
    if (p.entitet === 'virkestoff') vs.set(p.fest_id, p.data as Virkestoffdata)
    else if (p.entitet === 'virkestoff_styrke') styrker.set(p.fest_id, p.data as Styrkedata)
    else if (p.entitet === 'merkevare') merkevarer.set(p.fest_id, p.data as Merkevaredata)
    else if (p.entitet === 'pakning') {
      const pk = p.data as Pakningsdata
      for (const m of pk.merkevarer) pakninger.set(m, [...(pakninger.get(m) ?? []), pk])
    }
  }
  const hentet = fil.hentetDato()
  const dag = (hentet ?? new Date().toISOString()).slice(0, 10)

  const moder = new Map<string, string>()
  for (const [id, v] of vs) for (const s of v.salter) moder.set(s, id)
  const tilModer = (id: string) => moder.get(id) ?? id

  const per = new Map<string, { id: string; data: Merkevaredata; virkestoff: Set<string> }[]>()
  for (const [id, m] of merkevarer) {
    const alle = new Set([
      ...m.virkestoff_med_styrke.map((s) => styrker.get(s)?.virkestoff_id).filter((v): v is string => !!v),
      ...m.virkestoff_uten_styrke,
    ].map(tilModer))
    for (const v of alle) per.set(v, [...(per.get(v) ?? []), { id, data: m, virkestoff: alle }])
  }

  return {
    fest_hentet: hentet,
    fil: fil.navn,
    fil_endret: fil.endret,
    virkestoffer: virkestoffer.map(({ nokkel, fest_id }) => {
      const v = vs.get(fest_id)
      return {
        nokkel,
        id: fest_id,
        navn: v?.navn ?? null,
        navn_engelsk: v?.navn_engelsk ?? null,
        salter: (v?.salter ?? [])
          .map((s) => ({ id: s, navn: vs.get(s)?.navn ?? '', navn_engelsk: vs.get(s)?.navn_engelsk ?? null }))
          .sort((a, b) => a.navn.localeCompare(b.navn, 'nb') || a.id.localeCompare(b.id)),
        preparater: (per.get(fest_id) ?? [])
          .map(({ id, data: m, virkestoff }) => {
            const veier = m.administrasjonsveier.map((k) => k.tekst)
            const o = overstyringer.find((x) => x.virkestoff === nokkel && x.varenavn === m.varenavn)
            return {
              id,
              varenavn: m.varenavn,
              navn_form_styrke: m.navn_form_styrke,
              legemiddelform: m.legemiddelform,
              administrasjonsveier: veier,
              preparattype: m.preparattype?.tekst ?? null,
              atc: m.atc?.kode ?? null,
              kombinert_med: [...virkestoff].filter((x) => x !== fest_id).map((x) => vs.get(x)?.navn ?? x).sort(),
              klasse: o?.klasse ?? formuleringsklasse(m.legemiddelform?.tekst ?? null, veier),
              overstyrt: o?.grunn ?? null,
              marked: markedsstatus(pakninger.get(id) ?? [], dag),
            }
          })
          .sort((a, b) => a.navn_form_styrke.localeCompare(b.navn_form_styrke, 'nb') || a.id.localeCompare(b.id)),
      }
    }),
  }
}
