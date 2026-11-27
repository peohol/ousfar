import { beforeEach, vi } from 'vitest'

/**
 * Fast «i dag» i testene av personaldomenet (som i prototypen), slik at
 * skillet mellom tidligere og kommende dager (`rulesForDate`) ikke endrer seg
 * med kalenderen. Bare Date fakes; tidtakere går som vanlig. Klokka står
 * midt på dagen, så datoen er den samme i alle tidssoner testene kjøres i.
 */
export const TEST_TODAY = '2026-11-24'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${TEST_TODAY}T12:00:00Z`))
})
