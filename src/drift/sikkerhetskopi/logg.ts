/**
 * Den trygge loggen for kopijobben i drift (`docs/drift-gjenoppretting.md`,
 * «Loggen»). Loggene i GitHub Actions er offentlige for et offentlig repo, og
 * GitHubs maskering skjuler bare hemmeligheter den kjenner, ikke data. Derfor
 * er loggen stengt som utgangspunkt når den er slått på (`aktiverTryggLogg`):
 *
 * - Bare linjer kopijobben selv setter sammen av faste tekster, tall,
 *   tidspunkter og filnavn i lageret (`skriv`, `lagLogg`) slipper gjennom.
 * - Alt annet som skrives til `console` eller rett til stdout og stderr,
 *   forsvinner, også fra biblioteker.
 * - En feil, også en som ikke er fanget, gir bare trinnet den skjedde i og
 *   hva slags feil det var (`feiltekst`), aldri meldingen. Meldinger fra
 *   databasen, Storage, `psql` og andre prosesser kan inneholde data, filstier
 *   og verdier. Bare en `OffentligStopp`, som bare har faste tekster og tall,
 *   skrives med meldingen.
 *
 * Uten `aktiverTryggLogg` (lokalt, i testene og ved en gjenoppretting) skrives
 * alt som før, så den som gjenoppretter, ser hele feilen på sin egen maskin.
 */
import { appendFileSync } from 'node:fs'
import { OffentligStopp, Stopp } from './feil'
import { S3Feil } from './s3'

export { OffentligStopp }

let aktiv = false
let trinn = 'oppstart'
let ut: (tekst: string) => void = (tekst) => void process.stdout.write(tekst)

/** Skriver én linje kopijobben har satt sammen selv. */
export function skriv(tekst: string): void {
  ut(`${tekst}\n`)
}

/** En logg med en fast kilde foran hver linje. */
export const lagLogg = (kilde: string) => (tekst: string) => skriv(`[${kilde}] ${tekst}`)

/** Trinnet jobben er i; en feil sier hvilket. Navnet skal være en fast tekst. */
export function settTrinn(navn: string): void {
  trinn = navn
}

/** Maskerer en hemmelighet i loggen til GitHub Actions resten av jobben. */
export function masker(verdi: string): void {
  if (process.env.GITHUB_ACTIONS === 'true' && verdi) skriv(`::add-mask::${verdi}`)
}

/** Til oppsummeringen av jobben i GitHub, og til loggen. Teksten skal være satt sammen av jobben selv. */
export function oppsummer(tekst: string): void {
  skriv(tekst)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${tekst}\n`)
}

/** Hva slags feil det var, uten meldingen; meldingen bare for en `OffentligStopp`. */
export function feiltekst(feil: unknown): string {
  if (feil instanceof OffentligStopp) return feil.message
  if (feil instanceof S3Feil) return `kopilageret svarte ${feil.status}${/^[A-Za-z]+$/.test(feil.kode) ? ` ${feil.kode}` : ''}`
  const kode = (feil as { code?: unknown } | null)?.code
  const klasse = feil instanceof Error ? feil.constructor.name : typeof feil
  return `${/^[A-Za-z]+$/.test(klasse) ? klasse : 'Error'}${typeof kode === 'string' && /^[A-Z0-9_]{2,40}$/.test(kode) ? ` ${kode}` : ''}`
}

/** Skriver feilen trygt (eller hele, uten den trygge loggen) og avslutter med feilkode. */
export function avsluttMedFeil(feil: unknown): never {
  if (!aktiv) {
    console.error(feil instanceof Stopp ? feil.message : feil)
    process.exit(1)
  }
  const linje = `Sikkerhetskopien stoppet i trinnet «${trinn}»: ${feiltekst(feil)}.`
  const detaljer = feil instanceof OffentligStopp ? '' : ' Detaljene står ikke i den offentlige loggen.'
  try {
    oppsummer(`## Sikkerhetskopien feilet\n\n${linje}${detaljer}`)
  } catch {
    skriv(`${linje}${detaljer}`)
  }
  process.exit(1)
}

/**
 * Slår på den trygge loggen for resten av prosessen: `console` og stdout og
 * stderr stenges, og feil som ikke er fanget, går gjennom `avsluttMedFeil`.
 */
export function aktiverTryggLogg(): void {
  if (aktiv) return
  aktiv = true
  const stdout = process.stdout.write.bind(process.stdout)
  ut = (tekst) => void stdout(tekst)
  const stille = () => undefined
  for (const k of Object.keys(console) as (keyof Console)[]) {
    if (typeof console[k] === 'function') (console as unknown as Record<string, unknown>)[k] = stille
  }
  const stengt = ((..._: unknown[]) => true) as typeof process.stdout.write
  process.stdout.write = stengt
  process.stderr.write = stengt
  process.on('uncaughtException', (e) => avsluttMedFeil(e))
  process.on('unhandledRejection', (e) => avsluttMedFeil(e))
}
