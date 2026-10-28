/**
 * Rapporten om testtilfellene for doseplanmotoren
 * (`docs/verktøy-p5-testtilfeller.md`), laget av de syntetiske dataene og
 * motoren så den aldri kan avvike fra dem. `npm run verktoy:regler --
 * motorrapport` skriver den; testene sier fra når den ikke er oppdatert. Den
 * er grunnlaget for den faglige kontrollen av testtilfellene (P5.10).
 */
import { beregn, kortform } from '../regler/beregning'
import { FORMULERINGSKLASSER } from '../festformuleringer'
import { byggesteiner, DOSEENHETER, MARKEDSSTATUS, norskDato } from './byggesteiner'
import { MAKS_DRAPER, MAKS_ENHETER, MAKS_STYRKER } from './dosevalg'
import { beregnDoseplan, PLANMOTORVERSJON, planform, preparatliste } from './plan'
import { ALLE_TESTPREPARATER, OMGIVELSE, syntetiskGrunnlag, TESTTILFELLER, type Testtilfelle } from './syntetisk'

export const MOTORRAPPORTFIL = 'docs/verktøy-p5-testtilfeller.md'

const celle = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ')
const tabell = (hode: string[], rader: string[][]) =>
  [`| ${hode.join(' | ')} |`, `| ${hode.map(() => '---').join(' | ')} |`, ...rader.map((r) => `| ${r.map(celle).join(' | ')} |`)].join('\n')
const liste = (xs: string[], ingen = '- Ingen.') => (xs.length > 0 ? xs.map((x) => `- ${x}`).join('\n') : ingen)
const tall = (x: number) => String(x).replace('.', ',')

/** Hvert forløp med linjene, eller stoppgrunnene. */
const linjer = (form: Record<string, string[]>) =>
  Object.entries(form)
    .map(([id, xs]) => `*${id === 'stopp' ? 'Stopper' : id}:*\n\n${liste(xs)}`)
    .join('\n\n')

function tilfelle(t: Testtilfelle): string {
  const g = syntetiskGrunnlag(t.preparater, t.fest)
  const omgivelse = t.omgivelse ?? OMGIVELSE
  const r = beregnDoseplan(t.regel, t.inndata, g, omgivelse)
  const { formvalg, godkjenningsfritak, ...rest } = t.inndata
  const inndata = [
    `startdose ${tall(rest.startdose_mg)} mg`,
    rest.maldose_mg !== undefined && `måldose ${tall(rest.maldose_mg)} mg`,
    rest.startdato && `startdato ${rest.startdato}`,
    godkjenningsfritak && 'godkjenningsfritak valgt',
    formvalg && `valg: ${Object.entries(formvalg).map(([f, v]) => `${f} ${[v.klasse, ...(v.legemiddelformer ?? []), ...(v.preparater ?? []).map((p) => p.replace('ID_SYNTETISK-', ''))].filter(Boolean).join(', ')}`).join('; ')}`,
  ].filter(Boolean)
  const ideell = beregn(t.regel, t.inndata)
  const deler = [
    `### ${t.id}`,
    t.beskrivelse,
    `*Kontrollerer:* ${t.kontrollerer}. *Regel:* ${t.regel.tittel}. *Inndata:* ${inndata.join(', ')}. *Preparatstatus:* ${omgivelse.idag}.`,
    `**Ideell kurve (P4):**\n\n${linjer(kortform(ideell))}`,
    `**Doseplan:**\n\n${linjer(planform(r))}`,
  ]
  if (r.status === 'doseplan') {
    deler.push(`**Avvik fra den ideelle kurven:**\n\n${liste(r.avvik)}`)
    deler.push(`**Preparater (FESTs navn, deling):**\n\n${liste(preparatliste(r))}`)
    const begrensninger = [...new Set(r.forlop.flatMap((f) => f.begrensninger))]
    deler.push(`**Begrensninger (preparater som ikke brukes):**\n\n${liste(begrensninger)}`)
    deler.push(`**Klinisk:** nei. ${r.sperre.join(' ')}`)
  }
  return deler.join('\n\n')
}

export function lagMotorrapport(): string {
  const preparater = (['testoksetin', 'testazapin', 'testperidon'] as const).flatMap((v) =>
    byggesteiner(syntetiskGrunnlag(ALLE_TESTPREPARATER), v, OMGIVELSE.idag).map((b) => [
      v,
      b.navn_form_styrke,
      FORMULERINGSKLASSER[b.klasse],
      b.mg === null || b.doseenhet === null ? '–' : `${tall(Number(b.mg.toFixed(4)))} mg per ${DOSEENHETER[b.doseenhet].en}`,
      b.mg === null ? '–' : b.deling_grunnlag,
      b.registrering === 'annen' ? (b.preparattype ?? 'annen') : b.registrering,
      MARKEDSSTATUS[b.marked] + (b.marked_til ? `, til ${norskDato(b.marked_til)}` : ''),
      b.begrensninger.join('; ') || '–',
    ]),
  )
  return `# OUSFAR Verktøy – P5: testtilfeller for doseplanmotoren

**Laget av \`src/verktoy/motor/rapport.ts\`; ikke rediger for hånd.** Lag den på nytt med \`npm run verktoy:regler -- motorrapport\`. Doseplanmotor ${PLANMOTORVERSJON}. Bakgrunnen står i \`docs/verktøy-p5-beregningsmotor.md\`.

**Alt her er syntetisk.** Virkestoffene (testoksetin, testazapin, testperidon), preparatene og reglene finnes ikke og har ingen klinisk betydning. De er laget for å prøve motoren ved grenseverdiene: deling, formuleringer og former, godkjenningsfritak, avregistrering, toleranse, dosegrenser, utvasking, depot og datoer. Ingen av P4s pilotregler er brukt eller godkjent, og ingen plan her er klinisk. Hvert tilfelle kontrolleres av \`src/__tests__/verktoymotor.test.ts\`.

Søket bruker høyst ${MAKS_STYRKER} styrker og ${MAKS_ENHETER} tabletter eller kapsler eller ${MAKS_DRAPER} dråper per døgndose (en praktisk ramme, ikke en klinisk grense).

## Testpreparatene

Slik motoren leser dem (\`byggesteiner.ts\`), med status ${OMGIVELSE.idag}.

${tabell(['Virkestoff', 'Preparat', 'Formulering', 'Styrke', 'Deling', 'Registrering', 'Marked', 'Begrensninger'], preparater)}

## Tilfellene

${TESTTILFELLER.map(tilfelle).join('\n\n')}
`
}
