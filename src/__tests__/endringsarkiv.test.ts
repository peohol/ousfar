/**
 * Den historiske endringsloggen er bevart, føring for føring.
 *
 * Da hver endring fikk sin egen fil, ble alle de 356 føringene som sto i
 * `src/data/endringslogg.ts` på `main`, flyttet uendret til arkivet
 * (`src/data/endringshistorikk.ts`), med versjoner, datoer, tekster, merker og
 * varselmarkører. Summen under er tatt av innholdet slik det sto da, og er
 * kontrollert mot den gamle fila. Endres, fjernes eller legges noe til i
 * arkivet, slår testen ut: de publiserte versjonene skal aldri endres, og nye
 * endringer får sin egen fil.
 */
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { ENDRINGSLOGG } from '../data/endringslogg'
import { HISTORISKE_ENDRINGER } from '../data/endringshistorikk'
import { finnEndring } from '../domain/versjonering'

const sum = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex')

describe('arkivet over de historiske endringene', () => {
  it('har alle føringene, fra 1.134.5 ned til 0.1.0', () => {
    expect(HISTORISKE_ENDRINGER).toHaveLength(356)
    expect(HISTORISKE_ENDRINGER[0]).toMatchObject({ versjon: '1.134.5', dato: '2026-11-16' })
    expect(HISTORISKE_ENDRINGER.at(-1)).toMatchObject({ versjon: '0.1.0' })
  })

  it('er likt, tegn for tegn, det som ble flyttet fra den gamle endringsloggen', () => {
    expect(sum(HISTORISKE_ENDRINGER)).toBe('6461266cc783ada347184b50e7ee9c151b18ac5bc1ab92faac2fc8e4b0664b5f')
  })

  it('står urørt nederst i endringsloggen appen viser, med versjonen som ID', () => {
    const nederst = ENDRINGSLOGG.slice(-HISTORISKE_ENDRINGER.length)
    expect(nederst).toEqual(HISTORISKE_ENDRINGER.map((h) => ({ id: h.versjon, ...h })))
    // Alt over arkivet er endringer med egen fil, nyere enn arkivet.
    expect(ENDRINGSLOGG.slice(0, -HISTORISKE_ENDRINGER.length).every((e) => e.semver !== undefined)).toBe(true)
  })

  it('lar oppgaver og varsler som viser til en historisk versjon, finne føringen sin', () => {
    for (const h of HISTORISKE_ENDRINGER) expect(finnEndring(ENDRINGSLOGG, h.versjon)?.sammendrag).toBe(h.sammendrag)
  })
})
