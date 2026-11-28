/**
 * Prøveprogrammet for den trygge loggen (`sikkerhetskopi-logg.test.ts`):
 * slår den på, skriver markører på alle måtene en feil eller et bibliotek
 * kan skrive dem, og feiler på måten første argument sier.
 */
import { execFileSync } from 'node:child_process'
import { aktiverTryggLogg, avsluttMedFeil, masker, oppsummer, settTrinn, skriv } from '../../drift/sikkerhetskopi/logg'
import { OffentligStopp, Stopp } from '../../drift/sikkerhetskopi/feil'
import { S3Feil } from '../../drift/sikkerhetskopi/s3'

const MARKOR = 'MARKØR-storage/avatars/bruker-4711.png-SELECT-HEMMELIG-INNHOLD'

async function main(maate: string) {
  aktiverTryggLogg()
  masker('HEMMELIG-NOKKEL-123')
  settTrinn('prøvetrinnet')
  skriv('TRYGG-LINJE')
  oppsummer('TRYGG-OPPSUMMERING')
  console.log(MARKOR)
  console.error(MARKOR)
  console.warn(MARKOR)
  console.info(MARKOR)
  console.debug(MARKOR)
  console.dir({ MARKOR })
  process.stdout.write(`${MARKOR}\n`)
  process.stderr.write(`${MARKOR}\n`)
  if (maate === 'stopp') throw new Stopp(`Kunne ikke hente ${MARKOR}: Object not found`)
  if (maate === 'offentlig') throw new OffentligStopp('Mangler B2_KEY_ID (ID-en til nøkkelen).')
  if (maate === 's3') throw new S3Feil(403, 'AccessDenied', `GET deler/${MARKOR}: 403 AccessDenied ${MARKOR}`)
  if (maate === 'prosess') execFileSync('psql', ['-X', '-c', `select '${MARKOR}'`, `postgresql://${MARKOR}@127.0.0.1:1/x`], { stdio: ['ignore', 'pipe', 'pipe'] })
  if (maate === 'ufanget') setTimeout(() => { throw new Error(MARKOR) }, 10)
  if (maate === 'avvist') void Promise.reject(new Error(MARKOR))
  await new Promise((ok) => setTimeout(ok, 200))
}

main(process.argv.slice(2).find((a) => a !== '--') ?? '').catch(avsluttMedFeil)
