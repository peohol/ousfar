/**
 * Flyten med regelens egne tekster: hver betingelse i regelen stilt slik den
 * står, med «Ja», «Nei» og «Ukjent», og hver bekreftelse som en avkrysning.
 * Det er den trygge standarden (S5/S5b i
 * `docs/verktøy-brukervennlighet-2026-11.md`), og den brukes til tråd C sine
 * flytmoduler (`src/verktoy/flyt/`) er på plass; da tar C sin
 * `flyttilstand` over, med katalogen der den er kontrollert.
 *
 * Svarene avbildes til nøyaktig de feltene motoren leser i dag (`svar`,
 * `pasientforhold`, `bekreftet`); «Ukjent» står ikke der, så motoren stopper
 * som for et ubesvart felt (S4).
 */
import type { Planskjema } from '../../verktoy/doseplan'
import type { Flytsporsmal, Flyttilstand, Stoppforklaring, Svaralternativ } from '../../verktoy/flyt/typer'
import { gjeldendeBekreftelser, type Regel } from '../../verktoy/regler/modell'

/** Svarene i flyten: spørsmålets id i flyten → verdien som er valgt. */
export type Flytsvar = Record<string, string>

const JA_NEI_UKJENT: readonly Svaralternativ[] = [
  { verdi: 'ja', tekst: 'Ja' },
  { verdi: 'nei', tekst: 'Nei' },
  { verdi: 'ukjent', tekst: 'Ukjent' },
]

const BEKREFTET: readonly Svaralternativ[] = [{ verdi: 'ja', tekst: 'Bekreftet' }]

/** Det som står ved et pasientforhold som er besvart ja: beregningen gir da ingen plan (`beregning.ts`). */
export const FORHOLD_JA = 'Da lager verktøyet ingen plan. Behandlingen må planlegges individuelt.'

const id = {
  forhold: (x: string) => `forhold:${x}`,
  sporsmal: (x: string) => `sporsmal:${x}`,
  bekreftelse: (x: string) => `bekreftelse:${x}`,
}

const tilBoolsk = (v: string | undefined) => (v === 'ja' ? true : v === 'nei' ? false : undefined)

/** Ja og nei for betingelsene i `ider`, med id-ene i regelen; «Ukjent» og ubesvart står ikke. */
const boolske = (ider: readonly { id: string }[], navn: (x: string) => string, svar: Flytsvar): Record<string, boolean> =>
  Object.fromEntries(
    ider.flatMap((x) => {
      const b = tilBoolsk(svar[navn(x.id)])
      return b === undefined ? [] : [[x.id, b]]
    }),
  )

const sporsmalssvar = (regel: Regel, svar: Flytsvar) => boolske(regel.sporsmal ?? [], id.sporsmal, svar)

/** Svarene avbildet til skjemaet motoren leser; resten av skjemaet står som det er. */
export function tilSkjema(regel: Regel, skjema: Planskjema, svar: Flytsvar): Planskjema {
  const spm = sporsmalssvar(regel, svar)
  return {
    ...skjema,
    svar: spm,
    pasientforhold: boolske(regel.unntak, id.forhold, svar),
    bekreftet: gjeldendeBekreftelser(regel, spm)
      .filter((b) => svar[id.bekreftelse(b.id)] === 'ja')
      .map((b) => b.id),
  }
}

/** Spørsmålene som er synlige med svarene som er gitt, i rekkefølge: forholdene som stopper, spørsmålene, og bekreftelsene til slutt. */
export function flyttilstand(regel: Regel, svar: Flytsvar): Flyttilstand {
  const skjemasvar = sporsmalssvar(regel, svar)
  const valg = (fid: string, tekst: string, gruppe: Flytsporsmal['gruppe'], stopperVed: string[], forklaring?: string): Flytsporsmal => ({
    id: fid,
    tekst,
    gruppe,
    kategori: 'uklassifisert',
    art: 'valg',
    svar: JA_NEI_UKJENT.map((a) => a.verdi),
    alternativer: JA_NEI_UKJENT,
    stopperVed: [...stopperVed, 'ukjent'],
    ...(forklaring && { forklaring }),
    ...(svar[fid] !== undefined && { valgt: svar[fid] }),
  })
  const sporsmal: Flytsporsmal[] = [
    ...regel.unntak.map((u) => valg(id.forhold(u.id), u.tekst, 'stopp', ['ja'], FORHOLD_JA)),
    ...(regel.sporsmal ?? []).map((s) => valg(id.sporsmal(s.id), s.tekst, 'endrer', [])),
    ...gjeldendeBekreftelser(regel, skjemasvar).map(
      (b): Flytsporsmal => ({
        id: id.bekreftelse(b.id),
        tekst: b.tekst,
        gruppe: 'vurdering',
        kategori: 'uklassifisert',
        art: 'avkrysning',
        svar: ['ja'],
        alternativer: BEKREFTET,
        ...(svar[id.bekreftelse(b.id)] === 'ja' && { valgt: 'ja' }),
      }),
    ),
  ]
  const grunner = sporsmal.flatMap((s): Stoppforklaring[] =>
    s.valgt !== undefined && s.stopperVed?.includes(s.valgt)
      ? [
          s.valgt === 'ukjent'
            ? { kode: 'sporsmal_ubesvart', tekst: UKJENT, losning: 'i_verktoyet', sporsmal: s.id }
            : { kode: 'unntak_gjelder', tekst: s.forklaring ?? FORHOLD_JA, losning: 'individuelt', sporsmal: s.id },
        ]
      : [],
  )
  const gjenstar = sporsmal.filter((s) => s.valgt === undefined).length
  return { steg: 'pasient', sporsmal, forutsatt: [], kontroll: { utfall: grunner.length > 0 ? 'kan_ikke' : 'ukjent', grunner, gjenstar } }
}

/** Det som står ved et spørsmål som er besvart «Ukjent». */
export const UKJENT = 'Uten svar her lager verktøyet ingen plan. Avklar dette først, eller planlegg individuelt.'
