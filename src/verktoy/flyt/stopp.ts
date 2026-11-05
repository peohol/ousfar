/**
 * Korte forklaringer når en plan ikke kan lages (§5 i
 * `docs/verktøy-brukervennlighet-2026-11.md`): hva som mangler, om det kan
 * løses i verktøyet eller må vurderes individuelt, og kilden når den er kjent.
 * Motorens egen tekst følger med som `detalj`, så ingenting går tapt, men
 * klinikeren ser først en setning uten interne begreper (P9).
 *
 * Kodene kommer fra motoren (`Doseplanresultat.stoppkoder`, tråd B). Til de
 * finnes, klassifiseres de faste innledningene i motorens stoppgrunner
 * ({@link klassifiser}); en grunn som ikke kjennes igjen, blir `annet` med
 * motorens tekst, aldri borte.
 */
import { KOMPLETT_IKKE_TILGJENGELIG, UTENFOR_OMFANG, type Doseplanresultat } from '../motor/plan'
import { kildeFor } from '../regler/kilder'
import type { Grunnlag, Regel } from '../regler/modell'
import { SPERRET } from '../sperrer'
import { INDIVIDUELT, UNNTAK_STANDARD, type Flytoppsett } from './flyt'
import type { Stoppforklaring, Stoppkode, Stoppkodenavn } from './typer'

/** Kodene med en kort forklaring, handling og om det kan løses i verktøyet. */
export const FORKLARINGER: Record<Stoppkodenavn, Omit<Stoppforklaring, 'kode'>> = {
  unntak_gjelder: { tekst: UNNTAK_STANDARD, losning: 'individuelt' },
  unntak_ukjent: { tekst: 'Et spørsmål om pasienten er ikke avklart.', handling: 'Svar på spørsmålet.', losning: 'i_verktoyet' },
  sporsmal_ubesvart: { tekst: 'Et spørsmål om pasienten er ikke besvart.', handling: 'Svar på spørsmålet.', losning: 'i_verktoyet' },
  bekreftelse_mangler: { tekst: 'En forutsetning for planen er ikke bekreftet.', handling: 'Bekreft forutsetningen, eller vurder om regelen passer.', losning: 'i_verktoyet' },
  begrunnelse_trengs: { tekst: 'Svaret eller dosen krever en skriftlig begrunnelse.', handling: 'Skriv begrunnelsen.', losning: 'i_verktoyet' },
  dose_utenfor: { tekst: 'Dosen er utenfor det regelen gjelder for.', handling: 'Kontroller dosen.', losning: 'individuelt' },
  utenfor_omfang: { tekst: `Det finnes ingen godkjent plan for denne kombinasjonen av dose, legemiddelform og svar. ${INDIVIDUELT}`, losning: 'individuelt' },
  formvalg_trengs: { tekst: 'Legemiddelformen må velges.', handling: 'Velg legemiddelform.', losning: 'i_verktoyet' },
  trinnvalg_trengs: { tekst: 'Dosen for et trinn må velges i planen.', handling: 'Velg dosen ved trinnet.', losning: 'i_verktoyet' },
  valg_ugyldig: { tekst: 'Et dosevalg gjelder ikke lenger.', handling: 'Fjern valget, og velg på nytt.', losning: 'i_verktoyet' },
  ingen_preparater: { tekst: `FEST har ingen norske preparater som kan brukes i hele forløpet. ${INDIVIDUELT}`, losning: 'individuelt' },
  ingen_dose: { tekst: `Dosene i planen kan ikke gis nøyaktig med de norske preparatene i FEST. ${INDIVIDUELT}`, losning: 'individuelt' },
  godkjenningsfritak_trengs: {
    tekst: 'Planen trenger preparater som krever godkjenningsfritak.',
    handling: 'Velg at preparater med godkjenningsfritak kan brukes, hvis det er aktuelt.',
    losning: 'i_verktoyet',
  },
  ikke_komplett: { tekst: `Verktøyet kan ikke lage en komplett plan helt til sluttmålet. ${INDIVIDUELT}`, losning: 'individuelt' },
  ikke_klinisk: { tekst: 'Verktøyet kan ikke vise en klinisk plan nå.', handling: 'Prøv igjen senere.', losning: 'individuelt' },
  sperret: { tekst: SPERRET, losning: 'individuelt' },
  regelfeil: { tekst: `Regelen kan ikke brukes slik den står. ${INDIVIDUELT}`, losning: 'individuelt' },
  annet: { tekst: INDIVIDUELT, losning: 'individuelt' },
}

/** Motorens faste innledninger og formuleringer, i den rekkefølgen de prøves. */
const MONSTRE: [RegExp, Stoppkodenavn][] = [
  [/^Regelen gjelder ikke: /, 'unntak_gjelder'],
  [/^Må avklares før beregning \(ukjent\): /, 'unntak_ukjent'],
  [/^Pasientforholdet «.*» er ukjent for regelen/, 'unntak_ukjent'],
  [/^Må bekreftes før beregning: /, 'bekreftelse_mangler'],
  [/^Må besvares før beregning: /, 'sporsmal_ubesvart'],
  [/krever en skriftlig begrunnelse/, 'begrunnelse_trengs'],
  [new RegExp(`^${KOMPLETT_IKKE_TILGJENGELIG}`), 'ikke_komplett'],
  [/Fjern valget/, 'valg_ugyldig'],
  [/formuleringen må velges|formen må velges/, 'formvalg_trengs'],
  [/Regelen lar forskriveren velge en dose/, 'trinnvalg_trengs'],
  [/kan ikke gis med preparatene|kan ikke gis .*fordeles|ikke i kurvens retning|ingen dose innenfor rammene/, 'ingen_dose'],
  [new RegExp(UTENFOR_OMFANG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'utenfor_omfang'],
  [/godkjenningsfritak, som ikke er valgt/, 'godkjenningsfritak_trengs'],
  [/^FEST har ingen |^Ingen av .* i FEST kan brukes|FEST har ingen brukbar/, 'ingen_preparater'],
  [/^Ingen klinisk doseplan kan vises|FEST-kopien|FEST sist ble kontrollert|vellykket henting av FEST|ikke fra FEST|syntetisk testregel|godkjenningen|godkjent/, 'ikke_klinisk'],
  [/^Regelen er ugyldig|^Verdien .* (mangler|er ugyldig)|^Beregningen ga en ugyldig plan|^Regelen er bare tekstlig|^Det finnes ingen anbefaling/, 'regelfeil'],
  [/må oppgis|må være et positivt tall|er utenfor|er ikke blant|over forsiktighetsgrensen|under forsiktighetsgrensen/, 'dose_utenfor'],
]

/** Koden for en stoppgrunn fra motoren, når motoren ikke har gitt den selv. */
export function klassifiser(tekst: string): Stoppkodenavn {
  return MONSTRE.find(([m]) => m.test(tekst))?.[1] ?? 'annet'
}

/** Betingelsen en stoppgrunn gjelder, etter regelens tekst for den. */
function betingelseFor(r: Regel | undefined, kode: Stoppkodenavn, tekst: string): string | undefined {
  if (!r) return undefined
  const etter = (prefiks: RegExp) => tekst.replace(prefiks, '')
  if (kode === 'unntak_gjelder' || kode === 'unntak_ukjent') return r.unntak.find((u) => etter(/^Regelen gjelder ikke: |^Må avklares før beregning \(ukjent\): /) === u.tekst)?.id
  if (kode === 'bekreftelse_mangler') return r.bekreftelser.find((b) => etter(/^Må bekreftes før beregning: /) === b.tekst)?.id
  if (kode === 'sporsmal_ubesvart') return r.sporsmal?.find((s) => etter(/^Må besvares før beregning: /) === s.tekst)?.id
  return undefined
}

/** Stoppkodene for et resultat: motorens egne når de finnes, ellers klassifisert fra teksten. */
export function stoppkoder(r: Doseplanresultat, regel?: Regel): Stoppkode[] {
  if (r.status !== 'stoppet') return []
  const egne = (r as { stoppkoder?: Stoppkode[] }).stoppkoder
  if (egne && egne.length === r.stoppgrunner.length) return egne
  return r.stoppgrunner.map((tekst) => {
    const kode = klassifiser(tekst)
    const ref = betingelseFor(regel, kode, tekst)
    return { kode, tekst, ...(ref && { ref }) }
  })
}

const grunnlagFor = (r: Regel, ref: string) => [...r.unntak, ...(r.sporsmal ?? []), ...r.bekreftelser].find((x) => x.id === ref)?.grunnlag

/** Kilden for et grunnlag, som titlene på kildene det viser til. */
export function kildetekst(g: Grunnlag | undefined): string | undefined {
  const h = g?.type === 'kilde' ? g.henvisninger : (g?.henvisninger ?? [])
  const titler = [...new Set(h.map((x) => kildeFor(x.kilde)?.tittel).filter((t): t is string => !!t))]
  return titler.length > 0 ? titler.join('; ') : undefined
}

/** Spørsmålet i flyten som avgjør betingelsen, og flytens forklaring for den. */
function iFlyten(oppsett: Flytoppsett | undefined, kode: Stoppkodenavn, ref: string | undefined) {
  const type = kode === 'unntak_gjelder' || kode === 'unntak_ukjent' ? 'unntak' : kode === 'bekreftelse_mangler' ? 'bekreftelse' : kode === 'sporsmal_ubesvart' ? 'sporsmal' : undefined
  const a = type && ref ? oppsett?.avbildninger.find((x) => x.type === type && x.id === ref) : undefined
  return a ? { sporsmal: a.fra[0]?.sporsmal, forklaring: a.forklaring } : undefined
}

/**
 * Forklaringene for et resultat som er stoppet, én per stoppgrunn, med
 * motorens tekst som `detalj`. Like forklaringer slås sammen. Med flyten
 * peker en forklaring på spørsmålet den gjelder, og bruker flytens tekst.
 */
export function stoppforklaringer(r: Doseplanresultat, regel?: Regel, oppsett?: Flytoppsett): Stoppforklaring[] {
  const ut: Stoppforklaring[] = []
  for (const k of stoppkoder(r, regel)) {
    const f = FORKLARINGER[k.kode] ?? FORKLARINGER.annet
    const fly = iFlyten(oppsett, k.kode, k.ref)
    const kilde = regel && k.ref ? kildetekst(grunnlagFor(regel, k.ref)) : undefined
    const forklaring: Stoppforklaring = {
      kode: k.kode,
      tekst: (k.kode === 'unntak_gjelder' && fly?.forklaring) || f.tekst,
      ...(f.handling && { handling: f.handling }),
      ...(f.losning && { losning: f.losning }),
      ...(kilde && { kilde }),
      ...(fly?.sporsmal && { sporsmal: fly.sporsmal }),
      detalj: k.tekst,
    }
    const lik = ut.find((x) => x.kode === forklaring.kode && x.tekst === forklaring.tekst && x.sporsmal === forklaring.sporsmal)
    if (lik) lik.detalj = `${lik.detalj} ${k.tekst}`
    else ut.push(forklaring)
  }
  return ut
}
