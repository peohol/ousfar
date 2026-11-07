/**
 * Inngangen til den nye arbeidsflyten for verktøyene (tråd C i
 * `docs/verktøy-brukervennlighet-2026-11.md`): én funksjon som gir
 * visningen alt den trenger for valgene og svarene som er gjort, og
 * skjemaet med motorfeltene fylt inn fra svarene.
 *
 * Planen selv beregnes fortsatt bare med `beregnPlan` (S1) på
 * {@link Flytutfall.skjema}, og vises bare når den er komplett. Ingenting
 * her viser eller lover en plan (S9).
 */
import { lesDose, type Planskjema } from '../doseplan'
import { komplettfeil, type Regel } from '../regler/modell'
import { medlemFor, REGELSETT, tilgjengelighet } from '../tilgjengelighet'
import { begrensninger, medFlytfelt, vurderFlyt, type Flytgrunnlag, type Flytresultat } from './flyt'
import { forhandskontroll, maldoseMangler, utelukkendeSvar, type Forhandsgrunnlag, type Forhandsresultat } from './forhandskontroll'
import type { Flyttilstand } from './typer'

export interface Flytutfall {
  tilstand: Flyttilstand
  /** Regelen flyten gjelder; mangler før et valg som kan gi en plan er gjort. */
  regel?: Regel
  flyt?: Flytresultat
  kontroll: Forhandsresultat
  /** Skjemaet med `svar`, `pasientforhold` og `bekreftet` fra flytsvarene, og formvalget verktøyet gjør selv (B4). Det er dette `beregnPlan` skal få. */
  skjema?: Planskjema
}

/** Reglene for valget som kan gi en komplett plan, i regelsettets rekkefølge. */
export function reglerMedPlan(g: Pick<Forhandsgrunnlag, 'verktoy' | 'valg' | 'regelsett'>): Regel[] {
  if (!g.valg) return []
  const t = tilgjengelighet(g.verktoy, g.valg, g.regelsett ?? REGELSETT)
  return t.status === 'tilgjengelig' ? t.regler.filter((r) => komplettfeil(r, medlemFor(r, g.valg!)).length === 0) : []
}

/** Skjemaet med svaret på ett spørsmål i flyten; `undefined` fjerner svaret. */
export const medFlytsvar = (s: Planskjema, id: string, verdi: string | undefined): Planskjema => {
  const { [id]: _bort, ...andre } = s.flytsvar ?? {}
  return { ...s, flytsvar: verdi === undefined ? andre : { ...andre, [id]: verdi } }
}

/** Hele flyten for valgene og skjemaet: synlige spørsmål, forhåndskontrollen og skjemaet til beregningen. */
export function flyttilstand(g: Forhandsgrunnlag & { flytgrunnlag?: Flytgrunnlag }): Flytutfall {
  const regel = g.regel ?? reglerMedPlan(g)[0]
  // Svar som alene utelukker en plan med preparatene i FEST, stopper ved spørsmålet (P0 F4).
  const utelukket = regel ? utelukkendeSvar({ ...g, regel }) : []
  const flyt = regel ? vurderFlyt(regel, g.skjema?.flytsvar ?? {}, { beslutninger: g.beslutninger, utelukket, ...g.flytgrunnlag }) : undefined
  const grenser = regel ? begrensninger(regel, utelukket) : []
  const kontroll = forhandskontroll({ ...g, ...(regel && { regel }), ...(flyt && { flyt }) })
  const formvalg = Object.fromEntries(Object.entries(kontroll.formvalg ?? {}).map(([f, v]) => [f, { ...g.skjema?.formvalg[f], legemiddelform: v.legemiddelform }]))
  const skjema = g.skjema && flyt ? medFlytfelt({ ...g.skjema, formvalg: { ...g.skjema.formvalg, ...formvalg } }, flyt.felt) : g.skjema
  const steg: Flyttilstand['steg'] = !g.valg
    ? 'hva'
    : !g.skjema || lesDose(g.skjema.startdose) === undefined || (regel && maldoseMangler(regel, g.skjema))
      ? 'behandling'
      : kontroll.utfall === 'kan_lages_hvis' && kontroll.gjenstar === 0
        ? 'plan'
        : 'pasient'
  return {
    tilstand: {
      steg,
      sporsmal: flyt?.sporsmal ?? [],
      forutsatt: flyt?.forutsatt ?? [],
      kontroll: {
        utfall: kontroll.utfall,
        grunner: kontroll.grunner,
        gjenstar: kontroll.gjenstar,
        ...(kontroll.dosevalg && { dosevalg: kontroll.dosevalg }),
        ...(grenser.length > 0 && kontroll.utfall === 'kan_lages_hvis' && { begrensninger: grenser }),
      },
      ...(flyt?.begrunnelse && { begrunnelse: flyt.begrunnelse }),
      ingenAvDisse: flyt?.ingenAvDisse ?? [],
    },
    ...(regel && { regel }),
    ...(flyt && { flyt }),
    kontroll,
    ...(skjema && { skjema }),
  }
}

export { KAN_LAGES_HVIS, forhandskontroll, utelukkendeSvar, type Forhandsgrunnlag, type Forhandsresultat } from './forhandskontroll'
export { medIngenAvDisse, svarStopper, vurderFlyt, flytoppsett, SAMLET, type Flytresultat } from './flyt'
export { stoppforklaringer, stoppkoder, klassifiser } from './stopp'
export type * from './typer'
